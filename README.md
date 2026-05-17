# Social Energy Tracker

A local-first web application for tracking how social interactions affect your energy — no server, no account, no data leaves your browser.

> **Some people drain you. Some recharge you.** Log interactions in seconds. Patterns reveal themselves over time.

---

## Features

### Logging
- Log any interaction: person + context + energy rating
- Optional **baseline mood** before the interaction, so you see the real delta
- **5-point scale**: Drained / Low / Neutral / Good / Energised (mapped to −5 to +5)
- Context tags: Work, Family, Friends, Romantic, Acquaintance + custom
- Autocomplete on person names from past entries
- Optional notes per interaction

### Dashboard
- **Energy trend** line chart (week / month / all time toggle)
- **Context breakdown** — which social settings drain vs recharge you
- **Delta distribution** — histogram of your interaction outcomes
- Stat cards: total interactions, average delta, top recharger, top drainer
- Automatic insight callout (e.g. "3 draining Work interactions this week")

### People
- Every person ranked by average energy delta
- Color-coded bar (green = recharges, red = drains)
- Context tags per person, interaction count
- Search by name

### Patterns (Data Analysis)
- **Day of week** — when are interactions most draining?
- **Time of day** — morning vs evening patterns
- **12-week heatmap** — interaction frequency and quality at a glance
- **Baseline vs delta scatter** — do you drain faster when already low? (with linear regression line)

### Data
- JSON export (full structured data)
- CSV export (for Excel / pandas analysis)
- JSON import (merge entries, no duplicates)
- Dark mode (persisted)

---

## Tech Stack

| Layer     | Choice                          |
|-----------|---------------------------------|
| Storage   | `localStorage` (browser-native) |
| UI        | Vanilla HTML + CSS              |
| Logic     | Vanilla JS (3 modules)          |
| Charts    | Custom canvas renderer (zero deps) |
| Fonts     | Google Fonts (DM Serif Display, DM Mono, Instrument Sans) |

**No build step. No npm. No framework. No backend.**

---

## File Structure

```
social-energy-tracker/
├── index.html   — markup & layout
├── styles.css   — design system & component styles
├── data.js      — storage layer (CRUD, analytics, export)
├── charts.js    — canvas chart renderer
├── app.js       — UI controller & view routing
└── README.md
```

---

## Running Locally

1. **Clone or download** this repository
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari)
3. That's it — no install, no server

```bash
git clone https://github.com/YOUR_USERNAME/social-energy-tracker.git
cd social-energy-tracker
open index.html        # macOS
# or double-click index.html in your file explorer
```

> Note: Google Fonts are loaded from the internet. If you're offline, the app falls back to system serif/mono fonts — it still works fine.

---

## Data & Privacy

All data is stored in your browser's `localStorage` under the key prefix `set_`. Nothing is sent anywhere.

To back up your data: use the **JSON** export button in the sidebar.  
To restore: use the **Import** button and select your exported JSON file.

---

## Design Principles

- **KISS** — each file has one job
- **YAGNI** — no features built speculatively
- **SOLID** — `data.js` owns storage, `charts.js` owns rendering, `app.js` owns coordination


## License

MIT
