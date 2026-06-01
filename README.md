# DND HTML5 Demo v18.1：出生点编辑器与单位属性编辑器

基于 v18 数据编辑与调试工具继续开发。

## 新增功能

1. 出生点编辑器
   - 支持玩家出生点编辑
   - 支持敌人出生点编辑
   - 棋盘显示 P / E 出生点标记
   - 点击棋盘放置出生点
   - 右键出生点删除，同时从本关参战单位中移除
   - 导出关卡 JSON 时包含最新 `unitIds` 和 `spawns`

2. 单位属性编辑器
   - 可选择任意单位
   - 可修改名称、阵营、职业/类型、等级
   - 可修改 HP、Max HP、AC、移动力、熟练加值
   - 可修改伤害骰、攻击属性、伤害属性
   - 可修改 STR / DEX / CON / INT / WIS / CHA
   - 修改会立即应用到运行时战斗单位

3. 导出工具
   - 复制/下载当前关卡 JSON
   - 复制/下载单位 JSON

## 使用方式

```bash
cd dnd-html5-demo-v18-1
python -m http.server 8000
```

浏览器打开：

```text
http://localhost:8000
```

## 注意

编辑结果是运行时修改。要永久保存，需要把导出的 JSON 覆盖到 `data/levels.json` 或 `data/units.json`。
