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
            if (p.gravity !== undefined) {
                p.vy += p.gravity * state.globalSpeedMult;
            }
            if (p.life !== undefined) {
                p.life -= (p.decay !== undefined ? p.decay : 0.05) * state.globalSpeedMult;
            }
        });
        state.particles = state.particles.filter(p => (p.life === undefined || p.life > 0) && p.y < CANVAS_HEIGHT + 100);

        let spd = 8 * state.globalSpeedMult;
        if (Date.now() < paddle.mudEndTime) spd *= 0.5;
        if (!paddle.destroyed) {
            if (state.keys.left) paddle.x -= spd;
            if (state.keys.right) paddle.x += spd;
            if (paddle.x < 0) paddle.x = 0;
            if (paddle.x > CANVAS_WIDTH - paddle.w) paddle.x = CANVAS_WIDTH - paddle.w;
        }

        let isBoss5Defeated = state.currentStage === 5 && state.bossState.active && (state.bossState.face.state === 'DYING' || state.bossState.face.state === 'DEAD' || state.bossState.face.hp <= 0);
        let isBoss10Defeated = state.currentStage === 10 && state.boss403State.active && (state.boss403State.face.hp <= 0 || state.boss403State.state === 'DYING' || state.boss403State.state === 'DEAD' || state.blocks.filter(b => b.active && b.part === 'face').length === 0);
        let stopBalls = isBoss5Defeated || isBoss10Defeated;
        if (stopBalls) {
            state.enemies = [];
            state.enemyBullets = [];
            state.balls.forEach(b => { b.vx = 0; b.vy = 0; });
        }

        state.balls.forEach(b => {
            if (stopBalls) return;

            let currentBaseSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            let minVy = currentBaseSpeed * 0.25;
            if (Math.abs(b.vy) < minVy) {
                b.vy = b.vy >= 0 ? minVy : -minVy;
                let newVx = Math.sqrt(currentBaseSpeed * currentBaseSpeed - b.vy * b.vy);
                b.vx = b.vx >= 0 ? newVx : -newVx;
            }

            let speedMult = 1.0;
            if (b.isDecelerating) {
                let progress = (Date.now() - b.decelerateStartTime) / 2000;
                if (progress >= 1) {
                    b.vx = 0;
                    b.vy = 0;
                    b.isDecelerating = false;
                    b.stopped = true;
                } else {
                    b.vx *= 0.96;
                    b.vy *= 0.96;
                }
            } else if (b.isRecovering) {
                let progress = (Date.now() - b.recoveryStartTime) / 2000;
                if (progress >= 1) {
                    b.isRecovering = false;
                } else {
                    speedMult = progress;
                }
            }

            b.x += b.vx * state.globalSpeedMult * speedMult;
            b.y += b.vy * state.globalSpeedMult * speedMult;

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
            } else if (state.currentStage === 10 && state.boss403State.active) {
                if (!b.ignoredParts) b.ignoredParts = new Set();
                let br = { x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size };
                let bs = state.boss403State;

                if (['WAIT_DROP', 'DROP', 'WAIT_RETURN', 'RETURN'].includes(bs.face.state)) {
                    b.ignoredParts.add('face');
                } else {
                    let intersecting = false;
                    let faceBlocks = state.blocks.filter(blk => blk.active && blk.part === 'face');
                    for (let blk of faceBlocks) {
                        let bx = blk.baseX + bs.face.xOffset;
                        let by = blk.baseY + bs.face.yOffset;
                        let blockR = { x: bx, y: by, w: blk.w, h: blk.h };
                        if (rectIntersect(br, blockR)) {
                            intersecting = true;
                            break;
                        }
                    }
                    if (!intersecting) {
                        b.ignoredParts.delete('face');
                    }
                }
            }

            let bBox = { x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size };

            if (state.currentStage >= 2) {
                state.enemies.forEach(en => {
                    let enBox = { x: en.x - en.w / 2, y: en.y - en.h / 2, w: en.w, h: en.h };
                    if (!en.dead && Date.now() - (en.lastHitTime || 0) > 200 && rectIntersect(bBox, enBox)) {
                        if (b.isEnhanced && Date.now() < paddle.nBuffEndTime) {
                            en.hp = 0;
                        } else {
                            en.hp--;
                            b.vy *= -1;
                            en.lastHitTime = Date.now();
                        }
                        if (en.hp <= 0) {
                            en.dead = true;
                            en.actionState = 'DEAD';
                            let isPhase3 = state.currentStage === 5 && state.bossState.active && state.bossState.leftHand.state === 'DEAD' && state.bossState.rightHand.state === 'DEAD';
                            let maxEnemies = state.currentMapData ? (state.currentMapData.maxEnemies || 2) : 2;
                            if (state.currentStage === 5) maxEnemies = isPhase3 ? 4 : 2;
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

                state.enemies = state.enemies.filter(en => !en.dead && en.y < CANVAS_HEIGHT + 100);

                state.enemyBullets.forEach(bull => {
                    if (!bull.dead && rectIntersect(bBox, bull)) {
                        if (b.isEnhanced && Date.now() < paddle.nBuffEndTime) {
                            bull.dead = true;
                        }
                    }
                });
            }

            if (state.currentStage === 10 && state.boss403State.active) {
                let bs = state.boss403State;
                let isFaceInvincible = !bs.smokeActive;
                let faceBlocks = state.blocks.filter(bl => bl.part === 'face' && bl.active);

                if (faceBlocks.length > 0) {
                    let minX = Math.min(...faceBlocks.map(bl => bl.baseX + bs.face.xOffset));
                    let maxX = Math.max(...faceBlocks.map(bl => bl.baseX + bs.face.xOffset + bl.w));
                    let minY = Math.min(...faceBlocks.map(bl => bl.baseY + bs.face.yOffset));
                    let maxY = Math.max(...faceBlocks.map(bl => bl.baseY + bs.face.yOffset + bl.h));

                    if (b.ignoredParts && b.ignoredParts.has('face')) {
                        if (b.y > maxY + 15 || b.y < minY - 15 || b.x < minX - 15 || b.x > maxX + 15) {
                            b.ignoredParts.delete('face');
                        }
                    } else if (isFaceInvincible) {
                        if (b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY) {
                            let hasLeft = faceBlocks.some(bl => (bl.baseX + bs.face.xOffset + bl.w <= b.x + 5) && Math.abs((bl.baseY + bs.face.yOffset + bl.h / 2) - b.y) < 30);
                            let hasRight = faceBlocks.some(bl => (bl.baseX + bs.face.xOffset >= b.x - 5) && Math.abs((bl.baseY + bs.face.yOffset + bl.h / 2) - b.y) < 30);
                            let hasTop = faceBlocks.some(bl => (bl.baseY + bs.face.yOffset + bl.h <= b.y + 5) && Math.abs((bl.baseX + bs.face.xOffset + bl.w / 2) - b.x) < 30);
                            let hasBottom = faceBlocks.some(bl => (bl.baseY + bs.face.yOffset >= b.y - 5) && Math.abs((bl.baseX + bs.face.xOffset + bl.w / 2) - b.x) < 30);

                            let enclosedSides = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0) + (hasTop ? 1 : 0) + (hasBottom ? 1 : 0);
                            if (enclosedSides >= 3) {
                                b.ignoredParts = b.ignoredParts || new Set();
                                b.ignoredParts.add('face');
                                if (b.vy < 0) b.vy = Math.abs(b.vy) || 3;
                                if (Math.abs(b.vy) < 2) b.vy = 2;
                            }
                        }
                    }
                }
            }

            for (let bl of state.blocks) {
                if (!bl.active) continue;
                if (bl.part === 'blaster') continue;

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
                let blockX = bl.x;
                let blockY = bl.y;
                if (state.currentStage === 10 && bl.part === 'face') {
                    blockX = bl.baseX + state.boss403State.face.xOffset;
                    blockY = bl.baseY + state.boss403State.face.yOffset;
                }
                let blockR = { x: blockX, y: blockY, w: bl.w, h: bl.h };
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
                    } else if (state.currentStage === 10 && bl.part) {
                        if (bl.part === 'face' && (['WAIT_DROP', 'DROP', 'WAIT_RETURN', 'RETURN'].includes(state.boss403State.face.state) || (b.ignoredParts && b.ignoredParts.has('face')))) {
                            continue;
                        }
                        isInvincible = !state.boss403State.smokeActive; // Boss 403 blocks are vulnerable to balls when smoke is active
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
                        if (state.boss403State.state === 'START_WAIT') {
                            state.boss403State.state = 'EQUIP_TRIGGERED';
                        }
                    }
                    if (!isInvincible) {
                        bl.active = false;
                        if (state.currentStage === 10 && bl.part === 'face') {
                            state.boss403State.face.hp--;
                        }
                        state.score++;
                        playBeep(200);
                    }

                    let overlapLeft = (br.x + br.w) - blockR.x;
                    let overlapRight = (blockR.x + blockR.w) - br.x;
                    let overlapTop = (br.y + br.h) - blockR.y;
                    let overlapBottom = (blockR.y + blockR.h) - br.y;

                    if (!(b.isEnhanced && Date.now() < paddle.nBuffEndTime) || isInvincible) {
                        let prevX = b.x - b.vx;
                        let prevY = b.y - b.vy;

                        let fromLeft = (b.vx > 0) && (prevX + b.size / 2 <= blockR.x + 2);
                        let fromRight = (b.vx < 0) && (prevX - b.size / 2 >= blockR.x + blockR.w - 2);
                        let fromTop = (b.vy > 0) && (prevY + b.size / 2 <= blockR.y + 2);
                        let fromBottom = (b.vy < 0) && (prevY - b.size / 2 >= blockR.y + blockR.h - 2);

                        let hitHorizontal = false;
                        let hitVertical = false;

                        if ((fromLeft || fromRight) && (fromTop || fromBottom)) {
                            let distToX = fromLeft ? (blockR.x - (prevX + b.size / 2)) : ((prevX - b.size / 2) - (blockR.x + blockR.w));
                            let distToY = fromTop ? (blockR.y - (prevY + b.size / 2)) : ((prevY - b.size / 2) - (blockR.y + blockR.h));
                            let tx = Math.abs(b.vx) > 0.001 ? distToX / Math.abs(b.vx) : -Infinity;
                            let ty = Math.abs(b.vy) > 0.001 ? distToY / Math.abs(b.vy) : -Infinity;
                            if (tx >= ty) hitHorizontal = true;
                            else hitVertical = true;
                        } else if (fromLeft || fromRight) {
                            hitHorizontal = true;
                        } else if (fromTop || fromBottom) {
                            hitVertical = true;
                        } else {
                            let overlapLeft = (br.x + br.w) - blockR.x;
                            let overlapRight = (blockR.x + blockR.w) - br.x;
                            let overlapTop = (br.y + br.h) - blockR.y;
                            let overlapBottom = (blockR.y + blockR.h) - br.y;
                            let minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                            if (minOverlap === overlapLeft || minOverlap === overlapRight) hitHorizontal = true;
                            else hitVertical = true;
                        }

                        if (hitHorizontal) {
                            if (b.vx > 0) {
                                b.x = blockR.x - b.size / 2;
                                b.vx = -Math.abs(b.vx);
                            } else {
                                b.x = blockR.x + blockR.w + b.size / 2;
                                b.vx = Math.abs(b.vx);
                            }
                        } else {
                            if (b.vy < 0) {
                                b.y = blockR.y + blockR.h + b.size / 2;
                                b.vy = Math.abs(b.vy);
                            } else {
                                b.y = blockR.y - b.size / 2;
                                b.vy = -Math.abs(b.vy);
                            }
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

                    if (state.currentStage !== 5 && state.currentStage !== 10 && state.blocks.filter(b => b.active).length === 0) {
                        state.gameState = 'GAMECLEAR';
                    }
                    break;
                }
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
            let isYellowItem = item.type !== 'heal' && item.type !== 'nbuff';
            let isBlasterActive = state.currentStage === 10 && state.boss403State && state.boss403State.active && state.blocks.some(b => b.part === 'blaster' && b.active);

            if (isBlasterActive && isYellowItem) {
                item.vy *= 0.95;
                if (Math.abs(item.vy) < 0.05) item.vy = 0;
            } else {
                if (isYellowItem && item.vy === 0) {
                    item.vy = 1.5;
                }
            }

            item.y += item.vy * state.globalSpeedMult;
            let ir = { x: item.x - item.size / 2, y: item.y - item.size / 2, w: item.size, h: item.size };
            let pr = { x: paddle.x, y: paddle.y, w: paddle.w, h: paddle.h };
            if (rectIntersect(ir, pr)) {
                if (isBlasterActive && isYellowItem) {
                    return; // Cannot collect yellow items while blaster is active
                }
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

        if (state.currentStage === 7 || state.currentStage === 10) {
            if (Math.random() < 0.015) {
                let groundY = (state.currentStage === 10) ? (CANVAS_HEIGHT - 30 - 10) : (CANVAS_HEIGHT - 100 - 10);
                state.tumbleweeds.push({
                    x: CANVAS_WIDTH + 50,
                    y: groundY,
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
                let h = 60 + Math.random() * 40;
                state.cacti.push({
                    x: 100 + Math.random() * (CANVAS_WIDTH - 200),
                    y: CANVAS_HEIGHT - 100 - h,
                    h: h
                });
            }
        }

        if (state.currentStage >= 2) {
            if (state.currentStage !== 5 && state.currentStage <= 10) {
                if (stopBalls) return;
                let spawnInterval = state.currentMapData ? state.currentMapData.spawnInterval : 10000;
                let maxEnemies = state.currentMapData ? (state.currentMapData.maxEnemies || 0) : 0;
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
                if (en.dead) return;
                if (!en.actionState) en.actionState = 'IDLE';

                if (en.actionState === 'IDLE') {
                    en.x += en.vx * state.globalSpeedMult;
                    if (en.x - en.w / 2 < 0) {
                        en.x = en.w / 2;
                        en.vx *= -1;
                        if (state.currentStage !== 5 && state.currentStage !== 10) en.y += 20;
                    } else if (en.x + en.w / 2 > CANVAS_WIDTH) {
                        en.x = CANVAS_WIDTH - en.w / 2;
                        en.vx *= -1;
                        if (state.currentStage !== 5 && state.currentStage !== 10) en.y += 20;
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
                            let speed = 1.5 + Math.random() * 1;
                            state.enemyBullets.push({
                                x: bull.x, y: bull.y, w: 16, h: 16,
                                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                                type: 'MUD_SHRAPNEL', char: char, dead: false
                            });
                        });
                    }
                } else if (bull.type === 'MUD_SHRAPNEL') {
                    bull.vy += 0.2;
                    bull.x += bull.vx * state.globalSpeedMult;
                    bull.y += bull.vy * state.globalSpeedMult;
                    if (bull.y > CANVAS_HEIGHT) bull.dead = true;

                } else if (bull.type === '403_COUNTER_RETURN') {
                    bull.x += bull.vx * state.globalSpeedMult;
                    bull.y += bull.vy * state.globalSpeedMult;

                    if (state.currentStage === 10 && state.boss403State.active) {
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

                            // Small shake
                            bs.blasterX += (Math.random() - 0.5) * 20;
                            bs.blasterY += (Math.random() - 0.5) * 20;
                            playBeep(200);

                            if (bs.counterHitCount >= 12 && !bs.counterSuccessTime) {
                                bs.counterSuccessTime = Date.now();
                                bs.faceShakeEndTime = Date.now() + 1000;
                                bs.smokeActive = true;
                                bs.explosionsLeft = 3;
                                bs.nextExplosionTime = Date.now();

                                // Start ball recovery immediately on destruction
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
                    }
                } else if (bull.type === 'LASER') {
                    let elapsed = Date.now() - bull.fireStartTime;
                    let baseW = bull.maxW || 20;
                    if (elapsed >= 500) bull.dead = true;
                    else bull.w = baseW * (1 - elapsed / 500);
                } else {
                    if (bull.type === '403_SAMIDARE_CLUSTER' && bull.sliding) {
                        let step = (bull.speed || 3.5) * state.globalSpeedMult;
                        bull.slideDist = (bull.slideDist || 0) + step;
                        if (bull.slideDist >= (bull.maxSlideDist || 100)) {
                            bull.sliding = false;
                            bull.x = bull.originX + Math.cos(bull.spokeAngle) * bull.maxSlideDist;
                            bull.y = bull.originY + Math.sin(bull.spokeAngle) * bull.maxSlideDist;
                            bull.vx = Math.cos(bull.flyAngle) * bull.speed;
                            bull.vy = Math.sin(bull.flyAngle) * bull.speed;
                        } else {
                            bull.x = bull.originX + Math.cos(bull.spokeAngle) * bull.slideDist;
                            bull.y = bull.originY + Math.sin(bull.spokeAngle) * bull.slideDist;
                        }
                    } else {
                        bull.x += bull.vx * state.globalSpeedMult;
                        bull.y += bull.vy * state.globalSpeedMult;
                    }
                    if (bull.type === '403_SAMIDARE_UP' && bull.y < -100) {
                        bull.dead = true;
                    }
                }

                if (bull.type === '403_SAMIDARE_RAIN' && !bull.exploded && bull.y >= bull.burstY) {
                    bull.exploded = true;
                    bull.dead = true;
                    playBeep(200);
                    let baseAngle = Math.random() * Math.PI * 2;
                    let chars = ['403', 'FOR', 'BID', 'DEN'];
                    let tiltOffset = Math.PI / 4; // 45-degree angle offset for the pinwheel illusion
                    for (let i = 0; i < 8; i++) {
                        let spokeAngle = baseAngle + i * (Math.PI / 4);
                        let flyAngle = spokeAngle + tiltOffset;
                        let char = chars[Math.floor(Math.random() * chars.length)];
                        state.enemyBullets.push({
                            x: bull.x,
                            y: bull.y,
                            originX: bull.x,
                            originY: bull.y,
                            spokeAngle: spokeAngle,
                            flyAngle: flyAngle,
                            drawAngle: flyAngle,
                            slideDist: 0,
                            maxSlideDist: 100,
                            speed: 3.5,
                            w: 16, h: 16,
                            vx: Math.cos(spokeAngle) * 3.5,
                            vy: Math.sin(spokeAngle) * 3.5,
                            sliding: true,
                            type: '403_SAMIDARE_CLUSTER',
                            char: char,
                            dead: false
                        });
                    }
                    return;
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
                    let hitInterval = bull.hitInterval || 100;
                    if (!bull.dead && Date.now() - (bull.lastHitTime || 0) > hitInterval) {
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
                        }
                    }
                } else {
                    let isSamidare = bull.type === '403_SAMIDARE_UP' || bull.type === '403_SAMIDARE_RAIN' || bull.type === '403_SAMIDARE_CLUSTER';
                    if (!paddle.destroyed && (isSamidare || Date.now() > (paddle.invincibleEndTime || 0))) {
                        let nearestX = Math.max(paddle.x, Math.min(bull.x, paddle.x + paddle.w));
                        let nearestY = Math.max(paddle.y, Math.min(bull.y, paddle.y + paddle.h));
                        let dx = bull.x - nearestX;
                        let dy = bull.y - nearestY;
                        isHit = (dx * dx + dy * dy <= hitRadius * hitRadius);
                    }

                    if (isHit) {

                        if (bull.type === '403_COUNTER_BULLET') {
                            bull.type = '403_COUNTER_RETURN';
                            let bs = state.boss403State;
                            let dx = bs.blasterX - bull.x;
                            let dy = bs.blasterY - bull.y;
                            let angle = Math.atan2(dy, dx);
                            bull.vx = Math.cos(angle) * 15;
                            bull.vy = Math.sin(angle) * 15;
                            playBeep(400);
                        } else if (bull.type === 'MUD' || bull.type === 'MUD_SHRAPNEL') {
                            paddle.mudEndTime = Date.now() + 10000;
                            bull.dead = true;
                        } else {
                            if (bull.type.startsWith('403_') && !isSamidare) {
                                if (state.boss403State.barrageHit || (bull.shotId && paddle.lastHitShotId === bull.shotId)) {
                                    bull.dead = true;
                                    return; // skip damage
                                }
                                state.boss403State.barrageHit = true;
                                if (bull.shotId) paddle.lastHitShotId = bull.shotId;
                            }
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
            state.enemyBullets = state.enemyBullets.filter(bull => !bull.dead && bull.y < CANVAS_HEIGHT + 50 && bull.y > -200 && bull.x > -200 && bull.x < CANVAS_WIDTH + 200);
        }

        if (state.currentStage === 5 && state.bossState.active) {
            let face = state.bossState.face;

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

        if (state.currentStage === 10 && state.boss403State.active) {
            let bs = state.boss403State;
            let faceBlocks = state.blocks.filter(b => b.active && b.part === 'face');
            let blasterBlocks = state.blocks.filter(b => b.part === 'blaster');

            let dt = 16.666;

            // Continuous hovering
            if (bs.faceShakeEndTime && Date.now() < bs.faceShakeEndTime) {
                bs.face.xOffset = (Math.random() - 0.5) * 40;
                bs.face.yOffset = 0;
            } else if (bs.phaseShakeEndTime && Date.now() < bs.phaseShakeEndTime) {
                bs.face.xOffset = Math.sin((Date.now() - (bs.phaseShakeEndTime - 1500)) * 0.02) * 25;
                bs.face.yOffset = 0;
            } else if (bs.state === 'CLEAR_SMOKE') {
                bs.face.xOffset = Math.sin((Date.now() - (bs.timer - 1500)) * 0.02) * 25;
                bs.face.yOffset = 0;
            } else if (bs.face.state !== 'DROP' && bs.face.state !== 'RETURN' && bs.face.state !== 'PREP' && bs.face.state !== 'WAIT_RETURN' && bs.face.state !== 'WAIT_DROP') {
                bs.face.xOffset = Math.sin(Date.now() * 0.001) * 7.5; // Reduced from 30
                bs.face.yOffset = Math.sin(Date.now() * 0.002) * 3.75; // Reduced from 15
            }

            // Explosions on counter success (3 times every 250ms)
            if (bs.explosionsLeft > 0 && Date.now() >= bs.nextExplosionTime) {
                bs.explosionsLeft--;
                bs.nextExplosionTime = Date.now() + 250;
                playBeep(100);

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

            if ((bs.phase === 1 && hpRatio <= 0.67) || (bs.phase === 2 && hpRatio <= 0.33)) {
                bs.phase = bs.phase === 1 ? 2 : 3;
                let wasSmoking = bs.smokeActive;
                bs.smokeActive = false;
                state.particles = state.particles.filter(p => p.char !== undefined || !['#6b7280', '#9ca3af', '#4b5563', '#d1d5db', '#374151'].includes(p.color));

                // Cancel in-progress face drop attack immediately
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
                playBeep(200);
            }

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

            if (hpRatio <= 0.05 && bs.state !== 'DYING' && bs.state !== 'DEAD') {
                bs.state = 'DYING';
                bs.timer = Date.now() + 4000;
                state.balls.forEach(b => { b.vx = 0; b.vy = 0; b.isEnhanced = false; });
                playBeep(100);
            }

            if (bs.state === 'DYING') {
                faceBlocks.forEach(b => {
                    b.y += (Math.random() - 0.5) * 5;
                    b.x += (Math.random() - 0.5) * 5;
                });
                if (Math.random() < 0.2) {
                    let b = faceBlocks[Math.floor(Math.random() * faceBlocks.length)];
                    if (b) {
                        for (let i = 0; i < 5; i++) {
                            state.particles.push({
                                x: b.x + b.w / 2, y: b.y + b.h / 2,
                                vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                                size: Math.random() * 5 + 2, life: 1.0, decay: Math.random() * 0.02 + 0.01,
                                color: currentTheme === 'dark' ? '#ef4444' : '#b91c1c'
                            });
                        }
                        b.active = false;
                        playBeep(100);
                    }
                }
                if (Date.now() > bs.timer) {
                    bs.state = 'DEAD';
                    bs.timer = Date.now() + 4000;
                    state.blocks.forEach(b => { if (b.part === 'face' || b.part === 'blaster') b.active = false; });

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
            } else if (bs.state === 'DEAD') {
                if (Date.now() > bs.timer) {
                    state.gameState = 'GAMECLEAR';
                }
            } else {

                if (bs.state === 'EQUIP_TRIGGERED') {
                    bs.smokeActive = false; // Smoke stops when boss next equips/readies blaster
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
                    bs.blasterAngle = Math.PI; // point down initially
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
                        // For the gathering spiral animation
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
                        bs.blasterTargetAngle = Math.PI; // point down
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
                    let ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic

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
                    // Push out any balls trapped in face blocks/cavities
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
                }
                else if (bs.state === 'WAITING') {
                    if (Date.now() > bs.timer) {
                        if (paddle.destroyed || state.gameState !== 'PLAYING') {
                            bs.timer = Date.now() + 500;
                        } else {
                            bs.state = 'EQUIP_TRIGGERED';
                        }
                    }
                }
                else if (bs.state === 'EQUIPPING') {
                    state.balls.forEach(b => { b.vx *= 0.95; b.vy *= 0.95; });

                    if (Date.now() > bs.timer) {
                        if (bs.equipDelay) {
                            bs.equipDelay = false;
                            bs.state = 'EQUIPPED_WAIT';
                            bs.timer = Date.now() + 1000;
                            return;
                        }

                        if (bs.patternSeq === 7) {
                            bs.state = 'AIMING_A'; // Counter window aiming
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
                }
                else if (bs.state === 'EQUIPPED_WAIT') {
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
                }
                else if (bs.state === 'SAMIDARE_PREP') {
                    let isPurple = Math.floor(Date.now() / 500) % 2 === 0;
                    blasterBlocks.forEach(b => { b.color = isPurple ? '#a855f7' : undefined; });

                    if (Date.now() > bs.timer) {
                        bs.state = 'SAMIDARE_SHOOT_UP';
                        bs.timer = Date.now() + 2000;
                        bs.lastSamidareShot = 0;
                    }
                }
                else if (bs.state === 'SAMIDARE_SHOOT_UP') {
                    let isPurple = Math.floor(Date.now() / 250) % 2 === 0;
                    blasterBlocks.forEach(b => { b.color = isPurple ? '#a855f7' : undefined; });

                    if (Date.now() - (bs.lastSamidareShot || 0) >= 50) {
                        bs.lastSamidareShot = Date.now();
                        let targetDx = (CANVAS_WIDTH / 2) - bs.nozzleX;
                        let targetDy = -150 - bs.nozzleY;
                        let baseAngle = Math.atan2(targetDy, targetDx);
                        let aimError = (Math.random() - 0.5) * 0.3 * Math.PI; // +-15%
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
                        playBeep(300);
                    }

                    if (Date.now() > bs.timer) {
                        blasterBlocks.forEach(b => { b.color = undefined; });
                        bs.state = 'SAMIDARE_WAIT_RAIN';
                        bs.timer = Date.now() + 1000;
                    }
                }
                else if (bs.state === 'SAMIDARE_WAIT_RAIN') {
                    if (Date.now() > bs.timer) {
                        bs.state = 'SAMIDARE_RAINING';
                        bs.samidareRainSpawned = 0;
                        bs.nextRainSpawnTime = Date.now();
                        bs.samidareFinishTimer = null;
                    }
                }
                else if (bs.state === 'SAMIDARE_RAINING') {
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
                        playBeep(250);
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
                }
                else if (bs.state === 'PHASE2_LASER_AIM') {
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
                        playBeep(200);

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
                }
                else if (bs.state === 'PHASE2_LASER_POST_WAIT') {
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
                }
                else if (bs.state === 'PADDLE_DESTROYED_LASER_BALLS') {
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
                            playBeep(400);

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
                }
                else if (bs.state === 'POST_RESPAWN_WAIT') {
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
                }
                else if (bs.state === 'AIMING_A') {
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
                }
                else if (bs.state === 'SHOOTING_A') {
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
                }
                else if (bs.state === 'AIMING_B') {
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
                }
                else if (bs.state === 'SHOOTING_B') {
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
                }
                else if (bs.state === 'COUNTER_WINDOW') {
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
                        // Counter Fail
                        bs.state = 'COUNTER_FAIL_PREP';
                        bs.timer = Date.now() + 1000;
                        bs.patternSeq = 0;
                        bs.failStartAngle = bs.blasterAngle;
                        bs.failStartX = bs.blasterX;
                        bs.failStartY = bs.blasterY;
                        bs.blasterHitPaddle = false;
                    }
                }
                else if (bs.state === 'COUNTER_FAIL_PREP') {
                    // Blaster rotates 1 rotation, moves slightly away from player, trembles, flashes red
                    let progress = 1 - (bs.timer - Date.now()) / 1000;
                    if (progress < 0) progress = 0; if (progress > 1) progress = 1;

                    bs.blasterAngle = bs.failStartAngle + progress * Math.PI * 2;
                    let awayDx = bs.failStartX - (paddle.x + paddle.w / 2);
                    let awayDy = bs.failStartY - paddle.y;
                    let len = Math.sqrt(awayDx * awayDx + awayDy * awayDy) || 1;
                    bs.blasterX = bs.failStartX + (awayDx / len) * (progress * 50);
                    bs.blasterY = bs.failStartY + (awayDy / len) * (progress * 50);

                    // Tremble
                    bs.blasterX += (Math.random() - 0.5) * 5;
                    bs.blasterY += (Math.random() - 0.5) * 5;

                    if (Date.now() > bs.timer) {
                        bs.state = 'COUNTER_FAIL_PREP_WAIT';
                        bs.timer = Date.now() + 1000;
                        bs.throwTargetX = paddle.x + paddle.w / 2;
                        bs.throwTargetY = paddle.y;
                    }
                }
                else if (bs.state === 'COUNTER_FAIL_PREP_WAIT') {
                    if (Date.now() > bs.timer) {
                        bs.state = 'THROW_BLASTER';
                        let dx = bs.throwTargetX - bs.blasterX;
                        let dy = bs.throwTargetY - bs.blasterY;
                        let len = Math.sqrt(dx * dx + dy * dy) || 1;
                        bs.throwVx = (dx / len) * 20;
                        bs.throwVy = (dy / len) * 20;
                    }
                }
                else if (bs.state === 'THROW_BLASTER') {
                    bs.blasterX += bs.throwVx;
                    bs.blasterY += bs.throwVy;
                    bs.blasterAngle += 0.5; // rapid spin

                    // Hit check with paddle
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

                    // Check if offscreen
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
                }
                else if (bs.state === 'STUNNED') {
                    // Face is vulnerable
                    if (Date.now() > bs.timer) {
                        bs.state = 'TELEGRAPH_SUMMON';
                        bs.timer = Date.now() + 1500;
                        bs.counterSuccessTime = 0;
                        bs.counterHitCount = 0;
                    }
                }
                else if (bs.state === 'TELEGRAPH_SUMMON') {
                    bs.face.yOffset = Math.sin(Date.now() / 50) * 10;
                    if (Date.now() > bs.timer) {
                        bs.state = 'SUMMONING';
                        bs.timer = Date.now() + 2000;
                        bs.face.yOffset = 0;
                    }
                }

                // Check counter success globally for these states
                if (['COUNTER_WINDOW', 'COUNTER_FAIL_PREP', 'COUNTER_FAIL_PREP_WAIT', 'THROW_BLASTER'].includes(bs.state)) {
                    if (bs.counterSuccessTime && Date.now() - bs.counterSuccessTime > 750) {
                        // Counter Success
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
                }

                else if (bs.state === 'SUMMONING') {
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
                }
                else if (bs.state === 'FACE_ATTACK') {
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
                                let faceBlocks = state.blocks.filter(b => b.part === 'face' && b.active);
                                for (let b of faceBlocks) {
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

                                // Spawn sand dust particles
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

                                // Spawn arc bullets
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
