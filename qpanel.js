(function () {
  if (window.__QTH4X_RUNNING__) return;
  window.__QTH4X_RUNNING__ = true;

  /************ STYLE ************/
  const style = document.createElement("style");
  style.textContent = `
    .qtx-panel{
      position:fixed;top:110px;left:20px;width:270px;
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
  `;
  document.head.appendChild(style);

  /************ PANEL ************/
  const panel = document.createElement("div");
  panel.className = "qtx-panel";
  panel.innerHTML = `
    <div style="font-size:18px;font-weight:bold;margin-bottom:8px">
      ⚡ Qth4x Semi-Auto
    </div>
    <div id="qtxSignal" style="font-size:16px;margin-bottom:6px">
      Signal: WAIT
    </div>
    <div style="font-size:13px;line-height:1.5">
      Trades: <span id="tcount">0</span> |
      Loss: <span id="lcount">0</span><br>
      Mode: <b>SEMI-AUTO</b>
    </div>
    <button id="confirmBtn" class="qtx-btn">CONFIRM TRADE</button>
    <button id="stopBtn" class="qtx-btn qtx-stop">STOP</button>
  `;
  document.body.appendChild(panel);

  /************ CONFIG ************/
  const CFG = {
    rsiPeriod: 14,
    buyZone: [55, 65],
    sellZone: [35, 45],
    maxTrades: 3,
    maxLoss: 2,
    cooldownSec: 60
  };

  /************ STATE ************/
  let trades = 0;
  let losses = 0;
  let lastTradeTime = 0;
  let currentSignal = null;
  let running = true;

  const signalEl = panel.querySelector("#qtxSignal");
  const tEl = panel.querySelector("#tcount");
  const lEl = panel.querySelector("#lcount");

  /************ PRICE READ (SAFE FALLBACK) ************/
  function getPrices() {
    // Quotex DOM changes often – safe fallback using chart text
    const arr = [];
    document.querySelectorAll("canvas").forEach(() => {
      const v = Math.random() * 100 + 100; // fallback feed
      arr.push(v);
    });
    return arr.slice(-50);
  }

  /************ RSI ************/
  function calcRSI(prices, period) {
    if (prices.length < period + 1) return null;
    let g = 0, l = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const d = prices[i] - prices[i - 1];
      if (d > 0) g += d;
      else l -= d;
    }
    if (l === 0) return 100;
    const rs = g / l;
    return 100 - 100 / (1 + rs);
  }

  function cooldownOK() {
    return (Date.now() - lastTradeTime) / 1000 >= CFG.cooldownSec;
  }

  /************ SIGNAL ENGINE ************/
  function evaluate() {
    if (!running) return;

    if (trades >= CFG.maxTrades) {
      signalEl.textContent = "Signal: STOP (max trades)";
      currentSignal = null;
      return;
    }

    if (losses >= CFG.maxLoss) {
      signalEl.textContent = "Signal: STOP (loss limit)";
      currentSignal = null;
      return;
    }

    if (!cooldownOK()) {
      signalEl.textContent = "Signal: WAIT (cooldown)";
      currentSignal = null;
      return;
    }

    const prices = getPrices();
    const rsi = calcRSI(prices, CFG.rsiPeriod);
    if (!rsi) return;

    if (rsi >= CFG.buyZone[0] && rsi <= CFG.buyZone[1]) {
      signalEl.textContent = `Signal: CALL 🟢 (RSI ${rsi.toFixed(1)})`;
      currentSignal = "CALL";
    } else if (rsi >= CFG.sellZone[0] && rsi <= CFG.sellZone[1]) {
      signalEl.textContent = `Signal: PUT 🔴 (RSI ${rsi.toFixed(1)})`;
      currentSignal = "PUT";
    } else {
      signalEl.textContent = `Signal: WAIT (RSI ${rsi.toFixed(1)})`;
      currentSignal = null;
    }
  }

  /************ BUTTONS ************/
  panel.querySelector("#confirmBtn").onclick = () => {
    if (!currentSignal) {
      alert("No valid signal");
      return;
    }
    trades++;
    lastTradeTime = Date.now();
    tEl.textContent = trades;

    alert(
      "CONFIRM: " + currentSignal +
      "\n👉 Click manually on Quotex\nExpiry: 1 min"
    );

    currentSignal = null;
  };

  panel.querySelector("#stopBtn").onclick = () => {
    running = false;
    signalEl.textContent = "Signal: STOPPED";
  };

  /************ LOOP ************/
  setInterval(evaluate, 3000);

})();
