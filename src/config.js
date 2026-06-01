export const GRID_SIZE = 10;
export const TILE_SIZE = 64;
export const ANIMATION_STEP_MS = 120;
export const DEFEND_AC_BONUS = 2;

export const TEAM = { PLAYER: "player", ENEMY: "enemy" };
export const ACTION_MODE = { MOVE: "move", ATTACK: "attack", SKILL: "skill" };
export const TERRAIN = { NORMAL: 0, BLOCKED: 1 };

export let MAP_TILES = [];
export let INITIAL_UNITS = [];
export let SKILLS = [];

function getProjectRootUrl() {
  return new URL("../", import.meta.url);
}

function normalizeAssetPath(path) {
  if (!path) return path;
  // 统一把 ./assets/... 转成绝对 URL，避免在不同启动目录下 404。
  const cleanPath = path.replace(/^\.\//, "");
  return new URL(cleanPath, getProjectRootUrl()).href;
}

export async function loadGameData() {
  const rootUrl = getProjectRootUrl();
  const [map, units, skills] = await Promise.all([
    fetch(new URL("data/map.json", rootUrl)).then(res => res.json()),
    fetch(new URL("data/units.json", rootUrl)).then(res => res.json()),
    fetch(new URL("data/skills.json", rootUrl)).then(res => res.json()),
  ]);

  for (const unit of units) {
    unit.avatar = normalizeAssetPath(unit.avatar);
  }

  MAP_TILES = map.tiles;
  INITIAL_UNITS = units;
  SKILLS = skills;
  return { map, units, skills };
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
