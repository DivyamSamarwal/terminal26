import { 
    state, marketStocks, stockMap, INDEX_CONSTITUENTS, 
    toast, generatePreHistory, generateIndexPreHistory, buildPreOHLC, selectStock
} from './app.js';

function generateChecksum(str) {
	var hash = 0;
	for (var i = 0; i < str.length; i++) {
		var char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash;
	}
	return "chk_" + Math.abs(hash).toString(16);
}

function saveGame() {
	try {
		var saveData = {
			state: state,
			marketStocks: marketStocks.map(function(s) {
				return {
					ticker: s.ticker,
					ltp: s.ltp,
					history: Array.isArray(s.history) ? s.history.slice(-300) : [],
					volumeHistory: Array.isArray(s.volumeHistory) ? s.volumeHistory.slice(-300) : [],
					ohlcHistory: Array.isArray(s.ohlcHistory) ? s.ohlcHistory.slice(-300) : [],
					currentCandle: s.currentCandle,
					open: s.open,
					prevClose: s.prevClose,
					_prevTick: s._prevTick,
					volume: s.volume,
					circuitHit: s.circuitHit
				};
			})
		};
		var dataStr = JSON.stringify(saveData);
		var finalSave = {
			data: dataStr,
			checksum: generateChecksum(dataStr)
		};
		localStorage.setItem("tradingTerminalSave", JSON.stringify(finalSave));
	} catch (e) {
		console.error("Save failed:", e);
	}
}

function loadGame() {
	try {
		var saved = localStorage.getItem("tradingTerminalSave");
		if (!saved) return false;
		
		var parsed = JSON.parse(saved);
		var data;
		if (parsed.checksum) {
			if (generateChecksum(parsed.data) !== parsed.checksum) {
				toast("Error", "Save file corrupted or tampered! Starting fresh.", "error");
				return false;
			}
			data = JSON.parse(parsed.data);
		} else {
			data = parsed; // Legacy save migration
		}
		
		Object.assign(state, data.state);
		var activeTicker = state.activeStock ? state.activeStock.ticker : null;
		
		// 1. PreHistory passes
		marketStocks.forEach(function (s) {
			if (!INDEX_CONSTITUENTS[s.ticker]) {
				s.preHistory = generatePreHistory(s, 66);
			}
		});
		marketStocks.forEach(function (s) {
			if (INDEX_CONSTITUENTS[s.ticker]) {
				s.preHistory = generateIndexPreHistory(s, INDEX_CONSTITUENTS[s.ticker]);
			}
		});

		// 1.5 Restore listed IPOs into marketStocks
		if (state.upcomingIPOs) {
			state.upcomingIPOs.forEach(function(ipo) {
				// State fix: clear stuck bids for already listed IPOs to fix double counting
				if (ipo.status === 'LISTED' && ipo.userBids && ipo.userBids.marginBlocked > 0) {
					ipo.userBids.lots = 0;
					ipo.userBids.marginBlocked = 0;
				}

				if (ipo.status === 'LISTED' && !stockMap[ipo.ticker]) {
					var newStock = {
						ticker: ipo.ticker,
						name: ipo.companyName,
						market: ipo.market || "NSE",
						sector: "TECH",
						base: ipo.issuePrice,
						vol: 0.03,
						volatilityMultiplier: 0.03,
						currency: ipo.currency || "INR",
						ltp: ipo.issuePrice,
						open: ipo.issuePrice,
						prevClose: ipo.issuePrice,
						_prevTick: ipo.issuePrice,
						volume: 100000,
						history: [],
						volumeHistory: [],
						ohlcHistory: [],
						currentCandle: null,
						circuitHit: null,
						circuitTierIndex: 0,
						haltUntil: null,
						haltImbalance: 0,
						postHaltVolatility: 1,
						beta: 1.0,
						iv: 0.25,
						shares: 50000000,
						baseVolume: 100000,
						preHistory: []
					};
					// generate flat preHistory
					for(var j=0; j<66; j++) newStock.preHistory.push(ipo.issuePrice);
					marketStocks.push(newStock);
					stockMap[ipo.ticker] = newStock;
				}
			});
		}

		// 2. Restore dynamic state
		marketStocks.forEach(function (s) {
			s.preOHLC = buildPreOHLC(s, state.candlePeriod);
			var savedStock = data.marketStocks.find(function(ds) { return ds.ticker === s.ticker; });
			if (savedStock) {
				s.ltp = savedStock.ltp;
				s.history = savedStock.history || [s.ltp];
				s.volumeHistory = savedStock.volumeHistory || [0];
				s.ohlcHistory = savedStock.ohlcHistory || [];
				s.currentCandle = savedStock.currentCandle || null;
				s.open = savedStock.open || s.ltp;
				s.prevClose = savedStock.prevClose || s.ltp;
				s._prevTick = savedStock._prevTick || s.ltp;
				s.volume = savedStock.volume || 0;
				s.circuitHit = savedStock.circuitHit || null;
			}
		});
		
		if (activeTicker && stockMap[activeTicker]) {
			state.activeStock = stockMap[activeTicker];
			selectStock(state.activeStock);
		}
		return true;
	} catch (e) {
		console.error("Load failed:", e);
		return false;
	}
}

function wipeGameData() {
	if (confirm("Are you sure you want to permanently delete all game data? This cannot be undone!")) {
		try { localStorage.clear(); } catch(e) { console.error(e); }
		location.reload();
	}
}


export { generateChecksum, saveGame, loadGame, wipeGameData };
