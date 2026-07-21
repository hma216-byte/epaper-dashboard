/**
 * config.js
 * ---------------------------------------------------------------------------
 * Central configuration for the E-Paper Dashboard.
 * Holds default settings, the localStorage key, and small shared constants.
 * Nothing in this file touches the DOM — it is pure data + helpers so it can
 * be reasoned about (and unit tested) in isolation.
 * ---------------------------------------------------------------------------
 */

const STORAGE_KEY = 'epaper-dashboard-settings-v1';

/** Default settings — used on first run, and as a fallback for any missing key. */
const DEFAULT_SETTINGS = {
  temperatureUnit: 'C',        // 'C' | 'F'
  clockFormat: '24',           // '24' | '12'
  units: 'metric',             // 'metric' | 'imperial'
  theme: 'light',              // 'light' (white e-ink) | 'dark' (black e-ink)
  refreshInterval: 30,         // seconds between simulated data refreshes
  language: 'en',
  widgets: {
    strava: true,
    printer: true,
    vacuum: true,
    weather: true,
    compass: true,
    aqi: true,
    forecast: true,
    clock: true,
    date: true,
    music: true,
    email: true
  }
};

/** Language strings — small dictionary, English + one alternate to prove the hook works. */
const STRINGS = {
  en: {
    stravaStats: 'STRAVA STATS',
    printer: 'PRINTER',
    vacuum: 'VACUUM',
    airQuality: 'AIR QUALITY',
    unreadInbox: 'Unread Inbox',
    settings: 'Settings',
    running: 'RUNNING',
    paused: 'PAUSED',
    offline: 'OFFLINE',
    charging: 'CHARGING',
    cleaning: 'CLEANING',
    docked: 'DOCKED'
  },
  es: {
    stravaStats: 'ESTAD\u00cdSTICAS',
    printer: 'IMPRESORA',
    vacuum: 'ASPIRADORA',
    airQuality: 'CALIDAD DEL AIRE',
    unreadInbox: 'Bandeja sin leer',
    settings: 'Ajustes',
    running: 'ACTIVA',
    paused: 'PAUSADA',
    offline: 'DESCONECTADA',
    charging: 'CARGANDO',
    cleaning: 'LIMPIANDO',
    docked: 'EN BASE'
  }
};

/** AQI category bands, used for both label + description.
 *  `color` is a muted / matte tone (not a saturated traffic-light color) so
 *  it reads as an accent rather than an alert. */
const AQI_BANDS = [
  { max: 50, label: 'Good', color: '#5c8a63' },
  { max: 100, label: 'Moderate', color: '#b9942f' },
  { max: 150, label: 'Poor', color: '#bf7a3f' },
  { max: 200, label: 'Very Poor', color: '#b2583f' },
  { max: 300, label: 'Hazardous', color: '#96435a' },
  { max: Infinity, label: 'Hazardous', color: '#96435a' }
];

/* --------------------------------------------------------------------- */
/* Settings persistence                                                  */
/* --------------------------------------------------------------------- */

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw);
    // Shallow-merge so new keys introduced later always have a value.
    return {
      ...structuredClone(DEFAULT_SETTINGS),
      ...parsed,
      widgets: { ...DEFAULT_SETTINGS.widgets, ...(parsed.widgets || {}) }
    };
  } catch (err) {
    console.warn('Settings could not be read, using defaults.', err);
    return structuredClone(DEFAULT_SETTINGS);
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.warn('Settings could not be saved.', err);
    return false;
  }
}

function exportSettings(settings) {
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'epaper-dashboard-settings.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importSettingsFromFile(file, onLoaded) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      onLoaded({
        ...structuredClone(DEFAULT_SETTINGS),
        ...parsed,
        widgets: { ...DEFAULT_SETTINGS.widgets, ...(parsed.widgets || {}) }
      });
    } catch (err) {
      console.warn('Import failed: invalid JSON.', err);
    }
  };
  reader.readAsText(file);
}
