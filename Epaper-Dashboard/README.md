# E-Paper Dashboard

A fully functional, dependency-free recreation of a black-and-white e-ink
information dashboard: Strava stats, printer & robot-vacuum status, weather,
wind compass, air quality, hourly forecast, a dot-matrix clock, date, a
music player, and unread mail — three columns, hairline dividers, no
gradients, no shadows, no colour.

## Running it

No build step, no server, no npm install. Just open the file:

```
Epaper-Dashboard/index.html
```

double-click it, or drag it into a browser tab. Everything — icons, fonts,
album art — is inlined or local, so it works completely offline.

To install it as an app (PWA) or use the service worker for offline
caching, serve the folder over `http://` or `https://` instead (service
workers require a real origin, not `file://`):

```
cd Epaper-Dashboard
python3 -m http.server 8080
# then open http://localhost:8080
```

## Project structure

```
Epaper-Dashboard/
├── index.html      Markup + inlined icon sprite + settings panel
├── style.css        All styling: design tokens, grid layout, dark mode
├── script.js         Rendering logic, clock, settings, PWA hooks
├── data.js            Mock data + simulated "fetch" functions per widget
├── config.js         Defaults, persistence (localStorage), i18n strings
├── icons.svg           Standalone icon sprite (same IDs as the inlined copy)
├── manifest.json     PWA manifest
├── sw.js                Offline service worker (app-shell caching)
├── README.md
└── assets/
    ├── fonts/         (reserved for custom fonts, currently unused)
    ├── images/        album-placeholder.svg
    └── icons/         (reserved, icons currently live in icons.svg)
```

## Making it live

Every widget is fed by a `fetchX()` function in `data.js`. Replace the body
of any of them with a real network call (Strava API, your printer's status
endpoint, your vacuum's local API, a weather provider, IMAP/Gmail, etc.) —
the render functions in `script.js` don't need to change as long as the
returned object shape stays the same.

Data currently refreshes every 30 seconds via a `setInterval`, matching the
"Refresh Interval" setting in the settings panel (open it with the gear icon
or the `S` key).

## Settings panel

Opens from the gear icon (or `S`). Lets you change:

- Temperature unit (°C / °F)
- Clock format (24h / 12h)
- Metric / Imperial
- Theme — White E-Ink / Black E-Ink (or press `D`)
- Refresh interval
- Widget visibility (show/hide any section)
- Language (English / Spanish, easy to extend in `config.js`)
- Export / Import settings as JSON

All settings persist in `localStorage` automatically.

## Keyboard shortcuts

| Key | Action              |
|-----|---------------------|
| `R` | Refresh data now    |
| `F` | Toggle fullscreen   |
| `S` | Open settings       |
| `D` | Toggle dark mode    |
| `Esc` | Close settings    |

## Toolbar

Top-right of the frame: refresh, screenshot (renders the dashboard to a
downloadable PNG, no external library), fullscreen, and settings.

## Design notes

- The clock is a genuine dot-matrix rendering (5×7 bitmap font drawn as a
  CSS grid of dots), not just a bold monospace font — this is what gives it
  the physical-display feel in the reference photo.
- Every panel is separated purely by 1px hairlines — there is intentionally
  no box-shadow, border-radius on content, or colour anywhere in the
  `--theme` tokens.
- `prefers-reduced-motion` is respected: progress-bar transitions, the
  scrolling song title, and the compass rotation are disabled for users who
  request less motion.
- The layout is a single CSS Grid (`grid-template-columns: 27fr 40fr 33fr`)
  that collapses to one column under 900px, and forecast cards wrap to a
  2×2 grid under 480px, so it scales from a 1024×600 Raspberry Pi panel up
  to a 1920×1080 monitor and down to a phone.

## Browser support

Built and tested against current Chrome, Firefox, and Safari. Uses only
standard, unprefixed CSS Grid/Flexbox, `<svg><use>`, and ES6+ JavaScript
(no transpilation needed).
