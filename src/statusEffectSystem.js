import { Dice } from "./dice.js";

export class StatusEffectSystem {
  processTurnStart(unit) {
    const logs = [];
    if (!unit || !unit.isAlive) return logs;

    for (const effect of [...unit.statusEffects]) {
      if (effect.tickDamageDice) {
        const damage = Dice.rollDice(effect.tickDamageDice);
        unit.takeDamage(damage.total);
        logs.push({ type: "damage", effect, amount: damage.total, unit });
      }
      if (effect.tickHealDice && unit.isAlive) {
        const heal = Dice.rollDice(effect.tickHealDice);
        const before = unit.hp;
        unit.heal(heal.total);
        logs.push({ type: "heal", effect, amount: unit.hp - before, unit });
      }
    }

    unit.tickStatusDurations();
    return logs;
  }
}
