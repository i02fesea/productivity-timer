/**
 * Storage Service - LocalStorage persistence, defaults, and data export/import
 */
class StorageService {
  constructor() {
    this.TASKS_KEY = 'prod_timer_tasks_v1';
    this.SESSIONS_KEY = 'prod_timer_sessions_v1';
    this.SETTINGS_KEY = 'prod_timer_settings_v1';
    this.ACTIVE_TASK_KEY = 'prod_timer_active_task_v1';
    
    this.initDefaults();
  }

  initDefaults() {
    // Default settings
    if (!localStorage.getItem(this.SETTINGS_KEY)) {
      const defaultSettings = {
        pomodoroMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartPomodoros: false,
        sound: 'chime',
        volume: 0.7,
        muted: false,
        notifications: false,
        theme: 'system'
      };
      this.saveSettings(defaultSettings);
    }

    // Default sample tasks if none exist
    if (!localStorage.getItem(this.TASKS_KEY)) {
      const defaultTasks = [
        {
          id: 'task_' + Date.now() + '_1',
          title: 'Deep Coding & Architecture',
          tag: 'Development',
          color: '#4f46e5',
          goalMinutes: 120,
          goalPeriod: 'daily',
          spentSeconds: 2700, // 45m sample initial progress
          createdAt: new Date().toISOString()
        },
        {
          id: 'task_' + Date.now() + '_2',
          title: 'Code Review & Pull Requests',
          tag: 'Work',
          color: '#06b6d4',
          goalMinutes: 60,
          goalPeriod: 'daily',
          spentSeconds: 1800, // 30m sample
          createdAt: new Date().toISOString()
        },
        {
          id: 'task_' + Date.now() + '_3',
          title: 'System Design & Research',
          tag: 'Learning',
          color: '#10b981',
          goalMinutes: 90,
          goalPeriod: 'daily',
          spentSeconds: 900,
          createdAt: new Date().toISOString()
        }
      ];
      this.saveTasks(defaultTasks);
      this.setActiveTaskId(defaultTasks[0].id);

      // Seed some session history so charts look lively
      const today = new Date();
      const yesterday = new Date(Date.now() - 86400000);
      const twoDaysAgo = new Date(Date.now() - 86400000 * 2);

      const defaultSessions = [
        {
          id: 'sess_1',
          taskId: defaultTasks[0].id,
          taskTitle: defaultTasks[0].title,
          tag: defaultTasks[0].tag,
          mode: 'pomodoro',
          durationSeconds: 1500,
          timestamp: twoDaysAgo.toISOString()
        },
        {
          id: 'sess_2',
          taskId: defaultTasks[1].id,
          taskTitle: defaultTasks[1].title,
          tag: defaultTasks[1].tag,
          mode: 'pomodoro',
          durationSeconds: 1500,
          timestamp: yesterday.toISOString()
        },
        {
          id: 'sess_3',
          taskId: defaultTasks[0].id,
          taskTitle: defaultTasks[0].title,
          tag: defaultTasks[0].tag,
          mode: 'pomodoro',
          durationSeconds: 1200,
          timestamp: today.toISOString()
        }
      ];
      this.saveSessions(defaultSessions);
    }
  }

  // --- Tasks ---
  getTasks() {
    try {
      const data = localStorage.getItem(this.TASKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading tasks:', e);
      return [];
    }
  }

  saveTasks(tasks) {
    try {
      localStorage.setItem(this.TASKS_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Error saving tasks:', e);
    }
  }

  getTaskById(id) {
    const tasks = this.getTasks();
    return tasks.find(t => t.id === id) || null;
  }

  upsertTask(task) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index >= 0) {
      tasks[index] = { ...tasks[index], ...task };
    } else {
      tasks.push(task);
    }
    this.saveTasks(tasks);
    return tasks;
  }

  deleteTask(id) {
    let tasks = this.getTasks();
    tasks = tasks.filter(t => t.id !== id);
    this.saveTasks(tasks);
    if (this.getActiveTaskId() === id) {
      this.setActiveTaskId(tasks.length > 0 ? tasks[0].id : null);
    }
    return tasks;
  }

  incrementTaskSpentTime(taskId, additionalSeconds) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.spentSeconds = (task.spentSeconds || 0) + additionalSeconds;
      this.saveTasks(tasks);
    }
  }

  // --- Active Task ---
  getActiveTaskId() {
    return localStorage.getItem(this.ACTIVE_TASK_KEY);
  }

  setActiveTaskId(id) {
    if (id) {
      localStorage.setItem(this.ACTIVE_TASK_KEY, id);
    } else {
      localStorage.removeItem(this.ACTIVE_TASK_KEY);
    }
  }

  // --- Sessions ---
  getSessions() {
    try {
      const data = localStorage.getItem(this.SESSIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading sessions:', e);
      return [];
    }
  }

  saveSessions(sessions) {
    try {
      localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Error saving sessions:', e);
    }
  }

  addSession(session) {
    const sessions = this.getSessions();
    sessions.unshift(session);
    // Keep last 1,000 sessions
    if (sessions.length > 1000) {
      sessions.length = 1000;
    }
    this.saveSessions(sessions);
  }

  clearHistory() {
    this.saveSessions([]);
  }

  // --- Settings ---
  getSettings() {
    try {
      const data = localStorage.getItem(this.SETTINGS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  saveSettings(settings) {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }

  // --- Data Export & Import ---
  exportJSON() {
    const backup = {
      version: 1,
      exportDate: new Date().toISOString(),
      tasks: this.getTasks(),
      sessions: this.getSessions(),
      settings: this.getSettings()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productivity-timer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportCSV() {
    const sessions = this.getSessions();
    if (!sessions.length) {
      alert('No sessions recorded yet to export.');
      return;
    }

    const headers = ['ID', 'Task Name', 'Tag', 'Mode', 'Duration (Minutes)', 'Duration (Seconds)', 'Timestamp'];
    const rows = sessions.map(s => [
      `"${s.id}"`,
      `"${(s.taskTitle || '').replace(/"/g, '""')}"`,
      `"${(s.tag || '').replace(/"/g, '""')}"`,
      `"${s.mode}"`,
      (s.durationSeconds / 60).toFixed(1),
      s.durationSeconds,
      `"${s.timestamp}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `productivity-timer-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.tasks)) this.saveTasks(data.tasks);
      if (Array.isArray(data.sessions)) this.saveSessions(data.sessions);
      if (data.settings) this.saveSettings(data.settings);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }
}

window.storageService = new StorageService();
