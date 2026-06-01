import { INITIAL_UNITS, loadGameData, preloadImages, hasLocalProjectData, loadProjectDataFromLocalStorage } from "./config.js";
import { BattleManager } from "./battleManager.js";

await loadGameData();
if (hasLocalProjectData()) {
  try { loadProjectDataFromLocalStorage(); } catch (error) { console.warn("读取本地编辑数据失败：", error); }
}

const imageResults = await preloadImages(INITIAL_UNITS.map(unit => unit.avatar));
const failedImages = imageResults.filter(item => !item.ok);
if (failedImages.length > 0) {
  console.warn("部分头像资源加载失败：", failedImages.map(item => item.url));
}

const canvas = document.getElementById("battleCanvas");
const battleManager = new BattleManager(canvas);
// 游玩界面使用精简地图信息：关闭坐标/地形调试叠层，并减少悬停提示中的地图细节。
battleManager.compactPlayUI = true;
battleManager.renderer.debugOptions = { showCoords: false, showTerrain: false, showMoveCost: false, showReachable: false };

battleManager.resetGame();
window.__battleManager = battleManager;
