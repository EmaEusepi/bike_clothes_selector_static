// Pure functions: perceived temperature, classification, preselection.

function perceivedTemperature(t, sunny, sunBonus) {
  return sunny ? t + sunBonus : t;
}

// Both ranges are inclusive: 'full' = ride inside option, 'partial' = some overlap, 'none' = no overlap.
function classifyOption(rideMin, rideMax, optMin, optMax) {
  if (optMin <= rideMin && rideMax <= optMax) return 'full';
  if (rideMax < optMin || rideMin > optMax) return 'none';
  return 'partial';
}

// Among options covering the whole ride, pick the lightest (highest tMin, then highest tMax).
function pickPreselected(fullOptions) {
  let best = null;
  for (const option of fullOptions) {
    if (!best || option.tMin > best.tMin || (option.tMin === best.tMin && option.tMax > best.tMax)) best = option;
  }
  return best ? best.id : null;
}

function recommend(tMin, tMax, sunny) {
  const tMinPerc = perceivedTemperature(tMin, sunny, SETTINGS.sunBonus);
  const tMaxPerc = perceivedTemperature(tMax, sunny, SETTINGS.sunBonus);
  const categories = CATEGORIES.map((category) => {
    const options = category.options.map((o) => ({ ...o, status: classifyOption(tMinPerc, tMaxPerc, o.tMin, o.tMax) }));
    return {
      id: category.id,
      name: category.name,
      options,
      preselectedId: pickPreselected(options.filter((o) => o.status === 'full')),
    };
  });
  return { tMin, tMax, sunny, sunBonus: SETTINGS.sunBonus, tMinPerc, tMaxPerc, categories };
}
