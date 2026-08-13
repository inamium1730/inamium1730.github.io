const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../update.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Replace enemy movement block
const moveTarget = `                en.x += en.vx * state.globalSpeedMult;
                en.y += en.vy * state.globalSpeedMult;

                if (en.x - en.w / 2 < 0) {
                    en.x = en.w / 2;
                    en.vx *= -1;
                    en.y += 20;
                } else if (en.x + en.w / 2 > CANVAS_WIDTH) {
                    en.x = CANVAS_WIDTH - en.w / 2;
                    en.vx *= -1;
                    en.y += 20;
                }`;

const moveReplacement = `                if (!en.actionState) en.actionState = 'IDLE';
                if (en.actionState === 'IDLE') {
                    en.x += en.vx * state.globalSpeedMult;
                    en.y += en.vy * state.globalSpeedMult;

                    if (en.x - en.w / 2 < 0) {
                        en.x = en.w / 2;
                        en.vx *= -1;
                        en.y += 20;
                    } else if (en.x + en.w / 2 > CANVAS_WIDTH) {
                        en.x = CANVAS_WIDTH - en.w / 2;
                        en.vx *= -1;
                        en.y += 20;
                    }
                }`;
content = content.replace(moveTarget, moveReplacement);

// 2. Replace shooting logic
const shootTarget = `                let shootInterval = en.type === 'ERROR' ? 8000 + Math.random() * 4000 : (en.type === 'FOUND' ? 5000 + Math.random() * 2000 : 3000 + Math.random() * 2000);
                if (Date.now() - en.lastShootTime > shootInterval) {
                    if (en.type === 'ERROR') {
                        state.enemyBullets.push({
                            x: en.x,
                            y: en.y + 20,
                            startY: en.y + 20,
                            w: 16, h: 48,
                            vx: 0,
                            vy: 2,
                            type: 'ERROR_BULLET',
                            dead: false,
                            exploded: false
                        });
                    } else if (en.type === 'FOUND') {
                        let targetX = paddle.x + paddle.w / 2;
                        let targetY = paddle.y + paddle.h / 2;
                        let dx = targetX - en.x;
                        let dy = targetY - (en.y + 20);
                        let dist = Math.sqrt(dx * dx + dy * dy);
                        let speed = 4;
                        state.enemyBullets.push({
                            x: en.x,
                            y: en.y + 20,
                            w: 16, h: 48,
                            vx: (dx / dist) * speed,
                            vy: (dy / dist) * speed,
                            type: 'FOUND',
                            dead: false
                        });
                    } else {
                        state.enemyBullets.push({
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
                }`;

const shootReplacement = `                let enData = state.enemiesData[en.type] || { attackInterval: [3000, 5000] };
                let intervalDiff = enData.attackInterval[1] - enData.attackInterval[0];
                let shootInterval = enData.attackInterval[0] + Math.random() * intervalDiff;

                if (en.actionState === 'IDLE') {
                    if (Date.now() - en.lastShootTime > shootInterval) {
                        if (en.type === 'DENIED' || en.type === 'ACCESS') {
                            en.actionState = 'AIMING';
                            en.actionStartTime = Date.now();
                            en.aimTargetX = en.x;
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
                    if (Date.now() - en.actionStartTime > 2000) {
                        en.actionState = 'LOCKING';
                        en.actionStartTime = Date.now();
                    } else {
                        if (en.type === 'ACCESS') en.aimTargetX = paddle.x + paddle.w / 2;
                        else en.aimTargetX = en.x;
                    }
                } else if (en.actionState === 'LOCKING') {
                    if (Date.now() - en.actionStartTime > 1000) {
                        en.actionState = 'FIRING';
                        en.actionStartTime = Date.now();
                        state.enemyBullets.push({
                            x: en.aimTargetX, y: en.y + 20,
                            w: 200, h: CANVAS_HEIGHT,
                            vx: 0, vy: 0, type: 'LASER',
                            fireStartTime: Date.now(), parentEn: en, dead: false
                        });
                        playBeep(800);
                    }
                } else if (en.actionState === 'FIRING') {
                    if (Date.now() - en.actionStartTime > 500) {
                        en.actionState = 'IDLE';
                        en.lastShootTime = Date.now();
                    }
                }`;
content = content.replace(shootTarget, shootReplacement);

// 3. Replace bullet update logic
const bulletTarget = `                bull.x += bull.vx * state.globalSpeedMult;
                bull.y += bull.vy * state.globalSpeedMult;

                if (bull.type === 'ERROR_BULLET' && !bull.exploded && bull.y >= Math.max(CANVAS_HEIGHT / 2, (bull.startY || 0) + 150)) {`;

const bulletReplacement = `                if (bull.type === 'MUD') {
                    bull.vy += 0.2;
                    bull.x += bull.vx * state.globalSpeedMult;
                    bull.y += bull.vy * state.globalSpeedMult;
                    
                    if (bull.y >= paddle.y) {
                        bull.dead = true;
                        ['m', 'u', 'd'].forEach((char, idx) => {
                            let angle = -Math.PI / 2 + (idx - 1) * 0.5;
                            let speed = 6 + Math.random() * 4;
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
                    else bull.w = 200 * (1 - elapsed / 500);
                } else {
                    bull.x += bull.vx * state.globalSpeedMult;
                    bull.y += bull.vy * state.globalSpeedMult;
                }

                if (bull.type === 'ERROR_BULLET' && !bull.exploded && bull.y >= Math.max(CANVAS_HEIGHT / 2, (bull.startY || 0) + 150)) {`;
content = content.replace(bulletTarget, bulletReplacement);

// 4. Hit detection logic for mud and laser
const hitTarget = `                if (!paddle.destroyed && bull.y + bull.h / 2 > paddle.y && bull.y - bull.h / 2 < paddle.y + paddle.h && bull.x > paddle.x && bull.x < paddle.x + paddle.w) {
                    if (bull.type === '404NOTFOUND_SHRAPNEL') {`;

const hitReplacement = `                if (bull.type === 'LASER' && !bull.dead) {
                    if (Date.now() - (bull.lastHitTime || 0) > 100) {
                        if (!paddle.destroyed && paddle.x < bull.x + bull.w / 2 && paddle.x + paddle.w > bull.x - bull.w / 2) {
                            paddle.w -= 32;
                            bull.lastHitTime = Date.now();
                            if (paddle.w <= 0) { paddle.destroyed = true; state.gameState = 'GAMEOVER'; }
                            playBeep(100);
                        }
                    }
                } else if ((bull.type === 'MUD' || bull.type === 'MUD_SHRAPNEL') && !bull.dead) {
                    if (!paddle.destroyed && bull.y + bull.h / 2 > paddle.y && bull.y - bull.h / 2 < paddle.y + paddle.h && bull.x > paddle.x && bull.x < paddle.x + paddle.w) {
                        paddle.mudEndTime = Date.now() + 10000;
                        bull.dead = true;
                        playBeep(150);
                    }
                }

                if (!paddle.destroyed && bull.y + bull.h / 2 > paddle.y && bull.y - bull.h / 2 < paddle.y + paddle.h && bull.x > paddle.x && bull.x < paddle.x + paddle.w && bull.type !== 'LASER' && bull.type !== 'MUD' && bull.type !== 'MUD_SHRAPNEL') {
                    if (bull.type === '404NOTFOUND_SHRAPNEL') {`;
content = content.replace(hitTarget, hitReplacement);

fs.writeFileSync(file, content);
console.log('Update.js modified successfully.');
