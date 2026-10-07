/**
 * Precision Timer Engine
 * Handles drift-free timing using timestamp deltas, supporting Pomodoro, Countdown, and Stopwatch.
 */
class PrecisionTimer {
  constructor() {
    this.mode = 'pomodoro'; // 'pomodoro' | 'short_break' | 'long_break' | 'countdown' | 'stopwatch'
    this.state = 'idle'; // 'idle' | 'running' | 'paused' | 'completed'
    
    this.totalDuration = 25 * 60; // in seconds
    this.remainingSeconds = 25 * 60;
    this.elapsedSeconds = 0; // tracked in this active session
    
    this.startTimestamp = null;
    this.pauseOffset = 0; // accumulated ms before pause
    this.timerId = null;

    this.pomodoroCount = 0; // Completed pomodoros today
    this.activeTaskId = null;

    this.callbacks = {
      onTick: () => {},
      onStateChange: () => {},
      onComplete: () => {}
    };
  }

  setCallbacks({ onTick, onStateChange, onComplete }) {
    if (onTick) this.callbacks.onTick = onTick;
    if (onStateChange) this.callbacks.onStateChange = onStateChange;
    if (onComplete) this.callbacks.onComplete = onComplete;
  }

  setMode(mode, customSeconds = null) {
    this.pause();
    this.mode = mode;
    this.state = 'idle';
    this.elapsedSeconds = 0;
    this.pauseOffset = 0;

    const settings = window.storageService.getSettings();

    if (mode === 'pomodoro') {
      this.totalDuration = (settings.pomodoroMinutes || 25) * 60;
      this.remainingSeconds = this.totalDuration;
    } else if (mode === 'short_break') {
      this.totalDuration = (settings.shortBreakMinutes || 5) * 60;
      this.remainingSeconds = this.totalDuration;
    } else if (mode === 'long_break') {
      this.totalDuration = (settings.longBreakMinutes || 15) * 60;
      this.remainingSeconds = this.totalDuration;
    } else if (mode === 'countdown') {
      this.totalDuration = customSeconds || 30 * 60;
      this.remainingSeconds = this.totalDuration;
    } else if (mode === 'stopwatch') {
      this.totalDuration = 0;
      this.remainingSeconds = 0;
    }

    this._emitTick();
    this.callbacks.onStateChange(this.state);
  }

  setCustomDuration(seconds) {
    if (this.state === 'idle') {
      this.totalDuration = seconds;
      this.remainingSeconds = seconds;
      this._emitTick();
    }
  }

  setActiveTask(taskId) {
    this.activeTaskId = taskId;
  }

  start() {
    if (this.state === 'running') return;

    this.state = 'running';
    this.startTimestamp = Date.now() - this.pauseOffset;

    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => this._tick(), 200);

    this.callbacks.onStateChange(this.state);
    this._emitTick();
  }

  pause() {
    if (this.state !== 'running') return;

    this.state = 'paused';
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.pauseOffset = Date.now() - this.startTimestamp;

    this.callbacks.onStateChange(this.state);
  }

  reset() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.state = 'idle';
    this.pauseOffset = 0;
    this.elapsedSeconds = 0;

    if (this.mode === 'stopwatch') {
      this.remainingSeconds = 0;
    } else {
      this.remainingSeconds = this.totalDuration;
    }

    this.callbacks.onStateChange(this.state);
    this._emitTick();
  }

  skip() {
    this.pause();
    this._complete(true);
  }

  _tick() {
    if (this.state !== 'running') return;

    const currentOffset = Date.now() - this.startTimestamp;
    const elapsedTotalSec = Math.floor(currentOffset / 1000);
    const newSessionElapsed = elapsedTotalSec;

    // Track increment on active task
    const deltaSec = newSessionElapsed - this.elapsedSeconds;
    if (deltaSec > 0) {
      this.elapsedSeconds = newSessionElapsed;
      if (this.activeTaskId && this.isWorkSession()) {
        window.storageService.incrementTaskSpentTime(this.activeTaskId, deltaSec);
      }
    }

    if (this.mode === 'stopwatch') {
      this.remainingSeconds = this.elapsedSeconds;
      this._emitTick();
    } else {
      const remaining = Math.max(0, this.totalDuration - this.elapsedSeconds);
      this.remainingSeconds = remaining;
      this._emitTick();

      if (remaining <= 0) {
        this._complete(false);
      }
    }
  }

  _complete(skipped = false) {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.state = 'completed';

    const recordedElapsed = this.elapsedSeconds;
    const completedMode = this.mode;

    // Log session to history if time was tracked (> 10s or standard completion)
    if (recordedElapsed >= 10 && this.isWorkSession()) {
      const activeTask = window.storageService.getTaskById(this.activeTaskId);
      const session = {
        id: 'sess_' + Date.now(),
        taskId: this.activeTaskId,
        taskTitle: activeTask ? activeTask.title : 'General Focus',
        tag: activeTask ? activeTask.tag : 'Uncategorized',
        mode: completedMode,
        durationSeconds: recordedElapsed,
        timestamp: new Date().toISOString()
      };
      window.storageService.addSession(session);
    }

    if (completedMode === 'pomodoro' && !skipped) {
      this.pomodoroCount++;
    }

    this.callbacks.onStateChange(this.state);
    this.callbacks.onComplete({
      mode: completedMode,
      elapsedSeconds: recordedElapsed,
      taskId: this.activeTaskId,
      skipped,
      pomodoroCount: this.pomodoroCount
    });

    // Auto-transition logic for Pomodoro
    this._handleAutoTransition(completedMode);
  }

  _handleAutoTransition(completedMode) {
    const settings = window.storageService.getSettings();

    if (completedMode === 'pomodoro') {
      const nextBreak = (this.pomodoroCount % (settings.longBreakInterval || 4) === 0) 
        ? 'long_break' 
        : 'short_break';
      this.setMode(nextBreak);
      if (settings.autoStartBreaks) {
        this.start();
      }
    } else if (completedMode === 'short_break' || completedMode === 'long_break') {
      this.setMode('pomodoro');
      if (settings.autoStartPomodoros) {
        this.start();
      }
    }
  }

  isWorkSession() {
    return this.mode === 'pomodoro' || this.mode === 'countdown' || this.mode === 'stopwatch';
  }

  _emitTick() {
    let progressPercent = 0;
    if (this.mode === 'stopwatch') {
      progressPercent = 100;
    } else if (this.totalDuration > 0) {
      progressPercent = Math.min(100, Math.max(0, ((this.totalDuration - this.remainingSeconds) / this.totalDuration) * 100));
    }

    this.callbacks.onTick({
      mode: this.mode,
      state: this.state,
      remainingSeconds: this.remainingSeconds,
      elapsedSeconds: this.elapsedSeconds,
      totalDuration: this.totalDuration,
      progressPercent,
      formattedTime: this.formatTime(this.remainingSeconds)
    });
  }

  formatTime(totalSec) {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;

    const pad = (n) => String(n).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }
}

window.precisionTimer = new PrecisionTimer();
