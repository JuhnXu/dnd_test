import { GRID_SIZE, MAP_TILES, TERRAIN } from "./config.js";

export class GridManager {
  constructor(units) { this.units = units; }
  setUnits(units) { this.units = units; }
  isInsideGrid(x, y) { return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE; }
  getTerrain(x, y) { return this.isInsideGrid(x, y) ? MAP_TILES[y]?.[x] ?? TERRAIN.NORMAL : TERRAIN.BLOCKED; }
  isBlocked(x, y) { return !this.isInsideGrid(x, y) || this.getTerrain(x, y) === TERRAIN.BLOCKED; }
  isDifficult(x, y) { return this.getTerrain(x, y) === TERRAIN.DIFFICULT; }
  isDamaging(x, y) { return this.getTerrain(x, y) === TERRAIN.DAMAGING; }
  isHealing(x, y) { return this.getTerrain(x, y) === TERRAIN.HEALING; }
  isGoal(x, y) { return this.getTerrain(x, y) === TERRAIN.GOAL; }
  getUnitAt(x, y) { return this.units.find(unit => unit.isAlive && unit.x === x && unit.y === y); }
  getDistance(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
  getTerrainName(x, y) {
    const t = this.getTerrain(x, y);
    if (t === TERRAIN.BLOCKED) return "障碍物";
    if (t === TERRAIN.DIFFICULT) return "困难地形（移动消耗 2）";
    if (t === TERRAIN.DAMAGING) return "伤害地形（进入/回合开始受到 1d4 伤害）";
    if (t === TERRAIN.HEALING) return "治疗地形（进入/回合开始恢复 1d4 HP）";
    if (t === TERRAIN.GOAL) return "目标区域";
    return "普通地形";
  }
  getMoveCost(x, y) { return this.isDifficult(x, y) ? 2 : 1; }

  getCoverBonus(attacker, target) {
    if (!attacker || !target) return 0;
    if (this.getDistance(attacker, target) <= 1) return 0;
    const dx = Math.sign(target.x - attacker.x);
    const dy = Math.sign(target.y - attacker.y);
    let x = attacker.x + dx;
    let y = attacker.y + dy;
    while (x !== target.x || y !== target.y) {
      if (this.isInsideGrid(x, y) && this.isBlocked(x, y)) return 2;
      x += dx; y += dy;
      if (!this.isInsideGrid(x, y)) break;
    }
    const adjacentToTarget = [
      { x: target.x + 1, y: target.y }, { x: target.x - 1, y: target.y },
      { x: target.x, y: target.y + 1 }, { x: target.x, y: target.y - 1 },
    ];
    return adjacentToTarget.some(tile => this.isInsideGrid(tile.x, tile.y) && this.isBlocked(tile.x, tile.y)) ? 2 : 0;
  }

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
        const cost = current.cost + this.getMoveCost(next.x, next.y);
        if (cost > unit.remainingMove) continue;
        if (this.getUnitAt(next.x, next.y)) continue;
        const known = visited.get(key);
        if (known && known.cost <= cost) continue;
        const node = { x: next.x, y: next.y, cost, prev: `${current.x},${current.y}` };
        visited.set(key, node);
        queue.push(node);
      }
    }
    return [...visited.values()].filter(tile => tile.cost > 0);
  }

  findPath(unit, x, y) {
    if (this.isBlocked(x, y)) return null;
    const startKey = `${unit.x},${unit.y}`;
    const targetKey = `${x},${y}`;
    const visited = new Map([[startKey, { x: unit.x, y: unit.y, cost: 0, prev: null }]]);
    const queue = [{ x: unit.x, y: unit.y, cost: 0 }];
    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift();
      if (`${current.x},${current.y}` === targetKey) break;
      for (const next of this.getNeighbors(current)) {
        const key = `${next.x},${next.y}`;
        if (this.getUnitAt(next.x, next.y) && key !== targetKey) continue;
        const cost = current.cost + this.getMoveCost(next.x, next.y);
        if (cost > unit.remainingMove) continue;
        const known = visited.get(key);
        if (known && known.cost <= cost) continue;
        visited.set(key, { x: next.x, y: next.y, cost, prev: `${current.x},${current.y}` });
        queue.push({ x: next.x, y: next.y, cost });
      }
    }
    if (!visited.has(targetKey)) return null;
    if (this.getUnitAt(x, y)) return null;
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
