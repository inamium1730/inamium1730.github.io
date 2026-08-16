import { state } from './state.js';
import { resetGame } from './entities.js';

const startPlay = () => {
    if (state.gameState !== 'TUTORIAL' && state.gameState !== 'READY') return;

    const wasTutorial = state.gameState === 'TUTORIAL';
    state.gameState = 'PLAYING';
    state.paddle.isSpawning = false;
    state.paddle.invincibleEndTime = Date.now() + 2000;

    if (state.balls.length > 0) {
        if (state.currentStage === 10 && wasTutorial) {
            state.balls[0].vx = 0;
        } else {
            state.balls[0].vx = (Math.random() > 0.5 ? 1 : -1) * 1.25;
        }
        state.balls[0].vy = -2;

        const isBlasterActive = state.currentStage === 10 && state.boss403State?.active && state.blocks.some(b => b.part === 'blaster' && b.active);
        if (isBlasterActive) {
            state.balls[0].isDecelerating = true;
            state.balls[0].decelerateStartTime = Date.now();
        }
    }
};

export const setupInput = (canvas, gameContainer) => {
    // Mobile input handling
    const mobileLeft = document.getElementById('btn-left');
    const mobileRight = document.getElementById('btn-right');

    const handleMobileInput = () => {
        if (!gameContainer.classList.contains('hidden')) {
            startPlay();
        }
    };

    if (mobileLeft) {
        mobileLeft.addEventListener('touchstart', (e) => { e.preventDefault(); state.keys.left = true; handleMobileInput(); }, { passive: false });
        mobileLeft.addEventListener('touchend', (e) => { e.preventDefault(); state.keys.left = false; }, { passive: false });
        mobileLeft.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    if (mobileRight) {
        mobileRight.addEventListener('touchstart', (e) => { e.preventDefault(); state.keys.right = true; handleMobileInput(); }, { passive: false });
        mobileRight.addEventListener('touchend', (e) => { e.preventDefault(); state.keys.right = false; }, { passive: false });
        mobileRight.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    window.addEventListener('beforeunload', (e) => {
        if (!gameContainer.classList.contains('hidden') && (state.gameState === 'PLAYING' || state.gameState === 'READY' || state.gameState === 'TUTORIAL')) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    canvas.addEventListener('touchstart', (e) => {
        if (gameContainer.classList.contains('hidden')) return;

        if (state.gameState === 'GAMEOVER' || state.gameState === 'GAMECLEAR') {
            e.preventDefault();
            resetGame(state.gameState === 'GAMECLEAR');
        } else if (state.gameState === 'TUTORIAL') {
            const maxStage = parseInt(localStorage.getItem('404_max_stage') || '1', 10);
            if (maxStage > 1) {
                e.preventDefault();
                if (e.touches.length === 3) {
                    state.currentStage -= 2;
                    while (state.currentStage < 1) state.currentStage += maxStage;
                } else if (e.touches.length === 2) {
                    state.currentStage = state.currentStage >= maxStage ? 1 : state.currentStage + 1;
                }
                if (e.touches.length >= 2) {
                    resetGame(false);
                    state.stageTitleShowTime = Date.now() + 2000;
                }
            }
        }
    }, { passive: false });

    canvas.addEventListener('click', () => {
        if (!gameContainer.classList.contains('hidden')) {
            if (state.gameState === 'GAMEOVER' || state.gameState === 'GAMECLEAR') {
                resetGame(state.gameState === 'GAMECLEAR');
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (gameContainer.classList.contains('hidden')) return;

        if (state.gameState === 'TUTORIAL') {
            if (e.key === 'Tab') {
                e.preventDefault();
                const maxStage = parseInt(localStorage.getItem('404_max_stage') || '1', 10);
                if (maxStage > 1) {
                    if (e.shiftKey) {
                        state.currentStage = state.currentStage <= 1 ? maxStage : state.currentStage - 1;
                    } else {
                        state.currentStage = state.currentStage >= maxStage ? 1 : state.currentStage + 1;
                    }
                    resetGame(false);
                    state.stageTitleShowTime = Date.now() + 2000;
                }
            }

            if (['4', '0'].includes(e.key)) {
                state.cheatBuffer.push(e.key);
                if (state.cheatBuffer.length > 3) state.cheatBuffer.shift();
                if (state.cheatBuffer.join('') === '404') {
                    resetGame(true);
                    state.cheatBuffer = [];
                }
            } else {
                state.cheatBuffer = [];
            }
        }

        if (e.key === 'r' || e.key === 'R') {
            resetGame(false);
        }

        if (['a', 'A', 'd', 'D', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            if (state.gameState === 'TUTORIAL' || state.gameState === 'READY') {
                if (!(e.repeat && (state.gameState === 'READY' || state.gameState === 'TUTORIAL'))) {
                    startPlay();
                }
            }
        }

        if (state.gameState === 'GAMEOVER' || state.gameState === 'GAMECLEAR') {
            if (e.key === ' ') {
                resetGame(state.gameState === 'GAMECLEAR');
            }
        }

        if (['a', 'A', 'ArrowLeft'].includes(e.key)) {
            if (e.repeat && state.gameState === 'READY') return;
            state.keys.left = true;
        }
        if (['d', 'D', 'ArrowRight'].includes(e.key)) {
            if (e.repeat && state.gameState === 'READY') return;
            state.keys.right = true;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (['a', 'A', 'ArrowLeft'].includes(e.key)) state.keys.left = false;
        if (['d', 'D', 'ArrowRight'].includes(e.key)) state.keys.right = false;
    });
};
