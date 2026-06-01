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

// ========================= v18.2 Editor persistence helpers =========================
const STORAGE_KEY = "dnd-html5-demo-v18-2-editor-data";
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function normalizeUnitsAssets(units) {
  for (const unit of units || []) unit.avatar = normalizeAssetPath(unit.avatar);
}

export function exportProjectData() {
  return {
    version: "v18.2",
    levels: clone(LEVELS),
    units: clone(INITIAL_UNITS),
    skills: clone(SKILLS.filter(item => item.type !== "spell" && item.kind !== "spell" && item.school === undefined)),
    spells: clone(SPELLS),
    classFeatures: clone(CLASS_FEATURES),
  };
}

export function applyProjectData(data) {
  if (!data || typeof data !== "object") throw new Error("导入数据不是有效 JSON 对象。");
  const nextLevels = data.levels?.levels || data.levels;
  const nextUnits = data.units;
  const nextSkills = data.skills;
  const nextSpells = data.spells;
  const nextFeatures = data.classFeatures;
  if (nextLevels) LEVELS = clone(nextLevels);
  if (nextUnits) { INITIAL_UNITS = clone(nextUnits); normalizeUnitsAssets(INITIAL_UNITS); }
  if (nextSpells) SPELLS = clone(nextSpells);
  if (nextFeatures) CLASS_FEATURES = clone(nextFeatures);
  if (nextSkills) SKILLS = [...clone(nextSkills), ...clone(SPELLS)];
  else SKILLS = [...SKILLS.filter(item => item.school === undefined), ...SPELLS];
  setActiveLevel(Math.min(CURRENT_LEVEL_INDEX, Math.max(0, LEVELS.length - 1)));
  return exportProjectData();
}

export function importDataByType(type, jsonData) {
  const data = clone(jsonData);
  if (type === "project") return applyProjectData(data);
  if (type === "levels") return applyProjectData({ levels: data.levels || data });
  if (type === "units") return applyProjectData({ units: Array.isArray(data) ? data : data.units });
  if (type === "skills") return applyProjectData({ skills: Array.isArray(data) ? data : data.skills });
  if (type === "spells") return applyProjectData({ spells: Array.isArray(data) ? data : data.spells });
  if (type === "classFeatures") return applyProjectData({ classFeatures: Array.isArray(data) ? data : data.classFeatures });
  throw new Error("未知导入类型：" + type);
}

export function saveProjectDataToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exportProjectData()));
}

export function hasLocalProjectData() { return Boolean(localStorage.getItem(STORAGE_KEY)); }

export function loadProjectDataFromLocalStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return applyProjectData(JSON.parse(raw));
}

export function clearLocalProjectData() { localStorage.removeItem(STORAGE_KEY); }

export function validateProjectData() {
  const errors = [];
  const warnings = [];
  const unitIds = new Set(INITIAL_UNITS.map(u => u.id));
  const skillIds = new Set(SKILLS.map(s => s.id));
  const featureIds = new Set(CLASS_FEATURES.map(f => f.id));
  for (const unit of INITIAL_UNITS) {
    if (!unit.id) errors.push("存在缺少 id 的单位。");
    if (!unit.name) warnings.push(`${unit.id} 缺少名称。`);
    for (const skillId of unit.skills || []) if (!skillIds.has(skillId)) errors.push(`${unit.name || unit.id} 引用了不存在的技能/法术：${skillId}`);
    for (const featureId of unit.classFeatures || []) if (!featureIds.has(featureId)) errors.push(`${unit.name || unit.id} 引用了不存在的职业特性：${featureId}`);
  }
  for (const level of LEVELS) {
    const gridSize = level.gridSize || 10;
    const occupied = new Map();
    if (!Array.isArray(level.tiles) || level.tiles.length !== gridSize) errors.push(`${level.name || level.id} 的 tiles 高度不等于 gridSize。`);
    for (const id of level.unitIds || []) if (!unitIds.has(id)) errors.push(`${level.name || level.id} 的 unitIds 引用了不存在的单位：${id}`);
    for (const [unitId, pos] of Object.entries(level.spawns || {})) {
      if (!unitIds.has(unitId)) errors.push(`${level.name || level.id} 的出生点引用了不存在的单位：${unitId}`);
      if (pos.x < 0 || pos.y < 0 || pos.x >= gridSize || pos.y >= gridSize) errors.push(`${level.name || level.id} 的 ${unitId} 出生点越界：(${pos.x},${pos.y})`);
      const terrain = level.tiles?.[pos.y]?.[pos.x];
      if (terrain === TERRAIN.BLOCKED) errors.push(`${level.name || level.id} 的 ${unitId} 出生点位于障碍物：(${pos.x},${pos.y})`);
      const key = `${pos.x},${pos.y}`;
      if (occupied.has(key)) errors.push(`${level.name || level.id} 出生点重叠：${occupied.get(key)} 和 ${unitId} 都在 (${key})`);
      occupied.set(key, unitId);
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}
