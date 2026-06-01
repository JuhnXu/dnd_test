import { CURRENT_LEVEL_INDEX, getCurrentLevel, GRID_SIZE, MAP_TILES, TERRAIN } from "./config.js";

const TERRAIN_NAMES = {
  [TERRAIN.NORMAL]: "普通",
  [TERRAIN.BLOCKED]: "障碍",
  [TERRAIN.DIFFICULT]: "困难",
  [TERRAIN.DAMAGING]: "伤害",
  [TERRAIN.HEALING]: "治疗",
  [TERRAIN.GOAL]: "目标",
};

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatUnit(unit) {
  if (!unit) return "无";
  const effects = [unit.isProne ? "倒地" : null, ...unit.statusEffects.map(e => `${e.name}(${e.duration})`)].filter(Boolean).join("、") || "无";
  return `${unit.name}\nHP ${unit.hp}/${unit.maxHp} | AC ${unit.effectiveAc}\n位置 (${unit.x},${unit.y}) | 剩余移动 ${unit.remainingMove}\nAction ${unit.actionAvailable ? "可用" : "已用"} | Bonus ${unit.bonusActionAvailable ? "可用" : "已用"} | Reaction ${unit.reactionAvailable ? "可用" : "已用"}\n状态：${effects}`;
}

export class DebugTools {
  constructor(battleManager) {
    this.battle = battleManager;
    this.enabled = true;
    this.editMode = false;
    this.selectedTerrain = TERRAIN.NORMAL;
    this.lastTile = null;
    this.infoEl = document.getElementById("debugInfo");
    this.outputEl = document.getElementById("debugOutput");
    this.bindElements();
    this.patchBattleRender();
    this.bindEditorCanvas();
    this.syncOverlayOptions();
    this.update();
  }

  bindElements() {
    this.coordsEl = document.getElementById("dbgCoords");
    this.terrainEl = document.getElementById("dbgTerrain");
    this.moveCostEl = document.getElementById("dbgMoveCost");
    this.reachableEl = document.getElementById("dbgReachable");
    this.editModeEl = document.getElementById("dbgEditMode");
    this.terrainSelectEl = document.getElementById("dbgTerrainSelect");

    [this.coordsEl, this.terrainEl, this.moveCostEl, this.reachableEl].forEach(el => {
      el?.addEventListener("change", () => {
        this.syncOverlayOptions();
        this.battle.render();
        this.update();
      });
    });

    this.editModeEl?.addEventListener("change", () => {
      this.editMode = this.editModeEl.checked;
      this.update();
    });

    this.terrainSelectEl?.addEventListener("change", () => {
      this.selectedTerrain = Number(this.terrainSelectEl.value);
      this.update();
    });

    document.getElementById("dbgRefresh")?.addEventListener("click", () => this.update());
    document.getElementById("dbgCopyLevel")?.addEventListener("click", async () => {
      const json = this.exportCurrentLevelJson();
      this.outputEl.value = json;
      try { await navigator.clipboard.writeText(json); } catch (_) {}
      this.battle.uiManager.log("已生成并尝试复制当前关卡 JSON。", "system");
    });
    document.getElementById("dbgDownloadLevel")?.addEventListener("click", () => this.downloadCurrentLevelJson());
  }

  patchBattleRender() {
    const originalRender = this.battle.render.bind(this.battle);
    this.battle.render = (...args) => {
      const result = originalRender(...args);
      this.update();
      return result;
    };
  }

  bindEditorCanvas() {
    this.battle.canvas.addEventListener("mousemove", event => {
      const tile = this.battle.getTileFromEvent(event);
      if (!this.battle.gridManager.isInsideGrid(tile.x, tile.y)) return;
      this.lastTile = { x: tile.x, y: tile.y };
      this.update();
    }, true);

    this.battle.canvas.addEventListener("click", event => {
      if (!this.editMode) return;
      const tile = this.battle.getTileFromEvent(event);
      if (!this.battle.gridManager.isInsideGrid(tile.x, tile.y)) return;
      const unit = this.battle.gridManager.getUnitAt(tile.x, tile.y);
      if (unit && this.selectedTerrain === TERRAIN.BLOCKED) {
        this.battle.uiManager.log(`不能把 ${unit.name} 所在格改成障碍物。`, "system");
        event.stopImmediatePropagation();
        event.preventDefault();
        return;
      }
      MAP_TILES[tile.y][tile.x] = this.selectedTerrain;
      this.battle.pendingAction = null;
      this.battle.previewPath = null;
      this.battle.uiManager.log(`Debug 编辑：(${tile.x}, ${tile.y}) 改为 ${TERRAIN_NAMES[this.selectedTerrain]}。`, "system");
      this.battle.render();
      event.stopImmediatePropagation();
      event.preventDefault();
    }, true);
  }

  syncOverlayOptions() {
    this.battle.renderer.debugOptions = {
      showCoords: Boolean(this.coordsEl?.checked),
      showTerrain: Boolean(this.terrainEl?.checked),
      showMoveCost: Boolean(this.moveCostEl?.checked),
      showReachable: Boolean(this.reachableEl?.checked),
    };
  }

  getTileDebugText(tile) {
    if (!tile || !this.battle.gridManager.isInsideGrid(tile.x, tile.y)) return "悬停棋盘格查看数据";
    const terrain = this.battle.gridManager.getTerrain(tile.x, tile.y);
    const unit = this.battle.gridManager.getUnitAt(tile.x, tile.y);
    const current = this.battle.currentUnit;
    const path = current ? this.battle.gridManager.findPath(current, tile.x, tile.y) : null;
    return `格子 (${tile.x},${tile.y})\n地形 ${terrain}：${TERRAIN_NAMES[terrain]}\n移动成本：${this.battle.gridManager.isBlocked(tile.x, tile.y) ? "阻挡" : this.battle.gridManager.getMoveCost(tile.x, tile.y)}\n单位：${unit ? unit.name : "无"}\n当前单位到此路径：${path ? `${path.cost} 格，${path.path.map(p => `(${p.x},${p.y})`).join(" -> ")}` : "不可达"}`;
  }

  getReachableSummary() {
    const unit = this.battle.currentUnit;
    if (!unit) return "无当前单位";
    const tiles = this.battle.gridManager.getReachableTiles(unit);
    return `${unit.name} 可达格：${tiles.length}\n${tiles.map(t => `(${t.x},${t.y}) cost ${t.cost}`).join("、") || "无"}`;
  }

  getUnitJsonSummary() {
    const unit = this.battle.currentUnit;
    if (!unit) return {};
    return {
      id: unit.id,
      name: unit.name,
      team: unit.team,
      className: unit.className,
      level: unit.level,
      hp: unit.hp,
      maxHp: unit.maxHp,
      ac: unit.ac,
      effectiveAc: unit.effectiveAc,
      position: { x: unit.x, y: unit.y },
      remainingMove: unit.remainingMove,
      actionEconomy: {
        action: unit.actionAvailable,
        bonusAction: unit.bonusActionAvailable,
        reaction: unit.reactionAvailable,
      },
      abilities: unit.abilities,
      statusEffects: unit.statusEffects,
      skillState: unit.skillState,
      spellSlots: unit.spellSlots,
    };
  }

  exportCurrentLevelJson() {
    const level = cloneJson(getCurrentLevel());
    level.tiles = cloneJson(MAP_TILES);
    level.spawns = {};
    for (const unit of this.battle.units) {
      level.spawns[unit.id] = { x: unit.x, y: unit.y };
    }
    return JSON.stringify({ levels: [level] }, null, 2);
  }

  downloadCurrentLevelJson() {
    const json = this.exportCurrentLevelJson();
    this.outputEl.value = json;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `level-${CURRENT_LEVEL_INDEX + 1}-debug-export.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  update() {
    if (!this.infoEl || !this.outputEl) return;
    const current = this.battle.currentUnit;
    const tile = this.lastTile || this.battle.hoverTile;
    const editText = this.editMode
      ? `编辑模式：开启\n点击格子会改为：${TERRAIN_NAMES[this.selectedTerrain]}\n注意：这是运行时编辑，刷新后需用导出的 JSON 覆盖 data/levels.json 才会保留。`
      : "编辑模式：关闭";

    this.infoEl.innerHTML = `
      <div class="debug-card"><strong>当前单位</strong><br>${formatUnit(current).replaceAll("\n", "<br>")}</div>
      <div class="debug-card"><strong>悬停格子 / 寻路</strong><br>${this.getTileDebugText(tile).replaceAll("\n", "<br>")}</div>
      <div class="debug-card"><strong>编辑状态</strong><br>${editText.replaceAll("\n", "<br>")}</div>
    `;

    const payload = {
      version: "v18-debug-tools",
      currentUnit: this.getUnitJsonSummary(),
      hoveredTile: tile,
      reachable: this.getReachableSummary(),
      levelExportHint: "点击“复制关卡 JSON”或“下载 JSON”导出当前地图与出生点。",
    };
    this.outputEl.value = JSON.stringify(payload, null, 2);
  }
}
