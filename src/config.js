export const GRID_SIZE = 10;
export const TILE_SIZE = 64;

export const TEAM = {
  PLAYER: "player",
  ENEMY: "enemy",
};

export const ACTION_MODE = {
  MOVE: "move",
  ATTACK: "attack",
  SKILL: "skill",
};

export const TERRAIN = {
  NORMAL: 0,
  BLOCKED: 1,
};

export let MAP_TILES = [];
export let INITIAL_UNITS = [];
export let SKILLS = [];

export async function loadGameData() {
  const [map, units, skills] = await Promise.all([
    fetch("./data/map.json").then(res => res.json()),
    fetch("./data/units.json").then(res => res.json()),
    fetch("./data/skills.json").then(res => res.json()),
  ]);

  MAP_TILES = map.tiles;
  INITIAL_UNITS = units;
  SKILLS = skills;

  return { map, units, skills };
}
