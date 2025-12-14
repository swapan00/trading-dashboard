/* ============================
   External Scalping Auto Logic
   Source: Binance BTCUSDT 1m
   ============================ */

const QX_API_SYMBOL = "BTCUSDT";
const QX_API_INTERVAL = "1m";
const QX_API_LIMIT = 10;

const QX_API_URL =
  "https://api.binance.com/api/v3/klines?symbol=" +
  QX_API_SYMBOL +
  "&interval=" +
  QX_API_INTERVAL +
  "&limit=" +
  QX_API_LIMIT;

let QX_lastSignal = null;
let QX_lastFetchTime = 0;
const QX_SIGNAL_TTL = 5000;

// Fetch candles
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
   ULTRA SIMPLE SCALPING LOGIC
   (NEVER RETURNS NULL)
   ============================ */

function qxAnalyzeScalping(candles) {
  if (!candles || candles.length < 3) return "call";

  const last3 = candles.slice(-3);

  let up = 0;
  let down = 0;

  last3.forEach(c => {
    const open = parseFloat(c[1]);
    const close = parseFloat(c[4]);

    if (close > open) up++;
    else if (close < open) down++;
  });

  // Majority rule
  if (up >= 2) return "call";
  if (down >= 2) return "put";

  // If mixed → use last candle
  const last = last3[last3.length - 1];
  const open = parseFloat(last[1]);
  const close = parseFloat(last[4]);

  return close > open ? "call" : "put";
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
let QX_latestDirection = "call"; // default fallback

setInterval(async () => {
  QX_latestDirection = await qxGetExternalSignal();
}, 5000);

// Main function used by your panel
function getAutoDirection() {
  return QX_latestDirection; // always "call" or "put"
}
