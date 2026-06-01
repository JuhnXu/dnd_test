import { BattleManager } from "./battleManager.js";

const canvas = document.getElementById("battleCanvas");
const battleManager = new BattleManager(canvas);
battleManager.resetGame();
