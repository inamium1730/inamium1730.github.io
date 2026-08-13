import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants/maps.js';
import { state } from './state.js';
import { playBeep } from './audio.js';
import { currentTheme } from './theme.js';
import { rectIntersect, getAutoAimVelocity, getNeededHealChar, transferItem } from './utils.js';
import { spawnBall, spawnPaddleParticles } from './entities.js';

export const update = () => {
    let paddle = state.paddle;
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

    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.w > CANVAS_WIDTH) paddle.x = CANVAS_WIDTH - paddle.w;

    if (state.gameState === 'TUTORIAL' || state.gameState === 'READY') {
        let spd = 8 * state.globalSpeedMult;
        if (Date.now() < paddle.mudEndTime) spd *= 0.5;
        if (state.keys.left) paddle.x -= spd;
        if (state.keys.right) paddle.x += spd;
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x > CANVAS_WIDTH - paddle.w) paddle.x = CANVAS_WIDTH - paddle.w;

        if (state.balls.length > 0) {
            state.balls[0].x = paddle.x + paddle.w / 2;
            state.balls[0].y = paddle.y - 20;
        }
        return;
    }

    if (state.gameState === 'PLAYING') {
        state.particles.forEach(p => {
            p.x += p.vx * state.globalSpeedMult;
            p.y += p.vy * state.globalSpeedMult;
            p.life -= state.globalSpeedMult;
        });
        state.particles = state.particles.filter(p => p.life > 0);

        let spd = 8 * state.globalSpeedMult;
        if (Date.now() < paddle.mudEndTime) spd *= 0.5;
        if (state.keys.left) paddle.x -= spd;
        if (state.keys.right) paddle.x += spd;
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x > CANVAS_WIDTH - paddle.w) paddle.x = CANVAS_WIDTH - paddle.w;

        let stopBalls = state.currentStage === 5 && state.bossState.active && (state.bossState.face.state === 'DYING' || state.bossState.face.state === 'DEAD');

        state.balls.forEach(b => {
            if (stopBalls) return;

            let currentBaseSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            let minVy = currentBaseSpeed * 0.25;
            if (Math.abs(b.vy) < minVy) {
                b.vy = b.vy >= 0 ? minVy : -minVy;
                let newVx = Math.sqrt(currentBaseSpeed * currentBaseSpeed - b.vy * b.vy);
                b.vx = b.vx >= 0 ? newVx : -newVx;
            }

            b.x += b.vx * state.globalSpeedMult;
            b.y += b.vy * state.globalSpeedMult;

            let wallHit = false;
            if (b.x - b.size / 2 < 0) { b.x = b.size / 2; b.vx *= -1; wallHit = true; }
            if (b.x + b.size / 2 > CANVAS_WIDTH) { b.x = CANVAS_WIDTH - b.size / 2; b.vx *= -1; wallHit = true; }
            if (b.y - b.size / 2 < 0) { b.y = b.size / 2; b.vy *= -1; wallHit = true; }
            if (wallHit) playBeep(200);

            if (!paddle.destroyed && b.vy > 0 && b.y + b.size / 2 > paddle.y && b.y - b.size / 2 < paddle.y + paddle.h && b.x > paddle.x && b.x < paddle.x + paddle.w) {
                b.y = paddle.y - b.size / 2;
                let currentBaseSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);

                if (Date.now() < paddle.nBuffEndTime) {
                    b.isEnhanced = true;
                    let hitFactor = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
                    hitFactor = Math.max(-1, Math.min(1, hitFactor));
                    let maxVx = currentBaseSpeed * 0.85;
                    let normalVx = hitFactor * maxVx;
                    let normalVy = -Math.sqrt(currentBaseSpeed * currentBaseSpeed - normalVx * normalVx);

                    let aimedVelocity = getAutoAimVelocity(b.x, b.y, normalVx, normalVy, currentBaseSpeed);
                    b.vx = aimedVelocity.vx;
                    b.vy = aimedVelocity.vy;
                } else {
                    b.isEnhanced = false;
                    let hitFactor = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
                    hitFactor = Math.max(-1, Math.min(1, hitFactor));
                    let maxVx = currentBaseSpeed * 0.85;
                    b.vx = hitFactor * maxVx;
                    b.vy = -Math.sqrt(currentBaseSpeed * currentBaseSpeed - b.vx * b.vx);
                }
                state.globalSpeedMult += 0.01 / state.balls.length;
                playBeep(800);
            }

            if (state.currentStage === 5 && state.bossState.active) {
                if (!b.ignoredParts) b.ignoredParts = new Set();
                let br = { x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size };

                ['leftHand', 'rightHand'].forEach(part => {
                    let pState = state.bossState[part];
                    if (pState.state === 'LOCK' || pState.state === 'PUNCH' || pState.state === 'GROUNDED') {
                        b.ignoredParts.add(part);
                    } else {
                        let intersecting = false;
                        let partBlocks = state.blocks.filter(blk => blk.active && blk.part === part);
                        for (let blk of partBlocks) {
                            let blockR = { x: blk.x, y: blk.y, w: blk.w, h: blk.h };
                            if (rectIntersect(br, blockR)) {
                                intersecting = true;
                                break;
                            }
                        }
                        if (!intersecting) {
                            b.ignoredParts.delete(part);
                        }
                    }
                });
            }

            for (let bl of state.blocks) {
                if (!bl.active) continue;

                if (state.currentStage === 5 && bl.part) {
                    let pState = state.bossState[bl.part];
                    if (pState.state === 'DYING' || pState.state === 'DEAD') {
                        continue;
                    }
                    if (b.ignoredParts && b.ignoredParts.has(bl.part)) {
                        continue;
                    }
                }

                let br = { x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size };
                let blockR = { x: bl.x, y: bl.y, w: bl.w, h: bl.h };
                if (rectIntersect(br, blockR)) {
                    let isInvincible = false;
                    if (state.currentStage === 5 && bl.part) {
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
                            }
                            else if (bl.part === 'rightHand' && state.bossState.rightHand.hp < state.bossState.rightHand.maxHp * 0.2) {
                                state.bossState.rightHand.hp = 0;
                                state.bossState.rightHand.state = 'DYING';
                                state.bossState.rightHand.timer = Date.now() + 2000;
                            }
                            else if (bl.part === 'face' && state.bossState.face.hp < state.bossState.face.maxHp * 0.1) {
                                state.bossState.face.hp = 0;
                                state.bossState.face.state = 'DYING';
                                state.bossState.face.timer = Date.now() + 4000;
                            }
                        }
                    } else {
                        bl.active = false;
                        state.score++;
                        playBeep(200);
                    }

                    let overlapLeft = (br.x + br.w) - blockR.x;
                    let overlapRight = (blockR.x + blockR.w) - br.x;
                    let overlapTop = (br.y + br.h) - blockR.y;
                    let overlapBottom = (blockR.y + blockR.h) - br.y;
                    let minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                    if (!(b.isEnhanced && Date.now() < paddle.nBuffEndTime) || isInvincible) {
                        if (minOverlap === overlapLeft) {
                            b.x -= overlapLeft;
                            b.vx = -Math.abs(b.vx);
                        } else if (minOverlap === overlapRight) {
                            b.x += overlapRight;
                            b.vx = Math.abs(b.vx);
                        } else if (minOverlap === overlapTop) {
                            b.y -= overlapTop;
                            b.vy = -Math.abs(b.vy);
                        } else if (minOverlap === overlapBottom) {
                            b.y += overlapBottom;
                            b.vy = Math.abs(b.vy);
                        }
                    }

                    if (bl.itemType && !isInvincible) {
                        let droppedItemType = bl.itemType;
                        bl.itemType = null;
                        if (droppedItemType === 'nbuff') {
                            if (Date.now() < paddle.nBuffEndTime || state.items.filter(i => i.char === 'N').length >= 1) {
                                transferItem('nbuff');
                            } else {
                                state.items.push({
                                    x: bl.x + bl.w / 2,
                                    y: bl.y + bl.h / 2,
                                    vy: 1.5,
                                    char: 'N',
                                    color: currentTheme === 'dark' ? '#38bdf8' : '#0284c7',
                                    type: 'nbuff',
                                    size: 20
                                });
                            }
                        } else if (droppedItemType.startsWith('normal_')) {
                            let req = parseInt(droppedItemType.split('_')[1]);
                            if (state.reserve.length <= req) {
                                if (state.items.filter(i => i.type !== 'nbuff').length >= 2) {
                                    transferItem(droppedItemType);
                                } else {
                                    const itemChar = Math.random() < 0.5 ? '4' : '0';
                                    const needed = getNeededHealChar();
                                    let type = 'multiball';
                                    let color = '#facc15';
                                    if (needed === itemChar) {
                                        type = 'heal';
                                        color = '#a3e635';
                                    }
                                    state.items.push({
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

                    if (state.blocks.filter(b => b.active).length === 0) {
                        state.gameState = 'GAMECLEAR';
                    }
                    break;
                }
            }

            let bBox = { x: b.x - b.size / 2, y: b.y - b.size, w: b.size, h: b.size };

            if (state.currentStage >= 2) {
                state.enemies.forEach(en => {
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
                            let isPhase3 = state.currentStage === 5 && state.bossState.active && state.bossState.leftHand.state === 'DEAD' && state.bossState.rightHand.state === 'DEAD';
                            let maxEnemies = state.currentStage === 5 ? (isPhase3 ? 4 : 2) : (state.currentStage === 4 ? 6 : (state.currentStage === 3 ? 4 : 2));
                            if (Math.random() < 2 / maxEnemies) {
                                const itemChar = Math.random() < 0.5 ? '4' : '0';
                                const needed = getNeededHealChar();
                                let type = 'multiball'; let color = '#facc15';
                                if (needed === itemChar) { type = 'heal'; color = '#a3e635'; }
                                state.items.push({ x: en.x, y: en.y, vy: 1.5, char: itemChar, color: color, type: type, size: 20 });
                            }
                        }
                    }
                });

                state.enemyBullets.forEach(bull => {
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

            if (!paddle.destroyed && b.vy > 0 && b.y > paddle.y - b.size && b.y < paddle.y + paddle.h && b.x > paddle.x - b.size && b.x < paddle.x + paddle.w + b.size) {
                b.y = paddle.y - b.size / 2;
                let currentBaseSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);

                if (Date.now() < paddle.nBuffEndTime) {
                    b.isEnhanced = true;
                    let hitFactor = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
                    hitFactor = Math.max(-1, Math.min(1, hitFactor));
                    let maxVx = currentBaseSpeed * 0.85;
                    let normalVx = hitFactor * maxVx;
                    let normalVy = -Math.sqrt(currentBaseSpeed * currentBaseSpeed - normalVx * normalVx);
                    let aimedVelocity = getAutoAimVelocity(b.x, b.y, normalVx, normalVy, currentBaseSpeed);
                    b.vx = aimedVelocity.vx;
                    b.vy = aimedVelocity.vy;
                } else {
                    b.isEnhanced = false;
                    let hitFactor = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
                    hitFactor = Math.max(-1, Math.min(1, hitFactor));
                    let maxVx = currentBaseSpeed * 0.85;
                    b.vx = hitFactor * maxVx;
                    b.vy = -Math.sqrt(currentBaseSpeed * currentBaseSpeed - b.vx * b.vx);
                }
                state.globalSpeedMult += 0.01 / state.balls.length;
                playBeep(800);
            }
        });

        state.balls = state.balls.filter(b => b.y < CANVAS_HEIGHT + 50);

        state.items.forEach(item => {
            item.y += item.vy * state.globalSpeedMult;
            let ir = { x: item.x - item.size / 2, y: item.y - item.size / 2, w: item.size, h: item.size };
            let pr = { x: paddle.x, y: paddle.y, w: paddle.w, h: paddle.h };
            if (rectIntersect(ir, pr)) {
                item.caught = true;
                if (item.type === 'heal') {
                    if (state.reserve.length < 3) {
                        state.reserve.push(item.char);
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
                    state.balls.push({
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

        state.items = state.items.filter(i => !i.caught && i.y < CANVAS_HEIGHT + 50);

        if (state.currentStage === 7) {
            if (Math.random() < 0.015) {
                state.tumbleweeds.push({
                    x: CANVAS_WIDTH + 50,
                    y: CANVAS_HEIGHT - 100 - 10,
                    vx: -2 - Math.random() * 2,
                    rotation: 0
                });
            }
        }
        
        state.tumbleweeds.forEach(t => {
            t.x += t.vx * state.globalSpeedMult;
            t.rotation -= 0.05 * state.globalSpeedMult;
        });
        state.tumbleweeds = state.tumbleweeds.filter(t => t.x > -50);

        if (state.currentStage >= 8 && state.cacti.length === 0) {
            // Generate 3 random cacti
            for (let i = 0; i < 3; i++) {
                state.cacti.push({
                    x: 100 + Math.random() * (CANVAS_WIDTH - 200),
                    y: CANVAS_HEIGHT - 100 - (60 + Math.random() * 40),
                    h: 60 + Math.random() * 40
                });
            }
        }

        if (state.currentStage >= 2) {
            if (state.currentStage !== 5 && state.currentStage <= 10) {
                let spawnInterval = state.currentMapData ? state.currentMapData.spawnInterval : 10000;
                let maxEnemies = 2;
                if (state.currentStage === 3) maxEnemies = 4;
                if (state.currentStage >= 4) maxEnemies = 6;

                if (Date.now() - state.lastEnemySpawnTime > spawnInterval && state.enemies.length < maxEnemies) {
                    state.enemySpawnCount++;
                    
                    let possibleEnemies = Object.keys(state.enemiesData).filter(enType => {
                        let data = state.enemiesData[enType];
                        return data.stages && data.stages.includes(state.currentStage);
                    });
                    
                    let enType = 'NOT';
                    if (possibleEnemies.length > 0) {
                        let pool = [];
                        let mapName = state.currentMapData ? state.currentMapData.name : '';
                        possibleEnemies.forEach(en => {
                            let weight = (en === mapName) ? 2 : 1;
                            for (let i = 0; i < weight; i++) pool.push(en);
                        });
                        enType = pool[Math.floor(Math.random() * pool.length)];
                    }

                    let enData = state.enemiesData[enType] || { name: 'NOT' };
                    let enW = enData.name.length * 32;
                    let enHp = enData.name.length;
                    
                    state.enemies.push({
                        x: Math.random() * (CANVAS_WIDTH - enW) + (enW / 2),
                        y: 50,
                        w: enW,
                        h: 32,
                        vx: Math.random() < 0.5 ? 0.5 : -0.5,
                        hp: enHp,
                        type: enType,
                        lastShootTime: Date.now(),
                        lastHitTime: 0,
                        actionState: 'IDLE'
                    });
                    state.lastEnemySpawnTime = Date.now();
                }
            }

            state.enemies.forEach(en => {
                if (!en.actionState) en.actionState = 'IDLE';

                if (en.actionState === 'IDLE') {
                    en.x += en.vx * state.globalSpeedMult;
                    if (en.x - en.w / 2 < 0) {
                        en.x = en.w / 2;
                        en.vx *= -1;
                        en.y += 20;
                    } else if (en.x + en.w / 2 > CANVAS_WIDTH) {
                        en.x = CANVAS_WIDTH - en.w / 2;
                        en.vx *= -1;
                        en.y += 20;
                    }
                }

                let enData = state.enemiesData[en.type] || { attackInterval: [3000, 5000] };
                let intervalDiff = enData.attackInterval[1] - enData.attackInterval[0];
                let shootInterval = enData.attackInterval[0] + Math.random() * intervalDiff;

                if (en.actionState === 'IDLE') {
                    if (Date.now() - en.lastShootTime > shootInterval) {
                        if (en.type === 'DENIED' || en.type === 'ACCESS') {
                            en.actionState = 'AIMING';
                            en.actionStartTime = Date.now();
                            if (en.type === 'ACCESS') en.aimTargetX = paddle.x + paddle.w / 2;
                            else en.aimTargetX = en.x;
                        } else {
                            if (en.type === 'ERROR') {
                                state.enemyBullets.push({
                                    x: en.x, y: en.y + 20, startY: en.y + 20,
                                    w: 16, h: 48, vx: 0, vy: 2,
                                    type: 'ERROR_BULLET', dead: false, exploded: false
                                });
                            } else if (en.type === 'FOUND') {
                                let targetX = paddle.x + paddle.w / 2;
                                let targetY = paddle.y + paddle.h / 2;
                                let dx = targetX - en.x; let dy = targetY - (en.y + 20);
                                let dist = Math.sqrt(dx * dx + dy * dy); let speed = 4;
                                state.enemyBullets.push({
                                    x: en.x, y: en.y + 20, w: 16, h: 48,
                                    vx: (dx / dist) * speed, vy: (dy / dist) * speed,
                                    type: 'FOUND', dead: false
                                });
                            } else if (en.type === 'FORBIDDEN') {
                                state.enemyBullets.push({
                                    x: en.x, y: en.y + 20, w: 16, h: 16,
                                    vx: 0, vy: 0, type: 'MUD', dead: false
                                });
                            } else {
                                state.enemyBullets.push({
                                    x: en.x, y: en.y + 20, w: 16, h: 48,
                                    vx: 0, vy: 4, type: 'NOT', dead: false
                                });
                            }
                            en.lastShootTime = Date.now();
                        }
                    }
                } else if (en.actionState === 'AIMING') {
                    if (Date.now() - en.actionStartTime > 500) {
                        en.actionState = 'LOCKING';
                        en.actionStartTime = Date.now();
                    }
                } else if (en.actionState === 'LOCKING') {
                    if (Date.now() - en.actionStartTime > 500) {
                        en.actionState = 'FIRING';
                        en.actionStartTime = Date.now();
                        state.enemyBullets.push({
                            x: en.x, y: en.y + 20,
                            targetX: en.aimTargetX,
                            w: 20, h: CANVAS_HEIGHT,
                            vx: 0, vy: 0, type: 'LASER',
                            fireStartTime: Date.now(), dead: false
                        });
                        playBeep(800);
                    }
                } else if (en.actionState === 'FIRING') {
                    if (Date.now() - en.actionStartTime > 500) {
                        en.actionState = 'IDLE';
                        en.lastShootTime = Date.now();
                    }
                }
            });

            let currentBullets = [...state.enemyBullets];
            currentBullets.forEach(bull => {
                if (bull.dead) return;
                if (bull.type === 'MUD') {
                    bull.vy += 0.2;
                    bull.x += bull.vx * state.globalSpeedMult;
                    bull.y += bull.vy * state.globalSpeedMult;
                    
                    if (bull.y >= paddle.y) {
                        bull.dead = true;
                        ['m', 'u', 'd'].forEach((char, idx) => {
                            let angle = -Math.PI / 2 + (idx - 1) * 0.5;
                            let speed = 3 + Math.random() * 2;
                            state.enemyBullets.push({
                                x: bull.x, y: bull.y, w: 16, h: 16,
                                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                                type: 'MUD_SHRAPNEL', char: char, dead: false
                            });
                        });
                        playBeep(400);
                    }
                } else if (bull.type === 'MUD_SHRAPNEL') {
                    bull.vy += 0.2;
                    bull.x += bull.vx * state.globalSpeedMult;
                    bull.y += bull.vy * state.globalSpeedMult;
                    if (bull.y > CANVAS_HEIGHT) bull.dead = true;
                } else if (bull.type === 'LASER') {
                    let elapsed = Date.now() - bull.fireStartTime;
                    if (elapsed >= 500) bull.dead = true;
                    else bull.w = 20 * (1 - elapsed / 500);
                } else {
                    bull.x += bull.vx * state.globalSpeedMult;
                    bull.y += bull.vy * state.globalSpeedMult;
                }

                if (bull.type === 'ERROR_BULLET' && !bull.exploded && bull.y >= Math.max(CANVAS_HEIGHT / 2, (bull.startY || 0) + 150)) {
                    bull.exploded = true;
                    bull.dead = true;
                    let angles = [0, 45, 90, 135, 180, 225, 270, 315];
                    angles.forEach(deg => {
                        let rad = deg * Math.PI / 180;
                        state.enemyBullets.push({
                            x: bull.x,
                            y: bull.y,
                            w: 16, h: 16,
                            vx: Math.cos(rad) * 4,
                            vy: Math.sin(rad) * 4,
                            type: 'SCATTERED_BULLET',
                            dead: false
                        });
                    });
                    return;
                }

                if (bull.type === '404NOTFOUND_BASE') {
                    let dx = bull.x - bull.startX;
                    let dy = bull.y - bull.startY;
                    let distSq = dx * dx + dy * dy;
                    if (distSq >= 200 * 200) {
                        bull.dead = true;
                        let angles = [0, 45, 90, 135, 180, 225, 270, 315];
                        let outText = Math.random() < 0.5 ? '404' : 'NOT';
                        angles.forEach(deg => {
                            let rad = deg * Math.PI / 180;
                            state.enemyBullets.push({
                                x: bull.x,
                                y: bull.y,
                                w: 16, h: 16,
                                vx: Math.cos(rad) * 4,
                                vy: Math.sin(rad) * 4,
                                type: '404NOTFOUND_SHRAPNEL',
                                char: outText,
                                dead: false
                            });
                        });
                    }
                }

                if (bull.type === '404_ARC') {
                    bull.vy += 0.2 * state.globalSpeedMult;
                }

                let hitRadius = 10;
                let isHit = false;

                if (bull.type === 'LASER') {
                    if (!bull.dead && Date.now() - (bull.lastHitTime || 0) > 100) {
                        let t = (paddle.y - bull.y) / (CANVAS_HEIGHT - bull.y);
                        let laserXAtPaddle = bull.x + t * ((bull.targetX || bull.x) - bull.x);
                        if (!paddle.destroyed && paddle.x < laserXAtPaddle + bull.w / 2 && paddle.x + paddle.w > laserXAtPaddle - bull.w / 2) {
                            bull.lastHitTime = Date.now();
                            if (Date.now() < paddle.ndEndTime) {
                                paddle.destroyed = true;
                                spawnPaddleParticles();
                            } else if (Date.now() < paddle.foundEndTime) {
                                paddle.ndEndTime = Date.now() + 5000;
                                paddle.foundEndTime = Date.now() + 10000;
                            } else {
                                paddle.foundEndTime = Date.now() + 10000;
                                paddle.ndEndTime = 0;
                            }
                            playBeep(100);
                        }
                    }
                } else {
                    if (!paddle.destroyed && Date.now() > (paddle.invincibleEndTime || 0)) {
                        let nearestX = Math.max(paddle.x, Math.min(bull.x, paddle.x + paddle.w));
                        let nearestY = Math.max(paddle.y, Math.min(bull.y, paddle.y + paddle.h));
                        let dx = bull.x - nearestX;
                        let dy = bull.y - nearestY;
                        isHit = (dx * dx + dy * dy <= hitRadius * hitRadius);
                    }

                    if (isHit) {
                        if (bull.type === 'MUD' || bull.type === 'MUD_SHRAPNEL') {
                            paddle.mudEndTime = Date.now() + 10000;
                            bull.dead = true;
                            playBeep(150);
                        } else {
                            bull.dead = true;
                            if (Date.now() < paddle.ndEndTime) {
                                paddle.destroyed = true;
                                spawnPaddleParticles();
                            } else if (Date.now() < paddle.foundEndTime) {
                                paddle.ndEndTime = Date.now() + 5000;
                                paddle.foundEndTime = Date.now() + 10000;
                            } else {
                                paddle.foundEndTime = Date.now() + 10000;
                                paddle.ndEndTime = 0;
                            }
                        }
                    }
                }
            });

            state.enemies = state.enemies.filter(en => !en.dead && en.y < CANVAS_HEIGHT + 100);
            state.enemyBullets = state.enemyBullets.filter(bull => !bull.dead && bull.y < CANVAS_HEIGHT);
        }

        if (state.currentStage === 5 && state.bossState.active) {
            let face = state.bossState.face;

            if (state.bossState.leftHand.state === 'DEAD' && state.bossState.rightHand.state === 'DEAD' && face.state !== 'DYING' && face.state !== 'DEAD') {
                if (state.bossState.twoEnemiesStartTime === undefined) state.bossState.twoEnemiesStartTime = 0;

                if (state.bossState.twoEnemiesStartTime === 0) {
                    if (state.enemies.length >= 4) {
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
                                playBeep(400);
                            }
                        }
                    }
                }
            }

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
                        playBeep(100);
                    }
                }
            } else if (face.state !== 'DEAD' && face.hp > 0) {
                if (face.state === 'IDLE') {
                    let handsIdle = (state.bossState.leftHand.hp <= 0 || state.bossState.leftHand.state === 'IDLE') &&
                        (state.bossState.rightHand.hp <= 0 || state.bossState.rightHand.state === 'IDLE');
                    if (Date.now() > face.timer && Date.now() > state.bossState.stunUntil && handsIdle) {
                        let isPhase3 = state.bossState.leftHand.state === 'DEAD' && state.bossState.rightHand.state === 'DEAD';
                        let limit = isPhase3 ? 4 : 2;
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

            let bHands = ['leftHand', 'rightHand'];
            bHands.forEach(handName => {
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
                            playBeep(100);
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
        }

        if (state.balls.length === 0 && state.gameState === 'PLAYING') {
            state.globalSpeedMult = 1.1 + (state.globalSpeedMult - 1.1) / 2.0;
            if (!spawnBall()) {
                state.gameState = 'GAMEOVER';
            } else {
                state.gameState = 'READY';
                state.keys.left = false;
                state.keys.right = false;
            }
        }
    }
};
