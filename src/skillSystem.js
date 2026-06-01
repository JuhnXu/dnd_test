import { Dice } from "./dice.js";

export class SkillSystem {
  constructor(gridManager, skills) {
    this.gridManager = gridManager;
    this.skills = skills;
  }

  setSkills(skills) {
    this.skills = skills;
  }

  getSkill(skillId) {
    return this.skills.find(skill => skill.id === skillId) || null;
  }

  getUnitSkills(unit) {
    if (!unit?.skills) return [];
    return unit.skills.map(id => this.getSkill(id)).filter(Boolean);
  }

  canUseSkill(user, target, skill) {
    if (!user || !target || !skill) return false;
    if (!user.isAlive || !target.isAlive) return false;
    if (user.team === target.team) return false;
    if (user.hasAttacked && skill.endsAttack) return false;
    return this.gridManager.getDistance(user, target) <= skill.range;
  }

  useSkill(user, target, skill) {
    if (!this.canUseSkill(user, target, skill)) {
      return { success: false, reason: "不能对该目标使用技能" };
    }

    const d20 = Dice.rollDie(20);
    const attackBonus = user.attackBonus + (skill.attackBonusModifier || 0);
    const naturalOne = d20 === 1;
    const critical = d20 === 20;
    const attackTotal = d20 + attackBonus;
    const hit = critical || (!naturalOne && attackTotal >= target.ac);

    const result = {
      success: true,
      type: "skill",
      skill,
      attacker: user,
      target,
      d20,
      naturalOne,
      critical,
      attackBonus,
      attackTotal,
      targetAc: target.ac,
      hit,
      damage: null,
      killed: false,
    };

    if (hit) {
      const damage = Dice.rollDice(skill.damageDice || user.damageDice, critical ? 2 : 1);
      damage.total += skill.damageBonus || 0;
      target.takeDamage(damage.total);
      result.damage = damage;
      result.killed = !target.isAlive;
    }

    if (skill.endsAttack) user.hasAttacked = true;
    return result;
  }
}
