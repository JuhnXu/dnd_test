export class EnemyAI {
  constructor(gridManager, combatSystem) {
    this.gridManager = gridManager;
    this.combatSystem = combatSystem;
  }

  run(enemy, units) {
    const target = this.getNearestTarget(enemy, units);
    if (!target) return { type: "none" };
    if (this.combatSystem.canAttack(enemy, target)) return { type: "attack", target, attackResult: this.combatSystem.attack(enemy, target) };
    this.moveToward(enemy, target);
    if (this.combatSystem.canAttack(enemy, target)) return { type: "moveAndAttack", target, attackResult: this.combatSystem.attack(enemy, target) };
    return { type: "move", target };
  }

  getNearestTarget(unit, units) {
    return units.filter(other => other.isAlive && other.team !== unit.team)
      .sort((a, b) => this.gridManager.getDistance(unit, a) - this.gridManager.getDistance(unit, b))[0] || null;
  }

  moveToward(unit, target) {
    let steps = unit.move;
    while (steps > 0 && this.gridManager.getDistance(unit, target) > unit.attackRange) {
      const nextStep = this.getBestStepToward(unit, target);
      if (!nextStep) break;
      unit.x = nextStep.x;
      unit.y = nextStep.y;
      steps--;
    }
    unit.hasMoved = true;
  }

  getBestStepToward(unit, target) {
    const candidates = [
      { x: unit.x + 1, y: unit.y },
      { x: unit.x - 1, y: unit.y },
      { x: unit.x, y: unit.y + 1 },
      { x: unit.x, y: unit.y - 1 },
    ];
    return candidates
      .filter(tile => this.gridManager.isInsideGrid(tile.x, tile.y))
      .filter(tile => !this.gridManager.getUnitAt(tile.x, tile.y))
      .sort((a, b) => this.gridManager.getDistance(a, target) - this.gridManager.getDistance(b, target))[0];
  }
}
