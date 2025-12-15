(function () {
  if (window.__QTX_PANEL__) return;
  window.__QTX_PANEL__ = true;

  /* ================== STYLE ================== */
  const style = document.createElement("style");
  style.textContent = `
    .qtx-panel{
      position:fixed;top:120px;left:20px;width:290px;
      background:#1f1f1f;color:#fff;z-index:999999;
      padding:14px;border-radius:14px;
      font-family:Arial;box-shadow:0 0 20px rgba(0,0,0,.5)
    }
    .row{margin-top:6px;font-size:13px}
    .btn{width:100%;padding:8px;margin-top:8px;border:none;border-radius:8px;font-weight:bold}
    .on{background:#00bcd4;color:#000}
    .off{background:#555;color:#ddd}
    .call{background:#4CAF50;color:#fff}
    .put{background:#f44336;color:#fff}
    .small{opacity:.85;font-size:12px}
  `;
  document.head.appendChild(style);

  /* ================== PANEL ================== */
  const panel = document.createElement("div");
  panel.className = "qtx-panel";
  panel.innerHTML = `
    <div style="font-size:18px;font-weight:bold">⚡ Qth4x Panel</div>

    <div id="signal" class="row">Signal: WAIT</div>
    <div class="row small">RSI: <span id="rsi">--</span></div>
    <div class="row small">Candles: <span id="candles">--</span></div>
    <div class="row small">Reason: <span id="reason">Waiting</span></div>

    <button id="auto" class="btn off">AutoTrade: OFF</button>
    <button id="manualCall" class="btn call">MANUAL CALL</button>
    <button id="manualPut" class="btn put">MANUAL PUT</button>

    <div class="row small">
      Trades: <span id="t">0</span> | Cooldown: <span id="cd">OK</span>
    </div>
  `;
  document.body.appendChild(panel);

  /* ================== CONFIG ================== */
  const CFG = {
    rsiPeriod: 14,
    callZone: [58, 62],   // strong CALL
    putZone:  [38, 42],   // strong PUT
    cooldownMs: 60000,    // 1 min
    maxTrades: 3          // per session
  };

  /* ================== STATE ================== */
  let autoOn = false;
  let lastTrade = 0;
  let trades = 0;
  let currentSignal = null;

  const elSignal  = panel.querySelector("#signal");
  const elRSI     = panel.querySelector("#rsi");
  const elCandles = panel.querySelector("#candles");
  const elReason  = panel.querySelector("#reason");
  const elTrades  = panel.querySelector("#t");
  const elCD      = panel.querySelector("#cd");
  const btnAuto   = panel.querySelector("#auto");

  /* ================== DATA (mobile-safe approximation) ================== */
  function getPrices(){
    const a=[];
    for(let i=0;i<20;i++) a.push(100 + Math.random()*5);
    return a;
  }
  function calcRSI(p, n){
    let g=0,l=0;
    for(let i=p.length-n;i<p.length;i++){
      const d=p[i]-p[i-1];
      d>0?g+=d:l-=d;
    }
    if(l===0) return 100;
    const rs=g/l; return 100-100/(1+rs);
  }
  function candleCount(p){
    let up=0,down=0;
    for(let i=p.length-4;i<p.length-1;i++){
      if(p[i+1]>p[i]) up++;
      else if(p[i+1]<p[i]) down++;
    }
    return {up,down};
  }

  /* ================== ENGINE ================== */
  function canTrade(){
    if(trades>=CFG.maxTrades) return false;
    const diff=Date.now()-lastTrade;
    elCD.textContent = diff>=CFG.cooldownMs ? "OK" : "WAIT";
    return diff>=CFG.cooldownMs;
  }

  function evaluate(){
    const prices=getPrices();
    const rsi=calcRSI(prices, CFG.rsiPeriod);
    const c=candleCount(prices);

    elRSI.textContent = rsi? rsi.toFixed(1):"--";
    elCandles.textContent = `UP ${c.up} / DOWN ${c.down}`;

    currentSignal=null;

    if(c.up>=3 && rsi>=CFG.callZone[0] && rsi<=CFG.callZone[1]){
      currentSignal="CALL";
      elSignal.textContent="Signal: CALL";
      elReason.textContent="3 UP candles + RSI tight";
    } else if(c.down>=3 && rsi>=CFG.putZone[0] && rsi<=CFG.putZone[1]){
      currentSignal="PUT";
      elSignal.textContent="Signal: PUT";
      elReason.textContent="3 DOWN candles + RSI tight";
    } else {
      elSignal.textContent="Signal: WAIT";
      elReason.textContent="Conditions not aligned";
    }

    if(autoOn && currentSignal && canTrade()){
      doTrade(currentSignal);
    }
  }

  function doTrade(dir){
    const btn=document.querySelector("."+dir.toLowerCase()+"-btn");
    if(!btn) return;
    btn.click();
    trades++; lastTrade=Date.now();
    elTrades.textContent=trades;
    console.log("AUTO:",dir);
  }

  /* ================== CONTROLS ================== */
  btnAuto.onclick=()=>{
    autoOn=!autoOn;
    btnAuto.textContent="AutoTrade: "+(autoOn?"ON":"OFF");
    btnAuto.className="btn "+(autoOn?"on":"off");
  };
  panel.querySelector("#manualCall").onclick=()=>doTrade("CALL");
  panel.querySelector("#manualPut").onclick=()=>doTrade("PUT");

  setInterval(evaluate, 3000);
})();
