export const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

export const ABILITY_NAMES = {
  STR: "力量",
  DEX: "敏捷",
  CON: "体质",
  INT: "智力",
  WIS: "感知",
  CHA: "魅力",
};

export function getAbilityModifier(score = 10) {
  return Math.floor((Number(score) - 10) / 2);
}

export function formatModifier(value) {
  return value >= 0 ? `+${value}` : String(value);
}
