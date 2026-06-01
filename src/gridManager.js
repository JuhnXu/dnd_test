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
      { x: tile.x + 1, y: tile.y }, { x: tile.x - 1, y: tile.y },
      { x: tile.x, y: tile.y + 1 }, { x: tile.x, y: tile.y - 1 },
    ].filter(next => this.isInsideGrid(next.x, next.y) && !this.isBlocked(next.x, next.y));
  }

  getReachableTiles(unit) {
    if (!unit || unit.hasMoved || unit.remainingMove <= 0) return [];
    const startKey = `${unit.x},${unit.y}`;
    const visited = new Map([[startKey, { x: unit.x, y: unit.y, cost: 0, prev: null }]]);
    const queue = [{ x: unit.x, y: unit.y, cost: 0 }];
    while (queue.length > 0) {
      const current = queue.shift();
      for (const next of this.getNeighbors(current)) {
        const key = `${next.x},${next.y}`;
        if (visited.has(key)) continue;
        if (this.getUnitAt(next.x, next.y)) continue;
        const cost = current.cost + 1;
        if (cost > unit.remainingMove) continue;
        const node = { x: next.x, y: next.y, cost, prev: `${current.x},${current.y}` };
        visited.set(key, node);
        queue.push(node);
      }
    }
    return [...visited.values()].filter(tile => tile.cost > 0);
  }

  findPath(unit, x, y) {
    const startKey = `${unit.x},${unit.y}`;
    const targetKey = `${x},${y}`;
    const visited = new Map([[startKey, { x: unit.x, y: unit.y, cost: 0, prev: null }]]);
    const queue = [{ x: unit.x, y: unit.y, cost: 0 }];
    while (queue.length > 0) {
      const current = queue.shift();
      if (`${current.x},${current.y}` === targetKey) break;
      for (const next of this.getNeighbors(current)) {
        const key = `${next.x},${next.y}`;
        if (visited.has(key)) continue;
        if (this.getUnitAt(next.x, next.y)) continue;
        const cost = current.cost + 1;
        if (cost > unit.remainingMove) continue;
        visited.set(key, { x: next.x, y: next.y, cost, prev: `${current.x},${current.y}` });
        queue.push({ x: next.x, y: next.y, cost });
      }
    }
    if (!visited.has(targetKey)) return null;
    const path = [];
    let key = targetKey;
    while (key && key !== startKey) {
      const node = visited.get(key);
      path.unshift({ x: node.x, y: node.y, cost: node.cost });
      key = node.prev;
    }
    return { path, cost: visited.get(targetKey).cost };
  }

  canMoveTo(unit, x, y) { return Boolean(this.findPath(unit, x, y)); }

  moveUnit(unit, x, y) {
    const result = this.findPath(unit, x, y);
    if (!result) return false;
    unit.x = x; unit.y = y;
    unit.remainingMove -= result.cost;
    unit.hasMoved = unit.remainingMove <= 0;
    return result.cost;
  }

  consumeMove(unit, cost) {
    unit.remainingMove = Math.max(0, unit.remainingMove - cost);
    unit.hasMoved = unit.remainingMove <= 0;
  }
}
