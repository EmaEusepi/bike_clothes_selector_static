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

  const state = { result: null, selected: {} };
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
    const band = { min: r.tMinPerc, max: r.tMaxPerc };
    const summary = el('div', { class: 'card' },
      el('div', { class: 'summary-main' },
        el('span', { class: 'muted' }, 'Perceived'),
        el('strong', {}, tempRange(r.tMinPerc, r.tMaxPerc))),
      el('div', { class: 'muted small' },
        `Actual ${tempRange(r.tMin, r.tMax)}`, r.sunny ? ` · sun +${fmtT(r.sunBonus)}` : ' · no sun'),
      el('div', { class: 'legend' },
        el('span', {}, el('i', { class: 'swatch full' }), 'covers the whole ride'),
        el('span', {}, el('i', { class: 'swatch partial' }), 'covers part of it'),
        el('span', {}, el('i', { class: 'swatch none' }), 'out of range'),
        el('span', {}, el('i', { class: 'swatch ride' }), 'ride (perceived)')));

    document.getElementById('results').replaceChildren(summary, ...r.categories.map((c) => categoryCard(c, band)));
  }

  document.getElementById('ride-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const tMin = parseNum(document.getElementById('t-min').value);
    const tMax = parseNum(document.getElementById('t-max').value);
    if (!Number.isFinite(tMin) || !Number.isFinite(tMax)) { toast('Enter T min and T max.'); return; }
    if (tMin > tMax) { toast('T min must be less than or equal to T max.'); return; }

    state.result = recommend(tMin, tMax, document.getElementById('sunny').checked);
    state.selected = {};
    for (const category of state.result.categories) state.selected[category.id] = category.preselectedId;
    drawResults();
  });
})();
