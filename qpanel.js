/* ============================
   External Scalping Auto Logic
   Source: Binance BTCUSDT 1m
   ============================ */

const QX_API_SYMBOL = "BTCUSDT";     // Proxy symbol for OTC
const QX_API_INTERVAL = "1m";        // Scalping timeframe
const QX_API_LIMIT = 30;             // Last 30 candles

const QX_API_URL =
  "https://api.binance.com/api/v3/klines?symbol=" +
  QX_API_SYMBOL +
  "&interval=" +
  QX_API_INTERVAL +
  "&limit=" +
  QX_API_LIMIT;

// Cache
let QX_lastSignal = null;
let QX_lastFetchTime = 0;
const QX_SIGNAL_TTL = 5000; // 5 seconds

// Fetch candles from Binance
async function qxFetchCandles() {
  try {
    const res = await fetch(QX_API_URL);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.log("[QX] Fetch error:", e);
    return null;
  }
}

/* ============================
   UPDATED SCALPING LOGIC
   (Flat market‑এও signal দেয়)
   ============================ */

function qxAnalyzeScalping(candles) {
  if (!candles || candles.length < 5) return null;

  const recent = candles.slice(-5);

  let up = 0;
  let down = 0;

  recent.forEach(c => {
    const open  = parseFloat(c[1]);
    const close = parseFloat(c[4]);

    if (close > open) up++;
    else if (close < open) down++;
  });

  // Simple scalping rule:
  if (up >= 3) return "call";
  if (down >= 3) return "put";

  return null;
}

// Get external signal
async function qxGetExternalSignal() {
  const now = Date.now();

  if (now - QX_lastFetchTime < QX_SIGNAL_TTL && QX_lastSignal !== null) {
    return QX_lastSignal;
  }

  const candles = await qxFetchCandles();
  const signal = qxAnalyzeScalping(candles);

  QX_lastSignal = signal;
  QX_lastFetchTime = now;

  console.log("[QX] Signal:", signal);
  return signal;
}

// Background updater
let QX_latestDirection = null;

setInterval(async () => {
  QX_latestDirection = await qxGetExternalSignal();
}, 5000);

// Main function used by your panel
function getAutoDirection() {
  return QX_latestDirection; // "call" / "put" / null
}
