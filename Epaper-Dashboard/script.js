/**
 * script.js
 * ---------------------------------------------------------------------------
 * Wires data.js + config.js to the DOM. Organised as small, single-purpose
 * render functions (one per widget) called from a central `renderAll()`,
 * plus a settings controller and a couple of small utilities (dot-matrix
 * clock, unit conversion, PWA hooks).
 * ---------------------------------------------------------------------------
 */

(function () {
  'use strict';

  /* ----------------------------------------------------------------- */
  /* App state                                                          */
  /* ----------------------------------------------------------------- */

  const state = {
    settings: loadSettings(),
    refreshTimer: null
  };

  /* ----------------------------------------------------------------- */
  /* Dot-matrix clock — 5 columns x 7 rows bitmap font                  */
  /* 1 = lit dot, 0 = off. This is the dashboard's signature element:   */
  /* an authentic pixel/e-ink digit rendering rather than a plain font. */
  /* ----------------------------------------------------------------- */

  const DOT_FONT = {
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
    '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
    ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000']
  };

  /** Builds (once) the dot grid DOM for a given character and returns it. */
  function buildDotGlyph(char) {
    const pattern = DOT_FONT[char] || DOT_FONT['0'];
    const wrap = document.createElement('div');
    wrap.className = 'dot-digit' + (char === ':' ? ' colon' : '');
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        const dot = document.createElement('div');
        dot.className = 'dot' + (pattern[row][col] === '1' ? ' on' : '');
        wrap.appendChild(dot);
      }
    }
    return wrap;
  }

  /** Renders a time string (e.g. "17:24") into the #dot-clock container. */
  function renderDotClock(timeString) {
    const container = document.getElementById('dot-clock');
    const chars = timeString.split('');

    // Rebuild only if the character count changed (e.g. 12H format has a
    // leading space instead of a digit) — otherwise just flip dots in place
    // to avoid needless DOM churn (keeps things smooth on low-power devices).
    if (container.children.length !== chars.length) {
      container.innerHTML = '';
      chars.forEach((ch) => container.appendChild(buildDotGlyph(ch)));
      return;
    }

    chars.forEach((ch, i) => {
      const glyph = container.children[i];
      const pattern = DOT_FONT[ch] || DOT_FONT['0'];
      const dots = glyph.querySelectorAll('.dot');
      let idx = 0;
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
          dots[idx].classList.toggle('on', pattern[row][col] === '1');
          idx++;
        }
      }
    });
  }

  /* ----------------------------------------------------------------- */
  /* Unit helpers                                                       */
  /* ----------------------------------------------------------------- */

  const c2f = (c) => Math.round((c * 9) / 5 + 32);
  const km2mi = (km) => Math.round((km * 0.621371) * 10) / 10;

  /* ----------------------------------------------------------------- */
  /* Weather color accents — muted, matte tones per condition. Kept     */
  /* deliberately desaturated so they read as e-ink "tint", not as a    */
  /* bright colorful UI element.                                        */
  /* ----------------------------------------------------------------- */

  const WEATHER_COLORS = {
    'icon-sun': '#b9812f',       // matte amber
    'icon-cloud-sun': '#93875a', // muted olive-gold
    'icon-cloud': '#5f7280',     // slate blue-gray
    'icon-rain': '#3f6f93'       // muted steel blue
  };

  function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /* ----------------------------------------------------------------- */
  /* Widget renderers                                                   */
  /* ----------------------------------------------------------------- */

  function renderStrava() {
    const s = fetchStrava();
    document.getElementById('strava-ytd').textContent = s.yearToDate.toFixed(1);
    document.getElementById('strava-ly').textContent = s.lastYear.toFixed(1);
    document.getElementById('strava-total').textContent = s.total.toFixed(1);
    document.getElementById('strava-acts').textContent = s.activityCount;
    document.getElementById('strava-ride').textContent = `${s.rideDistance.toFixed(1)} km`;
    document.getElementById('strava-walk').textContent = `${s.walkDistance.toFixed(1)} km`;
  }

  function renderPrinter() {
    const p = fetchPrinter();
    const statusEl = document.getElementById('printer-status');
    statusEl.textContent = p.status.toUpperCase();
    document.getElementById('printer-progress-fill').style.width = `${p.inkPercent}%`;
    document.getElementById('printer-progress-track').setAttribute('aria-valuenow', p.inkPercent);
    document.getElementById('printer-ink-pct').textContent = p.inkPercent;
    document.getElementById('printer-remaining').textContent = p.remainingMinutes;
    document.getElementById('printer-ink-used').textContent = p.inkUsedMl;
    document.getElementById('printer-ink-cap').textContent = p.inkCapacityMl;
  }

  function renderVacuum() {
    const v = fetchVacuum();
    document.getElementById('vacuum-battery').textContent = v.batteryPercent;
    document.getElementById('vacuum-room').textContent = v.name;
    document.getElementById('vacuum-area').textContent = v.cleaningAreaM2.toFixed(1);
    document.getElementById('vacuum-pct').textContent = v.cleaningPercent;
    document.getElementById('vacuum-status').textContent = v.status.toUpperCase();
    document.getElementById('vacuum-progress-fill').style.width = `${v.cleaningPercent}%`;
    document.getElementById('vacuum-progress-track').setAttribute('aria-valuenow', v.cleaningPercent);
    document.getElementById('vacuum-remaining').textContent = v.remainingMinutes;
  }

  function renderWeather() {
    const w = fetchWeather();
    const useF = state.settings.temperatureUnit === 'F';
    const temp = useF ? c2f(w.tempC) : Math.round(w.tempC);
    document.getElementById('weather-temp').textContent = temp;
    document.getElementById('weather-unit').textContent = useF ? 'F' : 'C';
    document.getElementById('weather-uv').textContent = Math.round(w.uvIndex);
    document.getElementById('weather-humidity').textContent = Math.round(w.humidity);
    document.getElementById('weather-pressure').textContent = w.pressureHpa.toFixed(1);

    const iconUse = document.querySelector('#weather-icon use');
    iconUse.setAttribute('href', `#${w.icon}`);

    // Matte accent tied to current condition: colors the weather icon,
    // the big temperature digits, and washes the weather + compass panels
    // with a very light tint of the same hue.
    const accent = WEATHER_COLORS[w.icon] || WEATHER_COLORS['icon-sun'];
    const tint = hexToRgba(accent, state.settings.theme === 'dark' ? 0.16 : 0.1);
    document.getElementById('weather-icon').style.color = accent;
    document.getElementById('weather-temp').style.color = accent;
    document.getElementById('panel-weather').style.backgroundColor = tint;
    document.getElementById('panel-compass').style.backgroundColor = tint;

    const arrow = document.getElementById('compass-arrow');
    arrow.setAttribute('transform', `rotate(${w.windDirectionDeg} 60 60)`);
    arrow.style.color = accent;
    const isImperial = state.settings.units === 'imperial';
    document.getElementById('wind-speed').textContent = isImperial ? km2mi(w.windSpeedKmh) : w.windSpeedKmh;
    document.getElementById('wind-unit').textContent = isImperial ? 'mph' : 'km/h';
  }

  function renderAqi() {
    const a = fetchAqi();
    const color = aqiColor(a.value);
    document.getElementById('aqi-value').textContent = a.value;
    document.getElementById('aqi-value').style.color = color;
    document.getElementById('aqi-label').textContent = aqiLabel(a.value);
    document.getElementById('aqi-label').style.color = color;
    document.getElementById('aqi-pm25').textContent = a.pm25;
    document.getElementById('aqi-pm10').textContent = a.pm10;
    document.getElementById('aqi-co2').textContent = a.co2;
    document.getElementById('aqi-voc').textContent = a.voc;
    document.getElementById('panel-aqi').style.backgroundColor =
      hexToRgba(color, state.settings.theme === 'dark' ? 0.14 : 0.08);
  }

  function renderForecast() {
    const items = fetchForecast();
    const useF = state.settings.temperatureUnit === 'F';
    const row = document.getElementById('forecast-row');
    row.innerHTML = '';
    items.forEach((f) => {
      const card = document.createElement('div');
      card.className = 'forecast-card';
      const temp = useF ? c2f(f.tempC) : f.tempC;
      const accent = WEATHER_COLORS[f.icon] || WEATHER_COLORS['icon-sun'];
      card.style.backgroundColor = hexToRgba(accent, state.settings.theme === 'dark' ? 0.14 : 0.08);
      card.innerHTML = `
        <span class="forecast-time">${f.time}</span>
        <svg class="icon" style="color:${accent}"><use href="#${f.icon}"></use></svg>
        <span class="forecast-temp">${temp}&deg;</span>
        <span class="forecast-rain">${f.rainChance}%</span>
      `;
      row.appendChild(card);
    });
  }

  function renderClock() {
    const now = new Date();
    let hours = now.getHours();
    let suffix = '';
    if (state.settings.clockFormat === '12') {
      suffix = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
    }
    const hh = String(hours).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    renderDotClock(`${hh}:${mm}`);
    document.getElementById('clock-seconds').textContent = `${ss}s${suffix}`;
  }

  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function renderDate() {
    const now = new Date();
    const text = `${DAY_NAMES[now.getDay()]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]}`;
    document.getElementById('date-line').textContent = text;
  }

  function renderMusic() {
    const m = fetchMusic();
    document.getElementById('music-title').textContent = m.title;
    document.getElementById('music-artist').textContent = m.artist;
    document.getElementById('music-progress-fill').style.width = `${m.progress * 100}%`;

    const playIconUse = document.querySelector('#music-play-icon use');
    playIconUse.setAttribute('href', m.isPlaying ? '#icon-play' : '#icon-pause');

    const toggleIconUse = document.querySelector('#music-toggle use');
    toggleIconUse.setAttribute('href', m.isPlaying ? '#icon-pause' : '#icon-play');

    // Scroll long titles.
    const scrollWrap = document.getElementById('music-title-scroll');
    const titleSpan = document.getElementById('music-title');
    const isLong = titleSpan.scrollWidth > scrollWrap.clientWidth + 4;
    scrollWrap.classList.toggle('scrolling', isLong);
  }

  function renderEmail() {
    const e = fetchEmail();
    document.getElementById('email-count').textContent = e.unreadCount;
    document.getElementById('email-time').textContent = e.lastReceived;
    document.getElementById('email-sender').textContent = e.newestSender;
  }

  function renderAll() {
    renderStrava();
    renderPrinter();
    renderVacuum();
    renderWeather();
    renderAqi();
    renderForecast();
    renderMusic();
    renderEmail();
  }

  /* ----------------------------------------------------------------- */
  /* Settings: theme / units / widgets / persistence                    */
  /* ----------------------------------------------------------------- */

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.settings.theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', state.settings.theme === 'dark' ? '#0a0a0a' : '#ffffff');
  }

  function applyWidgetVisibility() {
    const map = {
      strava: 'panel-strava',
      printer: 'panel-printer',
      vacuum: 'panel-vacuum',
      weather: 'panel-weather',
      compass: 'panel-compass',
      aqi: 'panel-aqi',
      forecast: 'panel-forecast',
      clock: 'panel-clock',
      music: 'panel-music',
      email: 'panel-email'
    };
    Object.entries(map).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) el.hidden = !state.settings.widgets[key];
    });
  }

  function syncSettingsUI() {
    document.querySelectorAll('.segmented button[data-setting]').forEach((btn) => {
      const key = btn.dataset.setting;
      const isActive = state.settings[key] === btn.dataset.value;
      btn.setAttribute('aria-pressed', String(isActive));
    });
    document.getElementById('select-language').value = state.settings.language;
    document.getElementById('input-refresh').value = state.settings.refreshInterval;
    document.querySelectorAll('[data-widget]').forEach((input) => {
      input.checked = !!state.settings.widgets[input.dataset.widget];
    });
  }

  function persistAndApply() {
    saveSettings(state.settings);
    applyTheme();
    applyWidgetVisibility();
    renderAll();
    renderClock();
    renderDate();
    restartRefreshTimer();
  }

  function initSettingsPanel() {
    const overlay = document.getElementById('settings-overlay');

    document.getElementById('btn-settings').addEventListener('click', () => {
      overlay.hidden = false;
      document.getElementById('settings-close').focus();
    });
    document.getElementById('settings-close').addEventListener('click', () => { overlay.hidden = true; });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.hidden = true; });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.hidden) overlay.hidden = true;
    });

    document.querySelectorAll('.segmented button[data-setting]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.settings[btn.dataset.setting] = btn.dataset.value;
        syncSettingsUI();
        persistAndApply();
      });
    });

    document.getElementById('select-language').addEventListener('change', (e) => {
      state.settings.language = e.target.value;
      persistAndApply();
    });

    document.getElementById('input-refresh').addEventListener('change', (e) => {
      const val = Math.min(300, Math.max(5, Number(e.target.value) || 30));
      state.settings.refreshInterval = val;
      e.target.value = val;
      persistAndApply();
    });

    document.querySelectorAll('[data-widget]').forEach((input) => {
      input.addEventListener('change', () => {
        state.settings.widgets[input.dataset.widget] = input.checked;
        persistAndApply();
      });
    });

    document.getElementById('btn-export').addEventListener('click', () => {
      exportSettings(state.settings);
    });

    const importInput = document.getElementById('input-import-file');
    document.getElementById('btn-import').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => {
      const file = importInput.files[0];
      if (!file) return;
      importSettingsFromFile(file, (imported) => {
        state.settings = imported;
        syncSettingsUI();
        persistAndApply();
      });
      importInput.value = '';
    });

    syncSettingsUI();
  }

  /* ----------------------------------------------------------------- */
  /* Toolbar: refresh / screenshot / fullscreen                         */
  /* ----------------------------------------------------------------- */

  function initToolbar() {
    document.getElementById('btn-refresh').addEventListener('click', renderAll);

    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.();
      }
    });

    document.getElementById('btn-screenshot').addEventListener('click', takeScreenshot);
  }

  /** Best-effort client-side screenshot of the dashboard screen, with no
   *  external libraries: serialises the screen element into an SVG
   *  foreignObject, rasterises it to a canvas, then downloads a PNG. */
  function takeScreenshot() {
    const node = document.getElementById('screen');
    const rect = node.getBoundingClientRect();
    const clone = node.cloneNode(true);
    clone.querySelectorAll('[hidden]').forEach((el) => el.remove());

    const styleText = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
        } catch {
          return '';
        }
      })
      .join('\n');

    const serialised = new XMLSerializer().serializeToString(clone);
    const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <style>${styleText}</style>
          ${serialised}
        </div>
      </foreignObject>
    </svg>`;

    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.fillStyle = state.settings.theme === 'dark' ? '#0a0a0a' : '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `dashboard-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
    };
    img.onerror = () => {
      console.warn('Screenshot could not be rendered in this browser.');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  /* ----------------------------------------------------------------- */
  /* Music transport controls (local simulation only)                   */
  /* ----------------------------------------------------------------- */

  function initMusicControls() {
    document.getElementById('music-toggle').addEventListener('click', () => {
      DASHBOARD_STATE.music.isPlaying = !DASHBOARD_STATE.music.isPlaying;
      renderMusic();
    });
    document.getElementById('music-prev').addEventListener('click', renderMusic);
    document.getElementById('music-next').addEventListener('click', renderMusic);
  }

  /* ----------------------------------------------------------------- */
  /* Simulated live refresh loop                                        */
  /* ----------------------------------------------------------------- */

  function restartRefreshTimer() {
    if (state.refreshTimer) clearInterval(state.refreshTimer);
    state.refreshTimer = setInterval(renderAll, state.settings.refreshInterval * 1000);
  }

  /* ----------------------------------------------------------------- */
  /* Keyboard shortcuts                                                  */
  /* ----------------------------------------------------------------- */

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.key === 'r' || e.key === 'R') renderAll();
      if (e.key === 'f' || e.key === 'F') document.getElementById('btn-fullscreen').click();
      if (e.key === 's' || e.key === 'S') document.getElementById('btn-settings').click();
      if (e.key === 'd' || e.key === 'D') {
        state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
        syncSettingsUI();
        persistAndApply();
      }
    });
  }

  /* ----------------------------------------------------------------- */
  /* Service worker (offline support / installable PWA)                 */
  /* ----------------------------------------------------------------- */

  function initServiceWorker() {
    if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch((err) => {
          console.warn('Service worker registration failed.', err);
        });
      });
    }
  }

  /* ----------------------------------------------------------------- */
  /* Boot                                                                */
  /* ----------------------------------------------------------------- */

  function init() {
    applyTheme();
    applyWidgetVisibility();
    initSettingsPanel();
    initToolbar();
    initMusicControls();
    initKeyboardShortcuts();
    initServiceWorker();

    renderAll();
    renderClock();
    renderDate();

    setInterval(renderClock, 1000);
    setInterval(renderDate, 60 * 1000);
    restartRefreshTimer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
