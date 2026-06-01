# DND HTML5 Demo v9

本版基于 v8，新增职业与六项属性系统：STR / DEX / CON / INT / WIS / CHA。

## 新增内容

1. 单位拥有职业、等级、熟练加值和六项属性。
2. 攻击加值改为：熟练加值 + 攻击属性修正 + 状态加值。
3. 伤害会额外加入伤害属性修正。
4. 先攻改为 d20 + DEX 修正。
5. 豁免检定改为指定属性豁免，例如 DEX Save。
6. UI 显示职业、等级、熟练加值和六项属性修正。

## 运行

```bash
cd dnd-html5-demo-v9
python -m http.server 8000
```

浏览器打开：

```text
http://localhost:8000
```
