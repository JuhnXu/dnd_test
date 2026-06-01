import { DEFEND_AC_BONUS } from "./config.js";

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
  }

  get isAlive() { return this.hp > 0; }
  get acBonusFromStatus() { return this.statusEffects.reduce((sum, e) => sum + (e.acModifier || 0), 0); }
  get attackBonusFromStatus() { return this.statusEffects.reduce((sum, e) => sum + (e.attackBonusModifier || 0), 0); }
  get effectiveAc() { return this.ac + (this.isDefending ? DEFEND_AC_BONUS : 0) + this.acBonusFromStatus; }
  get effectiveAttackBonus() { return this.attackBonus + this.attackBonusFromStatus; }

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
