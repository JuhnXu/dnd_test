import { GRID_SIZE, MAP_TILES, TERRAIN } from "./config.js";

export class GridManager {
  constructor(units) { this.units = units; }
  setUnits(units) { this.units = units; }
  isInsideGrid(x, y) { return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE; }
  isBlocked(x, y) { return !this.isInsideGrid(x, y) || MAP_TILES[y][x] === TERRAIN.BLOCKED; }
  getUnitAt(x, y) { return this.units.find(unit => unit.isAlive && unit.x === x && unit.y === y); }
  getDistance(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

  getNeighbors(tile) {
    return [
      { x: tile.x + 1, y: tile.y },
      { x: tile.x - 1, y: tile.y },
      { x: tile.x, y: tile.y + 1 },
      { x: tile.x, y: tile.y - 1 },
    ].filter(next => this.isInsideGrid(next.x, next.y) && !this.isBlocked(next.x, next.y));
  }

  getReachableTiles(unit) {
    if (!unit || unit.hasMoved || unit.remainingMove <= 0) return [];

    const startKey = `${unit.x},${unit.y}`;
    const visited = new Map([[startKey, { x: unit.x, y: unit.y, cost: 0 }]]);
    const queue = [{ x: unit.x, y: unit.y, cost: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      for (const next of this.getNeighbors(current)) {
        const key = `${next.x},${next.y}`;
        if (visited.has(key)) continue;
        if (this.getUnitAt(next.x, next.y)) continue;

        const cost = current.cost + 1;
        if (cost > unit.remainingMove) continue;

        const node = { x: next.x, y: next.y, cost };
        visited.set(key, node);
        queue.push(node);
      }
    }

    return [...visited.values()].filter(tile => tile.cost > 0);
  }

  canMoveTo(unit, x, y) {
    return this.getReachableTiles(unit).some(tile => tile.x === x && tile.y === y);
  }

  moveUnit(unit, x, y) {
    const target = this.getReachableTiles(unit).find(tile => tile.x === x && tile.y === y);
    if (!target) return false;
    unit.x = x;
    unit.y = y;
    unit.remainingMove -= target.cost;
    unit.hasMoved = unit.remainingMove <= 0;
    return target.cost;
  }
}
