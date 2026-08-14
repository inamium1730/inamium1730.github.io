export const enemiesData = {
  "NOT": {
    "name": "NOT",
    "stages": [2, 3, 4, 5, 6, 7],
    "attackType": "straight",
    "attackInterval": [3000, 5000] // 2値間でランダム
  },
  "FOUND": {
    "name": "FOUND",
    "stages": [3, 4, 5, 6, 8],
    "attackType": "targeted", // 射撃時のパドル位置を狙う
    "attackInterval": [4000, 8000]
  },
  "ERROR": {
    "name": "ERROR",
    "stages": [4, 5, 6, 9],
    "attackType": "scatter", // 8方向への拡散弾
    "attackInterval": [6000, 12000]
  },
  // ステージ 6 ~ 10
  "DENIED": {
    "name": "DENIED",
    "stages": [7, 8, 9, 10],
    "attackType": "laser", // 2秒間、 敵の真下を狙ったレーザーポイントを行い、 1秒間その位置で固定、 その位置をレーザー射撃 (レーザーポイント・射撃中は移動しない)
    "attackInterval": [6000, 8000]
  },
  "ACCESS": {
    "name": "ACCESS",
    "stages": [8, 9, 10],
    "attackType": "aimed_laser", // 2秒間、パドルの位置を狙ったレーザーポイントを行い、 1秒間その位置で固定、 その位置をレーザー射撃 (レーザーポイント・射撃中は移動しない)
    "attackInterval": [7000, 11000]
  },
  "FORBIDDEN": {
    "name": "FORBIDDEN",
    "stages": [9, 10],
    "attackType": "mud", // 落下してm u dに分離、当たると移動速度低下
    "attackInterval": [8000, 14000]
  }
};
