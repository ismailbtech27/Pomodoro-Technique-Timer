// Initialize Icons
lucide.createIcons();

// Elements
const timeDisplay = document.getElementById('time-display');
const progressBar = document.getElementById('progress-bar');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const modeTabs = document.querySelectorAll('.mode-tab');

// Stats and Tasks
const completedPomodorosEl = document.getElementById('completed-pomodoros');
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');

// Header & Modal
const themeToggle = document.getElementById('theme-toggle');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');

// Inputs
const pomoInput = document.getElementById('pomo-duration');
const shortBreakInput = document.getElementById('short-break-duration');
const longBreakInput = document.getElementById('long-break-duration');
const desktopNotifCheckbox = document.getElementById('desktop-notif');
const playAlarmCheckbox = document.getElementById('play-alarm');

// Timer State
let settings = {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    desktopNotifications: false,
    playAlarm: true
};

let currentMode = 'pomodoro'; // pomodoro, shortBreak, longBreak
let timeLeft = settings.pomodoro * 60;
let isActive = false;
let timerInterval = null;
let completedPomodoros = 0;

// Functions
function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update Progress Bar
    const totalTime = settings[currentMode] * 60;
    let progressPercentage = ((totalTime - timeLeft) / totalTime) * 100;
    
    // Invert progress if we want it to decrease, or increase. Standard is fill up.
    progressBar.style.width = `${progressPercentage}%`;
    
    // Document Title Update
    document.title = `${timeDisplay.textContent} - Focus`;
}

function switchMode(mode) {
    if (isActive) {
        if (!confirm('Timer is active. Are you sure you want to switch modes?')) return;
        pauseTimer();
    }
    
    currentMode = mode;
    timeLeft = settings[currentMode] * 60;
    
    // Update UI tabs
    modeTabs.forEach(tab => {
        if (tab.dataset.mode === mode) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update Progress Bar color and glow based on mode
    let color = '#ff4b4b'; // Pomodoro Red
    let hoverColor = '#ff3333';
    let rgbPulse = '255, 75, 75'; // For box shadow glowing
    
    if (mode === 'shortBreak') {
        color = '#10b981'; // Teal/Green
        hoverColor = '#059669';
        rgbPulse = '16, 185, 129';
    } else if (mode === 'longBreak') {
        color = '#3b82f6'; // Bright Blue
        hoverColor = '#2563eb';
        rgbPulse = '59, 130, 246';
    }
    
    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--primary-hover', hoverColor);
    document.documentElement.style.setProperty('--glow-color', `rgba(${rgbPulse}, 0.6)`);
    document.documentElement.style.setProperty('--glow-color-light', `rgba(${rgbPulse}, 0.25)`);

    updateDisplay();
}

function playAlarmSound() {
    if (!settings.playAlarm) return;

    // Generate a gentle alarm sound using Web Audio API
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    function playBeep(time, freq, vol) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        
        osc.start(time);
        osc.stop(time + 0.5);
    }

    const now = ctx.currentTime;
    playBeep(now, 880, 0.5);          // A5
    playBeep(now + 0.2, 1046.50, 0.5); // C6
    playBeep(now + 0.4, 1318.51, 0.5); // E6
}

function sendNotification(title, message) {
    if (settings.desktopNotifications && Notification.permission === "granted") {
        new Notification(title, { body: message });
    }
}

function handleTimerComplete() {
    pauseTimer();
    playAlarmSound();
    
    if (currentMode === 'pomodoro') {
        completedPomodoros++;
        completedPomodorosEl.textContent = completedPomodoros;
        sendNotification("Pomodoro Complete!", "Time for a short break.");
        switchMode('shortBreak');
    } else {
        sendNotification("Break Complete!", "Ready to focus?");
        switchMode('pomodoro');
    }
}

function startTimer() {
    if (isActive) return;
    isActive = true;
    
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateDisplay();
        } else {
            handleTimerComplete();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isActive = false;
}

function resetTimer() {
    pauseTimer();
    timeLeft = settings[currentMode] * 60;
    updateDisplay();
}

// Tasks Functions
function addTask() {
    const taskText = taskInput.value.trim();
    if (!taskText) return;

    const li = document.createElement('li');
    li.className = 'task-item';
    
    const span = document.createElement('span');
    span.textContent = taskText;
    
    const btn = document.createElement('button');
    btn.className = 'remove-task';
    btn.innerHTML = '×';
    btn.onclick = () => li.remove();

    li.appendChild(span);
    li.appendChild(btn);
    taskList.appendChild(li);

    taskInput.value = '';
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

// Event Listeners
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

modeTabs.forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
});

// Theme Toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

// Settings Modal
settingsBtn.addEventListener('click', () => {
    pomoInput.value = settings.pomodoro;
    shortBreakInput.value = settings.shortBreak;
    longBreakInput.value = settings.longBreak;
    desktopNotifCheckbox.checked = settings.desktopNotifications;
    playAlarmCheckbox.checked = settings.playAlarm;
    settingsModal.classList.remove('hidden');
});

function closeSettingsModal() {
    settingsModal.classList.add('hidden');
}

closeSettings.addEventListener('click', closeSettingsModal);
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
});

desktopNotifCheckbox.addEventListener('change', () => {
    if (desktopNotifCheckbox.checked && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
});

saveSettingsBtn.addEventListener('click', () => {
    const p = parseInt(pomoInput.value);
    const s = parseInt(shortBreakInput.value);
    const l = parseInt(longBreakInput.value);
    
    if (p > 0 && s > 0 && l > 0) {
        settings.pomodoro = p;
        settings.shortBreak = s;
        settings.longBreak = l;
        settings.desktopNotifications = desktopNotifCheckbox.checked;
        settings.playAlarm = playAlarmCheckbox.checked;
        
        if (!isActive) {
            timeLeft = settings[currentMode] * 60;
            updateDisplay();
        }
        closeSettingsModal();
    } else {
        alert("Please enter valid positive values for all durations.");
    }
});

// Initialize Settings Permissions if checked
if (settings.desktopNotifications && Notification.permission !== "granted") {
    Notification.requestPermission();
}

// Initialize Display
updateDisplay();
