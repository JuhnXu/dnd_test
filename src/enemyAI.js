export class EnemyAI {
  constructor(gridManager, combatSystem, skillSystem) {
    this.gridManager = gridManager;
    this.combatSystem = combatSystem;
    this.skillSystem = skillSystem;
  }

  run(enemy, units) {
    const target = this.getNearestTarget(enemy, units);
    if (!target) return { type: "none" };

    const bestSkill = this.getBestUsableSkill(enemy, target);
    if (bestSkill) {
      return { type: "skill", target, attackResult: this.skillSystem.useSkill(enemy, target, bestSkill) };
    }

    if (this.combatSystem.canAttack(enemy, target)) {
      return { type: "attack", target, attackResult: this.combatSystem.attack(enemy, target) };
    }

    const moved = this.moveToward(enemy, target);
    const skillAfterMove = this.getBestUsableSkill(enemy, target);
    if (skillAfterMove) {
      return { type: "moveAndSkill", target, moved, attackResult: this.skillSystem.useSkill(enemy, target, skillAfterMove) };
    }

    if (this.combatSystem.canAttack(enemy, target)) {
      return { type: "moveAndAttack", target, moved, attackResult: this.combatSystem.attack(enemy, target) };
    }
    return { type: "move", target, moved };
  }

  getBestUsableSkill(unit, target) {
    return this.skillSystem
      .getUnitSkills(unit)
      .find(skill => this.skillSystem.canUseSkill(unit, target, skill));
  }

  getNearestTarget(unit, units) {
    return units
      .filter(other => other.isAlive && other.team !== unit.team)
      .sort((a, b) => this.gridManager.getDistance(unit, a) - this.gridManager.getDistance(unit, b))[0] || null;
  }

  moveToward(unit, target) {
    const reachable = this.gridManager.getReachableTiles(unit);
    if (reachable.length === 0) return 0;

    const best = reachable.sort((a, b) => this.gridManager.getDistance(a, target) - this.gridManager.getDistance(b, target))[0];
    return this.gridManager.moveUnit(unit, best.x, best.y);
  }
}
