import { loadGameData } from "./config.js";
import { BattleManager } from "./battleManager.js";

await loadGameData();

const canvas = document.getElementById("battleCanvas");
const battleManager = new BattleManager(canvas);

battleManager.resetGame();
