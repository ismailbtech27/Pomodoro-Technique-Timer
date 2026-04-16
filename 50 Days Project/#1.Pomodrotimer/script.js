// Core Timer State
let MODES = {
    pomodoro: { minutes: 25, color: '#ff4b4b' },
    shortBreak: { minutes: 5, color: '#00d2ff' },
    longBreak: { minutes: 15, color: '#8e2de2' }
};

let currentMode = 'pomodoro';
let timeLeft = MODES[currentMode].minutes * 60;
let totalTime = timeLeft;
let timer = null;
let isRunning = false;
let completedPomodoros = 0;

// DOM Elements - Timer
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const modeBtns = document.querySelectorAll('.mode-btn');
const progressBar = document.getElementById('progress-bar');
const pomodoroCountDisplay = document.getElementById('pomodoro-count');
const root = document.documentElement;

// DOM Elements - Settings & Theme
const themeBtn = document.getElementById('theme-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');

// DOM Elements - Tasks
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');

// Audio Elements
const alarmAudio = document.getElementById('alarm-audio');
const ambientRain = document.getElementById('ambient-rain');
const ambientCafe = document.getElementById('ambient-cafe');
let currentAmbient = null;

// --- Timer Logic ---
function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    minutesDisplay.textContent = minutes.toString().padStart(2, '0');
    secondsDisplay.textContent = seconds.toString().padStart(2, '0');
    
    const progress = (timeLeft / totalTime) * 100;
    progressBar.style.width = `${progress}%`;

    document.title = `${minutesDisplay.textContent}:${secondsDisplay.textContent} - Focus`;
}

function switchMode(mode) {
    if (isRunning) {
        if (!confirm('Timer is running. Are you sure you want to switch modes?')) {
            return;
        }
        pauseTimer();
    }

    currentMode = mode;
    timeLeft = MODES[mode].minutes * 60;
    totalTime = timeLeft;
    
    modeBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

    root.style.setProperty('--current-accent', MODES[mode].color);
    updateDisplay();
}

function startTimer() {
    if (isRunning) return;
    
    isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    
    // Play ambient sound if configured and in pomodoro mode
    const ambientSelect = document.getElementById('setting-ambient').value;
    if (currentMode === 'pomodoro' && ambientSelect !== 'none') {
        currentAmbient = document.getElementById(`ambient-${ambientSelect}`);
        if (currentAmbient) {
            currentAmbient.play().catch(e => console.log('Audio play failed:', e));
        }
    }
    
    timer = setInterval(() => {
        timeLeft--;
        updateDisplay();
        
        if (timeLeft <= 0) {
            handleTimerComplete();
        }
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;
    
    clearInterval(timer);
    isRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = 'Resume';
    
    if (currentAmbient) {
        currentAmbient.pause();
    }
}

function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    timeLeft = MODES[currentMode].minutes * 60;
    
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = 'Start';
    
    if (currentAmbient) {
        currentAmbient.pause();
        currentAmbient.currentTime = 0;
    }
    
    updateDisplay();
}

function handleTimerComplete() {
    clearInterval(timer);
    isRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = 'Start';
    
    if (currentAmbient) {
        currentAmbient.pause();
        currentAmbient.currentTime = 0;
    }
    
    // Play Alarm
    if (document.getElementById('setting-alarm').checked) {
        alarmAudio.play().catch(e => console.log('Alarm play failed:', e));
    }

    // Show Notification
    if (document.getElementById('setting-notifications').checked) {
        if (Notification.permission === "granted") {
            new Notification("Pomodoro Timer", {
                body: `${currentMode === 'pomodoro' ? 'Focus time' : 'Break'} is over!`,
                icon: "https://cdn-icons-png.flaticon.com/512/1000/1000143.png" // placeholder icon
            });
        }
    }
    
    if (currentMode === 'pomodoro') {
        completedPomodoros++;
        pomodoroCountDisplay.textContent = completedPomodoros;
        
        if (completedPomodoros % 4 === 0) {
            switchMode('longBreak');
        } else {
            switchMode('shortBreak');
        }
    } else {
        switchMode('pomodoro');
    }
}

// --- Theme Toggling ---
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    if (document.body.classList.contains('light-mode')) {
        themeBtn.textContent = '🌙';
    } else {
        themeBtn.textContent = '🌓';
    }
});

// --- Settings Modal ---
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

saveSettingsBtn.addEventListener('click', () => {
    // Update Mode Times
    const newPomodoro = parseInt(document.getElementById('setting-pomodoro').value);
    const newShort = parseInt(document.getElementById('setting-short').value);
    const newLong = parseInt(document.getElementById('setting-long').value);
    
    if (newPomodoro > 0) MODES.pomodoro.minutes = newPomodoro;
    if (newShort > 0) MODES.shortBreak.minutes = newShort;
    if (newLong > 0) MODES.longBreak.minutes = newLong;

    // Ask for notification permission if checked
    if (document.getElementById('setting-notifications').checked && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // Reset current timer with new settings if it's not running
    if (!isRunning) {
        timeLeft = MODES[currentMode].minutes * 60;
        totalTime = timeLeft;
        updateDisplay();
    }
    
    settingsModal.classList.add('hidden');
});

// --- Task Management ---
function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;
    
    const li = document.createElement('li');
    li.className = 'task-item';
    
    li.innerHTML = `
        <input type="checkbox" class="task-checkbox">
        <span>${text}</span>
        <button class="delete-task-btn">&times;</button>
    `;
    
    const checkbox = li.querySelector('.task-checkbox');
    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            li.classList.add('completed');
        } else {
            li.classList.remove('completed');
        }
    });

    const delBtn = li.querySelector('.delete-task-btn');
    delBtn.addEventListener('click', () => {
        li.remove();
    });
    
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

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        switchMode(btn.dataset.mode);
    });
});

// Request notification permission early if they want standard support
if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    // Notification.requestPermission(); // Wait for user to check settings
}

// Initialize
updateDisplay();
