export class Unit {
  constructor(config) {
    Object.assign(this, config);
    this.hp = config.maxHp;
    this.hasMoved = false;
    this.hasAttacked = false;
    this.remainingMove = config.move;
    this.initiativeRoll = 0;
    this.initiativeTotal = 0;
  }

  get isAlive() { return this.hp > 0; }

  resetTurnActions() {
    this.hasMoved = false;
    this.hasAttacked = false;
    this.remainingMove = this.move;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }
}
