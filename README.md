# DND HTML5 战棋 Demo v3

## 本版新增

- 技能系统第一版
  - 战士：猛力攻击
  - 游侠：瞄准射击
  - 哥布林：卑劣刺击
  - 兽人：重劈
- 数据 JSON 配置化
  - `data/units.json`
  - `data/skills.json`
  - `data/map.json`
- 玩家可点击技能卡选择技能，再点击红色高亮敌人释放技能
- 敌人 AI 会优先使用自己的技能，无法使用时再普通攻击

## 运行方式

由于项目使用 ES Module 和 fetch 读取 JSON，不能直接双击 `index.html`。

```bash
cd dnd-html5-demo-v3
python -m http.server 8000
```

浏览器打开：

```text
http://localhost:8000
```

## 目录结构

```text
dnd-html5-demo-v3
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
    turnManager.js
    enemyAI.js
    uiManager.js
    renderer.js
    battleManager.js
    style.css
```

## 下一步建议

- 增加技能冷却 / 每场战斗使用次数
- 增加治疗、防御、位移类技能
- 增加路径动画
- 将技能系统改造成更通用的 Effect 管线
