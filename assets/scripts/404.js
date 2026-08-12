document.addEventListener("DOMContentLoaded", () => {
    // Theme toggling logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let currentTheme = localStorage.getItem('theme') || (systemPrefersDark ? 'dark' : 'light');

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
    };

    applyTheme(currentTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', currentTheme);
            applyTheme(currentTheme);
        });
    }

    const getThemeColor = (varName) => {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    };

    // Audio Context Setup
    let audioCtx = null;
    let isMuted = false;

    const muteBtn = document.getElementById('mute-btn');
    const iconUnmute = document.getElementById('icon-unmute');
    const iconMute = document.getElementById('icon-mute');

    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            isMuted = !isMuted;
            if (isMuted) {
                iconUnmute.classList.add('hidden');
                iconMute.classList.remove('hidden');
            } else {
                iconUnmute.classList.remove('hidden');
                iconMute.classList.add('hidden');
                if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (audioCtx.state === 'suspended') audioCtx.resume();
            }
        });
    }

    const playBeep = (freq, type = 'square', duration = 0.05) => {
        if (isMuted) return;
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    };

    // Easter Egg Logic
    const errorCode = document.querySelector('.error-code');
    const gameContainer = document.getElementById('game-container');
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);

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

    // GAME ENGINE
    const CANVAS_WIDTH = 1024;
    const CANVAS_HEIGHT = 768;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    let gameState = 'TUTORIAL'; // TUTORIAL, READY, PLAYING, GAMECLEAR, GAMEOVER
    let score = 0;
    let reserve = ['4', '0', '4'];
    let balls = [];
    let items = [];
    let blocks = [];
    let globalSpeedMult = 1.0;
    let paddle = { x: CANVAS_WIDTH / 2 - 130, y: CANVAS_HEIGHT - 60, w: 260, h: 30, text: 'NOTFOUND', nBuffEndTime: 0 };
    let keys = { left: false, right: false };

    const MAP = [
        "444      444   000000000000   444      444",
        "444      444   000000000000   444      444",
        "444      444   000000000000   444      444",
        "444      444   000      000   444      444",
        "444444444444   000      000   444444444444",
        "444444444444   000      000   444444444444",
        "444444444444   000      000   444444444444",
        "         444   000000000000            444",
        "         444   000000000000            444",
        "         444   000000000000            444"
    ];

    const initBlocks = () => {
        blocks = [];
        const blockW = 20;
        const blockH = 24;
        const startX = (CANVAS_WIDTH - (MAP[0].length * blockW)) / 2;
        const startY = 100;

        for (let r = 0; r < MAP.length; r++) {
            for (let c = 0; c < MAP[r].length; c++) {
                const char = MAP[r][c];
                if (char !== ' ') {
                    blocks.push({
                        x: startX + c * blockW,
                        y: startY + r * blockH,
                        w: blockW,
                        h: blockH,
                        char: char,
                        active: true
                    });
                }
            }
        }
    };

    const spawnBall = () => {
        if (reserve.length === 0) return false;
        const char = reserve.pop();
        balls.push({
            x: paddle.x + paddle.w / 2,
            y: paddle.y - 20,
            vx: 0,
            vy: 0,
            size: 20,
            char: char,
            color: null,
            isEnhanced: false
        });
        return true;
    };

    const resetGame = () => {
        score = 0;
        reserve = ['4', '0', '4'];
        balls = [];
        items = [];
        globalSpeedMult = 1.0;
        paddle.x = CANVAS_WIDTH / 2 - paddle.w / 2;
        paddle.nBuffEndTime = 0;
        initBlocks();
        spawnBall();
        gameState = 'TUTORIAL';
    };

    const getNeededHealChar = () => {
        const target = ['4', '0', '4'];
        if (reserve.length < 3) {
            return target[reserve.length];
        }
        return null;
    };

    const rectIntersect = (r1, r2) => {
        return !(r2.x > r1.x + r1.w || 
                 r2.x + r2.w < r1.x || 
                 r2.y > r1.y + r1.h ||
                 r2.y + r2.h < r1.y);
    };

    const getAutoAimVelocity = (startX, startY, normalVx, normalVy, currentBaseSpeed) => {
        const activeBlocks = blocks.filter(bl => bl.active);
        let bestDist = Infinity;
        let bestTarget = null;
        
        if (activeBlocks.length > 0) {
            let unfoldedBlocks = [];
            activeBlocks.forEach(bl => {
                let cx = bl.x + bl.w/2;
                let cy = bl.y + bl.h/2;
                unfoldedBlocks.push({ x: cx, y: cy });
                unfoldedBlocks.push({ x: CANVAS_WIDTH + (CANVAS_WIDTH - cx), y: cy });
                unfoldedBlocks.push({ x: -cx, y: cy });
            });
            
            for (let target of unfoldedBlocks) {
                let V = { x: target.x - startX, y: target.y - startY };
                let dot = V.x * normalVx + V.y * normalVy;
                if (dot > 0) {
                    let dist = Math.abs(V.x * normalVy - V.y * normalVx) / currentBaseSpeed;
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestTarget = target;
                    }
                }
            }
        }
        
        if (bestTarget) {
            let dx = bestTarget.x - startX;
            let dy = bestTarget.y - startY;
            let dist = Math.sqrt(dx*dx + dy*dy);
            return {
                vx: (dx / dist) * currentBaseSpeed,
                vy: (dy / dist) * currentBaseSpeed
            };
        } else {
            return { vx: normalVx, vy: normalVy };
        }
    };

    const update = () => {
        if (gameState === 'TUTORIAL' || gameState === 'READY') {
            if (keys.left) paddle.x -= 8;
            if (keys.right) paddle.x += 8;
            if (paddle.x < 0) paddle.x = 0;
            if (paddle.x > CANVAS_WIDTH - paddle.w) paddle.x = CANVAS_WIDTH - paddle.w;
            
            if (balls.length > 0) {
                balls[0].x = paddle.x + paddle.w / 2;
                balls[0].y = paddle.y - 20;
            }
            return;
        }
        
        if (gameState === 'PLAYING') {
            if (keys.left) paddle.x -= 8;
            if (keys.right) paddle.x += 8;
            if (paddle.x < 0) paddle.x = 0;
            if (paddle.x > CANVAS_WIDTH - paddle.w) paddle.x = CANVAS_WIDTH - paddle.w;

            balls.forEach(b => {
                b.x += b.vx * globalSpeedMult;
                b.y += b.vy * globalSpeedMult;

                let wallHit = false;
                if (b.x - b.size/2 < 0) { b.x = b.size/2; b.vx *= -1; wallHit = true; }
                if (b.x + b.size/2 > CANVAS_WIDTH) { b.x = CANVAS_WIDTH - b.size/2; b.vx *= -1; wallHit = true; }
                if (b.y - b.size/2 < 0) { b.y = b.size/2; b.vy *= -1; wallHit = true; }
                if (wallHit) playBeep(200);
                
                // Paddle collision
                if (b.vy > 0 && b.y + b.size/2 > paddle.y && b.y - b.size/2 < paddle.y + paddle.h && b.x > paddle.x && b.x < paddle.x + paddle.w) {
                    b.y = paddle.y - b.size/2;
                    let currentBaseSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                    
                    if (Date.now() < paddle.nBuffEndTime) {
                        b.isEnhanced = true;
                        
                        let hitFactor = (b.x - (paddle.x + paddle.w/2)) / (paddle.w / 2);
                        let maxVx = currentBaseSpeed * 0.85; 
                        let normalVx = hitFactor * maxVx;
                        let normalVy = -Math.sqrt(currentBaseSpeed * currentBaseSpeed - normalVx * normalVx);
                        
                        let aimedVelocity = getAutoAimVelocity(b.x, b.y, normalVx, normalVy, currentBaseSpeed);
                        b.vx = aimedVelocity.vx;
                        b.vy = aimedVelocity.vy;
                    } else {
                        b.isEnhanced = false;
                        let hitFactor = (b.x - (paddle.x + paddle.w/2)) / (paddle.w / 2);
                        let maxVx = currentBaseSpeed * 0.85; 
                        b.vx = hitFactor * maxVx;
                        b.vy = -Math.sqrt(currentBaseSpeed * currentBaseSpeed - b.vx * b.vx);
                    }
                    globalSpeedMult += 0.01 / balls.length;
                    playBeep(800);
                }

                // Block collision
                for (let bl of blocks) {
                    if (!bl.active) continue;
                    let br = { x: b.x - b.size/2, y: b.y - b.size/2, w: b.size, h: b.size };
                    let blockR = { x: bl.x, y: bl.y, w: bl.w, h: bl.h };
                    if (rectIntersect(br, blockR)) {
                        bl.active = false;
                        score++;
                        playBeep(200);
                        
                        let overlapLeft = (br.x + br.w) - blockR.x;
                        let overlapRight = (blockR.x + blockR.w) - br.x;
                        let overlapTop = (br.y + br.h) - blockR.y;
                        let overlapBottom = (blockR.y + blockR.h) - br.y;
                        let minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                        
                        if (!(b.isEnhanced && Date.now() < paddle.nBuffEndTime)) {
                            if (minOverlap === overlapLeft || minOverlap === overlapRight) {
                                b.vx *= -1;
                            } else {
                                b.vy *= -1;
                            }
                        }

                        let dropChance = 0.01;
                        if (reserve.length === 1) dropChance = 0.02;
                        if (reserve.length === 0) dropChance = 0.04;

                        if (items.length < 2 && Math.random() < dropChance) {
                            const itemChar = Math.random() < 0.5 ? '4' : '0';
                            const needed = getNeededHealChar();
                            let type = 'multiball';
                            let color = '#facc15';
                            if (needed === itemChar) {
                                type = 'heal';
                                color = '#a3e635';
                            }
                            items.push({
                                x: bl.x + bl.w/2,
                                y: bl.y + bl.h/2,
                                vy: 1.5,
                                char: itemChar,
                                color: color,
                                type: type,
                                size: 20
                            });
                        } else if (Date.now() >= paddle.nBuffEndTime && items.filter(i => i.char === 'N').length < 1 && Math.random() < 0.04) {
                            items.push({
                                x: bl.x + bl.w/2,
                                y: bl.y + bl.h/2,
                                vy: 1.5,
                                char: 'N',
                                color: '#38bdf8', // light blue
                                type: 'nbuff',
                                size: 20
                            });
                        }
                        
                        if (blocks.filter(b => b.active).length === 0) {
                            gameState = 'GAMECLEAR';
                        }
                        break; 
                    }
                }
            });

            balls = balls.filter(b => b.y < CANVAS_HEIGHT + 50);

            items.forEach(item => {
                item.y += item.vy;
                let ir = { x: item.x - item.size/2, y: item.y - item.size/2, w: item.size, h: item.size };
                let pr = { x: paddle.x, y: paddle.y, w: paddle.w, h: paddle.h };
                if (rectIntersect(ir, pr)) {
                    item.caught = true;
                    if (item.type === 'heal') {
                        if (reserve.length < 3) {
                            reserve.push(item.char);
                        }
                    } else if (item.type === 'nbuff') {
                        paddle.nBuffEndTime = Date.now() + 11000;
                    } else {
                        let isEnhanced = false;
                        let vx = (Math.random() > 0.5 ? 1 : -1) * 1.25;
                        let vy = -2;
                        
                        if (Date.now() < paddle.nBuffEndTime) {
                            isEnhanced = true;
                            let currentBaseSpeed = Math.sqrt(vx * vx + vy * vy);
                            let aimedVelocity = getAutoAimVelocity(item.x, paddle.y - 20, vx, vy, currentBaseSpeed);
                            vx = aimedVelocity.vx;
                            vy = aimedVelocity.vy;
                        }

                        balls.push({
                            x: item.x,
                            y: paddle.y - 20,
                            vx: vx,
                            vy: vy,
                            size: 20,
                            char: item.char,
                            color: '#ffffff',
                            isEnhanced: isEnhanced
                        });
                    }
                }
            });
            
            items = items.filter(i => !i.caught && i.y < CANVAS_HEIGHT + 50);

            if (balls.length === 0 && gameState === 'PLAYING') {
                globalSpeedMult = 1.0 + (globalSpeedMult - 1.0) / 2.0;
                if (!spawnBall()) {
                    gameState = 'GAMEOVER';
                } else {
                    gameState = 'READY'; // Requires key press to resume
                }
            }
        }
    };

    const draw = () => {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        const textColor = getThemeColor('--text-main') || '#fff';
        const mutedColor = getThemeColor('--text-muted') || '#aaa';

        ctx.font = '24px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textColor;
        blocks.forEach(bl => {
            if (bl.active) {
                ctx.fillText(bl.char, bl.x + bl.w/2, bl.y + bl.h/2);
            }
        });

        ctx.font = '20px "Press Start 2P"';
        items.forEach(i => {
            ctx.fillStyle = i.color;
            ctx.fillText(i.char, i.x, i.y);
        });

        ctx.font = '20px "Press Start 2P"';
        balls.forEach(b => {
            let bColor = b.color || textColor;
            if (b.isEnhanced && Date.now() < paddle.nBuffEndTime - 1000) {
                bColor = (Math.floor(Date.now() / 250) % 2 === 0) ? '#38bdf8' : '#ffffff';
            }
            ctx.fillStyle = bColor;
            ctx.fillText(b.char, b.x, b.y);
        });

        ctx.font = '28px "Press Start 2P"';
        let pColor = textColor;
        if (Date.now() < paddle.nBuffEndTime - 1000) {
            pColor = (Math.floor(Date.now() / 250) % 2 === 0) ? '#38bdf8' : '#ffffff';
        }
        ctx.fillStyle = pColor;
        ctx.fillText(paddle.text, paddle.x + paddle.w/2, paddle.y + paddle.h/2);

        // Draw Score
        ctx.fillStyle = textColor;
        ctx.font = '20px "Press Start 2P"';
        ctx.textAlign = 'right';
        let maxDigits = blocks.length.toString(2).length;
        let binScore = score.toString(2).padStart(maxDigits, '0');
        let dispScore = binScore.replace(/1/g, '4');
        ctx.fillText(dispScore, CANVAS_WIDTH - 30, 40);

        // Draw Lives Reserve
        ctx.textAlign = 'left';
        const original = ['4', '0', '4'];
        let offsetX = 30;
        for (let i = 0; i < 3; i++) {
            if (i < reserve.length) {
                ctx.globalAlpha = 1.0;
            } else {
                ctx.globalAlpha = 0.25;
            }
            ctx.fillStyle = textColor;
            ctx.fillText(original[i], offsetX, 40);
            offsetX += 30;
        }
        ctx.globalAlpha = 1.0;

        if (gameState === 'TUTORIAL') {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            
            if (Math.floor(Date.now() / 1000) % 2 === 0) {
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.font = '32px "Press Start 2P"';
                ctx.fillText("404 NOT FOUND", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 60);
            }
            
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = '18px "Press Start 2P"';
            let text = isMobile ? "← または → を押して開始" : "A D または ← → を押して開始";
            ctx.fillText(text, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 20);
        }
        else if (gameState === 'READY') {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = '18px "Press Start 2P"';
            let text = isMobile ? "← または → を押して再開" : "A D または ← → を押して再開";
            ctx.fillText(text, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 20);
        }
        else if (gameState === 'GAMECLEAR') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            
            ctx.fillStyle = '#facc15'; // yellow
            ctx.textAlign = 'center';
            ctx.font = '32px "Press Start 2P"';
            ctx.fillText("404 NOT FOUND!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 60);
            
            ctx.fillStyle = '#fff';
            ctx.font = '18px "Press Start 2P"';
            let text = isMobile ? "画面をタップしてリトライ" : "Space を押してリトライ";
            ctx.fillText(text, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 20);
        }
        else if (gameState === 'GAMEOVER') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            
            ctx.fillStyle = '#fca5a5'; // light red
            ctx.textAlign = 'center';
            ctx.font = '32px "Press Start 2P"';
            ctx.fillText("404 NOT FOUND...", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 60);
            
            ctx.fillStyle = '#fff';
            ctx.font = '18px "Press Start 2P"';
            let text = isMobile ? "画面をタップしてリトライ" : "Space を押してリトライ";
            ctx.fillText(text, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 20);
        }
    };

    let gameLoopId = null;
    const loop = () => {
        update();
        draw();
        gameLoopId = requestAnimationFrame(loop);
    };

    const startGame = () => {
        gameContainer.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (isMobile) {
            document.getElementById('mobile-controls').classList.remove('hidden');
        }
        resetGame();
        if (!gameLoopId) {
            gameLoopId = requestAnimationFrame(loop);
        }
    };

    // Mobile input handling
    const mobileLeft = document.getElementById('btn-left');
    const mobileRight = document.getElementById('btn-right');

    const handleMobileInput = () => {
        if (!gameContainer.classList.contains('hidden')) {
            if (gameState === 'TUTORIAL' || gameState === 'READY') {
                gameState = 'PLAYING';
                if (balls.length > 0) {
                    balls[0].vx = (Math.random() > 0.5 ? 1 : -1) * 1.25;
                    balls[0].vy = -2;
                }
            }
        }
    };

    if (mobileLeft) {
        mobileLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys.left = true; handleMobileInput(); }, {passive: false});
        mobileLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys.left = false; }, {passive: false});
    }
    if (mobileRight) {
        mobileRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys.right = true; handleMobileInput(); }, {passive: false});
        mobileRight.addEventListener('touchend', (e) => { e.preventDefault(); keys.right = false; }, {passive: false});
    }

    canvas.addEventListener('touchstart', (e) => {
        if (!gameContainer.classList.contains('hidden')) {
            if (gameState === 'GAMEOVER' || gameState === 'GAMECLEAR') {
                e.preventDefault();
                resetGame();
            }
        }
    }, {passive: false});
    
    canvas.addEventListener('click', (e) => {
        if (!gameContainer.classList.contains('hidden')) {
            if (gameState === 'GAMEOVER' || gameState === 'GAMECLEAR') {
                resetGame();
            }
        }
    });

    window.addEventListener('keydown', (e) => {
        if (!gameContainer.classList.contains('hidden')) {
            if (gameState === 'TUTORIAL' || gameState === 'READY') {
                if (e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    gameState = 'PLAYING';
                    if (balls.length > 0) {
                        balls[0].vx = (Math.random() > 0.5 ? 1 : -1) * 1.25;
                        balls[0].vy = -2;
                    }
                }
            }
            if (gameState === 'GAMEOVER' || gameState === 'GAMECLEAR') {
                if (e.key === ' ') {
                    resetGame();
                }
            }
            
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = true;
            if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = true;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.left = false;
        if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.right = false;
    });

});
