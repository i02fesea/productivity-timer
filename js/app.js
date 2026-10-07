/**
 * Main Application Controller
 * Connects UI, Timer Engine, Analytics, Audio, and Storage into a cohesive UX.
 */
document.addEventListener('DOMContentLoaded', () => {
  // DOM References
  const timerDigits = document.getElementById('timer-digits');
  const timerSublabel = document.getElementById('timer-sublabel');
  const timerProgressCircle = document.getElementById('timer-circle-progress');
  const btnStartPause = document.getElementById('btn-start-pause');
  const btnStartPauseText = document.getElementById('btn-start-pause-text');
  const btnReset = document.getElementById('btn-reset');
  const btnSkip = document.getElementById('btn-skip');
  
  const modeButtons = document.querySelectorAll('.mode-btn');
  const activeTaskBanner = document.getElementById('active-task-banner');
  const activeTaskName = document.getElementById('active-task-name');
  
  const taskListEl = document.getElementById('task-list');
  const btnOpenAddTask = document.getElementById('btn-open-add-task');
  const taskModal = document.getElementById('task-modal');
  const taskForm = document.getElementById('task-form');
  const taskModalTitle = document.getElementById('task-modal-title');
  const taskIdInput = document.getElementById('task-id-input');
  
  const settingsModal = document.getElementById('settings-modal');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const settingsForm = document.getElementById('settings-form');
  const btnTestSound = document.getElementById('btn-test-sound');
  
  const themeToggle = document.getElementById('theme-toggle');
  const soundToggle = document.getElementById('sound-toggle');
  
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportJson = document.getElementById('btn-export-json');
  const fileImportJson = document.getElementById('file-import-json');
  const btnClearHistory = document.getElementById('btn-clear-history');
  
  const toastContainer = document.getElementById('toast-container');
  const canvas7Day = document.getElementById('chart-7day');
  const canvasDistribution = document.getElementById('chart-distribution');
  const historyTableBody = document.getElementById('history-table-body');

  // Metrics elements
  const metricFocusHours = document.getElementById('metric-focus-hours');
  const metricPomodoros = document.getElementById('metric-pomodoros');
  const metricGoalProgress = document.getElementById('metric-goal-progress');
  const metricStreak = document.getElementById('metric-streak');
  const headerStreak = document.getElementById('header-streak');

  // SVG Circle calculation
  const circleRadius = 130;
  const circleCircumference = 2 * Math.PI * circleRadius;
  if (timerProgressCircle) {
    timerProgressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
    timerProgressCircle.style.strokeDashoffset = '0';
  }

  // --- Initial Setup & Theme ---
  const settings = window.storageService.getSettings();
  applyTheme(settings.theme || 'system');
  window.soundEffects.setVolume(settings.volume !== undefined ? settings.volume : 0.7);
  window.soundEffects.setMuted(settings.muted || false);
  updateSoundButtonUI(settings.muted || false);

  // Set initial active task
  let activeTaskId = window.storageService.getActiveTaskId();
  const tasks = window.storageService.getTasks();
  if (!activeTaskId && tasks.length > 0) {
    activeTaskId = tasks[0].id;
    window.storageService.setActiveTaskId(activeTaskId);
  }
  window.precisionTimer.setActiveTask(activeTaskId);

  // --- Timer Engine Callbacks ---
  window.precisionTimer.setCallbacks({
    onTick: ({ formattedTime, progressPercent, mode, state, remainingSeconds }) => {
      timerDigits.textContent = formattedTime;
      
      // Update Tab Title
      const modeLabels = {
        pomodoro: 'Focus',
        short_break: 'Short Break',
        long_break: 'Long Break',
        countdown: 'Timer',
        stopwatch: 'Stopwatch'
      };
      document.title = state === 'running' 
        ? `(${formattedTime}) ${modeLabels[mode]} - Productivity Timer` 
        : 'Productivity Timer & Goal Tracker';

      // Update SVG radial ring
      if (timerProgressCircle) {
        if (mode === 'stopwatch') {
          timerProgressCircle.style.strokeDashoffset = '0';
        } else {
          const offset = circleCircumference - (progressPercent / 100) * circleCircumference;
          timerProgressCircle.style.strokeDashoffset = offset;
        }
      }

      // Live update active task card progress
      if (state === 'running' && window.precisionTimer.isWorkSession()) {
        renderTasks(false); // subtle render without resetting focus
      }
    },

    onStateChange: (state) => {
      if (state === 'running') {
        btnStartPause.classList.remove('btn-primary');
        btnStartPause.classList.add('btn-secondary');
        btnStartPauseText.textContent = 'Pause';
      } else {
        btnStartPause.classList.remove('btn-secondary');
        btnStartPause.classList.add('btn-primary');
        btnStartPauseText.textContent = state === 'paused' ? 'Resume' : 'Start';
      }
    },

    onComplete: ({ mode, elapsedSeconds, skipped, pomodoroCount }) => {
      const currentSettings = window.storageService.getSettings();

      if (!skipped) {
        // Play notification sound
        window.soundEffects.playByName(currentSettings.sound || 'chime');

        // Show browser push notification if permitted
        showBrowserNotification(mode);

        const messages = {
          pomodoro: `Great work! Pomodoro #${pomodoroCount} completed. Time for a break!`,
          short_break: `Break over! Ready to dive back in?`,
          long_break: `Rest complete! Let's conquer the next goal.`,
          countdown: `Time box completed! (${Math.round(elapsedSeconds / 60)} minutes)`,
          stopwatch: `Session ended. ${Math.round(elapsedSeconds / 60)} minutes logged.`
        };
        showToast(messages[mode] || 'Session completed!', 'success');
      }

      refreshAllViews();
    }
  });

  // Set initial timer mode
  window.precisionTimer.setMode('pomodoro');
  updateActiveTaskDisplay();
  refreshAllViews();

  // --- Button & Control Listeners ---
  btnStartPause.addEventListener('click', () => {
    window.soundEffects.playTick();
    if (window.precisionTimer.state === 'running') {
      window.precisionTimer.pause();
    } else {
      window.precisionTimer.start();
    }
  });

  btnReset.addEventListener('click', () => {
    window.soundEffects.playTick();
    window.precisionTimer.reset();
  });

  btnSkip.addEventListener('click', () => {
    window.soundEffects.playTick();
    window.precisionTimer.skip();
  });

  // Mode buttons
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      window.soundEffects.playTick();
      const mode = btn.dataset.mode;
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (mode === 'countdown') {
        const customMins = prompt('Enter countdown duration in minutes:', '30');
        const mins = parseInt(customMins, 10);
        if (mins && mins > 0) {
          window.precisionTimer.setMode('countdown', mins * 60);
          timerSublabel.textContent = `${mins}m Countdown`;
        } else {
          window.precisionTimer.setMode('pomodoro');
          document.querySelector('[data-mode="pomodoro"]').classList.add('active');
          btn.classList.remove('active');
        }
      } else {
        window.precisionTimer.setMode(mode);
        const labels = {
          pomodoro: 'Pomodoro Focus',
          short_break: 'Short Rest',
          long_break: 'Long Rest',
          stopwatch: 'Count-Up Stopwatch'
        };
        timerSublabel.textContent = labels[mode] || mode;
      }
    });
  });

  // Theme toggle
  themeToggle.addEventListener('click', () => {
    window.soundEffects.playTick();
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    const s = window.storageService.getSettings();
    s.theme = newTheme;
    window.storageService.saveSettings(s);
    renderCharts();
  });

  // Sound mute toggle
  soundToggle.addEventListener('click', () => {
    const s = window.storageService.getSettings();
    const newMuted = !s.muted;
    s.muted = newMuted;
    window.storageService.saveSettings(s);
    window.soundEffects.setMuted(newMuted);
    updateSoundButtonUI(newMuted);
    showToast(newMuted ? 'Sound muted' : 'Sound unmuted');
  });

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Avoid triggering when user is typing in form inputs
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      btnStartPause.click();
    } else if (e.key.toLowerCase() === 'r') {
      btnReset.click();
    } else if (e.key.toLowerCase() === 's') {
      btnSkip.click();
    } else if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      openTaskModal();
    } else if (e.key.toLowerCase() === 'm') {
      soundToggle.click();
    }
  });

  // --- Task Management ---
  btnOpenAddTask.addEventListener('click', () => openTaskModal());

  function openTaskModal(taskToEdit = null) {
    taskForm.reset();
    if (taskToEdit) {
      taskModalTitle.textContent = 'Edit Task Goal';
      taskIdInput.value = taskToEdit.id;
      document.getElementById('task-title').value = taskToEdit.title;
      document.getElementById('task-tag').value = taskToEdit.tag || 'General';
      document.getElementById('task-goal-minutes').value = taskToEdit.goalMinutes || 60;
      document.getElementById('task-goal-period').value = taskToEdit.goalPeriod || 'daily';
      
      const colorRadio = document.querySelector(`input[name="task-color"][value="${taskToEdit.color}"]`);
      if (colorRadio) colorRadio.checked = true;
    } else {
      taskModalTitle.textContent = 'Create New Task Goal';
      taskIdInput.value = '';
    }
    openModal(taskModal);
  }

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = taskIdInput.value || ('task_' + Date.now());
    const title = document.getElementById('task-title').value.trim();
    const tag = document.getElementById('task-tag').value.trim() || 'General';
    const goalMinutes = parseInt(document.getElementById('task-goal-minutes').value, 10) || 60;
    const goalPeriod = document.getElementById('task-goal-period').value;
    const selectedColor = document.querySelector('input[name="task-color"]:checked')?.value || '#4f46e5';

    const existingTask = window.storageService.getTaskById(id);
    const task = {
      id,
      title,
      tag,
      goalMinutes,
      goalPeriod,
      color: selectedColor,
      spentSeconds: existingTask ? existingTask.spentSeconds : 0,
      createdAt: existingTask ? existingTask.createdAt : new Date().toISOString()
    };

    window.storageService.upsertTask(task);
    if (!window.storageService.getActiveTaskId()) {
      window.storageService.setActiveTaskId(id);
      window.precisionTimer.setActiveTask(id);
    }

    closeModal(taskModal);
    updateActiveTaskDisplay();
    refreshAllViews();
    showToast(existingTask ? 'Task updated!' : 'Task goal created!', 'success');
  });

  // Render Tasks List
  function renderTasks(fullRebuild = true) {
    const tasks = window.storageService.getTasks();
    const activeId = window.storageService.getActiveTaskId();

    if (tasks.length === 0) {
      taskListEl.innerHTML = `
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
          <p>No active tasks yet. Click "+ New Task" to set a time-based goal!</p>
        </div>
      `;
      return;
    }

    if (!fullRebuild) {
      // Just update numbers and progress bars in place without breaking DOM focus
      tasks.forEach(task => {
        const card = taskListEl.querySelector(`[data-task-id="${task.id}"]`);
        if (card) {
          const spentMins = Math.floor((task.spentSeconds || 0) / 60);
          const percent = Math.min(100, Math.round((spentMins / (task.goalMinutes || 1)) * 100));
          const timeMeta = card.querySelector('.time-spent-meta');
          const fill = card.querySelector('.progress-fill');
          if (timeMeta) timeMeta.textContent = `${spentMins}m / ${task.goalMinutes}m (${percent}%)`;
          if (fill) {
            fill.style.width = `${percent}%`;
            if (percent >= 100) fill.classList.add('completed');
          }
        }
      });
      return;
    }

    taskListEl.innerHTML = '';
    tasks.forEach(task => {
      const isActive = task.id === activeId;
      const spentMinutes = Math.floor((task.spentSeconds || 0) / 60);
      const percent = Math.min(100, Math.round((spentMinutes / (task.goalMinutes || 1)) * 100));
      const isCompleted = percent >= 100;

      const card = document.createElement('div');
      card.className = `task-card ${isActive ? 'active-card' : ''}`;
      card.dataset.taskId = task.id;

      card.innerHTML = `
        <div class="task-card-header">
          <div class="task-info-group">
            <span class="task-color-indicator" style="background-color: ${task.color || '#4f46e5'};"></span>
            <span class="task-title" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>
            <span class="task-tag">${escapeHtml(task.tag || 'General')}</span>
          </div>
          <div class="task-actions">
            <button class="btn btn-secondary btn-icon btn-select-task" title="${isActive ? 'Currently Active' : 'Set as Active Task'}">
              ${isActive 
                ? '<svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>'
                : '<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path></svg>'
              }
            </button>
            <button class="btn btn-secondary btn-icon btn-edit-task" title="Edit Task">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
            <button class="btn btn-secondary btn-icon btn-delete-task" title="Delete Task">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
        <div class="progress-container">
          <div class="progress-meta">
            <span>Goal: <span class="highlight">${task.goalPeriod}</span></span>
            <span class="time-spent-meta">${spentMinutes}m / ${task.goalMinutes}m (${percent}%)</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${isCompleted ? 'completed' : ''}" style="width: ${percent}%; background-color: ${isCompleted ? 'var(--color-success)' : task.color};"></div>
          </div>
        </div>
      `;

      // Card action bindings
      card.querySelector('.btn-select-task').addEventListener('click', (e) => {
        e.stopPropagation();
        window.soundEffects.playTick();
        window.storageService.setActiveTaskId(task.id);
        window.precisionTimer.setActiveTask(task.id);
        updateActiveTaskDisplay();
        renderTasks(true);
        showToast(`Active task: ${task.title}`);
      });

      card.querySelector('.btn-edit-task').addEventListener('click', (e) => {
        e.stopPropagation();
        window.soundEffects.playTick();
        openTaskModal(task);
      });

      card.querySelector('.btn-delete-task').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete goal "${task.title}"?`)) {
          window.soundEffects.playTick();
          window.storageService.deleteTask(task.id);
          const newActive = window.storageService.getActiveTaskId();
          window.precisionTimer.setActiveTask(newActive);
          updateActiveTaskDisplay();
          refreshAllViews();
          showToast('Task removed');
        }
      });

      taskListEl.appendChild(card);
    });
  }

  function updateActiveTaskDisplay() {
    const activeId = window.storageService.getActiveTaskId();
    const task = window.storageService.getTaskById(activeId);
    if (task) {
      activeTaskName.textContent = task.title;
      activeTaskBanner.style.display = 'inline-flex';
    } else {
      activeTaskName.textContent = 'General Focus';
      activeTaskBanner.style.display = 'inline-flex';
    }
  }

  // --- Settings Modal ---
  btnOpenSettings.addEventListener('click', () => {
    window.soundEffects.playTick();
    const s = window.storageService.getSettings();
    document.getElementById('setting-pomodoro').value = s.pomodoroMinutes || 25;
    document.getElementById('setting-short-break').value = s.shortBreakMinutes || 5;
    document.getElementById('setting-long-break').value = s.longBreakMinutes || 15;
    document.getElementById('setting-long-break-interval').value = s.longBreakInterval || 4;
    document.getElementById('setting-sound').value = s.sound || 'chime';
    document.getElementById('setting-volume').value = s.volume !== undefined ? s.volume : 0.7;
    document.getElementById('setting-auto-breaks').checked = Boolean(s.autoStartBreaks);
    document.getElementById('setting-auto-pomos').checked = Boolean(s.autoStartPomodoros);
    document.getElementById('setting-notifications').checked = Boolean(s.notifications);
    openModal(settingsModal);
  });

  btnTestSound.addEventListener('click', () => {
    const sound = document.getElementById('setting-sound').value;
    const vol = parseFloat(document.getElementById('setting-volume').value) || 0.7;
    window.soundEffects.setVolume(vol);
    window.soundEffects.playByName(sound);
  });

  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const s = window.storageService.getSettings();
    s.pomodoroMinutes = parseInt(document.getElementById('setting-pomodoro').value, 10) || 25;
    s.shortBreakMinutes = parseInt(document.getElementById('setting-short-break').value, 10) || 5;
    s.longBreakMinutes = parseInt(document.getElementById('setting-long-break').value, 10) || 15;
    s.longBreakInterval = parseInt(document.getElementById('setting-long-break-interval').value, 10) || 4;
    s.sound = document.getElementById('setting-sound').value;
    s.volume = parseFloat(document.getElementById('setting-volume').value) || 0.7;
    s.autoStartBreaks = document.getElementById('setting-auto-breaks').checked;
    s.autoStartPomodoros = document.getElementById('setting-auto-pomos').checked;
    
    const wantsNotifs = document.getElementById('setting-notifications').checked;
    s.notifications = wantsNotifs;
    if (wantsNotifs && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    window.storageService.saveSettings(s);
    window.soundEffects.setVolume(s.volume);

    // Refresh current timer if idle in pomodoro
    if (window.precisionTimer.state === 'idle') {
      window.precisionTimer.setMode(window.precisionTimer.mode);
    }

    closeModal(settingsModal);
    showToast('Settings saved!', 'success');
  });

  // --- Export & History Handlers ---
  btnExportCsv.addEventListener('click', () => {
    window.soundEffects.playTick();
    window.storageService.exportCSV();
  });

  btnExportJson.addEventListener('click', () => {
    window.soundEffects.playTick();
    window.storageService.exportJSON();
  });

  fileImportJson.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const ok = window.storageService.importJSON(event.target.result);
      if (ok) {
        showToast('Data backup restored successfully!', 'success');
        refreshAllViews();
      } else {
        showToast('Invalid backup file format.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  btnClearHistory.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your session history log?')) {
      window.storageService.clearHistory();
      refreshAllViews();
      showToast('History log cleared');
    }
  });

  // --- Session History Table ---
  function renderHistoryTable() {
    const sessions = window.storageService.getSessions();
    if (!historyTableBody) return;

    if (sessions.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state" style="padding: 1.5rem;">No focus sessions logged yet. Complete a timer to build your log!</td>
        </tr>
      `;
      return;
    }

    historyTableBody.innerHTML = sessions.slice(0, 15).map(s => {
      const date = new Date(s.timestamp);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const mins = Math.round(s.durationSeconds / 60);

      return `
        <tr>
          <td><strong>${escapeHtml(s.taskTitle || 'General')}</strong></td>
          <td><span class="task-tag">${escapeHtml(s.tag || 'Focus')}</span></td>
          <td>${mins} min</td>
          <td style="color: var(--text-muted); font-size: 0.775rem;">${dateStr}</td>
        </tr>
      `;
    }).join('');
  }

  // --- Metrics & Charts ---
  function renderMetrics() {
    const metrics = window.analyticsEngine.getTodayMetrics();
    metricFocusHours.textContent = `${metrics.todayHours}h`;
    metricPomodoros.textContent = metrics.todayPomodoros;
    metricGoalProgress.textContent = `${metrics.goalProgressPct}%`;
    metricStreak.textContent = `${metrics.streakDays}d`;
    if (headerStreak) headerStreak.textContent = `${metrics.streakDays} Day Streak`;
  }

  function renderCharts() {
    window.analyticsEngine.render7DayTrend(canvas7Day);
    window.analyticsEngine.renderTaskDistribution(canvasDistribution);
  }

  function refreshAllViews() {
    renderTasks(true);
    renderMetrics();
    renderCharts();
    renderHistoryTable();
  }

  // Window resize debounced chart re-render
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderCharts, 150);
  });

  // --- Helper UI Utilities ---
  function applyTheme(theme) {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  function updateSoundButtonUI(isMuted) {
    soundToggle.innerHTML = isMuted 
      ? '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>'
      : '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>';
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'success' : ''}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function showBrowserNotification(mode) {
    const s = window.storageService.getSettings();
    if (!s.notifications || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const titles = {
      pomodoro: 'Pomodoro Completed! 🍅',
      short_break: 'Short Break Over! ☕',
      long_break: 'Long Rest Finished! 🌟',
      countdown: 'Time Box Finished! ⏰',
      stopwatch: 'Session Completed! ⏱️'
    };

    new Notification(titles[mode] || 'Productivity Timer', {
      body: 'Check your progress and choose your next focus task.',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%234f46e5"/></svg>'
    });
  }

  function openModal(modal) {
    modal.classList.add('open');
  }

  function closeModal(modal) {
    modal.classList.remove('open');
  }

  // Modal close handlers
  document.querySelectorAll('.modal-close-btn, .btn-cancel-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay');
      if (modal) closeModal(modal);
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeModal(e.target);
    }
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }
});
