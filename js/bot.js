import { EXCHANGE_RATES, LOT_SIZES, calcBollingerBands, calcEMA, calcMACD, calcPremium, calcRSI, calcSMA, fmtCur, generateStrikes, getDayFraction, isMarketOpen, pcg, processEquityTrade, processOptionTrade, renderAll, renderTopBar, state, stockMap, toast, selectStock } from './app.js';

// ==================== ALGO BOT MANAGER ====================

function BotInstance(ticker, config) {
	this.ticker = ticker;
	this.strategy = config.strategy || "CONFLUENCE";
	this.riskPct = config.riskPct || 5;
	this.slPct = config.slPct || 1;
	this.tpPct = config.tpPct || 2;
	this.direction = config.direction || "LONG_SHORT"; // LONG_ONLY, SHORT_ONLY, LONG_SHORT
	this.asset = config.asset || "EQUITY"; // EQUITY, OPTIONS
	this.useTrailingStop = config.useTrailingStop || false;
	this.autoShutdown = config.autoShutdown !== false; // Default true
	this.startTime = typeof state !== "undefined" ? state.time : 0;
	this.startDay = typeof state !== "undefined" ? state.day : 1;
	
	this.state = "FLAT"; // FLAT, LONG, SHORT
	this.entryPrice = 0;
	this.qty = 0;
	this.slPrice = 0;
	this.tpPrice = 0;
	this.highestPrice = 0; // For trailing stop LONG
	this.lowestPrice = 0;  // For trailing stop SHORT
	this.optionId = null;  // For tracking the specific option contract traded
}

BotInstance.prototype.tick = function() {
	var stock = stockMap[this.ticker];
	if (!stock) return;
	if (stock.haltUntil) return; // Completely frozen during halts
	
	var ltp = stock.ltp;
	var fxRate = EXCHANGE_RATES[stock.currency] || 1;

	// Manual Position Sync
	if (this.state !== "FLAT") {
		if (this.asset === "EQUITY") {
			var currentPos = state.positions[this.ticker];
			var actualQty = 0;
			
			if (currentPos) {
				if (this.state === "LONG" && currentPos.qty > 0) actualQty = currentPos.qty;
				else if (this.state === "SHORT" && currentPos.qty < 0) actualQty = Math.abs(currentPos.qty);
			}
			
			if (actualQty <= 0) {
				this.state = "FLAT";
				this.qty = 0;
			} else if (actualQty < this.qty) {
				this.qty = actualQty; // Sync partial manual exit
			}
		} else if (this.asset === "OPTIONS" && this.optionId) {
			var posOpt = state.optionsPositions[this.optionId];
			if (!posOpt) {
				this.state = "FLAT";
				this.qty = 0;
				this.optionId = null;
			} else {
				var actualLots = posOpt.lots;
				var actualQtyOpt = actualLots * (posOpt.lotSize || (LOT_SIZES[this.ticker] || 100));
				if (actualQtyOpt <= 0) {
					this.state = "FLAT";
					this.qty = 0;
					this.optionId = null;
				} else if (actualQtyOpt < this.qty) {
					this.qty = actualQtyOpt; // Sync partial manual exit
				}
			}
		}
	}

	// Current Metric (LTP for Equity, Premium for Options)
	var currentMetric = ltp;
	if (this.asset === "OPTIONS" && this.optionId) {
		posOpt = state.optionsPositions[this.optionId];
		if (posOpt) {
			var remainingDays = posOpt.daysToExpiry - getDayFraction();
			currentMetric = calcPremium(posOpt.type, posOpt.strike, ltp, Math.max(0.01, remainingDays), stock.iv);
		}
	}

	// Trailing Stop Logic
	if (this.useTrailingStop && this.state !== "FLAT") {
		if (this.asset === "EQUITY") {
			if (this.state === "LONG" && currentMetric > this.highestPrice) {
				this.highestPrice = currentMetric;
				var newSl = this.highestPrice * (1 - (this.slPct / 100));
				if (newSl > this.slPrice) this.slPrice = newSl;
			}
			if (this.state === "SHORT" && currentMetric < this.lowestPrice) {
				this.lowestPrice = currentMetric;
				var newSl2 = this.lowestPrice * (1 + (this.slPct / 100));
				if (newSl2 < this.slPrice) this.slPrice = newSl2;
			}
		} else if (this.asset === "OPTIONS") {
			// Options are always a LONG position on the premium, regardless of CE or PE
			if (currentMetric > this.highestPrice) {
				this.highestPrice = currentMetric;
				var newSl3 = this.highestPrice * (1 - (this.slPct / 100));
				if (newSl3 > this.slPrice) this.slPrice = newSl3;
			}
		}
	}

	// Exit Logic
	if (this.state === "LONG" || this.state === "SHORT") {
		var hitSL = false;
		var hitTP = false;
		
		if (this.asset === "EQUITY") {
			hitSL = (this.state === "LONG" && currentMetric <= this.slPrice) || (this.state === "SHORT" && currentMetric >= this.slPrice);
			hitTP = (this.state === "LONG" && currentMetric >= this.tpPrice) || (this.state === "SHORT" && currentMetric <= this.tpPrice);
		} else if (this.asset === "OPTIONS") {
			hitSL = currentMetric <= this.slPrice;
			hitTP = currentMetric >= this.tpPrice;
		}

		if (hitSL || hitTP) {
			if (this.asset === "EQUITY") {
				// Determine exit direction (Inverse of entry)
				var exitSide = this.state === "LONG" ? "SELL" : "BUY";
				
				if (stock.haltUntil) return;
				if (stock.circuitHit === "LC" && (exitSide === "SELL" || exitSide === "SHORT")) return;
				if (stock.circuitHit === "UC" && (exitSide === "BUY" || exitSide === "COVER")) return;

				var avail = stock.available_liquidity || 0;
				var fillQty = Math.min(this.qty, avail);

				if (fillQty > 0) {
					if (processEquityTrade(stock, exitSide, fillQty, ltp, true)) {
						stock.available_liquidity -= fillQty;
						this.qty -= fillQty;
						
						var pnl = this.state === "LONG" ? (ltp - this.entryPrice) * fillQty : (this.entryPrice - ltp) * fillQty;
						var pnlNative = pnl * fxRate;
						if (typeof BotManager !== "undefined" && BotManager.recordAnalytics) {
							BotManager.recordAnalytics(this.strategy, pnlNative);
						}
						
						if (this.qty <= 0) {
							this.state = "FLAT";
							toast("Bot ("+this.ticker+")", "Squared off " + exitSide + " position", "success");
						}
					}
				}
			} else if (this.asset === "OPTIONS" && this.optionId) {
				// Options Exit
				posOpt = state.optionsPositions[this.optionId];
				if (posOpt && posOpt.lots > 0) {
					var optType = posOpt.type;
					var strike = posOpt.strike;
					var expiryType = posOpt.expiryType;
					var optLotSize = posOpt.lotSize || (LOT_SIZES[this.ticker] || 100);

					var lotsToSell = Math.min(posOpt.lots, Math.floor(this.qty / optLotSize));
					if (lotsToSell > 0) {
						if (processOptionTrade(stock, "SELL", optType, strike, expiryType, lotsToSell, optLotSize, fxRate, true)) {
							// For options, currentMetric (ltp) is the current premium. entryPrice was the premium we bought at.
							pnlNative = (currentMetric - this.entryPrice) * (lotsToSell * optLotSize) * fxRate;
							if (typeof BotManager !== "undefined" && BotManager.recordAnalytics) {
								BotManager.recordAnalytics(this.strategy, pnlNative);
							}
							
							this.state = "FLAT";
							this.qty = 0;
							this.optionId = null;
							toast("Bot ("+this.ticker+")", "Squared off Option position", "success");
						}
					} else {
						this.state = "FLAT";
						this.qty = 0;
						this.optionId = null;
					}
				} else {
					this.state = "FLAT"; // User manually closed it probably
				}
			}
		}
		return; // Wait for FLAT to look for new entries
	}
	
	// Warmup check for new entries
	var prices = stock.preHistory && stock.preHistory.length 
		? stock.preHistory.concat(stock.history) 
		: stock.history;
	if (prices.length < 40) return; 

	// Signal Generation
	var signal = null; // null, "LONG", "SHORT"
	
	if (this.strategy && this.strategy.startsWith("CUSTOM_")) {
		var customBotDef = state.customStrategies ? state.customStrategies[this.strategy] : null;
		if (customBotDef) {
			try {
				var safeStock = Object.assign({}, stock);
				delete safeStock.history;
				delete safeStock.preHistory;
				
				if (!customBotDef.compiledFn || customBotDef.rawCode !== customBotDef.code) {
					customBotDef.compiledFn = new Function("context", "window", "document", "localStorage", "sessionStorage", "fetch", "XMLHttpRequest", "eval", customBotDef.code);
					customBotDef.rawCode = customBotDef.code;
				}
				var fn = customBotDef.compiledFn;
				
				if (!state.globalBotMemory) state.globalBotMemory = {};
				
				var mockContext = {
					stock: safeStock,
					history: prices.slice(),
					bot: this,
					memory: this.memory || {},
					global: state.globalBotMemory,
					utils: {
						ema: typeof calcEMA === "function" ? calcEMA : function(){return 0;},
						macd: typeof calcMACD === "function" ? calcMACD : function(){return 0;},
						rsi: typeof calcRSI === "function" ? calcRSI : function(){return 50;},
						bollingerBands: typeof calcBollingerBands === "function" ? calcBollingerBands : function(){return 0;}
					},
					log: function(msg) { toast("Bot Log (" + customBotDef.name + ")", msg, "info"); },
					plot: function() {}, // TBD
					drawMarker: function() {} // TBD
				};
				
				var result = fn(mockContext);
				this.memory = mockContext.memory; // save memory state
				
				// Handle dynamic return
				if (typeof result === "string") {
					signal = result;
				} else if (result && typeof result === "object") {
					if (result.signal) signal = result.signal;
					if (result.sl) this.slPrice = parseFloat(result.sl);
					if (result.tp) this.tpPrice = parseFloat(result.tp);
					if (result.slPct) this.slPct = parseFloat(result.slPct);
					if (result.tpPct) this.tpPct = parseFloat(result.tpPct);
					if (result.sl && signal) this._customSL = parseFloat(result.sl);
					if (result.tp && signal) this._customTP = parseFloat(result.tp);
				}
				
				// Validate direction constraints
				if (signal === "LONG" && this.direction === "SHORT_ONLY") signal = null;
				if (signal === "SHORT" && this.direction === "LONG_ONLY") signal = null;
			} catch(e) {
				console.error("Custom Bot Error:", e);
				// Silent fail on tick to avoid toast spam
			}
		}
	} else if (this.strategy === "CONFLUENCE") {
		var rsiData = calcRSI(prices, 14);
		var rsi = rsiData[rsiData.length - 1];
		var macdData = calcMACD(prices, 12, 26, 9);
		var hist = macdData.histogram;
		var histCurr = hist[hist.length - 1];
		var histPrev = hist[hist.length - 2];
		
		if (histCurr !== null && histPrev !== null) {
			// Bullish Cross
			if (rsi < 40 && histPrev < 0 && histCurr > 0) {
				if (this.direction === "LONG_SHORT" || this.direction === "LONG_ONLY") signal = "LONG";
			}
			// Bearish Cross
			if (rsi > 60 && histPrev > 0 && histCurr < 0) {
				if (this.direction === "LONG_SHORT" || this.direction === "SHORT_ONLY") signal = "SHORT";
			}
		}
	} else if (this.strategy === "MOMENTUM") {
		var r = pcg ? pcg.random() : Math.random();
		if (r < 0.05) {
			if (this.direction === "LONG_SHORT" || this.direction === "LONG_ONLY") signal = "LONG";
		} else if (r > 0.95) {
			if (this.direction === "LONG_SHORT" || this.direction === "SHORT_ONLY") signal = "SHORT";
		}
	} else if (this.strategy === "RSI_REVERSION") {
		rsiData = calcRSI(prices, 14);
		rsi = rsiData[rsiData.length - 1];
		if (rsi < 30) {
			if (this.direction === "LONG_SHORT" || this.direction === "LONG_ONLY") signal = "LONG";
		} else if (rsi > 70) {
			if (this.direction === "LONG_SHORT" || this.direction === "SHORT_ONLY") signal = "SHORT";
		}
	} else if (this.strategy === "TREND_FOLLOWER") {
		var maShort = calcSMA(prices, 9);
		var maLong = calcSMA(prices, 21);
		var shortCurr = maShort[maShort.length - 1];
		var shortPrev = maShort[maShort.length - 2];
		var longCurr = maLong[maLong.length - 1];
		var longPrev = maLong[maLong.length - 2];
		
		if (shortCurr !== null && longCurr !== null && shortPrev !== null && longPrev !== null) {
			if (shortPrev <= longPrev && shortCurr > longCurr) {
				if (this.direction === "LONG_SHORT" || this.direction === "LONG_ONLY") signal = "LONG";
			} else if (shortPrev >= longPrev && shortCurr < longCurr) {
				if (this.direction === "LONG_SHORT" || this.direction === "SHORT_ONLY") signal = "SHORT";
			}
		}
	} else if (this.strategy === "BOLLINGER_REVERSION") {
		var bb = calcBollingerBands(prices, 20, 2);
		var currentPrice = prices[prices.length - 1];
		var lowerBand = bb.lower[bb.lower.length - 1];
		var upperBand = bb.upper[bb.upper.length - 1];
		if (currentPrice < lowerBand) {
			if (this.direction === "LONG_SHORT" || this.direction === "LONG_ONLY") signal = "LONG";
		} else if (currentPrice > upperBand) {
			if (this.direction === "LONG_SHORT" || this.direction === "SHORT_ONLY") signal = "SHORT";
		}
	} else if (this.strategy === "EMA_CROSSOVER") {
		var emaFast = calcEMA(prices, 5);
		var emaSlow = calcEMA(prices, 20);
		var fastCurr = emaFast[emaFast.length - 1];
		var fastPrev = emaFast[emaFast.length - 2];
		var slowCurr = emaSlow[emaSlow.length - 1];
		var slowPrev = emaSlow[emaSlow.length - 2];
		if (fastCurr !== null && slowCurr !== null && fastPrev !== null && slowPrev !== null) {
			if (fastPrev <= slowPrev && fastCurr > slowCurr) {
				if (this.direction === "LONG_SHORT" || this.direction === "LONG_ONLY") signal = "LONG";
			} else if (fastPrev >= slowPrev && fastCurr < slowCurr) {
				if (this.direction === "LONG_SHORT" || this.direction === "SHORT_ONLY") signal = "SHORT";
			}
		}
	} else if (this.strategy === "MACD_MOMENTUM") {
		macdData = calcMACD(prices, 12, 26, 9);
		hist = macdData.histogram;
		histCurr = hist[hist.length - 1];
		histPrev = hist[hist.length - 2];
		if (histCurr !== null && histPrev !== null) {
			if (histPrev < 0 && histCurr > 0) {
				if (this.direction === "LONG_SHORT" || this.direction === "LONG_ONLY") signal = "LONG";
			} else if (histPrev > 0 && histCurr < 0) {
				if (this.direction === "LONG_SHORT" || this.direction === "SHORT_ONLY") signal = "SHORT";
			}
		}
	} else if (this.strategy === "HFT_SCALPER") {
		var n = prices.length;
		if (prices[n-1] > prices[n-2] && prices[n-2] > prices[n-3] && prices[n-3] > prices[n-4]) {
			if (this.direction === "LONG_SHORT" || this.direction === "LONG_ONLY") signal = "LONG";
		} else if (prices[n-1] < prices[n-2] && prices[n-2] < prices[n-3] && prices[n-3] < prices[n-4]) {
			if (this.direction === "LONG_SHORT" || this.direction === "SHORT_ONLY") signal = "SHORT";
		}
	} else if (this.strategy === "HFT_STAT_ARB") {
		var period = 20;
		n = prices.length;
		var slice = prices.slice(n - period, n);
		var mean = 0;
		for (var j = 0; j < slice.length; j++) mean += slice[j];
		mean /= period;
		var variance = 0;
		for (var k2 = 0; k2 < slice.length; k2++) variance += (slice[k2] - mean) * (slice[k2] - mean);
		var stdDev = Math.sqrt(variance / period);
		var zScore = stdDev > 0 ? (prices[n-1] - mean) / stdDev : 0;
		
		if (zScore < -2.0) {
			if (this.direction === "LONG_SHORT" || this.direction === "LONG_ONLY") signal = "LONG";
		} else if (zScore > 2.0) {
			if (this.direction === "LONG_SHORT" || this.direction === "SHORT_ONLY") signal = "SHORT";
		}
	} else if (this.strategy === "HFT_VOLATILITY") {
		let bb = calcBollingerBands(prices, 10, 1.5);
		let currentPrice = prices[prices.length - 1];
		let lowerBand = bb.lower[bb.lower.length - 1];
		let upperBand = bb.upper[bb.upper.length - 1];
		if (currentPrice > upperBand) { 
			if (this.direction === "LONG_SHORT" || this.direction === "SHORT_ONLY") signal = "SHORT";
		} else if (currentPrice < lowerBand) { 
			if (this.direction === "LONG_SHORT" || this.direction === "LONG_ONLY") signal = "LONG";
		}
	}
	
	// Entry Execution
	if (signal) {
		var ltpINR = ltp * fxRate;
		var riskAmount = state.margin * (this.riskPct / 100);

		if (this.asset === "EQUITY") {
			var side = signal === "LONG" ? "BUY" : "SELL"; // SELL opens a short position
			if (stock.haltUntil) return;
			if (stock.circuitHit === "UC" && (side === "BUY" || side === "COVER")) return;
			if (stock.circuitHit === "LC" && (side === "SELL" || side === "SHORT")) return;

			var maxQty = Math.floor(riskAmount / ltpINR);
			if (maxQty > 0) {
				avail = stock.available_liquidity || 0;
				fillQty = Math.min(maxQty, avail);
				
				if (fillQty > 0) {
					if (processEquityTrade(stock, side, fillQty, ltp, true)) {
						stock.available_liquidity -= fillQty;
						var executionPrice = ltp;
						this.qty = fillQty;
						this.entryPrice = executionPrice;
						this.highestPrice = executionPrice;
						this.lowestPrice = executionPrice;
						this.slPrice = this._customSL || (signal === "LONG" ? executionPrice * (1 - (this.slPct / 100)) : executionPrice * (1 + (this.slPct / 100))); 
						this.tpPrice = this._customTP || (signal === "LONG" ? executionPrice * (1 + (this.tpPct / 100)) : executionPrice * (1 - (this.tpPct / 100)));
						this.state = signal;
						this._customSL = null; this._customTP = null;
						toast("Bot ("+this.ticker+")", "Opened " + signal + " Equity position for " + fillQty, "success");
					}
				}
			}
		} else if (this.asset === "OPTIONS") {
			optType = signal === "LONG" ? "CALL" : "PUT";
			
			// Find ATM Strike
			var strikes = generateStrikes(stock);
			strike = strikes.reduce(function(prev, curr) {
				return (Math.abs(curr - ltp) < Math.abs(prev - ltp) ? curr : prev);
			});
			var nextWeekly = Math.ceil(state.day / 5) * 5;
			if (nextWeekly < state.day) nextWeekly = state.day + (5 - (state.day % 5));
			expiryType = String(nextWeekly);
			var botDaysToExpiry = nextWeekly - state.day + 1;
			remainingDays = Math.max(0.01, botDaysToExpiry - getDayFraction());
			
			var premium = calcPremium(optType, strike, ltp, remainingDays, stock.iv);
			var lotSize = LOT_SIZES[this.ticker] || 100;
			var lotCostINR = (premium * lotSize) * fxRate;
			
			var lots = lotCostINR > 0 ? Math.floor(riskAmount / lotCostINR) : 0;
			if (lots === 0 && riskAmount > 0 && state.margin >= lotCostINR) {
				lots = 1;
			}
			if (lots > 0) {
				if (processOptionTrade(stock, "BUY", optType, strike, expiryType, lots, lotSize, fxRate, true, undefined, botDaysToExpiry)) {
					this.qty = lots * lotSize;
					var optPosKey = stock.ticker + "_" + optType + "_" + strike + "_" + expiryType;
					var optPos = state.optionsPositions[optPosKey];
					var fillPrice = optPos ? optPos.avgPremium : premium;
					this.entryPrice = fillPrice;
					this.highestPrice = fillPrice;
					this.lowestPrice = fillPrice;
					this.slPrice = this._customSL || (fillPrice * (1 - (this.slPct / 100))); 
					this.tpPrice = this._customTP || (fillPrice * (1 + (this.tpPct / 100)));
					this.state = signal;
					this._customSL = null; this._customTP = null;
					this.optionId = optPosKey;
					toast("Bot ("+this.ticker+")", "Opened " + signal + " Options position ("+lots+" Lots)", "success");
				}
			}
		}
	}
};


var BotManager = {
	activeBots: {},

	start: function(ticker, config) {
		if (this.activeBots[ticker]) {
			toast("Bot Error", "Bot is already running on " + ticker, "error");
			return;
		}
		var stock = stockMap[ticker];
		if (!stock) return;
		if (stock.market === "INDEX" && config.asset === "EQUITY") {
			toast("Bot Error", "Cannot trade Equity on Indices. Use Options asset class.", "error");
			return;
		}

		this.activeBots[ticker] = new BotInstance(ticker, config);
		toast("Bot Engine", "Bot launched on " + ticker, "success");
		this.updateUI(ticker);
		this.renderStats();
	},

	stop: function(ticker) {
  		if (this.activeBots[ticker]) {
  			var bot = this.activeBots[ticker];
  			var stock = stockMap[ticker];
  			var fxRate = EXCHANGE_RATES[stock && stock.currency] || 1;
  			
  			// Charge server fee on stop
  			if (typeof state !== "undefined") {
  				var daysActive = state.day - bot.startDay;
  				var currentTick = state.time;
  				var ticksActive = currentTick - bot.startTime + (daysActive * 1440);
  				var cost = Math.max(0, Math.floor(ticksActive * (1000 / 60)));
  				if (cost > 0) {
  					state.margin -= cost;
  					var h = Math.floor(ticksActive / 60);
  					var m = ticksActive % 60;
  					toast("Server Costs", "Billed ₹" + cost.toLocaleString("en-IN") + " for " + ticker + " bot (" + h + "h " + m + "m)", "warning");
  					if (typeof renderTopBar !== "undefined") renderTopBar();
  				}
  			}
  			
  			if (bot.state !== "FLAT" && stock) {
  				if (bot.asset === "EQUITY") {
  					var exitSide = bot.state === "LONG" ? "SELL" : "BUY";
  					if (processEquityTrade(stock, exitSide, bot.qty, stock.ltp, true)) {
						var pnl = bot.state === "LONG" ? (stock.ltp - bot.entryPrice) * bot.qty : (bot.entryPrice - stock.ltp) * bot.qty;
						var pnlNative = pnl * fxRate;
						if (typeof BotManager !== "undefined" && BotManager.recordAnalytics) {
							BotManager.recordAnalytics(bot.strategy, pnlNative);
						}
  						toast("Bot Engine", "Auto-squared off Equity position", "warning");
  					}
  				} else if (bot.asset === "OPTIONS" && bot.optionId) {
  					var posOpt = state.optionsPositions[bot.optionId];
  					if (posOpt && posOpt.lots > 0) {
  						var optType = posOpt.type;
  						var optStrike = posOpt.strike;
  						var optExpiryType = posOpt.expiryType;
  						var optLotSize = posOpt.lotSize || (LOT_SIZES[bot.ticker] || 100);
  						var lotsToSell = Math.min(posOpt.lots, Math.floor(bot.qty / optLotSize));
  						if (lotsToSell > 0) {
  							if (processOptionTrade(stock, "SELL", optType, optStrike, optExpiryType, lotsToSell, optLotSize, fxRate, true)) {
								var optDays = Math.max(0.01, posOpt.daysToExpiry - getDayFraction());
								var ltpPrem = calcPremium(optType, optStrike, stock.ltp, optDays, stock.iv);
								pnlNative = (ltpPrem - bot.entryPrice) * (lotsToSell * optLotSize) * fxRate;
								if (typeof BotManager !== "undefined" && BotManager.recordAnalytics) {
									BotManager.recordAnalytics(bot.strategy, pnlNative);
								}
  								toast("Bot Engine", "Auto-squared off Options position", "warning");
  							}
  						}
  					}
  				}
  			}

  			delete this.activeBots[ticker];
  			toast("Bot Engine", "Bot stopped on " + ticker, "warning");
  			this.updateUI(ticker);
  			this.renderStats();
  			if (typeof renderAll === "function") renderAll();
  		}
  	},

	recordAnalytics: function(strategy, pnl) {
		if (typeof state === "undefined") return;
		state.botAnalytics = state.botAnalytics || {};
		if (!state.botAnalytics[strategy]) {
			state.botAnalytics[strategy] = { totalTrades: 0, winningTrades: 0, totalPnl: 0 };
		}
		state.botAnalytics[strategy].totalTrades++;
		if (pnl > 0) state.botAnalytics[strategy].winningTrades++;
		state.botAnalytics[strategy].totalPnl += pnl;
	},

	toggle: function() {
		var ticker = state.activeStock ? state.activeStock.ticker : null;
		if (!ticker) return toast("Bot Error", "Select a stock first", "error");

		if (this.activeBots[ticker]) {
			this.stop(ticker);
		} else {
			var riskVal = parseInt(document.getElementById("bot-risk-slider").value, 10);
			var slVal = parseFloat(document.getElementById("bot-sl-pct").value) || 1;
			var tpVal = parseFloat(document.getElementById("bot-tp-pct").value) || 2;
			var config = {
				direction: document.getElementById("bot-direction").value,
				asset: document.getElementById("bot-asset").value,
				strategy: document.getElementById("bot-strategy").value,
				riskPct: Math.max(1, Math.min(100, isNaN(riskVal) ? 5 : riskVal)),
				slPct: Math.max(0.1, Math.min(100, isNaN(slVal) ? 1 : slVal)),
				tpPct: Math.max(0.1, Math.min(500, isNaN(tpVal) ? 2 : tpVal)),
				useTrailingStop: document.getElementById("bot-trailing-stop").checked,
				autoShutdown: document.getElementById("bot-auto-shutdown") ? document.getElementById("bot-auto-shutdown").checked : true
			};
			this.start(ticker, config);
		}
	},

	updateUI: function(currentTicker) {
		if (!state.activeStock || state.activeStock.ticker !== currentTicker) return;
		
		var bot = this.activeBots[currentTicker];
		var display = document.getElementById("bot-state-display");
		var btnText = document.getElementById("bot-btn-text");
		var btnToggle = document.getElementById("btn-toggle-bot");

		if (bot) {
			if (display) {
				display.textContent = bot.state === "FLAT" ? "RUNNING" : (bot.state + " (" + bot.qty + ")");
				display.style.color = bot.state === "FLAT" ? "var(--green)" : "var(--accent)";
			}
			if (btnText) btnText.innerHTML = '<i class="fa-solid fa-stop"></i> STOP ENGINE';
			if (btnToggle) btnToggle.style.setProperty('--accent', 'var(--red)');
		} else {
			if (display) {
				display.textContent = "OFFLINE";
				display.style.color = "var(--text-dim)";
			}
			if (btnText) btnText.innerHTML = '<i class="fa-solid fa-power-off"></i> START ENGINE';
			if (btnToggle) btnToggle.style.setProperty('--accent', 'var(--accent)');
		}
	},

	tickAll: function() {
		if (!state.marketOpen) return;
		var tickers = Object.keys(this.activeBots);
		for (var i = 0; i < tickers.length; i++) {
			var ticker = tickers[i];
			var bot = this.activeBots[ticker];
			var stock = typeof stockMap !== "undefined" ? stockMap[ticker] : null;
			
			if (bot.autoShutdown && stock && typeof isMarketOpen !== "undefined" && !isMarketOpen(stock, state.time)) {
				if (typeof toast !== "undefined") toast("Bot Engine", "Auto-shutdown triggered for " + ticker + " due to market close.", "info");
				this.stop(ticker);
				continue;
			}
			
			// Bug #8b fix: wrap each bot's tick() in a try/catch so a single crashing
			// bot cannot stop all other bots or prevent renderAll() from running.
			try {
				bot.tick();
			} catch (botTickErr) {
				console.error("Bot tick error for " + ticker + ":", botTickErr);
			}
		}
		
		
		// Update active stock UI dynamically
		if (state.activeStock && this.activeBots[state.activeStock.ticker]) {
			this.updateUI(state.activeStock.ticker);
		}

		if (state.activeBottomTab === "bot-stats") {
			this.renderStats();
		}
	},

	renderStats: function() {
		var tbody = document.getElementById("bot-stats-tbody");
		if (!tbody) return;
		
		var tickers = Object.keys(this.activeBots);
		var html = "";
		
		// Add Analytics Header Row
		if (typeof state !== "undefined" && state.botAnalytics && Object.keys(state.botAnalytics).length > 0) {
			var statsHtml = "";
			for (var strat in state.botAnalytics) {
				var stat = state.botAnalytics[strat];
				var winRate = stat.totalTrades > 0 ? Math.round((stat.winningTrades / stat.totalTrades) * 100) : 0;
				var pnlColor = stat.totalPnl >= 0 ? "var(--green)" : "var(--red)";
				var pnlSign = stat.totalPnl >= 0 ? "+" : "";
				statsHtml += "<div style='display:inline-block; margin-right:15px; padding:5px; background:rgba(255,255,255,0.05); border-radius:4px;'><span style='color:var(--accent); font-weight:bold;'>" + strat + ":</span> <span style='font-size:11px'>Win: " + winRate + "% | P&L: <span style='color:" + pnlColor + "'>" + pnlSign + "₹" + stat.totalPnl.toLocaleString("en-IN", {maximumFractionDigits:0}) + "</span></span></div>";
			}
			html += "<tr><td colspan='9' style='text-align:left; padding:8px; border-bottom:1px solid var(--border);'>" + statsHtml + "</td></tr>";
		}

		if (tickers.length === 0) {
			html += '<tr><td colspan="9" class="empty">No active bots running</td></tr>';
			tbody.innerHTML = html;
			return;
		}

		for (var i = 0; i < tickers.length; i++) {
			var ticker = tickers[i];
			var bot = this.activeBots[ticker];
			var stock = stockMap[ticker];
			if (!stock) continue;
			
			var ltp = stock.ltp;
			var pnlNative = 0;
			
			var displayLtp = ltp;
			
			if (bot.state !== "FLAT") {
				if (bot.asset === "EQUITY") {
					pnlNative = bot.state === "LONG" ? (ltp - bot.entryPrice) * bot.qty : (bot.entryPrice - ltp) * bot.qty;
				} else if (bot.asset === "OPTIONS" && bot.optionId) {
					var posOpt = state.optionsPositions[bot.optionId];
					if (posOpt) {
						var remainingDays = posOpt.daysToExpiry - getDayFraction();
						var currentPrem = calcPremium(posOpt.type, posOpt.strike, ltp, Math.max(0.01, remainingDays), stock.iv);
						pnlNative = (currentPrem - posOpt.avgPremium) * bot.qty;
						displayLtp = currentPrem;
					}
				}
			}
			
			var fxRate = EXCHANGE_RATES[stock.currency] || 1;
			var pnlINR = pnlNative * fxRate;
			var pnlCls = pnlINR >= 0 ? "up" : "dn";
			var escapedTicker = ticker.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
			html += '<tr style="cursor:pointer;" onclick="selectStock(stockMap[\''+escapedTicker+'\'])">' +
				'<td class="sym-cell">'+ticker+'</td>' +
				'<td>'+bot.asset+'</td>' +
				'<td class="'+(bot.state === 'LONG'?'side-long':(bot.state==='SHORT'?'side-short':''))+'">'+(bot.state)+'</td>' +
				'<td class="r">'+bot.qty+'</td>' +
				'<td class="r">'+bot.entryPrice.toFixed(2)+'</td>' +
				'<td class="r">'+(bot.state !== "FLAT" ? bot.slPrice.toFixed(2) : "-")+'</td>' +
				'<td class="r">'+displayLtp.toFixed(2)+'</td>' +
				'<td class="r '+pnlCls+'">'+fmtCur(pnlINR)+'</td>' +
				'<td class="r"><button class="btn-sm" style="background:var(--red);color:white;border:none;padding:2px 6px;border-radius:4px;cursor:pointer;" onclick="event.stopPropagation(); BotManager.stop(\''+escapedTicker+'\')">STOP</button></td>' +
			'</tr>';
		}
		tbody.innerHTML = html;
	}
};

// Bind UI event once on load
// NOTE: Bot button, slider, selectStock wrapping, and custom strategy loading
// are initialized in ui_events.js initUIEvents(), which runs AFTER loadComponents()
// has injected the HTML templates into the DOM. Doing it here in DOMContentLoaded
// would race against the async component loading and silently fail.

// --- Custom Bot Hot-Reloading ---
function updateStrategyDropdown() {
    var sel = document.getElementById("bot-strategy");
    if (!sel) return;
    Array.from(sel.options).forEach(function(opt) {
        if (opt.value.startsWith("CUSTOM_")) sel.removeChild(opt);
    });
    Object.keys(state.customStrategies || {}).forEach(function(id) {
        var opt = document.createElement("option");
        opt.value = id;
        opt.textContent = "CUSTOM: " + (state.customStrategies[id].name || id);
        sel.appendChild(opt);
    });
};

window.addEventListener("storage", function(e) {
    if (e.key === "customStrategies") {
        try {
            state.customStrategies = JSON.parse(e.newValue);
            updateStrategyDropdown();
        } catch(err) {
            console.error("Error parsing custom strategies from storage", err);
        }
    }
});




// Auto-generated ES exports
export { BotManager, updateStrategyDropdown };
