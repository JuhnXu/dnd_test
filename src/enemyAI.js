export class EnemyAI {
  constructor(gridManager, combatSystem, skillSystem) {
    this.gridManager = gridManager;
    this.combatSystem = combatSystem;
    this.skillSystem = skillSystem;
  }

  chooseAction(enemy, units) {
    const target = this.getNearestTarget(enemy, units);
    if (!target) return { type: "none" };
    const selfSkill = this.getBestSelfSkill(enemy);
    if (selfSkill) return { type: "skill", target: enemy, skill: selfSkill };
    const bestSkill = this.getBestUsableSkill(enemy, target);
    if (bestSkill) return { type: "skill", target, skill: bestSkill };
    if (this.combatSystem.canAttack(enemy, target)) return { type: "attack", target };

    const movePlan = this.getMoveToward(enemy, target);
    if (!movePlan) {
      if (enemy.defend()) return { type: "defend", target };
      return { type: "none", target };
    }
    return { type: "move", target, movePlan };
  }

  getBestUsableSkill(unit, target) {
    return this.skillSystem.getUnitSkills(unit)
      .filter(skill => skill.targetType !== "self")
      .find(skill => this.skillSystem.canUseSkill(unit, target, skill));
  }

  getBestSelfSkill(unit) {
    return this.skillSystem.getUnitSkills(unit)
      .filter(skill => skill.targetType === "self" && skill.type !== "heal")
      .find(skill => this.skillSystem.canUseSkill(unit, unit, skill));
  }

  getNearestTarget(unit, units) {
    return units
      .filter(other => other.isAlive && other.team !== unit.team)
      .sort((a, b) => this.gridManager.getDistance(unit, a) - this.gridManager.getDistance(unit, b))[0] || null;
  }

  getMoveToward(unit, target) {
    const reachable = this.gridManager.getReachableTiles(unit);
    if (reachable.length === 0) return null;
    const best = reachable.sort((a, b) => this.gridManager.getDistance(a, target) - this.gridManager.getDistance(b, target))[0];
    return this.gridManager.findPath(unit, best.x, best.y);
  }
}
