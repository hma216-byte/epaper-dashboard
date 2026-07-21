/**
 * data.js
 * ---------------------------------------------------------------------------
 * All dashboard data lives here as plain JS objects, grouped by widget.
 * In a real deployment each `fetchX()` function is where you would swap in
 * a call to Strava's API, a printer's HTTP status endpoint, a vacuum's local
 * API, a weather provider, IMAP/Gmail, etc. Every fetch function currently
 * returns simulated, slightly-randomised data so the dashboard feels alive
 * without any network dependency.
 * ---------------------------------------------------------------------------
 */

const WEATHER_ICONS = ['icon-sun', 'icon-cloud-sun', 'icon-cloud', 'icon-rain'];

/** Small helper: random walk a number within [min, max], rounded to `places`. */
function jitter(value, spread, min, max, places = 1) {
  const next = value + (Math.random() * 2 - 1) * spread;
  const clamped = Math.min(max, Math.max(min, next));
  const factor = Math.pow(10, places);
  return Math.round(clamped * factor) / factor;
}

const DASHBOARD_STATE = {
  strava: {
    yearToDate: 0.0,
    lastYear: 2782.4,
    total: 5919.6,
    activityCount: 175,
    rideDistance: 5919.6,
    walkDistance: 201.0
  },

  printer: {
    name: 'Office Printer',
    status: 'running', // running | paused | offline
    inkPercent: 71,
    remainingMinutes: 13,
    inkUsedMl: 113,
    inkCapacityMl: 201
  },

  vacuum: {
    name: 'Room',
    batteryPercent: 84,
    cleaningAreaM2: 21.6,
    cleaningPercent: 47,
    remainingMinutes: 22,
    status: 'cleaning' // charging | cleaning | docked | paused
  },

  weather: {
    tempC: 12,
    feelsLikeC: 10,
    humidity: 40,
    pressureHpa: 1015.5,
    uvIndex: 0,
    visibilityKm: 12,
    icon: 'icon-sun',
    windSpeedKmh: 14.8,
    windDirectionDeg: 100 // 0 = N, 90 = E, 180 = S, 270 = W
  },

  aqi: {
    value: 50,
    pm25: 12,
    pm10: 18,
    co2: 480,
    voc: 90
  },

  forecast: [
    { time: '18:00', icon: 'icon-sun', tempC: 10, rainChance: 0 },
    { time: '19:00', icon: 'icon-sun', tempC: 9, rainChance: 0 },
    { time: '20:00', icon: 'icon-cloud', tempC: 7, rainChance: 20 },
    { time: '21:00', icon: 'icon-cloud', tempC: 6, rainChance: 30 }
  ],

  music: {
    title: 'By This River',
    artist: 'Brian Eno',
    isPlaying: true,
    progress: 0.35, // 0..1
    durationSec: 253
  },

  email: {
    unreadCount: 2,
    lastReceived: '17:04',
    newestSender: 'A. Rivera'
  },

  system: {
    battery: 92,
    wifiStrength: 3, // 0..4 bars
    ip: '192.168.1.42',
    cpu: 18,
    memory: 41,
    storage: 62,
    temperatureC: 46
  }
};

/* --------------------------------------------------------------------- */
/* Simulated "fetch" functions — each mutates DASHBOARD_STATE a little    */
/* to imitate real-world drift, then returns the relevant slice.          */
/* --------------------------------------------------------------------- */

function fetchStrava() {
  const s = DASHBOARD_STATE.strava;
  // Activity totals only creep upward, never down.
  s.total = jitter(s.total, 0.15, s.total, s.total + 2, 1);
  s.rideDistance = jitter(s.rideDistance, 0.1, s.rideDistance, s.rideDistance + 1.5, 1);
  return s;
}

function fetchPrinter() {
  const p = DASHBOARD_STATE.printer;
  if (p.status === 'running') {
    p.inkPercent = Math.max(0, jitter(p.inkPercent, 1.2, p.inkPercent - 3, p.inkPercent, 0));
    p.remainingMinutes = Math.max(0, p.remainingMinutes - 1);
    p.inkUsedMl = Math.min(p.inkCapacityMl, p.inkUsedMl + 1);
    if (p.remainingMinutes <= 0) p.status = 'paused';
  }
  return p;
}

function fetchVacuum() {
  const v = DASHBOARD_STATE.vacuum;
  if (v.status === 'cleaning') {
    v.cleaningPercent = Math.min(100, v.cleaningPercent + 1);
    v.cleaningAreaM2 = jitter(v.cleaningAreaM2, 0.4, v.cleaningAreaM2, v.cleaningAreaM2 + 0.6, 1);
    v.batteryPercent = Math.max(0, v.batteryPercent - 1);
    v.remainingMinutes = Math.max(0, v.remainingMinutes - 1);
    if (v.cleaningPercent >= 100) v.status = 'docked';
  } else if (v.status === 'charging') {
    v.batteryPercent = Math.min(100, v.batteryPercent + 2);
    if (v.batteryPercent >= 100) v.status = 'docked';
  }
  return v;
}

function fetchWeather() {
  const w = DASHBOARD_STATE.weather;
  w.tempC = jitter(w.tempC, 0.4, -10, 40, 1);
  w.feelsLikeC = jitter(w.feelsLikeC, 0.4, -12, 40, 1);
  w.humidity = jitter(w.humidity, 1.5, 5, 100, 0);
  w.pressureHpa = jitter(w.pressureHpa, 0.3, 980, 1040, 1);
  w.windSpeedKmh = jitter(w.windSpeedKmh, 1, 0, 60, 1);
  w.windDirectionDeg = (w.windDirectionDeg + (Math.random() * 10 - 5) + 360) % 360;
  return w;
}

function fetchAqi() {
  const a = DASHBOARD_STATE.aqi;
  a.value = Math.round(jitter(a.value, 3, 0, 300, 0));
  a.pm25 = Math.round(jitter(a.pm25, 1, 0, 200, 0));
  a.pm10 = Math.round(jitter(a.pm10, 1.5, 0, 300, 0));
  a.co2 = Math.round(jitter(a.co2, 8, 350, 2000, 0));
  a.voc = Math.round(jitter(a.voc, 5, 0, 500, 0));
  return a;
}

function fetchForecast() {
  return DASHBOARD_STATE.forecast;
}

function fetchMusic() {
  const m = DASHBOARD_STATE.music;
  if (m.isPlaying) {
    m.progress = (m.progress + 30 / m.durationSec) % 1;
  }
  return m;
}

function fetchEmail() {
  return DASHBOARD_STATE.email;
}

function fetchSystem() {
  const s = DASHBOARD_STATE.system;
  s.cpu = Math.round(jitter(s.cpu, 4, 2, 95, 0));
  s.memory = Math.round(jitter(s.memory, 2, 10, 95, 0));
  s.temperatureC = Math.round(jitter(s.temperatureC, 1, 30, 75, 0));
  return s;
}

function aqiLabel(value) {
  return AQI_BANDS.find((b) => value <= b.max).label;
}

function aqiColor(value) {
  return AQI_BANDS.find((b) => value <= b.max).color;
}
