// ==UserScript==
// @name         Depth Analytics Panel (Safe viz only)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Market-depth based multi-timeframe signal visualization (no trading actions)
// @match        https://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    if (window.__DEPTH_ANALYTICS_PANEL__) return;
    window.__DEPTH_ANALYTICS_PANEL__ = true;

    /* ============== STYLE ============== */
    const style = document.createElement('style');
    style.textContent = `
      #qx-depth-panel {
        position: fixed;
        top: 120px;
        left: 10px;
        width: 190px;
        background: #141414;
        color: #fff;
        padding: 10px;
        border-radius: 10px;
        font-family: Arial, sans-serif;
        font-size: 11px;
        z-index: 999999;
        box-shadow: 0 0 16px rgba(0,0,0,.7);
        cursor: move;
      }
      #qx-depth-panel .row { margin: 3px 0; }
      #qx-depth-panel .label { opacity: .7; }
      #qx-depth-panel .badge {
        display:inline-block;
        padding:1px 6px;
        border-radius:7px;
        font-size:10px;
        margin-left:4px;
      }
      #qx-depth-panel .sig-row{
        display:flex;
        justify-content:space-between;
        align-items:center;
      }
      #qx-depth-panel .sig-name{
        min-width:32px;
      }
      #qx-depth-panel .sig-val{
        font-weight:bold;
        margin:0 4px;
      }
      #qx-depth-panel .spark{
        font-family: "Consolas", "Courier New", monospace;
        font-size:10px;
        letter-spacing:0;
        white-space:nowrap;
      }
      #qx-depth-panel .bar{
        font-family: "Consolas", "Courier New", monospace;
        font-size:10px;
      }
    `;
    document.head.appendChild(style);

    /* ============== PANEL ============== */
    const panel = document.createElement('div');
    panel.id = 'qx-depth-panel';
    panel.innerHTML = `
      <div style="font-weight:bold;margin-bottom:4px;">
        Depth Analytics
      </div>

      <div class="row">
        <span class="label">Ask/Bid:</span>
        <span id="qx-ask">--</span>% /
        <span id="qx-bid">--</span>%
      </div>

      <div class="row">
        <span class="label">Mini graph:</span>
        <div id="qx-spark" class="spark">──────────</div>
      </div>

      <div class="row">
        <span class="label">Imbalance:</span>
        <span id="qx-imb-val">--</span>
      </div>
      <div class="row">
        <div id="qx-imb-bar" class="bar">----------</div>
      </div>

      <div class="row">
        <span class="label">Volatility:</span>
        <span id="qx-vol">--</span>
        <span id="qx-vol-bar" class="bar"></span>
      </div>

      <div class="row" style="margin-top:4px;border-top:1px solid #333;padding-top:4px;">
        <div class="sig-row">
          <span class="sig-name label">30s</span>
          <span id="qx-s30" class="sig-val">→</span>
          <span id="qx-b30" class="badge">weak</span>
        </div>
        <div class="sig-row">
          <span class="sig-name label">1m</span>
          <span id="qx-s60" class="sig-val">→</span>
          <span id="qx-b60" class="badge">weak</span>
        </div>
        <div class="sig-row">
          <span class="sig-name label">5m</span>
          <span id="qx-s300" class="sig-val">→</span>
          <span id="qx-b300" class="badge">weak</span>
        </div>
      </div>

      <div class="row" style="margin-top:4px;border-top:1px solid #333;padding-top:4px;">
        <span class="label">History:</span>
        <span id="qx-history" class="spark">──────────</span>
      </div>

<div style="margin-top:10px;border-top:1px solid #333;padding-top:8px;">
    <div style="display:flex;gap:8px;justify-content:space-between;">
        <button id="qx-call-btn"
            style="background:#4CAF50;padding:8px 10px;border:none;color:white;font-weight:bold;border-radius:6px;width:48%;cursor:pointer;">
            CALL
        </button>

        <button id="qx-put-btn"
            style="background:#f44336;padding:8px 10px;border:none;color:white;font-weight:bold;border-radius:6px;width:48%;cursor:pointer;">
            PUT
        </button>
    </div>
</div>

<div style="margin-top:8px;">
    <span class="label">Manual:</span>
    <span id="qx-manual-status" style="font-weight:bold;">--</span>
</div>


    `;
    document.body.appendChild(panel);



     /* ============== MOVABLE (Mouse + Touch) ============== */
(function makeMovable(panel){

    if (!panel) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    function startDrag(x, y) {
        const rect = panel.getBoundingClientRect();
        offsetX = x - rect.left;
        offsetY = y - rect.top;
        isDragging = true;
    }

    function doDrag(x, y) {
        if (!isDragging) return;
        panel.style.left = (x - offsetX) + 'px';
        panel.style.top  = (y - offsetY) + 'px';
    }

    function stopDrag() {
        isDragging = false;
    }

    /* ===== MOUSE ===== */
    panel.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        if (e.target.closest('button,select,input,textarea')) return;
        startDrag(e.clientX, e.clientY);
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        doDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', stopDrag);

    /* ===== TOUCH ===== */
    panel.addEventListener('touchstart', function (e) {
        if (e.target.closest('button,select,input,textarea')) return;
        const t = e.touches[0];
        startDrag(t.clientX, t.clientY);
    }, { passive: false });

    document.addEventListener('touchmove', function (e) {
        const t = e.touches[0];
        doDrag(t.clientX, t.clientY);
    }, { passive: false });

    document.addEventListener('touchend', stopDrag);

})(panel);

    /* ============== STATE ============== */
    let depthHistory = []; // {t, ask, bid}
    let signalHistory = []; // last 10 arrows

    const elAsk   = document.getElementById('qx-ask');
    const elBid   = document.getElementById('qx-bid');
    const elSpark = document.getElementById('qx-spark');
    const elImbV  = document.getElementById('qx-imb-val');
    const elImbB  = document.getElementById('qx-imb-bar');
    const elVol   = document.getElementById('qx-vol');
    const elVolB  = document.getElementById('qx-vol-bar');

    const elS30   = document.getElementById('qx-s30');
    const elB30   = document.getElementById('qx-b30');
    const elS60   = document.getElementById('qx-s60');
    const elB60   = document.getElementById('qx-b60');
    const elS300  = document.getElementById('qx-s300');
    const elB300  = document.getElementById('qx-b300');
    const elHist  = document.getElementById('qx-history');

    const CFG = {
        sampleInterval: 2000,
        maxWindowMs: 5 * 60 * 1000
    };

    /* ============== HELPERS ============== */
    function readDepth() {
        const askEl = document.querySelector('.market-depth__ask-value');
        const bidEl = document.querySelector('.market-depth__bid-value');
        if (!askEl || !bidEl) return null;

        const ask = parseFloat((askEl.innerText || '').replace('%',''));
        const bid = parseFloat((bidEl.innerText || '').replace('%',''));
        if (!Number.isFinite(ask) || !Number.isFinite(bid)) return null;

        return { ask, bid };
    }

    function addSample() {
        const d = readDepth();
        if (!d) return;

        const now = Date.now();
        depthHistory.push({ t: now, ask: d.ask, bid: d.bid });

        depthHistory = depthHistory.filter(s => s.t >= now - CFG.maxWindowMs);

        elAsk.textContent = d.ask.toFixed(1);
        elBid.textContent = d.bid.toFixed(1);
    }

    function getWindow(ms) {
        const now = Date.now();
        return depthHistory.filter(s => s.t >= now - ms);
    }

    function analyzeWindow(win) {
        if (!win || win.length < 3) {
            return { trend: 'WAIT', strength: 'weak', imbalance: 0, relImb: 0, vol: 0 };
        }

        const first = win[0];
        const last  = win[win.length-1];

        const askDiff = last.ask - first.ask;
        const bidDiff = last.bid - first.bid;
        const imbalance = last.bid - last.ask;     // +ve = DOWN bias, -ve = UP bias
        const relImb   = imbalance;                // সরাসরি % diff হিসাবেই ব্যবহার করছি

        // volatility (ratio based)
        let sum=0, sum2=0;
        const ratios = win.map(s => {
            const total = s.ask + s.bid || 1;
            return s.ask / total;
        });
        for (const r of ratios){
            sum += r; sum2 += r*r;
        }
        const n = ratios.length;
        const mean = sum / n;
        const variance = Math.max(sum2/n - mean*mean, 0);
        const vol = Math.sqrt(variance) * 100; // percentage

        let trend = 'WAIT';
        let strength = 'weak';

        if (relImb > 20 && bidDiff > 0) {
            trend = 'DOWN';
            strength = relImb > 40 ? 'strong' : 'medium';
        } else if (relImb < -20 && askDiff > 0) {
            trend = 'UP';
            strength = relImb < -40 ? 'strong' : 'medium';
        } else {
            trend = 'WAIT';
            strength = 'weak';
        }

        return { trend, strength, imbalance, relImb, vol };
    }

    function arrowForTrend(trend) {
        if (trend === 'UP') return '↑';
        if (trend === 'DOWN') return '↓';
        return '→';
    }

    function colorForArrow(el, trend) {
        if (trend === 'UP')   el.style.color = '#4CAF50';
        else if (trend === 'DOWN') el.style.color = '#f44336';
        else el.style.color = '#ffeb3b';
    }

    function styleStrengthBadge(badge, strength) {
        badge.textContent = strength;
        if (strength === 'strong') {
            badge.style.background = '#2e7d32';
            badge.style.color = '#fff';
        } else if (strength === 'medium') {
            badge.style.background = '#ff9800';
            badge.style.color = '#000';
        } else {
            badge.style.background = '#444';
            badge.style.color = '#fff';
        }
    }

    function buildSparkline() {
        const win = getWindow(60 * 1000); // গত ১ মিনিট
        if (!win || win.length < 3) {
            elSpark.textContent = '──────────';
            return;
        }
        const ratios = win.map(s => {
            const total = s.ask + s.bid || 1;
            return s.ask / total; // 0..1
        });
        const levels = ['▁','▂','▃','▄','▅','▆','▇','█'];
        const out = [];

        const maxPoints = 10;
        const step = Math.max(1, Math.floor(ratios.length / maxPoints));
        for (let i = 0; i < ratios.length && out.length < maxPoints; i += step) {
            const r = ratios[i];
            const idx = Math.min(levels.length-1, Math.max(0, Math.floor(r * levels.length)));
            out.push(levels[idx]);
        }
        elSpark.textContent = out.join('');
    }

    function buildImbalanceBar(imb) {
        if (!Number.isFinite(imb)) {
            elImbB.textContent = '----------';
            elImbV.textContent = '--';
            return;
        }
        elImbV.textContent = imb.toFixed(1);

        const maxBlocks = 10;
        const scale = Math.min(maxBlocks, Math.floor(Math.abs(imb) / 5));
        const filled = '█'.repeat(scale || 1);
        const empty  = '▁'.repeat(maxBlocks - scale || 0);
        elImbB.textContent = filled + empty;

        if (imb > 0) {          // DOWN bias: red
            elImbB.style.color = '#f44336';
        } else if (imb < 0) {   // UP bias: green
            elImbB.style.color = '#4CAF50';
        } else {
            elImbB.style.color = '#ccc';
        }
    }

    function buildVolatilityBar(vol) {
        if (!Number.isFinite(vol)) {
            elVol.textContent = '--';
            elVolB.textContent = '';
            return;
        }
        elVol.textContent = vol.toFixed(2) + '%';

        const levels = ['▁','▂','▃','▄','▅','▆','▇','█'];
        const idx = Math.min(levels.length-1, Math.floor(Math.min(vol, 8) )); // approx
        elVolB.textContent = levels[idx];
    }

    function pushSignalHistory(trend) {
        const arrow = arrowForTrend(trend);
        signalHistory.push(arrow);
        if (signalHistory.length > 10) signalHistory.shift();
        elHist.textContent = signalHistory.join(' ');
    }

    function updatePanel() {
        const s30  = analyzeWindow(getWindow(30*1000));
        const s60  = analyzeWindow(getWindow(60*1000));
        const s300 = analyzeWindow(getWindow(5*60*1000));

        // 30s
        elS30.textContent = arrowForTrend(s30.trend);
        colorForArrow(elS30, s30.trend);
        styleStrengthBadge(elB30, s30.strength);

        // 1m
        elS60.textContent = arrowForTrend(s60.trend);
        colorForArrow(elS60, s60.trend);
        styleStrengthBadge(elB60, s60.strength);

        // 5m
        elS300.textContent = arrowForTrend(s300.trend);
        colorForArrow(elS300, s300.trend);
        styleStrengthBadge(elB300, s300.strength);

        // imbalance (latest window ভিত্তিতে)
        buildImbalanceBar(s60.imbalance);
        buildSparkline();
        buildVolatilityBar(s60.vol);

        // history তে mid‑TF (1m) trend track করি
        pushSignalHistory(s60.trend);
    }

    /* ============== LOOP ============== */
    setInterval(addSample, CFG.sampleInterval);
    setInterval(updatePanel, 3000);


    // ===== Manual CALL/PUT Button (Safe) =====
const qxBeep = new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg");
qxBeep.volume = 1.0;

document.getElementById("qx-call-btn").onclick = function () {

    // ✅ মূল CALL বাটন ক্লিক ট্রিগার
    document.querySelector(".call-btn")?.click();

    qxBeep.currentTime = 0;
    qxBeep.play().catch(()=>{});

    console.log("Manual CALL triggered → .call-btn clicked (safe)");
};

document.getElementById("qx-put-btn").onclick = function () {

    // ✅ মূল PUT বাটন ক্লিক ট্রিগার
    document.querySelector(".put-btn")?.click();

    qxBeep.currentTime = 0;
    qxBeep.play().catch(()=>{});

    console.log("Manual PUT triggered → .put-btn clicked (safe)");
};



})();
