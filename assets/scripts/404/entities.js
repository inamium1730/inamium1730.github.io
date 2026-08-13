import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP1, MAP2, MAP3, MAP4, MAP5 } from './constants.js';
import { state } from './state.js';
import { playBeep } from './audio.js';
import { currentTheme } from './theme.js';

export const initBlocks = () => {
    state.blocks = [];
    const blockW = 18;
    const blockH = 24;
    let selectedMap = MAP1;
    if (state.currentStage === 2) selectedMap = MAP2;
    if (state.currentStage === 3) selectedMap = MAP3;
    if (state.currentStage === 4) selectedMap = MAP4;
    if (state.currentStage === 5) selectedMap = MAP5;

    let lCount = 0; let fCount = 0; let rCount = 0;

    const startX = (CANVAS_WIDTH - (selectedMap[0].length * blockW)) / 2;
    const startY = 100;
    for (let r = 0; r < selectedMap.length; r++) {
        for (let c = 0; c < selectedMap[r].length; c++) {
            let char = selectedMap[r][c];
            if (char !== ' ') {
                let part = null;
                if (state.currentStage === 5) {
                    if (char === 'L') { part = 'leftHand'; char = '4'; lCount++; }
                    else if (char === 'F') { part = 'face'; char = '0'; fCount++; }
                    else if (char === 'R') { part = 'rightHand'; char = '4'; rCount++; }
                }
                state.blocks.push({
                    x: startX + c * blockW,
                    y: startY + r * blockH,
                    w: blockW,
                    h: blockH,
                    char: char,
                    active: true,
                    itemType: null,
                    part: part,
                    baseX: startX + c * blockW,
                    baseY: startY + r * blockH
                });
            }
        }
    }

    if (state.currentStage === 5) {
        state.bossState.active = true;
        state.bossState.stunUntil = 0;
        state.bossState.leftHand = { state: 'IDLE', timer: Date.now() + 2000, xOffset: 0, yOffset: 0, targetX: 0, hit: false, hp: lCount, maxHp: lCount };
        state.bossState.rightHand = { state: 'IDLE', timer: Date.now() + 5000, xOffset: 0, yOffset: 0, targetX: 0, hit: false, hp: rCount, maxHp: rCount };
        state.bossState.face = { state: 'IDLE', timer: Date.now() + 30000, xOffset: 0, yOffset: 0, hp: fCount, maxHp: fCount };
        state.bossState.twoEnemiesStartTime = 0;
    } else {
        state.bossState.active = false;
    }

    let totalBlocksCount = state.blocks.length;
    let nBuffCount = Math.round(totalBlocksCount * 0.04);
    let normal3Count = Math.round(totalBlocksCount * 0.01);
    let normal2Count = Math.round(totalBlocksCount * 0.01);
    let normal1Count = Math.round(totalBlocksCount * 0.02);

    let typesToAssign = [];
    for (let i = 0; i < nBuffCount; i++) typesToAssign.push('nbuff');
    for (let i = 0; i < normal3Count; i++) typesToAssign.push('normal_3');
    for (let i = 0; i < normal2Count; i++) typesToAssign.push('normal_2');
    for (let i = 0; i < normal1Count; i++) typesToAssign.push('normal_1');

    if (state.currentStage === 5) {
        let handIndices = [];
        let faceIndices = [];
        for (let i = 0; i < state.blocks.length; i++) {
            if (state.blocks[i].part === 'leftHand' || state.blocks[i].part === 'rightHand') handIndices.push(i);
            else if (state.blocks[i].part === 'face') faceIndices.push(i);
        }

        for (let type of typesToAssign) {
            let useHand = Math.random() < 0.8;
            if (useHand && handIndices.length === 0) useHand = false;
            if (!useHand && faceIndices.length === 0) useHand = true;

            let targetList = useHand ? handIndices : faceIndices;
            if (targetList.length === 0) break;

            let randIdx = Math.floor(Math.random() * targetList.length);
            let blockIdx = targetList[randIdx];
            state.blocks[blockIdx].itemType = type;
            targetList.splice(randIdx, 1);
        }
    } else {
        let availableIndices = Array.from({ length: state.blocks.length }, (_, i) => i);

        for (let type of typesToAssign) {
            if (availableIndices.length === 0) break;
            let randIdx = Math.floor(Math.random() * availableIndices.length);
            let blockIdx = availableIndices[randIdx];
            state.blocks[blockIdx].itemType = type;
            availableIndices.splice(randIdx, 1);
        }
    }
};

export const spawnBall = () => {
    if (state.reserve.length === 0) return false;
    let char = state.reserve.shift();

    state.paddle.destroyed = false;
    state.paddle.ndEndTime = 0;
    state.paddle.foundEndTime = 0;
    state.paddle.text = 'NOTFOUND';
    state.paddle.w = 260;
    state.paddle.x = CANVAS_WIDTH / 2 - state.paddle.w / 2;

    state.balls.push({
        x: state.paddle.x + state.paddle.w / 2,
        y: state.paddle.y - 20,
        vx: (Math.random() > 0.5 ? 1 : -1) * 1.25,
        vy: -2,
        size: 20,
        char: char,
        color: null,
        isEnhanced: false
    });
    state.paddle.nBuffEndTime = 0;
    state.paddle.isSpawning = true;
    state.paddle.invincibleEndTime = 0;
    return true;
};

export const spawnPaddleParticles = () => {
    for (let i = 0; i < 40; i++) {
        state.particles.push({
            x: state.paddle.x + Math.random() * state.paddle.w,
            y: state.paddle.y + Math.random() * state.paddle.h,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            size: Math.random() * 8 + 4,
            color: currentTheme === 'dark' ? '#ef4444' : '#dc2626',
            life: 30 + Math.random() * 40,
            maxLife: 70
        });
    }
    playBeep(150);
};

export const resetGame = (advanceStage = false) => {
    if (advanceStage) {
        let nextStage = state.currentStage >= 5 ? 1 : state.currentStage + 1;
        let maxStage = parseInt(localStorage.getItem('404_max_stage') || '1', 10);
        if (state.currentStage < 5 && nextStage > maxStage) {
            localStorage.setItem('404_max_stage', nextStage);
        }
        if (state.currentStage === 5) {
            localStorage.setItem('404_max_stage', 5);
        }
        state.currentStage = nextStage;
    }
    state.score = 0;
    state.reserve = ['4', '0', '4'];

    state.enemies = [];
    state.enemyBullets = [];
    state.particles = [];
    state.lastEnemySpawnTime = Date.now();
    state.enemySpawnCount = 0;
    
    state.paddle.foundEndTime = 0;
    state.paddle.ndEndTime = 0;
    state.paddle.destroyed = false;
    state.paddle.w = 260;
    state.paddle.text = 'NOTFOUND';

    state.balls = [];
    state.items = [];
    state.globalSpeedMult = 1.75;
    
    state.paddle.y = CANVAS_HEIGHT - 60;
    state.paddle.x = CANVAS_WIDTH / 2 - state.paddle.w / 2;
    state.paddle.nBuffEndTime = 0;
    
    initBlocks();
    spawnBall();
    state.gameState = 'TUTORIAL';
};
