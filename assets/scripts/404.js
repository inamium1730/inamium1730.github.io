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

    let currentStage = 1;
    let enemies = [];
    let enemyBullets = [];
    let lastEnemySpawnTime = 0;
    let enemySpawnCount = 0;
    let stars = [];
    for (let i = 0; i < 50; i++) stars.push({ x: Math.random() * CANVAS_WIDTH, y: Math.random() * (CANVAS_HEIGHT / 2), phase: Math.random() * Math.PI * 2 });

    let clouds = [];
    for (let i = 0; i < 5; i++) {
        clouds.push({
            x: Math.random() * CANVAS_WIDTH,
            y: 50 + Math.random() * 150,
            type: Math.random() < 0.25 ? 'bird' : 'cloud',
            cloudId: Math.floor(Math.random() * 3),
            speed: 0.25 + Math.random() * 0.25
        });
    }

    let cheatBuffer = [];

    let paddle = { x: CANVAS_WIDTH / 2 - 130, y: CANVAS_HEIGHT - 60, w: 260, h: 30, text: 'NOTFOUND', nBuffEndTime: 0, foundEndTime: 0, ndEndTime: 0, destroyed: false };
    let keys = { left: false, right: false };

    const rectIntersect = (r1, r2) => {
        return !(r2.x > r1.x + r1.w ||
            r2.x + r2.w < r1.x ||
            r2.y > r1.y + r1.h ||
            r2.y + r2.h < r1.y);
    };

    const MAP1 = [
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

    const MAP2 = [
        "NNN      NNN    OOOOOOOOOO    TTTTTTTTTTTT",
        "NNNN     NNN   OOOOOOOOOOOO   TTTTTTTTTTTT",
        "NNNNN    NNN   OOOOOOOOOOOO   TTTTTTTTTTTT",
        "NNN NN   NNN   OOO      OOO       TTTT    ",
        "NNN  NN  NNN   OOO      OOO       TTTT    ",
        "NNN   NN NNN   OOO      OOO       TTTT    ",
        "NNN    NNNNN   OOOOOOOOOOOO       TTTT    ",
        "NNN     NNNN   OOOOOOOOOOOO       TTTT    ",
        "NNN      NNN    OOOOOOOOOO        TTTT    "
    ];

    const MAP3 = [
        "FFFFFFF   OOOOO   UU   UU  NN   NN  DDDDD  ",
        "FFFFFFF  OOOOOOO  UU   UU  NN   NN  DDDDDD ",
        "FF       OO   OO  UU   UU  NNN  NN  DD   DD",
        "FF       OO   OO  UU   UU  NNNN NN  DD   DD",
        "FFFFFFF  OO   OO  UU   UU  NNNNNNN  DD   DD",
        "FFFFFFF  OO   OO  UU   UU  NN NNNN  DD   DD",
        "FF       OO   OO  UU   UU  NN  NNN  DD   DD",
        "FF       OOOOOOO  UUUUUUU  NN   NN  DDDDDD ",
        "FF        OOOOO    UUUUU   NN   NN  DDDDD  "
    ];

    const initBlocks = () => {
        blocks = [];
        const blockW = 18;
        const blockH = 24;
        let selectedMap = MAP1;
        if (currentStage === 2) selectedMap = MAP2;
        if (currentStage === 3) selectedMap = MAP3;

        const startX = (CANVAS_WIDTH - (selectedMap[0].length * blockW)) / 2;
        const startY = 100;
        for (let r = 0; r < selectedMap.length; r++) {
            for (let c = 0; c < selectedMap[r].length; c++) {
                const char = selectedMap[r][c];
                if (char !== ' ') {
                    blocks.push({
                        x: startX + c * blockW,
                        y: startY + r * blockH,
                        w: blockW,
                        h: blockH,
                        char: char,
                        active: true,
                        itemType: null
                    });
                }
            }
        }

        let totalBlocksCount = blocks.length;
        let nBuffCount = Math.round(totalBlocksCount * 0.04);
        let normal3Count = Math.round(totalBlocksCount * 0.01);
        let normal2Count = Math.round(totalBlocksCount * 0.01);
        let normal1Count = Math.round(totalBlocksCount * 0.02);

        let typesToAssign = [];
        for (let i = 0; i < nBuffCount; i++) typesToAssign.push('nbuff');
        for (let i = 0; i < normal3Count; i++) typesToAssign.push('normal_3');
        for (let i = 0; i < normal2Count; i++) typesToAssign.push('normal_2');
        for (let i = 0; i < normal1Count; i++) typesToAssign.push('normal_1');

        let availableIndices = Array.from({ length: blocks.length }, (_, i) => i);

        for (let type of typesToAssign) {
            if (availableIndices.length === 0) break;
            let randIdx = Math.floor(Math.random() * availableIndices.length);
            let blockIdx = availableIndices[randIdx];
            blocks[blockIdx].itemType = type;
            availableIndices.splice(randIdx, 1);
        }
    };

    const spawnBall = () => {
        if (reserve.length === 0) return false;
        let char = reserve.shift();

        paddle.destroyed = false;
        paddle.ndEndTime = 0;
        paddle.foundEndTime = 0;
        paddle.text = 'NOTFOUND';
        paddle.w = 260;

        balls.push({
            x: paddle.x + paddle.w / 2,
            y: paddle.y - 20,
            vx: (Math.random() > 0.5 ? 1 : -1) * 1.25,
            vy: -2,
            size: 20,
            char: char,
            color: null,
            isEnhanced: false
        });
        paddle.nBuffEndTime = 0;
        return true;
    };

    const resetGame = (advanceStage = false) => {
        if (advanceStage) {
            currentStage = currentStage >= 3 ? 1 : currentStage + 1;
        }
        score = 0;
        reserve = ['4', '0', '4'];

        enemies = [];
        enemyBullets = [];
        lastEnemySpawnTime = Date.now();
        enemySpawnCount = 0;
        paddle.foundEndTime = 0;
        paddle.ndEndTime = 0;
        paddle.destroyed = false;
        paddle.w = 260;
        paddle.text = 'NOTFOUND';

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



    const getAutoAimVelocity = (startX, startY, normalVx, normalVy, currentBaseSpeed) => {
        const activeBlocks = blocks.filter(bl => bl.active);
        let bestDist = Infinity;
        let bestTarget = null;

        if (activeBlocks.length > 0) {
            let unfoldedBlocks = [];
            activeBlocks.forEach(bl => {
                let cx = bl.x + bl.w / 2;
                let cy = bl.y + bl.h / 2;
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
            let dist = Math.sqrt(dx * dx + dy * dy);
            return {
                vx: (dx / dist) * currentBaseSpeed,
                vy: (dy / dist) * currentBaseSpeed
            };
        } else {
            return { vx: normalVx, vy: normalVy };
        }
    };

    const transferItem = (type) => {
        let available = blocks.filter(b => b.active && !b.itemType);
        if (available.length > 0) {
            let randBlock = available[Math.floor(Math.random() * available.length)];
            randBlock.itemType = type;
        }
    };

    const update = () => {
        // Update paddle state based on penalties
        let newW = 260;
        let newText = 'NOTFOUND';

        if (paddle.destroyed) {
            newW = 0;
            newText = '';
        } else if (Date.now() < paddle.ndEndTime) {
            newW = 64;
            newText = 'ND';
        } else if (Date.now() < paddle.foundEndTime) {
            newW = 160;
            newText = 'FOUND';
        }

        if (paddle.w !== newW) {
            let center = paddle.x + paddle.w / 2;
            paddle.x = center - newW / 2;
            paddle.w = newW;
            paddle.text = newText;
        }

        // Ensure paddle doesn't go out of bounds after resize
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.w > CANVAS_WIDTH) paddle.x = CANVAS_WIDTH - paddle.w;

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
                if (b.x - b.size / 2 < 0) { b.x = b.size / 2; b.vx *= -1; wallHit = true; }
                if (b.x + b.size / 2 > CANVAS_WIDTH) { b.x = CANVAS_WIDTH - b.size / 2; b.vx *= -1; wallHit = true; }
                if (b.y - b.size / 2 < 0) { b.y = b.size / 2; b.vy *= -1; wallHit = true; }
                if (wallHit) playBeep(200);
                // The enemy update logic was accidentally here

                // Paddle collision
                if (!paddle.destroyed && b.vy > 0 && b.y + b.size / 2 > paddle.y && b.y - b.size / 2 < paddle.y + paddle.h && b.x > paddle.x && b.x < paddle.x + paddle.w) {
                    b.y = paddle.y - b.size / 2;
                    let currentBaseSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);

                    if (Date.now() < paddle.nBuffEndTime) {
                        b.isEnhanced = true;

                        let hitFactor = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
                        let maxVx = currentBaseSpeed * 0.85;
                        let normalVx = hitFactor * maxVx;
                        let normalVy = -Math.sqrt(currentBaseSpeed * currentBaseSpeed - normalVx * normalVx);

                        let aimedVelocity = getAutoAimVelocity(b.x, b.y, normalVx, normalVy, currentBaseSpeed);
                        b.vx = aimedVelocity.vx;
                        b.vy = aimedVelocity.vy;
                    } else {
                        b.isEnhanced = false;
                        let hitFactor = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
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
                    let br = { x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size };
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

                        if (bl.itemType) {
                            if (bl.itemType === 'nbuff') {
                                if (Date.now() < paddle.nBuffEndTime || items.filter(i => i.char === 'N').length >= 1) {
                                    transferItem('nbuff');
                                } else {
                                    items.push({
                                        x: bl.x + bl.w / 2,
                                        y: bl.y + bl.h / 2,
                                        vy: 1.5,
                                        char: 'N',
                                        color: currentTheme === 'dark' ? '#38bdf8' : '#0284c7',
                                        type: 'nbuff',
                                        size: 20
                                    });
                                }
                            } else if (bl.itemType.startsWith('normal_')) {
                                let req = parseInt(bl.itemType.split('_')[1]);
                                if (reserve.length <= req) {
                                    if (items.filter(i => i.type !== 'nbuff').length >= 2) {
                                        transferItem(bl.itemType);
                                    } else {
                                        const itemChar = Math.random() < 0.5 ? '4' : '0';
                                        const needed = getNeededHealChar();
                                        let type = 'multiball';
                                        let color = '#facc15';
                                        if (needed === itemChar) {
                                            type = 'heal';
                                            color = '#a3e635';
                                        }
                                        items.push({
                                            x: bl.x + bl.w / 2,
                                            y: bl.y + bl.h / 2,
                                            vy: 1.5,
                                            char: itemChar,
                                            color: color,
                                            type: type,
                                            size: 20
                                        });
                                    }
                                }
                            }
                        }

                        if (blocks.filter(b => b.active).length === 0) {
                            gameState = 'GAMECLEAR';
                        }
                        break;
                    }
                }

                let bBox = { x: b.x - b.size / 2, y: b.y - b.size, w: b.size, h: b.size };

                if (currentStage >= 2) {
                    // Enemy collision
                    enemies.forEach(en => {
                        if (!en.dead && Date.now() - en.lastHitTime > 200 && rectIntersect(bBox, { x: en.x - en.w / 2, y: en.y - en.h / 2, w: en.w, h: en.h })) {
                            if (b.isEnhanced && Date.now() < paddle.nBuffEndTime) {
                                en.hp = 0;
                            } else {
                                en.hp--;
                                b.vy *= -1;
                                en.lastHitTime = Date.now();
                            }
                            if (en.hp <= 0) {
                                en.dead = true;
                                const itemChar = Math.random() < 0.5 ? '4' : '0';
                                const needed = getNeededHealChar();
                                let type = 'multiball'; let color = '#facc15';
                                if (needed === itemChar) { type = 'heal'; color = '#a3e635'; }
                                items.push({ x: en.x, y: en.y, vy: 1.5, char: itemChar, color: color, type: type, size: 20 });
                            }
                        }
                    });

                    // Bullet collision
                    enemyBullets.forEach(bull => {
                        if (!bull.dead && rectIntersect(bBox, bull)) {
                            if (b.isEnhanced && Date.now() < paddle.nBuffEndTime) {
                                bull.dead = true;
                            } else {
                                b.vy *= -1;
                                bull.dead = true;
                            }
                        }
                    });
                }

                // Paddle collision
                if (!paddle.destroyed && b.vy > 0 && b.y > paddle.y - b.size && b.y < paddle.y + paddle.h && b.x > paddle.x - b.size && b.x < paddle.x + paddle.w + b.size) {
                    b.y = paddle.y - b.size / 2;
                    let currentBaseSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);

                    if (Date.now() < paddle.nBuffEndTime) {
                        b.isEnhanced = true;
                        let hitFactor = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
                        let maxVx = currentBaseSpeed * 0.85;
                        let normalVx = hitFactor * maxVx;
                        let normalVy = -Math.sqrt(currentBaseSpeed * currentBaseSpeed - normalVx * normalVx);
                        let aimedVelocity = getAutoAimVelocity(b.x, b.y, normalVx, normalVy, currentBaseSpeed);
                        b.vx = aimedVelocity.vx;
                        b.vy = aimedVelocity.vy;
                    } else {
                        b.isEnhanced = false;
                        let hitFactor = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
                        let maxVx = currentBaseSpeed * 0.85;
                        b.vx = hitFactor * maxVx;
                        b.vy = -Math.sqrt(currentBaseSpeed * currentBaseSpeed - b.vx * b.vx);
                    }
                    globalSpeedMult += 0.01 / balls.length;
                    playBeep(800);
                }
            });

            balls = balls.filter(b => b.y < CANVAS_HEIGHT + 50);

            items.forEach(item => {
                item.y += item.vy;
                let ir = { x: item.x - item.size / 2, y: item.y - item.size / 2, w: item.size, h: item.size };
                let pr = { x: paddle.x, y: paddle.y, w: paddle.w, h: paddle.h };
                if (rectIntersect(ir, pr)) {
                    item.caught = true;
                    if (item.type === 'heal') {
                        if (reserve.length < 3) {
                            reserve.push(item.char);
                        }
                    } else if (item.type === 'nbuff') {
                        paddle.nBuffEndTime = Date.now() + 11000;
                        paddle.foundEndTime = 0; // Cancel debuffs if active
                        paddle.ndEndTime = 0;
                        paddle.destroyed = false;
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
                            color: null,
                            isEnhanced: isEnhanced
                        });
                    }
                }
            });

            items = items.filter(i => !i.caught && i.y < CANVAS_HEIGHT + 50);

            if (currentStage >= 2) {
                let spawnInterval = currentStage === 3 ? 8000 : 16000;
                let maxEnemies = currentStage === 3 ? 6 : 3;

                if (Date.now() - lastEnemySpawnTime > spawnInterval && enemies.length < maxEnemies) {
                    enemySpawnCount++;
                    let isFound = currentStage === 3 && (enemySpawnCount % 3 === 0);
                    enemies.push({
                        x: Math.random() * (CANVAS_WIDTH - (isFound ? 180 : 120)) + (isFound ? 90 : 60),
                        y: 50,
                        w: isFound ? 160 : 96,
                        h: 32,
                        vx: Math.random() < 0.5 ? 0.5 : -0.5,
                        hp: isFound ? 5 : 3,
                        type: isFound ? 'FOUND' : 'NOT',
                        lastShootTime: Date.now(),
                        lastHitTime: 0
                    });
                    lastEnemySpawnTime = Date.now();
                }

                enemies.forEach(en => {
                    en.x += en.vx;
                    if (en.x - en.w / 2 < 0) {
                        en.x = en.w / 2;
                        en.vx *= -1;
                        en.y += 20;
                    } else if (en.x + en.w / 2 > CANVAS_WIDTH) {
                        en.x = CANVAS_WIDTH - en.w / 2;
                        en.vx *= -1;
                        en.y += 20;
                    }

                    let shootInterval = en.type === 'FOUND' ? 5000 + Math.random() * 2000 : 3000 + Math.random() * 2000;
                    if (Date.now() - en.lastShootTime > shootInterval) {
                        if (en.type === 'FOUND') {
                            let targetX = paddle.x + paddle.w / 2;
                            let targetY = paddle.y + paddle.h / 2;
                            let dx = targetX - en.x;
                            let dy = targetY - (en.y + 20);
                            let dist = Math.sqrt(dx * dx + dy * dy);
                            let speed = 4;
                            enemyBullets.push({
                                x: en.x,
                                y: en.y + 20,
                                w: 16, h: 48,
                                vx: (dx / dist) * speed,
                                vy: (dy / dist) * speed,
                                type: 'FOUND',
                                dead: false
                            });
                        } else {
                            enemyBullets.push({
                                x: en.x,
                                y: en.y + 20,
                                w: 16, h: 48,
                                vx: 0,
                                vy: 4,
                                type: 'NOT',
                                dead: false
                            });
                        }
                        en.lastShootTime = Date.now();
                    }
                });

                enemyBullets.forEach(bull => {
                    bull.x += bull.vx;
                    bull.y += bull.vy;
                    // Paddle hit
                    if (!paddle.destroyed && bull.y + bull.h > paddle.y && bull.y < paddle.y + paddle.h && bull.x + bull.w > paddle.x && bull.x < paddle.x + paddle.w) {
                        bull.dead = true;
                        paddle.nBuffEndTime = 0; // Cancel N buff if active

                        if (Date.now() < paddle.ndEndTime) {
                            paddle.destroyed = true;
                        } else if (Date.now() < paddle.foundEndTime) {
                            paddle.ndEndTime = Date.now() + 5000;
                            paddle.foundEndTime = Date.now() + 10000;
                        } else {
                            paddle.foundEndTime = Date.now() + 10000;
                            paddle.ndEndTime = 0;
                        }
                    }
                });

                enemies = enemies.filter(en => !en.dead && en.y < CANVAS_HEIGHT + 100);
                enemyBullets = enemyBullets.filter(bull => !bull.dead && bull.y < CANVAS_HEIGHT);
            }

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

        if (currentStage >= 2) {
            if (currentTheme === 'dark') {
                stars.forEach(s => {
                    s.phase += 0.03;
                    let alpha = (Math.sin(s.phase) + 1) / 2;
                    // Quantize alpha to 4 steps
                    alpha = Math.floor(alpha * 4) / 3;
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.fillRect(s.x, s.y, 2, 2);
                });
            } else {
                const cloudSprites = [
                    ["  1111  ", " 111111 ", "11111111"],
                    ["   111   ", "  11111  ", " 1111111 ", "111111111"],
                    ["  11  11  ", " 11111111 ", "1111111111"]
                ];
                const birdSprite1 = ["10001", "01010", "00100"];
                const birdSprite2 = ["00000", "11011", "00100"];

                clouds.forEach(c => {
                    c.x -= c.speed;
                    if (c.x < -100) {
                        c.x = CANVAS_WIDTH + 50;
                        c.y = 50 + Math.random() * 150;
                        c.type = Math.random() < 0.25 ? 'bird' : 'cloud';
                        c.cloudId = Math.floor(Math.random() * 3);
                        c.speed = 0.25 + Math.random() * 0.25;
                    }

                    let sprite;
                    if (c.type === 'bird') {
                        sprite = Math.floor(Date.now() / 400) % 2 === 0 ? birdSprite1 : birdSprite2;
                        ctx.fillStyle = 'rgba(160, 160, 160, 0.6)';
                    } else {
                        sprite = cloudSprites[c.cloudId];
                        ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
                    }

                    const dotSize = 5;
                    for (let r = 0; r < sprite.length; r++) {
                        for (let col = 0; col < sprite[r].length; col++) {
                            if (sprite[r][col] === '1') {
                                ctx.fillRect(c.x + col * dotSize, c.y + r * dotSize, dotSize, dotSize);
                            }
                        }
                    }
                });
            }
        }

        if (currentStage === 3) {
            ctx.fillStyle = currentTheme === 'dark' ? '#222' : '#e5e7eb';
            const points = [
                { x: 0, y: CANVAS_HEIGHT },
                { x: 200, y: CANVAS_HEIGHT - 200 },
                { x: 400, y: CANVAS_HEIGHT - 100 },
                { x: 600, y: CANVAS_HEIGHT - 300 },
                { x: 800, y: CANVAS_HEIGHT - 50 },
                { x: 1024, y: CANVAS_HEIGHT - 250 }
            ];
            const dotSize = 8;
            for (let x = 0; x < CANVAS_WIDTH; x += dotSize) {
                let p1 = points[0], p2 = points[1];
                for (let i = 0; i < points.length - 1; i++) {
                    if (x >= points[i].x && x <= points[i + 1].x) {
                        p1 = points[i]; p2 = points[i + 1]; break;
                    }
                }
                let t = (p2.x === p1.x) ? 0 : (x - p1.x) / (p2.x - p1.x);
                let y = p1.y + t * (p2.y - p1.y);
                let qY = Math.floor(y / dotSize) * dotSize;
                ctx.fillRect(x, qY, dotSize, CANVAS_HEIGHT - qY);
            }
        }

        const textColor = getThemeColor('--text-main') || '#fff';
        const mutedColor = getThemeColor('--text-muted') || '#aaa';

        ctx.font = '24px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textColor;
        blocks.forEach(bl => {
            if (bl.active) {
                ctx.fillText(bl.char, bl.x + bl.w / 2, bl.y + bl.h / 2);
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
                let blinkColor = currentTheme === 'dark' ? '#38bdf8' : '#0284c7';
                bColor = (Math.floor(Date.now() / 250) % 2 === 0) ? blinkColor : textColor;
            }
            ctx.fillStyle = bColor;
            ctx.fillText(b.char, b.x, b.y);
        });

        ctx.font = '28px "Press Start 2P"';
        let pColor = textColor;
        let isPenaltyBlink = Date.now() < paddle.ndEndTime || Date.now() < paddle.foundEndTime;
        if (isPenaltyBlink && Math.floor(Date.now() / 250) % 2 === 0) {
            pColor = '#ef4444';
        } else if (Date.now() < paddle.nBuffEndTime - 1000) {
            let blinkColor = currentTheme === 'dark' ? '#38bdf8' : '#0284c7';
            pColor = (Math.floor(Date.now() / 250) % 2 === 0) ? blinkColor : textColor;
        }

        if (!paddle.destroyed) {
            ctx.fillStyle = pColor;
            ctx.fillText(paddle.text, paddle.x + paddle.w / 2, paddle.y + paddle.h / 2);
        }

        if (currentStage >= 2) {
            ctx.textAlign = 'center';
            ctx.font = '32px "Press Start 2P"';
            enemies.forEach(en => {
                ctx.fillStyle = textColor;
                if (en.type === 'FOUND') {
                    let chars = ['F', 'O', 'U', 'N', 'D'];
                    let offsets = [-64, -32, 0, 32, 64];
                    chars.forEach((c, idx) => {
                        if (en.hp === 5) ctx.globalAlpha = 1.0;
                        else if (en.hp === 4) ctx.globalAlpha = idx < 4 ? 1.0 : 0.3;
                        else if (en.hp === 3) ctx.globalAlpha = idx < 3 ? 1.0 : 0.3;
                        else if (en.hp === 2) ctx.globalAlpha = idx < 2 ? 1.0 : 0.3;
                        else ctx.globalAlpha = idx === 0 ? 1.0 : 0.3;
                        ctx.fillText(c, en.x + offsets[idx], en.y + en.h / 2);
                    });
                } else {
                    let chars = ['N', 'O', 'T'];
                    let offsets = [-32, 0, 32];
                    chars.forEach((c, idx) => {
                        if (en.hp === 3) ctx.globalAlpha = 1.0;
                        else if (en.hp === 2) ctx.globalAlpha = idx < 2 ? 1.0 : 0.3;
                        else ctx.globalAlpha = idx === 0 ? 1.0 : 0.3;
                        ctx.fillText(c, en.x + offsets[idx], en.y + en.h / 2);
                    });
                }
            });
            ctx.globalAlpha = 1.0;

            enemyBullets.forEach(bull => {
                ctx.save();
                ctx.translate(bull.x + bull.w / 2, bull.y + bull.h / 2);
                let angle = bull.vx !== 0 ? Math.atan2(bull.vy, bull.vx) : Math.PI / 2;
                ctx.rotate(angle);
                ctx.fillStyle = (Math.floor(Date.now() / 250) % 2 === 0) ? '#ef4444' : textColor;
                ctx.font = '16px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText(bull.type === 'FOUND' ? "FOUND" : "404", 0, 0); ctx.restore();
            });
        }

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
                ctx.fillText("404 NOT FOUND", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
            }

            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = '18px "Press Start 2P"';
            let text = isMobile ? "← または → を押して開始" : "A D または ← → を押して開始";
            ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        }
        else if (gameState === 'READY') {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = '18px "Press Start 2P"';
            let text = isMobile ? "← または → を押して再開" : "A D または ← → を押して再開";
            ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        }
        else if (gameState === 'GAMECLEAR') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.fillStyle = '#facc15'; // yellow
            ctx.textAlign = 'center';
            ctx.font = '32px "Press Start 2P"';
            ctx.fillText("404 NOT FOUND!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

            ctx.fillStyle = '#fff';
            ctx.font = '18px "Press Start 2P"';
            let text = isMobile ? "画面をタップしてリトライ" : "Space を押してリトライ";
            ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        }
        else if (gameState === 'GAMEOVER') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.fillStyle = '#fca5a5'; // light red
            ctx.textAlign = 'center';
            ctx.font = '32px "Press Start 2P"';
            ctx.fillText("404 NOT FOUND...", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

            ctx.fillStyle = '#fff';
            ctx.font = '18px "Press Start 2P"';
            let text = isMobile ? "画面をタップしてリトライ" : "Space を押してリトライ";
            ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
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
        mobileLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys.left = true; handleMobileInput(); }, { passive: false });
        mobileLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys.left = false; }, { passive: false });
    }
    if (mobileRight) {
        mobileRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys.right = true; handleMobileInput(); }, { passive: false });
        mobileRight.addEventListener('touchend', (e) => { e.preventDefault(); keys.right = false; }, { passive: false });
    }

    canvas.addEventListener('touchstart', (e) => {
        if (!gameContainer.classList.contains('hidden')) {
            if (gameState === 'GAMEOVER' || gameState === 'GAMECLEAR') {
                e.preventDefault();
                resetGame(gameState === 'GAMECLEAR');
            }
        }
    }, { passive: false });

    canvas.addEventListener('click', (e) => {
        if (!gameContainer.classList.contains('hidden')) {
            if (gameState === 'GAMEOVER' || gameState === 'GAMECLEAR') {
                resetGame(gameState === 'GAMECLEAR');
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!gameContainer.classList.contains('hidden')) {
            if (gameState === 'TUTORIAL') {
                if (['4', '0'].includes(e.key)) {
                    cheatBuffer.push(e.key);
                    if (cheatBuffer.length > 3) cheatBuffer.shift();
                    if (cheatBuffer.join('') === '404') {
                        resetGame(true);
                        cheatBuffer = [];
                    }
                } else {
                    cheatBuffer = [];
                }
            }

            if (e.key === 'r' || e.key === 'R') {
                resetGame(false);
            }

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
                    resetGame(gameState === 'GAMECLEAR');
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
