# DND HTML5 战棋战斗 Demo v2

这是一个基于 HTML5 Canvas + ES Module 的 DND 风格 2D 战棋战斗 Demo。

## v2 新增内容

- 先攻系统 Initiative：战斗开始时每个单位投 `d20 + initiativeBonus`，按结果排序行动。
- 暴击规则：自然 20 必定命中，伤害骰翻倍。
- 大失败规则：自然 1 必定未命中。
- BFS 移动范围：移动范围按实际可走路径计算，不再只是曼哈顿距离。
- 障碍物：地图上黑色格子不可通过、不可停留。
- UI 增加先攻顺序列表和剩余移动力显示。

## 运行方式

因为使用了 ES Module，不建议直接双击 index.html。

在项目目录下执行：

```bash
python -m http.server 8000
```

然后浏览器打开：

```text
http://localhost:8000
```

## 文件结构

```text
/dnd-html5-demo-v2
  index.html
  README.md
  /src
    main.js
    config.js
    dice.js
    unit.js
    battleManager.js
    turnManager.js
    gridManager.js
    combatSystem.js
    enemyAI.js
    uiManager.js
    renderer.js
    style.css
```

## 下一步建议

1. 加入技能系统。
2. 加入移动路径动画。
3. 拆分单位配置 JSON。
4. 增加远程敌人 AI。
5. 迁移到 Cocos Creator 3.8.6 + TypeScript。
