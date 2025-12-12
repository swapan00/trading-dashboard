javascript:(function () {
  // ---------- STYLE ----------
  const s = document.createElement('style');
  s.innerHTML = `
  @keyframes backgroundShift {
    0% {background: linear-gradient(135deg,#1e3c72,#2a5298);}
    25% {background: linear-gradient(135deg,#1e3c72,#00bcd4);}
    50% {background: linear-gradient(135deg,#1e3c72,#2196f3);}
    75% {background: linear-gradient(135deg,#1e3c72,#00acc1);}
    100% {background: linear-gradient(135deg,#1e3c72,#2a5298);}
  }
  @keyframes colorFade {
    0% {color:#fff;text-shadow:0 0 8px #0ff;}
    50% {color:#0ef;text-shadow:0 0 15px #0ee;}
    100% {color:#0ff;text-shadow:0 0 8px #0ff;}
  }
  .close-btn {
    background:#f44336;border:none;color:white;font-weight:bold;
    padding:2px 8px;border-radius:5px;cursor:pointer;font-size:12px;
    position:absolute;right:8px;top:8px;
  }
  .draggable-panel {
    animation: backgroundShift 10s ease-in-out infinite;
    backdrop-filter: blur(6px);
  }
  .draggable-panel * {
    user-select: none;
    touch-action: none;
  }
  `;
  document.head.appendChild(s);

  // ---------- PANEL UI ----------
  const panel = document.createElement('div');
  panel.className = 'draggable-panel';
  panel.style.cssText = `
    position:fixed;top:100px;left:100px;width:320px;z-index:99999;
    background:rgba(30,60,114,0.3);color:white;font-family:Arial;
    border-radius:10px;box-shadow:0 0 20px rgba(0,0,0,0.5);
    padding:15px;cursor:move;transition:background 2s ease-in-out;
  `;

  panel.innerHTML = `
    <button class="close-btn">X</button>
    <h3 style="margin-top:0;">Qth4x Auto Panel</h3>

    <div>
      <label>Accuracy Mode</label>
      <select id="accuracySelect" 
        style="width:100%;padding:6px;margin-bottom:10px;
        background:#1e3c72;color:white;border-radius:4px;
        border:1px solid #4CAF50;">
        <option value="safe">Safe (কম ট্রেড, ফিল্টার বেশি)</option>
        <option value="normal" selected>Normal</option>
        <option value="aggressive">Aggressive (বেশি ট্রেড, ফিল্টার কম)</option>
      </select>
    </div>

    <div>
      <label>Expiry</label>
      <select id="expirySelect" 
        style="width:100%;padding:6px;margin-bottom:10px;
        background:#1e3c72;color:white;border-radius:4px;
        border:1px solid #4CAF50;">
        <option value="10">10 sec</option>
        <option value="15">15 sec</option>
        <option value="30">30 sec</option>
        <option value="60" selected>1 min</option>
      </select>
    </div>

    <div style="margin-bottom:10px;text-align:center;font-size:13px;">
      Strategy: Simple dummy logic (পরে তুমি বদলাবে)
    </div>

    <div style="margin-bottom:15px;">
      <button id="startBtn"
        style="background:#4CAF50;padding:10px 15px;border:none;
        color:white;font-weight:bold;border-radius:5px;width:48%;">
        AutoTrade ON
      </button>
      <button id="stopBtn"
        style="background:#f44336;padding:10px 15px;border:none;
        color:white;font-weight:bold;border-radius:5px;width:48%;float:right;">
        OFF
      </button>
    </div>

    <div id="statusLine"
      style="font-size:13px;text-align:center;margin-bottom:5px;opacity:0.9;">
      Status: Idle
    </div>

    <div id="countdown" 
      style="font-size:22px;text-align:center;font-weight:bold;
      animation:colorFade 2s infinite alternate;">
      Next Trade in: --
    </div>
  `;
  document.body.appendChild(panel);

  // ---------- CLOSE ----------
  panel.querySelector('.close-btn').onclick = () => {
    try { stopAutoTrade(); } catch(e) {}
    panel.remove();
  };

  // ---------- DRAG ----------
  let isDragging = false, offsetX = 0, offsetY = 0;
  function startDrag(x, y) {
    const r = panel.getBoundingClientRect();
    offsetX = x - r.left;
    offsetY = y - r.top;
    isDragging = true;
  }
  function doDrag(x, y) {
    if (!isDragging) return;
    panel.style.left = `${x - offsetX}px`;
    panel.style.top = `${y - offsetY}px`;
  }
  function stopDrag() {
    isDragging = false;
  }

  panel.addEventListener('mousedown', e => {
    if (e.target.tagName.match(/SELECT|BUTTON/)) return;
    startDrag(e.clientX, e.clientY);
    e.preventDefault();
  });
  document.addEventListener('mousemove', e => doDrag(e.clientX, e.clientY));
  document.addEventListener('mouseup', stopDrag);

  panel.addEventListener('touchstart', e => {
    if (e.target.tagName.match(/SELECT|BUTTON/)) return;
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
  });
  document.addEventListener('touchmove', e => {
    const t = e.touches[0];
    doDrag(t.clientX, t.clientY);
  });
  document.addEventListener('touchend', stopDrag);

  // ---------- AUDIO ----------
  const beep = new Audio(
    "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg"
  );
  beep.volume = 1.0;

  // ---------- STATE ----------
  let currentExpiry = 60;
  let nextTradeTime = null;
  let tradeExecuted = false;
  let countdownInterval = null;

  const statusLine = document.getElementById('statusLine');
  const accuracySelect = document.getElementById('accuracySelect');

  // ---------- TIME HELPERS ----------
  function getNextCandleTime(i) {
    const now = new Date();
    const ms = now.getTime();
    const next = ms - (ms % (i * 1000)) + i * 1000;
    return new Date(next);
  }

  // ---------- DUMMY STRATEGY (AUTO DECISION PLACEHOLDER) ----------
  // এখানে future-এ তুমি তোমার নিজের strategy লাগাবে
  function getAutoDirection() {
    // Accuracy mode নাও
    const mode = accuracySelect.value; // safe | normal | aggressive

    // এখানে আমরা একটা simple deterministic logic দেব:
    // - কেবল সময়ের উপর ভিত্তি করে pseudo-pattern
    // এটা mathematically edge দেয় না, কিন্তু random না, structure আছে,
    // আর তুমি সহজে নিজের logic বসাতে পারো।

    const now = new Date();
    const sec = now.getSeconds();

    if (mode === 'safe') {
      // কম trade: শুধুমাত্র কিছু নির্দিষ্ট সেকেন্ডে trade নেবে
      if (sec % 4 === 0) return 'call';
      if (sec % 4 === 2) return 'put';
      return null; // অন্য সময় trade নেবে না
    }

    if (mode === 'normal') {
      // মধ্যম ফ্রিকোয়েন্সি
      if (sec % 6 < 3) return 'call';
      else return 'put';
    }

    if (mode === 'aggressive') {
      // প্রায় সবসময় trade (দিক alternation)
      return sec % 2 === 0 ? 'call' : 'put';
    }

    return null;
  }

  // ---------- MAIN COUNTDOWN + EXECUTION ----------
  function updateCountdown() {
    if (!nextTradeTime) return;

    const now = new Date();
    const diff = Math.max(0, Math.floor((nextTradeTime - now) / 1000));
    const cd = document.getElementById('countdown');

    if (diff > 0 && !tradeExecuted) {
      cd.textContent = `Next Trade in: ${diff}s`;
    } else if (diff === 0 && !tradeExecuted) {
      // এখানে auto direction নেব
      const dir = getAutoDirection();

      if (!dir) {
        statusLine.textContent = 'Status: No valid signal (skipped)';
        nextTradeTime = getNextCandleTime(currentExpiry);
        cd.textContent = `Next Trade in: ${currentExpiry}s`;
        return;
      }

      const d = dir.toLowerCase(); // "call" বা "put"
      const btn = document.querySelector(`.${d}-btn`);

      if (btn) {
        btn.click();
        beep.currentTime = 0;
        beep.play().catch(() => {});
        cd.textContent = `Executed: ${d.toUpperCase()} • Analyzing...`;
        statusLine.textContent = `Status: Trade ${d.toUpperCase()} sent`;
      } else {
        cd.textContent = `Error: .${d}-btn not found`;
        statusLine.textContent = `Status: Trade button not found`;
      }

      tradeExecuted = true;
      setTimeout(() => {
        nextTradeTime = getNextCandleTime(currentExpiry);
        tradeExecuted = false;
      }, currentExpiry * 1000);
    }
  }

  // ---------- CONTROL ----------
  function startAutoTrade() {
    currentExpiry = parseInt(
      document.getElementById('expirySelect').value,
      10
    );
    nextTradeTime = getNextCandleTime(currentExpiry);
    tradeExecuted = false;

    clearInterval(countdownInterval);
    countdownInterval = setInterval(updateCountdown, 1000);

    statusLine.textContent = 'Status: AutoTrade ON';
  }

  function stopAutoTrade() {
    clearInterval(countdownInterval);
    countdownInterval = null;
    const cd = document.getElementById('countdown');
    cd.textContent = 'Next Trade in: --';
    statusLine.textContent = 'Status: Stopped';
  }

  document.getElementById('startBtn').onclick = startAutoTrade;
  document.getElementById('stopBtn').onclick = stopAutoTrade;
})();
