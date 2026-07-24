import { calcBollingerBands, calcEMA, calcMACD, calcRSI, calcSMA, marketStocks, state, stockMap } from './app.js';

// ==================== CUSTOM BOT STUDIO ====================
// Inline modal version - no separate page needed

var customStrategies = {};
var activeCustomBotId = null;
window.cmEditor = null;
var btChartInstance = null;

// ── Helpers ──────────────────────────────────────────────
function escapeHtml(unsafe) {
    return (unsafe || "").toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function fmtNum(n, dec) {
    return (n >= 0 ? "+" : "") + n.toFixed(dec !== undefined ? dec : 2);
}

// ── Modal open / close ────────────────────────────────────
function openCustomStudio() {
    // Load saved strategies from localStorage into state (for bot engine sync)
    loadStrategiesFromStorage();

    var overlay = document.getElementById("custom-studio-overlay");
    var modal   = document.getElementById("custom-studio-modal");
    if (!overlay || !modal) return;

    overlay.style.display = "block";
    modal.style.display   = "flex";

    // Init CodeMirror once (lazy)
    if (!window.cmEditor) {
        var ta = document.getElementById("custom-bot-code");
        if (ta && typeof CodeMirror !== "undefined") {
            window.cmEditor = CodeMirror.fromTextArea(ta, {
                lineNumbers:    true,
                mode:           "javascript",
                theme:          "monokai",
                indentUnit:     4,
                tabSize:        4,
                indentWithTabs: false,
                extraKeys:      { "Ctrl-S": function() { saveCustomBot(); } }
            });
            window.cmEditor.setSize("100%", "100%");
            window.cmEditor.on("change", function() { window.cmEditor.save(); });
        }
    } else {
        // Refresh so it renders correctly after being hidden
        setTimeout(function() { window.cmEditor.refresh(); }, 50);
    }

    renderCustomBotList();
    populateBotStrategyDropdown();  // sync main terminal's strategy select
    switchStudioTab("editor");
};

function closeCustomStudio() {
    document.getElementById("custom-studio-overlay").style.display = "none";
    document.getElementById("custom-studio-modal").style.display   = "none";
};

// ── Tab switching ─────────────────────────────────────────
function switchStudioTab(tab) {
    var editorPanel  = document.getElementById("studio-panel-editor");
    var backtestPanel = document.getElementById("studio-panel-backtest");
    var editorTab    = document.getElementById("studio-tab-editor");
    var backtestTab  = document.getElementById("studio-tab-backtest");

    if (tab === "editor") {
        editorPanel.style.display   = "flex";
        backtestPanel.style.display = "none";
        editorTab.style.background  = "var(--accent)";
        editorTab.style.color       = "#000";
        backtestTab.style.background = "transparent";
        backtestTab.style.color      = "var(--text-dim)";
        if (window.cmEditor) setTimeout(function() { window.cmEditor.refresh(); }, 30);
    } else {
        editorPanel.style.display   = "none";
        backtestPanel.style.display = "flex";
        editorTab.style.background  = "transparent";
        editorTab.style.color       = "var(--text-dim)";
        backtestTab.style.background = "var(--accent)";
        backtestTab.style.color      = "#000";
        populateBacktestSelects();
    }
};

// ── Strategy storage helpers ──────────────────────────────
function loadStrategiesFromStorage() {
    try {
        var saved = localStorage.getItem("customStrategies");
        if (saved) {
            customStrategies = JSON.parse(saved);
            // Also sync to state for bot engine
            if (typeof state !== "undefined") {
                state.customStrategies = customStrategies;
            }
        }
    } catch(e) {
        console.error("Failed to load custom strategies", e);
    }
}

function saveStrategiesToStorage() {
    try {
        localStorage.setItem("customStrategies", JSON.stringify(customStrategies));
        // Sync to state immediately so running bots pick it up
        if (typeof state !== "undefined") {
            state.customStrategies = customStrategies;
        }
        populateBotStrategyDropdown();
    } catch(e) {
        console.error("Failed to save strategies", e);
    }
}

// Populate the main terminal's strategy <select> with custom bots
function populateBotStrategyDropdown() {
    var sel = document.getElementById("bot-strategy");
    if (!sel) return;

    // Remove ALL custom options AND the separator in one clean pass
    // (iterate backwards to avoid index-shift bugs)
    for (var i = sel.options.length - 1; i >= 0; i--) {
        var v = sel.options[i].value;
        if (v.startsWith("CUSTOM_") || sel.options[i].textContent.indexOf("Custom Bots") !== -1) {
            sel.remove(i);
        }
    }

    // Re-add fresh custom entries
    var keys = Object.keys(customStrategies || {});
    if (keys.length > 0) {
        var sep = document.createElement("option");
        sep.disabled = true;
        sep.value = "";
        sep.textContent = "── Custom Bots ──";
        sel.appendChild(sep);

        keys.forEach(function(id) {
            var bot = customStrategies[id];
            var opt = document.createElement("option");
            opt.value = id;
            opt.textContent = "⚡ " + (bot.name || id);
            sel.appendChild(opt);
        });
    }

    updateBotStrategyNote();
};

// Update the description below the strategy dropdown
function updateBotStrategyNote() {
    var sel = document.getElementById("bot-strategy");
    var note = document.querySelector("#bot-form .field-note");
    if (!sel || !note) return;
    var val = sel.value;
    var notes = {
        "CONFLUENCE":       "Confluence: RSI + MACD signal agreement for entry.",
        "MOMENTUM":         "Momentum: Random high-frequency noise trading.",
        "RSI_REVERSION":    "RSI Reversion: Mean-revert when RSI crosses extremes.",
        "TREND_FOLLOWER":   "Trend: SMA crossover for directional momentum.",
        "BOLLINGER_REVERSION": "Bollinger: Buy lower band, sell upper band.",
        "EMA_CROSSOVER":    "EMA: Fast/Slow exponential MA crossover signals.",
        "MACD_MOMENTUM":    "MACD: Pure MACD histogram momentum strategy.",
        "HFT_SCALPER":      "HFT: Tick-level micro-momentum scalping.",
        "HFT_STAT_ARB":     "HFT: Statistical arbitrage via z-score mean reversion.",
        "HFT_VOLATILITY":   "HFT: Micro channel breakout on volatility expansion."
    };
    if (val.startsWith("CUSTOM_")) {
        var bot = customStrategies[val];
        note.textContent = bot ? "Custom: " + (bot.name || "Unnamed Bot") + " — your own strategy." : "Custom Bot";
    } else {
        note.textContent = notes[val] || "";
    }
}

// Hook strategy dropdown change to update note
// Use window.addEventListener("load") as fallback to handle script load order
// (studio.js is loaded after app.js, so DOMContentLoaded may or may not still be pending)
function _studioInit() {
    loadStrategiesFromStorage();
    populateBotStrategyDropdown();

    var sel = document.getElementById("bot-strategy");
    if (sel) sel.addEventListener("change", updateBotStrategyNote);

    // Listen for storage events from other tabs
    window.addEventListener("storage", function(e) {
        if (e.key === "customStrategies") {
            loadStrategiesFromStorage();
            populateBotStrategyDropdown();
        }
    });
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _studioInit);
} else {
    // DOM already loaded (script is deferred or at bottom of body)
    _studioInit();
}

// ── Bot List ──────────────────────────────────────────────
function renderCustomBotList() {
    var list = document.getElementById("custom-bot-list");
    if (!list) return;
    list.innerHTML = "";

    var keys = Object.keys(customStrategies || {});
    if (keys.length === 0) {
        list.innerHTML = "<div style='color:var(--text-dim); font-size:11px; padding:8px; line-height:1.5;'>No bots yet.<br>Click + to create one.</div>";
        return;
    }

    keys.forEach(function(id) {
        var bot = customStrategies[id];
        var item = document.createElement("div");
        item.style.cssText = "padding:7px 10px; border-radius:6px; cursor:pointer; font-size:12px; margin-bottom:3px; transition:background 0.15s; border:1px solid " + (id === activeCustomBotId ? "var(--accent)" : "transparent") + "; background:" + (id === activeCustomBotId ? "rgba(var(--accent-rgb,255,200,0),0.12)" : "transparent") + ";";
        item.textContent = bot.name || id;
        item.onmouseenter = function() { if (id !== activeCustomBotId) item.style.background = "var(--glass-bg)"; };
        item.onmouseleave = function() { if (id !== activeCustomBotId) item.style.background = "transparent"; };
        item.onclick = function() { loadCustomBot(id); };
        list.appendChild(item);
    });
};

function createNewCustomBot() {
    activeCustomBotId = null;
    document.getElementById("custom-bot-name").value = "";
    document.getElementById("custom-bot-template").value = "";
    if (window.cmEditor) window.cmEditor.setValue("");
    else document.getElementById("custom-bot-code").value = "";
    var delBtn = document.getElementById("custom-bot-delete-btn");
    if (delBtn) delBtn.style.display = "none";
    var consoleEl = document.getElementById("custom-bot-console");
    if (consoleEl) consoleEl.innerHTML = "> New bot buffer ready.\n> Write your strategy and click Save.";
    renderCustomBotList();
};

function loadCustomBot(id) {
    activeCustomBotId = id;
    var bot = customStrategies[id];
    if (!bot) return;
    document.getElementById("custom-bot-name").value = bot.name || "";
    var code = bot.code || "";
    if (window.cmEditor) window.cmEditor.setValue(code);
    else document.getElementById("custom-bot-code").value = code;
    var delBtn = document.getElementById("custom-bot-delete-btn");
    if (delBtn) delBtn.style.display = "block";
    var consoleEl = document.getElementById("custom-bot-console");
    if (consoleEl) consoleEl.innerHTML = "> Loaded: <span style='color:var(--accent);'>" + escapeHtml(bot.name) + "</span>\n> Press Ctrl+S to save quickly.";
    renderCustomBotList();
};

function saveCustomBot() {
    if (window.cmEditor) window.cmEditor.save();
    var name = (document.getElementById("custom-bot-name").value || "").trim() || "Untitled Bot";
    var code = document.getElementById("custom-bot-code").value || "";

    if (!activeCustomBotId) {
        activeCustomBotId = "CUSTOM_" + Date.now();
    }

    customStrategies[activeCustomBotId] = { name: name, code: code };
    saveStrategiesToStorage();

    var delBtn = document.getElementById("custom-bot-delete-btn");
    if (delBtn) delBtn.style.display = "block";

    var consoleEl = document.getElementById("custom-bot-console");
    if (consoleEl) consoleEl.innerHTML = "> <span style='color:var(--green);'>✅ Saved: " + escapeHtml(name) + "</span>\n> Bot is now available in the Algo Bot strategy dropdown.";

    renderCustomBotList();
};

function deleteCustomBot() {
    if (!activeCustomBotId) return;
    if (!confirm("Delete this bot? This cannot be undone.")) return;
    delete customStrategies[activeCustomBotId];
    saveStrategiesToStorage();
    createNewCustomBot();
};

// ── Syntax Test ───────────────────────────────────────────
function testCustomBotSyntax() {
    if (window.cmEditor) window.cmEditor.save();
    var code = document.getElementById("custom-bot-code").value || "";
    var consoleEl = document.getElementById("custom-bot-console");
    if (!consoleEl) return;
    consoleEl.innerHTML = "> <span style='color:var(--text-dim);'>Testing syntax...</span>\n";

    try {
        var fn = new Function("context", "window", "document", "localStorage", "sessionStorage", "fetch", "XMLHttpRequest", "eval", code);
        var logs = [];
        var mockContext = {
            stock:   { ticker: "TEST", ltp: 100, vol: 0.02, market: "NSE" },
            history: [95, 96, 97, 98, 99, 100, 101, 100, 99, 100, 101, 102, 101, 100, 99, 98, 99, 100, 101, 102, 103, 102, 101, 100, 99, 100, 101, 102, 103, 104],
            bot:     { state: "FLAT", qty: 0 },
            memory:  {},
            global:  {},
            utils: {
                ema: typeof calcEMA !== "undefined" ? calcEMA : function(arr, p){ return arr.slice(); },
                sma: typeof calcSMA !== "undefined" ? calcSMA : function(arr, p){ return arr.slice(); },
                macd: typeof calcMACD !== "undefined" ? calcMACD : function(arr){ return { macdLine: [0], signalLine: [0], histogram: [0] }; },
                rsi: typeof calcRSI !== "undefined" ? calcRSI : function(arr){ return [50, 50]; },
                bollingerBands: typeof calcBollingerBands !== "undefined" ? calcBollingerBands : function(arr){ return { upper: [105], middle: [100], lower: [95] }; }
            },
            log: function(msg) {
                logs.push(msg);
                consoleEl.innerHTML += "> <span style='color:#74b9ff;'>[LOG] " + escapeHtml(String(msg)) + "</span>\n";
                consoleEl.scrollTop = consoleEl.scrollHeight;
            },
            plot: function() {},
            drawMarker: function() {}
        };
        var result = fn(mockContext);
        consoleEl.innerHTML += "> <span style='color:var(--green);'>✅ Syntax OK! Returned: " + escapeHtml(JSON.stringify(result)) + "</span>\n";
        if (logs.length === 0) consoleEl.innerHTML += "> <span style='color:var(--text-dim);'>Tip: use context.log() to debug values.</span>\n";
    } catch(e) {
        consoleEl.innerHTML += "> <span style='color:var(--red);'>❌ Error: " + escapeHtml(e.message) + "</span>\n";
    }
    consoleEl.scrollTop = consoleEl.scrollHeight;
};

// ── Templates ─────────────────────────────────────────────
function loadCustomBotTemplate() {
    var sel = document.getElementById("custom-bot-template");
    if (!sel || !sel.value) return;
    var template = sel.value;

    var codeEl = document.getElementById("custom-bot-code");
    var existingCode = window.cmEditor ? window.cmEditor.getValue().trim() : (codeEl ? codeEl.value.trim() : "");
    if (existingCode && !confirm("This will overwrite your current code. Continue?")) {
        sel.value = "";
        return;
    }

    var templates = {
        EMA_CROSS:
            "// EMA Fast/Slow Crossover Strategy\n" +
            "var fast = context.utils.ema(context.history, 9);\n" +
            "var slow = context.utils.ema(context.history, 21);\n" +
            "var f = fast[fast.length - 1];\n" +
            "var s = slow[slow.length - 1];\n" +
            "var prevF = fast[fast.length - 2];\n" +
            "var prevS = slow[slow.length - 2];\n\n" +
            "context.log('Fast EMA: ' + f.toFixed(2) + ' | Slow EMA: ' + s.toFixed(2));\n\n" +
            "// Detect crossover (not just current state)\n" +
            "if (prevF <= prevS && f > s) return 'LONG';   // bullish cross\n" +
            "if (prevF >= prevS && f < s) return 'SHORT';  // bearish cross\n" +
            "return null;",

        RSI_SCALP:
            "// RSI Oversold/Overbought Mean Reversion\n" +
            "var rsi = context.utils.rsi(context.history, 14);\n" +
            "var r = rsi[rsi.length - 1];\n" +
            "context.log('RSI: ' + r.toFixed(1));\n\n" +
            "if (r !== null && r < 30) return 'LONG';   // oversold\n" +
            "if (r !== null && r > 70) return 'SHORT';  // overbought\n" +
            "return null;",

        MACD_CUSTOM:
            "// MACD Histogram Momentum\n" +
            "var macd = context.utils.macd(context.history, 12, 26, 9);\n" +
            "var hist = macd.histogram;\n" +
            "var h = hist[hist.length - 1];\n" +
            "var ph = hist[hist.length - 2];\n\n" +
            "context.log('MACD Hist: ' + (h ? h.toFixed(3) : 'null'));\n\n" +
            "if (h !== null && ph !== null) {\n" +
            "    if (ph < 0 && h > 0) return 'LONG';   // histogram crosses above 0\n" +
            "    if (ph > 0 && h < 0) return 'SHORT';  // histogram crosses below 0\n" +
            "}\n" +
            "return null;",

        BB_SQUEEZE:
            "// Bollinger Band Squeeze + Breakout\n" +
            "var bb = context.utils.bollingerBands(context.history, 20, 2);\n" +
            "var upper = bb.upper[bb.upper.length - 1];\n" +
            "var lower = bb.lower[bb.lower.length - 1];\n" +
            "var mid   = bb.middle[bb.middle.length - 1];\n" +
            "var price = context.stock.ltp;\n\n" +
            "// Band width as % of middle - low = squeeze\n" +
            "var bw = (upper - lower) / mid;\n" +
            "context.log('Band Width: ' + (bw * 100).toFixed(2) + '% | Price: ' + price.toFixed(2));\n\n" +
            "if (bw < 0.04 && price > upper) return 'LONG';   // breakout from squeeze\n" +
            "if (bw < 0.04 && price < lower) return 'SHORT';  // breakdown from squeeze\n" +
            "return null;",

        DRAWING_DEMO:
            "// EMA Plot + Marker Demo\n" +
            "var ema = context.utils.ema(context.history, 10);\n" +
            "var e = ema[ema.length - 1];\n" +
            "context.plot(e, 'blue');  // draws a line on the chart\n\n" +
            "if (context.stock.ltp > e * 1.005) {\n" +
            "    context.drawMarker('LONG', context.stock.ltp);\n" +
            "    return 'LONG';\n" +
            "}\n" +
            "if (context.stock.ltp < e * 0.995) {\n" +
            "    context.drawMarker('SHORT', context.stock.ltp);\n" +
            "    return 'SHORT';\n" +
            "}\n" +
            "return null;",

        ARB_HEDGE:
            "// Cross-asset hedging via shared global memory\n" +
            "var myTicker = context.stock.ticker;\n" +
            "context.global[myTicker + '_ltp'] = context.stock.ltp;\n\n" +
            "// Example: follow NIFTY 50 direction\n" +
            "var nifty = context.global['NIFTY 50_ltp'];\n" +
            "if (!nifty) return null;\n\n" +
            "var niftyBase = context.memory.niftyBase || nifty;\n" +
            "context.memory.niftyBase = niftyBase;\n\n" +
            "var niftyChange = (nifty - niftyBase) / niftyBase;\n" +
            "context.log('NIFTY change: ' + (niftyChange * 100).toFixed(2) + '%');\n\n" +
            "if (niftyChange > 0.005) return 'LONG';\n" +
            "if (niftyChange < -0.005) return 'SHORT';\n" +
            "return null;"
    };

    var code = templates[template] || "";
    if (window.cmEditor) window.cmEditor.setValue(code);
    else if (codeEl) codeEl.value = code;
    sel.value = "";
};

// ── Backtest Engine ───────────────────────────────────────
function populateBacktestSelects() {
    // Bot select
    var botSel = document.getElementById("bt-bot-select");
    if (botSel) {
        botSel.innerHTML = "";
        var keys = Object.keys(customStrategies || {});
        if (keys.length === 0) {
            botSel.innerHTML = "<option value=''>No custom bots saved</option>";
        } else {
            keys.forEach(function(id) {
                var opt = document.createElement("option");
                opt.value = id;
                opt.textContent = customStrategies[id].name || id;
                botSel.appendChild(opt);
            });
        }
        // Also add built-in strategies
        var builtins = [
            ["CONFLUENCE",        "Confluence (RSI+MACD)"],
            ["MOMENTUM",          "Momentum (Noise Trading)"],
            ["RSI_REVERSION",     "RSI Mean Reversion"],
            ["TREND_FOLLOWER",    "Trend Follower (SMA Cross)"],
            ["BOLLINGER_REVERSION","Bollinger Reversion"],
            ["EMA_CROSSOVER",     "EMA Fast/Slow Crossover"],
            ["MACD_MOMENTUM",     "Pure MACD Momentum"],
            ["HFT_SCALPER",       "HFT: Scalper"],
            ["HFT_STAT_ARB",      "HFT: Stat Arb"],
            ["HFT_VOLATILITY",    "HFT: Volatility Breakout"]
        ];
        var sep = document.createElement("option");
        sep.disabled = true;
        sep.textContent = "── Built-in Strategies ──";
        botSel.appendChild(sep);
        builtins.forEach(function(b) {
            var opt = document.createElement("option");
            opt.value = b[0];
            opt.textContent = b[1];
            botSel.appendChild(opt);
        });
    }

    // Stock select
    var stockSel = document.getElementById("bt-stock-select");
    if (stockSel && typeof marketStocks !== "undefined") {
        stockSel.innerHTML = "";
        marketStocks.forEach(function(s) {
            var opt = document.createElement("option");
            opt.value = s.ticker;
            opt.textContent = s.ticker + " – " + s.name;
            stockSel.appendChild(opt);
        });
        // Default to active stock if available
        if (typeof state !== "undefined" && state.activeStock) {
            stockSel.value = state.activeStock.ticker;
        }
    }
}

function runBacktest() {
    var botId     = document.getElementById("bt-bot-select").value;
    var stockTick = document.getElementById("bt-stock-select").value;
    var slVal     = parseFloat(document.getElementById("bt-sl").value);
    var tpVal     = parseFloat(document.getElementById("bt-tp").value);
    var capVal    = parseFloat(document.getElementById("bt-capital").value);
    
    var slPct     = Math.max(0.1, Math.min(100, isNaN(slVal) ? 2 : slVal));
    var tpPct     = Math.max(0.1, Math.min(500, isNaN(tpVal) ? 4 : tpVal));
    var capital   = Math.max(1000, Math.min(100000000, isNaN(capVal) ? 100000 : capVal));

    if (!botId || !stockTick) {
        alert("Please select a bot and a stock.");
        return;
    }

    var stock = typeof stockMap !== "undefined" ? stockMap[stockTick] : null;
    if (!stock || !stock.preHistory || stock.preHistory.length < 60) {
        alert("Not enough historical data for this stock. Try a different stock.");
        return;
    }

    var prices = stock.preHistory.concat(stock.history || []);

    // Compile the strategy function
    var stratFn = null;
    var isCustom = botId.startsWith("CUSTOM_");

    if (isCustom) {
        var botDef = customStrategies[botId];
        if (!botDef) { alert("Bot not found."); return; }
        try {
            stratFn = new Function("context", "window", "document", "localStorage", "sessionStorage", "fetch", "XMLHttpRequest", "eval", botDef.code);
        } catch(e) {
            alert("Syntax error in bot: " + e.message);
            return;
        }
    }

    // ── Simulation loop ──
    var trades = [];
    var equity = [capital];
    var cash = capital;
    var posState = "FLAT"; // FLAT, LONG, SHORT
    var entryPrice = 0;
    var slPrice = 0;
    var tpPrice = 0;
    var tradeQty = 0;
    var memory = {};
    var globalMem = {};
    var WARMUP = 40;

    for (var i = WARMUP; i < prices.length; i++) {
        var slice = prices.slice(0, i + 1);
        var ltp   = prices[i];

        // Check SL/TP for open positions
        if (posState !== "FLAT") {
            var hitSL = false, hitTP = false;
            if (posState === "LONG")  { hitSL = ltp <= slPrice; hitTP = ltp >= tpPrice; }
            if (posState === "SHORT") { hitSL = ltp >= slPrice; hitTP = ltp <= tpPrice; }

        if (hitSL || hitTP) {
                var reason = hitSL ? "SL Hit" : "TP Hit";

                var pnl = posState === "LONG"
                    ? (ltp - entryPrice) * tradeQty
                    : (entryPrice - ltp)  * tradeQty;

                trades.push({
                    idx: i,
                    signal: posState,
                    entry: entryPrice,
                    exit: ltp,
                    reason: reason,
                    pnl: pnl,
                    pnlPct: (pnl / (entryPrice * tradeQty)) * 100
                });
                equity.push(equity[equity.length - 1] + pnl);
                posState = "FLAT";
                entryPrice = 0;
                slPrice = 0;
                tpPrice = 0;
                continue;
            }
            equity.push(equity[equity.length - 1]);
            continue;
        }

        // Generate signal (only when FLAT)
        var signal = null;
        try {
            if (isCustom) {
                var ctx = {
                    stock: Object.assign({}, stock, { ltp: ltp }),
                    history: slice,
                    bot: { state: posState },
                    memory: memory,
                    global: globalMem,
                    utils: {
                        ema: typeof calcEMA !== "undefined" ? calcEMA : function(a,p){return a;},
                        sma: typeof calcSMA !== "undefined" ? calcSMA : function(a,p){return a;},
                        macd: typeof calcMACD !== "undefined" ? calcMACD : function(a){return {macdLine:[0],signalLine:[0],histogram:[0]};},
                        rsi: typeof calcRSI !== "undefined" ? calcRSI : function(a){return [50];},
                        bollingerBands: typeof calcBollingerBands !== "undefined" ? calcBollingerBands : function(a){return {upper:[ltp*1.02],middle:[ltp],lower:[ltp*0.98]};}
                    },
                    log: function() {},
                    plot: function() {},
                    drawMarker: function() {}
                };
                var res = stratFn(ctx);
                memory = ctx.memory;
                if (typeof res === "string") signal = res;
                else if (res && res.signal) signal = res.signal;
            } else {
                signal = runBuiltinSignal(botId, slice);
            }
        } catch(e) { /* silent fail on tick */ }

        if (signal === "LONG" || signal === "SHORT") {
            var riskAmt = equity[equity.length - 1] * 0.1; // 10% risk per trade
            tradeQty = Math.max(1, Math.floor(riskAmt / ltp));
            entryPrice = ltp;
            posState = signal;
            slPrice = signal === "LONG" ? ltp * (1 - slPct/100) : ltp * (1 + slPct/100);
            tpPrice = signal === "LONG" ? ltp * (1 + tpPct/100) : ltp * (1 - tpPct/100);
            // Don't push equity here — will be pushed at next tick
        }
        // Push equity value for this tick (FLAT or newly entered — unchanged from previous)
        equity.push(equity[equity.length - 1]);
    }

    // Force-close any open position at last price
    if (posState !== "FLAT") {
        var lastPrice = prices[prices.length - 1];
        var lastPnl = posState === "LONG"
            ? (lastPrice - entryPrice) * tradeQty
            : (entryPrice - lastPrice) * tradeQty;
        trades.push({
            idx: prices.length - 1,
            signal: posState,
            entry: entryPrice,
            exit: lastPrice,
            reason: "End",
            pnl: lastPnl,
            pnlPct: (lastPnl / (entryPrice * tradeQty)) * 100
        });
        equity.push(equity[equity.length - 1] + lastPnl);
    }

    renderBacktestResults(trades, equity, capital, prices, slPct, tpPct);
};

// Built-in strategy signal generators (simplified for backtest)
function runBuiltinSignal(strategy, prices) {
    if (prices.length < 30) return null;
    try {
        if (strategy === "EMA_CROSSOVER" || strategy === "CONFLUENCE") {
            var fast = calcEMA(prices, 9);
            var slow = calcEMA(prices, 21);
            var f = fast[fast.length-1], s = slow[slow.length-1];
            var pf = fast[fast.length-2], ps = slow[slow.length-2];
            if (pf <= ps && f > s) return "LONG";
            if (pf >= ps && f < s) return "SHORT";
        } else if (strategy === "RSI_REVERSION") {
            var rsi = calcRSI(prices, 14);
            var r = rsi[rsi.length-1];
            if (r !== null && r < 30) return "LONG";
            if (r !== null && r > 70) return "SHORT";
        } else if (strategy === "TREND_FOLLOWER") {
            var ma9 = calcSMA(prices, 9);
            var ma21 = calcSMA(prices, 21);
            var m9 = ma9[ma9.length-1], m21 = ma21[ma21.length-1];
            var pm9 = ma9[ma9.length-2], pm21 = ma21[ma21.length-2];
            if (pm9 <= pm21 && m9 > m21) return "LONG";
            if (pm9 >= pm21 && m9 < m21) return "SHORT";
        } else if (strategy === "BOLLINGER_REVERSION") {
            var bb = calcBollingerBands(prices, 20, 2);
            var p = prices[prices.length-1];
            if (p < bb.lower[bb.lower.length-1]) return "LONG";
            if (p > bb.upper[bb.upper.length-1]) return "SHORT";
        } else if (strategy === "MACD_MOMENTUM") {
            var macd = calcMACD(prices, 12, 26, 9);
            var h = macd.histogram, hn = h[h.length-1], hp = h[h.length-2];
            if (hn !== null && hp !== null && hp < 0 && hn > 0) return "LONG";
            if (hn !== null && hp !== null && hp > 0 && hn < 0) return "SHORT";
        } else if (strategy === "MOMENTUM") {
            r = ((prices.length * 1103515245 + 12345) & 0x7FFFFFFF) / 0x7FFFFFFF;
            if (r < 0.05) return "LONG";
            if (r > 0.95) return "SHORT";
        } else if (strategy === "HFT_SCALPER") {
            var n = prices.length;
            if (prices[n-1] > prices[n-2] && prices[n-2] > prices[n-3] && prices[n-3] > prices[n-4]) return "LONG";
            if (prices[n-1] < prices[n-2] && prices[n-2] < prices[n-3] && prices[n-3] < prices[n-4]) return "SHORT";
        } else if (strategy === "HFT_STAT_ARB") {
            var period = 20; n = prices.length; var slice = prices.slice(n - period, n), mean = 0;
            for (var j = 0; j < slice.length; j++) mean += slice[j];
            mean /= period;
            var variance = 0;
            for (var k2 = 0; k2 < slice.length; k2++) variance += (slice[k2] - mean) * (slice[k2] - mean);
            var stdDev = Math.sqrt(variance / period);
            var zScore = stdDev > 0 ? (prices[n-1] - mean) / stdDev : 0;
            if (zScore < -2.0) return "LONG";
            if (zScore > 2.0) return "SHORT";
        } else if (strategy === "HFT_VOLATILITY") {
            bb = calcBollingerBands(prices, 10, 1.5);
            p = prices[prices.length - 1];
            if (p > bb.upper[bb.upper.length - 1]) return "LONG";
            if (p < bb.lower[bb.lower.length - 1]) return "SHORT";
        }
    } catch(e) { console.error(e); }
    return null;
}

function renderBacktestResults(trades, equity, capital, prices, slPct, tpPct) {
    var totalPnl    = equity[equity.length - 1] - capital;
    var totalReturn = (totalPnl / capital) * 100;
    var wins        = trades.filter(function(t) { return t.pnl > 0; }).length;
    var losses      = trades.filter(function(t) { return t.pnl <= 0; }).length;
    var winRate     = trades.length > 0 ? (wins / trades.length * 100) : 0;
    var avgWin      = wins > 0 ? trades.filter(function(t){ return t.pnl > 0; }).reduce(function(s,t){ return s+t.pnl; },0) / wins : 0;
    var avgLoss     = losses > 0 ? Math.abs(trades.filter(function(t){ return t.pnl <= 0; }).reduce(function(s,t){ return s+t.pnl; },0) / losses) : 0;
    var profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0;

    // Max drawdown
    var peak = capital, maxDD = 0;
    equity.forEach(function(e) {
        if (e > peak) peak = e;
        var dd = (peak - e) / peak * 100;
        if (dd > maxDD) maxDD = dd;
    });

    // Summary cards
    var isProfit = totalPnl >= 0;
    var summaryEl = document.getElementById("bt-summary");
    summaryEl.innerHTML = [
        btCard("Total P&L", (isProfit ? "+" : "") + "₹" + Math.abs(totalPnl).toFixed(0), isProfit ? "var(--green)" : "var(--red)"),
        btCard("Return", (totalReturn >= 0 ? "+" : "") + totalReturn.toFixed(2) + "%", isProfit ? "var(--green)" : "var(--red)"),
        btCard("Total Trades", trades.length, "var(--text)"),
        btCard("Win Rate", winRate.toFixed(1) + "%", winRate >= 50 ? "var(--green)" : "var(--red)"),
        btCard("Wins / Losses", wins + " / " + losses, "var(--text)"),
        btCard("Avg Win", "₹" + avgWin.toFixed(0), "var(--green)"),
        btCard("Avg Loss", "₹" + avgLoss.toFixed(0), "var(--red)"),
        btCard("Profit Factor", profitFactor.toFixed(2), profitFactor >= 1 ? "var(--green)" : "var(--red)"),
        btCard("Max Drawdown", maxDD.toFixed(2) + "%", "var(--orange)"),
        btCard("SL / TP", slPct + "% / " + tpPct + "%", "var(--text-dim)")
    ].join("");

    // Trade table
    var tbody = document.getElementById("bt-trades-tbody");
    if (trades.length === 0) {
        tbody.innerHTML = "<tr><td colspan='7' style='text-align:center; padding:20px; color:var(--text-dim);'>No trades generated. Try adjusting SL/TP or use a different strategy.</td></tr>";
    } else {
        tbody.innerHTML = trades.map(function(t, idx) {
            var cls = t.pnl >= 0 ? "color:var(--green)" : "color:var(--red)";
            return "<tr style='border-bottom:1px solid var(--border);'>" +
                "<td style='padding:6px 10px;'>" + (idx + 1) + "</td>" +
                "<td style='padding:6px 10px;'><span style='background:" + (t.signal==="LONG"?"rgba(0,200,83,0.15)":"rgba(255,75,75,0.15)") + "; color:" + (t.signal==="LONG"?"var(--green)":"var(--red)") + "; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700;'>" + t.signal + "</span></td>" +
                "<td style='padding:6px 10px; text-align:right; font-family:var(--mono);'>" + t.entry.toFixed(2) + "</td>" +
                "<td style='padding:6px 10px; text-align:right; font-family:var(--mono);'>" + t.exit.toFixed(2) + "</td>" +
                "<td style='padding:6px 10px; text-align:right;'><span style='font-size:11px; padding:2px 7px; border-radius:4px; background:var(--glass-bg);'>" + t.reason + "</span></td>" +
                "<td style='padding:6px 10px; text-align:right; font-family:var(--mono); " + cls + ";'>" + (t.pnl >= 0 ? "+" : "") + "₹" + Math.abs(t.pnl).toFixed(0) + "</td>" +
                "<td style='padding:6px 10px; text-align:right; font-family:var(--mono); " + cls + ";'>" + (t.pnlPct >= 0 ? "+" : "") + t.pnlPct.toFixed(2) + "%</td>" +
                "</tr>";
        }).join("");
    }

    // Equity curve chart
    renderEquityCurve(equity, capital);
}

function btCard(label, value, color) {
    return "<div style='display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--bg-0); border-radius:8px; border:1px solid var(--border);'>" +
        "<span style='font-size:11px; color:var(--text-dim);'>" + label + "</span>" +
        "<span style='font-size:13px; font-weight:700; color:" + color + "; font-family:var(--mono);'>" + value + "</span>" +
        "</div>";
}

function renderEquityCurve(equity, capital) {
    var canvas = document.getElementById("bt-chart");
    if (!canvas) return;

    // Downsample to max 500 points for performance
    var data = equity;
    if (equity.length > 500) {
        var step = Math.ceil(equity.length / 500);
        data = equity.filter(function(_, i) { return i % step === 0; });
        data.push(equity[equity.length - 1]);
    }

    if (btChartInstance) btChartInstance.destroy();

    var isProfit = data[data.length - 1] >= capital;
    var color = isProfit ? "#00e676" : "#ff4b4b";

    var isLight = (typeof state !== "undefined") && (state.theme === "light" || state.theme === "sepia");
    var gridColor = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.05)";
    
    // Canvas doesn't reliably parse CSS vars directly for text colors in all browsers, 
    // so we compute the actual hex/rgba string from the active theme.
    var textColor = getComputedStyle(document.body).getPropertyValue("--text-dim").trim() || (isLight ? "#666" : "#888");

    btChartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels: data.map(function(_, i) { return i; }),
            datasets: [{
                label: "Equity Curve",
                data: data,
                borderColor: color,
                backgroundColor: color + "18",
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.2
            }, {
                label: "Starting Capital",
                data: data.map(function() { return capital; }),
                borderColor: isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.25)",
                borderWidth: 1,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false,
                tension: 0,
                segment: { borderDash: [5, 5] }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { mode: "index", intersect: false }
            },
            scales: {
                x: { display: false },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { size: 11 } }
                }
            },
            animation: { duration: 400 }
        }
    });
}


// Auto-generated ES exports
export { btChartInstance, closeCustomStudio, createNewCustomBot, loadCustomBot, populateBotStrategyDropdown, renderCustomBotList, saveCustomBot, switchStudioTab, openCustomStudio, loadCustomBotTemplate, testCustomBotSyntax, deleteCustomBot, runBacktest };
