(function () {
  if (window.__QTX_PANEL_V2__) return;
  window.__QTX_PANEL_V2__ = true;

  /* ================== STYLE ================== */
  const style = document.createElement("style");
  style.textContent = `
    .qtx-panel{
      position:fixed;top:120px;left:20px;width:310px;
      background:#1f1f1f;color:#fff;z-index:999999;
      padding:14px;border-radius:14px;
      font-family:Arial, sans-serif;box-shadow:0 0 20px rgba(0,0,0,.6);
      cursor:move;
    }
    .row{margin-top:6px;font-size:13px}
    .btn{
      width:100%;padding:7px;margin-top:7px;
      border:none;border-radius:8px;font-weight:bold;font-size:13px;
    }
    .on{background:#00bcd4;color:#000}
    .off{background:#555;color:#ddd}
    .call{background:#4CAF50;color:#fff}
    .put{background:#f44336;color:#fff}
    .small{opacity:.85;font-size:12px}
    .badge{
      display:inline-block;padding:1px 6px;border-radius:8px;
      font-size:11px;margin-left:4px;
    }
  `;
  document.head.appendChild(style);

  /* ================== PANEL ================== */
  const panel = document.createElement("div");
  panel.className = "qtx-panel";
  panel.innerHTML = `
    <div style="font-size:16px;font-weight:bold;display:flex;justify-content:space-between;align-items:center;">
      <span>⚡ Qth4x Precision</span>
      <span id="qtx-mode" style="font-size:11px;opacity:.8;">DOM feed</span>
    </div>

    <div class="row">
      <span>Signal:</span>
      <span id="qtx-signal" style="font-weight:bold;margin-left:4px;">WAIT</span>
      <span id="qtx-sig-strength" class="badge" style="background:#444;">weak</span>
    </div>

    <div class="row small">
      Now: <span id="qtx-now">--</span>
      | 1m Δ: <span id="qtx-delta">--</span>
    </div>

    <div class="row small">
      Trend(1m): <span id="qtx-trend">--</span>
      | Vol: <span id="qtx-vol">--</span>
    </div>

    <div class="row small">
      Reason: <span id="qtx-reason">Waiting for enough data</span>
    </div>

    <button id="qtx-auto" class="btn off">AutoTrade: OFF</button>
    <button id="qtx-manual-call" class="btn call">MANUAL CALL</button>
    <button id="qtx-manual-put" class="btn put">MANUAL PUT</button>

    <div class="row small">
      Trades: <span id="qtx-trades">0</span>
      | Cooldown: <span id="qtx-cd">OK</span>
      | Samples: <span id="qtx-samples">0</span>
    </div>
  `;
  document.body.appendChild(panel);

  /* ================== MOVABLE PANEL ================== */
  (function makeMovable(el){
    let x=0,y=0,dx=0,dy=0;
    el.onmousedown = dragStart;
    function dragStart(e){
      if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      e.preventDefault();
      dx=e.clientX; dy=e.clientY;
      document.onmouseup = stopDrag;
      document.onmousemove = drag;
    }
    function drag(e){
      e.preventDefault();
      x = dx - e.clientX;
      y = dy - e.clientY;
      dx = e.clientX;
      dy = e.clientY;
      el.style.top = (el.offsetTop - y) + "px";
      el.style.left = (el.offsetLeft - x) + "px";
    }
    function stopDrag(){
      document.onmouseup=null;
      document.onmousemove=null;
    }
  })(panel);

  /* ================== CONFIG ================== */
  const CFG = {
    sampleIntervalMs: 5000,   // প্রতি ৫ সেকেন্ডে price নেবো
    windowSamples: 12,        // 12 * 5s = ১ মিনিট history
    minSamplesForSignal: 8,   // এর কম হলে শুধু data collect
    slopeStrong: 0.30,        // জরুরি: ১ মিনিটে price change threshold (তুমি tune করতে পারো)
    slopeMedium: 0.15,
    minVolatility: 0.02,      // খুব flat হলে signal না
    cooldownMs: 60000,        // ট্রেডের মাঝে ১ মিনিট gap
    maxTrades: 5              // এক সেশন এ কতগুলো auto trade
  };

  /* ================== STATE ================== */
  let priceHistory = [];      // {t, p}
  let autoOn = false;
  let lastTrade = 0;
  let trades = 0;
  let lastSignal = "WAIT";    // "CALL" | "PUT" | "WAIT"

  const elSignal   = panel.querySelector("#qtx-signal");
  const elStrength = panel.querySelector("#qtx-sig-strength");
  const elNow      = panel.querySelector("#qtx-now");
  const elDelta    = panel.querySelector("#qtx-delta");
  const elTrend    = panel.querySelector("#qtx-trend");
  const elVol      = panel.querySelector("#qtx-vol");
  const elReason   = panel.querySelector("#qtx-reason");
  const elTrades   = panel.querySelector("#qtx-trades");
  const elCD       = panel.querySelector("#qtx-cd");
  const elSamples  = panel.querySelector("#qtx-samples");
  const btnAuto    = panel.querySelector("#qtx-auto");

  /* ================== DOM PRICE READER ================== */
  function getCurrentPrice(){
    // তুমি চাইলে এখানে selector পরিবর্তন করতে পারো
    const el = document.querySelector(".form-pending-trade__current");
    if(!el) return null;
    const m = (el.innerText || "").match(/([\d.]+)$/);
    const p = m ? parseFloat(m[1]) : null;
    return Number.isFinite(p) ? p : null;
  }

  /* ================== HISTORY & METRICS ================== */
  function addSample(){
    const p = getCurrentPrice();
    if(p == null) return;

    const now = Date.now();
    priceHistory.push({ t: now, p });

    // কেবল শেষ N sample রাখি
    const maxLen = CFG.windowSamples * 3; // একটু বেশি buffer
    if(priceHistory.length > maxLen){
      priceHistory = priceHistory.slice(-maxLen);
    }

    elNow.textContent = p.toFixed(5);
    elSamples.textContent = priceHistory.length;
  }

  function getWindowData(ms){
    const now = Date.now();
    const from = now - ms;
    const win = priceHistory.filter(s => s.t >= from);
    return win.length ? win : null;
  }

  function computeMetrics(){
    const winMs = CFG.windowSamples * CFG.sampleIntervalMs;
    const win = getWindowData(winMs);
    if(!win || win.length < CFG.minSamplesForSignal){
      elReason.textContent = "Collecting price history...";
      elSignal.textContent = "WAIT";
      elTrend.textContent  = "--";
      elDelta.textContent  = "--";
      elVol.textContent    = "--";
      setStrength("weak");
      return { signal:"WAIT" };
    }

    const first = win[0].p;
    const last  = win[win.length-1].p;
    const delta = last - first;
    const rel   = first !== 0 ? delta / first : 0;

    // simple volatility: std dev approx
    let sum = 0, sum2 = 0;
    for(const s of win){
      sum  += s.p;
      sum2 += s.p * s.p;
    }
    const n = win.length;
    const mean = sum / n;
    const variance = Math.max(sum2/n - mean*mean, 0);
    const std = Math.sqrt(variance);
    const volRel = mean ? std / mean : 0;

    elDelta.textContent = delta.toFixed(5);
    elTrend.textContent = (rel * 100).toFixed(2) + "%";
    elVol.textContent   = (volRel * 100).toFixed(2) + "%";

    let signal = "WAIT";
    let reason = "";

    if (Math.abs(rel) < CFG.minVolatility) {
      signal = "WAIT";
      reason = "Too flat / low volatility";
      setStrength("weak");
    } else {
      if (rel >= CFG.slopeStrong/100) {
        signal = "CALL";
        reason = "Strong upward 1m trend";
        setStrength("strong");
      } else if (rel >= CFG.slopeMedium/100) {
        signal = "CALL";
        reason = "Moderate upward 1m trend";
        setStrength("medium");
      } else if (rel <= -CFG.slopeStrong/100) {
        signal = "PUT";
        reason = "Strong downward 1m trend";
        setStrength("strong");
      } else if (rel <= -CFG.slopeMedium/100) {
        signal = "PUT";
        reason = "Moderate downward 1m trend";
        setStrength("medium");
      } else {
        signal = "WAIT";
        reason = "Inside neutral zone";
        setStrength("weak");
      }
    }

    elSignal.textContent = signal;
    elReason.textContent = reason;

    // রং
    if(signal === "CALL"){
      elSignal.style.color = "#4CAF50";
    } else if(signal === "PUT"){
      elSignal.style.color = "#f44336";
    } else {
      elSignal.style.color = "#ddd";
    }

    return { signal, delta, rel, volRel };
  }

  function setStrength(level){
    elStrength.textContent = level;
    if(level === "strong"){
      elStrength.style.background = "#2e7d32";
      elStrength.style.color = "#fff";
    } else if(level === "medium"){
      elStrength.style.background = "#ff9800";
      elStrength.style.color = "#000";
    } else {
      elStrength.style.background = "#444";
      elStrength.style.color = "#fff";
    }
  }

  /* ================== TRADE CONTROL ================== */
  function canTrade(){
    if(trades >= CFG.maxTrades){
      elCD.textContent = "Limit";
      return false;
    }
    const diff = Date.now() - lastTrade;
    const ok = diff >= CFG.cooldownMs;
    elCD.textContent = ok ? "OK" : "WAIT";
    return ok;
  }

  function clickPlatformButton(dir){
    // প্রয়োজনে এখানে তোমার সঠিক selector বসাও
    const selector = dir === "CALL" ? ".call-btn" : ".put-btn";
    const btn = document.querySelector(selector);
    if(!btn){
      console.warn("Trade button not found:", selector);
      return false;
    }
    btn.click();
    return true;
  }

  function doTrade(dir, fromAuto){
    const price = getCurrentPrice();
    if(price == null){
      elReason.textContent = "Price not available for trade";
      return;
    }

    if(fromAuto && !canTrade()) return;

    const ok = clickPlatformButton(dir);
    if(!ok) return;

    trades++;
    lastTrade = Date.now();
    elTrades.textContent = trades;
    console.log("[QTX AUTO TRADE]", dir, "price=", price.toFixed(5), "auto=", fromAuto);
    elReason.textContent = (fromAuto ? "Auto " : "Manual ") + dir + " @ " + price.toFixed(5);
  }

  /* ================== ENGINE LOOP ================== */
  function engineTick(){
    addSample();
    const { signal } = computeMetrics();

    if(autoOn){
      // শুধুমাত্র নতুন শক্তিশালী/মাঝারি signal এ trade (repeat noise এ না)
      if(signal !== "WAIT" && signal !== lastSignal && canTrade()){
        doTrade(signal, true);
      }
    }
    lastSignal = signal;
  }

  /* ================== CONTROLS ================== */
  btnAuto.onclick = () => {
    autoOn = !autoOn;
    btnAuto.textContent = "AutoTrade: " + (autoOn ? "ON" : "OFF");
    btnAuto.className = "btn " + (autoOn ? "on" : "off");
  };

  panel.querySelector("#qtx-manual-call").onclick = () => doTrade("CALL", false);
  panel.querySelector("#qtx-manual-put").onclick  = () => doTrade("PUT", false);

  // MAIN INTERVAL: প্রতি ৫ সেকেন্ডে
  setInterval(engineTick, CFG.sampleIntervalMs);

  elReason.textContent = "Collecting DOM price feed...";
})();
