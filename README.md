<div align="center">

# Social Energy Tracker

**Track how your interactions affect your energy. No server. No account. No noise.**

*A personal tool for introverts, empaths, and anyone who's ever left a conversation wondering - wait, why am I exhausted?*
</div>

---

## What it does

After every social interaction, you log three things: **who** you talked to, **how you felt before**, and **how you felt after**. That's it.

Over time, the app builds a picture of which people and contexts leave you recharged — and which ones quietly drain you. It's a mirror, not a judge.

---

## Features

**Log view**
Rate your energy before and after each interaction on a −5 → +5 scale. Tag it by context (Work, Family, Friends, etc). Add a note if something's worth remembering. The orb in the corner reflects your running average for the day — green when you're net positive, red when you're running low.

**Dashboard**
Energy trend line, context breakdown, and a delta distribution chart. Filter by the last week, month, or all time. A short auto-generated insight appears when the data has something to say.

**People**
Every person you've logged appears here with their average energy delta and a coloured bar. Search to find anyone instantly.

**Patterns**
Dig deeper — energy by day of week, time of day, a 12-week heatmap, and a scatter chart comparing your baseline mood to how much each interaction shifted it.

---

## Design

- Grainy gradient backgrounds (soft radial blobs + SVG fractal noise overlay)
- Five colour themes — Orange, Rose, Sage, Violet, Sky — switchable via sidebar swatches
- Full light / dark mode with a smooth 550ms crossfade
- Rounded, friendly Nunito typography
- Springy pill and tag interactions (`cubic-bezier` overshoot easing)
- Crayon-textured sun mascot in the sidebar (pure SVG, no images)
- All charts drawn on raw `<canvas>` with no charting library

---

## Tech

| | |
|---|---|
| **Language** | Vanilla HTML, CSS, JavaScript — no build step |
| **Storage** | `localStorage` only. Your data never leaves your browser. |
| **Charts** | Custom Canvas 2D renderer (`charts.js`) |
| **Fonts** | DM Serif Display · DM Mono · Nunito (Google Fonts) |
| **Dependencies** | Zero |

The codebase follows a strict separation of responsibilities:

- `data.js` — all storage, analytics, and export logic
- `charts.js` — all canvas drawing
- `app.js` — UI wiring and event handling
- `style.css` — all theming, layout, animation

---

## Getting started

```bash
git clone https://github.com/yourusername/social-energy-tracker.git
cd social-energy-tracker
open index.html
```

No install. No `npm install`. No `.env`. Just open the file.

---

## Data & privacy

Everything is stored in your browser's `localStorage`. Nothing is sent anywhere. If you clear your browser data, your entries go with it — so use the **JSON export** to back up regularly.

You can export as **JSON** (for re-importing later) or **CSV** (for spreadsheets). Import merges new entries without duplicating existing ones.

---

## Why I built this

I kept noticing patterns in how I felt after social interactions but had no way to actually track them. I wanted something small, private, and honest — not a wellness app with streaks and gamification, just a quiet log I could look back on.

---

<div align="center">

*Built with care and zero dependencies.*

</div>
