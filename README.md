# FocusPulse - Productivity Timer & Multi-Task Goal Tracker

FocusPulse is a modern, high-precision productivity timer application designed to help individuals set, track, and conquer time-based goals across multiple concurrent tasks and projects.

Built with pure vanilla web standards (HTML5, Modern CSS, ES6 JavaScript, Web Audio API, and HTML5 Canvas), it requires **zero external dependencies, compilers, or runtimes**, and runs instantly offline in any web browser.

---

## ✨ Features

- 🎯 **Multi-Task Goal Management**:
  - Add tasks with custom daily, weekly, or overall project target goals (in minutes/hours).
  - Categorize by tags (*Development*, *Deep Work*, *Writing*, *Study*, etc.) and custom theme colors.
  - Visual completion meters and progress bars for each individual task.
  - One-click task switching: effortlessly pause one task and begin logging time toward another.

- ⏱️ **Flexible Precision Timer Engine**:
  - **Pomodoro Technique**: 25m Focus / 5m Short Break / 15m Long Break cycles with auto-advance options.
  - **Custom Countdown Time-Boxing**: Enter any custom duration for targeted sprints.
  - **Count-Up Stopwatch**: Track freeform creative or debugging sessions from zero.
  - **Drift-Free Precision**: Powered by high-resolution timestamp deltas (`Date.now()`) to ensure no lost time when browser tabs are backgrounded or throttled.

- 🔔 **Offline Web Audio Synthesizer**:
  - Synthesizes meditative Tibetan bells, bright harmonic chimes, and digital alerts via the browser's native `AudioContext`.
  - Zero external MP3 downloads required.
  - Full volume slider, mute toggle, and sound tester.
  - Optional desktop push notifications via the standard Notification API.

- 📊 **Productivity Analytics & Dashboard**:
  - **7-Day Focus Trend**: Canvas-rendered bar chart highlighting daily focus volume over the past week.
  - **Task Allocation Doughnut Chart**: Interactive breakdown of time invested by task and tag.
  - **Streak Counter**: Consecutive active focus days tracking.
  - **Session History Log**: Review completed focus intervals with date/time stamps.

- 💾 **Data Ownership & Backup**:
  - Automatically persists all tasks, goals, and history in browser `localStorage`.
  - One-click **Export to CSV** for spreadsheets and reporting.
  - **JSON Backup & Restore** for portable backups across machines.

- 🎨 **Adaptive Themes & Accessibility**:
  - Dark and Light modes (auto-detects system preference or toggle manually).
  - Responsive design optimized for desktop, tablet, and mobile screens.

---

## 🚀 How to Run

Because FocusPulse uses zero-dependency vanilla web standards, you can launch it directly without installing Node or Python:

### Windows / PowerShell
```powershell
# Open in Microsoft Edge
Start-Process "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" "$HOME\.gemini\antigravity\scratch\productivity-timer\index.html"

# Or open in Google Chrome
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" "$HOME\.gemini\antigravity\scratch\productivity-timer\index.html"
```

Or simply double-click `index.html` in Windows File Explorer!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Start / Pause active timer |
| <kbd>R</kbd> | Reset active timer to initial duration |
| <kbd>S</kbd> | Skip current interval and log session |
| <kbd>N</kbd> | Open **New Task Goal** modal |
| <kbd>M</kbd> | Toggle audio mute / unmute |

---

## 📂 Project Structure

```
productivity-timer/
├── index.html              # Core application markup & component structure
├── css/
│   └── styles.css          # Theme variables, responsive layouts, dials & progress bars
├── js/
│   ├── app.js              # Application coordinator & event bindings
│   ├── timer.js            # Precision drift-free timer engine
│   ├── storage.js          # LocalStorage CRUD, export/import utilities
│   ├── audio.js            # Web Audio API procedural sound synthesizer
│   └── analytics.js        # Canvas chart visualizer & streak calculations
└── README.md               # Documentation & usage guide
```
