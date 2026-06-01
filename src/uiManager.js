import { ACTION_MODE, TEAM } from "./config.js";

export class UIManager {
  constructor() {
    this.turnBannerEl = document.getElementById("turnBanner");
    this.statusEl = document.getElementById("status");
    this.skillListEl = document.getElementById("skillList");
    this.unitListEl = document.getElementById("unitList");
    this.initiativeListEl = document.getElementById("initiativeList");
    this.logEl = document.getElementById("log");
    this.confirmPanelEl = document.getElementById("confirmPanel");
    this.tooltipEl = document.getElementById("tooltip");
    this.moveBtn = document.getElementById("moveBtn");
    this.attackBtn = document.getElementById("attackBtn");
    this.skillBtn = document.getElementById("skillBtn");
    this.defendBtn = document.getElementById("defendBtn");
    this.endTurnBtn = document.getElementById("endTurnBtn");
    this.restartBtn = document.getElementById("restartBtn");
  }

  bindEvents({ onMoveMode, onAttackMode, onSkillMode, onSkillSelect, onDefend, onEndTurn, onRestart, onConfirmAction, onCancelAction }) {
    this.onSkillSelect = onSkillSelect;
    this.onConfirmAction = onConfirmAction;
    this.onCancelAction = onCancelAction;
    this.moveBtn.addEventListener("click", onMoveMode);
    this.attackBtn.addEventListener("click", onAttackMode);
    this.skillBtn.addEventListener("click", onSkillMode);
    this.defendBtn.addEventListener("click", onDefend);
    this.endTurnBtn.addEventListener("click", onEndTurn);
    this.restartBtn.addEventListener("click", onRestart);
  }

  render({ units, initiativeOrder, currentUnit, mode, battleEnded, availableSkills, selectedSkillId, skillSystem, inputLocked, pendingAction }) {
    this.renderTurnBanner(currentUnit, mode, selectedSkillId, availableSkills, battleEnded, inputLocked);
    this.renderStatus(currentUnit, mode, selectedSkillId, availableSkills);
    this.renderConfirmPanel(pendingAction);
    this.renderSkills(currentUnit, availableSkills, selectedSkillId, battleEnded, skillSystem, inputLocked);
    this.renderInitiativeList(initiativeOrder, currentUnit);
    this.renderUnitList(units, currentUnit);
    this.renderButtons(currentUnit, battleEnded, availableSkills, inputLocked);
  }

  renderTurnBanner(currentUnit, mode, selectedSkillId, availableSkills, battleEnded, inputLocked) {
    if (!this.turnBannerEl) return;
    if (!currentUnit) {
      this.turnBannerEl.innerHTML = `<span>无当前单位</span>`;
      return;
    }
    const selectedSkill = availableSkills.find(skill => skill.id === selectedSkillId);
    const modeText = mode === ACTION_MODE.MOVE ? "移动" : mode === ACTION_MODE.ATTACK ? "普通攻击" : `技能${selectedSkill ? `：${selectedSkill.name}` : ""}`;
    const actionText = currentUnit.team === TEAM.PLAYER
      ? `剩余移动 ${currentUnit.remainingMove}/${currentUnit.move}，动作${currentUnit.hasAttacked ? "已用" : "可用"}`
      : inputLocked ? "敌人行动中" : "等待敌人行动";
    const status = battleEnded ? "战斗结束" : inputLocked ? "处理中" : "等待操作";
    this.turnBannerEl.innerHTML = `
      <div><strong>${currentUnit.name}</strong> 的回合｜${modeText}｜${actionText}</div>
      <div class="turn-pill">${status}</div>`;
  }


  renderStatusBadges(unit) {
    const badges = [];
    if (unit.isDefending) badges.push(`<span class="status-badge status-defense">🛡 防御</span>`);
    for (const effect of unit.statusEffects) {
      const cls = (effect.name || "").includes("毒") ? "status-poison" : effect.acBonus || effect.attackBonus ? "status-buff" : "";
      const icon = (effect.name || "").includes("毒") ? "☠" : effect.acBonus ? "◆" : effect.attackBonus ? "⚔" : "✦";
      badges.push(`<span class="status-badge ${cls}">${icon} ${effect.name} ${effect.duration}</span>`);
    }
    return badges.length ? `<div class="status-badges">${badges.join("")}</div>` : `<div class="status-badges"><span class="status-badge">无状态</span></div>`;
  }

  renderStatus(currentUnit, mode, selectedSkillId, availableSkills) {
    if (!currentUnit) { this.statusEl.innerHTML = "无当前单位"; return; }
    const selectedSkill = availableSkills.find(skill => skill.id === selectedSkillId);
    const modeText = mode === ACTION_MODE.MOVE ? "移动" : mode === ACTION_MODE.ATTACK ? "攻击" : `技能${selectedSkill ? `：${selectedSkill.name}` : ""}`;
    const defendText = currentUnit.isDefending ? "（防御中，AC +2）" : "";
    const statusText = currentUnit.statusEffects.length
      ? currentUnit.statusEffects.map(effect => `${effect.name}(${effect.duration})`).join("、")
      : "无";
    this.statusEl.innerHTML = `
      <strong>当前回合：</strong><span class="${currentUnit.team}">${currentUnit.name}</span><br>
      <strong>阵营：</strong>${currentUnit.team === TEAM.PLAYER ? "玩家" : "敌人"}<br>
      <strong>HP：</strong>${currentUnit.hp}/${currentUnit.maxHp}　<strong>AC：</strong>${currentUnit.effectiveAc}${defendText}<br>
      <strong>状态：</strong>${statusText}${this.renderStatusBadges(currentUnit)}
      <strong>剩余移动：</strong>${currentUnit.remainingMove}/${currentUnit.move}<br>
      <strong>普通攻击：</strong>+${currentUnit.effectiveAttackBonus}，${currentUnit.damageDice}，范围 ${currentUnit.attackRange}<br>
      <strong>先攻：</strong>${currentUnit.initiativeRoll} + ${currentUnit.initiativeBonus} = ${currentUnit.initiativeTotal}<br>
      <strong>模式：</strong>${modeText}
    `;
  }

  renderSkills(currentUnit, availableSkills, selectedSkillId, battleEnded, skillSystem, inputLocked) {
    if (!currentUnit || currentUnit.team !== TEAM.PLAYER || availableSkills.length === 0) {
      this.skillListEl.innerHTML = `<div class="skill-card">当前单位没有可用技能</div>`;
      return;
    }
    this.skillListEl.innerHTML = availableSkills.map(skill => {
      const state = currentUnit.skillState[skill.id];
      const reason = skillSystem.getUnavailableReason(currentUnit, skill);
      const disabled = Boolean(reason);
      const uses = state?.usesRemaining === null ? "∞" : state?.usesRemaining;
      const cd = state?.cooldownRemaining || 0;
      const detail = skill.type === "heal"
        ? `治疗 ${skill.healDice}${skill.healBonus ? ` + ${skill.healBonus}` : ""}`
        : skill.type === "buff"
          ? `状态 ${skill.statusEffect?.name || "Buff"}`
          : skill.type === "aoe"
            ? `AOE 半径 ${skill.radius} | 伤害 ${skill.damageDice} | 豁免 DC ${skill.saveDC}`
            : `伤害 ${skill.damageDice}${skill.damageBonus ? ` + ${skill.damageBonus}` : ""}`;
      const targetText = skill.targetType === "self" ? "自身" : skill.targetType === "ally" ? "友军" : skill.targetType === "area" ? "区域" : "敌人";
      const tooltip = `名称：${skill.name}
目标：${targetText}
范围：${skill.range}
${detail}
冷却：${skill.cooldown || 0} 回合
剩余次数：${uses}
说明：${skill.description || "无"}`;
      return `
        <div class="skill-card ${skill.id === selectedSkillId ? "active" : ""} ${disabled ? "disabled" : ""}" data-skill-id="${skill.id}" data-tooltip="${tooltip.replace(/"/g, "&quot;")}">
          <div class="skill-name">${skill.name}</div>
          <div class="skill-meta">目标 ${targetText} | 范围 ${skill.range}</div>
          <div class="skill-meta">${detail}</div>
          <div class="skill-meta">剩余 ${uses} 次 | 冷却 ${cd} 回合</div>
          <div class="skill-desc">${reason || skill.description}</div>
        </div>`;
    }).join("");
    this.skillListEl.querySelectorAll(".skill-card[data-skill-id]").forEach(card => {
      card.addEventListener("click", () => {
        if (!battleEnded && !inputLocked && this.onSkillSelect) this.onSkillSelect(card.dataset.skillId);
      });
    });
  }

  renderConfirmPanel(pendingAction) {
    if (!this.confirmPanelEl) return;
    if (!pendingAction) {
      this.confirmPanelEl.innerHTML = "选择移动、攻击或技能后，会先在这里确认再执行。";
      return;
    }
    const text = pendingAction.label || "确认执行该行动？";
    this.confirmPanelEl.innerHTML = `
      <div>${text}</div>
      <div class="confirm-actions">
        <button id="confirmActionBtn">确认</button>
        <button id="cancelActionBtn">取消</button>
      </div>`;
    this.confirmPanelEl.querySelector("#confirmActionBtn")?.addEventListener("click", () => this.onConfirmAction?.());
    this.confirmPanelEl.querySelector("#cancelActionBtn")?.addEventListener("click", () => this.onCancelAction?.());
  }

  showTooltip(html, x, y) {
    if (!this.tooltipEl) return;
    this.tooltipEl.innerHTML = html;
    this.tooltipEl.classList.remove("hidden");
    this.tooltipEl.style.left = `${x + 14}px`;
    this.tooltipEl.style.top = `${y + 14}px`;
  }

  hideTooltip() {
    if (!this.tooltipEl) return;
    this.tooltipEl.classList.add("hidden");
  }

  renderInitiativeList(initiativeOrder, currentUnit) {
    this.initiativeListEl.innerHTML = initiativeOrder.map((unit, index) => `
      <div class="initiative-card ${unit === currentUnit ? "active" : ""} ${!unit.isAlive ? "dead" : ""}">
        ${index + 1}. <strong class="${unit.team}">${unit.name}</strong>：${unit.initiativeTotal}${unit.isDefending ? " | 防御" : ""}
      </div>`).join("");
  }

  renderUnitList(units, currentUnit) {
    this.unitListEl.innerHTML = units.map(unit => `
      <div class="unit-card unit-card-with-avatar ${unit === currentUnit ? "active" : ""} ${!unit.isAlive ? "dead" : ""}">
        ${unit.avatar ? `<img class="unit-avatar" src="${unit.avatar}" alt="${unit.name}">` : ""}
        <div>
          <strong class="${unit.team}">${unit.name}</strong><br>
          HP ${unit.hp}/${unit.maxHp} | AC ${unit.effectiveAc} | 移动 ${unit.move} | 攻击 +${unit.effectiveAttackBonus} | 伤害 ${unit.damageDice}${unit.isDefending ? " | 防御中" : ""}
          <div class="unit-hpbar"><div class="unit-hpbar-inner" style="width:${Math.max(0, Math.min(100, Math.round(unit.hp / unit.maxHp * 100)))}%"></div></div>
          ${this.renderStatusBadges(unit)}
        </div>
      </div>`).join("");
  }

  renderButtons(currentUnit, battleEnded, availableSkills, inputLocked) {
    const isPlayerTurn = currentUnit && currentUnit.team === TEAM.PLAYER && !battleEnded && !inputLocked;
    this.moveBtn.disabled = !isPlayerTurn || currentUnit.remainingMove <= 0;
    this.attackBtn.disabled = !isPlayerTurn || currentUnit.hasAttacked;
    this.skillBtn.disabled = !isPlayerTurn || currentUnit.hasAttacked || availableSkills.length === 0;
    this.defendBtn.disabled = !isPlayerTurn || currentUnit.hasAttacked || currentUnit.hasDefended;
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
