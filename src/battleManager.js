import { ACTION_MODE, ANIMATION_STEP_MS, INITIAL_UNITS, SKILLS, TEAM, TILE_SIZE } from "./config.js";
import { Unit } from "./unit.js";
import { GridManager } from "./gridManager.js";
import { CombatSystem } from "./combatSystem.js";
import { SkillSystem } from "./skillSystem.js";
import { TurnManager } from "./turnManager.js";
import { EnemyAI } from "./enemyAI.js";
import { UIManager } from "./uiManager.js";
import { Renderer } from "./renderer.js";
import { StatusEffectSystem } from "./statusEffectSystem.js";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export class BattleManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.units = [];
    this.mode = ACTION_MODE.MOVE;
    this.selectedSkillId = null;
    this.battleEnded = false;
    this.inputLocked = false;
    this.previewPath = null;
    this.hoverTile = null;
    this.pendingAction = null;
    this.gridManager = new GridManager(this.units);
    this.combatSystem = new CombatSystem(this.gridManager);
    this.skillSystem = new SkillSystem(this.gridManager, SKILLS);
    this.statusEffectSystem = new StatusEffectSystem();
    this.turnManager = new TurnManager(this.units);
    this.enemyAI = new EnemyAI(this.gridManager, this.combatSystem, this.skillSystem);
    this.uiManager = new UIManager();
    this.renderer = new Renderer(canvas, this.gridManager, this.combatSystem, this.skillSystem);
    this.renderer.onImageLoaded = () => this.render();
    this.bindEvents();
  }

  bindEvents() {
    this.canvas.addEventListener("click", event => this.handleCanvasClick(event));
    this.canvas.addEventListener("mousemove", event => this.handleCanvasHover(event));
    this.canvas.addEventListener("mouseleave", () => this.clearHover());
    this.uiManager.bindEvents({
      onMoveMode: () => this.setMode(ACTION_MODE.MOVE),
      onAttackMode: () => this.setMode(ACTION_MODE.ATTACK),
      onSkillMode: () => {
        const usable = this.availableSkills.filter(skill => !this.skillSystem.getUnavailableReason(this.currentUnit, skill));
        this.selectedSkillId = this.selectedSkillId || usable[0]?.id || this.availableSkills[0]?.id || null;
        this.setMode(ACTION_MODE.SKILL, false);
      },
      onSkillSelect: skillId => { this.selectedSkillId = skillId; this.setMode(ACTION_MODE.SKILL, false); },
      onDefend: () => this.queueDefend(),
      onEndTurn: () => this.nextTurn(),
      onRestart: () => this.resetGame(),
      onConfirmAction: () => this.confirmPendingAction(),
      onCancelAction: () => this.cancelPendingAction(),
    });
  }

  setMode(mode, clearSkill = true) {
    this.mode = mode;
    if (clearSkill) this.selectedSkillId = null;
    this.pendingAction = null;
    this.previewPath = null;
    this.render();
  }

  resetGame() {
    this.units = INITIAL_UNITS.map(config => new Unit(config));
    for (const unit of this.units) unit.setupSkillState(this.skillSystem.getUnitSkills(unit));
    this.gridManager.setUnits(this.units);
    this.skillSystem.setSkills(SKILLS);
    this.turnManager.reset(this.units);
    this.mode = ACTION_MODE.MOVE;
    this.selectedSkillId = null;
    this.battleEnded = false;
    this.inputLocked = false;
    this.previewPath = null;
    this.hoverTile = null;
    this.pendingAction = null;
    this.uiManager.clearLog();
    this.uiManager.log("v9 战斗开始：职业与六项属性系统已启用，攻击、先攻、豁免会按属性修正计算。", "system");
    for (const unit of this.turnManager.initiativeOrder) {
      this.uiManager.log(`${unit.name} 先攻：d20(${unit.initiativeRoll}) + 敏捷修正${unit.initiativeBonus >= 0 ? "+" + unit.initiativeBonus : unit.initiativeBonus} = ${unit.initiativeTotal}`, unit.team);
    }
    this.uiManager.log(`轮到 ${this.currentUnit.name}`, "turn");
    this.render();
    this.maybeRunEnemyTurn();
  }

  get currentUnit() { return this.turnManager.getCurrentUnit(); }
  get availableSkills() { return this.skillSystem.getUnitSkills(this.currentUnit); }
  get selectedSkill() { return this.skillSystem.getSkill(this.selectedSkillId); }

  getTileFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: Math.floor((event.clientX - rect.left) / TILE_SIZE),
      y: Math.floor((event.clientY - rect.top) / TILE_SIZE),
      px: event.clientX - rect.left,
      py: event.clientY - rect.top,
    };
  }

  handleCanvasHover(event) {
    if (this.battleEnded || this.inputLocked) return;
    const tile = this.getTileFromEvent(event);
    this.hoverTile = { x: tile.x, y: tile.y };
    const current = this.currentUnit;
    if (current?.team === TEAM.PLAYER && this.mode === ACTION_MODE.MOVE) {
      const movePlan = this.gridManager.findPath(current, tile.x, tile.y);
      this.previewPath = movePlan?.path || null;
    }
    this.showTileTooltip(tile);
    this.render();
  }

  showTileTooltip(tile) {
    if (!this.gridManager.isInsideGrid(tile.x, tile.y)) { this.uiManager.hideTooltip(); return; }
    const unit = this.gridManager.getUnitAt(tile.x, tile.y);
    const blocked = this.gridManager.isBlocked(tile.x, tile.y);
    const current = this.currentUnit;
    let html = `<strong>格子 (${tile.x}, ${tile.y})</strong><br>${blocked ? "地形：障碍物" : "地形：普通"}`;
    if (unit) {
      html += `<br><strong class="${unit.team}">${unit.name}</strong><br>HP ${unit.hp}/${unit.maxHp} | AC ${unit.effectiveAc}<br>攻击 +${unit.effectiveAttackBonus} | DEX豁免 ${unit.getSaveBonus ? (unit.getSaveBonus("DEX") >= 0 ? "+" + unit.getSaveBonus("DEX") : unit.getSaveBonus("DEX")) : "+" + (unit.saveBonus || 0)}<br>职业：${unit.className || "无"} Lv.${unit.level || 1} | 属性 STR ${unit.abilities?.STR ?? "-"} DEX ${unit.abilities?.DEX ?? "-"} CON ${unit.abilities?.CON ?? "-"}<br>状态：${unit.statusEffects.length ? unit.statusEffects.map(e => `${e.name}(${e.duration})`).join("、") : "无"}`;
    }
    if (current?.team === TEAM.PLAYER && this.mode === ACTION_MODE.MOVE) {
      const plan = this.gridManager.findPath(current, tile.x, tile.y);
      if (plan) html += `<br>移动路径：${plan.cost} 格`;
    }
    const skill = this.selectedSkill;
    if (current?.team === TEAM.PLAYER && this.mode === ACTION_MODE.SKILL && skill && this.skillSystem.isAreaSkill(skill)) {
      const targets = this.units.filter(u => u.isAlive && u.team !== current.team && this.gridManager.getDistance(u, tile) <= (skill.radius || 0));
      html += `<br><span class="aoe">${skill.name}</span>：影响 ${targets.length} 个敌人，${skill.saveType || "DEX"} 豁免 DC ${skill.saveDC}`;
    }
    this.uiManager.showTooltip(html, tile.px, tile.py);
  }

  clearHover() {
    this.hoverTile = null;
    this.previewPath = null;
    this.uiManager.hideTooltip();
    this.render();
  }

  handleCanvasClick(event) {
    if (this.battleEnded || this.inputLocked) return;
    const current = this.currentUnit;
    if (!current || current.team !== TEAM.PLAYER) return;
    const { x, y } = this.getTileFromEvent(event);
    if (!this.gridManager.isInsideGrid(x, y)) return;

    if (this.mode === ACTION_MODE.MOVE) this.queueMove(current, x, y);
    if (this.mode === ACTION_MODE.ATTACK) {
      const target = this.gridManager.getUnitAt(x, y);
      if (target && this.combatSystem.canAttack(current, target)) this.pendingAction = { type: "attack", attacker: current, target, label: `确认让 ${current.name} 普通攻击 ${target.name}？` };
    }
    if (this.mode === ACTION_MODE.SKILL && this.selectedSkill) {
      const skill = this.selectedSkill;
      if (this.skillSystem.isAreaSkill(skill)) {
        const center = { x, y };
        if (this.skillSystem.canUseSkill(current, center, skill)) {
          const count = this.units.filter(u => u.isAlive && u.team !== current.team && this.gridManager.getDistance(u, center) <= (skill.radius || 0)).length;
          this.pendingAction = { type: "skill", attacker: current, target: center, center, skill, label: `确认使用 ${skill.name} 指向 (${x}, ${y})？将影响 ${count} 个敌人。` };
        }
      } else {
        const target = this.gridManager.getUnitAt(x, y);
        if (target && this.skillSystem.canUseSkill(current, target, skill)) this.pendingAction = { type: "skill", attacker: current, target, skill, label: `确认让 ${current.name} 对 ${target.name} 使用 ${skill.name}？` };
      }
    }
    this.render();
  }

  queueMove(unit, x, y) {
    const movePlan = this.gridManager.findPath(unit, x, y);
    if (!movePlan) return;
    this.previewPath = movePlan.path;
    this.pendingAction = { type: "move", unit, x, y, path: movePlan.path, cost: movePlan.cost, label: `确认让 ${unit.name} 移动到 (${x}, ${y})？消耗 ${movePlan.cost} 格移动。` };
  }

  queueDefend() {
    if (this.battleEnded || this.inputLocked) return;
    const unit = this.currentUnit;
    if (!unit || unit.team !== TEAM.PLAYER || unit.hasAttacked || unit.hasDefended) return;
    this.pendingAction = { type: "defend", unit, label: `确认让 ${unit.name} 采取防御动作？本回合动作会被消耗，AC +2。` };
    this.render();
  }

  async confirmPendingAction() {
    const action = this.pendingAction;
    if (!action || this.inputLocked) return;
    this.pendingAction = null;
    if (action.type === "move") await this.executeMove(action);
    if (action.type === "attack") this.tryAttack(action.attacker, action.target);
    if (action.type === "skill") this.trySkill(action.attacker, action.target, action.skill);
    if (action.type === "defend") this.tryDefend(action.unit);
  }

  cancelPendingAction() {
    this.pendingAction = null;
    this.previewPath = null;
    this.render();
  }

  async executeMove(action) {
    const unit = action.unit;
    this.inputLocked = true;
    this.previewPath = action.path;
    for (const step of action.path) {
      unit.x = step.x;
      unit.y = step.y;
      this.previewPath = action.path.slice(step.cost);
      this.render();
      await sleep(ANIMATION_STEP_MS);
    }
    this.gridManager.consumeMove(unit, action.cost);
    this.previewPath = null;
    this.uiManager.log(`${unit.name} 沿路径移动到 (${action.x}, ${action.y})，消耗 ${action.cost} 格移动`, unit.team);
    this.inputLocked = false;
    this.render();
  }

  tryAttack(attacker, target) {
    const result = this.combatSystem.attack(attacker, target);
    this.handleActionResult(result);
    this.checkBattleEnd();
    this.render();
  }

  trySkill(user, target, skill) {
    const result = this.skillSystem.useSkill(user, target, skill, this.units);
    this.handleActionResult(result);
    this.checkBattleEnd();
    this.render();
  }

  tryDefend(unit = this.currentUnit) {
    if (!unit || this.battleEnded || this.inputLocked) return;
    if (unit.defend()) {
      this.uiManager.log(`${unit.name} 采取防御动作：直到下次行动前 AC +2。`, unit.team);
      this.render();
    }
  }

  handleActionResult(result) {
    if (!result.success) { this.uiManager.log(result.reason, "system"); return; }
    if (result.kind === "heal") {
      const { attacker, target, skill, amount } = result;
      this.uiManager.log(`${attacker.name} 使用 ${skill.name}，治疗 ${target.name} ${amount} 点 HP（${target.hp}/${target.maxHp}）。`, "heal");
      this.logSkillCost(attacker, skill); return;
    }
    if (result.kind === "buff") {
      const { attacker, target, skill, statusEffect } = result;
      this.uiManager.log(`${attacker.name} 使用 ${skill.name}，${target.name} 获得状态：${statusEffect.name}（持续 ${statusEffect.duration} 回合）。`, "buff");
      this.logSkillCost(attacker, skill); return;
    }
    if (result.kind === "aoe") { this.handleAoeResult(result); return; }
    this.handleAttackResult(result);
  }

  handleAoeResult(result) {
    const { attacker, skill, center, affected } = result;
    this.uiManager.log(`${attacker.name} 使用 ${skill.name}，区域中心 (${center.x}, ${center.y})，影响 ${affected.length} 个敌人。`, attacker.team);
    if (affected.length === 0) this.uiManager.log("区域内没有敌人。", "system");
    for (const item of affected) {
      this.uiManager.log(`${item.target.name} 进行 ${skill.saveType || "DEX"} 豁免：d20(${item.saveRoll}) + ${item.saveBonus} = ${item.saveTotal} vs DC ${item.saveDC || skill.saveDC}，${item.saved ? "成功，伤害减半" : "失败"}，受到 ${item.damage} 点伤害。`, "save");
      if (item.killed) this.uiManager.log(`${item.target.name} 被击倒！`, "system");
    }
    this.logSkillCost(attacker, skill);
  }

  handleAttackResult(result) {
    if (!result.success) { this.uiManager.log(result.reason, "system"); return; }
    const { attacker, target, d20, attackBonus, attackTotal, targetAc, hit, damage, killed, critical, naturalOne, skill, pushed, statusEffect } = result;
    const actionName = skill ? `使用 ${skill.name} 攻击` : "攻击";
    this.uiManager.log(`${attacker.name} ${actionName} ${target.name}：d20(${d20}) + ${attackBonus} = ${attackTotal} vs AC ${targetAc}`, attacker.team);
    if (naturalOne) { this.uiManager.log("自然 1：大失败，必定未命中。", "crit"); if (skill) this.logSkillCost(attacker, skill); return; }
    if (critical) this.uiManager.log("自然 20：重击！必定命中，伤害骰翻倍。", "crit");
    if (hit) {
      const extra = skill?.damageBonus ? `，包含技能额外 +${skill.damageBonus} 伤害` : "";
      this.uiManager.log(`命中！造成 ${damage.total} 点伤害${extra}，${target.name} 剩余 HP ${target.hp}/${target.maxHp}`, "hit");
      if (statusEffect) this.uiManager.log(`${target.name} 获得状态：${statusEffect.name}（持续 ${statusEffect.duration} 回合）。`, "system");
      if (pushed) this.uiManager.log(`${target.name} 被推开 ${pushed} 格。`, "system");
      if (skill) this.logSkillCost(attacker, skill);
      if (killed) this.uiManager.log(`${target.name} 被击倒！`, "system");
    } else {
      this.uiManager.log("未命中。", "miss");
      if (skill) this.logSkillCost(attacker, skill);
    }
  }

  logSkillCost(attacker, skill) {
    const state = attacker.skillState[skill.id];
    if (!state) return;
    const uses = state.usesRemaining === null ? "∞" : state.usesRemaining;
    this.uiManager.log(`${skill.name} 进入冷却 ${state.cooldownRemaining} 回合，剩余使用次数 ${uses}。`, "system");
  }

  nextTurn() {
    if (this.battleEnded || this.inputLocked) return;
    const next = this.turnManager.nextTurn();
    this.mode = ACTION_MODE.MOVE;
    this.selectedSkillId = null;
    this.previewPath = null;
    this.pendingAction = null;
    if (next) {
      this.uiManager.log(`轮到 ${next.name}`, "turn");
      this.processTurnStartStatus(next);
      this.checkBattleEnd();
    }
    this.render();
    this.maybeRunEnemyTurn();
  }

  processTurnStartStatus(unit) {
    const logs = this.statusEffectSystem.processTurnStart(unit);
    for (const log of logs) {
      if (log.type === "damage") this.uiManager.log(`${unit.name} 受到 ${log.effect.name} 影响，受到 ${log.amount} 点伤害。`, "damage");
      if (log.type === "heal") this.uiManager.log(`${unit.name} 受到 ${log.effect.name} 影响，恢复 ${log.amount} 点 HP。`, "heal");
    }
    if (!unit.isAlive) this.uiManager.log(`${unit.name} 被状态效果击倒！`, "system");
  }

  maybeRunEnemyTurn() {
    const current = this.currentUnit;
    if (!this.battleEnded && current && current.team === TEAM.ENEMY) setTimeout(() => this.runEnemyTurn(), 500);
  }

  async runEnemyTurn() {
    if (this.battleEnded) return;
    const enemy = this.currentUnit;
    if (!enemy || enemy.team !== TEAM.ENEMY) return;
    this.inputLocked = true;
    let action = this.enemyAI.chooseAction(enemy, this.units);
    if (action.type === "move" && action.movePlan) {
      const target = action.target;
      for (const step of action.movePlan.path) { enemy.x = step.x; enemy.y = step.y; this.render(); await sleep(ANIMATION_STEP_MS); }
      this.gridManager.consumeMove(enemy, action.movePlan.cost);
      this.uiManager.log(`${enemy.name} 向 ${target.name} 靠近，消耗 ${action.movePlan.cost} 格移动`, "enemy");
      action = this.enemyAI.chooseAction(enemy, this.units);
    }
    if (action.type === "skill") this.handleActionResult(this.skillSystem.useSkill(enemy, action.target, action.skill, this.units));
    else if (action.type === "attack") this.handleActionResult(this.combatSystem.attack(enemy, action.target));
    else if (action.type === "defend") this.uiManager.log(`${enemy.name} 找不到攻击机会，采取防御动作。`, "enemy");
    this.checkBattleEnd();
    this.inputLocked = false;
    this.render();
    if (!this.battleEnded) setTimeout(() => this.nextTurn(), 650);
  }

  checkBattleEnd() {
    const playersAlive = this.units.some(unit => unit.team === TEAM.PLAYER && unit.isAlive);
    const enemiesAlive = this.units.some(unit => unit.team === TEAM.ENEMY && unit.isAlive);
    if (!playersAlive || !enemiesAlive) { this.battleEnded = true; this.uiManager.log(playersAlive ? "玩家胜利！" : "敌人胜利！", "system"); }
  }

  render() {
    this.renderer.render({ units: this.units, currentUnit: this.currentUnit, mode: this.mode, selectedSkill: this.selectedSkill, previewPath: this.previewPath, hoverTile: this.hoverTile, pendingAction: this.pendingAction });
    this.uiManager.render({
      units: this.units,
      initiativeOrder: this.turnManager.initiativeOrder,
      currentUnit: this.currentUnit,
      mode: this.mode,
      battleEnded: this.battleEnded,
      availableSkills: this.availableSkills,
      selectedSkillId: this.selectedSkillId,
      skillSystem: this.skillSystem,
      inputLocked: this.inputLocked,
      pendingAction: this.pendingAction,
    });
  }
}
