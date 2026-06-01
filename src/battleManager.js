import { ACTION_MODE, INITIAL_UNITS, TEAM, TILE_SIZE } from "./config.js";
import { Unit } from "./unit.js";
import { GridManager } from "./gridManager.js";
import { CombatSystem } from "./combatSystem.js";
import { TurnManager } from "./turnManager.js";
import { EnemyAI } from "./enemyAI.js";
import { UIManager } from "./uiManager.js";
import { Renderer } from "./renderer.js";

export class BattleManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.units = [];
    this.mode = ACTION_MODE.MOVE;
    this.battleEnded = false;
    this.gridManager = new GridManager(this.units);
    this.combatSystem = new CombatSystem(this.gridManager);
    this.turnManager = new TurnManager(this.units);
    this.enemyAI = new EnemyAI(this.gridManager, this.combatSystem);
    this.uiManager = new UIManager();
    this.renderer = new Renderer(canvas, this.gridManager, this.combatSystem);
    this.bindEvents();
  }

  bindEvents() {
    this.canvas.addEventListener("click", event => this.handleCanvasClick(event));
    this.uiManager.bindEvents({
      onMoveMode: () => { this.mode = ACTION_MODE.MOVE; this.render(); },
      onAttackMode: () => { this.mode = ACTION_MODE.ATTACK; this.render(); },
      onEndTurn: () => this.nextTurn(),
      onRestart: () => this.resetGame(),
    });
  }

  resetGame() {
    this.units = INITIAL_UNITS.map(config => new Unit(config));
    this.gridManager.setUnits(this.units);
    this.turnManager.reset(this.units);
    this.mode = ACTION_MODE.MOVE;
    this.battleEnded = false;
    this.uiManager.clearLog();
    this.uiManager.log("战斗开始！已投先攻。", "system");
    for (const unit of this.turnManager.initiativeOrder) {
      this.uiManager.log(`${unit.name} 先攻：d20(${unit.initiativeRoll}) + ${unit.initiativeBonus} = ${unit.initiativeTotal}`, unit.team);
    }
    this.uiManager.log(`轮到 ${this.currentUnit.name}`, this.currentUnit.team);
    this.render();
    this.maybeRunEnemyTurn();
  }

  get currentUnit() { return this.turnManager.getCurrentUnit(); }

  handleCanvasClick(event) {
    if (this.battleEnded) return;
    const current = this.currentUnit;
    if (!current || current.team !== TEAM.PLAYER) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);
    if (this.mode === ACTION_MODE.MOVE) this.tryMove(current, x, y);
    if (this.mode === ACTION_MODE.ATTACK) {
      const target = this.gridManager.getUnitAt(x, y);
      if (target) this.tryAttack(current, target);
    }
  }

  tryMove(unit, x, y) {
    const cost = this.gridManager.moveUnit(unit, x, y);
    if (!cost) return;
    this.uiManager.log(`${unit.name} 移动到 (${x}, ${y})，消耗 ${cost} 格移动`, unit.team);
    this.render();
  }

  tryAttack(attacker, target) {
    const result = this.combatSystem.attack(attacker, target);
    this.handleAttackResult(result);
    this.checkBattleEnd();
    this.render();
  }

  handleAttackResult(result) {
    if (!result.success) {
      this.uiManager.log(result.reason, "system");
      return;
    }
    const { attacker, target, d20, attackBonus, attackTotal, targetAc, hit, damage, killed, critical, naturalOne } = result;
    this.uiManager.log(`${attacker.name} 攻击 ${target.name}：d20(${d20}) + ${attackBonus} = ${attackTotal} vs AC ${targetAc}`, attacker.team);
    if (naturalOne) {
      this.uiManager.log("自然 1：大失败，必定未命中。", "crit");
      return;
    }
    if (critical) {
      this.uiManager.log("自然 20：重击！必定命中，伤害骰翻倍。", "crit");
    }
    if (hit) {
      this.uiManager.log(`命中！造成 ${damage.total} 点伤害，${target.name} 剩余 HP ${target.hp}/${target.maxHp}`, "system");
      if (killed) this.uiManager.log(`${target.name} 被击倒！`, "system");
    } else {
      this.uiManager.log("未命中。", "system");
    }
  }

  nextTurn() {
    if (this.battleEnded) return;
    const next = this.turnManager.nextTurn();
    this.mode = ACTION_MODE.MOVE;
    if (next) this.uiManager.log(`轮到 ${next.name}`, next.team);
    this.render();
    this.maybeRunEnemyTurn();
  }

  maybeRunEnemyTurn() {
    const current = this.currentUnit;
    if (!this.battleEnded && current && current.team === TEAM.ENEMY) setTimeout(() => this.runEnemyTurn(), 500);
  }

  runEnemyTurn() {
    if (this.battleEnded) return;
    const enemy = this.currentUnit;
    if (!enemy || enemy.team !== TEAM.ENEMY) return;
    const result = this.enemyAI.run(enemy, this.units);
    if (result.type === "move" || result.type === "moveAndAttack") {
      this.uiManager.log(`${enemy.name} 向 ${result.target.name} 靠近，消耗 ${result.moved || 0} 格移动`, "enemy");
    }
    if (result.attackResult) this.handleAttackResult(result.attackResult);
    this.checkBattleEnd();
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
    this.renderer.render({ units: this.units, currentUnit: this.currentUnit, mode: this.mode });
    this.uiManager.render({
      units: this.units,
      initiativeOrder: this.turnManager.initiativeOrder,
      currentUnit: this.currentUnit,
      mode: this.mode,
      battleEnded: this.battleEnded,
    });
  }
}
