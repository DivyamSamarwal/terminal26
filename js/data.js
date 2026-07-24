import { 
    pcg, stockMap, marketStocks, INDEX_CONSTITUENTS, state
} from './app.js';

function generatePreHistory(stock, days) {
	days = days || 66;
	var TPD = 375; // ticks per trading day

	// Deterministic seeded PCG32 per ticker
	var state = BigInt(0);
	for (var ci = 0; ci < stock.ticker.length; ci++) {
		state = (state * 31n + BigInt(stock.ticker.charCodeAt(ci))) & 0xFFFFFFFFFFFFFFFFn;
	}
	state = ((state || 1n) * 123456789n) & 0xFFFFFFFFFFFFFFFFn;

	function rng() {
		var oldState = state;
		// Advance internal state (64-bit LCG)
		state = (oldState * 6364136223846793005n + 1442695040888963407n) & 0xFFFFFFFFFFFFFFFFn;
		// Output function (XSH RR)
		var xorshifted = Number((((oldState >> 18n) ^ oldState) >> 27n) & 0xFFFFFFFFn);
		var rot = Number(oldState >> 59n);
		var out = (xorshifted >>> rot) | (xorshifted << ((-rot) & 31));
		return (out >>> 0) / 4294967296.0;
	}
	function randn() {
		var u = rng() || 1e-10,
			v2 = rng();
		return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v2);
	}

	// Starting price ~22 days ago: random ±15% variance from current ltp
	var targetEnd = stock.ltp;
	var overallReturn = (rng() * 2 - 1) * 0.15;
	var price = targetEnd / (1 + overallReturn);
	price = Math.max(targetEnd * 0.6, Math.min(targetEnd * 1.7, price));

	var v = stock.vol;
	var history = new Array(days * TPD);
	var idx = 0;

	for (var d = 0; d < days; d++) {
		// Overnight gap (±0.8%)
		if (d > 0) {
			price *= 1 + randn() * 0.004;
		}
		var dayOpen = price;
		var ucLimit = dayOpen * 1.1;
		var lcLimit = dayOpen * 0.9;
		// Random intraday trend bias (trending or ranging day)
		var trend = (rng() * 2 - 1) * 0.00018;

		for (var t = 0; t < TPD; t++) {
			// Mean reversion gently pulls price toward current ltp over the month
			var mr = ((targetEnd - price) / targetEnd) * 0.0006;
			var move = randn() * v * 1.1 + trend + mr;
			price *= 1 + move;
			price = Math.max(lcLimit, Math.min(ucLimit, price));
			history[idx++] = price;
		}
	}

	// Smooth the last day (375 ticks) to land exactly on targetEnd
	var lastVal = history[history.length - 1];
	if (lastVal && Math.abs(lastVal - targetEnd) > 0.005 * targetEnd) {
		var ratio = targetEnd / lastVal;
		var smoothStart = history.length - TPD;
		for (var si = smoothStart; si < history.length; si++) {
			var alpha = (si - smoothStart) / TPD;
			history[si] = history[si] * (1 + (ratio - 1) * alpha);
		}
	}
	// Round to appropriate precision
	var decimals = stock.currency === "JPY" ? 0 : (targetEnd < 10 ? 4 : 2);
	return history.map(function (p) {
		return parseFloat(p.toFixed(decimals));
	});
}

function generateIndexPreHistory(indexStock, constituentTickers) {
	var TPD = 375;
	var days = 66;
	var totalTicks = days * TPD;
	var history = new Array(totalTicks);

	var comps = [];
	constituentTickers.forEach(function(tk) {
		if (stockMap[tk]) comps.push(stockMap[tk]);
	});
	if (comps.length === 0) return Array(totalTicks).fill(indexStock.ltp);

	var shape = new Array(totalTicks);
	shape[0] = 1.0;

	for (var t = 1; t < totalTicks; t++) {
		var prevTotalCap = 0;
		var currentTotalCap = 0;
		comps.forEach(function(comp) {
			if (!comp.preHistory || comp.preHistory.length < totalTicks) return;
			var shares = comp.shares || 100000000;
			var prevLtp = comp.preHistory[t - 1];
			var curLtp = comp.preHistory[t];
			prevTotalCap += prevLtp * shares;
			currentTotalCap += curLtp * shares;
		});
		var tickReturn = prevTotalCap > 0 ? (currentTotalCap - prevTotalCap) / prevTotalCap : 0;
		shape[t] = shape[t - 1] * (1 + tickReturn);
	}

	var finalShapeVal = shape[totalTicks - 1];
	var startPrice = finalShapeVal > 0 ? indexStock.ltp / finalShapeVal : indexStock.ltp;

	for (t = 0; t < totalTicks; t++) {
		history[t] = parseFloat((startPrice * shape[t]).toFixed(4));
	}
	return history;
}

function buildPreOHLC(stock, period, maxCandles) {
	if (!stock.preHistory || !stock.preHistory.length) return [];
	period = period || state.candlePeriod;
	var pre = stock.preHistory;
	var preLen = pre.length;
	// Only build as many candles as needed
	var startTick = maxCandles ? Math.max(0, preLen - maxCandles * period) : 0;
	var candles = [];
	// Expected volume for a candle of this period
	var expectedCandleVol = Math.floor((stock.baseVolume / 390) * period);
	for (var i = startTick; i < preLen; i += period) {
		var slice = pre.slice(i, i + period);
		if (!slice.length) break;
		var c = slice[slice.length - 1],
			o = slice[0];
		var isBull = c >= o;
		
		var h = Math.max.apply(null, slice);
		var l = Math.min.apply(null, slice);
		
		// Deterministic pseudo-randoms based on index and ticker so they scroll smoothly without flickering
		var tickSeed = i + stock.ticker.charCodeAt(0);
		var pRandWick1 = Math.abs(Math.sin(tickSeed * 12.9898)) % 1;
		var pRandWick2 = Math.abs(Math.cos(tickSeed * 78.233)) % 1;
		var pRandVol = Math.abs(Math.sin(tickSeed * 45.123)) % 1;
		
		// Add simulated intra-tick micro-volatility to generate realistic wicks
		var wickBase = (stock.vol || 0.01) * c * 0.4;
		h += pRandWick1 * wickBase;
		l -= pRandWick2 * wickBase;
		
		// Ensure high and low properly bound open and close
		if (o > c) { h = Math.max(h, o); l = Math.min(l, c); }
		else { h = Math.max(h, c); l = Math.min(l, o); }
		
		// Format to match
		h = parseFloat(h.toFixed(4));
		l = parseFloat(l.toFixed(4));
		
		candles.push({
			o: o,
			h: h,
			l: l,
			c: c,
			v: Math.floor(expectedCandleVol * (isBull ? 1.2 : 0.8) + pRandVol * (expectedCandleVol * 0.4)),
		});
	}
	return candles;
}

function mkStock(ticker, name, ltp, vol, sector, market, currency, shares) {
	market = market || "NSE";
	currency = currency || "INR";

	// Assign realistic base daily volume
	var baseVolume = 1000000; // Default 1M
	if (market === "NASDAQ") {
		if (ltp < 200) baseVolume = 80000000;
		else baseVolume = 30000000;
	} else if (market === "CRYPTO") {
		if (ltp > 10000)
			baseVolume = 60000; // BTC
		else if (ltp < 1)
			baseVolume = 500000000; // DOGE, XRP
		else baseVolume = 1000000;
	} else if (market === "BOND") {
		baseVolume = 5000000;
	} else if (market === "INDEX") {
		baseVolume = 15000000;
	} else if (market === "COMM") {
		baseVolume = 200000;
	} else if (market === "FX") {
		baseVolume = 1000000;
	} else if (market === "NSE") {
		if (ltp < 500)
			baseVolume = 40000000; // High volume
		else if (ltp < 2000) baseVolume = 15000000;
		else baseVolume = 5000000;
	} else if (market === "SSE" || market === "TSE") {
		if (ltp < 50) baseVolume = 30000000;
		else baseVolume = 8000000;
	} else if (market === "EU") {
		baseVolume = 4000000;
	}

	return {
		ticker: ticker,
		name: name,
		ltp: ltp,
		vol: vol,
		base: ltp,
		history: [],
		open: ltp,
		sector: sector,
		volume: 0,
		circuitHit: null,
		circuitTierIndex: 0,
		haltUntil: null,
		haltImbalance: 0,
		postHaltVolatility: 1,
		_prevTick: ltp,
		market: market,
		currency: currency,
		volumeHistory: [],
		baseVolume: baseVolume,
		shares: shares || 100000000,
		iv: 0.15 + (pcg.random() * 0.40),
	};
}

function getNewsTargets(target) {
	switch (target) {
		case "RANDOM":
			var nseStocks = marketStocks.filter(function (s) {
				return s.market === "NSE";
			});
			var s = nseStocks[Math.floor(pcg.random() * nseStocks.length)];
			return { stocks: [s], name: s.name };
		case "EU":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.market === "EU";
				}),
			};
		case "IT":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "IT" && s.market === "NSE";
				}),
			};
		case "BANK":
			return {
				stocks: marketStocks.filter(function (s) {
					return (
						(s.sector === "Banking" || s.sector === "Finance") &&
						s.market === "NSE"
					);
				}),
			};
		case "ENERGY":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "Energy" && s.market === "NSE";
				}),
			};
		case "AUTO":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "Auto" && s.market === "NSE";
				}),
			};
		case "PHARMA":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "Pharma";
				}),
			};
		case "METAL":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "Metal" && s.market === "NSE";
				}),
			};
		case "FMCG":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "FMCG";
				}),
			};
		case "TELECOM":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "Telecom";
				}),
			};
		case "INFRA":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "Infra";
				}),
			};
		case "POWER":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "Power";
				}),
			};
		case "CEMENT":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "Cement";
				}),
			};
		case "CONSUMER":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "Consumer";
				}),
			};
		case "TECH":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "Tech" && s.market === "NSE";
				}),
			};
		case "DEFENSE":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "Defense" || s.ticker === "BEL";
				}),
			};
		case "OILGAS":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.sector === "Energy";
				}),
			};
		case "GLOBAL":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.market !== "INDEX";
				})
			};
		case "ALL":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.market === "NSE";
				}),
			};
		case "ALL_NASDAQ":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.market === "NASDAQ";
				}),
			};
		case "ALL_SSE":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.market === "SSE";
				}),
			};
		case "ALL_TSE":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.market === "TSE";
				}),
			};
		case "ALL_HKEX":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.market === "HKEX";
				}),
			};
		case "ALL_INDEX":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.market === "INDEX";
				}),
			};
		case "ALL_USD_FX":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.market === "FX" && s.currency === "USD";
				}),
			};
		case "ALL_US":
			return {
				stocks: marketStocks.filter(function (s) {
					return (
						s.market === "NASDAQ" ||
						s.market === "NYSE" ||
						(s.market === "COMM" && s.currency === "USD")
					);
				}),
			};
		case "ALL_EU":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.market === "EU";
				}),
			};
		case "ALL_COMM":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.market === "COMM";
				}),
			};
		case "ALL_CRYPTO":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.market === "CRYPTO";
				}),
			};
		case "ALL_FX":
			return {
				stocks: marketStocks.filter(function (s) {
					return s.market === "FX";
				}),
			};
		default:
			return {
				stocks: marketStocks.filter(function (s) {
					return s.ticker === target;
				}),
			};
	}
}


export { generatePreHistory, generateIndexPreHistory, buildPreOHLC, mkStock, getNewsTargets };
