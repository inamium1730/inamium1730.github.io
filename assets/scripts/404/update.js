import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants/maps.js';
import { state } from './state.js';
import { playBeep } from './audio.js';
import { currentTheme } from './theme.js';
import { rectIntersect, getAutoAimVelocity, getNeededHealChar, transferItem } from './utils.js';
import { spawnBall, spawnPaddleParticles } from './entities.js';
import { updateBoss5, handleBoss5BallCollision } from './bosses/boss5.js';
import { updateBoss10, handleBoss10BallCollision, handleBoss10CounterReturnHit } from './bosses/boss10.js';

// 1. Paddle update logic
const updatePaddle = () => {
    const paddle = state.paddle;
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
        const center = paddle.x + paddle.w / 2;
        paddle.x = center - newW / 2;
        paddle.w = newW;
        paddle.text = newText;
    }

    let spd = 8 * state.globalSpeedMult;
    if (Date.now() < paddle.mudEndTime) spd *= 0.5;

    if (!paddle.destroyed) {
        if (state.keys.left) paddle.x -= spd;
        if (state.keys.right) paddle.x += spd;
    }

    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.w > CANVAS_WIDTH) paddle.x = CANVAS_WIDTH - paddle.w;
};

// 2. Particles update logic
const updateParticles = () => {
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
};

// 3. Ball-Paddle collision helper
const handleBallPaddleBounce = (b) => {
    const paddle = state.paddle;
    b.y = paddle.y - b.size / 2;
    const currentBaseSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);

    let hitFactor = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    hitFactor = Math.max(-1, Math.min(1, hitFactor));
    const maxVx = currentBaseSpeed * 0.85;

    if (Date.now() < paddle.nBuffEndTime) {
        b.isEnhanced = true;
        const normalVx = hitFactor * maxVx;
        const normalVy = -Math.sqrt(currentBaseSpeed * currentBaseSpeed - normalVx * normalVx);
        const aimedVelocity = getAutoAimVelocity(b.x, b.y, normalVx, normalVy, currentBaseSpeed);
        b.vx = aimedVelocity.vx;
        b.vy = aimedVelocity.vy;
    } else {
        b.isEnhanced = false;
        b.vx = hitFactor * maxVx;
        b.vy = -Math.sqrt(currentBaseSpeed * currentBaseSpeed - b.vx * b.vx);
    }
    state.globalSpeedMult += 0.01 / state.balls.length;
    playBeep(800);
};

// 4. Ball physics & collisions update
const updateBalls = (stopBalls) => {
    const paddle = state.paddle;

    state.balls.forEach(b => {
        if (stopBalls) return;

        const currentBaseSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const minVy = currentBaseSpeed * 0.25;
        if (Math.abs(b.vy) < minVy) {
            b.vy = b.vy >= 0 ? minVy : -minVy;
            const newVx = Math.sqrt(currentBaseSpeed * currentBaseSpeed - b.vy * b.vy);
            b.vx = b.vx >= 0 ? newVx : -newVx;
        }

        let speedMult = 1.0;
        if (b.isDecelerating) {
            const progress = (Date.now() - b.decelerateStartTime) / 2000;
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
            const progress = (Date.now() - b.recoveryStartTime) / 2000;
            if (progress >= 1) {
                b.isRecovering = false;
            } else {
                speedMult = progress;
            }
        }

        b.x += b.vx * state.globalSpeedMult * speedMult;
        b.y += b.vy * state.globalSpeedMult * speedMult;

        // Wall collisions
        let wallHit = false;
        if (b.x - b.size / 2 < 0) { b.x = b.size / 2; b.vx *= -1; wallHit = true; }
        if (b.x + b.size / 2 > CANVAS_WIDTH) { b.x = CANVAS_WIDTH - b.size / 2; b.vx *= -1; wallHit = true; }
        if (b.y - b.size / 2 < 0) { b.y = b.size / 2; b.vy *= -1; wallHit = true; }
        if (wallHit) playBeep(200);

        // Paddle hit check
        if (!paddle.destroyed && b.vy > 0 && b.y + b.size / 2 > paddle.y && b.y - b.size / 2 < paddle.y + paddle.h && b.x > paddle.x && b.x < paddle.x + paddle.w) {
            handleBallPaddleBounce(b);
        }

        // Boss ignore parts maintenance
        if (state.currentStage === 5 && state.bossState.active) {
            if (!b.ignoredParts) b.ignoredParts = new Set();
            const br = { x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size };

            ['leftHand', 'rightHand'].forEach(part => {
                const pState = state.bossState[part];
                if (pState.state === 'LOCK' || pState.state === 'PUNCH' || pState.state === 'GROUNDED') {
                    b.ignoredParts.add(part);
                } else {
                    let intersecting = false;
                    const partBlocks = state.blocks.filter(blk => blk.active && blk.part === part);
                    for (const blk of partBlocks) {
                        const blockR = { x: blk.x, y: blk.y, w: blk.w, h: blk.h };
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
            const br = { x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size };
            const bs = state.boss403State;

            if (['WAIT_DROP', 'DROP', 'WAIT_RETURN', 'RETURN'].includes(bs.face.state)) {
                b.ignoredParts.add('face');
            } else {
                let intersecting = false;
                const faceBlocks = state.blocks.filter(blk => blk.active && blk.part === 'face');
                for (const blk of faceBlocks) {
                    const bx = blk.baseX + bs.face.xOffset;
                    const by = blk.baseY + bs.face.yOffset;
                    const blockR = { x: bx, y: by, w: blk.w, h: blk.h };
                    if (rectIntersect(br, blockR)) {
                        intersecting = true;
                        break;
                    }
                }
                if (!intersecting) {
                    b.ignoredParts.delete('face');
                }
            }

            // Cavity trap check for boss 403 face
            const isFaceInvincible = !bs.smokeActive;
            const faceBlocks = state.blocks.filter(bl => bl.part === 'face' && bl.active);
            if (faceBlocks.length > 0) {
                const minX = Math.min(...faceBlocks.map(bl => bl.baseX + bs.face.xOffset));
                const maxX = Math.max(...faceBlocks.map(bl => bl.baseX + bs.face.xOffset + bl.w));
                const minY = Math.min(...faceBlocks.map(bl => bl.baseY + bs.face.yOffset));
                const maxY = Math.max(...faceBlocks.map(bl => bl.baseY + bs.face.yOffset + bl.h));

                if (b.ignoredParts && b.ignoredParts.has('face')) {
                    if (b.y > maxY + 15 || b.y < minY - 15 || b.x < minX - 15 || b.x > maxX + 15) {
                        b.ignoredParts.delete('face');
                    }
                } else if (isFaceInvincible) {
                    if (b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY) {
                        const hasLeft = faceBlocks.some(bl => (bl.baseX + bs.face.xOffset + bl.w <= b.x + 5) && Math.abs((bl.baseY + bs.face.yOffset + bl.h / 2) - b.y) < 30);
                        const hasRight = faceBlocks.some(bl => (bl.baseX + bs.face.xOffset >= b.x - 5) && Math.abs((bl.baseY + bs.face.yOffset + bl.h / 2) - b.y) < 30);
                        const hasTop = faceBlocks.some(bl => (bl.baseY + bs.face.yOffset + bl.h <= b.y + 5) && Math.abs((bl.baseX + bs.face.xOffset + bl.w / 2) - b.x) < 30);
                        const hasBottom = faceBlocks.some(bl => (bl.baseY + bs.face.yOffset >= b.y - 5) && Math.abs((bl.baseX + bs.face.xOffset + bl.w / 2) - b.x) < 30);

                        const enclosedSides = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0) + (hasTop ? 1 : 0) + (hasBottom ? 1 : 0);
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

        // Enemy & Bullet collisions with Ball
        const bBox = { x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size };

        if (state.currentStage >= 2) {
            state.enemies.forEach(en => {
                const enBox = { x: en.x - en.w / 2, y: en.y - en.h / 2, w: en.w, h: en.h };
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
                        const isPhase3 = state.currentStage === 5 && state.bossState.active && state.bossState.leftHand.state === 'DEAD' && state.bossState.rightHand.state === 'DEAD';
                        let maxEnemies = state.currentMapData ? (state.currentMapData.maxEnemies || 2) : 2;
                        if (state.currentStage === 5) maxEnemies = isPhase3 ? 4 : 2;
                        if (Math.random() < 2 / maxEnemies) {
                            const itemChar = Math.random() < 0.5 ? '4' : '0';
                            const needed = getNeededHealChar();
                            let type = 'multiball';
                            let color = '#facc15';
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

        // Block collisions with Ball
        for (const bl of state.blocks) {
            if (!bl.active) continue;
            if (bl.part === 'blaster') continue;

            let blockX = bl.x;
            let blockY = bl.y;
            if (state.currentStage === 10 && bl.part === 'face') {
                blockX = bl.baseX + state.boss403State.face.xOffset;
                blockY = bl.baseY + state.boss403State.face.yOffset;
            }
            const br = { x: b.x - b.size / 2, y: b.y - b.size / 2, w: b.size, h: b.size };
            const blockR = { x: blockX, y: blockY, w: bl.w, h: bl.h };

            if (rectIntersect(br, blockR)) {
                let isInvincible = false;

                if (state.currentStage === 5 && bl.part) {
                    const res = handleBoss5BallCollision(b, bl);
                    if (!res.hit) continue;
                    isInvincible = res.invincible;
                } else if (state.currentStage === 10 && bl.part) {
                    const res = handleBoss10BallCollision(b, bl);
                    if (!res.hit) continue;
                    isInvincible = res.invincible;
                } else {
                    bl.active = false;
                    state.score++;
                    playBeep(200);
                }

                // Bounce direction calculation
                if (!(b.isEnhanced && Date.now() < paddle.nBuffEndTime) || isInvincible) {
                    const prevX = b.x - b.vx;
                    const prevY = b.y - b.vy;

                    const fromLeft = (b.vx > 0) && (prevX + b.size / 2 <= blockR.x + 2);
                    const fromRight = (b.vx < 0) && (prevX - b.size / 2 >= blockR.x + blockR.w - 2);
                    const fromTop = (b.vy > 0) && (prevY + b.size / 2 <= blockR.y + 2);
                    const fromBottom = (b.vy < 0) && (prevY - b.size / 2 >= blockR.y + blockR.h - 2);

                    let hitHorizontal = false;

                    if ((fromLeft || fromRight) && (fromTop || fromBottom)) {
                        const distToX = fromLeft ? (blockR.x - (prevX + b.size / 2)) : ((prevX - b.size / 2) - (blockR.x + blockR.w));
                        const distToY = fromTop ? (blockR.y - (prevY + b.size / 2)) : ((prevY - b.size / 2) - (blockR.y + blockR.h));
                        const tx = Math.abs(b.vx) > 0.001 ? distToX / Math.abs(b.vx) : -Infinity;
                        const ty = Math.abs(b.vy) > 0.001 ? distToY / Math.abs(b.vy) : -Infinity;
                        hitHorizontal = tx >= ty;
                    } else if (fromLeft || fromRight) {
                        hitHorizontal = true;
                    } else if (fromTop || fromBottom) {
                        hitHorizontal = false;
                    } else {
                        const overlapLeft = (br.x + br.w) - blockR.x;
                        const overlapRight = (blockR.x + blockR.w) - br.x;
                        const overlapTop = (br.y + br.h) - blockR.y;
                        const overlapBottom = (blockR.y + blockR.h) - br.y;
                        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                        hitHorizontal = (minOverlap === overlapLeft || minOverlap === overlapRight);
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

                // Item drop handling
                if (bl.itemType && !isInvincible) {
                    const droppedItemType = bl.itemType;
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
                        const req = parseInt(droppedItemType.split('_')[1], 10);
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

                // Regular stage clear check
                if (state.currentStage !== 5 && state.currentStage !== 10 && state.blocks.filter(b => b.active).length === 0) {
                    state.gameState = 'GAMECLEAR';
                }
                break;
            }
        }

        // Catch paddle corner hit edge case
        if (!paddle.destroyed && b.vy > 0 && b.y > paddle.y - b.size && b.y < paddle.y + paddle.h && b.x > paddle.x - b.size && b.x < paddle.x + paddle.w + b.size) {
            handleBallPaddleBounce(b);
        }
    });

    state.balls = state.balls.filter(b => b.y < CANVAS_HEIGHT + 50);
};

// 5. Items update logic
const updateItems = () => {
    const paddle = state.paddle;
    const isBlasterActive = state.currentStage === 10 && state.boss403State?.active && state.blocks.some(b => b.part === 'blaster' && b.active);

    state.items.forEach(item => {
        const isYellowItem = item.type !== 'heal' && item.type !== 'nbuff';

        if (isBlasterActive && isYellowItem) {
            item.vy *= 0.95;
            if (Math.abs(item.vy) < 0.05) item.vy = 0;
        } else {
            if (isYellowItem && item.vy === 0) {
                item.vy = 1.5;
            }
        }

        item.y += item.vy * state.globalSpeedMult;
        const ir = { x: item.x - item.size / 2, y: item.y - item.size / 2, w: item.size, h: item.size };
        const pr = { x: paddle.x, y: paddle.y, w: paddle.w, h: paddle.h };
        if (rectIntersect(ir, pr)) {
            if (isBlasterActive && isYellowItem) return;

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
                    const currentBaseSpeed = Math.sqrt(vx * vx + vy * vy);
                    const aimedVelocity = getAutoAimVelocity(item.x, paddle.y - 20, vx, vy, currentBaseSpeed);
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
};

// 6. Scenery update logic (Tumbleweeds, Cacti, Cars & Airplanes)
const updateScenery = () => {
    if (state.currentStage === 7 || state.currentStage === 10) {
        if (Math.random() < 0.015) {
            const groundY = (state.currentStage === 10) ? (CANVAS_HEIGHT - 30 - 10) : (CANVAS_HEIGHT - 100 - 10);
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

    if (state.currentStage >= 8 && state.currentStage <= 10 && state.cacti.length === 0) {
        for (let i = 0; i < 3; i++) {
            const h = 60 + Math.random() * 40;
            state.cacti.push({
                x: 100 + Math.random() * (CANVAS_WIDTH - 200),
                y: CANVAS_HEIGHT - 100 - h,
                h: h
            });
        }
    }

    // Stages 12-14: Cars on road (Two-way traffic)
    if (state.currentStage >= 12 && state.currentStage <= 14) {
        // Stage 12 is rural/quiet with very rare cars; stages 13-14 gradually have slightly more
        const spawnProb = state.currentStage === 12 ? 0.0018 : (state.currentStage === 13 ? 0.0035 : 0.0055);
        const maxCars = state.currentStage === 12 ? 2 : (state.currentStage === 13 ? 3 : 4);

        if (Math.random() < spawnProb && state.cars.length < maxCars) {
            const dir = Math.random() < 0.5 ? -1 : 1; // -1: westbound (upper lane), 1: eastbound (lower lane)
            const isTruck = Math.random() < 0.35;
            const speed = (1.8 + Math.random() * 1.4) * dir;

            // Subtle, desaturated palette blending seamlessly into background
            const darkPalette = ['#334155', '#293548', '#382e3e', '#2b3a36', '#3b2f2f', '#475569', '#1e293b'];
            const lightPalette = ['#64748b', '#5c6970', '#6e5d53', '#5a6b5c', '#5f6575', '#4b5563', '#78716c'];
            const chosenPalette = currentTheme === 'dark' ? darkPalette : lightPalette;
            const color = chosenPalette[Math.floor(Math.random() * chosenPalette.length)];

            state.cars.push({
                x: dir === -1 ? CANVAS_WIDTH + 60 : -60,
                y: dir === -1 ? CANVAS_HEIGHT - 32 : CANVAS_HEIGHT - 17,
                vx: speed,
                dir: dir,
                type: isTruck ? 'truck' : 'sedan',
                color: color
            });
        }
    }
    state.cars.forEach(car => {
        car.x += car.vx * state.globalSpeedMult;
    });
    state.cars = state.cars.filter(car => car.dir === -1 ? car.x > -100 : car.x < CANVAS_WIDTH + 100);

    // Stage 14: Airplanes in sky
    if (state.currentStage === 14) {
        if (Math.random() < 0.003 && state.airplanes.length < 1) {
            state.airplanes.push({
                x: -100,
                y: 50 + Math.random() * 50,
                vx: 0.6 + Math.random() * 0.3
            });
        }
    }
    state.airplanes.forEach(plane => {
        plane.x += plane.vx * state.globalSpeedMult;
    });
    state.airplanes = state.airplanes.filter(plane => plane.x < CANVAS_WIDTH + 100);
};

// 7. Regular Enemies update logic
const updateEnemies = (stopBalls) => {
    if (state.currentStage < 2) return;
    const paddle = state.paddle;

    // Enemy spawn (stages 2-4, 6-9, 11-14)
    if (state.currentStage !== 5 && state.currentStage !== 10 && state.currentStage <= 14) {
        if (stopBalls) return;
        const spawnInterval = state.currentMapData ? state.currentMapData.spawnInterval : 10000;
        const maxEnemies = state.currentMapData ? (state.currentMapData.maxEnemies || 0) : 0;
        if (Date.now() - state.lastEnemySpawnTime > spawnInterval && state.enemies.length < maxEnemies) {
            state.enemySpawnCount++;

            const possibleEnemies = Object.keys(state.enemiesData).filter(enType => {
                const data = state.enemiesData[enType];
                return data.stages && data.stages.includes(state.currentStage);
            });

            let enType = 'NOT';
            if (possibleEnemies.length > 0) {
                const pool = [];
                const mapName = state.currentMapData ? state.currentMapData.name : '';
                possibleEnemies.forEach(en => {
                    const weight = (en === mapName) ? 2 : 1;
                    for (let i = 0; i < weight; i++) pool.push(en);
                });
                enType = pool[Math.floor(Math.random() * pool.length)];
            }

            const enData = state.enemiesData[enType] || { name: 'NOT' };
            const enW = enData.name.length * 32;
            const enHp = enData.name.length;

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

    // Enemy movement & attack state machine
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

        const enData = state.enemiesData[en.type] || { attackInterval: [3000, 5000] };
        const intervalDiff = enData.attackInterval[1] - enData.attackInterval[0];
        const shootInterval = enData.attackInterval[0] + Math.random() * intervalDiff;

        if (en.actionState === 'IDLE') {
            if (Date.now() - en.lastShootTime > shootInterval) {
                if (en.type === 'DENIED' || en.type === 'ACCESS') {
                    en.actionState = 'AIMING';
                    en.actionStartTime = Date.now();
                    en.aimTargetX = (en.type === 'ACCESS') ? (paddle.x + paddle.w / 2) : en.x;
                } else if (en.type === 'BUSY') {
                    state.enemyBullets.push({
                        x: en.x, y: en.y + 20, w: 16, h: 24,
                        vx: 0, vy: 1.15,
                        type: 'BUSY_ROCKET', dead: false
                    });
                    en.lastShootTime = Date.now();
                } else if (en.type === 'SERVICE') {
                    const targetX = paddle.x + paddle.w / 2;
                    state.enemyBullets.push({
                        x: en.x, y: en.y + 20, w: 16, h: 24,
                        vx: 0, vy: 0.165,
                        targetX: targetX,
                        homingRate: 0.33 + Math.random() * 0.34,
                        type: 'SERVICE_PACKET', dead: false
                    });
                    en.lastShootTime = Date.now();
                } else if (en.type === 'UNAVAILABLE') {
                    state.enemyBullets.push({
                        x: en.x, y: en.y + 20, w: 20, h: 28,
                        vx: 0, vy: 0.33,
                        type: 'UNAVAILABLE_ROCKET', dead: false
                    });
                    en.lastShootTime = Date.now();
                } else {
                    if (en.type === 'ERROR') {
                        state.enemyBullets.push({
                            x: en.x, y: en.y + 20, startY: en.y + 20,
                            w: 16, h: 48, vx: 0, vy: 2,
                            type: 'ERROR_BULLET', dead: false, exploded: false
                        });
                    } else if (en.type === 'FOUND') {
                        const targetX = paddle.x + paddle.w / 2;
                        const targetY = paddle.y + paddle.h / 2;
                        const dx = targetX - en.x;
                        const dy = targetY - (en.y + 20);
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const speed = 4;
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
};

// Helper to spawn large visual rocket explosion particles
const spawnRocketExplosion = (x, y) => {
    const expColors = ['#ef4444', '#f97316', '#facc15', '#fef08a', '#ffffff'];
    for (let i = 0; i < 45; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 9 + 2;
        state.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 8 + 4,
            color: expColors[Math.floor(Math.random() * expColors.length)],
            life: 0.9,
            maxLife: 0.9,
            decay: 0.025
        });
    }
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const speed = 4 + Math.random() * 2;
        state.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: Math.random() * 6 + 4,
            color: currentTheme === 'dark' ? '#64748b' : '#9ca3af',
            life: 0.7,
            maxLife: 0.7,
            decay: 0.03
        });
    }
};

// 8. Enemy Bullets update & paddle hit checks
const updateEnemyBullets = () => {
    const paddle = state.paddle;
    const currentBullets = [...state.enemyBullets];

    currentBullets.forEach(bull => {
        if (bull.dead) return;

        if (bull.type === 'MUD') {
            bull.vy += 0.2;
            bull.x += bull.vx * state.globalSpeedMult;
            bull.y += bull.vy * state.globalSpeedMult;

            if (bull.y >= paddle.y) {
                bull.dead = true;
                ['m', 'u', 'd'].forEach((char, idx) => {
                    const angle = -Math.PI / 2 + (idx - 1) * 0.5;
                    const speed = 1.5 + Math.random() * 1;
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
        } else if (bull.type === 'BUSY_ROCKET') {
            // Constant speed rocket
            bull.y += bull.vy * state.globalSpeedMult;

            // Rocket thruster smoke particles
            if (Math.random() < 0.7) {
                state.particles.push({
                    x: bull.x + (Math.random() - 0.5) * 6,
                    y: bull.y - 10,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: -1.5 - Math.random() * 1.5,
                    size: Math.random() * 4 + 3,
                    color: '#9ca3af',
                    life: 0.5,
                    maxLife: 0.5,
                    decay: 0.05
                });
            }
            if (bull.y > CANVAS_HEIGHT + 50) bull.dead = true;
        } else if (bull.type === 'SERVICE_PACKET') {
            bull.vy += 0.04 * state.globalSpeedMult;
            const aimX = (bull.targetX !== undefined) ? bull.targetX : (paddle.x + paddle.w / 2);
            const dx = aimX - bull.x;
            if (Math.abs(dx) > 4) {
                bull.vx = (bull.vx || 0) + (dx > 0 ? 0.06 : -0.06) * (bull.homingRate || 0.5) * state.globalSpeedMult;
            }
            bull.vx *= 0.97;
            bull.x += bull.vx * state.globalSpeedMult;
            bull.y += bull.vy * state.globalSpeedMult;

            if (Math.random() < 0.5) {
                state.particles.push({
                    x: bull.x + (Math.random() - 0.5) * 4,
                    y: bull.y - 8,
                    vx: (Math.random() - 0.5) * 1.0,
                    vy: -1.0 - Math.random() * 1.0,
                    size: Math.random() * 3 + 2,
                    color: Math.random() < 0.4 ? '#ef4444' : '#9ca3af',
                    life: 0.4,
                    maxLife: 0.4,
                    decay: 0.06
                });
            }
            if (bull.y > CANVAS_HEIGHT + 50) bull.dead = true;
        } else if (bull.type === 'UNAVAILABLE_ROCKET') {
            bull.vy += 0.05 * state.globalSpeedMult;
            bull.y += bull.vy * state.globalSpeedMult;

            if (Math.random() < 0.8) {
                state.particles.push({
                    x: bull.x + (Math.random() - 0.5) * 8,
                    y: bull.y - 12,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -2 - Math.random() * 2,
                    size: Math.random() * 5 + 4,
                    color: Math.random() < 0.5 ? '#f97316' : '#9ca3af',
                    life: 0.6,
                    maxLife: 0.6,
                    decay: 0.05
                });
            }

            // Check direct hit with paddle
            const hitPaddle = !paddle.destroyed && (bull.x >= paddle.x - 10 && bull.x <= paddle.x + paddle.w + 10 && bull.y >= paddle.y - 15 && bull.y <= paddle.y + paddle.h + 15);
            if (hitPaddle) {
                bull.dead = true;
                paddle.destroyed = true;
                spawnPaddleParticles();
                spawnRocketExplosion(bull.x, bull.y);
            } else if (bull.y >= paddle.y) {
                // Explode at paddle height into shrapnel
                bull.dead = true;
                spawnRocketExplosion(bull.x, bull.y);

                // Scatter 'b', 'o', 'm' shrapnel (1 damage each on paddle collision)
                ['b', 'o', 'm'].forEach((char, idx) => {
                    const angle = -Math.PI / 2 + (idx - 1) * 0.6 + (Math.random() - 0.5) * 0.2;
                    const speed = 3.5 + Math.random() * 1.5;
                    state.enemyBullets.push({
                        x: bull.x,
                        y: bull.y,
                        w: 16,
                        h: 16,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        type: 'BOM_SHRAPNEL',
                        char: char,
                        dead: false
                    });
                });
            }
        } else if (bull.type === 'BOM_SHRAPNEL') {
            bull.vy += 0.2 * state.globalSpeedMult;
            bull.x += bull.vx * state.globalSpeedMult;
            bull.y += bull.vy * state.globalSpeedMult;
            if (bull.y > CANVAS_HEIGHT) bull.dead = true;
        } else if (bull.type === '403_COUNTER_RETURN') {
            bull.x += bull.vx * state.globalSpeedMult;
            bull.y += bull.vy * state.globalSpeedMult;

            if (state.currentStage === 10 && state.boss403State.active) {
                handleBoss10CounterReturnHit(bull);
            }
        } else if (bull.type === 'LASER') {
            const elapsed = Date.now() - bull.fireStartTime;
            const baseW = bull.maxW || 20;
            if (elapsed >= 500) bull.dead = true;
            else bull.w = baseW * (1 - elapsed / 500);
        } else {
            if (bull.type === '403_SAMIDARE_CLUSTER' && bull.sliding) {
                const step = (bull.speed || 3.5) * state.globalSpeedMult;
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

        // Burst & shrapnel mechanics
        if (bull.type === '403_SAMIDARE_RAIN' && !bull.exploded && bull.y >= bull.burstY) {
            bull.exploded = true;
            bull.dead = true;
            const baseAngle = Math.random() * Math.PI * 2;
            const chars = ['403', 'FOR', 'BID', 'DEN'];
            const tiltOffset = Math.PI / 4;
            for (let i = 0; i < 8; i++) {
                const spokeAngle = baseAngle + i * (Math.PI / 4);
                const flyAngle = spokeAngle + tiltOffset;
                const char = chars[Math.floor(Math.random() * chars.length)];
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
            [0, 45, 90, 135, 180, 225, 270, 315].forEach(deg => {
                const rad = deg * Math.PI / 180;
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
            const dx = bull.x - bull.startX;
            const dy = bull.y - bull.startY;
            if (dx * dx + dy * dy >= 200 * 200) {
                bull.dead = true;
                const outText = Math.random() < 0.5 ? '404' : 'NOT';
                [0, 45, 90, 135, 180, 225, 270, 315].forEach(deg => {
                    const rad = deg * Math.PI / 180;
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

        // Paddle hit check
        const hitRadius = 10;
        let isHit = false;

        if (bull.type === 'LASER') {
            const hitInterval = bull.hitInterval || 100;
            if (!bull.dead && Date.now() - (bull.lastHitTime || 0) > hitInterval) {
                const t = (paddle.y - bull.y) / (CANVAS_HEIGHT - bull.y);
                const laserXAtPaddle = bull.x + t * ((bull.targetX || bull.x) - bull.x);
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
            const isSamidare = bull.type === '403_SAMIDARE_UP' || bull.type === '403_SAMIDARE_RAIN' || bull.type === '403_SAMIDARE_CLUSTER';
            if (!paddle.destroyed && (isSamidare || Date.now() > (paddle.invincibleEndTime || 0))) {
                const nearestX = Math.max(paddle.x, Math.min(bull.x, paddle.x + paddle.w));
                const nearestY = Math.max(paddle.y, Math.min(bull.y, paddle.y + paddle.h));
                const dx = bull.x - nearestX;
                const dy = bull.y - nearestY;
                isHit = (dx * dx + dy * dy <= hitRadius * hitRadius);
            }

            if (isHit) {
                if (bull.type === '403_COUNTER_BULLET') {
                    bull.type = '403_COUNTER_RETURN';
                    const bs = state.boss403State;
                    const dx = bs.blasterX - bull.x;
                    const dy = bs.blasterY - bull.y;
                    const angle = Math.atan2(dy, dx);
                    bull.vx = Math.cos(angle) * 15;
                    bull.vy = Math.sin(angle) * 15;
                } else if (bull.type === 'MUD' || bull.type === 'MUD_SHRAPNEL') {
                    paddle.mudEndTime = Date.now() + 10000;
                    bull.dead = true;
                } else if (bull.type === 'UNAVAILABLE_ROCKET' || bull.type === 'BUSY_ROCKET') {
                    // Direct rocket hit explodes and damages paddle
                    bull.dead = true;
                    spawnRocketExplosion(bull.x, bull.y);
                    if (bull.type === 'UNAVAILABLE_ROCKET') {
                        paddle.destroyed = true;
                        spawnPaddleParticles();
                        paddle.invincibleEndTime = Date.now() + 1000;
                    } else {
                        // BUSY_ROCKET: progress damage
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
                } else {
                    if (bull.type.startsWith('403_') && !isSamidare) {
                        if (state.boss403State.barrageHit || (bull.shotId && paddle.lastHitShotId === bull.shotId)) {
                            bull.dead = true;
                            return;
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
};

// 9. Boss update delegation
const updateBoss = () => {
    if (state.currentStage === 5) {
        updateBoss5();
    } else if (state.currentStage === 10) {
        updateBoss10();
    }
};

// 10. Main game update loop
export const update = () => {
    updatePaddle();

    if (state.gameState === 'TUTORIAL' || state.gameState === 'READY') {
        if (state.balls.length > 0) {
            state.balls[0].x = state.paddle.x + state.paddle.w / 2;
            state.balls[0].y = state.paddle.y - 20;
        }
        return;
    }

    if (state.gameState === 'PLAYING') {
        updateParticles();

        const isBoss5Defeated = state.currentStage === 5 && state.bossState.active && (state.bossState.face.state === 'DYING' || state.bossState.face.state === 'DEAD' || state.bossState.face.hp <= 0);
        const isBoss10Defeated = state.currentStage === 10 && state.boss403State.active && (state.boss403State.face.hp <= 0 || state.boss403State.state === 'DYING' || state.boss403State.state === 'DEAD' || state.blocks.filter(b => b.active && b.part === 'face').length === 0);
        const stopBalls = isBoss5Defeated || isBoss10Defeated;

        if (stopBalls) {
            state.enemies = [];
            state.enemyBullets = [];
            state.balls.forEach(b => { b.vx = 0; b.vy = 0; });
        }

        updateBalls(stopBalls);
        updateItems();
        updateScenery();
        updateEnemies(stopBalls);
        updateEnemyBullets();
        updateBoss();

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
