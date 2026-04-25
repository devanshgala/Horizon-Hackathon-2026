const CONFIG = {
    easy: { colors: 4, slots: 4, guesses: 8, timeSeconds: 300 },
    medium: { colors: 6, slots: 5, guesses: 10, timeSeconds: 240 },
    hard: { colors: 8, slots: 6, guesses: 12, timeSeconds: 180 }
};

const PALETTE = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#e84393'];

let gameState = {
    difficulty: 'medium',
    secretCode: [],
    currentGuess: [],
    activeRowIndex: 0,
    selectedColor: null,
    timerInterval: null,
    timeRemaining: 0,
    isGameOver: false
};

const elements = {
    coreGameUI: document.getElementById('core-game-ui'), // NEW: Wrapper for the entire game board/buttons
    board: document.getElementById('game-board'),
    palette: document.getElementById('color-palette'),
    submitBtn: document.getElementById('submit-guess'),
    giveUpBtn: document.getElementById('give-up-btn'),
    playAgainInlineBtn: document.getElementById('play-again-inline'),
    secretCodeRow: document.getElementById('secret-code-reveal'),
    guessesLeftText: document.getElementById('guesses-left'),
    timeDisplay: document.getElementById('time-display'),
    timerArc: document.getElementById('timer-arc'),
    themeToggle: document.getElementById('theme-toggle'),

    // Modals & New Welcome Flow
    welcomeModal: document.getElementById('welcome-modal'),
    initialDifficultySelect: document.getElementById('initial-difficulty'),
    startGameBtn: document.getElementById('start-game-btn'),

    gameOverModal: document.getElementById('game-over-modal'),
    modalTitle: document.getElementById('modal-title'),
    modalMessage: document.getElementById('modal-message'),
    modalStats: document.getElementById('modal-stats'),
    scoreSection: document.getElementById('score-input-section'),
    modalRestartContainer: document.getElementById('modal-restart-container'),
    restartBtn: document.getElementById('restart-game'),
    playerNameInput: document.getElementById('player-name'),
    saveScoreBtn: document.getElementById('save-score'),

    leaderboardBtn: document.getElementById('leaderboard-btn'),
    leaderboardModal: document.getElementById('leaderboard-modal'),
    leaderboardList: document.getElementById('leaderboard-list'),
    closeLeaderboardBtn: document.getElementById('close-leaderboard'),
    leaderboardRestartBtn: document.getElementById('leaderboard-restart'),
    tabBtns: document.querySelectorAll('.tab-btn')
};

// --- CORE GAME LOOP ---

function initGame() {
    clearInterval(gameState.timerInterval);
    const config = CONFIG[gameState.difficulty];

    gameState.secretCode = generateSecretCode(config.colors, config.slots);
    gameState.currentGuess = new Array(config.slots).fill(null);
    gameState.activeRowIndex = 0;
    gameState.isGameOver = false;
    gameState.timeRemaining = config.timeSeconds;
    gameState.selectedColor = PALETTE[0];

    elements.guessesLeftText.textContent = config.guesses;

    // Close modals
    elements.welcomeModal.close();
    elements.gameOverModal.close();
    elements.leaderboardModal.close();

    // Reset Board State
    elements.secretCodeRow.classList.add('hidden');
    elements.secretCodeRow.classList.remove('glow-animation');
    elements.board.classList.remove('shake-animation');

    // Reset Action Buttons
    elements.submitBtn.classList.remove('hidden');
    elements.giveUpBtn.classList.remove('hidden');
    elements.playAgainInlineBtn.classList.add('hidden');
    elements.giveUpBtn.disabled = false;
    elements.playerNameInput.value = "";

    renderPalette(config.colors);
    renderBoard(config.slots, config.guesses);
    startTimer();
    updateSubmitButton();
}

function generateSecretCode(colorCount, slotCount) {
    const code = [];
    const availableColors = PALETTE.slice(0, colorCount);
    for (let i = 0; i < slotCount; i++) {
        code.push(availableColors[Math.floor(Math.random() * availableColors.length)]);
    }
    return code;
}

function renderPalette(colorCount) {
    elements.palette.innerHTML = '';
    const availableColors = PALETTE.slice(0, colorCount);

    availableColors.forEach((color, index) => {
        const btn = document.createElement('div');
        btn.classList.add('color-btn');
        btn.style.backgroundColor = color;
        if (index === 0) btn.classList.add('selected');

        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            gameState.selectedColor = color;
        });

        elements.palette.appendChild(btn);
    });
}

function renderBoard(slots, guesses) {
    elements.board.innerHTML = '';
    for (let i = 0; i < guesses; i++) {
        const row = document.createElement('div');
        row.classList.add('board-row');
        row.dataset.rowIndex = i;
        if (i === 0) row.classList.add('active-row');

        const slotsContainer = document.createElement('div');
        slotsContainer.classList.add('slots');

        for (let j = 0; j < slots; j++) {
            const slot = document.createElement('div');
            slot.classList.add('slot');
            slot.dataset.slotIndex = j;
            slotsContainer.appendChild(slot);
        }

        const feedbackContainer = document.createElement('div');
        feedbackContainer.classList.add('feedback');
        feedbackContainer.style.gridTemplateColumns = `repeat(${Math.ceil(slots / 2)}, 1fr)`;

        for (let j = 0; j < slots; j++) {
            const peg = document.createElement('div');
            peg.classList.add('peg');
            feedbackContainer.appendChild(peg);
        }

        row.appendChild(slotsContainer);
        row.appendChild(feedbackContainer);
        elements.board.prepend(row);
    }
}

// EVENT DELEGATION
elements.board.addEventListener('click', (e) => {
    const slotElement = e.target.closest('.slot');
    if (!slotElement) return;

    const rowElement = slotElement.closest('.board-row');
    if (!rowElement) return;

    const rowIndex = parseInt(rowElement.dataset.rowIndex, 10);
    const slotIndex = parseInt(slotElement.dataset.slotIndex, 10);

    handleSlotClick(rowIndex, slotIndex, slotElement);
});

function handleSlotClick(rowIndex, slotIndex, slotElement) {
    if (gameState.isGameOver || rowIndex !== gameState.activeRowIndex) return;

    slotElement.style.backgroundColor = gameState.selectedColor;
    gameState.currentGuess[slotIndex] = gameState.selectedColor;

    updateSubmitButton();
}

function updateSubmitButton() {
    elements.submitBtn.disabled = !gameState.currentGuess.every(color => color !== null);
}

// --- CORE ALGORITHM ---
function evaluateGuess() {
    if (gameState.isGameOver) return;
    elements.submitBtn.disabled = true;

    const config = CONFIG[gameState.difficulty];
    let exactMatches = 0;
    let partialMatches = 0;

    let guessCopy = [...gameState.currentGuess];
    let secretCopy = [...gameState.secretCode];

    // PASS 1: Exact
    for (let i = 0; i < config.slots; i++) {
        if (guessCopy[i] === secretCopy[i]) {
            exactMatches++;
            guessCopy[i] = null;
            secretCopy[i] = null;
        }
    }

    // PASS 2: Partial
    for (let i = 0; i < config.slots; i++) {
        if (guessCopy[i] !== null) {
            const indexInSecret = secretCopy.indexOf(guessCopy[i]);
            if (indexInSecret !== -1) {
                partialMatches++;
                secretCopy[indexInSecret] = null;
            }
        }
    }

    renderFeedback(exactMatches, partialMatches);
    checkWinCondition(exactMatches, config.slots);
}

function renderFeedback(exact, partial) {
    const activeRow = document.querySelector(`.board-row[data-row-index="${gameState.activeRowIndex}"]`);
    const pegs = activeRow.querySelectorAll('.peg');
    let pegIndex = 0;

    for (let i = 0; i < exact; i++) {
        pegs[pegIndex].classList.add('black', 'reveal');
        pegs[pegIndex].style.setProperty('--delay', `${pegIndex * 150}ms`);
        pegIndex++;
    }

    for (let i = 0; i < partial; i++) {
        pegs[pegIndex].classList.add('white', 'reveal');
        pegs[pegIndex].style.setProperty('--delay', `${pegIndex * 150}ms`);
        pegIndex++;
    }
}

function checkWinCondition(exactMatches, totalSlots) {
    const config = CONFIG[gameState.difficulty];

    if (exactMatches === totalSlots) {
        endGame(true, 'win');
    } else {
        gameState.activeRowIndex++;
        const guessesLeft = config.guesses - gameState.activeRowIndex;
        elements.guessesLeftText.textContent = guessesLeft;

        if (guessesLeft === 0) {
            endGame(false, 'out_of_guesses');
        } else {
            document.querySelectorAll('.board-row').forEach(row => row.classList.remove('active-row'));
            const newActiveRow = document.querySelector(`.board-row[data-row-index="${gameState.activeRowIndex}"]`);
            newActiveRow.classList.add('active-row');
            newActiveRow.scrollIntoView({ behavior: 'smooth', block: 'center' });

            gameState.currentGuess = new Array(config.slots).fill(null);
        }
    }
}

function revealSecretCodeOnBoard() {
    elements.secretCodeRow.innerHTML = '';
    elements.secretCodeRow.classList.remove('hidden');
    gameState.secretCode.forEach(color => {
        const slot = document.createElement('div');
        slot.classList.add('slot');
        slot.style.backgroundColor = color;
        slot.style.boxShadow = 'none';
        slot.style.border = '2px solid var(--border-color)';
        elements.secretCodeRow.appendChild(slot);
    });
}

function endGame(isWin, reason = '') {
    gameState.isGameOver = true;
    clearInterval(gameState.timerInterval);

    elements.submitBtn.classList.add('hidden');
    elements.giveUpBtn.classList.add('hidden');
    elements.playAgainInlineBtn.classList.remove('hidden');

    revealSecretCodeOnBoard();

    if (isWin) {
        elements.modalTitle.textContent = "Code Cracked!";
        const timeTaken = CONFIG[gameState.difficulty].timeSeconds - gameState.timeRemaining;
        elements.modalMessage.textContent = "You successfully decoded the sequence.";
        elements.modalStats.textContent = `Guesses: ${gameState.activeRowIndex + 1} | Time: ${formatTime(timeTaken)}`;

        elements.scoreSection.classList.remove('hidden');
        elements.modalRestartContainer.classList.add('hidden');

        elements.secretCodeRow.classList.add('glow-animation');
        fireConfetti();
    } else {
        if (reason === 'timeout') {
            elements.modalTitle.textContent = "Time's Up!";
            elements.modalMessage.textContent = "You failed to crack the code in time.";
        } else if (reason === 'out_of_guesses') {
            elements.modalTitle.textContent = "System Locked!";
            elements.modalMessage.textContent = "You ran out of attempts.";
        } else {
            elements.modalTitle.textContent = "Game Over";
            elements.modalMessage.textContent = "You surrendered. The code remained unbroken.";
        }

        elements.modalStats.textContent = "Check the top of the board to see the solution.";
        elements.scoreSection.classList.add('hidden');
        elements.modalRestartContainer.classList.remove('hidden');
        elements.board.classList.add('shake-animation');
    }

    setTimeout(() => { elements.gameOverModal.showModal(); }, 1200);
}

function startTimer() {
    const totalTime = CONFIG[gameState.difficulty].timeSeconds;
    const circumference = 283;
    elements.timerArc.classList.remove('warning', 'danger');

    const startTime = Date.now();

    gameState.timerInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        gameState.timeRemaining = totalTime - elapsedSeconds;

        if (gameState.timeRemaining <= 0) {
            gameState.timeRemaining = 0;
            clearInterval(gameState.timerInterval);
            endGame(false, 'timeout');
        }

        elements.timeDisplay.textContent = formatTime(gameState.timeRemaining);
        const strokeOffset = circumference - (gameState.timeRemaining / totalTime) * circumference;
        elements.timerArc.style.strokeDashoffset = strokeOffset;

        if (gameState.timeRemaining <= 60 && gameState.timeRemaining > 15) {
            elements.timerArc.classList.add('warning');
        }
        if (gameState.timeRemaining <= 15) {
            elements.timerArc.classList.remove('warning');
            elements.timerArc.classList.add('danger');
        }

    }, 500);
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// --- LOCAL STORAGE ---
function getLeaderboard() {
    try {
        const data = localStorage.getItem('cipherLeaderboard');
        return data ? JSON.parse(data) : { easy: [], medium: [], hard: [] };
    } catch (e) {
        return { easy: [], medium: [], hard: [] };
    }
}

function saveScore() {
    const name = elements.playerNameInput.value.trim() || "Anonymous";
    const timeTaken = CONFIG[gameState.difficulty].timeSeconds - gameState.timeRemaining;
    const guesses = gameState.activeRowIndex + 1;

    const scoreRecord = { name, time: timeTaken, guesses, date: new Date().toLocaleDateString() };
    let leaderboard = getLeaderboard();

    leaderboard[gameState.difficulty].push(scoreRecord);

    leaderboard[gameState.difficulty].sort((a, b) => {
        if (a.guesses === b.guesses) return a.time - b.time;
        return a.guesses - b.guesses;
    });

    leaderboard[gameState.difficulty] = leaderboard[gameState.difficulty].slice(0, 10);
    localStorage.setItem('cipherLeaderboard', JSON.stringify(leaderboard));

    elements.gameOverModal.close();
    showLeaderboard();
}

function showLeaderboard(tier = gameState.difficulty) {
    elements.leaderboardList.innerHTML = '';
    elements.tabBtns.forEach(btn => {
        const isActive = btn.dataset.tier === tier;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive);
    });

    const leaderboard = getLeaderboard();
    const tierData = leaderboard[tier];

    if (tierData.length === 0) {
        elements.leaderboardList.innerHTML = '<li>No records yet. Be the first!</li>';
    } else {
        tierData.forEach((record, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${index + 1}. ${record.name}</strong> - ${record.guesses} Guesses (${formatTime(record.time)})`;
            elements.leaderboardList.appendChild(li);
        });
    }

    if (!elements.leaderboardModal.open) elements.leaderboardModal.showModal();
}

// --- EVENT LISTENERS ---

// NEW: Core UI only unhides when this button is clicked
elements.startGameBtn.addEventListener('click', () => {
    gameState.difficulty = elements.initialDifficultySelect.value;
    elements.coreGameUI.classList.remove('hidden');
    initGame();
});

elements.submitBtn.addEventListener('click', evaluateGuess);
elements.giveUpBtn.addEventListener('click', () => endGame(false, 'surrender'));

elements.playAgainInlineBtn.addEventListener('click', () => {
    elements.welcomeModal.showModal();
});

elements.themeToggle.addEventListener('click', () => {
    const htmlEl = document.documentElement;
    const currentTheme = htmlEl.getAttribute('data-theme');
    htmlEl.setAttribute('data-theme', currentTheme === 'dark' ? 'light' : 'dark');
});

elements.restartBtn.addEventListener('click', () => {
    elements.gameOverModal.close();
});
elements.saveScoreBtn.addEventListener('click', saveScore);

elements.leaderboardBtn.addEventListener('click', () => showLeaderboard(gameState.difficulty));
elements.closeLeaderboardBtn.addEventListener('click', () => elements.leaderboardModal.close());
elements.leaderboardRestartBtn.addEventListener('click', () => {
    elements.leaderboardModal.close();
    elements.welcomeModal.showModal();
});
elements.tabBtns.forEach(btn => btn.addEventListener('click', (e) => showLeaderboard(e.target.dataset.tier)));

// --- CONFETTI ---
function fireConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 100 }).map(() => ({
        x: canvas.width / 2, y: canvas.height / 2, r: Math.random() * 6 + 2,
        dx: Math.random() * 10 - 5, dy: Math.random() * -10 - 5,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)]
    }));

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;
        particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            p.dy += 0.2;
            if (p.y < canvas.height) { active = true; }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });
        if (active) requestAnimationFrame(animate);
    }
    animate();
}

// --- BOOTSTRAP ---
// Show modal on load. Background UI remains hidden due to #core-game-ui having the .hidden class
elements.welcomeModal.showModal();