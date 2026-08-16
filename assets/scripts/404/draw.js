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

    // Stage 11: Mountains and dense criss-crossing pixel power poles / wires
    if (state.currentStage === 11) {
        const dotSize = 3;
        const groundBaseY = CANVAS_HEIGHT - 30;

        // 1. Distant mountains (Layer 1)
        ctx.fillStyle = currentTheme === 'dark' ? '#1e293b' : '#94a3b8';
        const mPoints1 = [
            { x: 0, y: CANVAS_HEIGHT },
            { x: 160, y: CANVAS_HEIGHT - 230 },
            { x: 380, y: CANVAS_HEIGHT - 150 },
            { x: 640, y: CANVAS_HEIGHT - 270 },
            { x: 860, y: CANVAS_HEIGHT - 130 },
            { x: 1024, y: CANVAS_HEIGHT - 210 }
        ];
        const mDot = 8;
        for (let x = 0; x < CANVAS_WIDTH; x += mDot) {
            let p1 = mPoints1[0], p2 = mPoints1[1];
            for (let i = 0; i < mPoints1.length - 1; i++) {
                if (x >= mPoints1[i].x && x <= mPoints1[i + 1].x) {
                    p1 = mPoints1[i]; p2 = mPoints1[i + 1]; break;
                }
            }
            const t = (p2.x === p1.x) ? 0 : (x - p1.x) / (p2.x - p1.x);
            const y = p1.y + t * (p2.y - p1.y);
            const qY = Math.floor(y / mDot) * mDot;
            ctx.fillRect(x, qY, mDot, CANVAS_HEIGHT - qY);
        }

        // 2. Midground mountain ridge (Layer 2)
        ctx.fillStyle = currentTheme === 'dark' ? '#0f172a' : '#64748b';
        const mPoints2 = [
            { x: 0, y: CANVAS_HEIGHT },
            { x: 240, y: CANVAS_HEIGHT - 170 },
            { x: 520, y: CANVAS_HEIGHT - 90 },
            { x: 790, y: CANVAS_HEIGHT - 190 },
            { x: 1024, y: CANVAS_HEIGHT - 100 }
        ];
        for (let x = 0; x < CANVAS_WIDTH; x += mDot) {
            let p1 = mPoints2[0], p2 = mPoints2[1];
            for (let i = 0; i < mPoints2.length - 1; i++) {
                if (x >= mPoints2[i].x && x <= mPoints2[i + 1].x) {
                    p1 = mPoints2[i]; p2 = mPoints2[i + 1]; break;
                }
            }
            const t = (p2.x === p1.x) ? 0 : (x - p1.x) / (p2.x - p1.x);
            const y = p1.y + t * (p2.y - p1.y);
            const qY = Math.floor(y / mDot) * mDot;
            ctx.fillRect(x, qY, mDot, CANVAS_HEIGHT - qY);
        }

        // Helper to draw pixelated catenary wire
        const drawPixelWire = (x1, y1, x2, y2, sag, color, wireDot = dotSize) => {
            ctx.fillStyle = color;
            const steps = Math.max(12, Math.ceil(Math.abs(x2 - x1) / wireDot));
            let lastQx = null, lastQy = null;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = x1 + t * (x2 - x1);
                const y = (1 - t) * y1 + t * y2 + 4 * sag * t * (1 - t);
                const qx = Math.floor(x / wireDot) * wireDot;
                const qy = Math.floor(y / wireDot) * wireDot;
                if (qx !== lastQx || qy !== lastQy) {
                    ctx.fillRect(qx, qy, wireDot, wireDot);
                    lastQx = qx;
                    lastQy = qy;
                }
            }
        };

        // Helper to draw pixelated straight line
        const drawPixelLine = (x1, y1, x2, y2, color, lineDot = dotSize) => {
            ctx.fillStyle = color;
            const dist = Math.hypot(x2 - x1, y2 - y1);
            const steps = Math.max(6, Math.ceil(dist / lineDot));
            let lastQx = null, lastQy = null;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = x1 + t * (x2 - x1);
                const y = y1 + t * (y2 - y1);
                const qx = Math.floor(x / lineDot) * lineDot;
                const qy = Math.floor(y / lineDot) * lineDot;
                if (qx !== lastQx || qy !== lastQy) {
                    ctx.fillRect(qx, qy, lineDot, lineDot);
                    lastQx = qx;
                    lastQy = qy;
                }
            }
        };

        const wireColorMain = currentTheme === 'dark' ? '#475569' : '#475569';
        const wireColorDim = currentTheme === 'dark' ? '#334155' : '#64748b';
        const wireColorThin = currentTheme === 'dark' ? '#1e293b' : '#94a3b8';
        const poleColor = currentTheme === 'dark' ? '#334155' : '#1e293b';
        const poleColorDim = currentTheme === 'dark' ? '#1e293b' : '#475569';
        const insulatorColor = currentTheme === 'dark' ? '#cbd5e1' : '#e2e8f0';

        // 3. Background distant utility poles (Distant layer on mountains)
        const bgPoles = [
            { x: 190, baseY: CANVAS_HEIGHT - 110, h: 80 },
            { x: 440, baseY: CANVAS_HEIGHT - 85, h: 75 },
            { x: 710, baseY: CANVAS_HEIGHT - 125, h: 85 }
        ];
        bgPoles.forEach(p => {
            const pTop = p.baseY - p.h;
            ctx.fillStyle = poleColorDim;
            ctx.fillRect(p.x - 2, pTop, 4, p.h);
            ctx.fillRect(p.x - 12, pTop + 6, 24, 3);
        });

        // Distant background wires (following mountain silhouettes naturally)
        drawPixelWire(-40, CANVAS_HEIGHT - 170, bgPoles[0].x, bgPoles[0].baseY - bgPoles[0].h + 6, 12, wireColorThin, 4);
        drawPixelWire(bgPoles[0].x, bgPoles[0].baseY - bgPoles[0].h + 6, bgPoles[1].x, bgPoles[1].baseY - bgPoles[1].h + 6, 22, wireColorThin, 4);
        drawPixelWire(bgPoles[1].x, bgPoles[1].baseY - bgPoles[1].h + 6, bgPoles[2].x, bgPoles[2].baseY - bgPoles[2].h + 6, 18, wireColorThin, 4);
        drawPixelWire(bgPoles[2].x, bgPoles[2].baseY - bgPoles[2].h + 6, CANVAS_WIDTH + 40, CANVAS_HEIGHT - 180, 16, wireColorThin, 4);

        // 4. Foreground utility poles definition with natural terrain elevation
        const fgPoles = [
            { x: 75, baseY: groundBaseY - 35, h: 145, hasTransformer: true, hasGuyWire: true, guyLeft: true },
            { x: 285, baseY: groundBaseY, h: 165, hasTransformer: false, hasGuyWire: false },
            { x: 520, baseY: groundBaseY - 45, h: 135, hasTransformer: true, hasGuyWire: true, guyLeft: false },
            { x: 750, baseY: groundBaseY - 25, h: 150, hasTransformer: false, hasGuyWire: false },
            { x: 940, baseY: groundBaseY, h: 160, hasTransformer: true, hasGuyWire: true, guyLeft: false }
        ];

        // 5. Draw Dense Criss-Crossing Foreground Wires with dynamic vertical sags & randomness
        // Left entry wires from mountain edge
        const p0 = fgPoles[0];
        const p0Top = p0.baseY - p0.h;
        drawPixelWire(-40, p0Top + 15, p0.x - 20, p0Top + 8, 10, wireColorMain);
        drawPixelWire(-40, p0Top + 5, p0.x, p0Top + 4, 14, wireColorMain);
        drawPixelWire(-40, p0Top + 25, p0.x + 20, p0Top + 8, 8, wireColorMain);
        drawPixelWire(-40, p0Top + 45, p0.x - 14, p0Top + 28, 20, wireColorDim);

        // Main inter-pole spans with varied vertical sags
        for (let i = 0; i < fgPoles.length - 1; i++) {
            const p1 = fgPoles[i];
            const p2 = fgPoles[i + 1];
            const t1 = p1.baseY - p1.h;
            const t2 = p2.baseY - p2.h;

            // Wire 1: Top left arm (tight tension, small sag)
            const sag1 = 10 + (i % 3) * 4;
            drawPixelWire(p1.x - 20, t1 + 8, p2.x - 20, t2 + 8, sag1, wireColorMain);

            // Wire 2: Center peak (medium sag)
            const sag2 = 18 + ((i * 5) % 8);
            drawPixelWire(p1.x, t1 + 4, p2.x, t2 + 4, sag2, wireColorMain);

            // Wire 3: Top right arm (varied sag)
            const sag3 = 14 + ((i * 7) % 10);
            drawPixelWire(p1.x + 20, t1 + 8, p2.x + 20, t2 + 8, sag3, wireColorMain);

            // Wire 4 & 5: Second crossbar distribution wires (dramatically sagging)
            const sagDist1 = 26 + (i * 6) % 14;
            const sagDist2 = 34 - (i * 4) % 12;
            drawPixelWire(p1.x - 14, t1 + 28, p2.x - 14, t2 + 28, sagDist1, wireColorDim);
            drawPixelWire(p1.x + 14, t1 + 28, p2.x + 14, t2 + 28, sagDist2, wireColorDim);

            // Wire 6: Low service droop (deep hanging loop on alternating spans)
            if (i % 2 === 0) {
                drawPixelWire(p1.x + 8, t1 + 48, p2.x - 8, t2 + 42, 42, wireColorDim);
            } else {
                drawPixelWire(p1.x - 8, t1 + 42, p2.x + 8, t2 + 48, 38, wireColorThin);
            }
        }

        // Long-distance skipping wire (P0 -> P2, hanging down low across terrain)
        const p2 = fgPoles[2];
        drawPixelWire(p0.x + 18, p0Top + 32, p2.x - 18, p2.baseY - p2.h + 32, 52, wireColorThin);

        // Another long-distance wire (P2 -> P4)
        const p4 = fgPoles[4];
        drawPixelWire(p2.x + 18, p2.baseY - p2.h + 32, p4.x - 18, p4.baseY - p4.h + 32, 48, wireColorThin);

        // Right exit wires to off-screen
        const lastPole = fgPoles[fgPoles.length - 1];
        const lastTop = lastPole.baseY - lastPole.h;
        drawPixelWire(lastPole.x - 20, lastTop + 8, CANVAS_WIDTH + 40, lastTop + 20, 12, wireColorMain);
        drawPixelWire(lastPole.x, lastTop + 4, CANVAS_WIDTH + 40, lastTop + 14, 16, wireColorMain);
        drawPixelWire(lastPole.x + 20, lastTop + 8, CANVAS_WIDTH + 40, lastTop + 26, 10, wireColorMain);
        drawPixelWire(lastPole.x + 14, lastTop + 28, CANVAS_WIDTH + 40, lastTop + 46, 24, wireColorDim);

        // 6. Draw Detailed Foreground Poles & Fixtures
        fgPoles.forEach(p => {
            const px = p.x;
            const topY = p.baseY - p.h;
            const pHeight = p.h;

            // Main pole shaft
            ctx.fillStyle = poleColor;
            ctx.fillRect(px - 4, topY, 8, pHeight);

            // Pole footholds / climbing steps (alternating studs)
            for (let stepY = topY + 40; stepY < p.baseY - 15; stepY += 16) {
                const side = (stepY % 32 === 0) ? -7 : 5;
                ctx.fillStyle = currentTheme === 'dark' ? '#94a3b8' : '#475569';
                ctx.fillRect(px + side, stepY, 3, 2);
            }

            // Top crossbar (high-voltage arm)
            ctx.fillStyle = poleColor;
            ctx.fillRect(px - 24, topY + 8, 48, 5);
            // Diagonal brace for top crossbar
            drawPixelLine(px - 14, topY + 13, px, topY + 24, poleColor, 2);
            drawPixelLine(px + 14, topY + 13, px, topY + 24, poleColor, 2);

            // White Insulators on top crossbar
            ctx.fillStyle = insulatorColor;
            ctx.fillRect(px - 22, topY + 4, 4, 4);
            ctx.fillRect(px - 2, topY, 4, 6);
            ctx.fillRect(px + 18, topY + 4, 4, 4);

            // Second crossbar (distribution arm)
            ctx.fillStyle = poleColor;
            ctx.fillRect(px - 18, topY + 28, 36, 4);
            ctx.fillStyle = insulatorColor;
            ctx.fillRect(px - 16, topY + 25, 3, 3);
            ctx.fillRect(px + 13, topY + 25, 3, 3);

            // Transformer barrel (if pole has one)
            if (p.hasTransformer) {
                const tx = px + 6;
                const ty = topY + 40;
                // Bracket
                ctx.fillStyle = poleColor;
                ctx.fillRect(px + 4, ty + 4, 6, 12);
                // Transformer canister
                ctx.fillStyle = currentTheme === 'dark' ? '#334155' : '#475569';
                ctx.fillRect(tx, ty, 16, 22);
                ctx.fillStyle = currentTheme === 'dark' ? '#475569' : '#64748b';
                ctx.fillRect(tx + 2, ty + 2, 12, 18);
                // Bushings (terminal tops)
                ctx.fillStyle = insulatorColor;
                ctx.fillRect(tx + 2, ty - 3, 3, 3);
                ctx.fillRect(tx + 10, ty - 3, 3, 3);
                // Loop wire from transformer down to pole
                drawPixelWire(tx + 3, ty - 3, px, topY + 32, 6, wireColorMain, 2);
            }

            // Guy wire (diagonal ground anchor)
            if (p.hasGuyWire) {
                const anchorX = p.guyLeft ? px - 55 : px + 55;
                const anchorY = p.baseY;
                drawPixelLine(px, topY + 30, anchorX, anchorY, wireColorDim, 2);
                // Yellow/Orange safety sleeve near ground
                ctx.fillStyle = '#facc15';
                drawPixelLine(anchorX - (p.guyLeft ? -10 : 10), anchorY - 15, anchorX, anchorY, '#facc15', 3);
            }
        });

        // 7. Cute dot bird sitting on wire
        const birdX = fgPoles[1].x + 70;
        const birdT1 = fgPoles[1].baseY - fgPoles[1].h;
        const birdT2 = fgPoles[2].baseY - fgPoles[2].h;
        const birdY = (birdT1 + birdT2) / 2 + 18;
        ctx.fillStyle = currentTheme === 'dark' ? '#f8fafc' : '#0f172a';
        ctx.fillRect(birdX, birdY - 5, 4, 4); // body
        ctx.fillRect(birdX + 3, birdY - 7, 3, 3); // head
        ctx.fillStyle = '#f97316';
        ctx.fillRect(birdX + 6, birdY - 6, 2, 1); // beak
    }

    // Stages 12-14: Road & Vehicles
    if (state.currentStage >= 12 && state.currentStage <= 14) {
        // Ground road
        ctx.fillStyle = currentTheme === 'dark' ? '#1e293b' : '#334155';
        ctx.fillRect(0, CANVAS_HEIGHT - 40, CANVAS_WIDTH, 40);

        // Road white dashed lines
        ctx.fillStyle = '#f8fafc';
        for (let x = 10; x < CANVAS_WIDTH; x += 50) {
            ctx.fillRect(x, CANVAS_HEIGHT - 22, 25, 4);
        }

        // Draw cars (two-way traffic: eastbound vs westbound)
        state.cars.forEach(car => {
            const cx = car.x;
            const cy = car.y;
            const dir = car.dir || -1;
            ctx.fillStyle = car.color;

            if (car.type === 'truck') {
                if (dir === -1) {
                    // Westbound truck (facing left)
                    ctx.fillRect(cx, cy - 8, 44, 20); // Cargo
                    ctx.fillRect(cx - 8, cy - 2, 10, 14); // Cabin
                    // Window
                    ctx.fillStyle = currentTheme === 'dark' ? '#0f172a' : '#cbd5e1';
                    ctx.fillRect(cx - 6, cy, 6, 6);
                    // Wheels
                    ctx.fillStyle = '#020617';
                    ctx.fillRect(cx - 4, cy + 10, 6, 6);
                    ctx.fillRect(cx + 28, cy + 10, 6, 6);
                    // Headlight (front left)
                    ctx.fillStyle = '#fef08a';
                    ctx.fillRect(cx - 9, cy + 3, 2, 4);
                    // Taillight (rear right)
                    ctx.fillStyle = '#991b1b';
                    ctx.fillRect(cx + 43, cy + 3, 2, 4);
                } else {
                    // Eastbound truck (facing right)
                    ctx.fillRect(cx - 36, cy - 8, 44, 20); // Cargo
                    ctx.fillRect(cx + 6, cy - 2, 10, 14); // Cabin
                    // Window
                    ctx.fillStyle = currentTheme === 'dark' ? '#0f172a' : '#cbd5e1';
                    ctx.fillRect(cx + 8, cy, 6, 6);
                    // Wheels
                    ctx.fillStyle = '#020617';
                    ctx.fillRect(cx - 26, cy + 10, 6, 6);
                    ctx.fillRect(cx + 6, cy + 10, 6, 6);
                    // Headlight (front right)
                    ctx.fillStyle = '#fef08a';
                    ctx.fillRect(cx + 15, cy + 3, 2, 4);
                    // Taillight (rear left)
                    ctx.fillStyle = '#991b1b';
                    ctx.fillRect(cx - 37, cy + 3, 2, 4);
                }
            } else {
                if (dir === -1) {
                    // Westbound sedan (facing left)
                    ctx.fillRect(cx, cy, 36, 12); // Body
                    ctx.fillRect(cx + 8, cy - 8, 18, 8); // Roof
                    // Windows
                    ctx.fillStyle = currentTheme === 'dark' ? '#0f172a' : '#cbd5e1';
                    ctx.fillRect(cx + 10, cy - 6, 6, 5);
                    ctx.fillRect(cx + 18, cy - 6, 6, 5);
                    // Wheels
                    ctx.fillStyle = '#020617';
                    ctx.fillRect(cx + 5, cy + 10, 6, 6);
                    ctx.fillRect(cx + 25, cy + 10, 6, 6);
                    // Headlight
                    ctx.fillStyle = '#fef08a';
                    ctx.fillRect(cx - 1, cy + 2, 2, 4);
                    // Taillight
                    ctx.fillStyle = '#991b1b';
                    ctx.fillRect(cx + 35, cy + 2, 2, 4);
                } else {
                    // Eastbound sedan (facing right)
                    ctx.fillRect(cx - 18, cy, 36, 12); // Body
                    ctx.fillRect(cx - 8, cy - 8, 18, 8); // Roof
                    // Windows
                    ctx.fillStyle = currentTheme === 'dark' ? '#0f172a' : '#cbd5e1';
                    ctx.fillRect(cx - 6, cy - 6, 6, 5);
                    ctx.fillRect(cx + 2, cy - 6, 6, 5);
                    // Wheels
                    ctx.fillStyle = '#020617';
                    ctx.fillRect(cx - 13, cy + 10, 6, 6);
                    ctx.fillRect(cx + 7, cy + 10, 6, 6);
                    // Headlight
                    ctx.fillStyle = '#fef08a';
                    ctx.fillRect(cx + 17, cy + 2, 2, 4);
                    // Taillight
                    ctx.fillStyle = '#991b1b';
                    ctx.fillRect(cx - 19, cy + 2, 2, 4);
                }
            }
        });
    }

    // Stage 12: Single unlit house (Pixel-art style)
    if (state.currentStage === 12) {
        const hx = 740;
        const hy = CANVAS_HEIGHT - 95;
        const unlitWinColor = currentTheme === 'dark' ? '#020617' : '#334155';

        // Chimney (pixel blocks)
        ctx.fillStyle = currentTheme === 'dark' ? '#334155' : '#78350f';
        ctx.fillRect(hx + 56, hy - 4, 10, 16);
        ctx.fillRect(hx + 54, hy - 6, 14, 3);

        // Stepped Pixel Roof (Gable roof built with horizontal pixel tiers)
        const roofColor = currentTheme === 'dark' ? '#334155' : '#831843';
        const roofTiers = [
            { dx: 38, w: 6, h: 4 },
            { dx: 34, w: 14, h: 4 },
            { dx: 28, w: 26, h: 4 },
            { dx: 22, w: 38, h: 4 },
            { dx: 14, w: 54, h: 4 },
            { dx: 6, w: 70, h: 4 },
            { dx: 0, w: 82, h: 4 }
        ];
        ctx.fillStyle = roofColor;
        roofTiers.forEach((tier, idx) => {
            ctx.fillRect(hx + tier.dx, hy + idx * 4, tier.w, tier.h);
        });

        // Walls (Pixel brickwork)
        const wallColor = currentTheme === 'dark' ? '#1e293b' : '#cbd5e1';
        ctx.fillStyle = wallColor;
        ctx.fillRect(hx + 6, hy + 28, 70, 28);
        ctx.fillStyle = currentTheme === 'dark' ? '#0f172a' : '#94a3b8';
        ctx.fillRect(hx + 4, hy + 52, 74, 4); // Foundation

        // 100% Unlit Dark Windows
        ctx.fillStyle = unlitWinColor;
        ctx.fillRect(hx + 14, hy + 33, 14, 14);
        ctx.fillRect(hx + 48, hy + 33, 14, 14);
        // Window frames
        ctx.fillStyle = currentTheme === 'dark' ? '#0f172a' : '#64748b';
        ctx.fillRect(hx + 20, hy + 33, 2, 14);
        ctx.fillRect(hx + 14, hy + 39, 14, 2);
        ctx.fillRect(hx + 54, hy + 33, 2, 14);
        ctx.fillRect(hx + 48, hy + 39, 14, 2);

        // Wooden Door
        ctx.fillStyle = currentTheme === 'dark' ? '#0f172a' : '#78350f';
        ctx.fillRect(hx + 32, hy + 36, 12, 16);
        ctx.fillStyle = currentTheme === 'dark' ? '#334155' : '#d97706';
        ctx.fillRect(hx + 41, hy + 44, 2, 2); // Doorknob
    }

    // Stage 13: Convenience store & houses (33% lit windows unified with #fef08a)
    if (state.currentStage === 13) {
        const unlitWinColor = currentTheme === 'dark' ? '#020617' : '#334155';
        const litWinColor = '#fef08a';

        // Convenience store
        const cvx = 80;
        const cvy = CANVAS_HEIGHT - 105;
        ctx.fillStyle = currentTheme === 'dark' ? '#1e293b' : '#f8fafc';
        ctx.fillRect(cvx, cvy + 15, 120, 50);
        // Store sign stripes
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(cvx, cvy, 120, 5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(cvx, cvy + 5, 120, 5);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(cvx, cvy + 10, 120, 5);
        // Store glass window & interior glow (#fef08a)
        ctx.fillStyle = currentTheme === 'dark' ? litWinColor : '#bae6fd';
        ctx.fillRect(cvx + 10, cvy + 25, 100, 30);
        ctx.fillStyle = currentTheme === 'dark' ? '#1e293b' : '#0f172a';
        ctx.fillRect(cvx + 55, cvy + 25, 4, 30);

        // Residential houses (33% of windows lit, unified with #fef08a)
        const houses = [
            { x: 420, y: CANVAS_HEIGHT - 95, w: 65, h: 30, roofColor: '#831843' },
            { x: 530, y: CANVAS_HEIGHT - 100, w: 75, h: 35, roofColor: '#1e3a5f' },
            { x: 780, y: CANVAS_HEIGHT - 95, w: 70, h: 30, roofColor: '#164e63' },
            { x: 890, y: CANVAS_HEIGHT - 105, w: 80, h: 40, roofColor: '#78350f' }
        ];
        houses.forEach((h, hIdx) => {
            // Stepped pixel roof
            ctx.fillStyle = currentTheme === 'dark' ? '#334155' : h.roofColor;
            const steps = 5;
            const stepH = 4;
            for (let s = 0; s < steps; s++) {
                const inset = (steps - s - 1) * 6;
                ctx.fillRect(h.x + inset, h.y + s * stepH, h.w - inset * 2 + 8, stepH);
            }

            // Walls
            ctx.fillStyle = currentTheme === 'dark' ? '#1e293b' : '#cbd5e1';
            ctx.fillRect(h.x + 4, h.y + steps * stepH, h.w, h.h);

            // Windows (1 out of 3 lit = 33%)
            const isLeftLit = (hIdx % 3 === 0);
            const isRightLit = (hIdx % 3 === 1);

            ctx.fillStyle = isLeftLit ? (currentTheme === 'dark' ? litWinColor : '#fef08a') : unlitWinColor;
            ctx.fillRect(h.x + 10, h.y + 26, 12, 12);

            ctx.fillStyle = isRightLit ? (currentTheme === 'dark' ? litWinColor : '#fef08a') : unlitWinColor;
            ctx.fillRect(h.x + h.w - 18, h.y + 26, 12, 12);
        });
    }

    // Stage 14: Big city skyline & airplane (67% lit windows with rich color variation & dark unlit windows)
    if (state.currentStage === 14) {
        const unlitWinColor = currentTheme === 'dark' ? '#020617' : '#334155';
        // Rich random light palette for city building windows
        const litPalettesDark = ['#fef08a', '#fef9c3', '#fed7aa', '#bae6fd', '#fde047', '#fef08a'];
        const litPalettesLight = ['#ffffff', '#f8fafc', '#fef08a', '#e0f2fe'];

        // High-rise city buildings
        const buildings = [
            { x: 30, w: 70, h: 180 },
            { x: 110, w: 90, h: 260 },
            { x: 210, w: 60, h: 150 },
            { x: 280, w: 100, h: 290 },
            { x: 390, w: 80, h: 210 },
            { x: 480, w: 110, h: 320 },
            { x: 600, w: 75, h: 190 },
            { x: 685, w: 95, h: 280 },
            { x: 790, w: 80, h: 230 },
            { x: 880, w: 110, h: 270 }
        ];

        buildings.forEach((b, bIdx) => {
            const bx = b.x;
            const by = CANVAS_HEIGHT - 40 - b.h;
            // Building body
            ctx.fillStyle = currentTheme === 'dark' ? '#0f172a' : '#cbd5e1';
            ctx.fillRect(bx, by, b.w, b.h);
            ctx.strokeStyle = currentTheme === 'dark' ? '#1e293b' : '#94a3b8';
            ctx.strokeRect(bx, by, b.w, b.h);

            // Window grid (67% lit with room-by-room light variations)
            const rows = Math.floor((b.h - 20) / 16);
            const cols = Math.floor((b.w - 16) / 14);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const winSeed = (bIdx * 37 + r * 13 + c * 7);
                    const isLit = (winSeed % 3 !== 0); // 67% lit
                    const wx = bx + 10 + c * 14;
                    const wy = by + 12 + r * 16;
                    if (isLit) {
                        const palette = currentTheme === 'dark' ? litPalettesDark : litPalettesLight;
                        ctx.fillStyle = palette[winSeed % palette.length];
                    } else {
                        ctx.fillStyle = unlitWinColor;
                    }
                    ctx.fillRect(wx, wy, 8, 10);
                }
            }
        });

        // Airplane
        state.airplanes.forEach(plane => {
            const px = plane.x;
            const py = plane.y;
            // Plane fuselage & wings
            ctx.fillStyle = currentTheme === 'dark' ? '#e2e8f0' : '#475569';
            ctx.fillRect(px, py, 36, 6);
            ctx.fillRect(px + 12, py - 8, 8, 22);
            ctx.fillRect(px - 2, py - 6, 6, 8);
            // Cockpit
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(px + 30, py + 1, 4, 3);
            // Flashing collision lights
            const flash = Math.floor(Date.now() / 200) % 2 === 0;
            ctx.fillStyle = flash ? '#ef4444' : '#ffffff';
            ctx.fillRect(px + 15, py - 9, 2, 2);
            ctx.fillStyle = flash ? '#22c55e' : '#ffffff';
            ctx.fillRect(px + 15, py + 13, 2, 2);
        });
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
        else if (bull.type === 'BUSY_ROCKET') bText = "BUSY";
        else if (bull.type === 'SERVICE_PACKET') bText = "SRV";
        else if (bull.type === 'UNAVAILABLE_ROCKET') bText = "UNAV";
        else if (bull.type === 'BOM_SHRAPNEL') bText = bull.char;
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
        } else if (bull.type === 'BUSY_ROCKET' || bull.type === 'SERVICE_PACKET') {
            bColor = (Math.floor(Date.now() / 120) % 2 === 0) ? '#ef4444' : textColor;
        } else if (bull.type === 'UNAVAILABLE_ROCKET' || bull.type === 'BOM_SHRAPNEL') {
            bColor = (Math.floor(Date.now() / 100) % 2 === 0) ? '#ef4444' : textColor;
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
