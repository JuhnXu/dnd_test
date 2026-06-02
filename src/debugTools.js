import { CURRENT_LEVEL_INDEX, getCurrentLevel, GRID_SIZE, INITIAL_UNITS, MAP_TILES, TEAM, TERRAIN, TILE_SIZE, exportProjectData, importDataByType, saveProjectDataToLocalStorage, loadProjectDataFromLocalStorage, clearLocalProjectData, validateProjectData } from "./config.js";

const TERRAIN_NAMES = {
  [TERRAIN.NORMAL]: "普通",
  [TERRAIN.BLOCKED]: "障碍",
  [TERRAIN.DIFFICULT]: "困难",
  [TERRAIN.DAMAGING]: "伤害",
  [TERRAIN.HEALING]: "治疗",
  [TERRAIN.GOAL]: "目标",
};

const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

function cloneJson(value) { return JSON.parse(JSON.stringify(value)); }
function toInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}
function formatUnit(unit) {
  if (!unit) return "无";
  const effects = [unit.isProne ? "倒地" : null, ...unit.statusEffects.map(e => `${e.name}(${e.duration})`)].filter(Boolean).join("、") || "无";
  return `${unit.name}\nHP ${unit.hp}/${unit.maxHp} | AC ${unit.effectiveAc}\n位置 (${unit.x},${unit.y}) | 剩余移动 ${unit.remainingMove}\nAction ${unit.actionAvailable ? "可用" : "已用"} | Bonus ${unit.bonusActionAvailable ? "可用" : "已用"} | Reaction ${unit.reactionAvailable ? "可用" : "已用"}\n属性 STR ${unit.abilities?.STR} DEX ${unit.abilities?.DEX} CON ${unit.abilities?.CON} INT ${unit.abilities?.INT} WIS ${unit.abilities?.WIS} CHA ${unit.abilities?.CHA}\n状态：${effects}`;
}

export class DebugTools {
  constructor(battleManager) {
    this.battle = battleManager;
    this.enabled = true;
    this.editMode = false;
    this.editKind = "terrain";
    this.selectedTerrain = TERRAIN.NORMAL;
    this.selectedSpawnUnitId = null;
    this.selectedUnitId = null;
    this.lastTile = null;
    this.infoEl = document.getElementById("debugInfo");
    this.outputEl = document.getElementById("debugOutput");
    this.bindElements();
    this.editMode = Boolean(this.editModeEl?.checked);
    this.patchBattleRender();
    this.bindEditorCanvas();
    this.syncOverlayOptions();
    this.refreshUnitSelectors();
    this.refreshUnitCatalog();
    this.loadUnitIntoForm(this.battle.currentUnit?.id || INITIAL_UNITS[0]?.id);
    this.refreshUnitCatalog();
    this.update();
  }

  bindElements() {
    this.coordsEl = document.getElementById("dbgCoords");
    this.terrainEl = document.getElementById("dbgTerrain");
    this.moveCostEl = document.getElementById("dbgMoveCost");
    this.reachableEl = document.getElementById("dbgReachable");
    this.editModeEl = document.getElementById("dbgEditMode");
    this.editKindEl = document.getElementById("dbgEditKind");
    this.terrainSelectEl = document.getElementById("dbgTerrainSelect");
    this.spawnUnitSelectEl = document.getElementById("dbgSpawnUnitSelect");
    this.unitSelectEl = document.getElementById("dbgUnitSelect");

    this.form = {
      name: document.getElementById("unitNameInput"),
      team: document.getElementById("unitTeamInput"),
      className: document.getElementById("unitClassInput"),
      level: document.getElementById("unitLevelInput"),
      hp: document.getElementById("unitHpInput"),
      maxHp: document.getElementById("unitMaxHpInput"),
      ac: document.getElementById("unitAcInput"),
      move: document.getElementById("unitMoveInput"),
      proficiency: document.getElementById("unitProfInput"),
      damageDice: document.getElementById("unitDamageDiceInput"),
      attackAbility: document.getElementById("unitAttackAbilityInput"),
      damageAbility: document.getElementById("unitDamageAbilityInput"),
      STR: document.getElementById("unitStrInput"),
      DEX: document.getElementById("unitDexInput"),
      CON: document.getElementById("unitConInput"),
      INT: document.getElementById("unitIntInput"),
      WIS: document.getElementById("unitWisInput"),
      CHA: document.getElementById("unitChaInput"),
    };

    [this.coordsEl, this.terrainEl, this.moveCostEl, this.reachableEl].forEach(el => {
      el?.addEventListener("change", () => { this.syncOverlayOptions(); this.battle.render(); this.update(); });
    });
    this.editModeEl?.addEventListener("change", () => { this.editMode = this.editModeEl.checked; this.update(); });
    this.editKindEl?.addEventListener("change", () => { this.editKind = this.editKindEl.value; this.refreshUnitSelectors(); this.update(); });
    this.terrainSelectEl?.addEventListener("change", () => { this.selectedTerrain = Number(this.terrainSelectEl.value); this.update(); });
    this.spawnUnitSelectEl?.addEventListener("change", () => { this.selectedSpawnUnitId = this.spawnUnitSelectEl.value; this.update(); });
    this.unitSelectEl?.addEventListener("change", () => this.loadUnitIntoForm(this.unitSelectEl.value));

    document.getElementById("dbgLoadUnit")?.addEventListener("click", () => this.loadUnitIntoForm(this.unitSelectEl?.value));
    document.getElementById("dbgApplyUnit")?.addEventListener("click", () => this.applyUnitForm());
    document.getElementById("dbgCopyUnits")?.addEventListener("click", async () => {
      const json = this.exportUnitsJson();
      this.outputEl.value = json;
      try { await navigator.clipboard.writeText(json); } catch (_) {}
      this.battle.uiManager.log("已生成并尝试复制单位 JSON。", "system");
    });
    document.getElementById("dbgDownloadUnits")?.addEventListener("click", () => this.downloadUnitsJson());

    document.getElementById("dbgRefresh")?.addEventListener("click", () => { this.refreshUnitSelectors(); this.refreshUnitCatalog(); this.update(); });
    document.getElementById("unitDataCatalog")?.addEventListener("click", event => this.handleCatalogClick(event));
    document.getElementById("dbgCopyLevel")?.addEventListener("click", async () => {
      const json = this.exportCurrentLevelJson();
      this.outputEl.value = json;
      try { await navigator.clipboard.writeText(json); } catch (_) {}
      this.battle.uiManager.log("已生成并尝试复制当前关卡 JSON。", "system");
    });
    document.getElementById("dbgDownloadLevel")?.addEventListener("click", () => this.downloadCurrentLevelJson());

    document.getElementById("dbgSaveLocal")?.addEventListener("click", () => this.saveLocal());
    document.getElementById("dbgLoadLocal")?.addEventListener("click", () => this.loadLocal());
    document.getElementById("dbgClearLocal")?.addEventListener("click", () => this.clearLocal());
    document.getElementById("dbgValidateData")?.addEventListener("click", () => this.validateData());
    document.getElementById("dbgImportJson")?.addEventListener("click", () => this.importJsonFile());
    document.getElementById("dbgCopyProject")?.addEventListener("click", async () => {
      const json = this.exportProjectJson();
      this.outputEl.value = json;
      try { await navigator.clipboard.writeText(json); } catch (_) {}
      this.battle.uiManager.log("已生成并尝试复制完整项目数据包。", "system");
    });
    document.getElementById("dbgDownloadProject")?.addEventListener("click", () => this.downloadProjectJson());
  }

  patchBattleRender() {
    const originalRender = this.battle.render.bind(this.battle);
    this.battle.render = (...args) => {
      const result = originalRender(...args);
      this.drawSpawnOverlay();
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

    this.battle.canvas.addEventListener("contextmenu", event => {
      if (!this.editMode || !this.editKind.endsWith("Spawn")) return;
      const tile = this.battle.getTileFromEvent(event);
      if (!this.battle.gridManager.isInsideGrid(tile.x, tile.y)) return;
      this.deleteSpawnAt(tile.x, tile.y);
      event.stopImmediatePropagation();
      event.preventDefault();
    }, true);

    this.battle.canvas.addEventListener("click", event => {
      if (!this.editMode) return;
      const tile = this.battle.getTileFromEvent(event);
      if (!this.battle.gridManager.isInsideGrid(tile.x, tile.y)) return;

      if (this.editKind === "terrain") this.editTerrain(tile, event);
      if (this.editKind === "playerSpawn" || this.editKind === "enemySpawn") this.placeSpawn(tile, event);
    }, true);
  }

  editTerrain(tile, event) {
    const unit = this.battle.gridManager.getUnitAt(tile.x, tile.y);
    if (unit && this.selectedTerrain === TERRAIN.BLOCKED) {
      this.battle.uiManager.log(`不能把 ${unit.name} 所在格改成障碍物。`, "system");
      event.stopImmediatePropagation(); event.preventDefault(); return;
    }
    MAP_TILES[tile.y][tile.x] = this.selectedTerrain;
    this.battle.pendingAction = null;
    this.battle.previewPath = null;
    this.battle.uiManager.log(`Debug 编辑：(${tile.x}, ${tile.y}) 改为 ${TERRAIN_NAMES[this.selectedTerrain]}。`, "system");
    this.battle.render();
    event.stopImmediatePropagation(); event.preventDefault();
  }

  placeSpawn(tile, event) {
    const unitConfig = INITIAL_UNITS.find(u => u.id === this.selectedSpawnUnitId);
    if (!unitConfig) return;
    const targetTeam = this.editKind === "playerSpawn" ? TEAM.PLAYER : TEAM.ENEMY;
    if (unitConfig.team !== targetTeam) {
      this.battle.uiManager.log(`当前模式只能放置 ${targetTeam === TEAM.PLAYER ? "玩家" : "敌人"} 出生点。`, "system");
      return;
    }
    if (this.battle.gridManager.isBlocked(tile.x, tile.y)) {
      this.battle.uiManager.log("不能把出生点放在障碍物上。", "system");
      return;
    }
    const occupying = this.battle.gridManager.getUnitAt(tile.x, tile.y);
    if (occupying && occupying.id !== unitConfig.id) {
      this.battle.uiManager.log(`该格已有 ${occupying.name}，不能放置出生点。`, "system");
      return;
    }
    const level = getCurrentLevel();
    level.spawns = level.spawns || {};
    level.spawns[unitConfig.id] = { x: tile.x, y: tile.y };
    level.unitIds = level.unitIds || [];
    if (!level.unitIds.includes(unitConfig.id)) level.unitIds.push(unitConfig.id);
    const runtimeUnit = this.battle.units.find(u => u.id === unitConfig.id);
    if (runtimeUnit) { runtimeUnit.x = tile.x; runtimeUnit.y = tile.y; }
    else this.battle.resetGame();
    this.battle.uiManager.log(`已放置 ${unitConfig.name} 出生点：(${tile.x}, ${tile.y})。`, unitConfig.team);
    this.refreshUnitSelectors();
    this.refreshUnitCatalog();
    this.battle.render();
    event.stopImmediatePropagation(); event.preventDefault();
  }

  deleteSpawnAt(x, y) {
    const level = getCurrentLevel();
    if (!level?.spawns) return;
    const entry = Object.entries(level.spawns).find(([, pos]) => pos.x === x && pos.y === y);
    if (!entry) { this.battle.uiManager.log(`(${x}, ${y}) 没有出生点可删除。`, "system"); return; }
    const [unitId] = entry;
    delete level.spawns[unitId];
    level.unitIds = (level.unitIds || []).filter(id => id !== unitId);
    const cfg = INITIAL_UNITS.find(u => u.id === unitId);
    this.battle.uiManager.log(`已删除 ${cfg?.name || unitId} 出生点，并从本关参战单位移除。`, "system");
    this.battle.resetGame();
    this.refreshUnitSelectors();
    this.refreshUnitCatalog();
  }

  handleCatalogClick(event) {
    const card = event.target.closest?.("[data-unit-id]");
    if (!card) return;
    const unitId = card.dataset.unitId;
    const unit = INITIAL_UNITS.find(u => u.id === unitId);
    if (!unit) return;
    this.editMode = true;
    this.editKind = unit.team === TEAM.ENEMY ? "enemySpawn" : "playerSpawn";
    this.selectedSpawnUnitId = unit.id;
    if (this.editModeEl) this.editModeEl.checked = true;
    if (this.editKindEl) this.editKindEl.value = this.editKind;
    this.refreshUnitSelectors();
    this.refreshUnitCatalog();
    this.battle.uiManager.log(`已选择 ${unit.name}，请点击棋盘放置出生点。`, unit.team);
    this.update();
  }

  refreshUnitCatalog() {
    const el = document.getElementById("unitDataCatalog");
    if (!el) return;
    const level = getCurrentLevel();
    const active = new Set(Object.keys(level?.spawns || {}));
    el.innerHTML = INITIAL_UNITS.map(unit => {
      const selected = unit.id === this.selectedSpawnUnitId;
      const inScene = active.has(unit.id);
      return `<button class="unit-data-card ${unit.team} ${selected ? "selected" : ""}" data-unit-id="${unit.id}">
        <img src="${unit.avatar || ""}" alt="">
        <span><strong>${unit.name}</strong><small>${unit.id} · ${unit.team} · ${unit.className || unit.classId || "unit"}</small><small>HP ${unit.maxHp} · AC ${unit.ac} · ${inScene ? "已在场景" : "点击添加"}</small></span>
      </button>`;
    }).join("");
  }

  refreshUnitSelectors() {
    const spawnTeam = this.editKind === "enemySpawn" ? TEAM.ENEMY : TEAM.PLAYER;
    if (this.spawnUnitSelectEl) {
      const options = INITIAL_UNITS.filter(u => u.team === spawnTeam).map(u => `<option value="${u.id}">${u.name} (${u.id})</option>`).join("");
      this.spawnUnitSelectEl.innerHTML = options;
      if (!this.selectedSpawnUnitId || !INITIAL_UNITS.some(u => u.id === this.selectedSpawnUnitId && u.team === spawnTeam)) {
        this.selectedSpawnUnitId = INITIAL_UNITS.find(u => u.team === spawnTeam)?.id || null;
      }
      this.spawnUnitSelectEl.value = this.selectedSpawnUnitId || "";
    }
    if (this.unitSelectEl) {
      const currentId = this.unitSelectEl.value || this.selectedUnitId || this.battle.currentUnit?.id || INITIAL_UNITS[0]?.id;
      this.unitSelectEl.innerHTML = INITIAL_UNITS.map(u => `<option value="${u.id}">${u.name} (${u.id})</option>`).join("");
      this.unitSelectEl.value = INITIAL_UNITS.some(u => u.id === currentId) ? currentId : INITIAL_UNITS[0]?.id;
    }
  }

  getUnitForEdit(unitId) {
    return this.battle.units.find(u => u.id === unitId) || INITIAL_UNITS.find(u => u.id === unitId);
  }

  loadUnitIntoForm(unitId) {
    const unit = this.getUnitForEdit(unitId);
    if (!unit || !this.form?.name) return;
    this.selectedUnitId = unit.id;
    if (this.unitSelectEl) this.unitSelectEl.value = unit.id;
    this.form.name.value = unit.name || "";
    this.form.team.value = unit.team || TEAM.PLAYER;
    this.form.className.value = unit.className || unit.classId || "";
    this.form.level.value = unit.level || 1;
    this.form.hp.value = unit.hp ?? unit.maxHp ?? 1;
    this.form.maxHp.value = unit.maxHp || 1;
    this.form.ac.value = unit.ac || 10;
    this.form.move.value = unit.move || 0;
    this.form.proficiency.value = unit.proficiencyBonus ?? unit.proficiency ?? 2;
    this.form.damageDice.value = unit.damageDice || "1d6";
    this.form.attackAbility.value = unit.attackAbility || "STR";
    this.form.damageAbility.value = unit.damageAbility || unit.attackAbility || "STR";
    for (const ability of ABILITIES) this.form[ability].value = unit.abilities?.[ability] ?? 10;
  }

  applyUnitForm() {
    if (!this.form?.name) return;
    const unitId = this.unitSelectEl?.value || this.selectedUnitId;
    const unit = this.getUnitForEdit(unitId);
    if (!unit) return;
    const oldTeam = unit.team;
    unit.name = this.form.name.value.trim() || unit.name;
    unit.team = this.form.team.value;
    unit.className = this.form.className.value.trim() || unit.className;
    unit.level = toInt(this.form.level.value, unit.level || 1);
    unit.maxHp = Math.max(1, toInt(this.form.maxHp.value, unit.maxHp || 1));
    unit.hp = Math.max(0, Math.min(unit.maxHp, toInt(this.form.hp.value, unit.hp ?? unit.maxHp)));
    unit.ac = Math.max(1, toInt(this.form.ac.value, unit.ac || 10));
    unit.move = Math.max(0, toInt(this.form.move.value, unit.move || 0));
    unit.remainingMove = Math.min(unit.remainingMove ?? unit.move, unit.move);
    unit.proficiencyBonus = Math.max(0, toInt(this.form.proficiency.value, unit.proficiencyBonus ?? 2));
    unit.damageDice = this.form.damageDice.value.trim() || unit.damageDice;
    unit.attackAbility = this.form.attackAbility.value;
    unit.damageAbility = this.form.damageAbility.value;
    unit.abilities = unit.abilities || {};
    for (const ability of ABILITIES) unit.abilities[ability] = Math.max(1, Math.min(30, toInt(this.form[ability].value, unit.abilities[ability] || 10)));

    const config = INITIAL_UNITS.find(u => u.id === unit.id);
    if (config && config !== unit) {
      Object.assign(config, cloneJson({
        ...config,
        name: unit.name,
        team: unit.team,
        className: unit.className,
        level: unit.level,
        maxHp: unit.maxHp,
        ac: unit.ac,
        move: unit.move,
        proficiencyBonus: unit.proficiencyBonus,
        damageDice: unit.damageDice,
        attackAbility: unit.attackAbility,
        damageAbility: unit.damageAbility,
        abilities: unit.abilities,
      }));
    }
    if (oldTeam !== unit.team) this.refreshUnitSelectors();
    this.battle.uiManager.log(`已应用 ${unit.name} 的运行时属性修改。`, unit.team);
    this.battle.render();
    this.update();
  }

  syncOverlayOptions() {
    this.battle.renderer.debugOptions = {
      showCoords: Boolean(this.coordsEl?.checked),
      showTerrain: Boolean(this.terrainEl?.checked),
      showMoveCost: Boolean(this.moveCostEl?.checked),
      showReachable: Boolean(this.reachableEl?.checked),
    };
  }

  drawSpawnOverlay() {
    const level = getCurrentLevel();
    if (!level?.spawns || !this.battle?.canvas) return;
    const ctx = this.battle.canvas.getContext("2d");
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 13px system-ui";
    for (const [unitId, pos] of Object.entries(level.spawns)) {
      const cfg = INITIAL_UNITS.find(u => u.id === unitId);
      const isPlayer = cfg?.team === TEAM.PLAYER;
      const x = pos.x * TILE_SIZE + TILE_SIZE - 15;
      const y = pos.y * TILE_SIZE + 15;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fillStyle = isPlayer ? "rgba(59, 130, 246, 0.9)" : "rgba(239, 68, 68, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillText(isPlayer ? "P" : "E", x, y + 1);
    }
    ctx.restore();
  }

  getTileDebugText(tile) {
    if (!tile || !this.battle.gridManager.isInsideGrid(tile.x, tile.y)) return "悬停棋盘格查看数据";
    const terrain = this.battle.gridManager.getTerrain(tile.x, tile.y);
    const unit = this.battle.gridManager.getUnitAt(tile.x, tile.y);
    const current = this.battle.currentUnit;
    const path = current ? this.battle.gridManager.findPath(current, tile.x, tile.y) : null;
    const level = getCurrentLevel();
    const spawn = Object.entries(level?.spawns || {}).find(([, pos]) => pos.x === tile.x && pos.y === tile.y);
    return `格子 (${tile.x},${tile.y})\n地形 ${terrain}：${TERRAIN_NAMES[terrain]}\n移动成本：${this.battle.gridManager.isBlocked(tile.x, tile.y) ? "阻挡" : this.battle.gridManager.getMoveCost(tile.x, tile.y)}\n单位：${unit ? unit.name : "无"}\n出生点：${spawn ? `${INITIAL_UNITS.find(u => u.id === spawn[0])?.name || spawn[0]} (${spawn[0]})` : "无"}\n当前单位到此路径：${path ? `${path.cost} 格，${path.path.map(p => `(${p.x},${p.y})`).join(" -> ")}` : "不可达"}`;
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
    return { id: unit.id, name: unit.name, team: unit.team, className: unit.className, level: unit.level, hp: unit.hp, maxHp: unit.maxHp, ac: unit.ac, effectiveAc: unit.effectiveAc, position: { x: unit.x, y: unit.y }, remainingMove: unit.remainingMove, actionEconomy: { action: unit.actionAvailable, bonusAction: unit.bonusActionAvailable, reaction: unit.reactionAvailable }, abilities: unit.abilities, statusEffects: unit.statusEffects, skillState: unit.skillState, spellSlots: unit.spellSlots };
  }

  exportCurrentLevelJson() {
    const level = cloneJson(getCurrentLevel());
    level.tiles = cloneJson(MAP_TILES);
    level.spawns = cloneJson(level.spawns || {});
    level.unitIds = cloneJson(level.unitIds || this.battle.units.map(u => u.id));
    return JSON.stringify({ levels: [level] }, null, 2);
  }

  exportUnitsJson() {
    const units = cloneJson(INITIAL_UNITS);
    for (const runtime of this.battle.units) {
      const cfg = units.find(u => u.id === runtime.id);
      if (!cfg) continue;
      Object.assign(cfg, {
        name: runtime.name,
        team: runtime.team,
        className: runtime.className,
        level: runtime.level,
        maxHp: runtime.maxHp,
        ac: runtime.ac,
        move: runtime.move,
        proficiencyBonus: runtime.proficiencyBonus,
        damageDice: runtime.damageDice,
        attackAbility: runtime.attackAbility,
        damageAbility: runtime.damageAbility,
        abilities: runtime.abilities,
      });
    }
    return JSON.stringify(units, null, 2);
  }

  downloadCurrentLevelJson() {
    const json = this.exportCurrentLevelJson();
    this.outputEl.value = json;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `level-${CURRENT_LEVEL_INDEX + 1}-debug-export.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  downloadUnitsJson() {
    const json = this.exportUnitsJson();
    this.outputEl.value = json;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "units-debug-export.json";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }


  exportProjectJson() {
    const data = exportProjectData();
    const current = getCurrentLevel();
    if (current) current.tiles = cloneJson(MAP_TILES);
    return JSON.stringify(data, null, 2);
  }

  downloadProjectJson() {
    const json = this.exportProjectJson();
    this.outputEl.value = json;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dnd-demo-project-data-v18-2.json";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  saveLocal() {
    saveProjectDataToLocalStorage();
    this.battle.uiManager.log("已保存到浏览器 localStorage，刷新后仍可读取。", "system");
    this.update();
  }

  loadLocal() {
    const data = loadProjectDataFromLocalStorage();
    if (!data) { this.battle.uiManager.log("没有找到浏览器本地保存。", "system"); return; }
    this.battle.uiManager.log("已读取浏览器本地保存，并重开当前关卡。", "system");
    this.battle.resetGame();
    this.refreshUnitSelectors();
    this.refreshUnitCatalog();
    this.loadUnitIntoForm(this.battle.currentUnit?.id || INITIAL_UNITS[0]?.id);
    this.refreshUnitCatalog();
    this.update();
  }

  clearLocal() {
    clearLocalProjectData();
    this.battle.uiManager.log("已清除浏览器本地保存。刷新页面后会恢复 data/ 目录默认数据。", "system");
    this.update();
  }

  validateData() {
    const result = validateProjectData();
    this.outputEl.value = JSON.stringify(result, null, 2);
    if (result.ok) this.battle.uiManager.log(`数据校验通过。警告 ${result.warnings.length} 条。`, "system");
    else this.battle.uiManager.log(`数据校验发现 ${result.errors.length} 个错误。详情见输出框。`, "system");
  }

  async importJsonFile() {
    const fileInput = document.getElementById("dbgImportFile");
    const typeInput = document.getElementById("dbgImportType");
    const file = fileInput?.files?.[0];
    if (!file) { this.battle.uiManager.log("请先选择一个 JSON 文件。", "system"); return; }
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      importDataByType(typeInput?.value || "project", json);
      this.battle.uiManager.log(`已导入 ${file.name}，并重开当前关卡。`, "system");
      this.battle.resetGame();
      this.refreshUnitSelectors();
      this.loadUnitIntoForm(this.battle.currentUnit?.id || INITIAL_UNITS[0]?.id);
      this.validateData();
    } catch (error) {
      this.battle.uiManager.log(`导入失败：${error.message}`, "system");
    }
  }

  update() {
    if (!this.infoEl || !this.outputEl) return;
    const current = this.battle.currentUnit;
    const tile = this.lastTile || this.battle.hoverTile;
    const level = getCurrentLevel();
    const spawnText = Object.entries(level?.spawns || {}).map(([id, pos]) => `${INITIAL_UNITS.find(u => u.id === id)?.name || id}: (${pos.x},${pos.y})`).join("<br>") || "无";
    const editText = this.editMode
      ? `编辑模式：开启\n当前工具：${this.editKind === "terrain" ? "地形" : this.editKind === "playerSpawn" ? "玩家出生点" : "敌人出生点"}\n地形笔刷：${TERRAIN_NAMES[this.selectedTerrain]}\n出生单位：${INITIAL_UNITS.find(u => u.id === this.selectedSpawnUnitId)?.name || "无"}\n右键出生点可删除。`
      : "编辑模式：关闭";

    this.infoEl.innerHTML = `
      <div class="debug-card"><strong>当前单位</strong><br>${formatUnit(current).replaceAll("\n", "<br>")}</div>
      <div class="debug-card"><strong>悬停格子 / 寻路</strong><br>${this.getTileDebugText(tile).replaceAll("\n", "<br>")}</div>
      <div class="debug-card"><strong>编辑状态</strong><br>${editText.replaceAll("\n", "<br>")}<br><br><strong>出生点</strong><br>${spawnText}</div>
    `;

    const payload = { version: "v18.2-separated-editor-persistence", currentUnit: this.getUnitJsonSummary(), hoveredTile: tile, reachable: this.getReachableSummary(), levelSpawns: level?.spawns || {}, levelExportHint: "复制/下载关卡 JSON 可持久化 tiles、unitIds、spawns；复制/下载单位 JSON 可持久化单位属性。" };
    this.outputEl.value = JSON.stringify(payload, null, 2);
  }
}
