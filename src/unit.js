import { DEFEND_AC_BONUS } from "./config.js";
import { getAbilityModifier } from "./ability.js";

export class Unit {
  constructor(config) {
    Object.assign(this, config);
    this.hp = config.maxHp;
    this.hasMoved = false;
    this.hasAttacked = false;
    this.hasDefended = false;
    this.isDefending = false;
    this.remainingMove = config.move;
    this.initiativeRoll = 0;
    this.initiativeTotal = 0;
    this.skillState = {};
    this.statusEffects = [];
    this.spellSlots = JSON.parse(JSON.stringify(config.spellSlots || {}));
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
    this.isDefending = false;
    this.remainingMove = this.move;
    for (const state of Object.values(this.skillState)) {
      if (state.cooldownRemaining > 0) state.cooldownRemaining -= 1;
    }
  }

  takeDamage(amount) { this.hp = Math.max(0, this.hp - amount); }
  heal(amount) { this.hp = Math.min(this.maxHp, this.hp + amount); }

  addStatusEffect(effect) {
    const existing = this.statusEffects.find(item => item.id === effect.id);
    if (existing) {
      existing.duration = Math.max(existing.duration, effect.duration);
      return;
    }
    this.statusEffects.push({ ...effect });
  }

  tickStatusDurations() {
    for (const effect of this.statusEffects) effect.duration -= 1;
    this.statusEffects = this.statusEffects.filter(effect => effect.duration > 0);
  }

  defend() {
    if (this.hasAttacked || this.hasDefended) return false;
    this.isDefending = true;
    this.hasDefended = true;
    this.hasAttacked = true;
    return true;
  }
}
