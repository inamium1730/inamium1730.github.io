import { CANVAS_WIDTH, CANVAS_HEIGHT, STAGE_NAMES } from './constants/maps.js';
import { state } from './state.js';
import { currentTheme, getThemeColor } from './theme.js';
import { isMobile } from './utils.js';
import { drawBoss10AimLasers } from './bosses/boss10.js';

// Cloud and bird sprites
const CLOUD_SPRITES = [
    [
        "    1111    ",
        "  11111111  ",
        " 1111111111 ",
        "111111111111",
        "111111111111"
    ],
    [
        "     11111      ",
        "   111111111    ",
        "  111111111111  ",
        " 11111111111111 ",
        "1111111111111111",
        "1111111111111111"
    ],
    [
        "   1111    11111    ",
        " 11111111 11111111  ",
        "1111111111111111111 ",
        "11111111111111111111",
        "11111111111111111111"
    ]
];

const BIRD_SPRITE_1 = [
    "1000001",
    "0100010",
    "0010100",
    "0001000"
];

const BIRD_SPRITE_2 = [
    "0000000",
    "1110111",
    "0011100",
    "0001000"
];

// 1. Background rendering
const drawBackground = (ctx) => {
    if (state.currentStage >= 2) {
        if (currentTheme === 'dark') {
            state.stars.forEach(s => {
                s.phase += 0.03;
                let alpha = (Math.sin(s.phase) + 1) / 2;
                alpha = Math.floor(alpha * 4) / 3;
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.fillRect(s.x, s.y, 2, 2);
            });
        } else {
            state.clouds.forEach(c => {
                c.x -= c.speed;
                if (c.x < -150) {
                    c.x = CANVAS_WIDTH + 50;
                    c.y = 40 + Math.random() * 160;
                    c.type = Math.random() < 0.25 ? 'bird' : 'cloud';
                    c.cloudId = Math.floor(Math.random() * CLOUD_SPRITES.length);
                    c.speed = c.type === 'bird' ? (0.8 + Math.random() * 0.4) : (0.25 + Math.random() * 0.25);
                }

                let sprite;
                let dotSize = 4;
                if (c.type === 'bird') {
                    sprite = Math.floor(Date.now() / 250) % 2 === 0 ? BIRD_SPRITE_1 : BIRD_SPRITE_2;
                    ctx.fillStyle = 'rgba(100, 116, 139, 0.65)';
                    dotSize = 3;
                } else {
                    sprite = CLOUD_SPRITES[c.cloudId];
                    ctx.fillStyle = 'rgba(180, 195, 210, 0.45)';
                    dotSize = 4;
                }

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

    if (state.currentStage === 3) {
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
            const t = (p2.x === p1.x) ? 0 : (x - p1.x) / (p2.x - p1.x);
            const y = p1.y + t * (p2.y - p1.y);
            const qY = Math.floor(y / dotSize) * dotSize;
            ctx.fillRect(x, qY, dotSize, CANVAS_HEIGHT - qY);
        }
    }

    if (state.currentStage === 4) {
        ctx.fillStyle = currentTheme === 'dark' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(56, 189, 248, 0.2)';
        const dotSize = 8;
        const time = Date.now() / 500;
        for (let x = 0; x < CANVAS_WIDTH; x += dotSize) {
            const y = CANVAS_HEIGHT - 120 + Math.sin(x / 50 + time) * 15 + Math.sin(x / 100 - time * 0.5) * 10;
            const qY = Math.floor(y / dotSize) * dotSize;
            ctx.fillRect(x, qY, dotSize, CANVAS_HEIGHT - qY);
        }
    }

    if (state.currentStage === 5) {
        ctx.fillStyle = currentTheme === 'dark' ? '#333' : '#ccc';
        ctx.fillRect(0, CANVAS_HEIGHT - 30, CANVAS_WIDTH, 30);
    }

    if (state.currentStage === 10) {
        ctx.fillStyle = currentTheme === 'dark' ? '#3e2723' : '#fde047';
        ctx.fillRect(0, CANVAS_HEIGHT - 30, CANVAS_WIDTH, 30);
    }

    if (state.currentStage >= 7 && state.currentStage <= 9) {
        ctx.fillStyle = currentTheme === 'dark' ? '#3e2723' : '#fde047';
        ctx.fillRect(0, CANVAS_HEIGHT - 100, CANVAS_WIDTH, 100);

        ctx.fillStyle = currentTheme === 'dark' ? '#fef08a' : '#ef4444';
        const sunX = CANVAS_WIDTH - 200, sunY = 150, sunSize = 60;
        ctx.fillRect(sunX, sunY, sunSize, sunSize);
        ctx.fillStyle = currentTheme === 'dark' ? '#111' : '#facc15';
        ctx.fillRect(sunX + 10, sunY + 10, 15, 15);
        ctx.fillRect(sunX + 35, sunY + 30, 15, 15);

        if (state.currentStage === 9) {
            ctx.fillStyle = currentTheme === 'dark' ? '#78350f' : '#fcd34d';
            const pyBaseW = 300;
            const pyX = CANVAS_WIDTH / 2 - pyBaseW / 2;
            const pyY = CANVAS_HEIGHT - 100;
            const layers = 8;
            const layerH = 15;
            for (let i = 0; i < layers; i++) {
                const w = pyBaseW - (i * (pyBaseW / layers));
                const x = pyX + (pyBaseW - w) / 2;
                const y = pyY - (i + 1) * layerH;
                for (let j = 0; j < w; j += 15) {
                    ctx.fillRect(x + j, y, 13, layerH - 2);
                }
            }
        }

        if (state.currentStage >= 8) {
            ctx.fillStyle = currentTheme === 'dark' ? '#14532d' : '#22c55e';
            state.cacti.forEach(c => {
                ctx.fillRect(c.x, c.y, 20, c.h);
                ctx.fillRect(c.x - 15, c.y + 20, 15, 10);
                ctx.fillRect(c.x - 15, c.y + 5, 10, 20);
                ctx.fillRect(c.x + 20, c.y + 30, 15, 10);
                ctx.fillRect(c.x + 25, c.y + 15, 10, 20);
            });
        }
    }

    if (state.tumbleweeds.length > 0) {
        ctx.fillStyle = currentTheme === 'dark' ? '#a16207' : '#713f12';
        ctx.font = '30px "Press Start 2P"';
        state.tumbleweeds.forEach(t => {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.translate(t.x, t.y);
            ctx.rotate(t.rotation);
            ctx.fillText('*', 0, 0);
            ctx.restore();
        });
    }
};

// 2. Blocks rendering
const drawBlocks = (ctx, textColor) => {
    ctx.font = '24px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    state.blocks.forEach(bl => {
        if (!bl.active) return;

        let bx = bl.x;
        let by = bl.y;
        let bColor = textColor;
        let isRightHand = false;

        if (state.currentStage === 5 && bl.part) {
            const partState = state.bossState[bl.part];
            bx = bl.baseX + partState.xOffset;
            by = bl.baseY + partState.yOffset;

            if (bl.part === 'rightHand') isRightHand = true;

            if (bl.part !== 'face' && (partState.state === 'LOCK' || partState.state === 'PUNCH' || partState.state === 'GROUNDED')) {
                if (Math.floor(Date.now() / 150) % 2 === 0) {
                    bColor = '#ef4444';
                }
            } else if (bl.part === 'face' && partState.state === 'SUMMON') {
                if (Math.floor(Date.now() / 150) % 2 === 0) {
                    bColor = '#facc15';
                }
            }
        }

        if (state.currentStage === 10 && bl.part) {
            const bs = state.boss403State;
            if (bl.part === 'face') {
                bx = bl.baseX + bs.face.xOffset;
                by = bl.baseY + bs.face.yOffset;
                if (bs.state === 'DYING') {
                    if (Math.floor(Date.now() / 100) % 2 === 0) {
                        bColor = '#ef4444';
                    }
                } else if (['WAIT_DROP', 'DROP', 'WAIT_RETURN', 'RETURN'].includes(bs.face.state)) {
                    if (Math.floor(Date.now() / 150) % 2 === 0) {
                        bColor = '#ef4444';
                    }
                }
            } else if (bl.part === 'blaster') {
                if (bl.color) bColor = bl.color;

                if (bs.state === 'EQUIPPING') {
                    if (Math.floor(Date.now() / 150) % 2 === 0) {
                        ctx.globalAlpha = 0.3;
                    }
                }
            }
        }

        bl.x = bx;
        bl.y = by;

        ctx.fillStyle = bColor;
        if (isRightHand) {
            ctx.save();
            ctx.translate(bx + bl.w / 2, by + bl.h / 2);
            ctx.scale(-1, 1);
            ctx.fillText(bl.char, 0, 0);
            ctx.restore();
        } else {
            ctx.fillText(bl.char, bx + bl.w / 2, by + bl.h / 2);
            ctx.globalAlpha = 1.0;
        }
    });
};

// 3. Items & Particles rendering
const drawItemsAndParticles = (ctx) => {
    ctx.font = '20px "Press Start 2P"';
    state.items.forEach(i => {
        ctx.fillStyle = i.color;
        ctx.fillText(i.char, i.x, i.y);
    });

    state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        if (p.char) {
            ctx.font = '20px "Press Start 2P"';
            ctx.fillText(p.char, p.x, p.y);
        } else {
            ctx.fillRect(p.x, p.y, p.size, p.size);
        }
        ctx.globalAlpha = 1.0;
    });
};

// 4. Balls rendering
const drawBalls = (ctx, textColor) => {
    ctx.font = '20px "Press Start 2P"';
    state.balls.forEach(b => {
        if (b.hidden) return;
        let bColor = b.color || textColor;
        
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (b.isRecovering || b.isDecelerating || b.stopped || speed < 0.1) {
            ctx.globalAlpha = (Math.floor(Date.now() / 250) % 2 === 0) ? 0.3 : 1.0;
        }

        if (b.isEnhanced && Date.now() < state.paddle.nBuffEndTime - 1000) {
            const blinkColor = currentTheme === 'dark' ? '#38bdf8' : '#0284c7';
            bColor = (Math.floor(Date.now() / 250) % 2 === 0) ? blinkColor : textColor;
        }
        ctx.fillStyle = bColor;
        ctx.fillText(b.char, b.x, b.y);
        ctx.globalAlpha = 1.0;
    });
};

// 5. Paddle rendering
const drawPaddle = (ctx, textColor) => {
    ctx.font = '28px "Press Start 2P"';
    const activeColors = [];
    if (Date.now() < state.paddle.nBuffEndTime - 1000) {
        activeColors.push(currentTheme === 'dark' ? '#38bdf8' : '#0284c7');
    }
    if (Date.now() < (state.paddle.mudEndTime || 0)) {
        activeColors.push(currentTheme === 'dark' ? '#78350f' : '#451a03');
    }
    if (Date.now() < state.paddle.ndEndTime || Date.now() < state.paddle.foundEndTime) {
        activeColors.push('#ef4444');
    }

    let pColor = textColor;
    if (activeColors.length > 0) {
        const tick = Math.floor(Date.now() / 250);
        if (tick % 2 === 0) {
            const cycleIndex = Math.floor(tick / 2) % activeColors.length;
            pColor = activeColors[cycleIndex];
        }
    }

    if (!state.paddle.destroyed) {
        if (state.paddle.isSpawning || Date.now() < (state.paddle.invincibleEndTime || 0)) {
            ctx.globalAlpha = (Math.floor(Date.now() / 500) % 2 === 0) ? 0.67 : 1.0;
        }
        ctx.fillStyle = pColor;
        ctx.fillText(state.paddle.text, state.paddle.x + state.paddle.w / 2, state.paddle.y + state.paddle.h / 2);
        ctx.globalAlpha = 1.0;
    }
};

// 6. Enemies rendering (with clean transparency calculation)
const drawEnemies = (ctx, textColor) => {
    if (state.currentStage < 2) return;

    ctx.textAlign = 'center';
    ctx.font = '32px "Press Start 2P"';

    state.enemies.forEach(en => {
        if (en.dead) return;

        // Laser aiming indicators
        if (en.actionState === 'AIMING' || en.actionState === 'LOCKING') {
            ctx.globalAlpha = 1.0;
            ctx.lineDashOffset = -(Date.now() % 1000) * 0.1;
            if (en.actionState === 'AIMING') {
                ctx.strokeStyle = '#ffffff';
            } else {
                let p = (Date.now() - en.actionStartTime) / 500;
                if (p > 1) p = 1;
                const r = Math.floor(255 - (255 - 239) * p);
                const g = Math.floor(255 - (255 - 68) * p);
                const b = Math.floor(255 - (255 - 68) * p);
                ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
            }
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(en.x, en.y + 20);
            ctx.lineTo(en.aimTargetX, CANVAS_HEIGHT);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.lineDashOffset = 0;
        }

        ctx.fillStyle = textColor;
        const text = en.type;
        const chars = text.split('');
        const step = 32;
        const startOffset = -((chars.length - 1) * step) / 2;

        chars.forEach((c, idx) => {
            ctx.globalAlpha = (en.hp > idx) ? 1.0 : 0.3;
            ctx.fillText(c, en.x + startOffset + idx * step, en.y + en.h / 2);
        });
    });
    ctx.globalAlpha = 1.0;
};

// 7. Enemy Bullets rendering
const drawEnemyBullets = (ctx, textColor) => {
    if (state.currentStage < 2) return;

    state.enemyBullets.forEach(bull => {
        if (bull.type === 'LASER') {
            const isWhite = Math.floor(Date.now() / 50) % 2 === 0;
            const color = isWhite ? '#ffffff' : (bull.isPurple ? '#a855f7' : '#ef4444');
            ctx.strokeStyle = color;
            ctx.lineWidth = bull.w;
            ctx.beginPath();
            ctx.moveTo(bull.x, bull.y);
            const targetY = bull.targetY !== undefined ? bull.targetY : CANVAS_HEIGHT;
            ctx.lineTo(bull.targetX || bull.x, targetY);
            ctx.stroke();
            return;
        }

        if (bull.type === '404_ARC') {
            ctx.fillStyle = (Math.floor(Date.now() / 150) % 2 === 0) ? '#ef4444' : textColor;
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(bull.char, bull.x, bull.y);
            return;
        }

        ctx.save();
        ctx.translate(bull.x + bull.w / 2, bull.y + bull.h / 2);
        const angle = bull.drawAngle !== undefined ? bull.drawAngle : (bull.vx !== 0 ? Math.atan2(bull.vy, bull.vx) : Math.PI / 2);

        let bText = "404";
        let bColor = textColor;

        if (bull.type === 'FOUND') bText = "FOUND";
        else if (bull.type === 'ERROR_BULLET' || bull.type === 'SCATTERED_BULLET') bText = "ERROR";
        else if (bull.type === '404NOTFOUND_BASE') bText = "404NOTFOUND";
        else if (bull.type === '404NOTFOUND_SHRAPNEL') bText = bull.char;
        else if (bull.type === 'MUD') bText = "mud";
        else if (bull.type === 'MUD_SHRAPNEL') bText = bull.char;
        else if (bull.type.startsWith('403_')) {
            bText = bull.char;
        }

        if (bull.type === '403_SAMIDARE_UP' || bull.type === '403_SAMIDARE_RAIN' || bull.type === '403_BARRAGE') {
            bColor = (Math.floor(Date.now() / 150) % 2 === 0) ? '#a855f7' : textColor;
        } else if (bull.type === '403_SAMIDARE_CLUSTER') {
            bColor = (Math.floor(Date.now() / 150) % 2 === 0) ? '#ef4444' : textColor;
        } else if (bull.type === 'ERROR_BULLET' || bull.type === 'SCATTERED_BULLET') {
            const flashColor = bull.type === 'ERROR_BULLET' ? '#f97316' : '#ef4444';
            bColor = (Math.floor(Date.now() / 100) % 2 === 0) ? flashColor : textColor;
        } else if (bull.type === 'MUD' || bull.type === 'MUD_SHRAPNEL') {
            const mudColor = currentTheme === 'dark' ? '#78350f' : '#451a03';
            bColor = (Math.floor(Date.now() / 500) % 2 === 0) ? mudColor : textColor;
        } else if (bull.type === '404NOTFOUND_BASE' || bull.type === '404NOTFOUND_SHRAPNEL') {
            bColor = (Math.floor(Date.now() / 100) % 2 === 0) ? '#a855f7' : textColor;
        } else if (bull.type === '403_COUNTER_BULLET') {
            bColor = '#facc15';
        } else if (bull.type === '403_COUNTER_RETURN') {
            bColor = '#ffffff';
        } else {
            bColor = (Math.floor(Date.now() / 250) % 2 === 0) ? '#ef4444' : textColor;
        }

        ctx.rotate(angle);
        ctx.fillStyle = bColor;
        ctx.font = bText.length > 4 ? '11px "Press Start 2P"' : '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(bText, 0, 0);
        ctx.restore();
    });
};

// 8. UI overlay rendering
const drawUI = (ctx, textColor) => {
    ctx.fillStyle = textColor;
    ctx.font = '20px "Press Start 2P"';
    ctx.textAlign = 'right';

    const maxDigits = state.blocks.length.toString(2).length;
    const binScore = state.score.toString(2).padStart(maxDigits, '0');
    const dispScore = binScore.replace(/1/g, '4');
    ctx.fillText(dispScore, CANVAS_WIDTH - 30, 40);

    ctx.textAlign = 'left';
    const original = ['4', '0', '4'];
    let offsetX = 30;
    for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = (i < state.reserve.length) ? 1.0 : 0.25;
        ctx.fillStyle = textColor;
        ctx.fillText(original[i], offsetX, 40);
        offsetX += 30;
    }
    ctx.globalAlpha = 1.0;

    if (state.gameState === 'TUTORIAL') {
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
        const text = isMobile ? "← または → を押して開始" : "A D または ← → を押して開始";
        ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

        const maxStage = parseInt(localStorage.getItem('404_max_stage') || '1', 10);
        if (maxStage > 1) {
            ctx.fillStyle = '#fff';
            ctx.font = '14px "Press Start 2P"';
            const switchText = isMobile ? "2本指でタップ でステージ切り替え" : "TAB でステージ切り替え";
            ctx.fillText(switchText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
        }
    } else if (state.gameState === 'READY') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '18px "Press Start 2P"';
        const text = isMobile ? "← または → を押して再開" : "A D または ← → を押して再開";
        ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    } else if (state.gameState === 'GAMECLEAR') {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.font = '32px "Press Start 2P"';
        ctx.fillText("404 NOT FOUND!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

        ctx.fillStyle = '#fff';
        ctx.font = '18px "Press Start 2P"';
        const text = isMobile ? "画面をタップしてリトライ" : "Space を押してリトライ";
        ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    } else if (state.gameState === 'GAMEOVER') {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#fca5a5';
        ctx.textAlign = 'center';
        ctx.font = '32px "Press Start 2P"';
        ctx.fillText("404 NOT FOUND...", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

        ctx.fillStyle = '#fff';
        ctx.font = '18px "Press Start 2P"';
        const text = isMobile ? "画面をタップしてリトライ" : "Space を押してリトライ";
        ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    }

    if (Date.now() < state.stageTitleShowTime) {
        const elapsed = 2000 - (state.stageTitleShowTime - Date.now());
        let alpha = 1.0;
        if (elapsed > 1000) {
            alpha = 1.0 - ((elapsed - 1000) / 1000);
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        const stageName = STAGE_NAMES[state.currentStage] || '';
        ctx.fillText("Stage " + state.currentStage + " - " + stageName, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60);
    }
};

// Main draw entry point
export const draw = (ctx) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawBackground(ctx);

    const textColor = getThemeColor('--text-main') || '#fff';

    drawBlocks(ctx, textColor);
    drawItemsAndParticles(ctx);
    drawBalls(ctx, textColor);

    if (state.currentStage === 10 && state.boss403State.active) {
        drawBoss10AimLasers(ctx, textColor);
    }

    drawPaddle(ctx, textColor);
    drawEnemies(ctx, textColor);
    drawEnemyBullets(ctx, textColor);
    drawUI(ctx, textColor);
};
