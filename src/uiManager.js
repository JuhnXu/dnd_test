import { ACTION_MODE, TEAM } from "./config.js";

export class UIManager {
  constructor() {
    this.statusEl = document.getElementById("status");
    this.unitListEl = document.getElementById("unitList");
    this.initiativeListEl = document.getElementById("initiativeList");
    this.logEl = document.getElementById("log");
    this.moveBtn = document.getElementById("moveBtn");
    this.attackBtn = document.getElementById("attackBtn");
    this.endTurnBtn = document.getElementById("endTurnBtn");
    this.restartBtn = document.getElementById("restartBtn");
  }

  bindEvents({ onMoveMode, onAttackMode, onEndTurn, onRestart }) {
    this.moveBtn.addEventListener("click", onMoveMode);
    this.attackBtn.addEventListener("click", onAttackMode);
    this.endTurnBtn.addEventListener("click", onEndTurn);
    this.restartBtn.addEventListener("click", onRestart);
  }

  render({ units, initiativeOrder, currentUnit, mode, battleEnded }) {
    this.renderStatus(currentUnit, mode);
    this.renderInitiativeList(initiativeOrder, currentUnit);
    this.renderUnitList(units, currentUnit);
    this.renderButtons(currentUnit, battleEnded);
  }

  renderStatus(currentUnit, mode) {
    if (!currentUnit) {
      this.statusEl.innerHTML = "无当前单位";
      return;
    }
    this.statusEl.innerHTML = `
      <strong>当前回合：</strong><span class="${currentUnit.team}">${currentUnit.name}</span><br>
      <strong>阵营：</strong>${currentUnit.team === TEAM.PLAYER ? "玩家" : "敌人"}<br>
      <strong>HP：</strong>${currentUnit.hp}/${currentUnit.maxHp}　<strong>AC：</strong>${currentUnit.ac}<br>
      <strong>剩余移动：</strong>${currentUnit.remainingMove}/${currentUnit.move}<br>
      <strong>攻击：</strong>+${currentUnit.attackBonus}，${currentUnit.damageDice}，范围 ${currentUnit.attackRange}<br>
      <strong>先攻：</strong>${currentUnit.initiativeRoll} + ${currentUnit.initiativeBonus} = ${currentUnit.initiativeTotal}<br>
      <strong>模式：</strong>${mode === ACTION_MODE.MOVE ? "移动" : "攻击"}
    `;
  }

  renderInitiativeList(initiativeOrder, currentUnit) {
    this.initiativeListEl.innerHTML = initiativeOrder.map((unit, index) => `
      <div class="initiative-card ${unit === currentUnit ? "active" : ""} ${!unit.isAlive ? "dead" : ""}">
        ${index + 1}. <strong class="${unit.team}">${unit.name}</strong>：${unit.initiativeTotal}
      </div>
    `).join("");
  }

  renderUnitList(units, currentUnit) {
    this.unitListEl.innerHTML = units.map(unit => `
      <div class="unit-card ${unit === currentUnit ? "active" : ""} ${!unit.isAlive ? "dead" : ""}">
        <strong class="${unit.team}">${unit.name}</strong><br>
        HP ${unit.hp}/${unit.maxHp} | AC ${unit.ac} | 移动 ${unit.move} | 攻击 +${unit.attackBonus} | 伤害 ${unit.damageDice}
      </div>
    `).join("");
  }

  renderButtons(currentUnit, battleEnded) {
    const isPlayerTurn = currentUnit && currentUnit.team === TEAM.PLAYER && !battleEnded;
    this.moveBtn.disabled = !isPlayerTurn || currentUnit.remainingMove <= 0;
    this.attackBtn.disabled = !isPlayerTurn || currentUnit.hasAttacked;
    this.endTurnBtn.disabled = !isPlayerTurn;
  }

  clearLog() { this.logEl.innerHTML = ""; }

  log(message, type = "system") {
    const entry = document.createElement("div");
    entry.className = type;
    entry.textContent = message;
    this.logEl.prepend(entry);
  }
}
