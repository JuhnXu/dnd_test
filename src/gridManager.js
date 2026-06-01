import { GRID_SIZE } from "./config.js";

export class GridManager {
  constructor(units) { this.units = units; }
  setUnits(units) { this.units = units; }
  isInsideGrid(x, y) { return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE; }
  getUnitAt(x, y) { return this.units.find(unit => unit.isAlive && unit.x === x && unit.y === y); }
  getDistance(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
  canMoveTo(unit, x, y) {
    if (!unit || unit.hasMoved) return false;
    if (!this.isInsideGrid(x, y)) return false;
    if (this.getUnitAt(x, y)) return false;
    return this.getDistance(unit, { x, y }) <= unit.move;
  }
  moveUnit(unit, x, y) {
    if (!this.canMoveTo(unit, x, y)) return false;
    unit.x = x;
    unit.y = y;
    unit.hasMoved = true;
    return true;
  }
}
