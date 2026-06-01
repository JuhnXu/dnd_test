# DND HTML5 战棋 Demo v13

基于 v12 继续开发，跳过 v11，当前版本重点是 **完整行动经济**。

## 新增内容

1. 标准行动经济雏形
   - Action：动作
   - Bonus Action：附赠动作
   - Reaction：反应
   - Movement：移动力

2. 行动消耗类型
   - 普通攻击消耗 Action
   - 大部分攻击/治疗/AOE 技能消耗 Action
   - 猎人印记、动作如潮、灵巧撤离、凶蛮冲锋等消耗 Bonus Action
   - 机会攻击消耗 Reaction

3. 基础战斗动作
   - Dodge / 闪避：消耗 Action，AC +2，敌人攻击该单位时以劣势投 d20
   - Dash / 疾走：消耗 Action，额外获得一份移动力
   - Disengage / 脱离：消耗 Action，本回合移动不会触发机会攻击

4. 机会攻击
   - 单位离开敌人的近战范围时触发
   - 每个单位每轮只能用一次 Reaction
   - 使用脱离动作后不会触发

5. UI 更新
   - 回合提示显示动作、附赠动作、反应状态
   - 技能卡显示行动消耗类型
   - 新增“疾走”“脱离”按钮
   - 战斗日志显示机会攻击和劣势投骰

## 运行方式

```bash
cd dnd-html5-demo-v13
python -m http.server 8000
```

打开：

```text
http://localhost:8000
```
