import { 
    state, toast, fmtCur, stockMap, escapeHTML, pcg, renderAll
} from './app.js';


import { closeTerminalCustomization } from './customization.js';
import { updateOrderMargin } from './app.js';

function renderSyndicateInventory() {
	var invBrokerage = document.getElementById("inv-brokerage-days");
	var invBailout = document.getElementById("inv-bailout-cards");
	var invFreeze = document.getElementById("inv-freeze-minutes");
	var invBoost = document.getElementById("inv-profit-boost");
	var invCircuit = document.getElementById("inv-circuit-override");
	var invTips = document.getElementById("syndicate-insider-tips");
	
	var inv = state.inventory;
	if (invBrokerage) invBrokerage.textContent = inv.brokerageFreeDays + " Days";
	if (invBailout) invBailout.textContent = inv.bailoutCards;
	if (invFreeze) {
		var freezeMins = inv.marketFreezeMinutes || 0;
		if (state.marketFreezeActive) {
			var secsLeft = state.marketFreezeSecondsLeft || 0;
			invFreeze.textContent = "ACTIVE \u2014 " + secsLeft + "s left";
			invFreeze.style.color = "#64d8ff";
		} else {
			invFreeze.textContent = freezeMins + " Min";
			invFreeze.style.color = "";
		}
	}
	// Update freeze button tooltip
	var freezeBtn = document.getElementById("btn-freeze");
	if (freezeBtn) {
		var fm = inv.marketFreezeMinutes || 0;
		if (state.marketFreezeActive) {
			freezeBtn.title = "Market Freeze ACTIVE";
		} else if (fm > 0) {
			freezeBtn.title = "Activate Market Freeze (" + fm + " min available)";
		} else {
			freezeBtn.title = "Market Freeze (no minutes \u2014 earn from Syndicate crates)";
		}
	}
	if (invBoost) invBoost.textContent = (inv.profitBoostDays || 0) + " Days";
	if (invCircuit) invCircuit.textContent = (inv.circuitOverrideDays || 0) + " Days";
	
	if (invTips) {
		invTips.innerHTML = "";
		if (!inv.insiderTips || inv.insiderTips.length === 0) {
			invTips.innerHTML = "<div style='color:#777;font-size:13px;padding:8px 0;'><i class='fa-solid fa-lock' style='margin-right:6px;'></i>No active Insider Tips.</div>";
		} else {
			inv.insiderTips.forEach(function(tip) {
				var dir = tip.gapPct > 0 ? "UP" : "DOWN";
				var col = tip.gapPct > 0 ? "#00e676" : "#ff4b4b";
				var daysStr = tip.daysLeft <= 0 ? "at next open" : ("in " + tip.daysLeft + " day" + (tip.daysLeft > 1 ? "s" : ""));
				var el = document.createElement("div");
				el.style.cssText = "padding:12px 14px;background:rgba(255,145,0,0.07);border:1px solid #ff9100;border-radius:8px;display:flex;align-items:center;gap:10px;";
				el.innerHTML = "<i class='fa-solid fa-user-secret' style='color:#ff9100;font-size:18px;'></i><div><b style='color:var(--text);'>" + escapeHTML(tip.ticker) + "</b><span style='color:#888;font-size:12px;margin:0 6px;'>will gap</span><b style='color:" + col + ";'>" + dir + " " + (Math.abs(tip.gapPct)*100).toFixed(1) + "%</b><span style='color:#888;font-size:12px;margin-left:6px;'>" + escapeHTML(daysStr) + "</span></div>";
				invTips.appendChild(el);
			});
		}
	}
}

function openSyndicateCrate(tier) {
	var cost = 0;
	if (tier === 'bronze') cost = 100000;
	else if (tier === 'silver') cost = 500000;
	else if (tier === 'gold') cost = 1000000;
	
	if (state.margin < cost) {
		toast("Syndicate", "Insufficient Cash Balance to purchase this crate.", "error");
		return;
	}
	
	state.margin -= cost;
	
	var r = pcg.random();
	var rewardType = "";
	var amount = 0;
	var rarity = "common";
	
	// Determine reward based on tier
	if (tier === 'bronze') {
		if (r < 0.35) { rewardType = "cash"; amount = 20000 + pcg.random() * 40000; rarity = "common"; }
		else if (r < 0.60) { rewardType = "cash"; amount = 60000 + pcg.random() * 60000; rarity = "uncommon"; }
		else if (r < 0.72) { rewardType = "freeze"; amount = 30; rarity = "uncommon"; }
		else if (r < 0.84) { rewardType = "brokerage"; amount = 3; rarity = "rare"; }
		else if (r < 0.95) { rewardType = "bailout"; amount = 1; rarity = "rare"; }
		else { rewardType = "brokerage"; amount = 7; rarity = "epic"; }
	} else if (tier === 'silver') {
		if (r < 0.22) { rewardType = "cash"; amount = 150000 + pcg.random() * 150000; rarity = "uncommon"; }
		else if (r < 0.40) { rewardType = "freeze"; amount = 60; rarity = "rare"; }
		else if (r < 0.55) { rewardType = "brokerage"; amount = 7; rarity = "rare"; }
		else if (r < 0.67) { rewardType = "profitboost"; amount = 2; rarity = "epic"; }
		else if (r < 0.77) { rewardType = "bailout"; amount = 1; rarity = "rare"; }
		else if (r < 0.88) { rewardType = "cash"; amount = 400000 + pcg.random() * 200000; rarity = "epic"; }
		else if (r < 0.96) { rewardType = "forgiveness"; rarity = "epic"; }
		else { rewardType = "bailout"; amount = 3; rarity = "legendary"; }
	} else if (tier === 'gold') {
		if (r < 0.15) { rewardType = "cash"; amount = 500000 + pcg.random() * 500000; rarity = "rare"; }
		else if (r < 0.28) { rewardType = "brokerage"; amount = 14; rarity = "epic"; }
		else if (r < 0.40) { rewardType = "freeze"; amount = 120; rarity = "epic"; }
		else if (r < 0.52) { rewardType = "profitboost"; amount = 5; rarity = "epic"; }
		else if (r < 0.63) { rewardType = "circuitoverride"; amount = 3; rarity = "epic"; }
		else if (r < 0.74) { rewardType = "bailout"; amount = 2; rarity = "epic"; }
		else if (r < 0.83) { rewardType = "forgiveness"; rarity = "legendary"; }
		else if (r < 0.93) { rewardType = "cash"; amount = 1500000 + pcg.random() * 1000000; rarity = "legendary"; }
		else { rewardType = "insider"; rarity = "legendary"; }
	}
	
	// Process Reward
	var rewardTitle = "";
	var rewardDesc = "";
	var rewardIcon = "fa-box-open";
	var rewardValue = "";
	
	if (rewardType === "cash") {
		state.margin += amount;
		rewardTitle = "Untraceable Cash";
		rewardDesc = fmtCur(Math.round(amount)) + " has been deposited into your account — no questions asked.";
		rewardIcon = "fa-money-bill-wave";
		rewardValue = "+" + fmtCur(Math.round(amount));
	} else if (rewardType === "brokerage") {
		state.inventory.brokerageFreeDays += amount;
		rewardTitle = "Brokerage Holiday";
		rewardDesc = amount + " days of Zero Brokerage activated. Trade freely without any commission.";
		rewardIcon = "fa-percent";
		rewardValue = amount + " Days Free";
	} else if (rewardType === "bailout") {
		state.inventory.bailoutCards += amount;
		rewardTitle = "Corporate Bailout";
		rewardDesc = amount + "x Bailout Card" + (amount > 1 ? "s" : "") + " secured. The government will cover your next margin call.";
		rewardIcon = "fa-life-ring";
		rewardValue = amount + "x Card" + (amount > 1 ? "s" : "");
	} else if (rewardType === "forgiveness") {
		if (state.loans.length === 0) {
			state.margin += cost; // Refund
			rewardTitle = "Debt Forgiveness";
			rewardDesc = "No active loans found. The Syndicate refunded your crate cost.";
			rewardIcon = "fa-handshake";
			rewardValue = "Refunded: " + fmtCur(cost);
		} else {
			var maxLoan = state.loans[0];
			var maxIdx = 0;
			state.loans.forEach(function(l, i) {
				if (l.principal > maxLoan.principal) { maxLoan = l; maxIdx = i; }
			});
			state.loans.splice(maxIdx, 1);
			rewardTitle = "Debt Forgiveness";
			rewardDesc = "Your " + fmtCur(maxLoan.principal) + " loan has been wiped from Dalal Bank's servers. Permanently.";
			rewardIcon = "fa-eraser";
			rewardValue = "Wiped: " + fmtCur(maxLoan.principal);
		}
	} else if (rewardType === "insider") {
		var tickers = Object.keys(stockMap).filter(function(t) { return stockMap[t].market !== "INDEX" && stockMap[t].market !== "CRYPTO"; });
		var targetTicker = tickers[Math.floor(pcg.random() * tickers.length)];
		var gap = (pcg.random() > 0.5 ? 1 : -1) * (0.05 + pcg.random() * 0.08);
		state.inventory.insiderTips.push({ ticker: targetTicker, gapPct: gap, daysLeft: 2 });
		rewardTitle = "Insider Information";
		rewardDesc = "[CLASSIFIED] " + targetTicker + " will gap " + (gap > 0 ? "UP" : "DOWN") + " " + (Math.abs(gap)*100).toFixed(1) + "% in 2 days. This never happened.";
		rewardIcon = "fa-user-secret";
		rewardValue = targetTicker + " " + (gap > 0 ? "⬆" : "⬇") + (Math.abs(gap)*100).toFixed(1) + "%";
	} else if (rewardType === "freeze") {
		state.inventory.marketFreezeMinutes = (state.inventory.marketFreezeMinutes || 0) + amount;
		rewardTitle = "Market Freeze";
		rewardDesc = amount + " minutes of frozen prices added. Activate anytime — the market will pause and prices stop moving for that duration. Plan your trades risk-free.";
		rewardIcon = "fa-snowflake";
		rewardValue = "+" + amount + " Minutes";
	} else if (rewardType === "profitboost") {
		state.inventory.profitBoostDays = (state.inventory.profitBoostDays || 0) + amount;
		rewardTitle = "Profit Amplifier";
		rewardDesc = "For " + amount + " trading day" + (amount > 1 ? "s" : "") + ", all your realized trade profits receive a 25% bonus cash injection automatically.";
		rewardIcon = "fa-rocket";
		rewardValue = "+25% Profits for " + amount + " Day" + (amount > 1 ? "s" : "");
	} else if (rewardType === "circuitoverride") {
		state.inventory.circuitOverrideDays = (state.inventory.circuitOverrideDays || 0) + amount;
		rewardTitle = "Circuit Override";
		rewardDesc = "For " + amount + " day" + (amount > 1 ? "s" : "") + ", SEBI circuit breakers are disabled. Stocks can move beyond the normal ±10% daily limit — huge gains OR losses possible.";
		rewardIcon = "fa-bolt";
		rewardValue = "Circuit OFF for " + amount + " Day" + (amount > 1 ? "s" : "");
	}
	
	showCrateReveal(tier, rarity, rewardTitle, rewardDesc, rewardIcon, rewardValue);
	renderSyndicateInventory();
	renderAll();
}

function showCrateReveal(tier, rarity, rewardTitle, rewardDesc, rewardIcon, rewardValue) {
	var tierColors = {
		bronze: { primary: '#cd7f32', glow: 'rgba(205,127,50,0.4)', icon: 'fa-briefcase', label: 'Bronze Briefcase' },
		silver: { primary: '#c0c0c0', glow: 'rgba(192,192,192,0.4)', icon: 'fa-vault', label: 'Silver Safe' },
		gold:   { primary: '#ffd700', glow: 'rgba(255,215,0,0.5)',   icon: 'fa-gem',      label: 'Gold Vault' }
	};
	var rarityColors = {
		common:    { color: '#aaaaaa', label: 'COMMON',    bg: 'rgba(170,170,170,0.15)' },
		uncommon:  { color: '#4caf50', label: 'UNCOMMON',  bg: 'rgba(76,175,80,0.15)' },
		rare:      { color: '#2196f3', label: 'RARE',      bg: 'rgba(33,150,243,0.15)' },
		epic:      { color: '#9c27b0', label: 'EPIC',      bg: 'rgba(156,39,176,0.15)' },
		legendary: { color: '#ff9100', label: 'LEGENDARY', bg: 'rgba(255,145,0,0.15)' }
	};
	var tc = tierColors[tier] || tierColors.bronze;
	var rc = rarityColors[rarity] || rarityColors.common;
	
	// Remove existing overlay if present
	var existing = document.getElementById('crate-reveal-overlay');
	if (existing) existing.remove();
	
	var overlay = document.createElement('div');
	overlay.id = 'crate-reveal-overlay';
	overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;';
	overlay.innerHTML = `
		<div id="crate-reveal-card" style="
			background: linear-gradient(145deg, #1a1a2e, #16213e, #0f3460);
			border: 2px solid ${tc.primary};
			border-radius: 24px;
			padding: 50px 40px;
			max-width: 480px;
			width: 90%;
			text-align: center;
			position: relative;
			overflow: hidden;
			box-shadow: 0 0 60px ${tc.glow}, 0 0 120px ${tc.glow}40, inset 0 1px 0 rgba(255,255,255,0.1);
			animation: crateRevealIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
		">
			<!-- Particle BG -->
			<div id="crate-particles" style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;overflow:hidden;border-radius:24px;"></div>
			
			<!-- Tier label -->
			<div style="font-size:11px;letter-spacing:3px;color:${tc.primary};text-transform:uppercase;margin-bottom:20px;font-weight:700;opacity:0.8;">${tc.label}</div>
			
			<!-- Crate Icon with pulse -->
			<div id="crate-icon-wrap" style="margin-bottom:25px;">
				<div style="
					width:110px;height:110px;border-radius:50%;
					background:${tc.glow};
					border:3px solid ${tc.primary};
					display:inline-flex;align-items:center;justify-content:center;
					box-shadow:0 0 30px ${tc.glow},0 0 60px ${tc.glow}60;
					animation:cratePulse 1.5s ease-in-out infinite alternate;
				">
					<i class="fa-solid ${tc.icon}" style="font-size:44px;color:${tc.primary};"></i>
				</div>
			</div>
			
			<!-- Opening text -->
			<div id="crate-phase-text" style="font-size:16px;color:#aaa;margin-bottom:30px;letter-spacing:1px;">Opening crate...</div>
			
			<!-- Progress Bar -->
			<div id="crate-progress-wrap" style="background:rgba(255,255,255,0.08);border-radius:99px;height:6px;margin-bottom:40px;overflow:hidden;">
				<div id="crate-progress-bar" style="height:100%;width:0%;background:linear-gradient(90deg,${tc.primary},#fff,${tc.primary});border-radius:99px;transition:width 0.1s linear;box-shadow:0 0 10px ${tc.primary};"></div>
			</div>
			
			<!-- Reward (hidden initially) -->
			<div id="crate-reward" style="display:none;">
				<div style="
					display:inline-block;padding:4px 14px;border-radius:99px;
					background:${rc.bg};border:1px solid ${rc.color};
					color:${rc.color};font-size:11px;letter-spacing:3px;font-weight:800;
					margin-bottom:20px;text-transform:uppercase;
				">${rc.label}</div>
				<div style="margin-bottom:15px;">
					<i class="fa-solid ${rewardIcon}" style="font-size:38px;color:${rc.color};filter:drop-shadow(0 0 12px ${rc.color});"></i>
				</div>
				<div style="font-size:22px;font-weight:800;color:#ffffff;margin-bottom:10px;letter-spacing:0.5px;">${escapeHTML(rewardTitle)}</div>
				<div style="font-size:14px;color:#888;margin-bottom:20px;line-height:1.6;">${escapeHTML(rewardDesc)}</div>
				<div style="font-size:28px;font-weight:900;color:${rc.color};letter-spacing:1px;margin-bottom:30px;text-shadow:0 0 20px ${rc.color}80;">${escapeHTML(rewardValue)}</div>
				<button onclick="document.getElementById('crate-reveal-overlay').remove();" style="
					background:linear-gradient(135deg,${tc.primary},${tc.primary}aa);
					border:none;border-radius:12px;padding:14px 40px;
					color:#000;font-size:15px;font-weight:800;cursor:pointer;letter-spacing:1px;
					box-shadow:0 4px 20px ${tc.glow};
					transition:all 0.2s;
				" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">CLAIM REWARD</button>
			</div>
		</div>
	`;
	document.body.appendChild(overlay);
	
	// Spawn particles
	var particlesEl = document.getElementById('crate-particles');
	for (var i = 0; i < 18; i++) {
		(function(idx) {
			var p = document.createElement('div');
			var size = 3 + pcg.random() * 5;
			var left = pcg.random() * 100;
			var delay = pcg.random() * 2000;
			p.style.cssText = 'position:absolute;border-radius:50%;background:' + tc.primary + ';width:' + size + 'px;height:' + size + 'px;left:' + left + '%;top:110%;opacity:0.6;animation:crateParticle ' + (2 + pcg.random() * 2).toFixed(1) + 's ' + (delay) + 'ms ease-in infinite;';
			particlesEl.appendChild(p);
		})(i);
	}
	
	// Animated progress bar
	var progress = 0;
	var phaseTexts = ["Contacting The Syndicate...", "Verifying credentials...", "Unlocking briefcase...", "Extracting contents..."];
	var phaseIdx = 0;
	var bar = document.getElementById('crate-progress-bar');
	var phaseText = document.getElementById('crate-phase-text');
	var intervalMs = 25;
	var totalMs = 2400;
	var steps = totalMs / intervalMs;
	var increment = 100 / steps;
	
	var timer = setInterval(function() {
		progress += increment;
		if (bar) bar.style.width = Math.min(progress, 100) + '%';
		
		var newPhaseIdx = Math.floor((progress / 100) * phaseTexts.length);
		if (newPhaseIdx !== phaseIdx && newPhaseIdx < phaseTexts.length) {
			phaseIdx = newPhaseIdx;
			if (phaseText) phaseText.textContent = phaseTexts[phaseIdx];
		}
		
		if (progress >= 100) {
			clearInterval(timer);
			// Show reward
			if (phaseText) phaseText.style.display = 'none';
			var progressWrap = document.getElementById('crate-progress-wrap');
			if (progressWrap) progressWrap.style.display = 'none';
			var iconWrap = document.getElementById('crate-icon-wrap');
			if (iconWrap) iconWrap.style.display = 'none';
			var reward = document.getElementById('crate-reward');
			if (reward) {
				reward.style.display = 'block';
				reward.style.animation = 'crateRewardIn 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) both';
			}
			// Flash the border
			var card = document.getElementById('crate-reveal-card');
			if (card) {
				card.style.borderColor = rc.color;
				card.style.boxShadow = '0 0 80px ' + rc.color + '60, 0 0 160px ' + rc.color + '30, inset 0 1px 0 rgba(255,255,255,0.1)';
			}
		}
	}, intervalMs);
	
	// Close on backdrop click (only after reward shown)
	overlay.addEventListener('click', function(e) {
		if (e.target === overlay && progress >= 100) overlay.remove();
	});
}

function toggleSyndicateView() {
	var v = document.getElementById("view-syndicate");
	var termView = document.getElementById("view-terminal");
	var btn = document.getElementById("btn-syndicate");
	
	if (v.classList.contains("hidden")) {
		v.classList.remove("hidden");
		termView.classList.add("hidden");
		var views = ["view-bank", "view-realestate", "view-settings", "view-syndicate", "view-mf", "view-ipo", "view-customize"];
        views.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                if (id === "view-customize" && !el.classList.contains("hidden")) {
                    if (typeof closeTerminalCustomization === 'function') closeTerminalCustomization(false);
                }
                if (id !== "view-syndicate") el.classList.add("hidden");
            }
        });
        document.querySelectorAll(".ctrl-btn").forEach(function(b) { b.classList.remove("on"); });
		
		if (btn) btn.classList.add("on");
		renderSyndicateInventory();
	} else {
		v.classList.add("hidden");
		termView.classList.remove("hidden");
		if (btn) btn.classList.remove("on");
	}
}


export { renderSyndicateInventory, openSyndicateCrate, showCrateReveal, toggleSyndicateView };
