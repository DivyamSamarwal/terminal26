import { fmtCur, generateIPO, pcg, renderIPOs, renderTopBar, state, stockMap, toast } from './app.js';

// investments.js - Handlers for IPOs and Mutual Funds

// Default Mutual Funds
var mutualFunds = [
    // India
    { id: "mf_nifty", name: "Nifty 50 Index", baseNav: 100, risk: "Medium", trackingTicker: "NIFTY 50" },
    { id: "mf_sensex", name: "BSE Sensex Index", baseNav: 150, risk: "Medium", trackingTicker: "SENSEX" },
    { id: "mf_banknifty", name: "Bank Nifty Fund", baseNav: 120, risk: "High", trackingTicker: "BANKNIFTY" },
    { id: "mf_smallcap", name: "Small Cap Discovery", baseNav: 80, risk: "High", trackingTicker: "ZOMATO" },
    
    // US Markets
    { id: "mf_sp500", name: "S&P 500 Index (US)", baseNav: 250, risk: "Medium", trackingTicker: "SPX500" },
    { id: "mf_nasdaq", name: "NASDAQ 100 (US Tech)", baseNav: 300, risk: "High", trackingTicker: "NDX100" },
    { id: "mf_dow", name: "Dow Jones (US)", baseNav: 220, risk: "Medium", trackingTicker: "DJIA" },
    
    // Global Markets
    { id: "mf_ftse", name: "FTSE 100 (UK)", baseNav: 130, risk: "Medium", trackingTicker: "FTSE100" },
    { id: "mf_nikkei", name: "Nikkei 225 (Japan)", baseNav: 140, risk: "High", trackingTicker: "NIKKEI225" },
    { id: "mf_dax", name: "DAX 40 (Germany)", baseNav: 160, risk: "Medium", trackingTicker: "DAX" },
    { id: "mf_shanghai", name: "Shanghai Composite (China)", baseNav: 110, risk: "High", trackingTicker: "SHCOMP" },
    
    // Thematic & Sectoral
    { id: "mf_tech", name: "Global Tech Sector", baseNav: 150, risk: "High", trackingTicker: "TCS" },
    { id: "mf_pharma", name: "Healthcare & Pharma", baseNav: 120, risk: "Medium", trackingTicker: "SUNPHARMA" },
    { id: "mf_bank", name: "Banking & Financials", baseNav: 200, risk: "High", trackingTicker: "HDFCBANK" },
    { id: "mf_esg", name: "Green Energy & ESG", baseNav: 90, risk: "Medium", trackingTicker: "LONGI" },
    { id: "mf_ev", name: "EV & Batteries", baseNav: 85, risk: "High", trackingTicker: "TSLA" },
    { id: "mf_ai", name: "Artificial Intelligence", baseNav: 110, risk: "High", trackingTicker: "NVDA" },
    
    // Commodities & Safe Havens
    { id: "mf_div", name: "High Dividend Yield", baseNav: 60, risk: "Low", trackingTicker: "ITC" },
    { id: "mf_gold", name: "Digital Gold ETF", baseNav: 75, risk: "Low", trackingTicker: "GOLD" },
    { id: "mf_silver", name: "Silver ETF", baseNav: 45, risk: "Medium", trackingTicker: "SILVER" },
    { id: "mf_agri", name: "Global Agriculture ETF", baseNav: 40, risk: "Medium", trackingTicker: "WHEAT" },
    { id: "mf_uranium", name: "Uranium & Nuclear Energy", baseNav: 90, risk: "High", trackingTicker: "URANIUM" },
    { id: "mf_liquid", name: "Safe Liquid Fund", baseNav: 50, risk: "Low" },
    { id: "mf_bonds", name: "Government Bonds", baseNav: 55, risk: "Low", trackingTicker: "US10Y" },
    
    // Crypto
    { id: "mf_crypto_blue", name: "Crypto Bluechip Fund", baseNav: 650, risk: "High", trackingTicker: "BTC" },
    { id: "mf_crypto_alt", name: "Web3 & Altcoin Discovery", baseNav: 150, risk: "High", trackingTicker: "ETH" },
    
    // Indian Sectors
    { id: "mf_fmcg", name: "India Consumption Fund", baseNav: 230, risk: "Medium", trackingTicker: "HINDUNILVR" },
    { id: "mf_auto", name: "Auto & Mobility Fund", baseNav: 115, risk: "High", trackingTicker: "TATAMOTORS" },
    { id: "mf_defense", name: "Defense & Aerospace Fund", baseNav: 25, risk: "High", trackingTicker: "BEL" },
    { id: "mf_infra", name: "Infra & Real Estate", baseNav: 320, risk: "High", trackingTicker: "LT" },
    
    // Global Niche
    { id: "mf_luxury", name: "Global Luxury Fund", baseNav: 78, risk: "Medium", trackingTicker: "LVMH" }
];

function getFundById(id) {
    return mutualFunds.find(function(f) { return f.id === id; });
}

// Calculate current NAV based on market health
function calcCurrentNAV(fund) {
    if (!state.mfHistory) state.mfHistory = {};
    if (!state.mfHistory[fund.id] || state.mfHistory[fund.id].length === 0) {
        state.mfHistory[fund.id] = [fund.baseNav];
    }
    var hist = state.mfHistory[fund.id];
    return hist[hist.length - 1];
}

function updateMfQuote() {
    var select = document.getElementById("mf-select");
    var fundId = select.value;
    if (!fundId) {
        document.getElementById("mf-nav").innerText = "₹ 0.00";
        document.getElementById("mf-risk").innerText = "-";
        return;
    }
    
    var fund = getFundById(fundId);
    var nav = calcCurrentNAV(fund);
    
    document.getElementById("mf-nav").innerText = "₹ " + nav.toFixed(2);
    document.getElementById("mf-risk").innerText = fund.risk;
    document.getElementById("mf-risk").style.color = (fund.risk === "High") ? "var(--orange)" : (fund.risk === "Medium") ? "var(--text-bright)" : "var(--green)";
    document.getElementById("mf-max-margin").innerText = "Margin: ₹ " + state.margin.toFixed(2);
    
    if (renderMFChart) {
        renderMFChart(fundId);
    }
};

function buyLumpsumMF() {
    var select = document.getElementById("mf-select");
    var fundId = select.value;
    var amtInput = document.getElementById("mf-amount");
    var amount = parseFloat(amtInput.value);
    
    if (!fundId || isNaN(amount) || amount <= 0 || !isFinite(amount)) {
        if (typeof toast === "function") toast("Error", "Please enter a valid amount", "error");
        return;
    }
    if (amount > state.margin) {
        if (typeof toast === "function") toast("Error", "Insufficient margin", "error");
        return;
    }
    
    var fund = getFundById(fundId);
    var nav = calcCurrentNAV(fund);
    var unitsToBuy = amount / nav;
    
    state.margin -= amount;
    if (!state.mfHoldings[fundId]) {
        state.mfHoldings[fundId] = { units: 0, invested: 0 };
    }
    state.mfHoldings[fundId].units += unitsToBuy;
    state.mfHoldings[fundId].invested += amount;
    
    if (typeof toast === "function") toast("Success", "Bought ₹" + amount.toFixed(2) + " of " + fund.name, "success");
    amtInput.value = "";
    updateMfQuote();
    renderMFUI();
};

function sellMF(fundId) {
    var holding = state.mfHoldings[fundId];
    if (!holding || holding.units <= 0) return;
    
    var fund = getFundById(fundId);
    var nav = calcCurrentNAV(fund);
    var proceeds = holding.units * nav;
    var profit = proceeds - holding.invested;
    
    var tax = 0;
    if (profit > 0) {
        tax = profit * 0.15; // 15% STCG
        state.totalTaxesPaid = (state.totalTaxesPaid || 0) + tax;
        
        if (state.inventory && state.inventory.profitBoostDays > 0) {
            var bonus = profit * 0.25;
            state.margin += bonus;
            if (typeof toast === "function") toast("Profit Amplifier", "Bonus " + fmtCur(bonus) + " added to margin", "success");
        }
    }
    
    var finalAmount = proceeds - tax;
    state.margin += finalAmount;
    delete state.mfHoldings[fundId];
    
    if (typeof toast === "function") toast("Sold", "Redeemed " + fund.name + " for ₹" + finalAmount.toFixed(2) + (tax > 0 ? " (Tax: ₹" + tax.toFixed(2) + ")" : ""), "success");
    updateMfQuote();
    renderMFUI();
    if (typeof renderTopBar === 'function') renderTopBar();
};

function startSIP() {
    var select = document.getElementById("mf-select");
    var fundId = select.value;
    var amtInput = document.getElementById("mf-amount");
    var amount = parseFloat(amtInput.value);
    
    if (!fundId || isNaN(amount) || amount <= 0 || !isFinite(amount)) {
        if (typeof toast === "function") toast("Error", "Please enter a valid daily SIP amount", "error");
        return;
    }
    
    state.sips[fundId] = amount;
    var fund = getFundById(fundId);
    if (typeof toast === "function") toast("SIP Started", "₹" + amount + " daily SIP set for " + fund.name, "success");
    amtInput.value = "";
    renderMFUI();
};

function cancelSIP(fundId) {
    delete state.sips[fundId];
    var fund = getFundById(fundId);
    if (typeof toast === "function") toast("SIP Cancelled", "Cancelled SIP for " + fund.name, "info");
    renderMFUI();
};

function renderMFUI() {
    var tbody = document.getElementById("mf-holdings-tbody");
    if (!tbody) return;
    
    // Populate dropdown if empty or preserve selection
    var select = document.getElementById("mf-select");
    if (select) {
        var currentSelection = select.value;
        select.innerHTML = "";
        mutualFunds.forEach(function(f) {
            var opt = document.createElement("option");
            opt.value = f.id;
            opt.innerText = f.name;
            select.appendChild(opt);
        });
        if (currentSelection) {
            select.value = currentSelection;
        }
        updateMfQuote();
    }
    
    var html = "";
    var totalHoldings = 0;
    
    for (var i = 0; i < mutualFunds.length; i++) {
        var f = mutualFunds[i];
        var holding = state.mfHoldings[f.id];
        var sipAmount = state.sips[f.id];
        
        if (holding || sipAmount) {
            totalHoldings++;
            var units = holding ? holding.units : 0;
            var nav = calcCurrentNAV(f);
            var value = units * nav;
            var invested = holding ? holding.invested : 0;
            var pnl = value - invested;
            var pnlColor = pnl >= 0 ? "var(--green)" : "var(--red)";
            var pnlSign = pnl >= 0 ? "+" : "";
            
            html += "<tr>";
            html += "<td>" + f.name + "</td>";
            html += "<td class='mono'>" + units.toFixed(4) + "</td>";
            html += "<td class='mono'>₹ " + value.toFixed(2) + " <span style='color:" + pnlColor + "; font-size:11px;'>(" + pnlSign + pnl.toFixed(2) + ")</span></td>";
            html += "<td class='mono'>" + (sipAmount ? ("₹ " + sipAmount + " / day") : "-") + "</td>";
            
            html += "<td>";
            if (sipAmount) html += "<button class='uiverse-btn btn-buy-cash' style='margin-right:5px; padding:4px 8px; font-size:11px;' onclick='cancelSIP(\"" + f.id + "\")'><div class='button-inner'><span style='color:var(--red)'>Stop SIP</span></div></button>";
            if (units > 0) html += "<button class='uiverse-btn btn-buy-cash' style='padding:4px 8px; font-size:11px;' onclick='sellMF(\"" + f.id + "\")'><div class='button-inner'><span style='color:var(--red)'>Redeem</span></div></button>";
            html += "</td>";
            html += "</tr>";
        }
    }
    
    if (totalHoldings === 0) {
        html = "<tr><td colspan='5' style='text-align:center; padding:20px; color:var(--text-dim);'>You have no active investments.</td></tr>";
    }
    
    tbody.innerHTML = html;
};

// IPO rendering now delegated to app.js unified system
function renderIPOUI() {
    if (renderIPOs) {
        renderIPOs();
    }
};


// Called inside app.js -> startNewDay()
function processDailyInvestments() {
    // 0. Update NAV History for all funds
    if (!state.mfHistory) state.mfHistory = {};
    for (var fidx = 0; fidx < mutualFunds.length; fidx++) {
        var fund = mutualFunds[fidx];
        if (!state.mfHistory[fund.id] || state.mfHistory[fund.id].length === 0) {
            state.mfHistory[fund.id] = [fund.baseNav];
        }
        var hist = state.mfHistory[fund.id];
        var lastNav = hist[hist.length - 1];
        
        var noise;
        if (fund.trackingTicker && stockMap && stockMap[fund.trackingTicker]) {
            var trackingStock = stockMap[fund.trackingTicker];
            var oldPrice = trackingStock.prevClose || trackingStock.history[trackingStock.history.length - 1] || trackingStock.ltp;
            if (oldPrice > 0) {
                noise = (trackingStock.ltp - oldPrice) / oldPrice;
            } else {
                noise = 0;
            }
        } else {
            if (fund.risk === "High") {
                noise = (pcg.random() - 0.45) * 0.05; // Volatile
            } else if (fund.risk === "Medium") {
                noise = (pcg.random() - 0.48) * 0.02; 
            } else {
                noise = (pcg.random() * 0.005); // Liquid is slow, steady up
            }
        }
        var nextNav = Math.max(10, lastNav * (1 + noise));
        hist.push(nextNav);
        
        if (hist.length > 365) {
            hist.shift();
        }
        state.mfHistory[fund.id] = hist;
    }

    // 1. Process SIPs
    var mfKeys = Object.keys(state.sips);
    for (var i = 0; i < mfKeys.length; i++) {
        var fundId = mfKeys[i];
        var amount = state.sips[fundId];
        if (state.margin >= amount) {
            state.margin -= amount;
            fund = getFundById(fundId);
            var nav = calcCurrentNAV(fund);
            var units = amount / nav;
            if (!state.mfHoldings[fundId]) {
                state.mfHoldings[fundId] = { units: 0, invested: 0 };
            }
            state.mfHoldings[fundId].units += units;
            state.mfHoldings[fundId].invested += amount;
            if (typeof toast === "function") toast("SIP Executed", "Bought ₹" + amount + " of " + fund.name, "info");
        } else {
            if (typeof toast === "function") toast("SIP Failed", "Insufficient margin for " + fundId + " SIP", "error");
        }
    }
    
    // IPO processing is now handled exclusively by app.js (processIPOListings)
    // No duplicate IPO logic here.
    
    // Rerender UI if active
    var ipoView = document.getElementById("view-ipo");
    if (ipoView && !ipoView.classList.contains("hidden")) {
        renderIPOUI();
    }
    var mfView = document.getElementById("view-mf");
    if (mfView && !mfView.classList.contains("hidden")) {
        renderMFUI();
    }
};


// Initial binding helper
function bindInvestmentsUI() {
    var lsBtn = document.querySelector("#view-mf .btn-buy:nth-child(1)");
    if (lsBtn) lsBtn.onclick = buyLumpsumMF;
    var sipBtn = document.querySelector("#view-mf .btn-buy:nth-child(2)");
    if (sipBtn) sipBtn.onclick = startSIP;
    
    // Force at least one IPO to exist on initial load for UX
    if (typeof generateIPO === 'function' && (!state.upcomingIPOs || state.upcomingIPOs.length === 0)) {
        generateIPO();
    }
};


// Try to bind on load
setTimeout(bindInvestmentsUI, 1000);

var mfChartInstance = null;
window.mfTimeframe = 'ALL';

function setMFTimeframe(tf) {
    window.mfTimeframe = tf;
    
    // Update button UI
    var btns = document.querySelectorAll('.mf-time-btn');
    btns.forEach(function(b) {
        if (b.innerText === tf) {
            b.classList.add('on');
            b.style.background = 'var(--accent)';
            b.style.borderColor = 'var(--accent)';
            b.style.color = '#fff';
        } else {
            b.classList.remove('on');
            b.style.background = 'var(--bg-2)';
            b.style.borderColor = 'var(--border)';
            b.style.color = 'var(--text)';
        }
    });
    
    // Re-render chart
    var select = document.getElementById("mf-select");
    if (select && select.value) {
        renderMFChart(select.value);
    }
};

function renderMFChart(fundId) {
    var canvas = document.getElementById("mf-chart");
    if (!canvas) return;
    
    if (mfChartInstance) {
        mfChartInstance.destroy();
    }
    
    var fund = getFundById(fundId);
    if (!fund) return;
    
    if (!state.mfHistory) state.mfHistory = {};
    if (!state.mfHistory[fund.id] || state.mfHistory[fund.id].length === 0) {
        state.mfHistory[fund.id] = [fund.baseNav];
    }
    var hist = state.mfHistory[fund.id];
    
    var plotHist = hist.slice();
    var labels = [];
    var startingDay = Math.max(1, state.day - plotHist.length + 1);
    for (var i = 0; i < plotHist.length; i++) {
        labels.push(startingDay + i);
    }

    // Apply timeframe filter
    if (window.mfTimeframe === '1W' && plotHist.length > 7) {
        plotHist = plotHist.slice(-7);
        labels = labels.slice(-7);
    } else if (window.mfTimeframe === '1M' && plotHist.length > 30) {
        plotHist = plotHist.slice(-30);
        labels = labels.slice(-30);
    }
    
    if (plotHist.length === 1) {
        plotHist.push(plotHist[0]); // Duplicate to draw flat line on day 1
        labels.push(labels[0]);
    }
    
    var color = fund.risk === "High" ? "#e74c3c" : (fund.risk === "Medium" ? "#f39c12" : "#2ecc71");
    
    mfChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'NAV History',
                data: plotHist,
                borderColor: color,
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                backgroundColor: color + '20',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return 'NAV: ₹' + context.parsed.y.toFixed(2);
                        },
                        title: function(context) {
                            return 'Day ' + context[0].label;
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            scales: {
                x: { 
                    display: true, 
                    grid: { color: 'rgba(255,255,255,0.02)' },
                    ticks: { color: '#666', font: { size: 10 }, maxTicksLimit: 10 }
                },
                y: { 
                    display: true, 
                    position: 'right', 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#888', font: { size: 10 } }
                }
            },
            animation: false
        }
    });
};


export { renderMFChart, updateMfQuote, setMFTimeframe, buyLumpsumMF, startSIP, cancelSIP, sellMF, renderIPOUI, mutualFunds, renderMFUI, processDailyInvestments, calcCurrentNAV };
