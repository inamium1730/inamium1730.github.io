import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants/maps.js';
import { state } from './state.js';
import { currentTheme, getThemeColor } from './theme.js';
import { isMobile } from './utils.js';

export const draw = (ctx) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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
            const cloudSprites = [
                ["  1111  ", " 111111 ", "11111111"],
                ["   111   ", "  11111  ", " 1111111 ", "111111111"],
                ["  11  11  ", " 11111111 ", "1111111111"]
            ];
            const birdSprite1 = ["10001", "01010", "00100"];
            const birdSprite2 = ["00000", "11011", "00100"];

            state.clouds.forEach(c => {
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
                    for (let col = 0; col < sprite.length; col++) {
                        // The original code had `col < sprite[r].length`
                        if (sprite[r] && sprite[r][col] === '1') {
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
            let t = (p2.x === p1.x) ? 0 : (x - p1.x) / (p2.x - p1.x);
            let y = p1.y + t * (p2.y - p1.y);
            let qY = Math.floor(y / dotSize) * dotSize;
            ctx.fillRect(x, qY, dotSize, CANVAS_HEIGHT - qY);
        }
    }

    if (state.currentStage === 4) {
        ctx.fillStyle = currentTheme === 'dark' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(56, 189, 248, 0.2)';
        const dotSize = 8;
        const time = Date.now() / 500;
        for (let x = 0; x < CANVAS_WIDTH; x += dotSize) {
            let y = CANVAS_HEIGHT - 120 + Math.sin(x / 50 + time) * 15 + Math.sin(x / 100 - time * 0.5) * 10;
            let qY = Math.floor(y / dotSize) * dotSize;
            ctx.fillRect(x, qY, dotSize, CANVAS_HEIGHT - qY);
        }
    }

    if (state.currentStage === 5) {
        ctx.fillStyle = currentTheme === 'dark' ? '#333' : '#ccc';
        ctx.fillRect(0, CANVAS_HEIGHT - 30, CANVAS_WIDTH, 30);
    }

    const textColor = getThemeColor('--text-main') || '#fff';

    ctx.font = '24px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    state.blocks.forEach(bl => {
        if (bl.active) {
            let bx = bl.x;
            let by = bl.y;
            let bColor = textColor;
            let isRightHand = false;

            if (state.currentStage === 5 && bl.part) {
                let partState = state.bossState[bl.part];
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
            }
        }
    });

    ctx.font = '20px "Press Start 2P"';
    state.items.forEach(i => {
        ctx.fillStyle = i.color;
        ctx.fillText(i.char, i.x, i.y);
    });

    state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0;
    });

    ctx.font = '20px "Press Start 2P"';
    state.balls.forEach(b => {
        let bColor = b.color || textColor;
        if (b.isEnhanced && Date.now() < state.paddle.nBuffEndTime - 1000) {
            let blinkColor = currentTheme === 'dark' ? '#38bdf8' : '#0284c7';
            bColor = (Math.floor(Date.now() / 250) % 2 === 0) ? blinkColor : textColor;
        }
        ctx.fillStyle = bColor;
        ctx.fillText(b.char, b.x, b.y);
    });

    ctx.font = '28px "Press Start 2P"';
    let pColor = textColor;
    let isPenaltyBlink = Date.now() < state.paddle.ndEndTime || Date.now() < state.paddle.foundEndTime;
    if (Date.now() < state.paddle.nBuffEndTime - 1000) {
        let blinkColor = currentTheme === 'dark' ? '#38bdf8' : '#0284c7';
        pColor = (Math.floor(Date.now() / 250) % 2 === 0) ? blinkColor : textColor;
    } else if (isPenaltyBlink && Math.floor(Date.now() / 250) % 2 === 0) {
        pColor = '#ef4444';
    }

    if (!state.paddle.destroyed) {
        if (state.paddle.isSpawning || Date.now() < (state.paddle.invincibleEndTime || 0)) {
            ctx.globalAlpha = (Math.floor(Date.now() / 500) % 2 === 0) ? 0.67 : 1.0;
        }
        ctx.fillStyle = pColor;
        ctx.fillText(state.paddle.text, state.paddle.x + state.paddle.w / 2, state.paddle.y + state.paddle.h / 2);
        ctx.globalAlpha = 1.0;
    }

    if (state.currentStage >= 2) {
        ctx.textAlign = 'center';
        ctx.font = '32px "Press Start 2P"';
        state.enemies.forEach(en => {
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
            } else if (en.type === 'DROP') {
                let chars = ['D', 'R', 'O', 'P'];
                let offsets = [-48, -16, 16, 48];
                chars.forEach((c, idx) => {
                    if (en.hp === 4) ctx.globalAlpha = 1.0;
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

        state.enemyBullets.forEach(bull => {
            if (bull.type === '404_ARC') {
                ctx.fillStyle = (Math.floor(Date.now() / 150) % 2 === 0) ? '#ef4444' : textColor;
                ctx.font = '24px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText(bull.char, bull.x, bull.y);
                return;
            }

            ctx.save();
            ctx.translate(bull.x + bull.w / 2, bull.y + bull.h / 2);
            let angle = bull.vx !== 0 ? Math.atan2(bull.vy, bull.vx) : Math.PI / 2;

            let bText = "404";
            if (bull.type === 'FOUND') bText = "FOUND";
            else if (bull.type === 'DROP_BULLET' || bull.type === 'SCATTERED_BULLET') bText = "DROP";
            else if (bull.type === '404NOTFOUND_BASE') bText = "404NOTFOUND";
            else if (bull.type === '404NOTFOUND_SHRAPNEL') bText = bull.char;

            let bColor = textColor;
            if (bull.type === 'DROP_BULLET') {
                bColor = (Math.floor(Date.now() / 100) % 2 === 0) ? '#f97316' : textColor;
            } else if (bull.type === 'SCATTERED_BULLET') {
                bColor = (Math.floor(Date.now() / 100) % 2 === 0) ? '#ef4444' : textColor;
            } else if (bull.type === '404NOTFOUND_BASE' || bull.type === '404NOTFOUND_SHRAPNEL') {
                bColor = (Math.floor(Date.now() / 100) % 2 === 0) ? '#a855f7' : textColor;
            } else {
                bColor = (Math.floor(Date.now() / 250) % 2 === 0) ? '#ef4444' : textColor;
            }

            ctx.rotate(angle);
            ctx.fillStyle = bColor;
            ctx.font = '16px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(bText, 0, 0);
            ctx.restore();
        });
    }

    ctx.fillStyle = textColor;
    ctx.font = '20px "Press Start 2P"';
    ctx.textAlign = 'right';
    let maxDigits = state.blocks.length.toString(2).length;
    let binScore = state.score.toString(2).padStart(maxDigits, '0');
    let dispScore = binScore.replace(/1/g, '4');
    ctx.fillText(dispScore, CANVAS_WIDTH - 30, 40);

    ctx.textAlign = 'left';
    const original = ['4', '0', '4'];
    let offsetX = 30;
    for (let i = 0; i < 3; i++) {
        if (i < state.reserve.length) {
            ctx.globalAlpha = 1.0;
        } else {
            ctx.globalAlpha = 0.25;
        }
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
            
            // For fun, we can display boss name if in stage 5 from bossesData, but let's keep original
            ctx.fillText("404 NOT FOUND", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
        }

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '18px "Press Start 2P"';
        let text = isMobile ? "← または → を押して開始" : "A D または ← → を押して開始";
        ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

        let maxStage = parseInt(localStorage.getItem('404_max_stage') || '1', 10);
        if (maxStage > 1) {
            ctx.fillStyle = '#fff';
            ctx.font = '14px "Press Start 2P"';
            let switchText = isMobile ? "2本指タップで順送り / 3本指タップで逆順" : "TAB でステージ切り替え";
            ctx.fillText(switchText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
        }
    }
    else if (state.gameState === 'READY') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '18px "Press Start 2P"';
        let text = isMobile ? "← または → を押して再開" : "A D または ← → を押して再開";
        ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    }
    else if (state.gameState === 'GAMECLEAR') {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.font = '32px "Press Start 2P"';
        ctx.fillText("404 NOT FOUND!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

        ctx.fillStyle = '#fff';
        ctx.font = '18px "Press Start 2P"';
        let text = isMobile ? "画面をタップしてリトライ" : "Space を押してリトライ";
        ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    }
    else if (state.gameState === 'GAMEOVER') {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#fca5a5';
        ctx.textAlign = 'center';
        ctx.font = '32px "Press Start 2P"';
        ctx.fillText("404 NOT FOUND...", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

        ctx.fillStyle = '#fff';
        ctx.font = '18px "Press Start 2P"';
        let text = isMobile ? "画面をタップしてリトライ" : "Space を押してリトライ";
        ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    }

    if (Date.now() < state.stageTitleShowTime) {
        let elapsed = 2000 - (state.stageTitleShowTime - Date.now());
        let alpha = 1.0;
        if (elapsed > 1000) {
            alpha = 1.0 - ((elapsed - 1000) / 1000);
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        const stageNames = ["", "404", "NOT", "FOUND", "DROP", "404"];
        ctx.fillText("Stage " + state.currentStage + " - " + stageNames[state.currentStage], CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60);
    }
};
