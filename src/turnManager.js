export class TurnManager {
  constructor(units) { this.units = units; this.turnIndex = 0; }
  reset(units) { this.units = units; this.turnIndex = 0; this.getCurrentUnit()?.resetTurnActions(); }
  getCurrentUnit() {
    if (this.units.length === 0) return null;
    let safety = 0;
    while (this.units[this.turnIndex] && !this.units[this.turnIndex].isAlive && safety < this.units.length) {
      this.turnIndex = (this.turnIndex + 1) % this.units.length;
      safety++;
    }
    return this.units[this.turnIndex] || null;
  }
  nextTurn() {
    if (this.units.length === 0) return null;
    let safety = 0;
    do {
      this.turnIndex = (this.turnIndex + 1) % this.units.length;
      safety++;
    } while (!this.units[this.turnIndex].isAlive && safety < this.units.length);
    const current = this.getCurrentUnit();
    current?.resetTurnActions();
    return current;
  }
}
