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

// "HH:MM" (or an ISO datetime ending in it) -> minutes since midnight.
function minutesOfDay(text) {
  const [h, m] = text.slice(-5).split(':').map(Number);
  return h * 60 + m;
}

// Min, max and simple mean of the whole-hour values within [start, end]; null if there are none.
function summarizeHourly(times, temps, start, end) {
  const from = minutesOfDay(start);
  const to = minutesOfDay(end);
  const values = [];
  times.forEach((time, i) => {
    const minutes = minutesOfDay(time);
    if (minutes >= from && minutes <= to && typeof temps[i] === 'number') values.push(temps[i]);
  });
  if (!values.length) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return { min: Math.min(...values), max: Math.max(...values), mean: Math.round(mean * 10) / 10, count: values.length };
}

function recommend(tMin, tMax, sunny, tMean = null) {
  const tMinPerc = perceivedTemperature(tMin, sunny, SETTINGS.sunBonus);
  const tMaxPerc = perceivedTemperature(tMax, sunny, SETTINGS.sunBonus);
  const tMeanPerc = tMean === null ? null : perceivedTemperature(tMean, sunny, SETTINGS.sunBonus);
  const categories = CATEGORIES.map((category) => {
    const options = category.options.map((o) => ({ ...o, status: classifyOption(tMinPerc, tMaxPerc, o.tMin, o.tMax) }));
    return {
      id: category.id,
      name: category.name,
      options,
      preselectedId: pickPreselected(options.filter((o) => o.status === 'full')),
    };
  });
  return { tMin, tMax, tMean, sunny, sunBonus: SETTINGS.sunBonus, tMinPerc, tMaxPerc, tMeanPerc, categories };
}
