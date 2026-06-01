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

  canOpportunityAttack(attacker, target) {
    if (!attacker || !target) return false;
    if (!attacker.isAlive || !target.isAlive) return false;
    if (attacker.team === target.team) return false;
    if (!attacker.reactionAvailable) return false;
    return this.gridManager.getDistance(attacker, target) <= attacker.attackRange;
  }

  attack(attacker, target) {
    if (!this.canAttack(attacker, target)) return { success: false, reason: "不能攻击该目标" };
    const result = this.rollAttack(attacker, target, { type: "attack", kind: "attack", spendAction: true });
    attacker.spendAction?.();
    return result;
  }

  opportunityAttack(attacker, target) {
    if (!this.canOpportunityAttack(attacker, target)) return { success: false, reason: "不能进行机会攻击" };
    const result = this.rollAttack(attacker, target, { type: "reaction", kind: "opportunity" });
    attacker.spendReaction?.();
    return result;
  }

  getAttackRollMode(attacker, target) {
    const advantages = [];
    const disadvantages = [];
    if (target?.isDodging) disadvantages.push("目标正在闪避");
    if (target?.isProne) {
      const adjacent = this.gridManager.getDistance(attacker, target) <= 1;
      if (adjacent) advantages.push("攻击倒地目标且相邻");
      else disadvantages.push("远程攻击倒地目标");
    }
    if (advantages.length && disadvantages.length) return { mode: "normal", reasons: ["优势和劣势互相抵消"] };
    if (advantages.length) return { mode: "advantage", reasons: advantages };
    if (disadvantages.length) return { mode: "disadvantage", reasons: disadvantages };
    return { mode: "normal", reasons: [] };
  }

  rollD20ForAttack(attacker, target) {
    const { mode, reasons } = this.getAttackRollMode(attacker, target);
    if (mode === "advantage" || mode === "disadvantage") {
      const rolls = [Dice.rollDie(20), Dice.rollDie(20)];
      return { value: mode === "advantage" ? Math.max(...rolls) : Math.min(...rolls), rolls, mode, reasons };
    }
    const value = Dice.rollDie(20);
    return { value, rolls: [value], mode, reasons };
  }

  rollAttack(attacker, target, meta = {}) {
    const rollInfo = this.rollD20ForAttack(attacker, target);
    const d20 = rollInfo.value;
    const naturalOne = d20 === 1;
    const critical = d20 === 20;
    const attackBonus = attacker.effectiveAttackBonus;
    const attackTotal = d20 + attackBonus;
    const coverBonus = this.gridManager.getCoverBonus?.(attacker, target) || 0;
    const targetAc = target.effectiveAc + coverBonus;
    const hit = critical || (!naturalOne && attackTotal >= targetAc);
    const result = { success: true, kind: "attack", type: meta.type || "attack", specialKind: meta.kind || null, attacker, target, d20, rollInfo, naturalOne, critical, attackBonus, attackTotal, targetAc, coverBonus, hit, damage: null, killed: false };
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
    return result;
  }
}
