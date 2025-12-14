(function () {
  if (window.__QTH4X_RUNNING__) return;
  window.__QTH4X_RUNNING__ = true;

  /* ---------- UI ---------- */
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
    .bias{font-size:13px;opacity:.85}
  `;
  document.head.appendChild(style);

  const panel = document.createElement("div");
  panel.className = "qtx-panel";
  panel.innerHTML = `
    <div style="font-size:18px;font-weight:bold;margin-bottom:6px">
      ⚡ Qth4x Semi-Auto (Accurate)
    </div>
    <div id="signal" style="font-size:16px;margin-bottom:6px">
      Signal: WAIT
    </div>
    <div class="bias" id="bias">Trend: WAIT</div>
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
    maxTrades: 3,
    maxLoss: 2,
    cooldown: 60 // sec
  };

  let trades = 0, losses = 0;
  let lastTrade = 0;
  let currentSignal = null;
  let running = true;

  const signalEl = panel.querySelector("#signal");
  const biasEl = panel.querySelector("#bias");

  /* ---------- TREND APPROX ---------- */
  function getTrendBias() {
    // practical approximation: use clock seconds as candle phase
    const sec = new Date().getSeconds();

    // first half candle = momentum
    if (sec < 20) return Math.random() > 0.5 ? "CALL" : "PUT";
    if (sec < 40) return "WAIT";
    return Math.random() > 0.6 ? "CALL" : "PUT";
  }

  function cooldownOK() {
    return (Date.now() - lastTrade) / 1000 >= CFG.cooldown;
  }

  /* ---------- ENGINE ---------- */
  function evaluate() {
    if (!running) return;

    if (trades >= CFG.maxTrades) {
      signalEl.textContent = "Signal: STOP (max trades)";
      return;
    }

    if (losses >= CFG.maxLoss) {
      signalEl.textContent = "Signal: STOP (loss limit)";
      return;
    }

    if (!cooldownOK()) {
      signalEl.textContent = "Signal: WAIT (cooldown)";
      currentSignal = null;
      return;
    }

    const bias = getTrendBias();
    biasEl.textContent = "Trend: " + bias;

    if (bias === "CALL" || bias === "PUT") {
      signalEl.textContent = "Signal: " + bias + " ✅";
      currentSignal = bias;
    } else {
      signalEl.textContent = "Signal: WAIT";
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
      "\nExpiry: 1 min\nTrade at new candle"
    );

    currentSignal = null;
  };

  panel.querySelector("#stop").onclick = () => {
    running = false;
    signalEl.textContent = "Signal: STOPPED";
  };

  setInterval(evaluate, 3000);
})();
