export let GRID_SIZE = 10;
export const TILE_SIZE = 64;
export const ANIMATION_STEP_MS = 120;
export const DEFEND_AC_BONUS = 2;

export const TEAM = { PLAYER: "player", ENEMY: "enemy" };
export const ACTION_MODE = { MOVE: "move", ATTACK: "attack", SKILL: "skill" };
export const TERRAIN = {
  NORMAL: 0,
  BLOCKED: 1,
  DIFFICULT: 2,
  DAMAGING: 3,
  HEALING: 4,
  GOAL: 5,
};

export let MAP_TILES = [];
export let LEVELS = [];
export let CURRENT_LEVEL_INDEX = 0;
export let CURRENT_LEVEL = null;
export let INITIAL_UNITS = [];
export let SKILLS = [];
export let SPELLS = [];
export let CLASS_FEATURES = [];

function getProjectRootUrl() { return new URL("../", import.meta.url); }
function normalizeAssetPath(path) {
  if (!path) return path;
  return new URL(path.replace(/^\.\//, ""), getProjectRootUrl()).href;
}

function defaultLevelFromMap(map) {
  return {
    id: "training_ground",
    name: "训练场遭遇战",
    description: "消灭全部敌人。",
    gridSize: map.gridSize || 10,
    tiles: map.tiles,
    victoryCondition: { type: "eliminateAll" },
    unitIds: ["p1", "p2", "e1", "e2", "e3"],
    spawns: { p1: { x: 1, y: 2 }, p2: { x: 1, y: 6 }, e1: { x: 8, y: 2 }, e2: { x: 8, y: 5 }, e3: { x: 8, y: 7 } },
  };
}

export function setActiveLevel(index) {
  if (!LEVELS.length) return null;
  CURRENT_LEVEL_INDEX = Math.max(0, Math.min(index, LEVELS.length - 1));
  CURRENT_LEVEL = LEVELS[CURRENT_LEVEL_INDEX];
  GRID_SIZE = CURRENT_LEVEL.gridSize || 10;
  MAP_TILES = CURRENT_LEVEL.tiles;
  return CURRENT_LEVEL;
}

export function getCurrentLevel() { return CURRENT_LEVEL; }
export function getLevelCount() { return LEVELS.length; }

export async function loadGameData() {
  const rootUrl = getProjectRootUrl();
  const [map, units, skills, spells, classFeatures, levelsResult] = await Promise.all([
    fetch(new URL("data/map.json", rootUrl)).then(res => res.json()),
    fetch(new URL("data/units.json", rootUrl)).then(res => res.json()),
    fetch(new URL("data/skills.json", rootUrl)).then(res => res.json()),
    fetch(new URL("data/spells.json", rootUrl)).then(res => res.json()),
    fetch(new URL("data/classFeatures.json", rootUrl)).then(res => res.json()),
    fetch(new URL("data/levels.json", rootUrl)).then(res => res.ok ? res.json() : null).catch(() => null),
  ]);

  for (const unit of units) unit.avatar = normalizeAssetPath(unit.avatar);

  LEVELS = levelsResult?.levels?.length ? levelsResult.levels : [defaultLevelFromMap(map)];
  INITIAL_UNITS = units;
  SPELLS = spells;
  CLASS_FEATURES = classFeatures;
  SKILLS = [...skills, ...spells];
  setActiveLevel(0);
  return { map, levels: LEVELS, units, skills: SKILLS, spells, classFeatures };
}

export function preloadImages(urls) {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  return Promise.all(uniqueUrls.map(url => new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve({ url, ok: true });
    img.onerror = () => resolve({ url, ok: false });
    img.src = url;
  })));
}
