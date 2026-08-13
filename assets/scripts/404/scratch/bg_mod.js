const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../update.js');
let content = fs.readFileSync(file, 'utf8');

const target = `        if (state.currentStage >= 2) {
            if (state.currentStage !== 5 && state.currentStage <= 10) {`;

const replacement = `        if (state.currentStage === 7) {
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
            if (state.currentStage !== 5 && state.currentStage <= 10) {`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('Tumbleweeds and Cacti logic added to update.js.');
