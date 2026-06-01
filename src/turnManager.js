import { Dice } from "./dice.js";

export class TurnManager {
  constructor(units) {
    this.units = units;
    this.turnIndex = 0;
    this.initiativeOrder = [];
  }

  reset(units) {
    this.units = units;
    this.rollInitiative();
    this.turnIndex = 0;
    this.getCurrentUnit()?.resetTurnActions();
  }

  rollInitiative() {
    for (const unit of this.units) {
      unit.initiativeRoll = Dice.rollDie(20);
      unit.initiativeBonus = unit.initiativeBonusCalculated ?? unit.initiativeBonus ?? 0;
      unit.initiativeTotal = unit.initiativeRoll + unit.initiativeBonus;
    }
    this.initiativeOrder = [...this.units].sort((a, b) => {
      if (b.initiativeTotal !== a.initiativeTotal) return b.initiativeTotal - a.initiativeTotal;
      return b.initiativeBonus - a.initiativeBonus;
    });
  }

  getCurrentUnit() {
    if (this.initiativeOrder.length === 0) return null;
    let safety = 0;
    while (!this.initiativeOrder[this.turnIndex].isAlive && safety < this.initiativeOrder.length) {
      this.turnIndex = (this.turnIndex + 1) % this.initiativeOrder.length;
      safety++;
    }
    return this.initiativeOrder[this.turnIndex] || null;
  }

  nextTurn() {
    if (this.initiativeOrder.length === 0) return null;
    let safety = 0;
    do {
      this.turnIndex = (this.turnIndex + 1) % this.initiativeOrder.length;
      safety++;
    } while (!this.initiativeOrder[this.turnIndex].isAlive && safety < this.initiativeOrder.length);

    const current = this.getCurrentUnit();
    current?.resetTurnActions();
    return current;
  }
}
