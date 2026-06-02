import {
  INITIAL_UNITS,
  TEAM,
  loadGameData,
  loadProjectDataFromLocalStorage,
  saveProjectDataToLocalStorage,
  importDataByType,
  exportProjectData,
  validateProjectData,
} from "./config.js";

const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
let selectedUnitId = null;

const TOKEN_OPTIONS = [
  ["fighter", "人类战士"],
  ["elf_ranger", "精灵游侠"],
  ["dwarf_warrior", "矮人战士"],
  ["human_cleric", "人类牧师"],
  ["drow_warlock", "卓尔术士"],
  ["tiefling_fighter", "提夫林战士"],
  ["dragonborn_paladin", "龙裔圣武士"],
  ["halfling_rogue", "半身人盗贼"],
  ["tiefling_mage", "提夫林法师"],
  ["hooded_rogue", "兜帽盗贼"],
  ["red_dragon", "红龙"],
  ["beholder", "眼魔"],
  ["vampire", "吸血鬼"],
  ["orc", "兽人"],
  ["skeleton", "骷髅兵"],
  ["wraith", "幽魂"],
  ["mind_flayer", "夺心魔"],
  ["owlbear", "枭熊"],
];

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function toInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}
function listFromInput(value) {
  return String(value || "").split(",").map(s => s.trim()).filter(Boolean);
}
function inputFromList(list) { return Array.isArray(list) ? list.join(", ") : ""; }
function getUnit(id = selectedUnitId) { return INITIAL_UNITS.find(u => u.id === id) || INITIAL_UNITS[0]; }
function uniqueId(base) {
  let id = base.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase() || "unit";
  let next = id;
  let i = 2;
  while (INITIAL_UNITS.some(u => u.id === next)) next = `${id}_${i++}`;
  return next;
}
function download(name, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function output(value) {
  const el = document.getElementById("unitEditorOutput");
  if (el) el.value = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

const form = {};
function bindFormRefs() {
  const ids = {
    id: "unitIdInput",
    name: "unitNameInput",
    team: "unitTeamInput",
    className: "unitClassInput",
    level: "unitLevelInput",
    avatar: "unitAvatarInput",
    hp: "unitHpInput",
    maxHp: "unitMaxHpInput",
    ac: "unitAcInput",
    move: "unitMoveInput",
    proficiency: "unitProfInput",
    damageDice: "unitDamageDiceInput",
    attackAbility: "unitAttackAbilityInput",
    damageAbility: "unitDamageAbilityInput",
    spellcastingAbility: "unitSpellAbilityInput",
    skills: "unitSkillsInput",
    spells: "unitSpellsInput",
    classFeatures: "unitFeaturesInput",
    STR: "unitStrInput",
    DEX: "unitDexInput",
    CON: "unitConInput",
    INT: "unitIntInput",
    WIS: "unitWisInput",
    CHA: "unitChaInput",
  };
  for (const [key, id] of Object.entries(ids)) form[key] = document.getElementById(id);
}


function renderTokenGallery() {
  const gallery = document.getElementById("tokenGallery");
  if (!gallery) return;
  const currentAvatar = form.avatar?.value || "";
  gallery.innerHTML = TOKEN_OPTIONS.map(([id, label]) => {
    const path = `./assets/tokens/${id}.png`;
    const selected = currentAvatar === path ? "selected" : "";
    return `
      <button class="token-choice ${selected}" data-avatar="${path}" title="${label}">
        <img src="${path}" alt="${label}">
        <span>${label}</span>
      </button>
    `;
  }).join("");
}

function renderCatalog() {
  const catalog = document.getElementById("unitCatalog");
  if (!catalog) return;
  catalog.innerHTML = INITIAL_UNITS.map(unit => `
    <button class="unit-data-card ${unit.team} ${unit.id === selectedUnitId ? "selected" : ""}" data-unit-id="${unit.id}">
      <img src="${unit.avatar || ""}" alt="">
      <span>
        <strong>${unit.name}</strong>
        <small>${unit.id} · ${unit.team} · ${unit.className || unit.classId || "unit"}</small>
        <small>Lv.${unit.level || 1} · HP ${unit.maxHp} · AC ${unit.ac}</small>
      </span>
    </button>
  `).join("");
}

function loadUnit(unitId) {
  const unit = getUnit(unitId);
  if (!unit) return;
  selectedUnitId = unit.id;
  form.id.value = unit.id || "";
  form.name.value = unit.name || "";
  form.team.value = unit.team || TEAM.PLAYER;
  form.className.value = unit.className || unit.classId || "";
  form.level.value = unit.level || 1;
  form.avatar.value = unit.avatar || "";
  form.hp.value = unit.hp ?? unit.maxHp ?? 1;
  form.maxHp.value = unit.maxHp || 1;
  form.ac.value = unit.ac || 10;
  form.move.value = unit.move || 0;
  form.proficiency.value = unit.proficiencyBonus ?? unit.proficiency ?? 2;
  form.damageDice.value = unit.damageDice || "1d6";
  form.attackAbility.value = unit.attackAbility || "STR";
  form.damageAbility.value = unit.damageAbility || unit.attackAbility || "STR";
  form.spellcastingAbility.value = unit.spellcastingAbility || "";
  form.skills.value = inputFromList(unit.skills);
  form.spells.value = inputFromList(unit.spells);
  form.classFeatures.value = inputFromList(unit.classFeatures);
  for (const ability of ABILITIES) form[ability].value = unit.abilities?.[ability] ?? 10;
  renderCatalog();
  renderTokenGallery();
  output({ selected: unit });
}

function applyForm({ allowIdChange = true } = {}) {
  const unit = getUnit();
  if (!unit) return;
  const oldId = unit.id;
  const newId = (form.id.value || oldId).trim();
  if (allowIdChange && newId !== oldId) {
    if (!newId) { output("单位 ID 不能为空。"); return; }
    if (INITIAL_UNITS.some(u => u.id === newId)) { output(`ID ${newId} 已存在。`); return; }
    unit.id = newId;
    selectedUnitId = newId;
  }
  unit.name = form.name.value.trim() || unit.name;
  unit.team = form.team.value;
  unit.className = form.className.value.trim() || unit.className || unit.classId;
  unit.level = Math.max(1, toInt(form.level.value, unit.level || 1));
  unit.avatar = form.avatar.value.trim() || unit.avatar;
  unit.maxHp = Math.max(1, toInt(form.maxHp.value, unit.maxHp || 1));
  unit.hp = Math.max(0, Math.min(unit.maxHp, toInt(form.hp.value, unit.hp ?? unit.maxHp)));
  unit.ac = Math.max(1, toInt(form.ac.value, unit.ac || 10));
  unit.move = Math.max(0, toInt(form.move.value, unit.move || 0));
  unit.proficiencyBonus = Math.max(0, toInt(form.proficiency.value, unit.proficiencyBonus ?? 2));
  unit.damageDice = form.damageDice.value.trim() || unit.damageDice || "1d6";
  unit.attackAbility = form.attackAbility.value;
  unit.damageAbility = form.damageAbility.value;
  unit.spellcastingAbility = form.spellcastingAbility.value || undefined;
  unit.skills = listFromInput(form.skills.value);
  unit.spells = listFromInput(form.spells.value);
  unit.classFeatures = listFromInput(form.classFeatures.value);
  unit.abilities = unit.abilities || {};
  for (const ability of ABILITIES) unit.abilities[ability] = Math.max(1, Math.min(30, toInt(form[ability].value, unit.abilities[ability] || 10)));
  renderCatalog();
  renderTokenGallery();
  output(`已应用 ${unit.name}。点击“保存到浏览器”后，游玩界面和关卡编辑器会使用新数据。`);
}

function newUnit() {
  const template = clone(getUnit() || { team: TEAM.PLAYER, abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } });
  template.id = uniqueId(`${template.team || "unit"}_new`);
  template.name = "新单位";
  template.x = 0;
  template.y = 0;
  INITIAL_UNITS.push(template);
  loadUnit(template.id);
}

function duplicateUnit() {
  applyForm({ allowIdChange: false });
  const source = clone(getUnit());
  source.id = uniqueId(`${source.id}_copy`);
  source.name = `${source.name} 副本`;
  INITIAL_UNITS.push(source);
  loadUnit(source.id);
}

function deleteUnit() {
  const unit = getUnit();
  if (!unit) return;
  if (!confirm(`确定删除 ${unit.name}？已有关卡出生点仍需手动清理。`)) return;
  const index = INITIAL_UNITS.findIndex(u => u.id === unit.id);
  if (index >= 0) INITIAL_UNITS.splice(index, 1);
  selectedUnitId = INITIAL_UNITS[0]?.id || null;
  renderCatalog();
  renderTokenGallery();
  if (selectedUnitId) loadUnit(selectedUnitId);
  else output("已删除，当前没有单位。请新增单位。");
}

async function init() {
  await loadGameData();
  loadProjectDataFromLocalStorage();
  bindFormRefs();
  selectedUnitId = INITIAL_UNITS[0]?.id || null;
  renderCatalog();
  renderTokenGallery();
  if (selectedUnitId) loadUnit(selectedUnitId);

  document.getElementById("unitCatalog")?.addEventListener("click", event => {
    const card = event.target.closest?.("[data-unit-id]");
    if (card) loadUnit(card.dataset.unitId);
  });
  document.getElementById("tokenGallery")?.addEventListener("click", event => {
    const choice = event.target.closest?.("[data-avatar]");
    if (!choice) return;
    form.avatar.value = choice.dataset.avatar;
    renderTokenGallery();
    output(`已选择头像：${choice.dataset.avatar}。点击“应用到当前单位”或“保存到浏览器”生效。`);
  });
  form.avatar?.addEventListener("input", renderTokenGallery);
  document.getElementById("newUnitBtn")?.addEventListener("click", newUnit);
  document.getElementById("applyUnitBtn")?.addEventListener("click", () => applyForm());
  document.getElementById("duplicateUnitBtn")?.addEventListener("click", duplicateUnit);
  document.getElementById("deleteUnitBtn")?.addEventListener("click", deleteUnit);
  document.getElementById("saveLocalBtn")?.addEventListener("click", () => { applyForm(); saveProjectDataToLocalStorage(); output("已保存到浏览器。返回游玩界面或关卡编辑器即可使用。") });
  document.getElementById("validateBtn")?.addEventListener("click", () => output(validateProjectData()));
  document.getElementById("copyUnitsBtn")?.addEventListener("click", async () => { const json = JSON.stringify(INITIAL_UNITS, null, 2); output(json); try { await navigator.clipboard.writeText(json); } catch(_) {} });
  document.getElementById("downloadUnitsBtn")?.addEventListener("click", () => download("units.json", JSON.stringify(INITIAL_UNITS, null, 2)));
  document.getElementById("copyProjectBtn")?.addEventListener("click", async () => { const json = JSON.stringify(exportProjectData(), null, 2); output(json); try { await navigator.clipboard.writeText(json); } catch(_) {} });
  document.getElementById("downloadProjectBtn")?.addEventListener("click", () => download("dnd-demo-project-data.json", JSON.stringify(exportProjectData(), null, 2)));
  document.getElementById("importUnitsBtn")?.addEventListener("click", async () => {
    const file = document.getElementById("importUnitsFile")?.files?.[0];
    if (!file) { output("请先选择 units.json。 "); return; }
    try {
      const json = JSON.parse(await file.text());
      importDataByType("units", json);
      selectedUnitId = INITIAL_UNITS[0]?.id || null;
      renderCatalog();
      if (selectedUnitId) loadUnit(selectedUnitId);
      output("已导入 units.json。记得保存到浏览器或导出完整数据包。");
    } catch (error) { output(`导入失败：${error.message}`); }
  });
}

init();
