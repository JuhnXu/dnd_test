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
    this.gridManager = new GridManager(this.units);
    this.combatSystem = new CombatSystem(this.gridManager);
    this.skillSystem = new SkillSystem(this.gridManager, SKILLS);
    this.statusEffectSystem = new StatusEffectSystem();
    this.turnManager = new TurnManager(this.units);
    this.enemyAI = new EnemyAI(this.gridManager, this.combatSystem, this.skillSystem);
    this.uiManager = new UIManager();
    this.renderer = new Renderer(canvas, this.gridManager, this.combatSystem, this.skillSystem);
    this.bindEvents();
  }

  bindEvents() {
    this.canvas.addEventListener("click", event => this.handleCanvasClick(event));
    this.uiManager.bindEvents({
      onMoveMode: () => { this.mode = ACTION_MODE.MOVE; this.selectedSkillId = null; this.render(); },
      onAttackMode: () => { this.mode = ACTION_MODE.ATTACK; this.selectedSkillId = null; this.render(); },
      onSkillMode: () => {
        const usable = this.availableSkills.filter(skill => !this.skillSystem.getUnavailableReason(this.currentUnit, skill));
        this.selectedSkillId = this.selectedSkillId || usable[0]?.id || this.availableSkills[0]?.id || null;
        this.mode = ACTION_MODE.SKILL;
        this.render();
      },
      onSkillSelect: skillId => { this.selectedSkillId = skillId; this.mode = ACTION_MODE.SKILL; this.render(); },
      onDefend: () => this.tryDefend(),
      onEndTurn: () => this.nextTurn(),
      onRestart: () => this.resetGame(),
    });
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
    this.uiManager.clearLog();
    this.uiManager.log("v5 战斗开始：状态效果、治疗、Buff、位移技能已启用。", "system");
    for (const unit of this.turnManager.initiativeOrder) {
      this.uiManager.log(`${unit.name} 先攻：d20(${unit.initiativeRoll}) + ${unit.initiativeBonus} = ${unit.initiativeTotal}`, unit.team);
    }
    this.uiManager.log(`轮到 ${this.currentUnit.name}`, this.currentUnit.team);
    this.render();
    this.maybeRunEnemyTurn();
  }

  get currentUnit() { return this.turnManager.getCurrentUnit(); }
  get availableSkills() { return this.skillSystem.getUnitSkills(this.currentUnit); }
  get selectedSkill() { return this.skillSystem.getSkill(this.selectedSkillId); }

  async handleCanvasClick(event) {
    if (this.battleEnded || this.inputLocked) return;
    const current = this.currentUnit;
    if (!current || current.team !== TEAM.PLAYER) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);

    if (this.mode === ACTION_MODE.MOVE) await this.tryMove(current, x, y);
    if (this.mode === ACTION_MODE.ATTACK) {
      const target = this.gridManager.getUnitAt(x, y);
      if (target) this.tryAttack(current, target);
    }
    if (this.mode === ACTION_MODE.SKILL) {
      const target = this.gridManager.getUnitAt(x, y);
      if (target && this.selectedSkill) this.trySkill(current, target, this.selectedSkill);
    }
  }

  async tryMove(unit, x, y) {
    const movePlan = this.gridManager.findPath(unit, x, y);
    if (!movePlan) return;
    this.inputLocked = true;
    this.previewPath = movePlan.path;
    this.render();
    await sleep(80);
    for (const step of movePlan.path) {
      unit.x = step.x;
      unit.y = step.y;
      this.previewPath = movePlan.path.slice(step.cost);
      this.render();
      await sleep(ANIMATION_STEP_MS);
    }
    this.gridManager.consumeMove(unit, movePlan.cost);
    this.previewPath = null;
    this.uiManager.log(`${unit.name} 沿路径移动到 (${x}, ${y})，消耗 ${movePlan.cost} 格移动`, unit.team);
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
    const result = this.skillSystem.useSkill(user, target, skill);
    this.handleActionResult(result);
    this.checkBattleEnd();
    this.render();
  }

  tryDefend() {
    if (this.battleEnded || this.inputLocked) return;
    const unit = this.currentUnit;
    if (!unit || unit.team !== TEAM.PLAYER) return;
    if (unit.defend()) {
      this.uiManager.log(`${unit.name} 采取防御动作：直到下次行动前 AC +2。`, unit.team);
      this.render();
    }
  }

  handleActionResult(result) {
    if (!result.success) { this.uiManager.log(result.reason, "system"); return; }
    if (result.kind === "heal") {
      const { attacker, target, skill, amount } = result;
      this.uiManager.log(`${attacker.name} 使用 ${skill.name}，治疗 ${target.name} ${amount} 点 HP（${target.hp}/${target.maxHp}）。`, attacker.team);
      this.logSkillCost(attacker, skill);
      return;
    }
    if (result.kind === "buff") {
      const { attacker, target, skill, statusEffect } = result;
      this.uiManager.log(`${attacker.name} 使用 ${skill.name}，${target.name} 获得状态：${statusEffect.name}（持续 ${statusEffect.duration} 回合）。`, attacker.team);
      this.logSkillCost(attacker, skill);
      return;
    }
    this.handleAttackResult(result);
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
      this.uiManager.log(`命中！造成 ${damage.total} 点伤害${extra}，${target.name} 剩余 HP ${target.hp}/${target.maxHp}`, "system");
      if (statusEffect) this.uiManager.log(`${target.name} 获得状态：${statusEffect.name}（持续 ${statusEffect.duration} 回合）。`, "system");
      if (pushed) this.uiManager.log(`${target.name} 被推开 ${pushed} 格。`, "system");
      if (skill) this.logSkillCost(attacker, skill);
      if (killed) this.uiManager.log(`${target.name} 被击倒！`, "system");
    } else {
      this.uiManager.log("未命中。", "system");
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
    if (next) {
      this.uiManager.log(`轮到 ${next.name}`, next.team);
      this.processTurnStartStatus(next);
      this.checkBattleEnd();
    }
    this.render();
    this.maybeRunEnemyTurn();
  }

  processTurnStartStatus(unit) {
    const logs = this.statusEffectSystem.processTurnStart(unit);
    for (const log of logs) {
      if (log.type === "damage") this.uiManager.log(`${unit.name} 受到 ${log.effect.name} 影响，受到 ${log.amount} 点伤害。`, "system");
      if (log.type === "heal") this.uiManager.log(`${unit.name} 受到 ${log.effect.name} 影响，恢复 ${log.amount} 点 HP。`, "system");
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
      for (const step of action.movePlan.path) {
        enemy.x = step.x;
        enemy.y = step.y;
        this.render();
        await sleep(ANIMATION_STEP_MS);
      }
      this.gridManager.consumeMove(enemy, action.movePlan.cost);
      this.uiManager.log(`${enemy.name} 向 ${target.name} 靠近，消耗 ${action.movePlan.cost} 格移动`, "enemy");
      action = this.enemyAI.chooseAction(enemy, this.units);
    }

    if (action.type === "skill") this.handleActionResult(this.skillSystem.useSkill(enemy, action.target, action.skill));
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
    if (!playersAlive || !enemiesAlive) {
      this.battleEnded = true;
      this.uiManager.log(playersAlive ? "玩家胜利！" : "敌人胜利！", "system");
    }
  }

  render() {
    this.renderer.render({ units: this.units, currentUnit: this.currentUnit, mode: this.mode, selectedSkill: this.selectedSkill, previewPath: this.previewPath });
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
    });
  }
}
