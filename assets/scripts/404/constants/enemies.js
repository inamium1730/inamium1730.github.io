export const enemiesData = {
  "NOT": {
    "name": "NOT",
    "stages": [2, 3, 4, 5, 6, 7, 12],
    "attackType": "straight",
    "attackInterval": [3000, 5000] // 2値間でランダム
  },
  "FOUND": {
    "name": "FOUND",
    "stages": [3, 4, 5, 6, 8, 13],
    "attackType": "targeted", // 射撃時のパドル位置を狙う
    "attackInterval": [4000, 8000]
  },
  "ERROR": {
    "name": "ERROR",
    "stages": [4, 5, 6, 9, 14],
    "attackType": "scatter", // 8方向への拡散弾
    "attackInterval": [6000, 12000]
  },
  // ステージ 6 ~ 10
  "DENIED": {
    "name": "DENIED",
    "stages": [7, 8, 9, 10, 11, 12],
    "attackType": "laser", // 敵の真下を狙ったレーザー
    "attackInterval": [6000, 8000]
  },
  "ACCESS": {
    "name": "ACCESS",
    "stages": [8, 9, 10, 11, 12, 13],
    "attackType": "aimed_laser", // パドルの位置を狙ったレーザー
    "attackInterval": [7000, 11000]
  },
  "FORBIDDEN": {
    "name": "FORBIDDEN",
    "stages": [9, 10, 11, 12, 13, 14],
    "attackType": "mud", // 落下してm u dに分離、当たると移動速度低下
    "attackInterval": [8000, 14000]
  },
  // ステージ 11 ~ 14 (503 SERVICE UNAVAILABLE)
  "BUSY": {
    "name": "BUSY",
    "stages": [12, 13, 14],
    "attackType": "packet_straight_rocket", // 一定スピードのロケット弾（煙パーティクル推進）
    "attackInterval": [6000, 9000]
  },
  "SERVICE": {
    "name": "SERVICE",
    "stages": [13, 14],
    "attackType": "packet_targeted", // 徐々に早くなる弾（BUSY比50%遅速）、パドル狙いホーミング（追尾率33〜67%）
    "attackInterval": [7000, 13000]
  },
  "UNAVAILABLE": {
    "name": "UNAVAILABLE",
    "stages": [14],
    "attackType": "overload_rocket", // 重力落下ロケット。パドル高度で爆発し直撃即死、b/o/m破片撒き散らし（1ダメ）
    "attackInterval": [12000, 24000]
  }
};
