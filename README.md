# DND HTML5 战棋 Demo v18.2

本版本基于 v18.1，重点完成 **编辑器保存与导入系统**，并将 **游玩界面** 与 **编辑器界面** 分离。

## 页面入口

- `index.html`：纯游玩界面，不显示 Debug / 编辑工具。
- `editor.html`：数据编辑器，包含地图、出生点、单位属性、导入、保存、校验和导出功能。

## v18.2 新增

1. 编辑器与游玩界面分离
   - 游玩界面只保留战斗 UI。
   - 编辑器独立在 `editor.html`。

2. JSON 导入
   - 支持导入 `levels.json`
   - 支持导入 `units.json`
   - 支持导入 `skills.json`
   - 支持导入 `spells.json`
   - 支持导入 `classFeatures.json`
   - 支持导入完整项目数据包

3. 本地保存
   - 可保存当前编辑结果到浏览器 `localStorage`
   - 刷新后自动读取本地保存
   - 可清除本地保存，恢复 data 目录默认数据

4. 数据校验
   - 检查出生点重叠
   - 检查出生点是否在障碍物上
   - 检查出生点是否越界
   - 检查单位 ID 是否存在
   - 检查技能 / 法术 / 职业特性引用是否存在

5. 完整数据包导出
   - 导出 `levels`
   - 导出 `units`
   - 导出 `skills`
   - 导出 `spells`
   - 导出 `classFeatures`

## 运行方式

```bash
cd dnd-html5-demo-v18-2
python -m http.server 8000
```

游玩界面：

```text
http://localhost:8000
```

编辑器界面：

```text
http://localhost:8000/editor.html
```

## 注意

浏览器本地保存只保存在当前浏览器和当前域名下。要永久纳入项目文件，需要下载导出的 JSON，并替换 `data/` 目录内的对应文件。
