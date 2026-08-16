import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants/maps.js';
import { state } from '../state.js';
import { playBeep } from '../audio.js';
import { currentTheme } from '../theme.js';
import { rectIntersect } from '../utils.js';
import { spawnPaddleParticles } from '../entities.js';

export const initBoss5 = (lCount, rCount, fCount) => {
    state.bossState.active = true;
    state.bossState.stunUntil = 0;
    state.bossState.leftHand = { state: 'IDLE', timer: Date.now() + 2000, xOffset: 0, yOffset: 0, targetX: 0, hit: false, hp: lCount, maxHp: lCount };
    state.bossState.rightHand = { state: 'IDLE', timer: Date.now() + 5000, xOffset: 0, yOffset: 0, targetX: 0, hit: false, hp: rCount, maxHp: rCount };
    state.bossState.face = { state: 'IDLE', timer: Date.now() + 30000, xOffset: 0, yOffset: 0, hp: fCount, maxHp: fCount };
    state.bossState.twoEnemiesStartTime = 0;
};

export const updateBoss5 = () => {
    if (!state.bossState.active) return;

    let face = state.bossState.face;
    let paddle = state.paddle;

    // Handle phase 3 two-enemies attack timer & radial bullet barrage
    if (state.bossState.leftHand.state === 'DEAD' && state.bossState.rightHand.state === 'DEAD' && face.state !== 'DYING' && face.state !== 'DEAD') {
        if (state.bossState.twoEnemiesStartTime === undefined) state.bossState.twoEnemiesStartTime = 0;

        if (state.bossState.twoEnemiesStartTime === 0) {
            if (state.enemies.length >= 2) {
                state.bossState.twoEnemiesStartTime = Date.now();
            }
        } else {
            if (state.enemies.length === 0) {
                state.bossState.twoEnemiesStartTime = 0;
                face.timer = 0;
                state.bossState.stunUntil = 0;
            } else {
                let elapsed = Date.now() - state.bossState.twoEnemiesStartTime;
                if (elapsed > 30000) {
                    state.bossState.twoEnemiesStartTime = Date.now();
                    let faceBlocks = state.blocks.filter(b => b.part === 'face' && b.active);
                    if (faceBlocks.length > 0) {
                        let cx = 0; faceBlocks.forEach(b => cx += b.baseX); cx /= faceBlocks.length;
                        let cy = 0; faceBlocks.forEach(b => cy = Math.max(cy, b.baseY));

                        let angles = [0, 45, 90, 135, 180, 225, 270, 315];
                        angles.forEach(deg => {
                            let rad = deg * Math.PI / 180;
                            state.enemyBullets.push({
                                x: cx,
                                y: cy,
                                startX: cx,
                                startY: cy,
                                w: 16, h: 16,
                                vx: Math.cos(rad) * 3,
                                vy: Math.sin(rad) * 3,
                                type: '404NOTFOUND_BASE',
                                dead: false
                            });
                        });
                    }
                }
            }
        }
    }

    // Face movement / hover offset
    if (face.state !== 'DYING' && face.state !== 'DEAD') {
        let elapsed = (state.bossState.twoEnemiesStartTime && state.bossState.twoEnemiesStartTime > 0) ? Date.now() - state.bossState.twoEnemiesStartTime : 0;
        if (elapsed > 15000) {
            if (face.state === 'IDLE') {
                face.xOffset = (Math.random() - 0.5) * 4;
                face.yOffset = (Math.random() - 0.5) * 4;
            } else if (face.state === 'TELEGRAPH') {
                face.xOffset = (Math.random() - 0.5) * 4;
                face.yOffset = Math.sin(Date.now() / 50) * 10 + (Math.random() - 0.5) * 4;
            }
        } else {
            if (face.state === 'IDLE') {
                face.xOffset = 0;
                face.yOffset = 0;
            } else if (face.state === 'TELEGRAPH') {
                face.xOffset = 0;
                face.yOffset = Math.sin(Date.now() / 50) * 10;
            }
        }
    }

    // Face dying explosion
    if (face.state === 'DYING') {
        face.xOffset = (Math.random() - 0.5) * 8;
        face.yOffset = (Math.random() - 0.5) * 8;
        if (Date.now() > face.timer) {
            face.state = 'DEAD';
            face.timer = Date.now() + 4000;
            state.blocks.forEach(b => { if (b.part === 'face') b.active = false; });

            let fBlocks = state.blocks.filter(b => b.part === 'face');
            if (fBlocks.length > 0) {
                let minX = Math.min(...fBlocks.map(b => b.x));
                let maxX = Math.max(...fBlocks.map(b => b.x + b.w));
                let minY = Math.min(...fBlocks.map(b => b.y));
                let maxY = Math.max(...fBlocks.map(b => b.y + b.h));
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
    } else if (face.state !== 'DEAD' && face.hp > 0) {
        if (face.state === 'IDLE') {
            let handsIdle = (state.bossState.leftHand.hp <= 0 || state.bossState.leftHand.state === 'IDLE') &&
                (state.bossState.rightHand.hp <= 0 || state.bossState.rightHand.state === 'IDLE');
            if (Date.now() > face.timer && Date.now() > state.bossState.stunUntil && handsIdle) {
                let limit = 2;
                let isCharging = state.bossState.twoEnemiesStartTime !== undefined && state.bossState.twoEnemiesStartTime !== 0;
                if (state.enemies.length < limit && !isCharging) {
                    face.state = 'TELEGRAPH';
                    face.timer = Date.now() + 1500;
                } else {
                    face.timer = Date.now() + 2000;
                }
            }
        } else if (face.state === 'TELEGRAPH') {
            face.yOffset = Math.sin(Date.now() / 50) * 10;
            if (Date.now() > face.timer) {
                face.state = 'SUMMON';

                let faceBlocks = state.blocks.filter(b => b.part === 'face' && b.active);
                if (faceBlocks.length > 0) {
                    let cx = 0; faceBlocks.forEach(b => cx += b.baseX); cx /= faceBlocks.length;
                    let cy = 0; faceBlocks.forEach(b => cy = Math.max(cy, b.baseY));

                    let isEnhancedPhase = (state.bossState.leftHand.hp + state.bossState.rightHand.hp) <= (state.bossState.leftHand.maxHp + state.bossState.rightHand.maxHp) * 0.5;
                    let types = isEnhancedPhase ? ['FOUND', 'ERROR'] : ['NOT', 'FOUND', 'ERROR'];
                    let tIdx = Math.floor(Math.random() * types.length);
                    let eType = types[tIdx];
                    let eW = eType === 'ERROR' ? 128 : (eType === 'FOUND' ? 160 : 96);
                    let eHp = eType === 'ERROR' ? 5 : (eType === 'FOUND' ? 5 : 3);

                    state.enemies.push({
                        x: cx,
                        y: cy + 20,
                        w: eW,
                        h: 32,
                        vx: Math.random() < 0.5 ? 0.5 : -0.5,
                        hp: eHp,
                        type: eType,
                        lastShootTime: Date.now(),
                        lastHitTime: 0
                    });
                }

                let isPhase3 = state.bossState.leftHand.state === 'DEAD' && state.bossState.rightHand.state === 'DEAD';
                face.timer = Date.now() + (isPhase3 ? 5000 : 15000);
                face.state = 'IDLE';
                state.bossState.stunUntil = Date.now() + 5000;
            }
        }
    }

    // Boss Hands AI
    ['leftHand', 'rightHand'].forEach(handName => {
        let hand = state.bossState[handName];
        if (hand.state === 'DYING') {
            hand.xOffset = (Math.random() - 0.5) * 8;
            hand.yOffset = (Math.random() - 0.5) * 8;
            if (Date.now() > hand.timer) {
                hand.state = 'DEAD';
                state.blocks.forEach(b => { if (b.part === handName) b.active = false; });

                let hBlocks = state.blocks.filter(b => b.part === handName);
                if (hBlocks.length > 0) {
                    let minX = Math.min(...hBlocks.map(b => b.x));
                    let maxX = Math.max(...hBlocks.map(b => b.x + b.w));
                    let minY = Math.min(...hBlocks.map(b => b.y));
                    let maxY = Math.max(...hBlocks.map(b => b.y + b.h));
                    for (let i = 0; i < 50; i++) {
                        state.particles.push({
                            x: minX + Math.random() * (maxX - minX),
                            y: minY + Math.random() * (maxY - minY),
                            vx: (Math.random() - 0.5) * 15,
                            vy: (Math.random() - 0.5) * 15,
                            size: Math.random() * 8 + 4,
                            color: currentTheme === 'dark' ? '#ef4444' : '#dc2626',
                            life: 30 + Math.random() * 30,
                            maxLife: 60
                        });
                    }
                }
            }
            return;
        }

        if (hand.state === 'DEAD') return;

        if (hand.state === 'IDLE') {
            let otherHandName = handName === 'leftHand' ? 'rightHand' : 'leftHand';
            let otherHand = state.bossState[otherHandName];
            let canAct = (otherHand.hp <= 0 || otherHand.state === 'IDLE') && state.bossState.face.state === 'IDLE';

            if (Date.now() > hand.timer && Date.now() > state.bossState.stunUntil && canAct) {
                hand.state = 'WINDUP';
                hand.timer = Date.now() + 1000 + Math.random() * 1000;
            }
        } else if (hand.state === 'WINDUP') {
            let target = paddle.x + paddle.w / 2;
            let handBlocks = state.blocks.filter(b => b.part === handName && b.active);
            if (handBlocks.length > 0) {
                let cx = 0; handBlocks.forEach(b => cx += b.baseX); cx /= handBlocks.length;
                hand.targetX = target - cx;
            }
            hand.xOffset += (hand.targetX - hand.xOffset) * 0.05;
            hand.yOffset = -10;

            if (Date.now() > hand.timer) {
                hand.state = 'LOCK';
                hand.timer = Date.now() + 500;
            }
        } else if (hand.state === 'LOCK') {
            if (Date.now() > hand.timer) {
                hand.state = 'PUNCH';
                hand.hit = false;
            }
        } else if (hand.state === 'PUNCH') {
            hand.yOffset += 15 * state.globalSpeedMult;

            if (!hand.hit && !paddle.destroyed && Date.now() > (paddle.invincibleEndTime || 0)) {
                let hBlocks = state.blocks.filter(b => b.part === handName && b.active);
                for (let b of hBlocks) {
                    let br = { x: b.x, y: b.y, w: b.w, h: b.h };
                    let pr = { x: paddle.x, y: paddle.y, w: paddle.w, h: paddle.h };
                    if (rectIntersect(br, pr)) {
                        hand.hit = true;
                        if (Date.now() < paddle.ndEndTime) {
                            paddle.destroyed = true;
                            spawnPaddleParticles();
                        } else if (Date.now() < paddle.foundEndTime) {
                            paddle.ndEndTime = Date.now() + 5000;
                            paddle.foundEndTime = Date.now() + 10000;
                        } else {
                            paddle.foundEndTime = Date.now() + 10000;
                        }
                        break;
                    }
                }
            }

            let maxDrop = CANVAS_HEIGHT - 30 - 200;
            if (hand.yOffset > maxDrop) {
                hand.yOffset = maxDrop;
                hand.state = 'GROUNDED';
                hand.timer = Date.now() + 1500;

                let hBlocks = state.blocks.filter(b => b.part === handName && b.active);
                if (hBlocks.length > 0) {
                    let minX = Math.min(...hBlocks.map(b => b.x));
                    let maxX = Math.max(...hBlocks.map(b => b.x + b.w));
                    let baseY = Math.max(...hBlocks.map(b => b.y + b.h));
                    let groundY = Math.min(baseY, CANVAS_HEIGHT - 30);
                    for (let i = 0; i < 30; i++) {
                        state.particles.push({
                            x: minX + Math.random() * (maxX - minX),
                            y: groundY - Math.random() * 20,
                            vx: (Math.random() - 0.5) * 10,
                            vy: -Math.random() * 5 - 2,
                            size: Math.random() * 10 + 5,
                            color: currentTheme === 'dark' ? '#777' : '#999',
                            life: 30 + Math.random() * 20,
                            maxLife: 50
                        });
                    }

                    if ((state.bossState.leftHand.hp + state.bossState.rightHand.hp) <= (state.bossState.leftHand.maxHp + state.bossState.rightHand.maxHp) * 0.5) {
                        let center = (minX + maxX) / 2;
                        let chars = ['4', '0', '4'];

                        chars.forEach((c, i) => {
                            state.enemyBullets.push({
                                x: center - 20,
                                y: groundY,
                                w: 16, h: 16,
                                vx: -1.5 - i * 1.0,
                                vy: -12 + Math.random() * 2,
                                type: '404_ARC',
                                char: c,
                                dead: false
                            });
                        });

                        chars.forEach((c, i) => {
                            state.enemyBullets.push({
                                x: center + 20,
                                y: groundY,
                                w: 16, h: 16,
                                vx: 1.5 + i * 1.0,
                                vy: -12 + Math.random() * 2,
                                type: '404_ARC',
                                char: c,
                                dead: false
                            });
                        });
                    }
                }
            }
        } else if (hand.state === 'GROUNDED') {
            if (Date.now() > hand.timer) {
                hand.state = 'RETURN';
            }
        } else if (hand.state === 'RETURN') {
            hand.yOffset -= 5 * state.globalSpeedMult;
            hand.xOffset -= (hand.xOffset) * 0.05;
            if (hand.yOffset <= 0) {
                hand.yOffset = 0;
                hand.xOffset = 0;
                hand.state = 'IDLE';
                let otherHandName = handName === 'leftHand' ? 'rightHand' : 'leftHand';
                let isOtherDead = state.bossState[otherHandName].state === 'DEAD' || state.bossState[otherHandName].state === 'DYING';
                if (isOtherDead) {
                    hand.timer = Date.now() + 5000;
                    state.bossState.stunUntil = Date.now() + 5000;
                } else {
                    hand.timer = Date.now() + 2000 + Math.random() * 3000;
                    state.bossState.stunUntil = Date.now() + 2500;
                }
            }
        }
    });

    if (state.bossState.face.state === 'DEAD') {
        if (Date.now() > state.bossState.face.timer) {
            state.gameState = 'GAMECLEAR';
        }
    }
};

export const handleBoss5BallCollision = (b, bl) => {
    let pState = state.bossState[bl.part];
    if (pState.state === 'DYING' || pState.state === 'DEAD') return { hit: false, invincible: false };
    if (b.ignoredParts && b.ignoredParts.has(bl.part)) return { hit: false, invincible: false };

    let isInvincible = false;
    if (bl.part === 'face' && (state.bossState.leftHand.hp > 0 || state.bossState.rightHand.hp > 0)) {
        isInvincible = true;
        playBeep(300);
    } else {
        bl.active = false;
        state.score++;
        playBeep(200);
        state.bossState[bl.part].hp--;

        if (bl.part === 'leftHand' && state.bossState.leftHand.hp < state.bossState.leftHand.maxHp * 0.2) {
            state.bossState.leftHand.hp = 0;
            state.bossState.leftHand.state = 'DYING';
            state.bossState.leftHand.timer = Date.now() + 2000;
        } else if (bl.part === 'rightHand' && state.bossState.rightHand.hp < state.bossState.rightHand.maxHp * 0.2) {
            state.bossState.rightHand.hp = 0;
            state.bossState.rightHand.state = 'DYING';
            state.bossState.rightHand.timer = Date.now() + 2000;
        } else if (bl.part === 'face' && state.bossState.face.hp < state.bossState.face.maxHp * 0.1) {
            state.bossState.face.hp = 0;
            state.bossState.face.state = 'DYING';
            state.bossState.face.timer = Date.now() + 4000;
        }
    }
    return { hit: true, invincible: isInvincible };
};
