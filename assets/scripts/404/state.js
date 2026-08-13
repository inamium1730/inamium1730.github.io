import { enemiesData } from './constants/enemies.js';
import { bossesData } from './constants/bosses.js';

export const state = {
    gameState: 'TUTORIAL', // TUTORIAL, READY, PLAYING, GAMECLEAR, GAMEOVER
    score: 0,
    reserve: ['4', '0', '4'],
    balls: [],
    items: [],
    blocks: [],
    globalSpeedMult: 1.75,

    currentStage: 1,
    stageTitleShowTime: 0,
    enemies: [],
    enemyBullets: [],
    particles: [],
    lastEnemySpawnTime: 0,
    enemySpawnCount: 0,
    stars: [],
    clouds: [],
    
    cheatBuffer: [],

    paddle: { 
        x: 0, // will be initialized based on CANVAS_WIDTH
        y: 0, // will be initialized based on CANVAS_HEIGHT
        w: 260, 
        h: 30, 
        text: 'NOTFOUND', 
        nBuffEndTime: 0, 
        foundEndTime: 0, 
        ndEndTime: 0, 
        destroyed: false,
        isSpawning: false,
        invincibleEndTime: 0
    },
    
    keys: { left: false, right: false },

    bossState: {
        active: false,
        stunUntil: 0,
        leftHand: { state: 'IDLE', timer: 0, xOffset: 0, yOffset: 0, targetX: 0, hit: false, hp: 0, maxHp: 0 },
        rightHand: { state: 'IDLE', timer: 0, xOffset: 0, yOffset: 0, targetX: 0, hit: false, hp: 0, maxHp: 0 },
        face: { state: 'IDLE', timer: 0, xOffset: 0, yOffset: 0, hp: 0, maxHp: 0 },
        twoEnemiesStartTime: 0
    },

    // Reference data loaded from JS
    enemiesData: enemiesData,
    bossesData: bossesData
};
