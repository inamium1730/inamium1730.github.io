import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP1, MAP2, MAP3, MAP4, MAP5, MAP6, MAP7, MAP8, MAP9, MAP10 } from './constants/maps.js';
import { state } from './state.js';
import { playBeep } from './audio.js';
import { currentTheme } from './theme.js';

export const initBlocks = () => {
    state.blocks = [];
    let blockW = 18;
    let blockH = 24;
    let selectedMap = MAP1;
    if (state.currentStage === 2) selectedMap = MAP2;
    if (state.currentStage === 3) selectedMap = MAP3;
    if (state.currentStage === 4) selectedMap = MAP4;
    if (state.currentStage === 5) selectedMap = MAP5;
    if (state.currentStage === 6) selectedMap = MAP6;
    if (state.currentStage === 7) selectedMap = MAP7;
    if (state.currentStage === 8) selectedMap = MAP8;
    if (state.currentStage === 9) selectedMap = MAP9;
    if (state.currentStage === 10) selectedMap = MAP10;

    let lCount = 0; let fCount = 0; let rCount = 0;

    let reqWidth = selectedMap.layout[0].length * blockW;

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
        state.bossState.active = true;
        state.bossState.stunUntil = 0;
        state.bossState.leftHand = { state: 'IDLE', timer: Date.now() + 2000, xOffset: 0, yOffset: 0, targetX: 0, hit: false, hp: lCount, maxHp: lCount };
        state.bossState.rightHand = { state: 'IDLE', timer: Date.now() + 5000, xOffset: 0, yOffset: 0, targetX: 0, hit: false, hp: rCount, maxHp: rCount };
        state.bossState.face = { state: 'IDLE', timer: Date.now() + 30000, xOffset: 0, yOffset: 0, hp: fCount, maxHp: fCount };
        state.bossState.twoEnemiesStartTime = 0;
    } else if (state.currentStage === 10) {
        state.boss403State.active = true;
        state.boss403State.phase = 1;
        state.boss403State.state = 'START_WAIT';
        state.boss403State.timer = 0;
        state.boss403State.blasterSide = Math.random() < 0.5 ? 'left' : 'right';
        state.boss403State.blasterAlpha = 0;
        state.boss403State.blasterXOffset = 0;
        state.boss403State.blasterYOffset = 0;
        state.boss403State.face = { xOffset: 0, yOffset: 0, hp: fCount, maxHp: fCount, state: 'IDLE', timer: 0 };
        state.boss403State.patternSeq = 0;
        state.boss403State.smokeActive = false;
        state.boss403State.explosionsLeft = 0;
        state.boss403State.nextExplosionTime = 0;
        const blasterLayout = [
            "      4444",
            "     44444",
            "    44  44",
            "   44   44",
            "  44    44",
            " 444444444",
            "4444444444",
            "        44",
            "        44"
        ];
        blasterLayout.forEach((row, r) => {
            for (let c = 0; c < row.length; c++) {
                if (row[c] === '4') {
                    let bx = c * blockW;
                    let by = r * blockH;
                    state.blocks.push({
                        x: bx,
                        y: by,
                        w: blockW,
                        h: blockH,
                        char: '4',
                        active: false,
                        itemType: null,
                        part: 'blaster',
                        baseX: bx,
                        baseY: by
                    });
                }
            }
        });
    } else {
        state.bossState.active = false;
        state.boss403State.active = false;
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

export const spawnBall = (isStart = false) => {
    if (state.reserve.length === 0) return false;
    let char = state.reserve.shift();

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
        let nextStage = state.currentStage >= 10 ? 1 : state.currentStage + 1;
        let maxStage = parseInt(localStorage.getItem('404_max_stage') || '1', 10);
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
