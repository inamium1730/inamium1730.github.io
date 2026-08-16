import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants/maps.js';
import { BLASTER_LAYOUT } from '../constants/bosses.js';
import { state } from '../state.js';
import { playBeep } from '../audio.js';
import { currentTheme } from '../theme.js';
import { rectIntersect } from '../utils.js';
import { spawnPaddleParticles } from '../entities.js';

export const initBoss10 = (fCount, blockW = 18, blockH = 24) => {
    state.boss403State.active = true;
    state.boss403State.phase = 1;
    state.boss403State.state = 'START_WAIT';
    state.boss403State.timer = 0;
    state.boss403State.blasterSide = Math.random() < 0.5 ? 'left' : 'right';
    state.boss403State.blasterAlpha = 0;
    state.boss403State.blasterXOffset = 0;
    state.boss403State.blasterYOffset = 0;
    state.boss403State.face = { xOffset: 0, yOffset: 0, hp: fCount, maxHp: fCount, state: 'IDLE', timer: 0 };
    state.boss403State.patternSeq = 0;
    state.boss403State.smokeActive = false;
    state.boss403State.explosionsLeft = 0;
    state.boss403State.nextExplosionTime = 0;

    BLASTER_LAYOUT.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
            if (row[c] === '4') {
                let bx = c * blockW;
                let by = r * blockH;
                state.blocks.push({
                    x: bx,
                    y: by,
                    w: blockW,
                    h: blockH,
                    char: '4',
                    active: false,
                    itemType: null,
                    part: 'blaster',
                    baseX: bx,
                    baseY: by
                });
            }
        }
    });
};

export const updateBoss10 = () => {
    if (!state.boss403State.active) return;

    let bs = state.boss403State;
    let faceBlocks = state.blocks.filter(b => b.active && b.part === 'face');
    let blasterBlocks = state.blocks.filter(b => b.part === 'blaster');
    let paddle = state.paddle;

    // Continuous hovering / shaking
    if (bs.faceShakeEndTime && Date.now() < bs.faceShakeEndTime) {
        bs.face.xOffset = (Math.random() - 0.5) * 40;
        bs.face.yOffset = 0;
    } else if (bs.phaseShakeEndTime && Date.now() < bs.phaseShakeEndTime) {
        bs.face.xOffset = Math.sin((Date.now() - (bs.phaseShakeEndTime - 1500)) * 0.02) * 25;
        bs.face.yOffset = 0;
    } else if (bs.state === 'CLEAR_SMOKE') {
        bs.face.xOffset = Math.sin((Date.now() - (bs.timer - 1500)) * 0.02) * 25;
        bs.face.yOffset = 0;
    } else if (bs.state !== 'DYING' && bs.state !== 'DEAD' && bs.face.state !== 'DYING' && bs.face.state !== 'DROP' && bs.face.state !== 'RETURN' && bs.face.state !== 'PREP' && bs.face.state !== 'WAIT_RETURN' && bs.face.state !== 'WAIT_DROP') {
        bs.face.xOffset = Math.sin(Date.now() * 0.001) * 7.5;
        bs.face.yOffset = Math.sin(Date.now() * 0.002) * 3.75;
    }

    // Explosions on counter success (3 times every 250ms)
    if (bs.explosionsLeft > 0 && Date.now() >= bs.nextExplosionTime) {
        bs.explosionsLeft--;
        bs.nextExplosionTime = Date.now() + 250;

        let b = faceBlocks.length > 0 ? faceBlocks[Math.floor(Math.random() * faceBlocks.length)] : null;
        let expX = b ? (b.baseX + bs.face.xOffset + b.w / 2) : (CANVAS_WIDTH / 2 + bs.face.xOffset + (Math.random() - 0.5) * 150);
        let expY = b ? (b.baseY + bs.face.yOffset + b.h / 2) : (100 + bs.face.yOffset + (Math.random() - 0.5) * 60);
        let expColors = ['#facc15', '#ef4444', '#f97316', '#ffffff'];
        for (let i = 0; i < 20; i++) {
            let angle = Math.random() * Math.PI * 2;
            let speed = Math.random() * 8 + 2;
            state.particles.push({
                x: expX,
                y: expY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 8 + 4,
                life: 1.0,
                maxLife: 1.0,
                decay: Math.random() * 0.03 + 0.02,
                color: expColors[Math.floor(Math.random() * expColors.length)]
            });
        }
    }

    // Emit continuous smoke particles while smokeActive is true
    if (bs.smokeActive && faceBlocks.length > 0) {
        if (Math.random() < 0.7) {
            let b = faceBlocks[Math.floor(Math.random() * faceBlocks.length)];
            let sx = b.baseX + bs.face.xOffset + (Math.random() - 0.5) * b.w;
            let sy = b.baseY + bs.face.yOffset + (Math.random() - 0.5) * b.h;
            let smokeColors = currentTheme === 'dark' ? ['#6b7280', '#9ca3af', '#4b5563', '#d1d5db'] : ['#4b5563', '#6b7280', '#374151', '#9ca3af'];
            state.particles.push({
                x: sx,
                y: sy,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -Math.random() * 2 - 1,
                size: Math.random() * 8 + 6,
                life: 1.0,
                maxLife: 1.0,
                decay: Math.random() * 0.02 + 0.015,
                color: smokeColors[Math.floor(Math.random() * smokeColors.length)]
            });
        }
    }

    let hpRatio = bs.face.hp / bs.face.maxHp;

    // Phase transition
    if ((bs.phase === 1 && hpRatio <= 0.67) || (bs.phase === 2 && hpRatio <= 0.33)) {
        bs.phase = bs.phase === 1 ? 2 : 3;
        let wasSmoking = bs.smokeActive;
        bs.smokeActive = false;
        state.particles = state.particles.filter(p => p.char !== undefined || !['#6b7280', '#9ca3af', '#4b5563', '#d1d5db', '#374151'].includes(p.color));

        if (bs.face.state !== 'IDLE') {
            bs.face.state = 'IDLE';
            bs.face.yOffset = 0;
            bs.face.xOffset = 0;
            bs.face.dropVy = 0;
            bs.face.timer = Date.now() + 3000;
        }

        if (wasSmoking) {
            bs.phaseShakeEndTime = Date.now() + 1500;
        }
    }

    // Push out balls trapped in face during phase shake
    if (bs.phaseShakeEndTime && Date.now() < bs.phaseShakeEndTime) {
        if (faceBlocks.length > 0) {
            let minX = Math.min(...faceBlocks.map(b => b.baseX + bs.face.xOffset));
            let maxX = Math.max(...faceBlocks.map(b => b.baseX + bs.face.xOffset + b.w));
            let minY = Math.min(...faceBlocks.map(b => b.baseY + bs.face.yOffset));
            let maxY = Math.max(...faceBlocks.map(b => b.baseY + bs.face.yOffset + b.h));

            state.balls.forEach(b => {
                if (b.x + b.size / 2 >= minX - 10 && b.x - b.size / 2 <= maxX + 10 &&
                    b.y + b.size / 2 >= minY - 10 && b.y - b.size / 2 <= maxY + 10) {
                    b.y = maxY + b.size / 2 + 10;
                    if (b.vy < 0) b.vy = -b.vy;
                    if (Math.abs(b.vy) < 2) b.vy = 2;
                    if (b.ignoredParts) b.ignoredParts.delete('face');
                }
            });
        }
    }

    let isFaceDead = bs.face.hp <= 0 || hpRatio <= 0.05 || faceBlocks.length === 0;

    if (isFaceDead && bs.state !== 'DYING' && bs.state !== 'DEAD') {
        bs.state = 'DYING';
        bs.timer = Date.now() + 4000;
        bs.face.state = 'DYING';
        bs.face.yOffset = 0;
        bs.face.xOffset = 0;
        bs.face.dropVy = 0;
        bs.smokeActive = false;
        blasterBlocks.forEach(b => { b.active = false; });
        state.enemies = [];
        state.enemyBullets = [];
        state.balls.forEach(b => { b.vx = 0; b.vy = 0; b.isEnhanced = false; });
    }

    if (bs.state === 'DYING') {
        bs.face.xOffset = (Math.random() - 0.5) * 10;
        bs.face.yOffset = (Math.random() - 0.5) * 10;

        let activeFace = state.blocks.filter(b => b.part === 'face' && b.active);
        if (Math.random() < 0.3) {
            let b = activeFace.length > 0 ? activeFace[Math.floor(Math.random() * activeFace.length)] : null;
            let bx = b ? (b.baseX + bs.face.xOffset + b.w / 2) : (CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 200);
            let by = b ? (b.baseY + bs.face.yOffset + b.h / 2) : (150 + (Math.random() - 0.5) * 100);
            for (let i = 0; i < 5; i++) {
                state.particles.push({
                    x: bx,
                    y: by,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    size: Math.random() * 5 + 2,
                    life: 1.0,
                    decay: Math.random() * 0.02 + 0.01,
                    color: currentTheme === 'dark' ? '#ef4444' : '#b91c1c'
                });
            }
            if (b) b.active = false;
        }

        if (Date.now() > bs.timer) {
            bs.state = 'DEAD';
            bs.timer = Date.now() + 4000;
            state.blocks.forEach(b => { if (b.part === 'face' || b.part === 'blaster') b.active = false; });

            let fBlocks = state.blocks.filter(b => b.part === 'face');
            if (fBlocks.length > 0) {
                let minX = Math.min(...fBlocks.map(b => b.baseX));
                let maxX = Math.max(...fBlocks.map(b => b.baseX + b.w));
                let minY = Math.min(...fBlocks.map(b => b.baseY));
                let maxY = Math.max(...fBlocks.map(b => b.baseY + b.h));
                for (let i = 0; i < 100; i++) {
                    state.particles.push({
                        x: minX + Math.random() * (maxX - minX),
                        y: minY + Math.random() * (maxY - minY),
                        vx: (Math.random() - 0.5) * 20,
                        vy: (Math.random() - 0.5) * 20,
                        size: Math.random() * 10 + 5,
                        color: currentTheme === 'dark' ? '#ef4444' : '#dc2626',
                        life: 40 + Math.random() * 40,
                        maxLife: 80
                    });
                }
            }
        }
    } else if (bs.state === 'DEAD') {
        if (Date.now() > bs.timer) {
            state.gameState = 'GAMECLEAR';
        }
    } else {
        if (bs.state === 'EQUIP_TRIGGERED') {
            bs.smokeActive = false;
            bs.state = 'EQUIPPING';
            bs.timer = Date.now() + 2000;
            bs.blasterSide = Math.random() < 0.5 ? 'left' : 'right';
            bs.patternSeq = 0;

            state.balls.forEach(b => {
                let speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
                if (speed > 1.0 && speed < 4.0) {
                    b.storedVx = b.vx;
                    b.storedVy = b.vy;
                } else {
                    b.storedVx = (Math.random() > 0.5 ? 1 : -1) * 1.25;
                    b.storedVy = -2;
                }
            });

            let bx = bs.blasterSide === 'left' ? 130 : CANVAS_WIDTH - 130;
            bs.blasterX = bx;
            bs.blasterY = 150;
            bs.blasterTargetX = bx;
            bs.blasterTargetY = 150;
            bs.blasterAngle = Math.PI;
            bs.blasterTargetAngle = Math.PI;
            bs.nozzleX = bs.blasterX;
            bs.nozzleY = bs.blasterY;
            bs.equipDelay = true;

            let minX = Math.min(...blasterBlocks.map(b => b.baseX));
            let minY = Math.min(...blasterBlocks.map(b => b.baseY));
            let maxX = Math.max(...blasterBlocks.map(b => b.baseX)) + 18;
            let maxY = Math.max(...blasterBlocks.map(b => b.baseY)) + 24;
            let cx = (minX + maxX) / 2;
            let cy = (minY + maxY) / 2;

            blasterBlocks.forEach((b) => {
                b.active = true;
                b.color = undefined;
                b.relCenterX = b.baseX - cx;
                b.relCenterY = b.baseY - cy;
                b.spiralRadius = 150 + Math.random() * 200;
                b.spiralAngle = Math.random() * Math.PI * 2;
                b.spiralSpeed = (Math.random() - 0.5) * 0.4;
            });
        }

        // Transform blaster blocks
        if (bs.state !== 'START_WAIT' && bs.state !== 'EQUIP_TRIGGERED') {
            let isAttackPhase = ['EQUIPPING', 'EQUIPPED_WAIT', 'AIMING_A', 'AIMING_B', 'SHOOTING_A', 'SHOOTING_B', 'COUNTER_WINDOW', 'PHASE2_LASER_AIM', 'PADDLE_DESTROYED_LASER_BALLS'].includes(bs.state);
            if (isAttackPhase) {
                let targetX = (bs.state === 'PHASE2_LASER_AIM') ? bs.laserTargetX : (paddle.x + paddle.w / 2);
                let targetY = (bs.state === 'PHASE2_LASER_AIM') ? CANVAS_HEIGHT : paddle.y;
                if (bs.state === 'PADDLE_DESTROYED_LASER_BALLS') {
                    let tb = state.balls.find(b => !b.hidden);
                    if (tb) {
                        targetX = tb.x;
                        targetY = tb.y;
                    }
                }
                let dx = targetX - bs.nozzleX;
                let dy = targetY - bs.nozzleY;
                bs.blasterTargetAngle = Math.atan2(dy, dx) + Math.PI / 2;
            } else if (bs.state === 'SAMIDARE_PREP') {
                let elapsed = 2000 - (bs.timer - Date.now());
                let p = Math.max(0, Math.min(1, elapsed / 2000));
                let targetDx = (CANVAS_WIDTH / 2) - bs.nozzleX;
                let targetDy = -150 - bs.nozzleY;
                let finalAngle = Math.atan2(targetDy, targetDx) + Math.PI / 2;
                bs.blasterAngle = Math.PI - p * (Math.PI * 2 + (Math.PI - finalAngle));
                bs.blasterTargetAngle = bs.blasterAngle;
            } else if (bs.state === 'SAMIDARE_SHOOT_UP') {
                let targetDx = (CANVAS_WIDTH / 2) - bs.nozzleX;
                let targetDy = -150 - bs.nozzleY;
                bs.blasterTargetAngle = Math.atan2(targetDy, targetDx) + Math.PI / 2;
                bs.blasterAngle = bs.blasterTargetAngle;
            } else if (bs.state === 'IDLE' || bs.state === 'WAITING' || bs.state === 'PREP' || bs.state === 'SAMIDARE_WAIT_RAIN' || bs.state === 'SAMIDARE_RAINING' || bs.state === 'PHASE2_LASER_POST_WAIT') {
                bs.blasterTargetAngle = Math.PI;
            }

            if (!['COUNTER_FAIL_PREP', 'COUNTER_FAIL_PREP_WAIT', 'THROW_BLASTER'].includes(bs.state)) {
                bs.blasterX += (bs.blasterTargetX - bs.blasterX) * 0.1;
                bs.blasterY += (bs.blasterTargetY - bs.blasterY) * 0.1;
            }

            let diff = bs.blasterTargetAngle - bs.blasterAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            if (isAttackPhase) {
                let lerpFactor = 1.0;
                if (bs.state === 'PHASE2_LASER_AIM' || bs.state === 'PADDLE_DESTROYED_LASER_BALLS') {
                    lerpFactor = 0.2;
                } else if (bs.patternSeq === 0) {
                    if (bs.state === 'EQUIPPING' || bs.state === 'EQUIPPED_WAIT') {
                        lerpFactor = 0.05;
                    } else if (bs.state === 'AIMING_A' || bs.state === 'AIMING_B') {
                        let timeRemaining = bs.timer - Date.now();
                        if (timeRemaining < 0) timeRemaining = 0;
                        let maxAim = bs.maxAimTime || 1000;
                        lerpFactor = 0.05 + 0.95 * (1 - timeRemaining / maxAim);
                    }
                }
                bs.blasterAngle += diff * lerpFactor;
            } else if (bs.state !== 'SAMIDARE_PREP' && bs.state !== 'SAMIDARE_SHOOT_UP') {
                bs.blasterAngle += diff * 0.1;
            }

            let shakeX = 0;
            let shakeY = 0;
            if (bs.state === 'SHOOTING_A' || bs.state === 'SHOOTING_B' || bs.state === 'SAMIDARE_PREP' || bs.state === 'SAMIDARE_SHOOT_UP' || (bs.state === 'COUNTER_WINDOW' && Date.now() < bs.timer)) {
                shakeX = (Math.random() - 0.5) * 5;
                shakeY = (Math.random() - 0.5) * 5;
            }

            let cosA = Math.cos(bs.blasterAngle);
            let sinA = Math.sin(bs.blasterAngle);

            let progress = 1;
            if (bs.state === 'EQUIPPING') {
                progress = 1 - (bs.timer - Date.now()) / 2000;
                if (progress < 0) progress = 0;
                if (progress > 1) progress = 1;
            }
            let ease = 1 - Math.pow(1 - progress, 3);

            blasterBlocks.forEach(b => {
                let rx = b.relCenterX;
                let ry = b.relCenterY;

                if (progress < 1 && b.spiralRadius) {
                    let radius = b.spiralRadius * (1 - ease);
                    b.spiralAngle += b.spiralSpeed;
                    rx += Math.cos(b.spiralAngle) * radius;
                    ry += Math.sin(b.spiralAngle) * radius;
                }

                b.x = bs.blasterX + rx * cosA - ry * sinA + shakeX;
                b.y = bs.blasterY + rx * sinA + ry * cosA + shakeY;
            });

            let nozzleRelX = 54;
            let nozzleRelY = -108;
            bs.nozzleX = bs.blasterX + nozzleRelX * cosA - nozzleRelY * sinA + shakeX;
            bs.nozzleY = bs.blasterY + nozzleRelX * sinA + nozzleRelY * cosA + shakeY;
        }

        if (bs.state === 'CLEAR_SMOKE') {
            let faceBlocks = state.blocks.filter(b => b.part === 'face' && b.active);
            if (faceBlocks.length > 0) {
                let minX = Math.min(...faceBlocks.map(b => b.baseX + bs.face.xOffset));
                let maxX = Math.max(...faceBlocks.map(b => b.baseX + bs.face.xOffset + b.w));
                let minY = Math.min(...faceBlocks.map(b => b.baseY + bs.face.yOffset));
                let maxY = Math.max(...faceBlocks.map(b => b.baseY + bs.face.yOffset + b.h));

                state.balls.forEach(b => {
                    if (b.x + b.size / 2 >= minX - 10 && b.x - b.size / 2 <= maxX + 10 &&
                        b.y + b.size / 2 >= minY - 10 && b.y - b.size / 2 <= maxY + 10) {
                        b.y = maxY + b.size / 2 + 10;
                        if (b.vy < 0) b.vy = -b.vy;
                        if (Math.abs(b.vy) < 2) b.vy = 2;
                        if (b.ignoredParts) b.ignoredParts.delete('face');
                    }
                });
            }

            if (Date.now() > bs.timer) {
                bs.face.xOffset = 0;
                bs.state = 'WAITING';
                bs.timer = Date.now() + 1000;
            }
        } else if (bs.state === 'WAITING') {
            if (Date.now() > bs.timer) {
                if (paddle.destroyed || state.gameState !== 'PLAYING') {
                    bs.timer = Date.now() + 500;
                } else {
                    bs.state = 'EQUIP_TRIGGERED';
                }
            }
        } else if (bs.state === 'EQUIPPING') {
            state.balls.forEach(b => { b.vx *= 0.95; b.vy *= 0.95; });

            if (Date.now() > bs.timer) {
                if (bs.equipDelay) {
                    bs.equipDelay = false;
                    bs.state = 'EQUIPPED_WAIT';
                    bs.timer = Date.now() + 1000;
                    return;
                }

                if (bs.patternSeq === 7) {
                    bs.state = 'AIMING_A';
                } else {
                    if (bs.phase === 1) {
                        bs.state = (bs.patternSeq % 2 === 0) ? 'AIMING_A' : 'AIMING_B';
                    } else {
                        bs.state = Math.random() < 0.5 ? 'AIMING_A' : 'AIMING_B';
                    }
                }

                let aimTime = 500;
                if (bs.patternSeq === 0) aimTime = 1000;
                else if (bs.patternSeq >= 5 && bs.patternSeq <= 7) aimTime = 333;

                if (bs.state === 'AIMING_B') bs.lockedPaddleW = paddle.w + 96;
                bs.timer = Date.now() + aimTime;
                bs.maxAimTime = aimTime;
                bs.lastShotTime = 0;
                bs.barrageHit = false;
            }
        } else if (bs.state === 'EQUIPPED_WAIT') {
            if (Date.now() > bs.timer) {
                if (bs.phase >= 2 && paddle.destroyed && state.balls.some(b => !b.hidden)) {
                    bs.savedNextState = (bs.phase === 3 && bs.patternSeq === 0) ? 'SAMIDARE_PREP' : ((bs.phase === 2 && bs.patternSeq === 0) ? 'PHASE2_LASER_AIM' : 'AIMING_B');
                    bs.state = 'PADDLE_DESTROYED_LASER_BALLS';
                    bs.destroyTargetBall = state.balls.find(b => !b.hidden);
                    bs.destroyBallTimer = Date.now() + 500;
                    return;
                }

                if (bs.phase === 3 && bs.patternSeq === 0) {
                    bs.state = 'SAMIDARE_PREP';
                    bs.timer = Date.now() + 2000;
                    return;
                } else if (bs.phase === 2 && bs.patternSeq === 0) {
                    bs.state = 'PHASE2_LASER_AIM';
                    bs.laserCount = 0;
                    bs.laserTargetX = paddle.x + paddle.w / 2;
                    bs.timer = Date.now() + 1000;
                    bs.maxAimTime = 1000;
                    return;
                }

                if (bs.patternSeq === 7) {
                    bs.state = 'AIMING_A';
                } else {
                    if (bs.phase === 1) {
                        bs.state = (bs.patternSeq % 2 === 0) ? 'AIMING_A' : 'AIMING_B';
                    } else {
                        bs.state = Math.random() < 0.5 ? 'AIMING_A' : 'AIMING_B';
                    }
                }

                let aimTime = 500;
                if (bs.patternSeq === 0) aimTime = 1000;
                else if (bs.patternSeq >= 5 && bs.patternSeq <= 7) aimTime = 333;

                if (bs.state === 'AIMING_B') bs.lockedPaddleW = paddle.w + 96;
                bs.timer = Date.now() + aimTime;
                bs.maxAimTime = aimTime;
                bs.lastShotTime = 0;
                bs.barrageHit = false;
            }
        } else if (bs.state === 'SAMIDARE_PREP') {
            let isPurple = Math.floor(Date.now() / 500) % 2 === 0;
            blasterBlocks.forEach(b => { b.color = isPurple ? '#a855f7' : undefined; });

            if (Date.now() > bs.timer) {
                bs.state = 'SAMIDARE_SHOOT_UP';
                bs.timer = Date.now() + 2000;
                bs.lastSamidareShot = 0;
            }
        } else if (bs.state === 'SAMIDARE_SHOOT_UP') {
            let isPurple = Math.floor(Date.now() / 250) % 2 === 0;
            blasterBlocks.forEach(b => { b.color = isPurple ? '#a855f7' : undefined; });

            if (Date.now() - (bs.lastSamidareShot || 0) >= 50) {
                bs.lastSamidareShot = Date.now();
                let targetDx = (CANVAS_WIDTH / 2) - bs.nozzleX;
                let targetDy = -150 - bs.nozzleY;
                let baseAngle = Math.atan2(targetDy, targetDx);
                let aimError = (Math.random() - 0.5) * 0.3 * Math.PI;
                let angle = baseAngle + aimError;
                let speed = 8;
                state.enemyBullets.push({
                    x: bs.nozzleX,
                    y: bs.nozzleY,
                    w: 24, h: 24,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    type: '403_SAMIDARE_UP',
                    char: '403FORBIDDEN',
                    dead: false
                });
            }

            if (Date.now() > bs.timer) {
                blasterBlocks.forEach(b => { b.color = undefined; });
                bs.state = 'SAMIDARE_WAIT_RAIN';
                bs.timer = Date.now() + 1000;
            }
        } else if (bs.state === 'SAMIDARE_WAIT_RAIN') {
            if (Date.now() > bs.timer) {
                bs.state = 'SAMIDARE_RAINING';
                bs.samidareRainSpawned = 0;
                bs.nextRainSpawnTime = Date.now();
                bs.samidareFinishTimer = null;
            }
        } else if (bs.state === 'SAMIDARE_RAINING') {
            if (bs.samidareRainSpawned < 13 && Date.now() >= bs.nextRainSpawnTime) {
                bs.samidareRainSpawned++;
                bs.nextRainSpawnTime = Date.now() + 330;
                let rx = 50 + Math.random() * (CANVAS_WIDTH - 100);
                let burstY = CANVAS_HEIGHT * 0.45 + (Math.random() - 0.5) * 120;
                state.enemyBullets.push({
                    x: rx,
                    y: -20,
                    w: 24, h: 24,
                    vx: 0,
                    vy: 2.68,
                    burstY: burstY,
                    type: '403_SAMIDARE_RAIN',
                    char: '403FORBIDDEN',
                    exploded: false,
                    dead: false
                });
            }

            if (bs.samidareRainSpawned >= 13) {
                let hasSamidareBullets = state.enemyBullets.some(b => !b.dead && (b.type === '403_SAMIDARE_UP' || b.type === '403_SAMIDARE_RAIN' || b.type === '403_SAMIDARE_CLUSTER'));
                if (!hasSamidareBullets) {
                    if (!bs.samidareAllClearedTime) {
                        bs.samidareAllClearedTime = Date.now();
                    }
                    if (Date.now() >= bs.samidareAllClearedTime + 1000) {
                        bs.samidareAllClearedTime = null;
                        if (paddle.destroyed && state.balls.some(b => !b.hidden)) {
                            bs.savedNextState = 'PHASE2_LASER_AIM';
                            bs.state = 'PADDLE_DESTROYED_LASER_BALLS';
                            bs.destroyTargetBall = state.balls.find(b => !b.hidden);
                            bs.destroyBallTimer = Date.now() + 500;
                            return;
                        }
                        bs.state = 'PHASE2_LASER_AIM';
                        bs.laserCount = 0;
                        bs.laserTargetX = paddle.x + paddle.w / 2;
                        bs.timer = Date.now() + 1000;
                        bs.maxAimTime = 1000;
                    }
                } else {
                    bs.samidareAllClearedTime = null;
                }
            }
        } else if (bs.state === 'PHASE2_LASER_AIM') {
            if (Date.now() > bs.timer) {
                state.enemyBullets.push({
                    x: bs.nozzleX,
                    y: bs.nozzleY,
                    targetX: bs.laserTargetX,
                    type: 'LASER',
                    maxW: 40,
                    w: 40,
                    hitInterval: 50,
                    fireStartTime: Date.now(),
                    dead: false
                });

                bs.laserCount++;
                let maxLasers = (bs.phase === 3) ? 6 : 3;
                if (bs.laserCount < maxLasers) {
                    let nextAimDuration = (bs.phase === 3 && bs.laserCount >= 3) ? 750 : 1000;
                    bs.state = 'PHASE2_LASER_AIM';
                    bs.laserTargetX = paddle.x + paddle.w / 2;
                    bs.timer = Date.now() + nextAimDuration;
                    bs.maxAimTime = nextAimDuration;
                } else {
                    bs.state = 'PHASE2_LASER_POST_WAIT';
                    bs.timer = Date.now() + 1000;
                }
            }
        } else if (bs.state === 'PHASE2_LASER_POST_WAIT') {
            if (Date.now() > bs.timer) {
                if (paddle.destroyed && state.balls.some(b => !b.hidden)) {
                    bs.savedNextState = 'AIMING_B';
                    bs.state = 'PADDLE_DESTROYED_LASER_BALLS';
                    bs.destroyTargetBall = state.balls.find(b => !b.hidden);
                    bs.destroyBallTimer = Date.now() + 500;
                    return;
                }
                bs.patternSeq = 0;
                bs.state = 'AIMING_B';
                let aimTime = 1000;
                bs.lockedPaddleW = paddle.w + 96;
                bs.timer = Date.now() + aimTime;
                bs.maxAimTime = aimTime;
                bs.lastShotTime = 0;
                bs.barrageHit = false;
            }
        } else if (bs.state === 'PADDLE_DESTROYED_LASER_BALLS') {
            let targetBall = bs.destroyTargetBall && !bs.destroyTargetBall.hidden ? bs.destroyTargetBall : state.balls.find(b => !b.hidden);
            bs.destroyTargetBall = targetBall;

            if (targetBall) {
                let dx = targetBall.x - bs.nozzleX;
                let dy = targetBall.y - bs.nozzleY;
                bs.blasterTargetAngle = Math.atan2(dy, dx) + Math.PI / 2;

                if (Date.now() >= (bs.destroyBallTimer || 0)) {
                    state.enemyBullets.push({
                        x: bs.nozzleX,
                        y: bs.nozzleY,
                        targetX: targetBall.x,
                        targetY: targetBall.y,
                        type: 'LASER',
                        isPurple: true,
                        maxW: 40,
                        w: 40,
                        hitInterval: 50,
                        fireStartTime: Date.now(),
                        dead: false
                    });

                    targetBall.hidden = true;
                    targetBall.vx = 0;
                    targetBall.vy = 0;

                    for (let i = 0; i < 20; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        let spd = Math.random() * 6 + 2;
                        state.particles.push({
                            x: targetBall.x,
                            y: targetBall.y,
                            vx: Math.cos(angle) * spd,
                            vy: Math.sin(angle) * spd,
                            size: Math.random() * 6 + 3,
                            color: (Math.random() < 0.5) ? '#a855f7' : '#ffffff',
                            life: 1.0,
                            maxLife: 1.0,
                            decay: 0.03
                        });
                    }

                    let nextBall = state.balls.find(b => !b.hidden);
                    if (nextBall) {
                        bs.destroyTargetBall = nextBall;
                        bs.destroyBallTimer = Date.now() + 500;
                    } else {
                        bs.destroyTargetBall = null;
                        bs.destroyBallTimer = Date.now() + 1000;
                    }
                }
            } else {
                bs.blasterTargetAngle = Math.PI;
                if (Date.now() >= (bs.destroyBallTimer || 0)) {
                    state.balls = [];
                    bs.state = 'POST_RESPAWN_WAIT';
                    bs.postRespawnStartTime = null;
                }
            }
        } else if (bs.state === 'POST_RESPAWN_WAIT') {
            bs.blasterTargetAngle = Math.PI;
            if (state.gameState === 'PLAYING') {
                if (!bs.postRespawnStartTime) {
                    bs.postRespawnStartTime = Date.now();
                    bs.timer = Date.now() + 1000;
                }
                if (Date.now() > bs.timer) {
                    bs.postRespawnStartTime = null;
                    if (bs.savedNextState === 'SAMIDARE_PREP') {
                        bs.state = 'SAMIDARE_PREP';
                        bs.timer = Date.now() + 2000;
                    } else if (bs.savedNextState === 'PHASE2_LASER_AIM') {
                        bs.state = 'PHASE2_LASER_AIM';
                        bs.laserCount = 0;
                        bs.laserTargetX = paddle.x + paddle.w / 2;
                        bs.timer = Date.now() + 1000;
                        bs.maxAimTime = 1000;
                    } else {
                        bs.patternSeq = 0;
                        bs.state = 'AIMING_B';
                        let aimTime = 1000;
                        bs.lockedPaddleW = paddle.w + 96;
                        bs.timer = Date.now() + aimTime;
                        bs.maxAimTime = aimTime;
                        bs.lastShotTime = 0;
                        bs.barrageHit = false;
                    }
                }
            }
        } else if (bs.state === 'AIMING_A') {
            let lineAngle = bs.blasterAngle - Math.PI / 2;
            let dy = Math.sin(lineAngle);
            if (dy > 0.001) {
                bs.targetA = bs.nozzleX + Math.cos(lineAngle) * ((CANVAS_HEIGHT - bs.nozzleY) / dy);
            } else {
                bs.targetA = paddle.x + paddle.w / 2;
            }
            if (Date.now() > bs.timer) {
                if (bs.patternSeq === 7) {
                    bs.state = 'COUNTER_WINDOW';
                    bs.timer = Date.now() + 1000;
                } else {
                    bs.state = 'SHOOTING_A';
                    bs.timer = Date.now() + (bs.patternSeq >= 5 ? 333 : 500);
                }
                bs.lastShotTime = 0;
            }
        } else if (bs.state === 'SHOOTING_A') {
            let lineAngle = bs.blasterAngle - Math.PI / 2;
            let dy = Math.sin(lineAngle);
            if (dy > 0.001) {
                bs.targetA = bs.nozzleX + Math.cos(lineAngle) * ((CANVAS_HEIGHT - bs.nozzleY) / dy);
            } else {
                bs.targetA = paddle.x + paddle.w / 2;
            }
            if (Date.now() - bs.lastShotTime > 50) {
                bs.lastShotTime = Date.now();
                let nozzleX = bs.nozzleX;
                let nozzleY = bs.nozzleY;
                let angle = lineAngle;
                state.enemyBullets.push({
                    x: nozzleX, y: nozzleY, w: 16, h: 16,
                    vx: Math.cos(angle) * 12, vy: Math.sin(angle) * 12,
                    type: '403_BULLET', char: ['4', '0', '3'][Math.floor(Math.random() * 3)], dead: false
                });
            }
            if (Date.now() > bs.timer) {
                bs.state = 'EQUIPPING';
                bs.timer = Date.now() + (bs.patternSeq === 0 ? 500 : 0);
                bs.patternSeq++;
            }
        } else if (bs.state === 'AIMING_B') {
            let lineAngle = bs.blasterAngle - Math.PI / 2;
            let dy = Math.sin(lineAngle);
            if (dy > 0.001) {
                let centerAtPaddleY = bs.nozzleX + Math.cos(lineAngle) * ((paddle.y - bs.nozzleY) / dy);
                let spread = bs.lockedPaddleW / Math.max(0.1, dy);
                let targetL = centerAtPaddleY - spread / 2;
                let targetR = centerAtPaddleY + spread / 2;
                let yRatio = (CANVAS_HEIGHT - bs.nozzleY) / Math.max(1, paddle.y - bs.nozzleY);
                bs.targetBL = bs.nozzleX + (targetL - bs.nozzleX) * yRatio;
                bs.targetBR = bs.nozzleX + (targetR - bs.nozzleX) * yRatio;
            }
            if (Date.now() > bs.timer) {
                bs.state = 'SHOOTING_B';
                bs.timer = Date.now() + (bs.patternSeq >= 5 ? 333 : 500);
                bs.lastShotTime = 0;
            }
        } else if (bs.state === 'SHOOTING_B') {
            let lineAngle = bs.blasterAngle - Math.PI / 2;
            let dy = Math.sin(lineAngle);
            if (dy > 0.001) {
                let centerAtPaddleY = bs.nozzleX + Math.cos(lineAngle) * ((paddle.y - bs.nozzleY) / dy);
                let spread = bs.lockedPaddleW / Math.max(0.1, dy);
                let targetL = centerAtPaddleY - spread / 2;
                let targetR = centerAtPaddleY + spread / 2;
                let yRatio = (CANVAS_HEIGHT - bs.nozzleY) / Math.max(1, paddle.y - bs.nozzleY);
                bs.targetBL = bs.nozzleX + (targetL - bs.nozzleX) * yRatio;
                bs.targetBR = bs.nozzleX + (targetR - bs.nozzleX) * yRatio;
            }
            if (Date.now() - bs.lastShotTime > 50) {
                bs.lastShotTime = Date.now();
                let nozzleX = bs.nozzleX;
                let nozzleY = bs.nozzleY;
                let angleL = Math.atan2(CANVAS_HEIGHT - nozzleY, bs.targetBL - nozzleX);
                let angleR = Math.atan2(CANVAS_HEIGHT - nozzleY, bs.targetBR - nozzleX);
                let shotId = Date.now() + Math.random();
                state.enemyBullets.push({
                    x: nozzleX, y: nozzleY, w: 16, h: 16,
                    vx: Math.cos(angleL) * 12, vy: Math.sin(angleL) * 12,
                    type: '403_BULLET', char: ['4', '0', '3'][Math.floor(Math.random() * 3)], dead: false, shotId
                });
                state.enemyBullets.push({
                    x: nozzleX, y: nozzleY, w: 16, h: 16,
                    vx: Math.cos(angleR) * 12, vy: Math.sin(angleR) * 12,
                    type: '403_BULLET', char: ['4', '0', '3'][Math.floor(Math.random() * 3)], dead: false, shotId
                });
            }
            if (Date.now() > bs.timer) {
                bs.state = 'EQUIPPING';
                bs.timer = Date.now() + (bs.patternSeq === 0 ? 500 : 0);
                bs.patternSeq++;
            }
        } else if (bs.state === 'COUNTER_WINDOW') {
            bs.targetA = paddle.x + paddle.w / 2;
            if (Date.now() < bs.timer && Date.now() - bs.lastShotTime > 50) {
                bs.lastShotTime = Date.now();
                let nozzleX = bs.nozzleX;
                let nozzleY = bs.nozzleY;
                let angle = Math.atan2(CANVAS_HEIGHT - nozzleY, bs.targetA - nozzleX);
                state.enemyBullets.push({
                    x: nozzleX, y: nozzleY, w: 16, h: 16,
                    vx: Math.cos(angle) * 12, vy: Math.sin(angle) * 12,
                    type: '403_COUNTER_BULLET', char: ['4', '0'][Math.floor(Math.random() * 2)], dead: false
                });
            }

            if (Date.now() > bs.timer) {
                bs.state = 'COUNTER_FAIL_PREP';
                bs.timer = Date.now() + 1000;
                bs.patternSeq = 0;
                bs.failStartAngle = bs.blasterAngle;
                bs.failStartX = bs.blasterX;
                bs.failStartY = bs.blasterY;
                bs.blasterHitPaddle = false;
            }
        } else if (bs.state === 'COUNTER_FAIL_PREP') {
            let progress = 1 - (bs.timer - Date.now()) / 1000;
            if (progress < 0) progress = 0; if (progress > 1) progress = 1;

            bs.blasterAngle = bs.failStartAngle + progress * Math.PI * 2;
            let awayDx = bs.failStartX - (paddle.x + paddle.w / 2);
            let awayDy = bs.failStartY - paddle.y;
            let len = Math.sqrt(awayDx * awayDx + awayDy * awayDy) || 1;
            bs.blasterX = bs.failStartX + (awayDx / len) * (progress * 50);
            bs.blasterY = bs.failStartY + (awayDy / len) * (progress * 50);

            bs.blasterX += (Math.random() - 0.5) * 5;
            bs.blasterY += (Math.random() - 0.5) * 5;

            if (Date.now() > bs.timer) {
                bs.state = 'COUNTER_FAIL_PREP_WAIT';
                bs.timer = Date.now() + 1000;
                bs.throwTargetX = paddle.x + paddle.w / 2;
                bs.throwTargetY = paddle.y;
            }
        } else if (bs.state === 'COUNTER_FAIL_PREP_WAIT') {
            if (Date.now() > bs.timer) {
                bs.state = 'THROW_BLASTER';
                let dx = bs.throwTargetX - bs.blasterX;
                let dy = bs.throwTargetY - bs.blasterY;
                let len = Math.sqrt(dx * dx + dy * dy) || 1;
                bs.throwVx = (dx / len) * 20;
                bs.throwVy = (dy / len) * 20;
            }
        } else if (bs.state === 'THROW_BLASTER') {
            bs.blasterX += bs.throwVx;
            bs.blasterY += bs.throwVy;
            bs.blasterAngle += 0.5;

            if (!bs.blasterHitPaddle && !paddle.destroyed && Date.now() > (paddle.invincibleEndTime || 0)) {
                let hitBlock = false;
                for (let blk of blasterBlocks) {
                    if (!blk.active) continue;
                    let br = { x: blk.x, y: blk.y, w: blk.w, h: blk.h };
                    let pr = { x: paddle.x, y: paddle.y, w: paddle.w, h: paddle.h };
                    if (rectIntersect(br, pr)) {
                        hitBlock = true;
                        break;
                    }
                }

                if (hitBlock) {
                    bs.blasterHitPaddle = true;
                    paddle.destroyed = true;
                    spawnPaddleParticles();
                    paddle.invincibleEndTime = Date.now() + 1000;
                }
            }

            if (bs.blasterX < -200 || bs.blasterX > CANVAS_WIDTH + 200 || bs.blasterY < -200 || bs.blasterY > CANVAS_HEIGHT + 200) {
                if (!bs.offScreenTime) bs.offScreenTime = Date.now();
                if (Date.now() > bs.offScreenTime + 500) {
                    bs.state = 'STUNNED';
                    bs.timer = Date.now() + 10000;
                    blasterBlocks.forEach(b => { b.active = false; });
                    state.balls.forEach(b => {
                        b.isRecovering = true;
                        b.recoveryStartTime = Date.now();
                        let targetVx = (b.storedVx !== undefined && b.storedVx !== null) ? b.storedVx : (Math.random() > 0.5 ? 1 : -1) * 1.25;
                        let targetVy = (b.storedVy !== undefined && b.storedVy !== null) ? b.storedVy : -2;
                        let currentSpeed = Math.sqrt(targetVx * targetVx + targetVy * targetVy);
                        if (currentSpeed < 1.0 || currentSpeed > 4.0) {
                            targetVx = (Math.random() > 0.5 ? 1 : -1) * 1.25;
                            targetVy = -2;
                        }
                        b.vx = targetVx;
                        b.vy = targetVy;
                    });
                }
            }
        } else if (bs.state === 'STUNNED') {
            if (Date.now() > bs.timer) {
                bs.state = 'TELEGRAPH_SUMMON';
                bs.timer = Date.now() + 1500;
                bs.counterSuccessTime = 0;
                bs.counterHitCount = 0;
            }
        } else if (bs.state === 'TELEGRAPH_SUMMON') {
            bs.face.yOffset = Math.sin(Date.now() / 50) * 10;
            if (Date.now() > bs.timer) {
                bs.state = 'SUMMONING';
                bs.timer = Date.now() + 2000;
                bs.face.yOffset = 0;
            }
        }

        // Global Counter Success check
        if (['COUNTER_WINDOW', 'COUNTER_FAIL_PREP', 'COUNTER_FAIL_PREP_WAIT', 'THROW_BLASTER'].includes(bs.state)) {
            if (bs.counterSuccessTime && Date.now() - bs.counterSuccessTime > 750) {
                bs.state = 'STUNNED';
                bs.timer = Date.now() + 10000;
                bs.patternSeq = 0;
            }

            if (['COUNTER_FAIL_PREP', 'COUNTER_FAIL_PREP_WAIT', 'THROW_BLASTER'].includes(bs.state)) {
                let flash = Math.floor(Date.now() / 250) % 2 === 0;
                blasterBlocks.forEach(b => {
                    b.color = flash ? '#ef4444' : undefined;
                });
            }
        } else if (bs.state === 'SUMMONING') {
            if (!bs.summoned) {
                bs.summoned = true;
                let maxAllowed = Math.max(0, 3 - state.enemies.length);
                let desiredCount = bs.phase === 3 ? 3 : 2;
                let count = Math.min(desiredCount, maxAllowed);
                for (let i = 0; i < count; i++) {
                    let type;
                    if (bs.phase === 3 && i === 2) {
                        type = ['NOT', 'FOUND', 'ERROR'][Math.floor(Math.random() * 3)];
                    } else {
                        type = ['DENIED', 'ACCESS', 'FORBIDDEN'][Math.floor(Math.random() * 3)];
                    }
                    let maxHp = type.length;
                    let hp = bs.smokeActive ? 2 : maxHp;
                    let enW = type.length * 32;
                    let eX = 100 + Math.random() * (CANVAS_WIDTH - 200);
                    let eY = 100 + Math.random() * 150;
                    state.enemies.push({
                        x: eX, y: eY, w: enW, h: 32,
                        type: type, hp: hp, maxHp: maxHp, dead: false, text: type,
                        lastAttackTime: Date.now() + Math.random() * 5000,
                        lastShootTime: Date.now() + Math.random() * 5000,
                        lastHitTime: 0,
                        actionState: 'IDLE',
                        vx: Math.random() < 0.5 ? 0.5 : -0.5,
                        vy: 0,
                        targetX: paddle.x + paddle.w / 2
                    });
                }
            }
            if (Date.now() > bs.timer) {
                bs.state = 'FACE_ATTACK';
                bs.faceAttackPhase = 1;
                bs.timer = Date.now() + 30000;
                bs.faceAttackEnded = false;
                bs.summoned = false;
                bs.face.timer = Date.now() + 3000;
            }
        } else if (bs.state === 'FACE_ATTACK') {
            if (!bs.faceAttackEnded) {
                if (bs.faceAttackPhase === 1) {
                    if (Date.now() > bs.timer) {
                        if (state.enemies.length > 0) {
                            bs.faceAttackPhase = 2;
                            bs.timer = Date.now() + 30000;
                        } else {
                            bs.faceAttackEnded = true;
                        }
                    }
                } else if (bs.faceAttackPhase === 2) {
                    if (state.enemies.length === 0 || Date.now() > bs.timer) {
                        bs.faceAttackEnded = true;
                    }
                }
            }

            if (bs.faceAttackEnded && bs.face.state === 'IDLE') {
                if (bs.smokeActive) {
                    bs.state = 'CLEAR_SMOKE';
                    bs.timer = Date.now() + 1500;
                    bs.smokeActive = false;
                    state.particles = state.particles.filter(p => p.char !== undefined || !['#6b7280', '#9ca3af', '#4b5563', '#d1d5db', '#374151'].includes(p.color));
                } else {
                    bs.state = 'WAITING';
                    bs.timer = Date.now() + 2000;
                }
            } else {
                // Face attacks
                if (bs.face.state === 'IDLE') {
                    if (!bs.faceAttackEnded && Date.now() > bs.face.timer) {
                        bs.face.state = 'PREP';
                        bs.face.timer = Date.now() + 1000 + Math.random() * 1000;
                    }
                } else if (bs.face.state === 'PREP') {
                    bs.face.targetX = paddle.x + paddle.w / 2 - CANVAS_WIDTH / 2;
                    bs.face.xOffset += (bs.face.targetX - bs.face.xOffset) * 0.05;
                    bs.face.yOffset = Math.sin(Date.now() / 50) * 5 - 20;
                    if (Date.now() > bs.face.timer) {
                        bs.face.state = 'WAIT_DROP';
                        bs.face.timer = Date.now() + 500;
                    }
                } else if (bs.face.state === 'WAIT_DROP') {
                    if (Date.now() > bs.face.timer) {
                        bs.face.state = 'DROP';
                        bs.face.dropVy = 0;
                        bs.face.hitPaddle = false;
                    }
                } else if (bs.face.state === 'DROP') {
                    bs.face.dropVy += 1;
                    bs.face.yOffset += bs.face.dropVy;

                    if (!bs.face.hitPaddle && !paddle.destroyed && Date.now() > (paddle.invincibleEndTime || 0)) {
                        let pr = { x: paddle.x, y: paddle.y, w: paddle.w, h: paddle.h };
                        let fBlocks = state.blocks.filter(b => b.part === 'face' && b.active);
                        for (let b of fBlocks) {
                            let bx = b.baseX + bs.face.xOffset;
                            let by = b.baseY + bs.face.yOffset;
                            if (rectIntersect(pr, { x: bx, y: by, w: b.w, h: b.h })) {
                                paddle.destroyed = true;
                                spawnPaddleParticles();
                                bs.face.hitPaddle = true;
                                break;
                            }
                        }
                    }

                    if (bs.face.yOffset > CANVAS_HEIGHT - 300) {
                        bs.face.state = 'WAIT_RETURN';
                        bs.face.timer = Date.now() + 1000;

                        let fBlocks = state.blocks.filter(b => b.part === 'face' && b.active);
                        let minX = (fBlocks.length > 0) ? Math.min(...fBlocks.map(b => b.baseX + bs.face.xOffset)) : (CANVAS_WIDTH / 2 - 150 + bs.face.xOffset);
                        let maxX = (fBlocks.length > 0) ? Math.max(...fBlocks.map(b => b.baseX + bs.face.xOffset + b.w)) : (CANVAS_WIDTH / 2 + 150 + bs.face.xOffset);
                        let groundY = CANVAS_HEIGHT - 30;
                        let dustColors = currentTheme === 'dark' ? ['#a16207', '#78350f', '#ca8a04', '#d97706', '#92400e', '#713f12'] : ['#fde047', '#facc15', '#fef08a', '#eab308', '#d97706', '#ca8a04'];
                        for (let i = 0; i < 50; i++) {
                            let px = minX + Math.random() * (maxX - minX);
                            let side = (px < (minX + maxX) / 2) ? -1 : 1;
                            let vx = side * (Math.random() * 8 + 2) + (Math.random() - 0.5) * 4;
                            let vy = -Math.random() * 6 - 2;
                            state.particles.push({
                                x: px,
                                y: groundY - Math.random() * 15,
                                vx: vx,
                                vy: vy,
                                size: Math.random() * 10 + 6,
                                color: dustColors[Math.floor(Math.random() * dustColors.length)],
                                life: 1.0,
                                maxLife: 1.0,
                                decay: Math.random() * 0.02 + 0.015,
                                gravity: 0.1
                            });
                        }

                        for (let i = 0; i < 6; i++) {
                            state.enemyBullets.push({
                                x: CANVAS_WIDTH / 2 + bs.face.xOffset,
                                y: CANVAS_HEIGHT - 100,
                                w: 16, h: 16,
                                vx: (Math.random() - 0.5) * 10,
                                vy: -10 - Math.random() * 5,
                                type: '404_ARC',
                                char: ['4', '0', '3'][Math.floor(Math.random() * 3)],
                                dead: false
                            });
                        }
                        playBeep(200);
                    }
                } else if (bs.face.state === 'WAIT_RETURN') {
                    if (Date.now() > bs.face.timer) {
                        bs.face.state = 'RETURN';
                    }
                } else if (bs.face.state === 'RETURN') {
                    bs.face.yOffset -= 3 * state.globalSpeedMult;
                    bs.face.xOffset *= 0.9;
                    if (bs.face.yOffset <= 0) {
                        bs.face.yOffset = 0;
                        bs.face.xOffset = 0;
                        bs.face.state = 'IDLE';
                        bs.face.timer = Date.now() + 3000 + Math.random() * 3000;
                    }
                }
            }
        }
    }
};

export const handleBoss10CounterReturnHit = (bull) => {
    let bs = state.boss403State;
    let blasterBlocks = state.blocks.filter(b => b.active && b.part === 'blaster');
    let hitBlock = false;
    for (let b of blasterBlocks) {
        if (bull.x > b.x && bull.x < b.x + b.w && bull.y > b.y && bull.y < b.y + b.h) {
            hitBlock = true;
            break;
        }
    }

    if (hitBlock) {
        bull.dead = true;
        bs.counterHitCount = (bs.counterHitCount || 0) + 1;
        bs.blasterX += (Math.random() - 0.5) * 20;
        bs.blasterY += (Math.random() - 0.5) * 20;
        playBeep(200);

        if (bs.counterHitCount >= 12 && !bs.counterSuccessTime) {
            bs.counterSuccessTime = Date.now();
            bs.faceShakeEndTime = Date.now() + 1000;
            bs.smokeActive = true;
            bs.explosionsLeft = 3;
            bs.nextExplosionTime = Date.now();

            state.balls.forEach(b => {
                b.isRecovering = true;
                b.recoveryStartTime = Date.now();
                let targetVx = (b.storedVx !== undefined && b.storedVx !== null) ? b.storedVx : (Math.random() > 0.5 ? 1 : -1) * 1.25;
                let targetVy = (b.storedVy !== undefined && b.storedVy !== null) ? b.storedVy : -2;
                let currentSpeed = Math.sqrt(targetVx * targetVx + targetVy * targetVy);
                if (currentSpeed < 1.0 || currentSpeed > 4.0) {
                    targetVx = (Math.random() > 0.5 ? 1 : -1) * 1.25;
                    targetVy = -2;
                }
                b.vx = targetVx;
                b.vy = targetVy;
            });

            blasterBlocks.forEach(blk => {
                blk.active = false;
                blk.color = undefined;
                state.particles.push({
                    x: blk.x + blk.w / 2, y: blk.y + blk.h / 2,
                    vx: (Math.random() - 0.5) * 15,
                    vy: -5 - Math.random() * 5,
                    gravity: 0.5,
                    life: 1.0, maxLife: 1.0, decay: 0.005,
                    color: blk.color || (currentTheme === 'dark' ? '#f3f4f6' : '#111827'),
                    char: '4'
                });
            });
        }
    }
};

export const handleBoss10BallCollision = (b, bl) => {
    let bs = state.boss403State;
    if (bl.part === 'face' && (['WAIT_DROP', 'DROP', 'WAIT_RETURN', 'RETURN'].includes(bs.face.state) || (b.ignoredParts && b.ignoredParts.has('face')))) {
        return { hit: false, invincible: false };
    }
    let isInvincible = !bs.smokeActive;
    if (isInvincible) {
        playBeep(300);
        b.faceBounces = (b.faceBounces || 0) + 1;
        if (!b.faceFirstBounceTime || Date.now() - b.faceFirstBounceTime > 1000) {
            b.faceFirstBounceTime = Date.now();
            b.faceBounces = 1;
        }
        if (b.faceBounces >= 4) {
            b.ignoredParts = b.ignoredParts || new Set();
            b.ignoredParts.add('face');
            if (b.vy < 0) b.vy = Math.abs(b.vy) || 3;
            if (Math.abs(b.vy) < 2) b.vy = 2;
            b.faceBounces = 0;
        }
    }
    if (bs.state === 'START_WAIT') {
        bs.state = 'EQUIP_TRIGGERED';
    }
    if (!isInvincible) {
        bl.active = false;
        if (bl.part === 'face') {
            bs.face.hp--;
        }
        state.score++;
        playBeep(200);
    }
    return { hit: true, invincible: isInvincible };
};

export const drawBoss10AimLasers = (ctx, textColor) => {
    let bs = state.boss403State;
    let nozzleX = bs.nozzleX;
    let nozzleY = bs.nozzleY;

    ctx.save();
    ctx.lineWidth = 2;
    if (bs.state === 'AIMING_A' || bs.state === 'AIMING_B' || bs.state === 'PHASE2_LASER_AIM') {
        let timeRemaining = bs.timer - Date.now();
        let maxAimTime = bs.maxAimTime || (bs.state === 'PHASE2_LASER_AIM' ? 1000 : 500);
        if (timeRemaining < 0) timeRemaining = 0;
        if (timeRemaining > maxAimTime) timeRemaining = maxAimTime;
        let redRatio = 1 - (timeRemaining / maxAimTime);

        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -(Date.now() % 1000) * 0.1;
        ctx.beginPath();

        if (bs.state === 'PHASE2_LASER_AIM') {
            ctx.moveTo(nozzleX, nozzleY);
            ctx.lineTo(bs.laserTargetX, CANVAS_HEIGHT);
        } else if (bs.state === 'AIMING_A') {
            ctx.moveTo(nozzleX, nozzleY);
            ctx.lineTo(bs.targetA, CANVAS_HEIGHT);
        } else {
            ctx.moveTo(nozzleX, nozzleY);
            ctx.lineTo(bs.targetBL, CANVAS_HEIGHT);
            ctx.moveTo(nozzleX, nozzleY);
            ctx.lineTo(bs.targetBR, CANVAS_HEIGHT);
        }

        ctx.strokeStyle = textColor;
        ctx.stroke();

        if (redRatio > 0) {
            ctx.save();
            ctx.globalAlpha = redRatio;
            ctx.strokeStyle = '#ef4444';
            ctx.stroke();
            ctx.restore();
        }
    }

    if (bs.destroyingBall && state.balls.length > 0) {
        let b = state.balls[0];
        ctx.setLineDash([]);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#a855f7';
        ctx.beginPath();
        ctx.moveTo(nozzleX, nozzleY);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();

        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(b.x + (Math.random() - 0.5) * 10, b.y + (Math.random() - 0.5) * 10, Math.random() * 20 + 10, 0, Math.PI * 2);
            ctx.fillStyle = '#a855f7';
            ctx.fill();
        }
    }

    ctx.restore();
};
