// ==UserScript==
// @name         QUOTEX Predictor Pro (Live Points + OHLC)
// @namespace    qx-pro-decoder
// @version      10.0
// @description  Binary history decoder with live data point counter and OHLC analysis
// @match         https://*.quotex.io/*
// @match         https://*.qxbroker.com/*
// @match         https://*.quotex.net/*
// @match         https://market-qx.trade/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    let lastPrice = 0;
    let priceHistory = [];
    let candles = [];
    let selectedAsset = "EURUSD";
    let currentMinute = -1;
    let totalPointsReceived = 0; // লাইভ ডাটা পয়েন্ট কাউন্টার

    // UI Panel setup
    const createPanel = () => {
        const panel = document.createElement('div');
        panel.id = "qx-decoder-panel";
        Object.assign(panel.style, {
            position: 'fixed', top: '50px', left: '20px', zIndex: '10000',
            background: '#111', color: '#00ff88', padding: '0px',
            borderRadius: '12px', border: '1px solid #333', fontFamily: 'sans-serif',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)', minWidth: '240px'
        });

        panel.innerHTML = `
            <div id="qx-drag" style="background:#222; padding:10px; cursor:move; border-radius:12px 12px 0 0; text-align:center; font-size:10px; color:#888; display: flex; justify-content: space-between; align-items: center;">
                <span>::: QX PREDICTOR :::</span>
                <span id="qx-clock" style="color: #00ff88; font-weight: bold; font-family: monospace;">00:00:00</span>
            </div>
            <div style="padding:15px;">
                <input id="qx-asset-input" type="text" value="${selectedAsset}" style="width:70%; background:#000; border:1px solid #444; color:#fff; padding:5px; border-radius:4px; margin-bottom:10px;">
                <button id="qx-set-asset" style="width:25%; background:#00ff88; border:none; padding:6px; border-radius:4px; font-weight:bold; cursor:pointer; color:#000;">SET</button>

                <div style="font-size:11px; color:#666;">LIVE PRICE</div>
                <div id="qx-live-price" style="font-size:28px; font-weight:bold; margin-bottom:15px;">0.00000</div>

                <div style="border-top:1px solid #222; padding-top:10px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px;">
                        <span>Prediction Strength:</span>
                        <span id="qx-strength-pct">0%</span>
                    </div>
                    <div style="width:100%; height:8px; background:#222; border-radius:4px; margin:8px 0; overflow:hidden;">
                        <div id="qx-strength-bar" style="width:0%; height:100%; background:#00ff88; transition: width 0.5s;"></div>
                    </div>
                    <div style="display:flex; justify-content:space-around; margin-top:10px;">
                        <div style="text-align:center">
                            <div style="font-size:10px; color:#888;">1 MIN</div>
                            <div id="pred-1m" style="font-weight:bold; font-size:14px;">---</div>
                        </div>
                        <div style="text-align:center">
                            <div style="font-size:10px; color:#888;">5 MIN</div>
                            <div id="pred-5m" style="font-weight:bold; font-size:14px;">---</div>
                        </div>
                    </div>
                </div>
                <div id="qx-status" style="font-size:9px; color: #ffcc00; margin-top:15px; border-top: 1px solid #222; padding-top:5px; line-height: 1.4;">
                    <div>Candles: 0 | Live Points: 0</div>
                    <div id="qx-session-info" style="color: #666;">Waiting for data stream...</div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        setInterval(() => {
            const now = new Date();
            document.getElementById('qx-clock').textContent = now.toLocaleTimeString();
        }, 1000);

        document.getElementById('qx-set-asset').onclick = () => {
            selectedAsset = document.getElementById('qx-asset-input').value.toUpperCase();
            priceHistory = [];
            candles = [];
            totalPointsReceived = 0;
            updateStatusDisplay();
        };
        makeDraggable(panel);
    };

    function makeDraggable(el) {
        let mx=0, my=0;
        const start = (e) => {
            const c = e.type === 'touchstart' ? e.touches[0] : e;
            mx = c.clientX; my = c.clientY;
            document.onmousemove = document.ontouchmove = move;
            document.onmouseup = document.ontouchend = end;
        };
        const move = (e) => {
            const c = e.type === 'touchmove' ? e.touches[0] : e;
            el.style.top = (el.offsetTop - (my - c.clientY)) + "px";
            el.style.left = (el.offsetLeft - (mx - c.clientX)) + "px";
            mx = c.clientX; my = c.clientY;
        };
        const end = () => { document.onmousemove = document.ontouchmove = document.onmouseup = document.ontouchend = null; };
        document.getElementById('qx-drag').onmousedown = document.getElementById('qx-drag').ontouchstart = start;
    }

    const updateStatusDisplay = () => {
        const statusEl = document.getElementById('qx-status');
        if (statusEl) {
            statusEl.firstElementChild.textContent = `Candles: ${candles.length} | Live Points: ${totalPointsReceived}`;
        }
    };

    const updateOHLC = (price) => {
        const now = new Date();
        const min = now.getMinutes();
        if (min !== currentMinute) {
            currentMinute = min;
            candles.push({ open: price, high: price, low: price, close: price });
            if (candles.length > 100) candles.shift();
        } else {
            let currentCandle = candles[candles.length - 1];
            if (currentCandle) {
                currentCandle.high = Math.max(currentCandle.high, price);
                currentCandle.low = Math.min(currentCandle.low, price);
                currentCandle.close = price;
            }
        }
        updateStatusDisplay();
    };

    const runAnalysis = () => {
        if (candles.length < 2) return;
        const lastCandle = candles[candles.length - 1];
        const prevCandle = candles[candles.length - 2];

        let bullishSignals = 0;
        let totalWeight = 4.5;

        if (lastCandle.close > lastCandle.open) bullishSignals += 2;
        const upperShadow = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
        const lowerShadow = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
        if (lowerShadow > upperShadow) bullishSignals += 1.5;
        if (lastCandle.close > prevCandle.close) bullishSignals += 1;

        let strength = (bullishSignals / totalWeight) * 100;
        let displayStrength = Math.abs(strength - 50) * 2;

        document.getElementById('qx-strength-pct').textContent = Math.round(displayStrength) + "%";
        const bar = document.getElementById('qx-strength-bar');
        bar.style.width = displayStrength + "%";

        const isUp = strength > 50;
        bar.style.background = isUp ? "#00ff88" : "#ff4444";

        const p1 = document.getElementById('pred-1m');
        const p5 = document.getElementById('pred-5m');
        if (displayStrength > 35) {
            const dir = isUp ? "↑ CALL" : "↓ PUT";
            const color = isUp ? "#00ff88" : "#ff4444";
            p1.textContent = dir; p1.style.color = color;
            p5.textContent = dir; p5.style.color = color;
        } else {
            p1.textContent = "WAIT"; p1.style.color = "#888";
            p5.textContent = "WAIT"; p5.style.color = "#888";
        }
    };

    const decodeData = async (data) => {
        try {
            let text = typeof data === 'string' ? data : new TextDecoder().decode(new Uint8Array(await (data instanceof Blob ? data.arrayBuffer() : data)));

            const liveMatch = text.match(/\[\s*\[\s*"([^"]+)"\s*,\s*[\d.]+\s*,\s*([\d.]+)/);
            if (liveMatch && liveMatch[1].includes(selectedAsset)) {
                const price = parseFloat(liveMatch[2]);
                totalPointsReceived++; // লাইভ পয়েন্ট কাউন্ট বৃদ্ধি

                const elPrice = document.getElementById('qx-live-price');
                if (elPrice) {
                    elPrice.textContent = price.toFixed(5);
                    elPrice.style.color = price >= lastPrice ? "#00ff88" : "#ff4444";
                    lastPrice = price;
                }
                priceHistory.push(price);
                if (priceHistory.length > 500) priceHistory.shift();

                updateOHLC(price);
                runAnalysis();
                document.getElementById('qx-session-info').textContent = "Receiving Live Binary Stream...";
            }

            if (text.includes("history/list")) {
                const cleanJSON = text.substring(text.indexOf('['));
                const hData = JSON.parse(cleanJSON);
                if (Array.isArray(hData)) {
                    hData.forEach(d => {
                        const p = d.close || d.price || (Array.isArray(d) ? d[2] : null);
                        if (p && typeof p === 'number') {
                            priceHistory.push(p);
                            updateOHLC(p);
                        }
                    });
                    runAnalysis();
                    document.getElementById('qx-session-info').textContent = "History Synchronized.";
                }
            }
        } catch (e) {}
    };

    const OriginalWS = window.WebSocket;
    window.WebSocket = function (u, p) {
        const ws = new OriginalWS(u, p);
        ws.addEventListener('message', (e) => decodeData(e.data));
        return ws;
    };
    window.WebSocket.prototype = OriginalWS.prototype;
    window.onload = createPanel;
})();
