import { ACTION_MODE, GRID_SIZE, MAP_TILES, TILE_SIZE, TEAM, TERRAIN } from "./config.js";

export class Renderer {
  constructor(canvas, gridManager, combatSystem, skillSystem) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.gridManager = gridManager;
    this.combatSystem = combatSystem;
    this.skillSystem = skillSystem;
    this.imageCache = new Map();
    this.onImageLoaded = null;
  }

  getAvatarImage(src) {
    if (!src) return null;
    if (this.imageCache.has(src)) return this.imageCache.get(src);
    const image = new Image();
    image.src = src;
    image.onload = () => this.onImageLoaded?.();
    this.imageCache.set(src, image);
    return image;
  }

  render({ units, currentUnit, mode, selectedSkill, previewPath, hoverTile, pendingAction }) {
    this.drawBoard();
    this.drawHighlights(currentUnit, mode, selectedSkill);
    this.drawAoePreview(currentUnit, selectedSkill, hoverTile, units);
    this.drawPath(previewPath);
    this.drawHoverTile(hoverTile);
    this.drawPendingAction(pendingAction);
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
          let canTarget = false;
          if (mode === ACTION_MODE.ATTACK) canTarget = this.combatSystem.canAttack(currentUnit, target);
          else if (selectedSkill && this.skillSystem.isAreaSkill(selectedSkill)) canTarget = this.gridManager.getDistance(currentUnit, { x, y }) <= selectedSkill.range && !this.gridManager.isBlocked(x, y);
          else canTarget = this.skillSystem.canUseSkill(currentUnit, target, selectedSkill);
          if (canTarget) {
            ctx.fillStyle = mode === ACTION_MODE.SKILL && selectedSkill && this.skillSystem.isAreaSkill(selectedSkill) ? "rgba(249,115,22,.22)" : "rgba(248, 113, 113, 0.35)";
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }
    }
  }

  drawAoePreview(currentUnit, selectedSkill, hoverTile, units) {
    if (!currentUnit || !selectedSkill || !hoverTile || !this.skillSystem.isAreaSkill(selectedSkill)) return;
    if (this.gridManager.getDistance(currentUnit, hoverTile) > selectedSkill.range) return;
    const ctx = this.ctx;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.gridManager.getDistance({ x, y }, hoverTile) <= (selectedSkill.radius || 0)) {
          ctx.fillStyle = "rgba(249, 115, 22, 0.38)";
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
    for (const unit of units) {
      if (unit.isAlive && unit.team !== currentUnit.team && this.gridManager.getDistance(unit, hoverTile) <= (selectedSkill.radius || 0)) {
        ctx.strokeStyle = "#fed7aa";
        ctx.lineWidth = 4;
        ctx.strokeRect(unit.x * TILE_SIZE + 4, unit.y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        ctx.lineWidth = 1;
      }
    }
  }

  drawPath(path) {
    if (!path || path.length === 0) return;
    const ctx = this.ctx;
    for (const tile of path) {
      ctx.fillStyle = "rgba(250, 204, 21, 0.32)";
      ctx.fillRect(tile.x * TILE_SIZE + 14, tile.y * TILE_SIZE + 14, TILE_SIZE - 28, TILE_SIZE - 28);
    }
  }

  drawHoverTile(tile) {
    if (!tile) return;
    const ctx = this.ctx;
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.strokeRect(tile.x * TILE_SIZE + 2, tile.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.lineWidth = 1;
  }

  drawPendingAction(action) {
    if (!action) return;
    const ctx = this.ctx;
    const tiles = action.type === "move" ? action.path : action.center ? [action.center] : action.target ? [action.target] : [];
    for (const tile of tiles) {
      ctx.strokeStyle = "#86efac";
      ctx.lineWidth = 4;
      ctx.strokeRect(tile.x * TILE_SIZE + 8, tile.y * TILE_SIZE + 8, TILE_SIZE - 16, TILE_SIZE - 16);
      ctx.lineWidth = 1;
    }
  }

  drawUnits(units, currentUnit) {
    const ctx = this.ctx;
    for (const unit of units) {
      if (!unit.isAlive) continue;
      const centerX = unit.x * TILE_SIZE + TILE_SIZE / 2;
      const centerY = unit.y * TILE_SIZE + TILE_SIZE / 2;
      const radius = 26;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const avatar = this.getAvatarImage(unit.avatar);
      if (avatar && avatar.complete && avatar.naturalWidth > 0) {
        ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
      } else {
        ctx.fillStyle = unit.team === TEAM.PLAYER ? "#3b82f6" : "#ef4444";
        ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(unit.name.slice(0, 2), centerX, centerY);
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = unit.team === TEAM.PLAYER ? "#60a5fa" : "#f87171";
      ctx.stroke();

      if (unit.isDefending) { ctx.lineWidth = 5; ctx.strokeStyle = "#22c55e"; ctx.stroke(); }
      if (unit === currentUnit) { ctx.lineWidth = 5; ctx.strokeStyle = "#facc15"; ctx.stroke(); }
      ctx.lineWidth = 1;

      ctx.fillStyle = "rgba(3, 7, 18, 0.82)";
      ctx.fillRect(centerX - 23, centerY + 16, 46, 15);
      ctx.fillStyle = "#fff";
      ctx.font = "11px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${unit.hp}/${unit.maxHp}`, centerX, centerY + 23);
    }
  }
}
