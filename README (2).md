# 🚴 Bike Outfit Selector

A lightweight web app that suggests what to wear for a road bike ride, based on the **minimum and maximum temperature** expected during the ride and whether it's **sunny**.

No backend, no build step, no dependencies: just static HTML, CSS and vanilla JavaScript. It can be hosted on GitHub Pages as-is.

## How it works

1. Enter **T min** and **T max** (°C) for the ride.
2. Toggle **Sunny** if the sun will be out.
3. Press **Calculate**.

The app computes the **perceived temperature range**: if it's sunny, a fixed bonus (default `+3 °C`) is added to both T min and T max.

For each clothing category (Legs, Shoes, Torso, Gloves, Neck, Ears), **every option** is shown as a horizontal bar representing its comfort range, on a shared temperature scale. The perceived ride range is overlaid as a vertical band.

Each option is colour-coded:

| Colour | Meaning |
|---|---|
| 🟩 Green | Covers the whole ride |
| 🟧 Orange | Covers only part of the ride |
| ⬜ Grey | Out of range |

The app **preselects** the lightest option that covers the whole ride (highest `tMin`, then highest `tMax`). You can click any option to select a different one, or click it again to deselect it.

## Project structure

```text
.
├── index.html      # Page layout and form
├── css/
│   └── style.css   # Styles (light/dark theme, responsive)
└── js/
    ├── data.js     # Settings and clothing "database"
    ├── logic.js    # Pure functions: perceived temp, classification, preselection
    └── app.js      # UI rendering and event handling
```

## Customising the gear

All clothing options live in `js/data.js`. Each option has a comfort range in **perceived °C**:

```js
{
  name: 'Gloves',
  options: [
    { name: 'Long-finger gloves (neoprene)', tMin: -10, tMax: 8 },
    { name: 'Long-finger gloves (mid)',      tMin: 6,   tMax: 15 },
    { name: 'Short-finger gloves',           tMin: 13,  tMax: 40 },
  ],
},
```

- Add, remove or edit options and categories freely; IDs are generated automatically.
- Overlapping ranges are fine and expected.

Global settings are in the same file:

```js
const SETTINGS = Object.freeze({
  sunBonus: 3,   // °C added to the perceived temperature when sunny
  scaleMin: -5,  // chart scale lower bound
  scaleMax: 30,  // chart scale upper bound
});
```

## Running locally

Just open `index.html` in a browser. No server needed.

## Deploying to GitHub Pages

1. Push the files to a GitHub repository (with `index.html` in the root).
2. Go to **Settings → Pages**.
3. Set **Source** to *Deploy from a branch*, select `main` and `/ (root)`, then **Save**.
4. After a few minutes the site will be available at `https://<username>.github.io/<repo>/`.

## Features

- Mobile-first, responsive layout
- Automatic light/dark theme (`prefers-color-scheme`)
- Accepts both `.` and `,` as decimal separators
- Input validation with error toast
- Accessible: native controls, `aria-live` results, keyboard focus styles
