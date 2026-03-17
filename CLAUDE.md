# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpportunitySolutionRate is a single-file static web app (`index.html`) for prioritizing opportunities using the OSR formula:

```
Score = (Pain Value × Frequency) / (Build Cost × Time to Build × User Effort)
```

All inputs are 1–10. Score range: 0.001 (worst) to 100 (best).

## Running the App

No build step — open `index.html` directly in a browser.

## Architecture

The entire app lives in `index.html` (~784 lines) with three embedded sections:

- **CSS** (lines 10–525): Dark theme, CSS custom properties, custom range sliders, responsive grid (2-col desktop / 1-col mobile at <680px)
- **HTML** (lines 528–634): Form, results grid, stats strip
- **JavaScript** (lines 636–784): All logic; no frameworks or external JS

### Data Layer

State is a plain array of opportunity objects stored in `localStorage`:

```js
{ id: timestamp, name: string, pain: 1-10, freq: 1-10, build: 1-10, time: 1-10, effort: 1-10, score: number }
```

Key functions: `calcScore(pain, freq, build, time, effort)`, `formatScore(s)`, `addOpportunity()`, `deleteOpportunity(id)`, `clearAll()`, `save()`, `render()`, `updatePreview()`, `scoreColor(s)`.

### Score Color Mapping

- `score > 5` → teal (`#3FFFC2`) — high priority
- `score > 1` → yellow (`#FFD166`) — medium priority
- `score ≤ 1` → red (`#FF4D6D`) — low priority

### Form Layout

Three-column grid on desktop (`1fr 1fr 260px`):
- Col 1: opportunity name + Pain Value slider (accent) + Frequency slider (yellow)
- Col 2: Build Cost / Time to Build / User Effort sliders (teal) + Add button
- Col 3: live score preview

### Design Tokens

- Accent/pain: `#FF5C35`
- Background: `#0E0E10`
- Fonts: Syne (headers), JetBrains Mono (monospace), Outfit (body) — all from Google Fonts
