import { CANVAS_WIDTH, CANVAS_HEIGHT, MAPS } from './constants/maps.js';
import { state } from './state.js';
import { currentTheme } from './theme.js';
import { initBoss5 } from './bosses/boss5.js';
import { initBoss10 } from './bosses/boss10.js';

export const initBlocks = () => {
    state.blocks = [];
    const blockW = 18;
    const blockH = 24;
    const selectedMap = MAPS[state.currentStage] || MAPS[1];

    let lCount = 0;
    let fCount = 0;
    let rCount = 0;

    state.currentMapData = selectedMap;
    const startX = (CANVAS_WIDTH - (selectedMap.layout[0].length * blockW)) / 2;
    const startY = 100;

    for (let r = 0; r < selectedMap.layout.length; r++) {
        for (let c = 0; c < selectedMap.layout[r].length; c++) {
            let char = selectedMap.layout[r][c];
            if (char !== ' ') {
                let part = null;
                if (state.currentStage === 5) {
                    if (char === 'L') { part = 'leftHand'; char = '4'; lCount++; }
                    else if (char === 'F') { part = 'face'; char = '0'; fCount++; }
                    else if (char === 'R') { part = 'rightHand'; char = '4'; rCount++; }
                } else if (state.currentStage === 10) {
                    if (char === '3' || char === '0') { part = 'face'; fCount++; }
                    else if (char === '4') { part = 'blaster'; char = '4'; }
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
        initBoss5(lCount, rCount, fCount);
    } else if (state.currentStage === 10) {
        initBoss10(fCount, blockW, blockH);
    } else {
        state.bossState.active = false;
        state.boss403State.active = false;
    }

    // Assign items to blocks
    const totalBlocksCount = state.blocks.length;
    const nBuffCount = Math.round(totalBlocksCount * 0.04);
    const normal3Count = Math.round(totalBlocksCount * 0.01);
    const normal2Count = Math.round(totalBlocksCount * 0.01);
    const normal1Count = Math.round(totalBlocksCount * 0.02);

    const typesToAssign = [
        ...Array(nBuffCount).fill('nbuff'),
        ...Array(normal3Count).fill('normal_3'),
        ...Array(normal2Count).fill('normal_2'),
        ...Array(normal1Count).fill('normal_1')
    ];

    if (state.currentStage === 5) {
        const handIndices = [];
        const faceIndices = [];
        for (let i = 0; i < state.blocks.length; i++) {
            if (state.blocks[i].part === 'leftHand' || state.blocks[i].part === 'rightHand') handIndices.push(i);
            else if (state.blocks[i].part === 'face') faceIndices.push(i);
        }

        for (const type of typesToAssign) {
            let useHand = Math.random() < 0.8;
            if (useHand && handIndices.length === 0) useHand = false;
            if (!useHand && faceIndices.length === 0) useHand = true;

            const targetList = useHand ? handIndices : faceIndices;
            if (targetList.length === 0) break;

            const randIdx = Math.floor(Math.random() * targetList.length);
            const blockIdx = targetList[randIdx];
            state.blocks[blockIdx].itemType = type;
            targetList.splice(randIdx, 1);
        }
    } else {
        const availableIndices = Array.from({ length: state.blocks.length }, (_, i) => i);

        for (const type of typesToAssign) {
            if (availableIndices.length === 0) break;
            const randIdx = Math.floor(Math.random() * availableIndices.length);
            const blockIdx = availableIndices[randIdx];
            state.blocks[blockIdx].itemType = type;
            availableIndices.splice(randIdx, 1);
        }
    }
};

export const spawnBall = (isStart = false) => {
    if (state.reserve.length === 0) return false;
    const char = state.reserve.shift();

    state.paddle.destroyed = false;
    state.paddle.ndEndTime = 0;
    state.paddle.foundEndTime = 0;
    state.paddle.text = 'NOTFOUND';
    state.paddle.w = 260;
    state.paddle.x = CANVAS_WIDTH / 2 - state.paddle.w / 2;

    let initialVx = (Math.random() > 0.5 ? 1 : -1) * 1.25;
    if ((isStart || state.reserve.length === 2) && state.currentStage === 10) {
        initialVx = 0;
    }

    state.balls.push({
        x: state.paddle.x + state.paddle.w / 2,
        y: state.paddle.y - 20,
        vx: initialVx,
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
};

export const resetGame = (advanceStage = false) => {
    if (advanceStage) {
        const nextStage = state.currentStage >= 10 ? 1 : state.currentStage + 1;
        const maxStage = parseInt(localStorage.getItem('404_max_stage') || '1', 10);
        if (state.currentStage < 10 && nextStage > maxStage) {
            localStorage.setItem('404_max_stage', nextStage);
        }
        if (state.currentStage === 10) {
            localStorage.setItem('404_max_stage', 10);
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
    state.paddle.mudEndTime = 0;
    state.paddle.destroyed = false;
    state.paddle.w = 260;
    state.paddle.text = 'NOTFOUND';

    state.balls = [];
    state.items = [];
    state.globalSpeedMult = 1.75;
    
    state.tumbleweeds = [];
    state.cacti = [];
    state.glitchTime = 0;
    
    state.stars = [];
    for (let i = 0; i < 50; i++) {
        state.stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * (CANVAS_HEIGHT - 100),
            phase: Math.random() * Math.PI * 2
        });
    }

    state.clouds = [];
    for (let i = 0; i < 5; i++) {
        state.clouds.push({
            x: Math.random() * CANVAS_WIDTH,
            y: 50 + Math.random() * 150,
            speed: 0.25 + Math.random() * 0.25,
            cloudId: Math.floor(Math.random() * 3),
            type: Math.random() < 0.25 ? 'bird' : 'cloud'
        });
    }
    
    state.paddle.y = CANVAS_HEIGHT - 60;
    state.paddle.x = CANVAS_WIDTH / 2 - state.paddle.w / 2;
    state.paddle.nBuffEndTime = 0;
    
    initBlocks();
    spawnBall(true);
    state.gameState = 'TUTORIAL';
};
