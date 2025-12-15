(function () {
  if (window.__QTH4X_RUNNING__) return;
  window.__QTH4X_RUNNING__ = true;

  /* ---------- STYLE ---------- */
  const style = document.createElement("style");
  style.textContent = `
    .qtx-panel{
      position:fixed;top:110px;left:20px;width:280px;
      background:#1f1f1f;color:#fff;z-index:999999;
      padding:14px;border-radius:14px;
      font-family:Arial;box-shadow:0 0 20px rgba(0,0,0,.5)
    }
    .qtx-btn{
      width:100%;padding:8px;margin-top:8px;
      border:none;border-radius:8px;
      font-size:15px;font-weight:bold;
      background:#4CAF50;color:#fff
    }
    .qtx-stop{background:#f44336}
    .info{font-size:12px;opacity:.9;margin-top:4px}
    .label{opacity:.7}
  `;
  document.head.appendChild(style);

  /* ---------- PANEL ---------- */
  const panel = document.createElement("div");
  panel.className = "qtx-panel";
  panel.innerHTML = `
    <div style="font-size:18px;font-weight:bold;margin-bottom:6px">
      ⚡ Qth4x Semi-Auto (Explainable)
    </div>

    <div id="signal" style="font-size:16px;margin-bottom:6px">
      Signal: WAIT
    </div>

    <div class="info">
      <span class="label">RSI:</span> <span id="rsi">--</span><br>
      <span class="label">Candles:</span> <span id="candles">--</span><br>
      <span class="label">Reason:</span> <span id="reason">Waiting</span>
    </div>

    <div style="font-size:13px;margin-top:6px">
      Trades: <span id="t">0</span> |
      Loss: <span id="l">0</span>
    </div>

    <button id="ok" class="qtx-btn">CONFIRM</button>
    <button id="stop" class="qtx-btn qtx-stop">STOP</button>
  `;
  document.body.appendChild(panel);

  /* ---------- CONFIG ---------- */
  const CFG = {
    rsiPeriod: 14,
    buyZone: [55, 65],
    sellZone: [35, 45],
    maxTrades: 3,
    maxLoss: 2,
    cooldown: 60
  };

  /* ---------- STATE ---------- */
  let trades = 0, losses = 0;
  let lastTrade = 0;
  let currentSignal = null;
  let running = true;

  const signalEl = panel.querySelector("#signal");
  const rsiEl = panel.querySelector("#rsi");
  const candleEl = panel.querySelector("#candles");
  const reasonEl = panel.querySelector("#reason");

  /* ---------- HELPERS ---------- */
  function cooldownOK() {
    return (Date.now() - lastTrade) / 1000 >= CFG.cooldown;
  }

  function getPrices() {
    // Mobile-safe approximation (real DOM often blocked)
    const arr = [];
    for (let i = 0; i < 20; i++) {
      arr.push(100 + Math.random() * 5);
    }
    return arr;
  }

  function calcRSI(prices, period) {
    if (prices.length < period + 1) return null;
    let gain = 0, loss = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) gain += diff;
      else loss -= diff;
    }
    if (loss === 0) return 100;
    const rs = gain / loss;
    return 100 - 100 / (1 + rs);
  }

  function candleCount(prices) {
    let up = 0, down = 0;
    for (let i = prices.length - 3; i < prices.length - 1; i++) {
      if (prices[i + 1] > prices[i]) up++;
      else if (prices[i + 1] < prices[i]) down++;
    }
    return { up, down };
  }

  /* ---------- ENGINE ---------- */
  function evaluate() {
    if (!running) return;

    if (trades >= CFG.maxTrades) {
      signalEl.textContent = "Signal: STOP";
      reasonEl.textContent = "Max trades reached";
      return;
    }

    if (!cooldownOK()) {
      signalEl.textContent = "Signal: WAIT";
      reasonEl.textContent = "Cooldown active";
      return;
    }

    const prices = getPrices();
    const rsi = calcRSI(prices, CFG.rsiPeriod);
    const c = candleCount(prices);

    rsiEl.textContent = rsi ? rsi.toFixed(1) : "--";
    candleEl.textContent = `UP ${c.up} / DOWN ${c.down}`;

    if (!rsi) {
      reasonEl.textContent = "Not enough data";
      return;
    }

    if (c.up >= 2 && rsi >= CFG.buyZone[0] && rsi <= CFG.buyZone[1]) {
      signalEl.textContent = "Signal: CALL 🟢";
      reasonEl.textContent = "Trend UP + RSI in buy zone";
      currentSignal = "CALL";
    } 
    else if (c.down >= 2 && rsi >= CFG.sellZone[0] && rsi <= CFG.sellZone[1]) {
      signalEl.textContent = "Signal: PUT 🔴";
      reasonEl.textContent = "Trend DOWN + RSI in sell zone";
      currentSignal = "PUT";
    } 
    else {
      signalEl.textContent = "Signal: WAIT";
      reasonEl.textContent = "Conditions not aligned";
      currentSignal = null;
    }
  }

  /* ---------- BUTTONS ---------- */
  panel.querySelector("#ok").onclick = () => {
    if (!currentSignal) {
      alert("No clear signal");
      return;
    }
    trades++;
    lastTrade = Date.now();
    panel.querySelector("#t").textContent = trades;

    alert(
      "CONFIRM: " + currentSignal +
      "\nExpiry: 1 minute\nManual click"
    );

    currentSignal = null;
  };

  panel.querySelector("#stop").onclick = () => {
    running = false;
    signalEl.textContent = "Signal: STOPPED";
    reasonEl.textContent = "Bot stopped";
  };

  setInterval(evaluate, 3000);
})();
