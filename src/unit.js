export class Unit {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.team = config.team;
    this.x = config.x;
    this.y = config.y;
    this.maxHp = config.maxHp;
    this.hp = config.maxHp;
    this.ac = config.ac;
    this.move = config.move;
    this.attackBonus = config.attackBonus;
    this.damageDice = config.damageDice;
    this.attackRange = config.attackRange || 1;
    this.hasMoved = false;
    this.hasAttacked = false;
  }

  get isAlive() { return this.hp > 0; }
  resetTurnActions() { this.hasMoved = false; this.hasAttacked = false; }
  takeDamage(amount) { this.hp = Math.max(0, this.hp - amount); }
}
