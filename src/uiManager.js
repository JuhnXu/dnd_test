import { ACTION_MODE, TEAM } from "./config.js";
import { ABILITIES, ABILITY_NAMES, formatModifier } from "./ability.js";

const FEATURE_NAMES = {
  second_wind_feature: "回气",
  action_surge_feature: "动作如潮",
  favored_enemy_feature: "偏好敌人",
  hunters_mark_feature: "猎人印记",
  nimble_escape_feature: "灵巧撤离",
  savage_attacks_feature: "凶蛮重击",
  orc_aggression_feature: "凶蛮冲锋",
};

function featureText(unit) {
  return unit.classFeatures?.length ? unit.classFeatures.map(id => FEATURE_NAMES[id] || id).join("、") : "无";
}

export class UIManager {
  constructor() {
    this.turnBannerEl = document.getElementById("turnBanner");
    this.levelInfoEl = document.getElementById("levelInfo");
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
    this.dashBtn = document.getElementById("dashBtn");
    this.disengageBtn = document.getElementById("disengageBtn");
    this.endTurnBtn = document.getElementById("endTurnBtn");
    this.restartBtn = document.getElementById("restartBtn");
    this.nextLevelBtn = document.getElementById("nextLevelBtn");
  }

  bindEvents({ onMoveMode, onAttackMode, onSkillMode, onSkillSelect, onDefend, onDash, onDisengage, onEndTurn, onRestart, onNextLevel, onConfirmAction, onCancelAction }) {
    this.onSkillSelect = onSkillSelect;
    this.onConfirmAction = onConfirmAction;
    this.onCancelAction = onCancelAction;
    this.moveBtn.addEventListener("click", onMoveMode);
    this.attackBtn.addEventListener("click", onAttackMode);
    this.skillBtn.addEventListener("click", onSkillMode);
    this.defendBtn.addEventListener("click", onDefend);
    this.dashBtn?.addEventListener("click", onDash);
    this.disengageBtn?.addEventListener("click", onDisengage);
    this.endTurnBtn.addEventListener("click", onEndTurn);
    this.restartBtn.addEventListener("click", onRestart);
    this.nextLevelBtn?.addEventListener("click", onNextLevel);
  }

  render({ units, initiativeOrder, currentUnit, mode, battleEnded, availableSkills, selectedSkillId, skillSystem, inputLocked, pendingAction, inspectUnit, level, levelIndex, levelCount }) {
    this.renderLevelInfo(level, levelIndex, levelCount);
    this.renderTurnBanner(currentUnit, mode, selectedSkillId, availableSkills, battleEnded, inputLocked);
    this.renderStatus(currentUnit, mode, selectedSkillId, availableSkills, inspectUnit);
    this.renderConfirmPanel(pendingAction);
    this.renderSkills(currentUnit, availableSkills, selectedSkillId, battleEnded, skillSystem, inputLocked);
    this.renderInitiativeList(initiativeOrder, currentUnit);
    this.renderUnitList(units, currentUnit);
    this.renderButtons(currentUnit, battleEnded, availableSkills, inputLocked, skillSystem);
  }

  renderLevelInfo(level, levelIndex = 0, levelCount = 1) {
    if (!this.levelInfoEl || !level) return;
    const victory = level.victoryCondition?.type === "eliminateAll" ? "消灭全部敌人"
      : level.victoryCondition?.type === "reachGoalOrEliminate" ? "抵达目标区域或消灭全部敌人"
      : "自定义胜利条件";
    this.levelInfoEl.innerHTML = `<strong>${level.name}</strong>（${levelIndex + 1}/${levelCount}）<br>${level.description || ""}<br><strong>胜利条件：</strong>${victory}`;
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
      ? `剩余移动 ${currentUnit.remainingMove}/${currentUnit.move}，动作${currentUnit.actionAvailable ? "可用" : "已用"}，附赠动作${currentUnit.bonusActionAvailable ? "可用" : "已用"}，反应${currentUnit.reactionAvailable ? "可用" : "已用"}`
      : inputLocked ? "敌人行动中" : "等待敌人行动";
    const status = battleEnded ? "战斗结束" : inputLocked ? "处理中" : "等待操作";
    this.turnBannerEl.innerHTML = `
      <div><strong>${currentUnit.name}</strong> 的回合｜${modeText}｜${actionText}</div>
      <div class="turn-pill">${status}</div>`;
  }


  renderStatusBadges(unit) {
    const badges = [];
    if (unit.isDefending) badges.push(`<span class="status-badge status-defense">🛡 闪避</span>`);
    if (unit.isProne) badges.push(`<span class="status-badge status-warning">倒地</span>`);
    if (unit.isDisengaging) badges.push(`<span class="status-badge status-buff">↩ 脱离</span>`);
    for (const effect of unit.statusEffects) {
      const cls = (effect.name || "").includes("毒") ? "status-poison" : effect.acBonus || effect.attackBonus ? "status-buff" : "";
      const icon = (effect.name || "").includes("毒") ? "☠" : effect.acBonus ? "◆" : effect.attackBonus ? "⚔" : "✦";
      badges.push(`<span class="status-badge ${cls}">${icon} ${effect.name} ${effect.duration}</span>`);
    }
    return badges.length ? `<div class="status-badges">${badges.join("")}</div>` : `<div class="status-badges"><span class="status-badge">无状态</span></div>`;
  }

  renderStatus(currentUnit, mode, selectedSkillId, availableSkills, inspectUnit = null) {
    if (!currentUnit) { this.statusEl.innerHTML = "无当前单位"; return; }
    const displayUnit = inspectUnit || currentUnit;
    const isInspecting = Boolean(inspectUnit && inspectUnit !== currentUnit);
    const selectedSkill = availableSkills.find(skill => skill.id === selectedSkillId);
    const modeText = mode === ACTION_MODE.MOVE ? "移动" : mode === ACTION_MODE.ATTACK ? "攻击" : `技能${selectedSkill ? `：${selectedSkill.name}` : ""}`;
    const defendText = displayUnit.isDefending ? "（防御中，AC +2）" : "";
    const conditionPrefix = displayUnit.isProne ? ["倒地"] : [];
    const statusText = displayUnit.statusEffects.length || conditionPrefix.length
      ? [...conditionPrefix, ...displayUnit.statusEffects.map(effect => `${effect.name}(${effect.duration})`)].join("、")
      : "无";
    this.statusEl.innerHTML = `
      <strong>${isInspecting ? "选中单位" : "当前回合"}：</strong><span class="${displayUnit.team}">${displayUnit.name}</span><br>
      <strong>阵营：</strong>${displayUnit.team === TEAM.PLAYER ? "玩家" : "敌人"}<br>
      <strong>HP：</strong>${displayUnit.hp}/${displayUnit.maxHp}　<strong>AC：</strong>${displayUnit.effectiveAc}${defendText}<br>
      <strong>状态：</strong>${statusText}${this.renderStatusBadges(displayUnit)}
      <strong>行动经济：</strong>动作 ${displayUnit.actionAvailable ? "可用" : "已用"}｜附赠动作 ${displayUnit.bonusActionAvailable ? "可用" : "已用"}｜反应 ${displayUnit.reactionAvailable ? "可用" : "已用"}<br>
      <strong>剩余移动：</strong>${displayUnit.remainingMove}/${displayUnit.move}<br>
      <strong>普通攻击：</strong>+${displayUnit.effectiveAttackBonus}，${displayUnit.damageDice}，范围 ${displayUnit.attackRange}<br>
      <strong>职业特性：</strong>${featureText(displayUnit)}<br>
      <strong>施法：</strong>${displayUnit.spellcastingAbility ? `${displayUnit.spellcastingAbility}｜法术攻击 +${displayUnit.getSpellAttackBonus()}｜法术 DC ${displayUnit.spellSaveDC}｜法术位 ${displayUnit.getSpellSlotText()}` : "无"}<br>
      <strong>先攻：</strong>${displayUnit.initiativeRoll} + ${displayUnit.initiativeBonus} = ${displayUnit.initiativeTotal}<br>
      <strong>模式：</strong>${modeText}<br>${isInspecting ? `<strong>当前回合：</strong><span class="${currentUnit.team}">${currentUnit.name}</span><br>` : ""}
      <strong>属性：</strong>${ABILITIES.map(a => `${a} ${displayUnit.abilities?.[a] ?? 10}(${formatModifier(displayUnit.getAbilityModifier ? displayUnit.getAbilityModifier(a) : 0)})`).join(" ")}
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
      const spellTag = skill.isSpell ? `${skill.spellLevel === 0 ? "戏法" : `${skill.spellLevel}环法术`} | ` : "";
      const actionCostName = skill.actionCost === "bonus" ? "附赠动作" : skill.actionCost === "reaction" ? "反应" : skill.actionCost === "free" ? "免费" : "动作";
      const dcText = skill.isSpell ? (skill.saveDC || currentUnit.spellSaveDC) : skill.saveDC;
      const detail = skill.type === "heal"
        ? `${spellTag}治疗 ${skill.healDice}${skill.healBonus ? ` + ${skill.healBonus}` : ""}${skill.healAddSpellAbility ? ` + ${currentUnit.spellcastingAbility}修正` : ""}`
        : skill.type === "buff"
          ? `${spellTag}状态 ${skill.statusEffect?.name || "Buff"}`
          : skill.type === "aoe"
            ? `${spellTag}AOE 半径 ${skill.radius} | 伤害 ${skill.damageDice} | 豁免 DC ${dcText}`
            : `${spellTag}${skill.useSpellAttack ? "法术攻击" : "攻击"} | 伤害 ${skill.damageDice}${skill.damageBonus ? ` + ${skill.damageBonus}` : ""}`;
      const targetText = skill.targetType === "self" ? "自身" : skill.targetType === "ally" ? "友军" : skill.targetType === "area" ? "区域" : "敌人";
      const tooltip = `名称：${skill.name}
目标：${targetText}
范围：${skill.range}
${detail}
冷却：${skill.cooldown || 0} 回合
剩余次数：${uses}
${skill.isSpell ? `法术：${skill.spellLevel === 0 ? "戏法" : `${skill.spellLevel} 环`} ${skill.school || ""} ${skill.spellSlotCost ? `| 消耗 ${skill.spellSlotCost} 环法术位` : "| 不消耗法术位"}` : ""}
说明：${skill.description || "无"}`;
      return `
        <div class="skill-card ${skill.id === selectedSkillId ? "active" : ""} ${disabled ? "disabled" : ""}" data-skill-id="${skill.id}" data-tooltip="${tooltip.replace(/"/g, "&quot;")}">
          <div class="skill-name">${skill.name}</div>
          <div class="skill-meta">目标 ${targetText} | 范围 ${skill.range} | 消耗 ${actionCostName}</div>
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
      <div class="unit-card unit-card-with-avatar compact-unit ${unit === currentUnit ? "active" : ""} ${!unit.isAlive ? "dead" : ""}">
        ${unit.avatar ? `<img class="unit-avatar" src="${unit.avatar}" alt="${unit.name}">` : ""}
        <div class="unit-summary-body">
          <div><strong class="${unit.team}">${unit.name}</strong> <span class="mini-tag">${unit.className || "无职业"} Lv.${unit.level || 1}</span></div>
          <div class="unit-line">HP ${unit.hp}/${unit.maxHp} | AC ${unit.effectiveAc} | 攻击 ${formatModifier(unit.effectiveAttackBonus)}</div>
          <div class="unit-hpbar"><div class="unit-hpbar-inner" style="width:${Math.max(0, Math.min(100, Math.round(unit.hp / unit.maxHp * 100)))}%"></div></div>
          ${this.renderStatusBadges(unit)}
        </div>
      </div>`).join("");
  }

  renderButtons(currentUnit, battleEnded, availableSkills, inputLocked, skillSystem) {
    const isPlayerTurn = currentUnit && currentUnit.team === TEAM.PLAYER && !battleEnded && !inputLocked;
    this.moveBtn.disabled = !isPlayerTurn || currentUnit.remainingMove <= 0;
    this.attackBtn.disabled = !isPlayerTurn || !currentUnit.actionAvailable;
    const hasUsableSkill = availableSkills.some(skill => !skillSystem.getUnavailableReason(currentUnit, skill));
    this.skillBtn.disabled = !isPlayerTurn || availableSkills.length === 0 || !hasUsableSkill;
    this.defendBtn.disabled = !isPlayerTurn || !currentUnit.actionAvailable || currentUnit.hasDefended;
    if (this.dashBtn) this.dashBtn.disabled = !isPlayerTurn || !currentUnit.actionAvailable;
    if (this.disengageBtn) this.disengageBtn.disabled = !isPlayerTurn || !currentUnit.actionAvailable;
    if (this.nextLevelBtn) this.nextLevelBtn.disabled = !battleEnded;
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
