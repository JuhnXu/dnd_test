import { ACTION_MODE, GRID_SIZE, MAP_TILES, TILE_SIZE, TEAM, TERRAIN } from "./config.js";

export class Renderer {
  constructor(canvas, gridManager, combatSystem, skillSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.gridManager = gridManager;
    this.combatSystem = combatSystem;
    this.skillSystem = skillSystem;
  }

  render({ units, currentUnit, mode, selectedSkill }) {
    this.drawBoard();
    this.drawHighlights(currentUnit, mode, selectedSkill);
    this.drawUnits(units, currentUnit);
  }

  drawBoard() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const blocked = MAP_TILES[y][x] === TERRAIN.BLOCKED;
        ctx.fillStyle = blocked ? "#111827" : ((x + y) % 2 === 0 ? "#1e293b" : "#273449");
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "#475569";
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        if (blocked) {
          ctx.fillStyle = "#6b7280";
          ctx.font = "bold 28px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("⬛", x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
        }
      }
    }
  }

  drawHighlights(currentUnit, mode, selectedSkill) {
    if (!currentUnit || currentUnit.team !== TEAM.PLAYER) return;
    const ctx = this.ctx;
    if (mode === ACTION_MODE.MOVE) {
      for (const tile of this.gridManager.getReachableTiles(currentUnit)) {
        ctx.fillStyle = "rgba(96, 165, 250, 0.25)";
        ctx.fillRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.font = "12px system-ui";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText(String(tile.cost), (tile.x + 1) * TILE_SIZE - 6, (tile.y + 1) * TILE_SIZE - 6);
      }
    }
    if (mode === ACTION_MODE.ATTACK || mode === ACTION_MODE.SKILL) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const target = this.gridManager.getUnitAt(x, y);
          const canTarget = mode === ACTION_MODE.ATTACK
            ? this.combatSystem.canAttack(currentUnit, target)
            : this.skillSystem.canUseSkill(currentUnit, target, selectedSkill);
          if (target && canTarget) {
            ctx.fillStyle = "rgba(248, 113, 113, 0.35)";
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
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
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(unit.name.slice(0, 2), centerX, centerY - 4);
      ctx.font = "12px system-ui";
      ctx.fillText(`${unit.hp}/${unit.maxHp}`, centerX, centerY + 14);
    }
  }
}
