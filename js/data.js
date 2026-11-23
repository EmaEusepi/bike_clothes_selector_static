// Read-only "database": gear ranges in perceived °C, listed from warmest to lightest.
const SETTINGS = Object.freeze({
  sunBonus: 3,
  scaleMin: -5,
  scaleMax: 30,
});

const CATEGORIES = Object.freeze([
  {
    name: 'Legs',
    options: [
      { name: 'Long tights', tMin: -10, tMax: 15 },
      { name: 'Shorts', tMin: 12, tMax: 40 },
    ],
  },
  {
    name: 'Shoes',
    options: [
      { name: 'Shoes + overshoes', tMin: -10, tMax: 11 },
      { name: 'Shoes', tMin: 10, tMax: 40 },
    ],
  },
  {
    name: 'Torso',
    options: [
      { name: 'Jacket + long base layer', tMin: -10, tMax: 3 },
      { name: 'Jacket + short base layer', tMin: 0, tMax: 9 },
      { name: 'Long-sleeve jersey + long base layer', tMin: 9, tMax: 17 },
      { name: 'Short-sleeve jersey + long base layer', tMin: 12, tMax: 19 },
      { name: 'Short-sleeve jersey + short base layer', tMin: 15, tMax: 22 },
      { name: 'Short-sleeve jersey', tMin: 21, tMax: 40 },
    ],
  },
  {
    name: 'Gloves',
    options: [
      { name: 'Long-finger gloves (neoprene)', tMin: -10, tMax: 8 },
      { name: 'Long-finger gloves (mid)', tMin: 6, tMax: 15 },
      { name: 'Short-finger gloves', tMin: 13, tMax: 40 },
    ],
  },
  {
    name: 'Neck',
    options: [
      { name: 'Wool neck warmer', tMin: -10, tMax: 12 },
      { name: 'Summer neck warmer', tMin: 9, tMax: 17 },
      { name: 'No neck warmer', tMin: 15, tMax: 40 },
    ],
  },
  {
    name: 'Ears',
    options: [
      { name: 'Ear warmer headband', tMin: -10, tMax: 10 },
      { name: 'No headband', tMin: 8, tMax: 40 },
    ],
  },
].map((category, c) => Object.freeze({
  id: c,
  name: category.name,
  options: Object.freeze(category.options.map((option, o) => Object.freeze({ id: `${c}-${o}`, ...option }))),
})));
