export const GRID_SIZE = 10;
export const TILE_SIZE = 64;

export const TEAM = {
  PLAYER: "player",
  ENEMY: "enemy",
};

export const ACTION_MODE = {
  MOVE: "move",
  ATTACK: "attack",
};

export const TERRAIN = {
  NORMAL: 0,
  BLOCKED: 1,
};

export const MAP_TILES = [
  [0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0],
  [0,0,0,1,1,0,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,0,0],
  [0,0,0,0,0,0,0,1,0,0],
  [0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0],
];

export const INITIAL_UNITS = [
  { id: "p1", name: "战士", team: TEAM.PLAYER, x: 1, y: 2, maxHp: 28, ac: 16, move: 6, attackBonus: 5, damageDice: "1d8+3", attackRange: 1, initiativeBonus: 1 },
  { id: "p2", name: "游侠", team: TEAM.PLAYER, x: 1, y: 6, maxHp: 22, ac: 14, move: 6, attackBonus: 5, damageDice: "1d8+3", attackRange: 5, initiativeBonus: 3 },
  { id: "e1", name: "哥布林 A", team: TEAM.ENEMY, x: 8, y: 2, maxHp: 12, ac: 13, move: 6, attackBonus: 4, damageDice: "1d6+2", attackRange: 1, initiativeBonus: 2 },
  { id: "e2", name: "哥布林 B", team: TEAM.ENEMY, x: 8, y: 5, maxHp: 12, ac: 13, move: 6, attackBonus: 4, damageDice: "1d6+2", attackRange: 1, initiativeBonus: 2 },
  { id: "e3", name: "兽人", team: TEAM.ENEMY, x: 8, y: 7, maxHp: 18, ac: 13, move: 5, attackBonus: 5, damageDice: "1d12+3", attackRange: 1, initiativeBonus: 1 },
];
