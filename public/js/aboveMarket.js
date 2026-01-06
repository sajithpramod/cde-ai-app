import { getSocket } from './socketManager.js';
import { fetchCSRFToken } from './csrf.js';

const socket = getSocket();
const popup = document.getElementById('aboveMarketPopup');
const processStatus = document.getElementById('processStatus1');
const progressBar = document.getElementById('aboveMarketprogressBar');
const progressContainer = document.getElementById('progressContainer');
const spinner = document.getElementById('spinnerContainer');

let csrfToken;

// Mapping script steps for progress %
const totalSteps = 5; // main.py, R1, R2, R3, bubble_chart
let currentStep = 0;
let running = false;

document.getElementById('typeOfModel').addEventListener('change', (e) => {
    if (e.target.value === 'above') {
        popup.classList.remove('hidden');
    } else {
        popup.classList.add('hidden');
    }
});

document.getElementById('createForecastBtn').addEventListener('click', async () => {
    // Reset UI/state for a new run
    currentStep = 0;
    running = true;
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    spinner.classList.remove('hidden');
    processStatus.innerText = 'Starting process...';

    csrfToken = await fetchCSRFToken();

    try {
        const response = await fetch('/forecast/above-market', {
            method: 'POST',
            credentials: 'include',
            headers: { 'csrf-token': csrfToken },
        });

        const result = await response.json();
        if (!result.success) {
            processStatus.innerText = `Error: ${result.error}`;
            spinner.classList.add('hidden');
            running = false;
            return;
        }

        processStatus.innerText = 'Processing started...';
    } catch (err) {
        processStatus.innerText = `Error: ${err.message || err}`;
        spinner.classList.add('hidden');
        running = false;
    }
});

// Socket event for status messages
socket.on('forecast-progress', (msg) => {
    // Defensive: ensure msg is a string
    msg = (msg === undefined || msg === null) ? '' : String(msg);
    processStatus.innerText = msg;

    // Show spinner during "Starting" or "Running". Use 'msg' (fixed typo).
    if (msg.includes('Starting') || msg.includes('Running')) {
        spinner.classList.remove('hidden');
    } else if (msg.includes('✅') || msg.includes('🎉') || msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('error')) {
        spinner.classList.add('hidden');
    }

    // Advance progress bar when we detect completed steps (check for '✅' or 'completed')
    // This prevents accidental increments from other messages.
    if (msg.includes('✅') || /\bcompleted\b/i.test(msg)) {
    // Only increment while the process is marked running
        if (running) {
            currentStep = Math.min(currentStep + 1, totalSteps);
            const progressPercent = Math.round((currentStep / totalSteps) * 100);
            progressBar.style.width = `${progressPercent}%`;
        }
    }
});

socket.on('forecast-complete', (isComplete) => {
    running = false;
    spinner.classList.add('hidden');
    if (isComplete) {
        processStatus.innerText = '✅ Forecast complete!';
        progressBar.style.width = '100%';
        currentStep = totalSteps;
        setTimeout(() => {
            window.location.href = '/markets/above-market-reports';
        }, 1500);
    } else {
    // if not complete, keep the last state but hide spinner
        processStatus.innerText = 'Forecast finished with issues.';
    }

    // optional: hide progressContainer after a delay
    setTimeout(() => {
    // progressContainer.classList.add('hidden');
    }, 2000);
});


