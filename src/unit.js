import { DEFEND_AC_BONUS } from "./config.js";
import { getAbilityModifier } from "./ability.js";

export class Unit {
  constructor(config) {
    Object.assign(this, config);
    this.hp = config.maxHp;
    this.hasMoved = false;
    this.hasAttacked = false;
    this.hasDefended = false;
    this.actionAvailable = true;
    this.bonusActionAvailable = true;
    this.reactionAvailable = true;
    this.isDefending = false;
    this.isDodging = false;
    this.isDisengaging = false;
    this.remainingMove = config.move;
    this.initiativeRoll = 0;
    this.initiativeTotal = 0;
    this.skillState = {};
    this.statusEffects = [];
    this.spellSlots = JSON.parse(JSON.stringify(config.spellSlots || {}));
    this.classFeatures = config.classFeatures || [];
    this.favoredEnemyTypes = config.favoredEnemyTypes || [];
  }

  get isAlive() { return this.hp > 0; }
  get acBonusFromStatus() { return this.statusEffects.reduce((sum, e) => sum + (e.acModifier || 0), 0); }
  get attackBonusFromStatus() { return this.statusEffects.reduce((sum, e) => sum + (e.attackBonusModifier || 0), 0); }
  get effectiveAc() { return this.ac + (this.isDefending ? DEFEND_AC_BONUS : 0) + this.acBonusFromStatus; }

  getAbilityScore(ability) { return this.abilities?.[ability] ?? 10; }
  getAbilityModifier(ability) { return getAbilityModifier(this.getAbilityScore(ability)); }
  get proficiency() { return this.proficiencyBonus ?? 2; }
  get attackAbilityModifier() { return this.getAbilityModifier(this.attackAbility || "STR"); }
  get damageAbilityModifier() { return this.getAbilityModifier(this.damageAbility || this.attackAbility || "STR"); }
  get effectiveAttackBonus() { return this.proficiency + this.attackAbilityModifier + this.attackBonusFromStatus; }
  get initiativeBonusCalculated() { return this.getAbilityModifier("DEX"); }
  get spellAbility() { return this.spellcastingAbility || this.skillAbility || "WIS"; }
  get spellAbilityModifier() { return this.getAbilityModifier(this.spellAbility); }
  get spellSaveDC() { return 8 + this.proficiency + this.spellAbilityModifier; }
  getSpellAttackBonus() { return this.proficiency + this.spellAbilityModifier + this.attackBonusFromStatus; }
  hasSpellSlot(level) {
    if (!level || Number(level) <= 0) return true;
    const slot = this.spellSlots?.[String(level)];
    return Boolean(slot && slot.remaining > 0);
  }
  spendSpellSlot(level) {
    if (!level || Number(level) <= 0) return true;
    const slot = this.spellSlots?.[String(level)];
    if (!slot || slot.remaining <= 0) return false;
    slot.remaining -= 1;
    return true;
  }
  getSpellSlotText() {
    const entries = Object.entries(this.spellSlots || {});
    if (!entries.length) return "无";
    return entries.map(([level, slot]) => `${level}环 ${slot.remaining}/${slot.max}`).join("，");
  }
  getSaveBonus(ability) {
    const mod = this.getAbilityModifier(ability || "DEX");
    const prof = this.saveProficiencies?.includes(ability) ? this.proficiency : 0;
    return mod + prof;
  }

  hasClassFeature(featureId) {
    return this.classFeatures?.includes(featureId);
  }

  getDamageBonusAgainst(target) {
    let bonus = 0;
    if (this.hasClassFeature("favored_enemy_feature") && this.favoredEnemyTypes?.includes(target.classId)) bonus += 1;
    return bonus;
  }

  getExtraDamageDiceAgainst(target) {
    const dice = [];
    for (const effect of target.statusEffects || []) {
      if (effect.id === "hunters_marked" && effect.sourceId === this.id && effect.extraDamageDice) dice.push(effect.extraDamageDice);
    }
    return dice;
  }

  setupSkillState(skills) {
    this.skillState = {};
    for (const skill of skills) {
      this.skillState[skill.id] = { cooldownRemaining: 0, usesRemaining: skill.maxUses ?? null };
    }
  }

  resetTurnActions() {
    this.hasMoved = false;
    this.hasAttacked = false;
    this.hasDefended = false;
    this.actionAvailable = true;
    this.bonusActionAvailable = true;
    this.reactionAvailable = true;
    this.isDefending = false;
    this.isDodging = false;
    this.isDisengaging = false;
    this.remainingMove = this.move;
    for (const state of Object.values(this.skillState)) {
      if (state.cooldownRemaining > 0) state.cooldownRemaining -= 1;
    }
  }

  takeDamage(amount) { this.hp = Math.max(0, this.hp - amount); }
  heal(amount) { this.hp = Math.min(this.maxHp, this.hp + amount); }

  addStatusEffect(effect, source = null) {
    const finalEffect = { ...effect };
    if (finalEffect.markedBy === "self" && source) finalEffect.sourceId = source.id;
    const existing = this.statusEffects.find(item => item.id === finalEffect.id && (!finalEffect.sourceId || item.sourceId === finalEffect.sourceId));
    if (existing) {
      existing.duration = Math.max(existing.duration, finalEffect.duration);
      return;
    }
    this.statusEffects.push(finalEffect);
  }

  tickStatusDurations() {
    for (const effect of this.statusEffects) effect.duration -= 1;
    this.statusEffects = this.statusEffects.filter(effect => effect.duration > 0);
  }

  spendAction() {
    if (!this.actionAvailable) return false;
    this.actionAvailable = false;
    this.hasAttacked = true;
    return true;
  }

  spendBonusAction() {
    if (!this.bonusActionAvailable) return false;
    this.bonusActionAvailable = false;
    return true;
  }

  spendReaction() {
    if (!this.reactionAvailable) return false;
    this.reactionAvailable = false;
    return true;
  }

  restoreAction() {
    this.actionAvailable = true;
    this.hasAttacked = false;
    this.hasDefended = false;
  }

  defend() {
    if (!this.actionAvailable || this.hasDefended) return false;
    this.isDefending = true;
    this.isDodging = true;
    this.hasDefended = true;
    this.spendAction();
    return true;
  }

  dash() {
    if (!this.actionAvailable) return false;
    this.remainingMove += this.move;
    this.hasMoved = this.remainingMove <= 0;
    this.spendAction();
    return true;
  }

  disengage() {
    if (!this.actionAvailable) return false;
    this.isDisengaging = true;
    this.spendAction();
    return true;
  }
}
