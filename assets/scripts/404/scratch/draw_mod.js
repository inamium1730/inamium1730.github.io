const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../draw.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Add background drawing logic
const bgTarget = `    if (state.currentStage === 5) {
        ctx.fillStyle = currentTheme === 'dark' ? '#333' : '#ccc';
        ctx.fillRect(0, CANVAS_HEIGHT - 30, CANVAS_WIDTH, 30);
    }`;

const bgReplacement = `    if (state.currentStage === 5) {
        ctx.fillStyle = currentTheme === 'dark' ? '#333' : '#ccc';
        ctx.fillRect(0, CANVAS_HEIGHT - 30, CANVAS_WIDTH, 30);
    }
    
    if (state.currentStage >= 7 && state.currentStage <= 9) {
        // Draw desert ground
        ctx.fillStyle = currentTheme === 'dark' ? '#3e2723' : '#fde047'; // dark brown or sand
        ctx.fillRect(0, CANVAS_HEIGHT - 100, CANVAS_WIDTH, 100);

        // Draw sun/moon
        ctx.fillStyle = currentTheme === 'dark' ? '#fef08a' : '#ef4444'; // moon or sun
        let sunX = CANVAS_WIDTH - 200, sunY = 150, sunSize = 60;
        ctx.fillRect(sunX, sunY, sunSize, sunSize);
        // Simple pixel art for sun/moon
        ctx.fillStyle = currentTheme === 'dark' ? '#111' : '#facc15';
        ctx.fillRect(sunX + 10, sunY + 10, 15, 15);
        ctx.fillRect(sunX + 35, sunY + 30, 15, 15);

        if (state.currentStage === 7) {
            // Tumbleweeds
            ctx.fillStyle = currentTheme === 'dark' ? '#a16207' : '#713f12';
            ctx.font = '30px "Press Start 2P"';
            state.tumbleweeds.forEach(t => {
                ctx.save();
                ctx.translate(t.x, t.y);
                ctx.rotate(t.rotation);
                ctx.fillText('*', 0, 0);
                ctx.restore();
            });
        }

        if (state.currentStage >= 8) {
            // Cacti
            ctx.fillStyle = currentTheme === 'dark' ? '#14532d' : '#22c55e';
            state.cacti.forEach(c => {
                ctx.fillRect(c.x, c.y, 20, c.h); // Main trunk
                ctx.fillRect(c.x - 20, c.y + 20, 20, 10); // Left arm
                ctx.fillRect(c.x - 20, c.y + 10, 10, 20); // Left arm up
                ctx.fillRect(c.x + 20, c.y + 40, 20, 10); // Right arm
                ctx.fillRect(c.x + 30, c.y + 20, 10, 30); // Right arm up
            });
        }
        
        if (state.currentStage === 9) {
            // Glitch effect in background: black rects with chromatic aberration
            if (Math.random() < 0.3) {
                for (let i=0; i<3; i++) {
                    let gx = Math.random() * CANVAS_WIDTH;
                    let gy = Math.random() * CANVAS_HEIGHT;
                    let gw = 50 + Math.random() * 150;
                    let gh = 20 + Math.random() * 80;
                    
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.fillRect(gx - 5, gy, gw, gh);
                    ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
                    ctx.fillRect(gx + 5, gy, gw, gh);
                    ctx.fillStyle = '#000';
                    ctx.fillRect(gx, gy, gw, gh);
                }
            }
        }
    }`;
content = content.replace(bgTarget, bgReplacement);

// 2. Add paddle mud color
const pColorTarget = `    } else if (isPenaltyBlink && Math.floor(Date.now() / 250) % 2 === 0) {
        pColor = '#ef4444';
    }`;

const pColorReplacement = `    } else if (isPenaltyBlink && Math.floor(Date.now() / 250) % 2 === 0) {
        pColor = '#ef4444';
    } else if (Date.now() < (state.paddle.mudEndTime || 0)) {
        let mudColor = currentTheme === 'dark' ? '#78350f' : '#451a03'; // Dark brown
        pColor = (Math.floor(Date.now() / 250) % 2 === 0) ? mudColor : textColor;
    }`;
content = content.replace(pColorTarget, pColorReplacement);

// 3. Enemy Bullet Text and Color
const bTextTarget = `            let bText = "404";
            if (bull.type === 'FOUND') bText = "FOUND";
            else if (bull.type === 'ERROR_BULLET' || bull.type === 'SCATTERED_BULLET') bText = "ERROR";
            else if (bull.type === '404NOTFOUND_BASE') bText = "404NOTFOUND";
            else if (bull.type === '404NOTFOUND_SHRAPNEL') bText = bull.char;`;

const bTextReplacement = `            let bText = "404";
            if (bull.type === 'FOUND') bText = "FOUND";
            else if (bull.type === 'ERROR_BULLET' || bull.type === 'SCATTERED_BULLET') bText = "ERROR";
            else if (bull.type === '404NOTFOUND_BASE') bText = "404NOTFOUND";
            else if (bull.type === '404NOTFOUND_SHRAPNEL') bText = bull.char;
            else if (bull.type === 'MUD') bText = "mud";
            else if (bull.type === 'MUD_SHRAPNEL') bText = bull.char;
            else if (bull.type === 'LASER') return; // Handled separately`;
content = content.replace(bTextTarget, bTextReplacement);

const bColorTarget = `            } else if (bull.type === 'SCATTERED_BULLET') {
                bColor = (Math.floor(Date.now() / 100) % 2 === 0) ? '#ef4444' : textColor;
            }`;

const bColorReplacement = `            } else if (bull.type === 'SCATTERED_BULLET') {
                bColor = (Math.floor(Date.now() / 100) % 2 === 0) ? '#ef4444' : textColor;
            } else if (bull.type === 'MUD' || bull.type === 'MUD_SHRAPNEL') {
                bColor = currentTheme === 'dark' ? '#78350f' : '#451a03';
            }`;
content = content.replace(bColorTarget, bColorReplacement);

// 4. Enemy Rendering (Add DENIED, ACCESS, FORBIDDEN and laser aiming)
const enemyTarget = `        state.enemies.forEach(en => {
            ctx.fillStyle = textColor;
            if (en.type === 'FOUND') {`;

const enemyReplacement = `        state.enemyBullets.forEach(bull => {
            if (bull.type === 'LASER') {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
                ctx.fillRect(bull.x - bull.w / 2, bull.y, bull.w, bull.h);
            }
        });

        state.enemies.forEach(en => {
            if (en.actionState === 'AIMING' || en.actionState === 'LOCKING') {
                ctx.strokeStyle = en.actionState === 'AIMING' ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.9)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(en.x, en.y + 20);
                ctx.lineTo(en.aimTargetX, CANVAS_HEIGHT);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            ctx.fillStyle = textColor;
            if (en.type === 'FOUND') {`;
content = content.replace(enemyTarget, enemyReplacement);

// Fix chars for DENIED, ACCESS, FORBIDDEN
const notTarget = `            } else {
                let chars = ['N', 'O', 'T'];`;

const notReplacement = `            } else if (en.type === 'DENIED') {
                let chars = ['D', 'E', 'N', 'I', 'E', 'D'];
                let offsets = [-80, -48, -16, 16, 48, 80];
                chars.forEach((c, idx) => {
                    ctx.globalAlpha = (en.hp > idx) ? 1.0 : 0.3;
                    ctx.fillText(c, en.x + offsets[idx], en.y + en.h / 2);
                });
            } else if (en.type === 'ACCESS') {
                let chars = ['A', 'C', 'C', 'E', 'S', 'S'];
                let offsets = [-80, -48, -16, 16, 48, 80];
                chars.forEach((c, idx) => {
                    ctx.globalAlpha = (en.hp > idx) ? 1.0 : 0.3;
                    ctx.fillText(c, en.x + offsets[idx], en.y + en.h / 2);
                });
            } else if (en.type === 'FORBIDDEN') {
                let chars = ['F', 'O', 'R', 'B', 'I', 'D', 'D', 'E', 'N'];
                let offsets = [-128, -96, -64, -32, 0, 32, 64, 96, 128];
                chars.forEach((c, idx) => {
                    ctx.globalAlpha = (en.hp > idx) ? 1.0 : 0.3;
                    ctx.fillText(c, en.x + offsets[idx], en.y + en.h / 2);
                });
            } else {
                let chars = ['N', 'O', 'T'];`;
content = content.replace(notTarget, notReplacement);

// Stage Names
const stageNamesTarget = `const stageNames = ["", "404", "NOT", "FOUND", "ERROR", "404"];`;
const stageNamesReplacement = `const stageNames = ["", "404", "NOT", "FOUND", "ERROR", "404", "403", "DENIED", "ACCESS", "FORBIDDEN", "403"];`;
content = content.replace(stageNamesTarget, stageNamesReplacement);

fs.writeFileSync(file, content);
console.log('draw.js modified successfully.');
