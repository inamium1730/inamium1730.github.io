import { state } from './404/state.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './404/constants.js';
import { initTheme } from './404/theme.js';
import { toggleMute } from './404/audio.js';
import { resetGame } from './404/entities.js';
import { update } from './404/update.js';
import { draw } from './404/draw.js';
import { setupInput } from './404/input.js';
import { isMobile } from './404/utils.js';

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Fetch external data
    try {
        const [enemiesRes, bossesRes] = await Promise.all([
            fetch('./assets/scripts/404/constants/enemies.json'),
            fetch('./assets/scripts/404/constants/bosses.json')
        ]);
        if (enemiesRes.ok) state.enemiesData = await enemiesRes.json();
        if (bossesRes.ok) state.bossesData = await bossesRes.json();
    } catch (e) {
        console.warn('Failed to load JSON references:', e);
    }

    // 2. Setup Theme
    const themeToggleBtn = document.getElementById('theme-toggle');
    initTheme(themeToggleBtn);

    // 3. Setup Audio
    const muteBtn = document.getElementById('mute-btn');
    const iconUnmute = document.getElementById('icon-unmute');
    const iconMute = document.getElementById('icon-mute');
    if (muteBtn) {
        muteBtn.addEventListener('click', () => toggleMute(muteBtn, iconUnmute, iconMute));
    }

    // 4. Setup Game Elements
    const errorCode = document.querySelector('.error-code');
    const gameContainer = document.getElementById('game-container');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // 5. Game Loop
    let gameLoopId = null;
    let lastTime = 0;
    let accumulator = 0;
    const TIME_STEP = 1000 / 60;

    const loop = (timestamp) => {
        if (!lastTime) lastTime = timestamp;
        let dt = timestamp - lastTime;
        lastTime = timestamp;

        if (dt > 100) dt = 100;

        accumulator += dt;
        while (accumulator >= TIME_STEP) {
            update();
            accumulator -= TIME_STEP;
        }

        draw(ctx);
        gameLoopId = requestAnimationFrame(loop);
    };

    const startGame = () => {
        gameContainer.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        const bgShapes = document.querySelector('.bg-shapes');
        const errorCard = document.querySelector('.error-card');
        if (bgShapes) bgShapes.style.display = 'none';
        if (errorCard) errorCard.style.display = 'none';

        if (isMobile) {
            document.getElementById('mobile-controls').classList.remove('hidden');
        }
        resetGame();
        if (!gameLoopId) {
            gameLoopId = requestAnimationFrame(loop);
        }
    };

    // 6. Setup Inputs
    setupInput(canvas, gameContainer);

    // 7. Easter Egg Logic
    let clickCount = 0;
    let clickTimer = null;

    if (errorCode) {
        errorCode.style.cursor = 'pointer';
        errorCode.addEventListener('click', () => {
            errorCode.classList.remove('shake');
            void errorCode.offsetWidth; // trigger reflow
            errorCode.classList.add('shake');

            clickCount++;
            clearTimeout(clickTimer);

            if (clickCount >= 10) {
                clickCount = 0;
                startGame();
            } else {
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                }, 500);
            }
        });
    }
});
