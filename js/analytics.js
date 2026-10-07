/**
 * Analytics and Visual Dashboard Engine
 * Computes streaks, goal metrics, and renders custom HTML5 Canvas charts without external libraries.
 */
class AnalyticsEngine {
  constructor() {
    this.colorPalette = [
      '#4f46e5', '#06b6d4', '#10b981', '#f59e0b',
      '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'
    ];
  }

  /**
   * Calculate summary metrics for today
   */
  getTodayMetrics() {
    const sessions = window.storageService.getSessions();
    const tasks = window.storageService.getTasks();
    const todayStr = new Date().toISOString().slice(0, 10);

    let todaySeconds = 0;
    let todayPomodoros = 0;

    sessions.forEach(sess => {
      if (sess.timestamp && sess.timestamp.slice(0, 10) === todayStr) {
        todaySeconds += sess.durationSeconds || 0;
        if (sess.mode === 'pomodoro') todayPomodoros++;
      }
    });

    // Calculate daily goal target
    let totalGoalMinutes = 0;
    let totalGoalSpentMinutes = 0;

    tasks.forEach(t => {
      if (t.goalPeriod === 'daily') {
        totalGoalMinutes += t.goalMinutes || 0;
        totalGoalSpentMinutes += Math.min(t.goalMinutes, Math.floor((t.spentSeconds || 0) / 60));
      }
    });

    const goalProgressPct = totalGoalMinutes > 0 
      ? Math.min(100, Math.round((totalGoalSpentMinutes / totalGoalMinutes) * 100))
      : 100;

    return {
      todayHours: (todaySeconds / 3600).toFixed(1),
      todayMinutes: Math.floor(todaySeconds / 60),
      todayPomodoros,
      goalProgressPct,
      streakDays: this.calculateStreak(sessions)
    };
  }

  /**
   * Computes consecutive active days
   */
  calculateStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;

    const activeDates = new Set(
      sessions.map(s => s.timestamp ? s.timestamp.slice(0, 10) : '')
    );

    let streak = 0;
    let checkDate = new Date();

    // Check if today has sessions; if not, check starting from yesterday
    const todayStr = checkDate.toISOString().slice(0, 10);
    if (!activeDates.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (activeDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Helper to set up crisp HiDPI canvas
   */
  _setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width || 300;
    const height = rect.height || canvas.height || 200;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width, height };
  }

  /**
   * Render 7-day focus trend bar chart
   */
  render7DayTrend(canvas) {
    if (!canvas) return;
    const { ctx, width, height } = this._setupCanvas(canvas);
    const sessions = window.storageService.getSessions();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Build array of past 7 days
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({
        iso,
        label: i === 0 ? 'Today' : dayNames[d.getDay()],
        seconds: 0
      });
    }

    sessions.forEach(s => {
      const sDate = s.timestamp ? s.timestamp.slice(0, 10) : '';
      const day = days.find(d => d.iso === sDate);
      if (day) {
        day.seconds += s.durationSeconds || 0;
      }
    });

    const maxHours = Math.max(3, ...days.map(d => d.seconds / 3600));

    // Clear background
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 25, bottom: 35, left: 35, right: 15 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Draw horizontal grid lines
    ctx.strokeStyle = isDark ? '#27354f' : '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';

    const gridLines = 3;
    for (let i = 0; i <= gridLines; i++) {
      const val = (maxHours * (i / gridLines)).toFixed(1);
      const y = padding.top + chartH - (chartH * (i / gridLines));

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText(`${val}h`, padding.left - 6, y + 4);
    }

    // Draw bars
    const barWidth = Math.min(32, (chartW / days.length) * 0.6);
    const colStep = chartW / days.length;

    days.forEach((day, idx) => {
      const hours = day.seconds / 3600;
      const barH = (hours / maxHours) * chartH;
      const x = padding.left + (idx * colStep) + (colStep - barWidth) / 2;
      const y = padding.top + chartH - barH;

      // Bar fill gradient
      const grad = ctx.createLinearGradient(0, y, 0, padding.top + chartH);
      if (idx === 6) { // today
        grad.addColorStop(0, '#6366f1');
        grad.addColorStop(1, '#4f46e5');
      } else {
        grad.addColorStop(0, isDark ? '#3b82f6' : '#60a5fa');
        grad.addColorStop(1, isDark ? '#1d4ed8' : '#3b82f6');
      }

      ctx.fillStyle = grad;
      // Rounded bar top
      const r = Math.min(4, barH / 2);
      ctx.beginPath();
      ctx.moveTo(x, padding.top + chartH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.lineTo(x + barWidth - r, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
      ctx.lineTo(x + barWidth, padding.top + chartH);
      ctx.closePath();
      ctx.fill();

      // Day label
      ctx.fillStyle = isDark ? (idx === 6 ? '#f8fafc' : '#94a3b8') : (idx === 6 ? '#0f172a' : '#64748b');
      ctx.font = idx === 6 ? 'bold 11px sans-serif' : '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(day.label, x + barWidth / 2, height - 12);
    });
  }

  /**
   * Render task time distribution donut chart
   */
  renderTaskDistribution(canvas) {
    if (!canvas) return;
    const { ctx, width, height } = this._setupCanvas(canvas);
    const tasks = window.storageService.getTasks();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    ctx.clearRect(0, 0, width, height);

    const validTasks = tasks.filter(t => (t.spentSeconds || 0) > 0);
    const totalSpent = validTasks.reduce((sum, t) => sum + t.spentSeconds, 0);

    const centerX = width / 2;
    const centerY = height / 2 - 10;
    const radius = Math.min(centerX, centerY) - 20;
    const innerRadius = radius * 0.65;

    if (totalSpent === 0 || validTasks.length === 0) {
      // Empty state circle
      ctx.strokeStyle = isDark ? '#27354f' : '#e2e8f0';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No focus time yet', centerX, centerY + 4);
      return;
    }

    let startAngle = -Math.PI / 2;

    validTasks.forEach((t, idx) => {
      const sliceAngle = (t.spentSeconds / totalSpent) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      const color = t.color || this.colorPalette[idx % this.colorPalette.length];

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = color;
      ctx.fill();

      startAngle = endAngle;
    });

    // Center text
    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    const totalHours = (totalSpent / 3600).toFixed(1);
    ctx.fillText(`${totalHours}h`, centerX, centerY + 2);

    ctx.font = '10px sans-serif';
    ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.fillText('TOTAL TIME', centerX, centerY + 16);
  }
}

window.analyticsEngine = new AnalyticsEngine();
