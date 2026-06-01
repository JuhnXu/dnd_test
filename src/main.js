import { INITIAL_UNITS, loadGameData, preloadImages } from "./config.js";
import { BattleManager } from "./battleManager.js";
import { DebugTools } from "./debugTools.js";

await loadGameData();

const imageResults = await preloadImages(INITIAL_UNITS.map(unit => unit.avatar));
const failedImages = imageResults.filter(item => !item.ok);
if (failedImages.length > 0) {
  console.warn("部分头像资源加载失败：", failedImages.map(item => item.url));
}

const canvas = document.getElementById("battleCanvas");
const battleManager = new BattleManager(canvas);

battleManager.resetGame();
window.__battleManager = battleManager;
const debugTools = new DebugTools(battleManager);
window.__debugTools = debugTools;
