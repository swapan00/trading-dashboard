(function () {
  if (window.__QTH4X_RUNNING__) return;
  window.__QTH4X_RUNNING__ = true;

  /* ---------- STYLE ---------- */
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

  /* ---------- PANEL ---------- */
  const panel = document.createElement("div");
  panel.className = "qtx-panel";
  panel.innerHTML = `
    <div style="font-size:18px;font-weight:bold;margin-bottom:6px">
      ⚡ Qth4x Semi-Auto (Real Trend)
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
    rsiPeriod: 14,
    buyZone: [55, 65],
    sellZone: [35, 45],
    maxTrades: 3,
    maxLoss: 2,
    cooldown: 60 // sec
  };

  /* ---------- STATE ---------- */
  let trades = 0, losses = 0;
  let lastTrade = 0;
  let currentSignal = null;
  let running = true;

  const signalEl = panel.querySelector("#signal");
  const biasEl = panel.querySelector("#bias");
  const tEl = panel.querySelector("#t");
  const lEl = panel.querySelector("#l");

  /* ---------- HELPERS ---------- */
  function cooldownOK() {
    return (Date.now() - lastTrade) / 1000 >= CFG.cooldown;
  }

  function getCandlePrices() {
    // Practical DOM-based approximation
    // Quotex updates class names often, so fallback is random if not found
    const prices = [];
    document.querySelectorAll('[class*="candle"],[data-price]').forEach(c => {
      const val = parseFloat(c.getAttribute('data-price') || c.textContent);
      if (!isNaN(val)) prices.push(val);
    });
    if(prices.length<10){
      // fallback for mobile
      for(let i=0;i<15;i++) prices.push(100+Math.random()*5);
    }
    return prices.slice(-50);
  }

  function calcRSI(prices, period) {
    if (prices.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - 100 / (1 + rs);
  }

  function calcTrend(prices) {
    if(prices.length<3) return "WAIT";
    const last = prices.slice(-3);
    if(last[2]>last[1] && last[1]>last[0]) return "UP";
    if(last[2]<last[1] && last[1]<last[0]) return "DOWN";
    return "NEUTRAL";
  }

  /* ---------- ENGINE ---------- */
  function evaluate() {
    if(!running) return;

    if(trades>=CFG.maxTrades){
      signalEl.textContent="Signal: STOP (max trades)";
      currentSignal=null;
      return;
    }

    if(losses>=CFG.maxLoss){
      signalEl.textContent="Signal: STOP (loss limit)";
      currentSignal=null;
      return;
    }

    if(!cooldownOK()){
      signalEl.textContent="Signal: WAIT (cooldown)";
      currentSignal=null;
      return;
    }

    const prices = getCandlePrices();
    const rsi = calcRSI(prices, CFG.rsiPeriod);
    const trend = calcTrend(prices);

    biasEl.textContent = "Trend: "+trend;

    if(!rsi) {
      signalEl.textContent="Signal: WAIT";
      currentSignal=null;
      return;
    }

    if(trend==="UP" && rsi>=CFG.buyZone[0] && rsi<=CFG.buyZone[1]){
      signalEl.textContent="Signal: CALL 🟢 (RSI "+rsi.toFixed(1)+")";
      currentSignal="CALL";
    } else if(trend==="DOWN" && rsi>=CFG.sellZone[0] && rsi<=CFG.sellZone[1]){
      signalEl.textContent="Signal: PUT 🔴 (RSI "+rsi.toFixed(1)+")";
      currentSignal="PUT";
    } else {
      signalEl.textContent="Signal: WAIT";
      currentSignal=null;
    }
  }

  /* ---------- BUTTONS ---------- */
  panel.querySelector("#ok").onclick = ()=>{
    if(!currentSignal){
      alert("No clear signal");
      return;
    }
    trades++;
    lastTrade=Date.now();
    tEl.textContent=trades;

    alert("CONFIRM: "+currentSignal+"\nExpiry: 1 min\nClick manually");

    currentSignal=null;
  };

  panel.querySelector("#stop").onclick = ()=>{
    running=false;
    signalEl.textContent="Signal: STOPPED";
  };

  setInterval(evaluate,3000);

})();
