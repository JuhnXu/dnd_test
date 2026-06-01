export class Dice {
  static rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  static rollDice(expression, multiplier = 1) {
    const match = expression.match(/(\d+)d(\d+)([+-]\d+)?/i);
    if (!match) throw new Error("Invalid dice expression: " + expression);

    const count = Number(match[1]) * multiplier;
    const sides = Number(match[2]);
    const modifier = Number(match[3] || 0);
    const rolls = [];

    for (let i = 0; i < count; i++) rolls.push(this.rollDie(sides));

    const total = rolls.reduce((sum, value) => sum + value, 0) + modifier;
    return { total, rolls, modifier, expression };
  }
}
