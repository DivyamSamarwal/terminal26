import { 
    state, toast, fmtCur, EXCHANGE_RATES, LOT_SIZES, pcg, updateOrderMargin, updateOptionMargin,
    getDayFraction, stdNormCDF, stdNormPDF, renderOptionChain, getBidAsk, formatTime, fmtPrice, executeChainTrade
} from './app.js';

import { saveGame } from './storage.js';
function getExpiryDays() {
	var sel = document.getElementById("expiry-date");
	var expDay = parseInt(sel.value, 10) || (state.day + 4);
	var daysLeft = expDay - state.day + 1;
	return daysLeft > 0 ? daysLeft : 0;
}

function generateStrikes(stock) {
	var ltp = stock.ltp;
	var step;
	if (stock.market === "FX") {
		step = ltp > 50 ? 0.5 : 0.005; // USDJPY vs others
	} else if (stock.market === "CRYPTO") {
		if (ltp > 10000) step = 1000;
		else if (ltp > 1000) step = 50;
		else if (ltp > 100) step = 5;
		else if (ltp > 10) step = 1;
		else if (ltp > 0.5) step = 0.05;
		else step = 0.01;
	} else if (stock.market === "INDEX") {
		if (ltp > 50000) step = 500;
		else if (ltp > 10000) step = 200;
		else if (ltp > 5000) step = 100;
		else if (ltp > 1000) step = 50;
		else step = 10;
	} else if (stock.market === "COMM" || stock.market === "BOND") {
		if (ltp > 1000)
			step = 10; // Gold
		else if (ltp > 100) step = 1;
		else if (ltp > 20)
			step = 0.5; // Silver, Crude
		else if (ltp > 5) step = 0.1;
		else step = 0.05; // Nat Gas, Copper, Bond Yields
	} else {
		// Equities
		if (ltp > 10000) step = 200;
		else if (ltp > 5000) step = 100;
		else if (ltp > 1000) step = 50;
		else if (ltp > 200) step = 10;
		else if (ltp > 50) step = 5;
		else if (ltp > 10) step = 1;
		else if (ltp > 2) step = 0.5;
		else if (ltp > 0.5) step = 0.1;
		else step = 0.05;
	}

	var base = Math.round(ltp / step) * step;
	var strikes = [];
	for (var i = -5; i <= 5; i++) {
		var s = base + i * step;
		if (s > 0) strikes.push(parseFloat(s.toFixed(4)));
	}
	if (strikes.length === 0) strikes.push(parseFloat(step.toFixed(4)));
	return strikes;
}

function calcGreeks(type, strike, ltp, days, baseIv) {
	if (days === undefined) days = getExpiryDays() - getDayFraction();
	var T = Math.max(0.001, days) / 252.0; // Time in years
	var r = 0.05; // 5% Risk-free rate
	
	var iv = baseIv || 0.25;
	var moneyness = (strike - ltp) / ltp;
	var skewModifier = -moneyness * (strike < ltp ? 0.6 : 0.3);
	var sigma = Math.max(0.05, Math.min(2.0, iv + skewModifier));

	var d1 =
		(Math.log(ltp / strike) + (r + 0.5 * sigma * sigma) * T) /
		(sigma * Math.sqrt(T));
	var d2 = d1 - sigma * Math.sqrt(T);

	var callPrice =
		ltp * stdNormCDF(d1) - strike * Math.exp(-r * T) * stdNormCDF(d2);
	var putPrice =
		strike * Math.exp(-r * T) * stdNormCDF(-d2) - ltp * stdNormCDF(-d1);

	var delta = type === "CALL" ? stdNormCDF(d1) : stdNormCDF(d1) - 1;
	var gamma = stdNormPDF(d1) / (ltp * sigma * Math.sqrt(T));
	var vega = (ltp * stdNormPDF(d1) * Math.sqrt(T)) / 100.0; // per 1% change

	var thetaCall =
		-(ltp * sigma * stdNormPDF(d1)) / (2 * Math.sqrt(T)) -
		r * strike * Math.exp(-r * T) * stdNormCDF(d2);
	var thetaPut =
		-(ltp * sigma * stdNormPDF(d1)) / (2 * Math.sqrt(T)) +
		r * strike * Math.exp(-r * T) * stdNormCDF(-d2);
	var theta = type === "CALL" ? thetaCall / 252.0 : thetaPut / 252.0; // daily theta

	var price = type === "CALL" ? callPrice : putPrice;

	// Ensure it never drops below intrinsic value due to numerical instability
	var intrinsic =
		type === "CALL" ? Math.max(0, ltp - strike) : Math.max(0, strike - ltp);
	price = Math.max(price, intrinsic);

	return { price: price, delta: delta, gamma: gamma, theta: theta, vega: vega, sigma: sigma };
}

function calcPremium(type, strike, ltp, days, baseIv) {
	var rawPrice = calcGreeks(type, strike, ltp, days, baseIv).price;
	var minTick = ltp < 10 ? 0.0005 : 0.05;
	return Math.max(rawPrice, minTick);
}

function openOptionChain() {
	if (!state.activeStock) return;
	document.getElementById("option-chain-modal").classList.remove("hidden");
	document.getElementById("oc-ticker").textContent = state.activeStock.ticker;
	renderOptionChain();
}

function closeOptionChain() {
	document.getElementById("option-chain-modal").classList.add("hidden");
}

function processOptionTrade(stock, side, optType, strike, expiryType, lots, lotSize, fxRate, isBot, priceOverride, daysToExpiryOverride) {
	var totalQty;
	var optionId = stock.ticker + "_" + optType + "_" + strike + "_" + expiryType;
	var premium;
	
	var pos = state.optionsPositions[optionId];
	if (!pos) {
		pos = {
			ticker: stock.ticker,
			type: optType,
			strike: strike,
			expiryType: expiryType,
			daysToExpiry: daysToExpiryOverride || getExpiryDays(),
			lots: 0,
			avgPremium: 0,
			lotSize: lotSize,
			blockedMargin: 0
		};
	}
	
	// Prevent infinite money glitch: Cap lots to open position size when closing
	if (side === "BUY" && pos.lots < 0) {
		lots = Math.min(lots, Math.abs(pos.lots));
	} else if (side === "SELL" && pos.lots > 0) {
		lots = Math.min(lots, pos.lots);
	}
	totalQty = lots * lotSize;

	var remainingDays = Math.max(0.01, pos.daysToExpiry - getDayFraction());
	var theoPremium = calcPremium(optType, strike, stock.ltp, remainingDays, stock.iv);
	
	if (priceOverride !== undefined) {
		premium = priceOverride;
	} else {
		var cg = calcGreeks(optType, strike, stock.ltp, remainingDays, stock.iv);
		var ba = getBidAsk(theoPremium, optType, strike, stock.ltp, cg.sigma);
		premium = (side === "BUY") ? ba.ask : ba.bid;
	}
	
	var valINR = premium * totalQty * fxRate;
	var brokerage = valINR * 0.001;
	if (state.inventory && state.inventory.brokerageFreeDays > 0) brokerage = 0;

	var pnl = null;

	if (side === "BUY") {
		if (pos.lots < 0) { // BTC
			var closedLots = Math.min(lots, Math.abs(pos.lots));
			var proportion = closedLots / Math.abs(pos.lots);
			var marginReleased = pos.blockedMargin * proportion;
			
			// Allow users to buy back short options even if it results in negative margin (cutting losses)
			
			pnl = (pos.avgPremium - premium) * (closedLots * lotSize) * fxRate;
			state.margin += marginReleased - valINR - brokerage;
			pos.blockedMargin -= marginReleased;
			pos.lots += closedLots;
		} else { // BTO
			if (state.margin < valINR + brokerage) {
				if (!isBot) toast("Error", "Insufficient margin", "error");
				return false;
			}
			var oldTotal = Math.abs(pos.lots) * pos.avgPremium;
			pos.lots += lots;
			pos.avgPremium = (oldTotal + (premium * lots)) / Math.abs(pos.lots);
			state.margin -= (valINR + brokerage);
		}
	} else { // SELL
		if (pos.lots > 0) { // STC
			closedLots = Math.min(lots, pos.lots);
			pnl = (premium - pos.avgPremium) * (closedLots * lotSize) * fxRate;
			state.margin += valINR - brokerage;
			pos.lots -= closedLots;
		} else { // STO
			var marginBlocked = (0.1 * stock.ltp * totalQty) * fxRate;
			var netCost = marginBlocked - valINR + brokerage;
			
			if (state.margin < netCost) {
				if (!isBot) toast("Error", "Insufficient SPAN margin for shorting. Required: " + fmtCur(netCost), "error");
				return false;
			}
			
			oldTotal = Math.abs(pos.lots) * pos.avgPremium;
			pos.lots -= lots;
			pos.avgPremium = (oldTotal + (premium * lots)) / Math.abs(pos.lots);
			pos.blockedMargin = (pos.blockedMargin || 0) + marginBlocked;
			state.margin -= netCost;
		}
	}

	if (pos.lots === 0) delete state.optionsPositions[optionId];
	else state.optionsPositions[optionId] = pos;
	
	state.totalBrokerage = (state.totalBrokerage || 0) + brokerage;

	if (pnl > 0) {
		var tax = pnl * 0.15;
		state.margin -= tax;
		state.totalTaxesPaid = (state.totalTaxesPaid || 0) + tax;

		if (state.inventory && state.inventory.profitBoostDays > 0) {
			var bonus = pnl * 0.25;
			state.margin += bonus;
			if (typeof toast === "function") toast("Profit Amplifier", "Bonus " + fmtCur(bonus) + " added to margin", "success");
		}
	}

	var tradeRecord = {
		time: formatTime(state.time),
		day: state.day,
		ticker: stock.ticker,
		side: side,
		type: optType + " " + strike + " " + expiryType,
		qty: totalQty,
		price: premium,
		value: valINR,
		pnl: pnl || 0,
	};
	if (isBot) {
		state.botTradeHistory.unshift(tradeRecord);
		if (state.botTradeHistory.length > 500) state.botTradeHistory.pop();
	} else {
		state.tradeHistory.unshift(tradeRecord);
		if (state.tradeHistory.length > 500) state.tradeHistory.pop();
	}

	if (!isBot) {
		toast("Option " + side, lots + "L " + stock.ticker + " " + optType + " " + strike + " @ " + fmtPrice(stock, premium), side === "BUY" ? "success" : "error");
	}
	return true;
}

function executeOptionStrategy() {
	var strat = document.getElementById("opt-strategy").value;
	if (!strat || !state.activeStock) return;
	
	var stock = state.activeStock;
	var ltp = stock.ltp;
	var strikes = generateStrikes(stock);
	var days = getExpiryDays() - getDayFraction();
	
	var atmIndex = 0;
	var minDiff = Infinity;
	for (var i = 0; i < strikes.length; i++) {
		var diff = Math.abs(strikes[i] - ltp);
		if (diff < minDiff) { minDiff = diff; atmIndex = i; }
	}
	
	var trades = [];
	
	function getPrice(s, type, side) {
		var g = calcGreeks(type, s, stock.ltp, days, stock.iv);
		var p = Math.max(g.price, stock.ltp < 10 ? 0.0005 : 0.05);
		var ba = getBidAsk(p, type, s, stock.ltp, g.sigma);
		return side === "BUY" ? ba.ask : ba.bid;
	}
	
	if (strat === "STRADDLE") {
		trades.push({ strike: strikes[atmIndex], type: "CALL", side: "BUY", price: getPrice(strikes[atmIndex], "CALL", "BUY") });
		trades.push({ strike: strikes[atmIndex], type: "PUT",  side: "BUY", price: getPrice(strikes[atmIndex], "PUT", "BUY") });
	} else if (strat === "BULL_CALL") {
		var otmIndex = Math.min(strikes.length - 1, atmIndex + 1);
		trades.push({ strike: strikes[atmIndex], type: "CALL", side: "BUY",  price: getPrice(strikes[atmIndex], "CALL", "BUY") });
		trades.push({ strike: strikes[otmIndex], type: "CALL", side: "SELL", price: getPrice(strikes[otmIndex], "CALL", "SELL") });
	} else if (strat === "BEAR_PUT") {
		otmIndex = Math.max(0, atmIndex - 1);
		trades.push({ strike: strikes[atmIndex], type: "PUT", side: "BUY",  price: getPrice(strikes[atmIndex], "PUT", "BUY") });
		trades.push({ strike: strikes[otmIndex], type: "PUT", side: "SELL", price: getPrice(strikes[otmIndex], "PUT", "SELL") });
	}
	
	trades.forEach(function(t) {
		executeChainTrade(t.side, t.type, t.strike, t.price);
	});
	
	document.getElementById("opt-strategy").value = "";
}


export { getExpiryDays, generateStrikes, calcGreeks, calcPremium, openOptionChain, closeOptionChain, processOptionTrade, executeOptionStrategy };
