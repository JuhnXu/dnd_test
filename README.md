# DND HTML5 战棋战斗 Demo

这是一个基于 HTML5 Canvas + JavaScript ES Modules 的 DND 风格 2D 方格战棋战斗 Demo。

## 功能

- 10x10 方格地图
- 2 名玩家角色
- 3 名敌人
- 回合制
- HP、AC、移动力、攻击加值、伤害骰
- 普通移动
- 普通攻击
- d20 + 攻击加值 >= AC 命中判定
- 简单敌人 AI
- 一方全灭后结束战斗

## 运行方式

由于项目使用了 ES Module，建议通过本地服务器运行：

```bash
cd dnd-html5-demo
python -m http.server 8000
```

然后浏览器打开：

```text
http://localhost:8000
```

## 文件结构

```text
/dnd-html5-demo
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
```
