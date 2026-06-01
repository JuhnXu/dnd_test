import { ACTION_MODE, TEAM } from "./config.js";

export class UIManager {
  constructor() {
    this.statusEl = document.getElementById("status");
    this.skillListEl = document.getElementById("skillList");
    this.unitListEl = document.getElementById("unitList");
    this.initiativeListEl = document.getElementById("initiativeList");
    this.logEl = document.getElementById("log");
    this.moveBtn = document.getElementById("moveBtn");
    this.attackBtn = document.getElementById("attackBtn");
    this.skillBtn = document.getElementById("skillBtn");
    this.endTurnBtn = document.getElementById("endTurnBtn");
    this.restartBtn = document.getElementById("restartBtn");
  }

  bindEvents({ onMoveMode, onAttackMode, onSkillMode, onSkillSelect, onEndTurn, onRestart }) {
    this.onSkillSelect = onSkillSelect;
    this.moveBtn.addEventListener("click", onMoveMode);
    this.attackBtn.addEventListener("click", onAttackMode);
    this.skillBtn.addEventListener("click", onSkillMode);
    this.endTurnBtn.addEventListener("click", onEndTurn);
    this.restartBtn.addEventListener("click", onRestart);
  }

  render({ units, initiativeOrder, currentUnit, mode, battleEnded, availableSkills, selectedSkillId }) {
    this.renderStatus(currentUnit, mode, selectedSkillId, availableSkills);
    this.renderSkills(currentUnit, availableSkills, selectedSkillId, battleEnded);
    this.renderInitiativeList(initiativeOrder, currentUnit);
    this.renderUnitList(units, currentUnit);
    this.renderButtons(currentUnit, battleEnded, availableSkills);
  }

  renderStatus(currentUnit, mode, selectedSkillId, availableSkills) {
    if (!currentUnit) {
      this.statusEl.innerHTML = "无当前单位";
      return;
    }
    const selectedSkill = availableSkills.find(skill => skill.id === selectedSkillId);
    const modeText = mode === ACTION_MODE.MOVE ? "移动" : mode === ACTION_MODE.ATTACK ? "攻击" : `技能${selectedSkill ? `：${selectedSkill.name}` : ""}`;
    this.statusEl.innerHTML = `
      <strong>当前回合：</strong><span class="${currentUnit.team}">${currentUnit.name}</span><br>
      <strong>阵营：</strong>${currentUnit.team === TEAM.PLAYER ? "玩家" : "敌人"}<br>
      <strong>HP：</strong>${currentUnit.hp}/${currentUnit.maxHp}　<strong>AC：</strong>${currentUnit.ac}<br>
      <strong>剩余移动：</strong>${currentUnit.remainingMove}/${currentUnit.move}<br>
      <strong>普通攻击：</strong>+${currentUnit.attackBonus}，${currentUnit.damageDice}，范围 ${currentUnit.attackRange}<br>
      <strong>先攻：</strong>${currentUnit.initiativeRoll} + ${currentUnit.initiativeBonus} = ${currentUnit.initiativeTotal}<br>
      <strong>模式：</strong>${modeText}
    `;
  }

  renderSkills(currentUnit, availableSkills, selectedSkillId, battleEnded) {
    if (!currentUnit || currentUnit.team !== TEAM.PLAYER || availableSkills.length === 0) {
      this.skillListEl.innerHTML = `<div class="skill-card">当前单位没有可用技能</div>`;
      return;
    }

    this.skillListEl.innerHTML = availableSkills.map(skill => `
      <div class="skill-card ${skill.id === selectedSkillId ? "active" : ""}" data-skill-id="${skill.id}">
        <div class="skill-name">${skill.name}</div>
        <div>范围 ${skill.range} | 伤害 ${skill.damageDice}${skill.damageBonus ? ` + ${skill.damageBonus}` : ""}</div>
        <div>${skill.description}</div>
      </div>
    `).join("");

    this.skillListEl.querySelectorAll(".skill-card[data-skill-id]").forEach(card => {
      card.addEventListener("click", () => {
        if (!battleEnded && this.onSkillSelect) this.onSkillSelect(card.dataset.skillId);
      });
    });
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

  renderButtons(currentUnit, battleEnded, availableSkills) {
    const isPlayerTurn = currentUnit && currentUnit.team === TEAM.PLAYER && !battleEnded;
    this.moveBtn.disabled = !isPlayerTurn || currentUnit.remainingMove <= 0;
    this.attackBtn.disabled = !isPlayerTurn || currentUnit.hasAttacked;
    this.skillBtn.disabled = !isPlayerTurn || currentUnit.hasAttacked || availableSkills.length === 0;
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
