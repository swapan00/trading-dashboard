const QX_API_SYMBOL = "BTCUSDT";
const QX_API_INTERVAL = "1m";
const QX_API_LIMIT = 30;

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

async function qxFetchCandles() {
  try {
    const res = await fetch(QX_API_URL);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function qxAnalyzeScalping(candles) {
  if (!candles || candles.length < 5) return null;

  const recent = candles.slice(-5);

  let up = 0,
    down = 0,
    strongUp = 0,
    strongDown = 0;

  recent.forEach((c) => {
    const open = parseFloat(c[1]);
    const high = parseFloat(c[2]);
    const low = parseFloat(c[3]);
    const close = parseFloat(c[4]);

    const body = Math.abs(close - open);
    const range = high - low || 1;

    if (body < open * 0.0002) return;

    const ratio = body / range;

    if (close > open) {
      up++;
      if (ratio > 0.6) strongUp++;
    } else if (close < open) {
      down++;
      if (ratio > 0.6) strongDown++;
    }
  });

  if (up >= 3 && strongUp >= 1 && up > down) return "call";
  if (down >= 3 && strongDown >= 1 && down > up) return "put";

  return null;
}

async function qxGetExternalSignal() {
  const now = Date.now();
  if (now - QX_lastFetchTime < QX_SIGNAL_TTL && QX_lastSignal !== null)
    return QX_lastSignal;

  const candles = await qxFetchCandles();
  const signal = qxAnalyzeScalping(candles);

  QX_lastSignal = signal;
  QX_lastFetchTime = now;

  return signal;
}

let QX_latestDirection = null;

setInterval(async () => {
  QX_latestDirection = await qxGetExternalSignal();
}, 5000);

function getAutoDirection() {
  return QX_latestDirection;
}
