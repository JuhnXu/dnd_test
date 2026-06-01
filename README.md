# DND HTML5 战棋 Demo v5

## 本版新增

- 状态效果系统
  - 单位支持 `statusEffects`
  - 支持 AC 加成、攻击加成、回合开始持续伤害/治疗
  - 当前单位面板和单位列表会显示状态与剩余回合
- 治疗技能
  - 战士新增「复苏之息」：治疗自己 `1d10+2`
- Buff 技能
  - 游侠新增「守护印记」：给友军 AC +2，持续 2 回合
- 位移技能
  - 兽人「重劈推击」命中后把目标推开 1 格
- 状态伤害技能
  - 哥布林「淬毒刺击」命中后施加中毒，每回合受到 `1d4` 伤害，持续 2 回合
- 技能目标类型
  - `targetType: enemy / ally / self`
  - 为之后接入 DND 法术和职业能力做准备

## 运行方式

由于项目使用 ES Module 和 fetch 读取 JSON，不能直接双击 `index.html`。

```bash
cd dnd-html5-demo-v5
python -m http.server 8000
```

浏览器打开：

```text
http://localhost:8000
```

## 目录结构

```text
dnd-html5-demo-v5
  index.html
  data
    map.json
    units.json
    skills.json
  src
    main.js
    config.js
    dice.js
    unit.js
    gridManager.js
    combatSystem.js
    skillSystem.js
    statusEffectSystem.js
    turnManager.js
    enemyAI.js
    uiManager.js
    renderer.js
    battleManager.js
    style.css
```

## 下一步建议

- v6：路径预览、鼠标悬停提示、行动确认 UI
- v6：更完整的法术模板，例如范围法术、AOE、豁免检定
- v6：把效果系统改成更通用的 Effect Pipeline
