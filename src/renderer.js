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
    this.debugOptions = { showCoords: true, showTerrain: true, showMoveCost: false, showReachable: false };
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
    this.drawHighlights(currentUnit, mode, selectedSkill, units);
    this.drawAoePreview(currentUnit, selectedSkill, hoverTile, units);
    this.drawPath(previewPath);
    this.drawHoverTile(hoverTile);
    this.drawPendingAction(pendingAction);
    this.drawUnits(units, currentUnit);
    this.drawDebugOverlay(currentUnit);
  }

  drawBoard() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const terrain = MAP_TILES[y]?.[x] ?? TERRAIN.NORMAL;
        const base = (x + y) % 2 === 0 ? "#1e293b" : "#273449";
        ctx.fillStyle = base;
        if (terrain === TERRAIN.BLOCKED) ctx.fillStyle = "#111827";
        if (terrain === TERRAIN.DIFFICULT) ctx.fillStyle = "#3b2f63";
        if (terrain === TERRAIN.DAMAGING) ctx.fillStyle = "#5f1f1f";
        if (terrain === TERRAIN.HEALING) ctx.fillStyle = "#164e3f";
        if (terrain === TERRAIN.GOAL) ctx.fillStyle = "#62500f";
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "#475569";
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        const icon = terrain === TERRAIN.BLOCKED ? "⬛"
          : terrain === TERRAIN.DIFFICULT ? "≈"
          : terrain === TERRAIN.DAMAGING ? "🔥"
          : terrain === TERRAIN.HEALING ? "✚"
          : terrain === TERRAIN.GOAL ? "★"
          : "";
        if (icon) {
          ctx.fillStyle = terrain === TERRAIN.BLOCKED ? "#6b7280" : "rgba(255,255,255,.68)";
          ctx.font = terrain === TERRAIN.DIFFICULT ? "bold 32px system-ui" : "bold 26px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(icon, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
        }
      }
    }
  }

  drawHighlights(currentUnit, mode, selectedSkill, units = []) {
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
            const isArea = mode === ACTION_MODE.SKILL && selectedSkill && this.skillSystem.isAreaSkill(selectedSkill);
            const isAllySkill = mode === ACTION_MODE.SKILL && selectedSkill && selectedSkill.targetType === "ally";
            const isSelfSkill = mode === ACTION_MODE.SKILL && selectedSkill && selectedSkill.targetType === "self";
            ctx.fillStyle = isArea ? "rgba(249,115,22,.22)" : isAllySkill || isSelfSkill ? "rgba(34,197,94,.28)" : "rgba(248, 113, 113, 0.32)";
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = isArea ? "#fb923c" : isAllySkill || isSelfSkill ? "#22c55e" : "#ef4444";
            ctx.lineWidth = 3;
            ctx.strokeRect(x * TILE_SIZE + 5, y * TILE_SIZE + 5, TILE_SIZE - 10, TILE_SIZE - 10);
            ctx.lineWidth = 1;
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

      this.drawHealthBar(unit, centerX, centerY);
      this.drawStatusIcons(unit, centerX, centerY);
    }
  }


  drawHealthBar(unit, centerX, centerY) {
    const ctx = this.ctx;
    const width = 54;
    const height = 8;
    const x = centerX - width / 2;
    const y = centerY + 29;
    const pct = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
    ctx.fillStyle = "rgba(3, 7, 18, 0.88)";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = pct > 0.5 ? "#22c55e" : pct > 0.25 ? "#facc15" : "#ef4444";
    ctx.fillRect(x, y, width * pct, height);
    ctx.strokeStyle = "#111827";
    ctx.strokeRect(x, y, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${unit.hp}/${unit.maxHp}`, centerX, y - 1);
  }

  drawStatusIcons(unit, centerX, centerY) {
    const ctx = this.ctx;
    const icons = [];
    if (unit.isDefending) icons.push({ text: "🛡", bg: "#166534" });
    if (unit.isProne) icons.push({ text: "倒", bg: "#92400e" });
    for (const effect of unit.statusEffects) {
      const name = effect.name || "状态";
      const icon = name.includes("毒") ? "☠" : name.includes("守护") || effect.acBonus ? "◆" : effect.attackBonus ? "⚔" : "✦";
      const bg = name.includes("毒") ? "#365314" : effect.acBonus ? "#075985" : "#581c87";
      icons.push({ text: icon, bg });
    }
    icons.slice(0, 4).forEach((icon, index) => {
      const x = centerX - 27 + index * 16;
      const y = centerY - 34;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = icon.bg;
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(icon.text, x, y);
    });
  }


  drawDebugOverlay(currentUnit) {
    const opts = this.debugOptions || {};
    if (!opts.showCoords && !opts.showTerrain && !opts.showMoveCost && !opts.showReachable) return;
    const ctx = this.ctx;
    const reachable = new Map();
    if (opts.showReachable && currentUnit) {
      for (const tile of this.gridManager.getReachableTiles(currentUnit)) {
        reachable.set(`${tile.x},${tile.y}`, tile.cost);
      }
    }
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (opts.showReachable && reachable.has(`${x},${y}`)) {
          ctx.fillStyle = "rgba(34,197,94,.18)";
          ctx.fillRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          ctx.strokeStyle = "rgba(34,197,94,.72)";
          ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        }
        const lines = [];
        if (opts.showCoords) lines.push(`${x},${y}`);
        if (opts.showTerrain) lines.push(`T${this.gridManager.getTerrain(x, y)}`);
        if (opts.showMoveCost && !this.gridManager.isBlocked(x, y)) lines.push(`C${this.gridManager.getMoveCost(x, y)}`);
        if (opts.showReachable && reachable.has(`${x},${y}`)) lines.push(`R${reachable.get(`${x},${y}`)}`);
        if (!lines.length) continue;
        ctx.fillStyle = "rgba(3,7,18,.72)";
        ctx.fillRect(px + 3, py + 3, 44, 14 + (lines.length - 1) * 12);
        ctx.fillStyle = "#e5e7eb";
        ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        lines.forEach((line, i) => ctx.fillText(line, px + 6, py + 5 + i * 12));
      }
    }
  }

}
