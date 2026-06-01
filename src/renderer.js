import { ACTION_MODE, GRID_SIZE, TILE_SIZE, TEAM } from "./config.js";

export class Renderer {
  constructor(canvas, gridManager, combatSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.gridManager = gridManager;
    this.combatSystem = combatSystem;
  }

  render({ units, currentUnit, mode }) {
    this.drawBoard();
    this.drawHighlights(currentUnit, mode);
    this.drawUnits(units, currentUnit);
  }

  drawBoard() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#1e293b" : "#273449";
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "#475569";
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  drawHighlights(currentUnit, mode) {
    if (!currentUnit || currentUnit.team !== TEAM.PLAYER) return;
    const ctx = this.ctx;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (mode === ACTION_MODE.MOVE && this.gridManager.canMoveTo(currentUnit, x, y)) {
          ctx.fillStyle = "rgba(96, 165, 250, 0.25)";
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
        const target = this.gridManager.getUnitAt(x, y);
        if (mode === ACTION_MODE.ATTACK && target && this.combatSystem.canAttack(currentUnit, target)) {
          ctx.fillStyle = "rgba(248, 113, 113, 0.35)";
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  drawUnits(units, currentUnit) {
    const ctx = this.ctx;
    for (const unit of units) {
      if (!unit.isAlive) continue;
      const centerX = unit.x * TILE_SIZE + TILE_SIZE / 2;
      const centerY = unit.y * TILE_SIZE + TILE_SIZE / 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 23, 0, Math.PI * 2);
      ctx.fillStyle = unit.team === TEAM.PLAYER ? "#3b82f6" : "#ef4444";
      ctx.fill();
      if (unit === currentUnit) {
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#facc15";
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(unit.name.slice(0, 2), centerX, centerY - 4);
      ctx.font = "12px system-ui";
      ctx.fillText(`${unit.hp}/${unit.maxHp}`, centerX, centerY + 14);
    }
  }
}
