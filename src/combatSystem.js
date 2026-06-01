import { Dice } from "./dice.js";

export class CombatSystem {
  constructor(gridManager) { this.gridManager = gridManager; }

  canAttack(attacker, target) {
    if (!attacker || !target) return false;
    if (!attacker.isAlive || !target.isAlive) return false;
    if (attacker.team === target.team) return false;
    if (!attacker.actionAvailable) return false;
    return this.gridManager.getDistance(attacker, target) <= attacker.attackRange;
  }

  attack(attacker, target) {
    if (!this.canAttack(attacker, target)) return { success: false, reason: "不能攻击该目标" };
    const rollInfo = this.rollD20ForAttack(target);
    const d20 = rollInfo.value;
    const naturalOne = d20 === 1;
    const critical = d20 === 20;
    const attackBonus = attacker.effectiveAttackBonus;
    const attackTotal = d20 + attackBonus;
    const targetAc = target.effectiveAc;
    const hit = critical || (!naturalOne && attackTotal >= targetAc);
    const result = { success: true, kind: "attack", type: "attack", attacker, target, d20, rollInfo, naturalOne, critical, attackBonus, attackTotal, targetAc, hit, damage: null, killed: false };
    if (hit) {
      const damage = Dice.rollDice(attacker.damageDice, critical ? 2 : 1);
      damage.total += attacker.damageAbilityModifier;
      const featureNotes = [];
      const favoredBonus = attacker.getDamageBonusAgainst?.(target) || 0;
      if (favoredBonus) { damage.total += favoredBonus; featureNotes.push(`偏好敌人 +${favoredBonus}`); }
      for (const dice of attacker.getExtraDamageDiceAgainst?.(target) || []) {
        const extra = Dice.rollDice(dice, critical ? 2 : 1);
        damage.total += extra.total;
        featureNotes.push(`猎人印记 ${dice}=${extra.total}`);
      }
      if (critical && attacker.hasClassFeature?.("savage_attacks_feature")) {
        const savage = Dice.rollDice(attacker.damageDice);
        damage.total += savage.total;
        featureNotes.push(`凶蛮重击 +${savage.total}`);
      }
      target.takeDamage(damage.total);
      result.damage = damage;
      result.featureNotes = featureNotes;
      result.killed = !target.isAlive;
    }
    attacker.spendAction?.();
    return result;
  }

  canOpportunityAttack(attacker, target) {
    if (!attacker || !target) return false;
    if (!attacker.isAlive || !target.isAlive) return false;
    if (attacker.team === target.team) return false;
    if (!attacker.reactionAvailable) return false;
    return this.gridManager.getDistance(attacker, target) <= attacker.attackRange;
  }

  opportunityAttack(attacker, target) {
    if (!this.canOpportunityAttack(attacker, target)) return { success: false, reason: "不能进行机会攻击" };
    const result = this.rollAttack(attacker, target, { type: "reaction", kind: "opportunity" });
    attacker.spendReaction?.();
    return result;
  }

  rollD20ForAttack(target) {
    if (target?.isDodging) {
      const rolls = [Dice.rollDie(20), Dice.rollDie(20)];
      return { value: Math.min(...rolls), rolls, mode: "disadvantage", reason: "目标正在闪避" };
    }
    const value = Dice.rollDie(20);
    return { value, rolls: [value], mode: "normal" };
  }

  rollAttack(attacker, target, meta = {}) {
    const rollInfo = this.rollD20ForAttack(target);
    const d20 = rollInfo.value;
    const naturalOne = d20 === 1;
    const critical = d20 === 20;
    const attackBonus = attacker.effectiveAttackBonus;
    const attackTotal = d20 + attackBonus;
    const targetAc = target.effectiveAc;
    const hit = critical || (!naturalOne && attackTotal >= targetAc);
    const result = { success: true, kind: "attack", type: meta.type || "attack", specialKind: meta.kind || null, attacker, target, d20, rollInfo, naturalOne, critical, attackBonus, attackTotal, targetAc, hit, damage: null, killed: false };
    if (hit) {
      const damage = Dice.rollDice(attacker.damageDice, critical ? 2 : 1);
      damage.total += attacker.damageAbilityModifier;
      target.takeDamage(damage.total);
      result.damage = damage;
      result.killed = !target.isAlive;
    }
    return result;
  }
}
