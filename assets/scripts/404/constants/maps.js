export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 768;

export const MAP1 = {
    name: 'NOT',
    spawnInterval: null,
    maxEnemies: 0,
    layout: [
        "444      444   000000000000   444      444",
        "444      444   000000000000   444      444",
        "444      444   000000000000   444      444",
        "444      444   000      000   444      444",
        "444444444444   000      000   444444444444",
        "444444444444   000      000   444444444444",
        "444444444444   000      000   444444444444",
        "         444   000000000000            444",
        "         444   000000000000            444",
        "         444   000000000000            444"
    ]
};

export const MAP2 = {
    name: 'NOT',
    spawnInterval: 20000,
    maxEnemies: 2,
    layout: [
        "NNN      NNN    OOOOOOOOOO    TTTTTTTTTTTT",
        "NNNN     NNN   OOOOOOOOOOOO   TTTTTTTTTTTT",
        "NNNNN    NNN   OOOOOOOOOOOO   TTTTTTTTTTTT",
        "NNN NN   NNN   OOO      OOO       TTTT    ",
        "NNN  NN  NNN   OOO      OOO       TTTT    ",
        "NNN   NN NNN   OOO      OOO       TTTT    ",
        "NNN    NNNNN   OOOOOOOOOOOO       TTTT    ",
        "NNN     NNNN   OOOOOOOOOOOO       TTTT    ",
        "NNN      NNN    OOOOOOOOOO        TTTT    "
    ]
};

export const MAP3 = {
    name: 'FOUND',
    spawnInterval: 15000,
    maxEnemies: 4,
    layout: [
        "FFFFFFF  OOOOOO  UUU  UUU NNN  NNN DDDDDD  ",
        "FFFFFFF OOOOOOOO UUU  UUU NNN  NNN DDDDDDD ",
        "FFFFFFF OOOOOOOO UUU  UUU NNNN NNN DDDDDDDD",
        "FFF     OOO  OOO UUU  UUU NNNNNNNN DDD  DDD",
        "FFFFFFF OOO  OOO UUU  UUU NNNNNNNN DDD  DDD",
        "FFFFFFF OOO  OOO UUU  UUU NNN NNNN DDD  DDD",
        "FFFFFFF OOOOOOOO UUU  UUU NNN  NNN DDDDDDDD",
        "FFF     OOOOOOOO UUUUUUUU NNN  NNN DDDDDDD ",
        "FFF      OOOOOO   UUUUUU  NNN  NNN DDDDDD  "
    ]
};

export const MAP4 = {
    name: 'ERROR',
    spawnInterval: 10000,
    maxEnemies: 6,
    layout: [
        "EEEEEEEE  RRRRRRR     RRRRRRR       OOOOO    RRRRRRR   ",
        "EEEEEEEE  RRRRRRRR    RRRRRRRR     OOOOOOO   RRRRRRRR  ",
        "EEE       RRR   RRR   RRR   RRR   OOO   OOO  RRR   RRR ",
        "EEEEEEE   RRR   RRR   RRR   RRR   OOO   OOO  RRR   RRR ",
        "EEEEEEE   RRRRRRRR    RRRRRRRR    OOO   OOO  RRRRRRRR  ",
        "EEE       RRRRRRR     RRRRRRR     OOO   OOO  RRRRRRR   ",
        "EEE       RRR  RRR    RRR  RRR    OOO   OOO  RRR  RRR  ",
        "EEEEEEEE  RRR   RRR   RRR   RRR    OOOOOOO   RRR   RRR ",
        "EEEEEEEE  RRR    RRR  RRR    RRR    OOOOO    RRR    RRR"
    ]
};

export const MAP5 = {
    name: 'BOSS',
    spawnInterval: null,
    maxEnemies: 0, // 動的に変化
    layout: [
        "      LLLL   FFFFF   RRRR      ",
        "     LLLLL  FFFFFFF  RRRRR     ",
        "    LL  LL FFF   FFF RR  RR    ",
        "   LL   LL FFF   FFF RR   RR   ",
        "  LL    LL FFF   FFF RR    RR  ",
        " LLLLLLLLL FFF   FFF RRRRRRRRR ",
        "LLLLLLLLLL FFF   FFF RRRRRRRRRR",
        "        LL  FFFFFFF  RR        ",
        "        LL   FFFFF   RR        "
    ]
};

export const MAP6 = {
    name: '403',
    spawnInterval: 16000,
    maxEnemies: 4,
    layout: [
        "444   444    00000    333333333",
        "444   444   0000000   333333333",
        "444   444  000   000        333",
        "444444444  000   000    333333 ",
        "444444444  000   000    333333 ",
        "      444  000   000        333",
        "      444  000   000        333",
        "      444   0000000   333333333",
        "      444    00000    333333333"
    ]
};

export const MAP7 = {
    name: 'DENIED',
    spawnInterval: 14000,
    maxEnemies: 5,
    layout: [
        "DDDDDDD    EEEEEEEE  NNN   NNN  III  EEEEEEEE  DDDDDDD  ",
        "DDDDDDDD   EEEEEEEE  NNNN  NNN  III  EEEEEEEE  DDDDDDDD ",
        "DDD   DDD  EEE       NNNNN NNN  III  EEE       DDD   DDD",
        "DDD   DDD  EEEEEEE   NNNNNNNNN  III  EEEEEEE   DDD   DDD",
        "DDD   DDD  EEEEEEE   NNN NNNNN  III  EEEEEEE   DDD   DDD",
        "DDD   DDD  EEE       NNN  NNNN  III  EEE       DDD   DDD",
        "DDD   DDD  EEE       NNN   NNN  III  EEE       DDD   DDD",
        "DDDDDDDD   EEEEEEEE  NNN   NNN  III  EEEEEEEE  DDDDDDDD ",
        "DDDDDDD    EEEEEEEE  NNN   NNN  III  EEEEEEEE  DDDDDDD  "
    ]
};

export const MAP8 = {
    name: 'ACCESS',
    spawnInterval: 12000,
    maxEnemies: 6,
    layout: [
        "   AAA       CCCCC     SSSSSSS    SSSSSSS",
        "  AAAAA     CCCCCCC   SSSSSSSS   SSSSSSSS",
        " AAA AAA   CCC   CCC  SSS        SSS",
        "AAA   AAA  CCC         SSSSSSS    SSSSSSS",
        "AAAAAAAAA  CCC          SSSSSSS    SSSSSSS",
        "AAAAAAAAA  CCC              SSS        SSS",
        "AAA   AAA  CCC   CCC        SSS        SSS",
        "AAA   AAA   CCCCCCC   SSSSSSSS   SSSSSSSS",
        "AAA   AAA    CCCCC     SSSSSSS    SSSSSSS"
    ]
};

export const MAP9 = {
    name: 'FORBIDDEN',
    spawnInterval: 10000,
    maxEnemies: 7,
    layout: [
        "FFFFFFFF   BBBBBBB    DDDDDDD    NNN   NNN",
        "FFFFFFFF   BBBBBBBB   DDDDDDDD   NNNN  NNN",
        "FFF        BBB   BBB  DDD   DDD  NNNNN NNN",
        "FFFFFFF    BBBBBBBB   DDD   DDD  NNNNNNNNN",
        "FFFFFFF    BBBBBBB    DDD   DDD  NNN NNNNN",
        "FFF        BBB   BBB  DDD   DDD  NNN  NNNN",
        "FFF        BBB   BBB  DDD   DDD  NNN   NNN",
        "FFF        BBBBBBBB   DDDDDDDD   NNN   NNN",
        "FFF        BBBBBBB    DDDDDDD    NNN   NNN"
    ]
};

export const MAP10 = {
    name: '403',
    spawnInterval: null,
    maxEnemies: 0,
    layout: [
        " 333333  333333 ",
        "3333333333333333",
        "3333333333333333",
        "333   3333   333",
        "333   3333   333",
        "333   3333   333",
        "333   3333   333",
        " 00000000000000 ",
        "0000000000000000",
        "0000000000000000",
        "000          000",
        "0000000000000000",
        "0000000000000000",
        " 00000000000000 ",
    ]
};

export const MAPS = [null, MAP1, MAP2, MAP3, MAP4, MAP5, MAP6, MAP7, MAP8, MAP9, MAP10];

export const STAGE_NAMES = ["", "404", "NOT", "FOUND", "ERROR", "404", "403", "DENIED", "ACCESS", "FORBIDDEN", "403"];

