import { Dice } from "./dice.js";

export class SkillSystem {
  constructor(gridManager, skills) { this.gridManager = gridManager; this.skills = skills; }
  setSkills(skills) { this.skills = skills; }
  getSkill(skillId) { return this.skills.find(skill => skill.id === skillId) || null; }
  getUnitSkills(unit) { return unit?.skills ? unit.skills.map(id => this.getSkill(id)).filter(Boolean) : []; }
  getState(user, skill) { return user?.skillState?.[skill?.id] || null; }

  isAreaSkill(skill) { return skill?.type === "aoe" || skill?.targetType === "area"; }

  isValidTarget(user, target, skill) {
    if (!user || !skill || !user.isAlive) return false;
    if (this.isAreaSkill(skill)) return target && Number.isInteger(target.x) && Number.isInteger(target.y);
    if (!target || !target.isAlive) return false;
    const targetType = skill.targetType || "enemy";
    if (targetType === "self") return user === target;
    if (targetType === "ally") return user.team === target.team;
    if (targetType === "enemy") return user.team !== target.team;
    return false;
  }

  canUseSkill(user, target, skill) {
    if (!this.isValidTarget(user, target, skill)) return false;
    const cost = skill.actionCost || (skill.endsAttack ? "action" : "bonus");
    if (cost === "action" && !user.actionAvailable) return false;
    if (cost === "bonus" && !user.bonusActionAvailable) return false;
    if (cost === "reaction" && !user.reactionAvailable) return false;
    if (skill.isSpell && skill.spellSlotCost && !user.hasSpellSlot?.(skill.spellSlotCost)) return false;
    const state = this.getState(user, skill);
    if (state) {
      if (state.cooldownRemaining > 0) return false;
      if (state.usesRemaining !== null && state.usesRemaining <= 0) return false;
    }
    return this.gridManager.getDistance(user, target) <= skill.range;
  }

  getUnavailableReason(user, skill) {
    const state = this.getState(user, skill);
    if (!state) return "";
    if (state.cooldownRemaining > 0) return `冷却中：${state.cooldownRemaining} 回合`;
    if (state.usesRemaining !== null && state.usesRemaining <= 0) return "使用次数已耗尽";
    if (skill.isSpell && skill.spellSlotCost && !user.hasSpellSlot?.(skill.spellSlotCost)) return `${skill.spellSlotCost} 环法术位不足`;
    const cost = skill.actionCost || (skill.endsAttack ? "action" : "bonus");
    if (cost === "action" && !user.actionAvailable) return "本回合动作已用";
    if (cost === "bonus" && !user.bonusActionAvailable) return "本回合附赠动作已用";
    if (cost === "reaction" && !user.reactionAvailable) return "本轮反应已用";
    return "";
  }

  spendSkill(user, skill) {
    const state = this.getState(user, skill);
    if (state) {
      state.cooldownRemaining = skill.cooldown || 0;
      if (state.usesRemaining !== null) state.usesRemaining -= 1;
    }
    if (skill.isSpell && skill.spellSlotCost) user.spendSpellSlot?.(skill.spellSlotCost);
    const cost = skill.actionCost || (skill.endsAttack ? "action" : "bonus");
    if (cost === "action") user.spendAction?.();
    if (cost === "bonus") user.spendBonusAction?.();
    if (cost === "reaction") user.spendReaction?.();
  }

  useSkill(user, target, skill, allUnits = []) {
    if (!this.canUseSkill(user, target, skill)) return { success: false, reason: "不能对该目标使用技能" };
    if (this.isAreaSkill(skill)) return this.useAoeSkill(user, target, skill, allUnits);
    if ((skill.type || "attack") === "heal") return this.useHeal(user, target, skill);
    if (skill.type === "buff") return this.useBuff(user, target, skill);
    if (skill.type === "debuff") return this.useDebuff(user, target, skill);
    if (skill.type === "extraAction") return this.useExtraAction(user, target, skill);
    return this.useAttackSkill(user, target, skill);
  }

  useHeal(user, target, skill) {
    const before = target.hp;
    const heal = Dice.rollDice(skill.healDice || "1d4");
    const abilityBonus = skill.healAddSpellAbility ? (user.spellAbilityModifier || 0) : 0;
    target.heal(heal.total + (skill.healBonus || 0) + abilityBonus);
    this.spendSkill(user, skill);
    return { success: true, kind: "heal", type: "skill", skill, attacker: user, target, heal, amount: target.hp - before };
  }

  useBuff(user, target, skill) {
    if (skill.statusEffect) target.addStatusEffect(skill.statusEffect, user);
    this.spendSkill(user, skill);
    return { success: true, kind: "buff", type: "skill", skill, attacker: user, target, statusEffect: skill.statusEffect };
  }

  useDebuff(user, target, skill) {
    if (skill.statusEffect) target.addStatusEffect(skill.statusEffect, user);
    this.spendSkill(user, skill);
    return { success: true, kind: "debuff", type: "skill", skill, attacker: user, target, statusEffect: skill.statusEffect };
  }

  useExtraAction(user, target, skill) {
    this.spendSkill(user, skill);
    user.restoreAction?.();
    return { success: true, kind: "extraAction", type: "skill", skill, attacker: user, target: user };
  }

  useAoeSkill(user, center, skill, allUnits) {
    const affected = allUnits
      .filter(unit => unit.isAlive && unit.team !== user.team)
      .filter(unit => this.gridManager.getDistance(unit, center) <= (skill.radius || 0));
    const results = [];
    for (const target of affected) {
      const saveRoll = Dice.rollDie(20);
      const saveBonus = target.getSaveBonus ? target.getSaveBonus(skill.saveType || "DEX") : (target.saveBonus || 0);
      const saveTotal = saveRoll + saveBonus;
      const dc = skill.saveDC || (skill.isSpell ? user.spellSaveDC : null) || user.spellSaveDC || 10;
      const saved = saveTotal >= dc;
      const damage = Dice.rollDice(skill.damageDice || "1d6");
      const finalDamage = saved && skill.halfOnSave ? Math.floor(damage.total / 2) : damage.total;
      target.takeDamage(finalDamage);
      results.push({ target, saveRoll, saveBonus, saveTotal, saveDC: dc, saved, damage: finalDamage, killed: !target.isAlive });
    }
    this.spendSkill(user, skill);
    return { success: true, kind: "aoe", type: "skill", skill, attacker: user, center, affected: results };
  }

  getAttackRollMode(user, target) {
    const advantages = [];
    const disadvantages = [];
    if (target?.isDodging) disadvantages.push("目标正在闪避");
    if (target?.isProne) {
      const adjacent = this.gridManager.getDistance(user, target) <= 1;
      if (adjacent) advantages.push("攻击倒地目标且相邻");
      else disadvantages.push("远程攻击倒地目标");
    }
    if (advantages.length && disadvantages.length) return { mode: "normal", reasons: ["优势和劣势互相抵消"] };
    if (advantages.length) return { mode: "advantage", reasons: advantages };
    if (disadvantages.length) return { mode: "disadvantage", reasons: disadvantages };
    return { mode: "normal", reasons: [] };
  }

  rollD20ForAttack(user, target) {
    const { mode, reasons } = this.getAttackRollMode(user, target);
    if (mode === "advantage" || mode === "disadvantage") {
      const rolls = [Dice.rollDie(20), Dice.rollDie(20)];
      return { value: mode === "advantage" ? Math.max(...rolls) : Math.min(...rolls), rolls, mode, reasons };
    }
    const value = Dice.rollDie(20);
    return { value, rolls: [value], mode, reasons };
  }

  useAttackSkill(user, target, skill) {
    const rollInfo = this.rollD20ForAttack(user, target);
    const d20 = rollInfo.value;
    const attackBonus = (skill.useSpellAttack ? user.getSpellAttackBonus() : user.effectiveAttackBonus) + (skill.attackBonusModifier || 0);
    const naturalOne = d20 === 1;
    const critical = d20 === 20;
    const attackTotal = d20 + attackBonus;
    const coverBonus = this.gridManager.getCoverBonus?.(user, target) || 0;
    const targetAc = target.effectiveAc + coverBonus;
    const hit = critical || (!naturalOne && attackTotal >= targetAc);
    const result = { success: true, kind: "attack", type: "skill", skill, attacker: user, target, d20, rollInfo, naturalOne, critical, attackBonus, attackTotal, targetAc, coverBonus, hit, damage: null, killed: false, pushed: null, statusEffect: null, knockedProne: false };
    if (hit) {
      const damage = Dice.rollDice(skill.damageDice || user.damageDice, critical ? 2 : 1);
      damage.total += (skill.addAbilityDamage === false ? 0 : user.damageAbilityModifier) + (skill.damageBonus || 0);
      const featureNotes = [];
      const favoredBonus = user.getDamageBonusAgainst?.(target) || 0;
      if (favoredBonus) { damage.total += favoredBonus; featureNotes.push(`偏好敌人 +${favoredBonus}`); }
      for (const dice of user.getExtraDamageDiceAgainst?.(target) || []) {
        const extra = Dice.rollDice(dice, critical ? 2 : 1);
        damage.total += extra.total;
        featureNotes.push(`猎人印记 ${dice}=${extra.total}`);
      }
      if (critical && user.hasClassFeature?.("savage_attacks_feature")) {
        const savage = Dice.rollDice(user.damageDice);
        damage.total += savage.total;
        featureNotes.push(`凶蛮重击 +${savage.total}`);
      }
      target.takeDamage(damage.total);
      result.damage = damage;
      result.featureNotes = featureNotes;
      result.killed = !target.isAlive;
      if (skill.statusEffect && target.isAlive) { target.addStatusEffect(skill.statusEffect, user); result.statusEffect = skill.statusEffect; }
      if (skill.push && target.isAlive) { result.pushed = this.tryPush(user, target, skill.push); if (result.pushed > 0) { target.knockProne?.(); result.knockedProne = true; } }
    }
    this.spendSkill(user, skill);
    return result;
  }


  tryPush(user, target, distance) {
    const dx = Math.sign(target.x - user.x);
    const dy = Math.sign(target.y - user.y);
    let moved = 0;
    for (let i = 0; i < distance; i++) {
      const nx = target.x + dx;
      const ny = target.y + dy;
      if (!this.gridManager.isInsideGrid(nx, ny) || this.gridManager.isBlocked(nx, ny) || this.gridManager.getUnitAt(nx, ny)) break;
      target.x = nx; target.y = ny; moved++;
    }
    return moved;
  }
}
