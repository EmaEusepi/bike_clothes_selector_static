(function () {
  'use strict';

  const PROPS = new Set(['value', 'checked', 'disabled']);

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    const deferred = [];
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === undefined || value === null) continue;
      if (PROPS.has(key)) { deferred.push([key, value]); continue; }
      if (value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'style') Object.assign(node.style, value);
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : String(value));
    }
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : String(child));
    }
    for (const [key, value] of deferred) node[key] = value;
    return node;
  }

  let toastTimer = null;
  function toast(message) {
    const node = document.getElementById('toast');
    node.textContent = message;
    node.className = 'toast show error';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { node.className = 'toast'; }, 4000);
  }

  const fmtT = (value) => `${Number(value).toLocaleString('en-GB', { maximumFractionDigits: 1 })}°`;
  const tempRange = (min, max) => (min === max ? fmtT(min) : `${fmtT(min)} – ${fmtT(max)}`);

  function parseNum(raw) {
    const text = String(raw ?? '').trim().replace(',', '.');
    return text === '' ? NaN : Number(text);
  }

  function tickStep(span) {
    const raw = span / 8;
    return [1, 2, 5, 10, 20, 50, 100].find((s) => s >= raw) ?? 100;
  }

  // Horizontal range bars on a shared scale, with the perceived ride range as a vertical band.
  function rangeChart({ scale, rows, band, selectedId, onSelect }) {
    const span = scale.max - scale.min;
    const pct = (t) => Math.min(100, Math.max(0, ((t - scale.min) / span) * 100));
    const step = tickStep(span);
    const ticks = [];
    for (let t = Math.ceil(scale.min / step) * step; t <= scale.max + 1e-9; t += step) ticks.push(t);

    const left = pct(band.min);
    const right = pct(band.max);
    const head = el('div', { class: 'chart-head' });
    if (band.min === band.max) {
      head.append(el('span', { class: 'band-label single', style: { left: `${left}%` } }, fmtT(band.min)));
    } else {
      head.append(
        el('span', { class: 'band-label min', title: 'Perceived min', style: { left: `${left}%` } }, fmtT(band.min)),
        el('span', { class: 'band-label max', title: 'Perceived max', style: { left: `${right}%` } }, fmtT(band.max)),
      );
    }

    const body = el('div', { class: 'chart-body' });
    for (const t of ticks) body.append(el('div', { class: t === 0 ? 'grid zero' : 'grid', style: { left: `${pct(t)}%` } }));
    body.append(el('div', {
      class: band.min === band.max ? 'band single' : 'band',
      style: { left: `${left}%`, width: `${right - left}%` },
    }));
    if (band.mean !== null) {
      body.append(el('div', { class: 'mean-line', title: 'Perceived mean', style: { left: `${pct(band.mean)}%` } }));
    }

    for (const row of rows) {
      const selected = row.id === selectedId;
      const barLeft = pct(row.tMin);
      body.append(el('button', {
        class: `opt-row status-${row.status}${selected ? ' selected' : ''}`,
        type: 'button',
        'aria-pressed': String(selected),
        onclick: () => onSelect(row.id),
      },
      el('div', { class: 'opt-label' },
        el('span', { class: 'opt-name' }, selected ? el('span', { class: 'check-mark' }, '✓ ') : null, row.name),
        el('span', { class: 'opt-meta' }, `${fmtT(row.tMin)} … ${fmtT(row.tMax)}`)),
      el('div', { class: 'track' },
        el('div', { class: 'bar', style: { left: `${barLeft}%`, width: `${Math.max(pct(row.tMax) - barLeft, 1)}%` } }))));
    }

    const axis = el('div', { class: 'chart-axis', 'aria-hidden': 'true' });
    for (const t of ticks) axis.append(el('span', { style: { left: `${pct(t)}%` } }, `${t}°`));

    return el('div', { class: 'chart' }, head, body, axis);
  }

  const state = { result: null, selected: {}, weatherMean: null };
  const scale = { min: SETTINGS.scaleMin, max: SETTINGS.scaleMax };

  function categoryCard(category, band) {
    const selected = category.options.find((o) => o.id === state.selected[category.id]);
    const card = el('section', { class: 'card' },
      el('div', { class: 'card-head' },
        el('h2', {}, category.name),
        el('span', { class: 'muted small' }, selected ? selected.name : 'nothing selected')),
      rangeChart({
        scale,
        band,
        rows: category.options,
        selectedId: state.selected[category.id],
        onSelect: (id) => {
          state.selected[category.id] = state.selected[category.id] === id ? null : id;
          card.replaceWith(categoryCard(category, band));
        },
      }));
    return card;
  }

  function drawResults() {
    const r = state.result;
    const band = { min: r.tMinPerc, max: r.tMaxPerc, mean: r.tMeanPerc };
    const summary = el('div', { class: 'card' },
      el('div', { class: 'summary-main' },
        el('span', { class: 'muted' }, 'Perceived'),
        el('strong', {}, tempRange(r.tMinPerc, r.tMaxPerc)),
        r.tMeanPerc !== null ? el('span', { class: 'muted' }, `mean ${fmtT(r.tMeanPerc)}`) : null),
      el('div', { class: 'muted small' },
        `Actual ${tempRange(r.tMin, r.tMax)}`, r.sunny ? ` · sun +${fmtT(r.sunBonus)}` : ' · no sun'),
      el('div', { class: 'legend' },
        el('span', {}, el('i', { class: 'swatch full' }), 'covers the whole ride'),
        el('span', {}, el('i', { class: 'swatch partial' }), 'covers part of it'),
        el('span', {}, el('i', { class: 'swatch none' }), 'out of range'),
        el('span', {}, el('i', { class: 'swatch ride' }), 'ride (perceived)'),
        r.tMeanPerc !== null ? el('span', {}, el('i', { class: 'swatch mean' }), 'mean (perceived)') : null));

    document.getElementById('results').replaceChildren(summary, ...r.categories.map((c) => categoryCard(c, band)));
  }

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');

  function calculate() {
    const tMin = parseNum($('t-min').value);
    const tMax = parseNum($('t-max').value);
    if (!Number.isFinite(tMin) || !Number.isFinite(tMax)) { toast('Enter T min and T max.'); return; }
    if (tMin > tMax) { toast('T min must be less than or equal to T max.'); return; }

    const tMean = $('use-weather').checked ? state.weatherMean : null;
    state.result = recommend(tMin, tMax, $('sunny').checked, tMean);
    state.selected = {};
    for (const category of state.result.categories) state.selected[category.id] = category.preselectedId;
    drawResults();
  }

  async function getWeather() {
    const city = $('city').value.trim();
    const date = $('ride-date').value;
    const start = $('ride-start').value;
    const end = $('ride-end').value;
    if (!city) { toast('Enter a city.'); return; }
    if (!date || !start || !end) { toast('Enter date, departure and arrival.'); return; }
    if (minutesOfDay(end) <= minutesOfDay(start)) { toast('Arrival must be after departure.'); return; }

    const button = $('get-weather');
    button.disabled = true;
    button.textContent = 'Loading…';
    try {
      const location = await geocodeCity(city);
      const { times, temps } = await fetchHourlyTemperatures(location.latitude, location.longitude, date);
      const summary = summarizeHourly(times, temps, start, end);
      if (!summary) { toast('No whole hour between departure and arrival.'); return; }

      $('t-min').value = summary.min;
      $('t-max').value = summary.max;
      state.weatherMean = summary.mean;
      $('weather-info').textContent =
        `${location.label} · ${summary.count} hourly value${summary.count === 1 ? '' : 's'} · mean ${fmtT(summary.mean)}`;
      calculate();
    } catch (error) {
      toast(error instanceof WeatherError ? error.message : 'Unexpected error while retrieving the weather.');
    } finally {
      button.disabled = false;
      button.textContent = 'Get weather';
    }
  }

  const now = new Date();
  $('ride-date').value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  $('ride-start').value = `${pad(now.getHours())}:00`;
  $('ride-end').value = `${pad(Math.min(now.getHours() + 3, 23))}:00`;

  $('use-weather').addEventListener('change', (event) => {
    $('weather-fields').hidden = !event.target.checked;
    if (state.result) calculate();
  });
  $('get-weather').addEventListener('click', getWeather);

  // Manually edited temperatures no longer match the downloaded data
  for (const id of ['t-min', 't-max']) {
    $(id).addEventListener('input', () => {
      state.weatherMean = null;
      $('weather-info').textContent = '';
    });
  }

  $('ride-form').addEventListener('submit', (event) => {
    event.preventDefault();
    calculate();
  });
})();
