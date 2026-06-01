import { Dice } from "./dice.js";

export class CombatSystem {
  constructor(gridManager) { this.gridManager = gridManager; }

  canAttack(attacker, target) {
    if (!attacker || !target) return false;
    if (!attacker.isAlive || !target.isAlive) return false;
    if (attacker.team === target.team) return false;
    if (attacker.hasAttacked) return false;
    return this.gridManager.getDistance(attacker, target) <= attacker.attackRange;
  }

  attack(attacker, target) {
    if (!this.canAttack(attacker, target)) return { success: false, reason: "不能攻击该目标" };

    const d20 = Dice.rollDie(20);
    const naturalOne = d20 === 1;
    const critical = d20 === 20;
    const attackTotal = d20 + attacker.attackBonus;
    const hit = critical || (!naturalOne && attackTotal >= target.ac);

    const result = {
      success: true,
      attacker,
      target,
      d20,
      naturalOne,
      critical,
      attackBonus: attacker.attackBonus,
      attackTotal,
      targetAc: target.ac,
      hit,
      damage: null,
      killed: false,
    };

    if (hit) {
      const damage = Dice.rollDice(attacker.damageDice, critical ? 2 : 1);
      target.takeDamage(damage.total);
      result.damage = damage;
      result.killed = !target.isAlive;
    }

    attacker.hasAttacked = true;
    return result;
  }
}
