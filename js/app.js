import { getExpiryDays, generateStrikes, calcGreeks, calcPremium, openOptionChain, closeOptionChain, processOptionTrade, executeOptionStrategy } from './options.js';
import { renderSyndicateInventory, openSyndicateCrate, showCrateReveal, toggleSyndicateView } from './syndicate.js';
import { generatePreHistory, generateIndexPreHistory, buildPreOHLC, mkStock, getNewsTargets } from './data.js';
import { clearChartInstance, clearSubChartInstance, buildPanelChart, chartInstance, multiChartInstances, renderChart, renderSubChart, setChartLayout, setChartScale, setChartType, setIntervalDropdown, setViewLength, setupDrawingListenersForCanvas, setupDrawingTools, subChartInstance, updateAllPanels, updatePanelChart } from './charts.js';
import { loadGame, saveGame, wipeGameData } from './storage.js';
import { generateTemplatedNews, newsEvents } from './news.js';
import { calcCurrentNAV, mutualFunds } from './investments.js';
import { BotManager } from './bot.js';
import { btChartInstance } from './studio.js';
import { closeTerminalCustomization, openTerminalCustomization, tcState } from './customization.js';
import { renderIPOUI, renderMFUI, processDailyInvestments } from './investments.js';
import { updateAnalyticsLive, renderAnalytics } from './analytics.js';
import { isMultiplayerClient, isMultiplayerHost, broadcastMarketTick, queueNewsForBroadcast, sendOrderToHost } from './multiplayer.js';


/**
 * Dalal Street Terminal v3
 * 25 Stocks, 80+ News Events, Modifiable Cash, Circuit Limits,
 * NIFTY Index, Trade History, Market Sentiment, Volume Simulation
 */

class PcgRandom {
	constructor(seed) {
		this.state = BigInt(seed || Date.now()) * 6364136223846793005n + 1442695040888963407n;
		this.inc = 1442695040888963407n;
	}
	random() {
		const oldState = this.state;
		this.state = (oldState * 6364136223846793005n + this.inc) & 0xFFFFFFFFFFFFFFFFn;
		const xorshifted = Number((((oldState >> 18n) ^ oldState) >> 27n) & 0xFFFFFFFFn);
		const rot = Number(oldState >> 59n);
		const result = (xorshifted >>> rot) | (xorshifted << ((-rot) & 31));
		return (result >>> 0) / 4294967296.0;
	}
}
var pcg = new PcgRandom();

export function escapeHTML(str) {
	return String(str).replace(/[&<>"']/g, function(m) {
		return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m];
	});
}

// ==================== CONFIG ====================
var INITIAL_MARGIN = 100000;
var START_TIME = 0; // 12:00 AM IST
var END_TIME = 24 * 60; // 11:59 PM IST (Full 24 hrs)
var NEWS_FREQ = 0.04; // 4% per tick
var VOL_MULTIPLIER = 1; // volatility multiplier
var CIRCUIT_TIERS = [0.10, 0.15, 0.20, 0.25, 0.30];

var CORRELATION_MATRIX = {
	// Commodities
	"CRUDE": [
		{ target: "OILGAS", correlation: 0.8 },
		{ target: "ENERGY", correlation: 0.6 },
		{ target: "ASIANPAINT", correlation: -0.6 },
		{ target: "AUTO", correlation: -0.3 },
		{ target: "FMCG", correlation: -0.2 }
	],
	"NATGAS": [
		{ target: "POWER", correlation: -0.4 },
		{ target: "ENERGY", correlation: 0.5 },
		{ target: "OILGAS", correlation: 0.4 }
	],
	"COPPER": [
		{ target: "METAL", correlation: 0.8 },
		{ target: "INFRA", correlation: -0.3 },
		{ target: "AUTO", correlation: -0.2 }
	],
	"ALUM": [
		{ target: "METAL", correlation: 0.7 },
		{ target: "AUTO", correlation: -0.2 }
	],
	"ZINC": [
		{ target: "METAL", correlation: 0.6 }
	],
	"LEAD": [
		{ target: "METAL", correlation: 0.5 },
		{ target: "AUTO", correlation: -0.1 }
	],
	"PALLAD": [
		{ target: "AUTO", correlation: -0.3 }
	],
	"PLAT": [
		{ target: "AUTO", correlation: -0.2 }
	],
	"GOLD": [
		{ target: "TITAN", correlation: 0.5 },
		{ target: "MUTHOOTFIN", correlation: 0.5 }
	],
	"SILVER": [
		{ target: "TITAN", correlation: 0.4 }
	],
	"ALL_COMM": [
		{ target: "METAL", correlation: 0.8 },
		{ target: "FMCG", correlation: -0.4 },
		{ target: "AUTO", correlation: -0.3 }
	],

	// Bonds / Yields
	"US10Y": [
		{ target: "ALL_NASDAQ", correlation: -0.7 },
		{ target: "IT", correlation: -0.5 },
		{ target: "BANK", correlation: 0.3 },
		{ target: "GOLD", correlation: -0.4 }
	],
	"US02Y": [
		{ target: "ALL_NASDAQ", correlation: -0.6 },
		{ target: "BANK", correlation: 0.2 }
	],
	"JP10Y": [
		{ target: "ALL_TSE", correlation: -0.4 }
	],

	// Forex
	"USDINR": [
		{ target: "IT", correlation: 0.6 },
		{ target: "PHARMA", correlation: 0.5 },
		{ target: "FMCG", correlation: -0.3 },
		{ target: "AUTO", correlation: -0.3 }
	],
	"USDJPY": [
		{ target: "ALL_TSE", correlation: 0.6 }
	],
	"AUDUSD": [
		{ target: "METAL", correlation: 0.4 }
	],
	"USDCAD": [
		{ target: "CRUDE", correlation: -0.5 }
	],
	"EURUSD": [
		{ target: "IT", correlation: 0.3 },
		{ target: "PHARMA", correlation: 0.2 }
	],
	"GBPUSD": [
		{ target: "IT", correlation: 0.2 }
	],
	"CNYINR": [
		{ target: "METAL", correlation: 0.5 },
		{ target: "ALL_SSE", correlation: 0.6 }
	],
	"ALL_USD_FX": [
		{ target: "IT", correlation: 0.5 },
		{ target: "GOLD", correlation: -0.6 }
	],

	// Indices / Macros
	"ALL_NASDAQ": [
		{ target: "IT", correlation: 0.8 }
	],
	"ALL_US": [
		{ target: "ALL_NASDAQ", correlation: 0.9 },
		{ target: "IT", correlation: 0.7 }
	],
	"ALL_EU": [
		{ target: "AUTO", correlation: 0.4 },
		{ target: "PHARMA", correlation: 0.3 }
	],
	"ALL_SSE": [
		{ target: "METAL", correlation: 0.6 }
	],

	// Cryptos
	"ALL_CRYPTO": [
		{ target: "NVDA", correlation: 0.4 },
		{ target: "AMD", correlation: 0.3 },
		{ target: "COIN", correlation: 0.8 }
	],
	"BTC": [
		{ target: "COIN", correlation: 0.8 },
		{ target: "ALL_CRYPTO", correlation: 0.9 }
	],
	ALL_INDEX: [
		{ target: "ALL", correlation: 0.8 },
		{ target: "ALL_US", correlation: 0.5 },
		{ target: "ALL_EU", correlation: 0.4 },
	],
	ALL_HKEX: [
		{ target: "ALL_SSE", correlation: 0.7 },
		{ target: "ALL_TSE", correlation: 0.3 },
	],

	// Sectors
	"BANK": [
		{ target: "INFRA", correlation: 0.4 },
		{ target: "AUTO", correlation: 0.4 }
	]
};

// Currency exchange rates: 1 unit of foreign currency = X INR  (Feb 28, 2026)
var EXCHANGE_RATES = {
	INR: 1,
	USD: 91.03,
	CNY: 13.28,
	JPY: 0.583,
	HKD: 11.67,
	GBP: 115.5,
	EUR: 98.5,
	AUD: 54.2,
	CAD: 61.3,
	CHF: 102.4,
};

function getFxRate(currency) {
	if (!currency || currency === "INR") return 1;
	return EXCHANGE_RATES[currency] || 1;
}

var VIEW_LENGTHS = [
	{ label: "1D", viewLen: 375 },
	{ label: "1W", viewLen: 1875 },
	{ label: "1M", viewLen: 8250 },
];

var INTERVALS = [
	{ label: "5m", candlePeriod: 5 },
	{ label: "15m", candlePeriod: 15 },
	{ label: "30m", candlePeriod: 30 },
	{ label: "1h", candlePeriod: 60 },
	{ label: "1d", candlePeriod: 375 },
	{ label: "1w", candlePeriod: 1875 },
];

// ==================== PRE-HISTORY GENERATOR ====================
// Generates 66 days × 375 ticks of realistic price history using a seeded LCG PRNG
// so each stock always gets the same deterministic pattern on every simulation reset.


// Generates perfectly concurrent index pre-history based on market-cap weighted constituents


// Build OHLC candles from pre-history ticks (for candle chart on pre-data)


var LOT_SIZES = {
	RELIANCE: 250,
	TCS: 150,
	HDFCBANK: 550,
	ITC: 1600,
	INFY: 300,
	SBIN: 1500,
	ICICIBANK: 700,
	ZOMATO: 2000,
	SUNPHARMA: 350,
	TATAMOTORS: 1425,
	MARUTI: 100,
	TATASTEEL: 3000,
	BHARTIARTL: 500,
	ADANIENT: 250,
	HINDUNILVR: 300,
	BAJFINANCE: 125,
	HCLTECH: 350,
	WIPRO: 1500,
	LT: 150,
	KOTAKBANK: 400,
	AXISBANK: 600,
	POWERGRID: 2700,
	NTPC: 900,
	COALINDIA: 1500,
	JSWSTEEL: 675,
	BAJAJFINSV: 250,
	TECHM: 600,
	LTIM: 150,
	MM: 700,
	EICHERMOT: 125,
	CIPLA: 650,
	DRREDDY: 125,
	BRITANNIA: 200,
	NESTLEIND: 25,
	TATACONSUM: 575,
	ONGC: 1775,
	BPCL: 1800,
	TITAN: 375,
	ULTRACEMCO: 100,
	PAYTM: 4350,
	IRCTC: 450,
	BEL: 3500,
	// NASDAQ
	AAPL: 100,
	MSFT: 100,
	NVDA: 100,
	TSLA: 100,
	META: 100,
	GOOGL: 100,
	AMZN: 100,
	NFLX: 100,
	AMD: 100,
	ADBE: 100,
	AVGO: 100,
	COIN: 100,
	PLTR: 100,
	MU: 100,
	// SSE
	MOUTAI: 100,
	ICBC: 1000,
	CMBANK: 500,
	PINGAN: 500,
	PETROCH: 1000,
	BYD: 100,
	CATL: 100,
	LONGI: 1000,
	SAIC: 500,
	CITICS: 500,
	// TSE
	TOYOTA: 100,
	SONY: 100,
	SOFTBNK: 100,
	HONDA: 100,
	NINTNDO: 100,
	MUFG: 100,
	FASTRET: 10,
	KEYENCE: 10,
	DAIKIN: 10,
	CANON7751: 100,
	// Commodities
	GOLD: 10,
	SILVER: 100,
	COPPER: 10,
	ALUM: 10,
	ZINC: 10,
};

// Helper to make a stock entry cleanly


var marketStocks = [
	// -- Bonds / Fixed Income (Yields) --
	mkStock("US10Y", "US 10-Year Yield", 4.25, 0.0005, "Bond", "BOND", "USD"),
	mkStock("US02Y", "US 2-Year Yield", 4.6, 0.0006, "Bond", "BOND", "USD"),
	mkStock("IN10Y", "India 10-Year Yield", 7.1, 0.0004, "Bond", "BOND", "INR"),
	mkStock("CN10Y", "China 10-Year Yield", 2.4, 0.0005, "Bond", "BOND", "CNY"),
	mkStock("DE10Y", "German 10-Year Bund", 2.35, 0.0007, "Bond", "BOND", "EUR"),
	mkStock("UK10Y", "UK 10-Year Gilt", 4.1, 0.0005, "Bond", "BOND", "GBP"),
	mkStock("JP10Y", "Japan 10-Year JGB", 0.85, 0.001, "Bond", "BOND", "JPY"),
	mkStock(
		"AU10Y",
		"Australia 10-Year Yield",
		4.15,
		0.0006,
		"Bond",
		"BOND",
		"AUD",
	),
	mkStock("CA10Y", "Canada 10-Year Yield", 3.55, 0.0005, "Bond", "BOND", "CAD"),
	mkStock("CH10Y", "Swiss 10-Year Yield", 0.7, 0.0008, "Bond", "BOND", "CHF"),
	// -- Indices --
	mkStock("NIFTY 50", "Nifty 50 Index", 22500, 0.0008, "Index", "INDEX", "INR"),
	mkStock("SENSEX", "BSE Sensex", 74500, 0.0008, "Index", "INDEX", "INR"),
	mkStock(
		"BANKNIFTY",
		"Nifty Bank Index",
		47800,
		0.0012,
		"Index",
		"INDEX",
		"INR",
	),
	mkStock(
		"FINNIFTY",
		"Nifty Financial Services",
		21200,
		0.0012,
		"Index",
		"INDEX",
		"INR",
	),
	mkStock("SPX500", "S&P 500 Index", 5100, 0.0009, "Index", "INDEX", "USD"),
	mkStock("NDX100", "NASDAQ 100 Index", 18000, 0.0013, "Index", "INDEX", "USD"),
	mkStock(
		"DJIA",
		"Dow Jones Industrial",
		39000,
		0.0007,
		"Index",
		"INDEX",
		"USD",
	),
	mkStock("NIKKEI225", "Nikkei 225", 39200, 0.0011, "Index", "INDEX", "JPY"),
	mkStock("SHCOMP", "Shanghai Composite", 3050, 0.001, "Index", "INDEX", "CNY"),
	mkStock("HSI", "Hang Seng Index", 16500, 0.0014, "Index", "INDEX", "HKD"),
	mkStock("FTSE100", "FTSE 100", 7900, 0.0009, "Index", "INDEX", "GBP"),
	mkStock(
		"DAX",
		"DAX Performance Index",
		17800,
		0.0011,
		"Index",
		"INDEX",
		"EUR",
	),
	mkStock("CAC40", "CAC 40", 8100, 0.001, "Index", "INDEX", "EUR"),
	mkStock("STOXX600", "STOXX Europe 600", 510, 0.0008, "Index", "INDEX", "EUR"),
	// -- Banking & Finance --  (prices: Feb 28, 2026)
	mkStock("HDFCBANK", "HDFC Bank Ltd", 1755, 0.002, "Banking", "NSE", "INR", 7590000000),
	mkStock("SBIN", "State Bank of India", 715, 0.003, "Banking", "NSE", "INR", 8920000000),
	mkStock("ICICIBANK", "ICICI Bank", 1275, 0.0022, "Banking", "NSE", "INR", 7020000000),
	mkStock("KOTAKBANK", "Kotak Mahindra Bank", 2010, 0.0019, "Banking", "NSE", "INR", 1980000000),
	mkStock("AXISBANK", "Axis Bank Ltd", 1050, 0.0024, "Banking", "NSE", "INR", 3080000000),
	mkStock("INDUSINDBK", "IndusInd Bank", 1550, 0.0028, "Banking", "NSE", "INR", 770000000),
	mkStock("PNB", "Punjab National Bank", 135, 0.004, "Banking", "NSE", "INR", 11010000000),
	mkStock("BANKBARODA", "Bank of Baroda", 270, 0.0035, "Banking", "NSE", "INR", 5170000000),
	mkStock("FEDERALBNK", "Federal Bank", 170, 0.003, "Banking", "NSE", "INR", 2430000000),
	mkStock("IDFCFIRSTB", "IDFC First Bank", 85, 0.0045, "Banking", "NSE", "INR", 7050000000),
	mkStock("AUBANK", "AU Small Finance", 620, 0.0038, "Banking", "NSE", "INR", 660000000),
	mkStock("BANDHANBNK", "Bandhan Bank", 210, 0.004, "Banking", "NSE", "INR", 1610000000),
	mkStock("BAJFINANCE", "Bajaj Finance Ltd", 7450, 0.0028, "Finance", "NSE", "INR", 610000000),
	mkStock("BAJAJFINSV", "Bajaj Finserv Ltd", 2015, 0.0022, "Finance", "NSE", "INR", 1590000000),
	mkStock("HDFCLIFE", "HDFC Life", 650, 0.0025, "Finance", "NSE", "INR", 2150000000),
	mkStock("SBILIFE", "SBI Life Insurance", 1550, 0.0022, "Finance", "NSE", "INR", 1000000000),
	mkStock("CHOLAFIN", "Chola Investment", 1250, 0.003, "Finance", "NSE", "INR", 840000000),
	mkStock("MUTHOOTFIN", "Muthoot Finance", 1650, 0.0028, "Finance", "NSE", "INR", 400000000),
	mkStock("SHRIRAMFIN", "Shriram Finance", 2450, 0.003, "Finance", "NSE", "INR", 370000000),
	mkStock("PFC", "Power Finance Corp", 450, 0.0035, "Finance", "NSE", "INR", 3300000000),
	mkStock("RECLTD", "REC Ltd", 510, 0.0035, "Finance", "NSE", "INR", 2630000000),
	mkStock("DALAL", "Dalal Street Inc.", 10000, 0.0015, "Financials", "NSE", "INR", 1000000000),
	// -- IT --
	mkStock("TCS", "Tata Consultancy Services", 3560, 0.0014, "IT", "NSE", "INR", 3650000000),
	mkStock("INFY", "Infosys Ltd", 1870, 0.0025, "IT", "NSE", "INR", 4140000000),
	mkStock("HCLTECH", "HCL Technologies", 1720, 0.002, "IT", "NSE", "INR", 2710000000),
	mkStock("WIPRO", "Wipro Ltd", 295, 0.0026, "IT", "NSE", "INR", 5220000000),
	mkStock("TECHM", "Tech Mahindra Ltd", 1685, 0.0022, "IT", "NSE", "INR", 970000000),
	mkStock("LTIM", "LTIMindtree Ltd", 5150, 0.002, "IT", "NSE", "INR", 290000000),
	// -- Energy & Conglomerate --
	mkStock("RELIANCE", "Reliance Industries", 1225, 0.0018, "Energy", "NSE", "INR", 6760000000),
	mkStock("ONGC", "Oil & Natural Gas Corp", 235, 0.0025, "Energy", "NSE", "INR", 12580000000),
	mkStock("BPCL", "Bharat Petroleum Corp", 265, 0.0028, "Energy", "NSE", "INR", 4330000000),
	// -- Power --
	mkStock("NTPC", "NTPC Ltd", 320, 0.0018, "Power", "NSE", "INR", 9690000000),
	mkStock("POWERGRID", "Power Grid Corporation", 305, 0.0015, "Power", "NSE", "INR", 9300000000),
	// -- Infra --
	mkStock("ADANIENT", "Adani Enterprises", 2185, 0.004, "Infra", "NSE", "INR", 1140000000),
	mkStock("ADANIPORTS", "Adani Ports", 1350, 0.0035, "Infra", "NSE", "INR", 2160000000),
	mkStock("LT", "Larsen & Toubro", 3255, 0.0016, "Infra", "NSE", "INR", 1370000000),
	mkStock("BEL", "Bharat Electronics Ltd", 255, 0.003, "Defense", "NSE", "INR", 7300000000),
	// -- Auto --
	mkStock("TATAMOTORS", "Tata Motors Ltd", 665, 0.0035, "Auto", "NSE", "INR", 3320000000),
	mkStock("MARUTI", "Maruti Suzuki India", 11800, 0.0016, "Auto", "NSE", "INR", 314000000),
	mkStock("MM", "Mahindra & Mahindra", 2855, 0.0022, "Auto", "NSE", "INR", 1240000000),
	mkStock("EICHERMOT", "Eicher Motors Ltd", 5035, 0.0018, "Auto", "NSE", "INR", 270000000),
	mkStock("BAJAJ-AUTO", "Bajaj Auto Ltd", 9500, 0.002, "Auto", "NSE", "INR", 280000000),
	mkStock("HEROMOTOCO", "Hero MotoCorp", 4800, 0.002, "Auto", "NSE", "INR", 200000000),
	// -- Pharma --
	mkStock("SUNPHARMA", "Sun Pharma Industries", 1745, 0.0018, "Pharma", "NSE", "INR", 2390000000),
	mkStock("CIPLA", "Cipla Ltd", 1555, 0.002, "Pharma", "NSE", "INR", 800000000),
	mkStock("DRREDDY", "Dr Reddy's Laboratories", 1165, 0.0022, "Pharma", "NSE", "INR", 166000000),
	mkStock("DIVISLAB", "Divi's Laboratories", 4200, 0.0025, "Pharma", "NSE", "INR", 260000000),
	mkStock("APOLLOHOSP", "Apollo Hospitals", 6200, 0.002, "Pharma", "NSE", "INR", 140000000),
	// -- Metals & Mining --
	mkStock("TATASTEEL", "Tata Steel Ltd", 140, 0.0038, "Metal", "NSE", "INR", 12400000000),
	mkStock("JSWSTEEL", "JSW Steel Ltd", 930, 0.0032, "Metal", "NSE", "INR", 2440000000),
	mkStock("COALINDIA", "Coal India Ltd", 355, 0.0022, "Metal", "NSE", "INR", 6160000000),
	mkStock("HINDALCO", "Hindalco Industries", 650, 0.003, "Metal", "NSE", "INR", 2240000000),
	// -- FMCG & Consumer --
	mkStock("ITC", "ITC Ltd", 415, 0.001, "FMCG", "NSE", "INR", 12400000000),
	mkStock("HINDUNILVR", "Hindustan Unilever", 2290, 0.0012, "FMCG", "NSE", "INR", 2350000000),
	mkStock("BRITANNIA", "Britannia Industries", 4755, 0.0016, "FMCG", "NSE", "INR", 240000000),
	mkStock("NESTLEIND", "Nestle India Ltd", 2155, 0.0014, "FMCG", "NSE", "INR", 960000000),
	mkStock("TATACONSUM", "Tata Consumer Products", 960, 0.0022, "FMCG", "NSE", "INR", 920000000),
	mkStock("ASIANPAINT", "Asian Paints", 2950, 0.0016, "Consumer", "NSE", "INR", 950000000),
	mkStock("TITAN", "Titan Company Ltd", 3155, 0.0018, "Consumer", "NSE", "INR", 880000000),
	mkStock("TRENT", "Trent Ltd", 4300, 0.003, "Consumer", "NSE", "INR", 350000000),
	// -- Telecom --
	mkStock("BHARTIARTL", "Bharti Airtel", 1730, 0.002, "Telecom", "NSE", "INR", 5660000000),
	// -- Cement --
	mkStock("ULTRACEMCO", "UltraTech Cement Ltd", 10300, 0.0016, "Cement", "NSE", "INR", 280000000),
	mkStock("GRASIM", "Grasim Industries", 2300, 0.002, "Cement", "NSE", "INR", 680000000),
	// -- New Age Tech --
	mkStock("ZOMATO", "Zomato Ltd", 235, 0.005, "Tech", "NSE", "INR", 8800000000),
	mkStock("PAYTM", "One97 Communications", 855, 0.006, "Tech", "NSE", "INR", 630000000),
	mkStock("IRCTC", "IRCTC Ltd", 775, 0.003, "Tech", "NSE", "INR", 800000000),
	// -- NASDAQ --  (USD prices, post-split adjusted, Feb 2026)
	mkStock("AAPL", "Apple Inc.", 264, 0.0018, "Tech", "NASDAQ", "USD", 15400000000),
	mkStock("MSFT", "Microsoft Corp.", 393, 0.0016, "Tech", "NASDAQ", "USD", 7400000000),
		mkStock("NVDA", "NVIDIA Corp.", 177, 0.004, "Semicon", "NASDAQ", "USD", 24500000000), // post 10:1 split Jun'24
	mkStock("TSLA", "Tesla Inc.", 403, 0.0055, "EV", "NASDAQ", "USD", 3180000000),
	mkStock("META", "Meta Platforms", 648, 0.003, "SocMedia", "NASDAQ", "USD", 2540000000),
	mkStock("GOOGL", "Alphabet Inc.", 311, 0.002, "Tech", "NASDAQ", "USD", 12400000000),
	mkStock("AMZN", "Amazon.com Inc.", 210, 0.0025, "E-Comm", "NASDAQ", "USD", 10400000000),
	mkStock("NFLX", "Netflix Inc.", 96, 0.0035, "Streaming", "NASDAQ", "USD", 4300000000), // post 10:1 split Feb'26
	mkStock("AMD", "Advanced Micro Devices", 200, 0.0045, "Semicon", "NASDAQ", "USD", 1620000000),
	mkStock("ADBE", "Adobe Inc.", 262, 0.0022, "Software", "NASDAQ", "USD", 450000000),
	mkStock("AVGO", "Broadcom Inc.", 320, 0.003, "Semicon", "NASDAQ", "USD", 4600000000),
	mkStock("COIN", "Coinbase Global", 176, 0.007, "Crypto", "NASDAQ", "USD", 240000000),
	mkStock("PLTR", "Palantir Technologies", 137, 0.006, "AI/Data", "NASDAQ", "USD", 2130000000),
	mkStock("MU", "Micron Technology", 412, 0.004, "Semicon", "NASDAQ", "USD", 1100000000),
	// -- SSE (Shanghai) --  (CNY)
	mkStock("MOUTAI", "Kweichow Moutai", 1535, 0.0018, "Liquor", "SSE", "CNY", 1256000000),
	mkStock(
		"ICBC",
		"Ind & Comm Bank China",
		7.1,
		0.0015,
		"Banking",
		"SSE",
		"CNY",
	),
	mkStock("CMBANK", "China Merchants Bank", 48, 0.002, "Banking", "SSE", "CNY", 25200000000),
	mkStock("PINGAN", "Ping An Insurance", 52, 0.0022, "Insurance", "SSE", "CNY", 18200000000),
	mkStock("PETROCH", "PetroChina Co.", 10.8, 0.002, "Energy", "SSE", "CNY", 183000000000),
	mkStock("BYD", "BYD Co. Ltd.", 285, 0.0035, "EV", "SSE", "CNY", 2900000000),
	mkStock("CATL", "CATL (CATLSH)", 242, 0.0032, "EV Battery", "SSE", "CNY", 4400000000),
	mkStock("LONGI", "LONGi Green Energy", 18, 0.004, "Solar", "SSE", "CNY", 7500000000),
	mkStock("SAIC", "SAIC Motor Corp.", 22, 0.0028, "Auto", "SSE", "CNY", 11600000000),
	mkStock("CITICS", "CITIC Securities", 28, 0.0025, "Finance", "SSE", "CNY", 14800000000),
	mkStock("SINOPEC", "Sinopec Corp.", 6.5, 0.0018, "Energy", "SSE", "CNY", 119000000000),
	mkStock("AGBANK", "Agricultural Bank", 4.5, 0.0015, "Banking", "SSE", "CNY", 349000000000),
	mkStock(
		"CHINALIFE",
		"China Life Insurance",
		45,
		0.002,
		"Insurance",
		"SSE",
		"CNY",
	),
	mkStock("ZTE", "ZTE Corporation", 35, 0.0035, "Telecom", "SSE", "CNY", 4700000000),
	mkStock(
		"BAOSTEEL",
		"Baoshan Iron & Steel",
		6.8,
		0.0022,
		"Steel",
		"SSE",
		"CNY",
	),
	// -- TSE (Japan) --  (JPY)
	mkStock("TOYOTA", "Toyota Motor Corp.", 2755, 0.0018, "Auto", "TSE", "JPY", 13500000000),
	mkStock("SONY", "Sony Group Corp.", 2850, 0.0025, "Consumer", "TSE", "JPY", 126000000),
	mkStock(
		"SOFTBNK",
		"SoftBank Group Corp.",
		10200,
		0.0035,
		"Tech",
		"TSE",
		"JPY",
	),
	mkStock("HONDA", "Honda Motor Co.", 1450, 0.0022, "Auto", "TSE", "JPY", 4800000000),
	mkStock("NINTNDO", "Nintendo Co. Ltd.", 870, 0.0028, "Gaming", "TSE", "JPY", 12900000000), // post 10:1 split Oct'24
	mkStock(
		"MUFG",
		"Mitsubishi UFJ Financial",
		2908,
		0.002,
		"Banking",
		"TSE",
		"JPY",
	),
	mkStock(
		"FASTRET",
		"Fast Retailing (Uniqlo)",
		52000,
		0.0022,
		"Retail",
		"TSE",
		"JPY",
	),
	mkStock(
		"KEYENCE",
		"Keyence Corp.",
		63000,
		0.0018,
		"Automation",
		"TSE",
		"JPY",
	),
	mkStock("DAIKIN", "Daikin Industries", 22500, 0.0022, "HVAC", "TSE", "JPY", 290000000),
	mkStock("CANON7751", "Canon Inc.", 4250, 0.002, "Tech", "TSE", "JPY", 1000000000),
	mkStock("NISSAN", "Nissan Motor Co.", 650, 0.0025, "Auto", "TSE", "JPY", 3900000000),
	mkStock(
		"PANASONIC",
		"Panasonic Holdings",
		1450,
		0.0022,
		"Electronics",
		"TSE",
		"JPY",
	),
	mkStock("HITACHI", "Hitachi Ltd.", 13500, 0.002, "Industrial", "TSE", "JPY", 930000000),
	mkStock("MITSUI", "Mitsui & Co.", 7200, 0.0025, "Trading", "TSE", "JPY", 1500000000),
	mkStock("NIDEC", "Nidec Corp.", 6800, 0.003, "Components", "TSE", "JPY", 570000000),
	// -- European (EU) -- (EUR / GBP)
	mkStock("LVMH", "LVMH Moet Hennessy", 780, 0.002, "Luxury", "EU", "EUR", 500000000),
	mkStock("ASML", "ASML Holding N.V.", 850, 0.0025, "Tech", "EU", "EUR", 390000000),
	mkStock("SAP", "SAP SE", 160, 0.0022, "Tech", "EU", "EUR", 1200000000),
	mkStock("SIEMENS", "Siemens AG", 175, 0.002, "Industrial", "EU", "EUR", 800000000),
	mkStock("LOREAL", "L'Oreal S.A.", 420, 0.0018, "Consumer", "EU", "EUR", 530000000),
	mkStock("AZN", "AstraZeneca PLC", 10500, 0.0022, "Pharma", "EU", "GBP", 1550000000),
	mkStock("SHEL", "Shell PLC", 2650, 0.002, "Energy", "EU", "GBP", 6300000000),
	mkStock("HSBA", "HSBC Holdings", 630, 0.0025, "Banking", "EU", "GBP", 19000000000),
	// -- Commodities --  (USD)
	mkStock("GOLD", "Gold (USD/oz)", 5248, 0.0012, "Precious", "COMM", "USD"),
	mkStock("SILVER", "Silver (USD/oz)", 93, 0.0025, "Precious", "COMM", "USD"),
	mkStock(
		"COPPER",
		"Copper (USD/ton)",
		13360,
		0.0025,
		"Industrial",
		"COMM",
		"USD",
	),
	mkStock(
		"ALUM",
		"Aluminium (USD/ton)",
		2645,
		0.002,
		"Industrial",
		"COMM",
		"USD",
	),
	mkStock("ZINC", "Zinc (USD/ton)", 2955, 0.0022, "Industrial", "COMM", "USD"),
	mkStock("CRUDE", "Crude Oil (WTI)", 78, 0.015, "Energy", "COMM", "USD"),
	mkStock("NATGAS", "Natural Gas", 2.5, 0.025, "Energy", "COMM", "USD"),
	mkStock("PLAT", "Platinum (USD/oz)", 985, 0.003, "Precious", "COMM", "USD"),
	mkStock(
		"PALLAD",
		"Palladium (USD/oz)",
		950,
		0.004,
		"Precious", "COMM", "USD",
	),
	mkStock("LEAD", "Lead (USD/ton)", 2100, 0.002, "Industrial", "COMM", "USD"),
	mkStock("WHEAT", "Wheat (USD/bu)", 5.8, 0.0015, "Agriculture", "COMM", "USD"),
	mkStock("CORN", "Corn (USD/bu)", 4.2, 0.0012, "Agriculture", "COMM", "USD"),
	mkStock("SOYBEAN", "Soybeans (USD/bu)", 11.5, 0.0018, "Agriculture", "COMM", "USD"),
	mkStock("COFFEE", "Coffee (USD/lb)", 2.1, 0.002, "Agriculture", "COMM", "USD"),
	mkStock("SUGAR", "Sugar (USD/lb)", 0.20, 0.0025, "Agriculture", "COMM", "USD"),
	mkStock("POWER", "Electricity (USD/MWh)", 45.0, 0.003, "Energy", "COMM", "USD"),
	mkStock("CARBON", "Carbon Credits (EUR/ton)", 65.0, 0.0025, "Energy", "COMM", "EUR"),
	mkStock("URANIUM", "Uranium (USD/lb)", 90.0, 0.0015, "Energy", "COMM", "USD"),
	// -- Forex (FX) --
	mkStock("USDINR", "US Dollar / INR", 83.50, 0.001, "Currency", "FX", "INR"),
	mkStock("EURINR", "Euro / INR", 90.00, 0.0015, "Currency", "FX", "INR"),
	mkStock("GBPINR", "British Pound / INR", 105.00, 0.002, "Currency", "FX", "INR"),
	mkStock("JPYINR", "Japanese Yen / INR", 0.55, 0.0025, "Currency", "FX", "INR"),
	mkStock("CNYINR", "Chinese Yuan / INR", 11.50, 0.001, "Currency", "FX", "INR"),
	mkStock("HKDINR", "Hong Kong Dollar / INR", 10.65, 0.001, "Currency", "FX", "INR"),
	mkStock("EURUSD", "Euro / US Dollar", 1.08, 0.001, "Currency", "FX", "USD"),
	mkStock("GBPUSD", "Pound / US Dollar", 1.25, 0.0012, "Currency", "FX", "USD"),
	mkStock("USDJPY", "US Dollar / Yen", 151.8, 0.0015, "Currency", "FX", "JPY"),
	// -- Crypto --  (USD)
	mkStock("BTC", "Bitcoin", 65000, 0.012, "Crypto", "CRYPTO", "USD"),
	mkStock("ETH", "Ethereum", 3500, 0.015, "Crypto", "CRYPTO", "USD"),
	mkStock("SOL", "Solana", 145, 0.025, "Crypto", "CRYPTO", "USD"),
	mkStock("BNB", "Binance Coin", 580, 0.018, "Crypto", "CRYPTO", "USD"),
	mkStock("XRP", "Ripple", 0.55, 0.02, "Crypto", "CRYPTO", "USD"),
	mkStock("ADA", "Cardano", 0.45, 0.03, "Crypto", "CRYPTO", "USD"),
	mkStock("DOGE", "Dogecoin", 0.15, 0.04, "Crypto", "CRYPTO", "USD"),
	mkStock("DOT", "Polkadot", 7.20, 0.035, "Crypto", "CRYPTO", "USD"),
	mkStock("LINK", "Chainlink", 18.50, 0.03, "Crypto", "CRYPTO", "USD"),
	mkStock("AVAX", "Avalanche", 35.00, 0.038, "Crypto", "CRYPTO", "USD"),
	mkStock("MATIC", "Polygon", 0.70, 0.032, "Crypto", "CRYPTO", "USD"),
	mkStock("TON", "Toncoin", 6.50, 0.028, "Crypto", "CRYPTO", "USD"),
	mkStock("TENCENT", "Tencent Holdings", 310, 0.0022, "Tech", "HKEX", "HKD", 9400000000),
	mkStock("BABA", "Alibaba Group", 75, 0.0028, "E-Comm", "HKEX", "HKD", 20000000000),
	mkStock("MEITUAN", "Meituan", 110, 0.0035, "Consumer", "HKEX", "HKD", 6200000000),
	mkStock("AIA", "AIA Group", 60, 0.0018, "Insurance", "HKEX", "HKD", 11200000000),
	mkStock("HSBC_HK", "HSBC Holdings HK", 62, 0.0015, "Banking", "HKEX", "HKD", 19000000000),
	mkStock("XIAOMI", "Xiaomi Corp", 18, 0.004, "Tech", "HKEX", "HKD", 25000000000),
];

// -- Index Constituents --
var INDEX_CONSTITUENTS = {
	// -- India --
	"NIFTY 50": [
		"HDFCBANK", "SBIN", "ICICIBANK", "KOTAKBANK", "AXISBANK", "INDUSINDBK",
		"BAJFINANCE", "BAJAJFINSV", "HDFCLIFE", "SBILIFE", "TCS", "INFY",
		"HCLTECH", "WIPRO", "TECHM", "LTIM", "RELIANCE", "ONGC", "BPCL",
		"NTPC", "POWERGRID", "ADANIENT", "ADANIPORTS", "LT", "BEL",
		"TATAMOTORS", "MARUTI", "MM", "EICHERMOT", "BAJAJ-AUTO", "HEROMOTOCO",
		"SUNPHARMA", "CIPLA", "DRREDDY", "DIVISLAB", "APOLLOHOSP", "TATASTEEL",
		"JSWSTEEL", "COALINDIA", "HINDALCO", "ITC", "HINDUNILVR", "BRITANNIA",
		"NESTLEIND", "TATACONSUM", "ASIANPAINT", "TITAN", "TRENT", "ULTRACEMCO", "GRASIM"
	],
	"SENSEX": [
		"HDFCBANK", "SBIN", "ICICIBANK", "KOTAKBANK", "AXISBANK", "INDUSINDBK",
		"BAJFINANCE", "BAJAJFINSV", "TCS", "INFY", "HCLTECH", "WIPRO", "TECHM",
		"RELIANCE", "NTPC", "POWERGRID", "LT", "TATAMOTORS", "MARUTI", "MM",
		"SUNPHARMA", "TATASTEEL", "JSWSTEEL", "ITC", "HINDUNILVR", "NESTLEIND",
		"ASIANPAINT", "TITAN", "ULTRACEMCO", "BHARTIARTL"
	],
	"BANKNIFTY": [
		"HDFCBANK", "SBIN", "ICICIBANK", "KOTAKBANK", "AXISBANK", "INDUSINDBK",
		"PNB", "BANKBARODA", "FEDERALBNK", "IDFCFIRSTB", "AUBANK", "BANDHANBNK"
	],
	"FINNIFTY": [
		"HDFCBANK", "SBIN", "ICICIBANK", "KOTAKBANK", "AXISBANK", "BAJFINANCE",
		"BAJAJFINSV", "HDFCLIFE", "SBILIFE", "CHOLAFIN", "MUTHOOTFIN", "SHRIRAMFIN",
		"PFC", "RECLTD"
	],
	// -- USA (USD) --
	"SPX500": [
		"AAPL", "MSFT", "NVDA", "TSLA", "META", "GOOGL", "AMZN", "NFLX",
		"AMD", "ADBE", "AVGO", "COIN", "PLTR", "MU"
	],
	"NDX100": [
		"AAPL", "MSFT", "NVDA", "META", "GOOGL", "AMZN", "NFLX",
		"AMD", "ADBE", "AVGO", "PLTR", "MU"
	],
	"DJIA": [
		"AAPL", "MSFT", "AMZN", "NVDA", "GOOGL", "META"
	],
	// -- Japan (JPY) --
	"NIKKEI225": [
		"TOYOTA", "SONY", "SOFTBNK", "HONDA", "NINTNDO", "MUFG", "FASTRET",
		"KEYENCE", "DAIKIN", "CANON7751", "NISSAN", "PANASONIC", "HITACHI", "MITSUI", "NIDEC"
	],
	// -- China (CNY) --
	"SHCOMP": [
		"MOUTAI", "ICBC", "CMBANK", "PINGAN", "PETROCH", "BYD", "CATL",
		"LONGI", "SAIC", "CITICS", "SINOPEC", "AGBANK", "CHINALIFE", "ZTE", "BAOSTEEL"
	],
	// -- Hong Kong (HKD) --
	"HSI": [
		"TENCENT", "BABA", "MEITUAN", "AIA", "HSBC_HK", "XIAOMI"
	],
	// -- UK (GBP) --
	"FTSE100": [
		"AZN", "SHEL", "HSBA"
	],
	// -- Europe (EUR) --
	"DAX": [
		"SAP", "SIEMENS", "ASML"
	],
	"CAC40": [
		"LVMH", "LOREAL", "ASML"
	],
	"STOXX600": [
		"LVMH", "ASML", "SAP", "SIEMENS", "LOREAL", "AZN", "SHEL", "HSBA"
	]
};

// O(1) ticker → stock reference map
var stockMap = {};
(function () {
	marketStocks.forEach(function (s) {
		stockMap[s.ticker] = s;
	});
})();

// Helper: reset concurrent index when its market opens
function resetConcurrentIndexGroup(currency) {
	marketStocks.forEach(function (indexStock) {
		var constituents = INDEX_CONSTITUENTS[indexStock.ticker];
		if (!constituents || indexStock.currency !== currency) return;
		indexStock.prevClose = indexStock.ltp;
		var totalPrevCap = 0, totalNewCap = 0;
		constituents.forEach(function (tk) {
			var comp = stockMap[tk];
			if (comp) {
				var shares = comp.shares || 100000000;
				totalPrevCap += comp.prevClose * shares;
				totalNewCap  += comp.ltp * shares;
			}
		});
		var overnightReturn = totalPrevCap > 0 ? (totalNewCap - totalPrevCap) / totalPrevCap : 0;
		indexStock.ltp        = parseFloat((indexStock.ltp * (1 + overnightReturn)).toFixed(2));
		indexStock.open       = indexStock.ltp;
		indexStock.base       = indexStock.ltp;
		indexStock._prevTick  = indexStock.ltp;
		indexStock.volume     = 0;
		indexStock.circuitHit = null;
		indexStock.history    = [indexStock.ltp];
		indexStock.volumeHistory = [0];
		indexStock.ohlcHistory   = [];
		indexStock.currentCandle = null;
	});
}


// Map target keywords to stocks


// ==================== STATE ====================
var state = {
	day: 1,
	time: START_TIME,
	margin: INITIAL_MARGIN,
	positions: {},
	optionsPositions: {},
	tradeHistory: [],
	botTradeHistory: [],
	customStrategies: {},
	mfHoldings: {},
	sips: {},
	mfHistory: {},
	globalBotMemory: {},
	inventory: {
		brokerageFreeDays: 0,
		bailoutCards: 0,
		insiderTips: [],
		marketFreezeMinutes: 0,
		profitBoostDays: 0,
		circuitOverrideDays: 0,
	},
	marketFreezeActive: false,
	marketFreezeSecondsLeft: 0,
	loans: [],
	loanHistory: [],
	fixedDeposits: [],
	cibilScore: 750,
	nextLoanId: 1,
	nextFdId: 1,
	totalBrokerage: 0,
	isRunning: true,
	speedMs: 1000,
	activeStock: null,
	historyLen: 1875,
	upcomingIPOs: [],
	ipoApplications: {},
	theme: "dark",
	font: "outfit",
	activeTab: "equity",
	activeBottomTab: "equity",
	newsCount: 0,
	marketOpen: true,
	niftyBase: 22500,
	niftyValue: 22500,
	niftyHistory: [],
	sensexBase: 74500,
	sensexValue: 74500,
	sentiment: 0, // -100 to +100
	chartType: "line",
	chartScale: "linear", // 'linear' | 'log' | 'pct'
	timeframe: "1D",
	viewLen: 375,
	candlePeriod: 5,
	slTargets: {}, // { ticker: { sl: num|null, target: num|null } }
	wlMarketFilter: "ALL", // watchlist market filter
	newsMarketFilter: "ALL", // news feed market filter
	showSMA: false,
	showEMA: false,
	showBB: false,
	showVWAP: false,
	showRSI: false,
	showMACD: false,
	// Drawing tools
	drawingMode: 'cursor',
	activeDrawings: {},
	drawingInProgress: null,
	// Multi-chart layout
	chartLayout: '1x',
	panelStates: [
		{ ticker: 'RELIANCE', viewLen: 375, candlePeriod: 5, chartType: 'line' },
		{ ticker: 'TCS', viewLen: 375, candlePeriod: 5, chartType: 'line' },
		{ ticker: 'HDFCBANK', viewLen: 375, candlePeriod: 5, chartType: 'line' },
		{ ticker: 'INFY', viewLen: 375, candlePeriod: 5, chartType: 'line' }
	],
	pendingOrders: [],
	marginCallThrottle: 0,
	realEstate: [],
	mortgages: [],
	propertyMarket: [
		{
			id: "prop1",
			name: "1BHK Apartment, Mumbai",
			type: "Residential",
			basePrice: 5000000,
			price: 5000000,
			yieldApr: 5.0,
		},
		{
			id: "prop2",
			name: "3BHK Villa, Bangalore",
			type: "Residential",
			basePrice: 25000000,
			price: 25000000,
			yieldApr: 4.5,
		},
		{
			id: "prop3",
			name: "Luxury Sea-facing Penthouse",
			type: "Luxury",
			basePrice: 100000000,
			price: 100000000,
			yieldApr: 3.5,
		},
		{
			id: "prop4",
			name: "Commercial Retail Shop",
			type: "Commercial",
			basePrice: 15000000,
			price: 15000000,
			yieldApr: 7.0,
		},
		{
			id: "prop5",
			name: "Downtown Tech Park",
			type: "Commercial",
			basePrice: 500000000,
			price: 500000000,
			yieldApr: 8.5,
		},
		{
			id: "prop6",
			name: "Private Island, Maldives",
			type: "Luxury",
			basePrice: 2500000000,
			price: 2500000000,
			yieldApr: 2.0,
		},
		// --- 24 New Global Properties ---
		{
			id: "prop7",
			name: "Studio Condo, Tokyo",
			type: "Residential",
			basePrice: 35000000,
			price: 35000000,
			yieldApr: 4.0,
		},
		{
			id: "prop8",
			name: "Suburban Home, Texas",
			type: "Residential",
			basePrice: 20000000,
			price: 20000000,
			yieldApr: 6.0,
		},
		{
			id: "prop9",
			name: "High-Rise Condo, Toronto",
			type: "Residential",
			basePrice: 45000000,
			price: 45000000,
			yieldApr: 4.5,
		},
		{
			id: "prop10",
			name: "Townhouse, London",
			type: "Residential",
			basePrice: 80000000,
			price: 80000000,
			yieldApr: 3.8,
		},
		{
			id: "prop11",
			name: "Beachfront Mansion, Malibu",
			type: "Luxury",
			basePrice: 400000000,
			price: 400000000,
			yieldApr: 2.5,
		},
		{
			id: "prop12",
			name: "Chalet, Swiss Alps",
			type: "Luxury",
			basePrice: 150000000,
			price: 150000000,
			yieldApr: 3.0,
		},
		{
			id: "prop13",
			name: "Penthouse, New York City",
			type: "Luxury",
			basePrice: 250000000,
			price: 250000000,
			yieldApr: 3.2,
		},
		{
			id: "prop14",
			name: "Palm Jumeirah Villa, Dubai",
			type: "Luxury",
			basePrice: 300000000,
			price: 300000000,
			yieldApr: 4.5,
		},
		{
			id: "prop15",
			name: "Historic Chateau, France",
			type: "Luxury",
			basePrice: 120000000,
			price: 120000000,
			yieldApr: 2.0,
		},
		{
			id: "prop16",
			name: "Skyscraper, Hong Kong",
			type: "Commercial",
			basePrice: 4000000000,
			price: 4000000000,
			yieldApr: 5.5,
		},
		{
			id: "prop17",
			name: "Industrial Warehouse, Germany",
			type: "Commercial",
			basePrice: 85000000,
			price: 85000000,
			yieldApr: 7.5,
		},
		{
			id: "prop18",
			name: "Casino Resort, Macau",
			type: "Commercial",
			basePrice: 5000000000,
			price: 5000000000,
			yieldApr: 9.0,
		},
		{
			id: "prop19",
			name: "Shopping Mall, Singapore",
			type: "Commercial",
			basePrice: 1500000000,
			price: 1500000000,
			yieldApr: 6.5,
		},
		{
			id: "prop20",
			name: "Data Center, Nevada",
			type: "Commercial",
			basePrice: 750000000,
			price: 750000000,
			yieldApr: 8.0,
		},
		{
			id: "prop21",
			name: "Boutique Hotel, Paris",
			type: "Commercial",
			basePrice: 200000000,
			price: 200000000,
			yieldApr: 5.0,
		},
		{
			id: "prop22",
			name: "Student Housing, Melbourne",
			type: "Commercial",
			basePrice: 40000000,
			price: 40000000,
			yieldApr: 6.8,
		},
		{
			id: "prop23",
			name: "Logistics Hub, Rotterdam",
			type: "Commercial",
			basePrice: 300000000,
			price: 300000000,
			yieldApr: 7.2,
		},
		{
			id: "prop24",
			name: "Coworking Space, Berlin",
			type: "Commercial",
			basePrice: 60000000,
			price: 60000000,
			yieldApr: 6.0,
		},
		{
			id: "prop25",
			name: "Farmhouse, Tuscany",
			type: "Residential",
			basePrice: 45000000,
			price: 45000000,
			yieldApr: 3.5,
		},
		{
			id: "prop26",
			name: "Micro-Apartment, Hong Kong",
			type: "Residential",
			basePrice: 15000000,
			price: 15000000,
			yieldApr: 5.5,
		},
		{
			id: "prop27",
			name: "Luxury Yacht Berth, Monaco",
			type: "Luxury",
			basePrice: 75000000,
			price: 75000000,
			yieldApr: 4.0,
		},
		{
			id: "prop28",
			name: "Safari Lodge, Kenya",
			type: "Commercial",
			basePrice: 90000000,
			price: 90000000,
			yieldApr: 8.5,
		},
		{
			id: "prop29",
			name: "Vineyard Estate, California",
			type: "Luxury",
			basePrice: 200000000,
			price: 200000000,
			yieldApr: 3.0,
		},
		{
			id: "prop30",
			name: "Medical Complex, Boston",
			type: "Commercial",
			basePrice: 600000000,
			price: 600000000,
			yieldApr: 7.8,
		},
	],
	reNews: [],
	nextPropId: 1,
};

var marketInterval;
var depthInterval = null;




// ==================== SUB-CHART (RSI / MACD) ====================


// ==================== DRAWING PLUGIN ====================
var drawingPlugin = {
	id: 'drawingPlugin',
	afterDraw: function(chart) {
		if (chart !== chartInstance && multiChartInstances.indexOf(chart) === -1) return; // Draw on main chart or panel charts
		var ctx = chart.ctx;
		var xScale = chart.scales.x;
		var yScale = chart.scales.y;
		if (!xScale || !yScale) return;
		var ticker = chart._panelTicker || (state.activeStock ? state.activeStock.ticker : null);
		if (!ticker) return;
		var drawings = state.activeDrawings[ticker] || [];
		var isLight = state.theme === 'light' || state.theme === 'sepia';
		var chartArea = chart.chartArea;
		if (!chartArea) return;
		var dataLen = (chart.data.datasets[0] && chart.data.datasets[0].data.length) || 0;
		if (!dataLen) return;

		ctx.save();
		ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
		ctx.clip();

		drawings.forEach(function(d) {
			ctx.globalAlpha = 0.85;
			if (d.type === 'trendline') {
				var x1 = xScale.getPixelForValue(d.x1);
				var y1 = yScale.getPixelForValue(d.y1);
				var x2 = xScale.getPixelForValue(d.x2);
				var y2 = yScale.getPixelForValue(d.y2);
				ctx.beginPath();
				ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
				ctx.strokeStyle = isLight ? '#2563eb' : '#60a5fa';
				ctx.lineWidth = 1.5;
				ctx.setLineDash([]);
				ctx.stroke();
				// Endpoint dots
				ctx.fillStyle = isLight ? '#2563eb' : '#60a5fa';
				ctx.beginPath(); ctx.arc(x1, y1, 3, 0, Math.PI * 2); ctx.fill();
				ctx.beginPath(); ctx.arc(x2, y2, 3, 0, Math.PI * 2); ctx.fill();

			} else if (d.type === 'hline') {
				var yPx = yScale.getPixelForValue(d.price);
				ctx.beginPath();
				ctx.moveTo(chartArea.left, yPx); ctx.lineTo(chartArea.right, yPx);
				ctx.strokeStyle = isLight ? '#0891b2' : '#06b6d4';
				ctx.lineWidth = 1.2;
				ctx.setLineDash([5, 4]);
				ctx.stroke();
				ctx.setLineDash([]);
				// Price label
				ctx.fillStyle = isLight ? '#0891b2' : '#06b6d4';
				ctx.font = '9px monospace';
				ctx.fillText(d.price.toFixed(2), chartArea.right + 2, yPx + 3);

			} else if (d.type === 'fib') {
				var fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
				var fibColors = isLight 
					? ['rgba(0,0,0,0.6)', 'rgba(202,138,4,0.8)', 'rgba(21,128,61,0.8)', 'rgba(29,78,216,0.8)', 'rgba(126,34,206,0.8)', 'rgba(190,18,60,0.8)', 'rgba(0,0,0,0.6)']
					: ['rgba(255,255,255,0.7)', 'rgba(253,224,71,0.8)', 'rgba(134,239,172,0.8)', 'rgba(147,197,253,0.8)', 'rgba(216,180,254,0.8)', 'rgba(253,164,175,0.8)', 'rgba(255,255,255,0.7)'];
				var x1Px = xScale.getPixelForValue(d.x1);
				var x2Px = xScale.getPixelForValue(d.x2);
				var fibLeft = Math.min(x1Px, x2Px);
				var fibRight = Math.max(x1Px, x2Px);
				var priceRange = d.y1 - d.y2;
				fibLevels.forEach(function(level, li) {
					var fibPrice = d.y2 + priceRange * (1 - level);
					var yPxF = yScale.getPixelForValue(fibPrice);

					// Draw Zone Background
					if (li > 0) {
						var prevLevel = fibLevels[li - 1];
						var prevFibPrice = d.y2 + priceRange * (1 - prevLevel);
						var prevYPxF = yScale.getPixelForValue(prevFibPrice);
						ctx.fillStyle = fibColors[li].replace(/[\d.]+\)/, '0.08)');
						ctx.fillRect(fibLeft, Math.min(yPxF, prevYPxF), fibRight - fibLeft, Math.abs(yPxF - prevYPxF));
					}

					ctx.beginPath();
					ctx.moveTo(fibLeft, yPxF); ctx.lineTo(fibRight, yPxF);
					ctx.strokeStyle = fibColors[li];
					ctx.lineWidth = 1;
					ctx.setLineDash([2, 4]);
					ctx.stroke();
					ctx.setLineDash([]);

					ctx.fillStyle = fibColors[li].replace(/[\d.]+\)/, '0.15)');
					var text = (level * 100).toFixed(1) + '%  ' + fibPrice.toFixed(2);
					ctx.textAlign = 'right';
					var tWidth = ctx.measureText(text).width;
					ctx.fillRect(chartArea.right - tWidth - 14, yPxF - 10, tWidth + 10, 14);

					ctx.fillStyle = fibColors[li].replace(/[\d.]+\)/, '0.9)');
					ctx.font = 'bold 10px monospace';
					ctx.fillText(text, chartArea.right - 9, yPxF + 3);
					ctx.textAlign = 'left';
				});
			}
		});

		// Draw in-progress drawing
		if (state.drawingInProgress) {
			var ip = state.drawingInProgress;
			ctx.globalAlpha = 0.6;
			if (ip.type === 'trendline') {
				ctx.beginPath();
				ctx.moveTo(ip.startPx, ip.startPy);
				ctx.lineTo(ip.curPx, ip.curPy);
				ctx.strokeStyle = isLight ? '#2563eb' : '#60a5fa';
				ctx.lineWidth = 1.5;
				ctx.setLineDash([4, 3]);
				ctx.stroke();
				ctx.setLineDash([]);
			} else if (ip.type === 'hline') {
				ctx.beginPath();
				ctx.moveTo(chartArea.left, ip.startPy);
				ctx.lineTo(chartArea.right, ip.startPy);
				ctx.strokeStyle = isLight ? '#d97706' : '#fbbf24';
				ctx.lineWidth = 1.2;
				ctx.setLineDash([5, 4]);
				ctx.stroke();
				ctx.setLineDash([]);
			} else if (ip.type === 'fib') {
				var fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
				var fibColors = isLight 
					? ['rgba(0,0,0,0.6)', 'rgba(202,138,4,0.8)', 'rgba(21,128,61,0.8)', 'rgba(29,78,216,0.8)', 'rgba(126,34,206,0.8)', 'rgba(190,18,60,0.8)', 'rgba(0,0,0,0.6)']
					: ['rgba(255,255,255,0.7)', 'rgba(253,224,71,0.8)', 'rgba(134,239,172,0.8)', 'rgba(147,197,253,0.8)', 'rgba(216,180,254,0.8)', 'rgba(253,164,175,0.8)', 'rgba(255,255,255,0.7)'];
				
				var curYVal = yScale.getValueForPixel(ip.curPy);
				var priceRange = ip.startY - curYVal;
				
				// Trendline connecting the two drag points
				ctx.beginPath();
				ctx.moveTo(ip.startPx, ip.startPy);
				ctx.lineTo(ip.curPx, ip.curPy);
				ctx.strokeStyle = 'rgba(255,255,255,0.7)';
				ctx.lineWidth = 1.5;
				ctx.setLineDash([4, 4]);
				ctx.stroke();
				ctx.setLineDash([]);

				fibLevels.forEach(function(level, li) {
					var fibPrice = curYVal + priceRange * (1 - level);
					var yPxF = yScale.getPixelForValue(fibPrice);

					if (li > 0) {
						var prevLevel = fibLevels[li - 1];
						var prevFibPrice = curYVal + priceRange * (1 - prevLevel);
						var prevYPxF = yScale.getPixelForValue(prevFibPrice);
						ctx.fillStyle = fibColors[li].replace(/[\d.]+\)/, '0.08)');
						ctx.fillRect(chartArea.left, Math.min(yPxF, prevYPxF), chartArea.right - chartArea.left, Math.abs(yPxF - prevYPxF));
					}

					ctx.beginPath();
					ctx.moveTo(chartArea.left, yPxF); ctx.lineTo(chartArea.right, yPxF);
					ctx.strokeStyle = fibColors[li];
					ctx.lineWidth = 1;
					ctx.setLineDash([2, 4]);
					ctx.stroke();
					ctx.setLineDash([]);

					ctx.fillStyle = fibColors[li].replace(/[\d.]+\)/, '0.15)');
					var text = (level * 100).toFixed(1) + '%  ' + fibPrice.toFixed(2);
					ctx.textAlign = 'right';
					var tWidth = ctx.measureText(text).width;
					ctx.fillRect(chartArea.right - tWidth - 14, yPxF - 10, tWidth + 10, 14);

					ctx.fillStyle = fibColors[li].replace(/[\d.]+\)/, '0.9)');
					ctx.font = 'bold 10px monospace';
					ctx.fillText(text, chartArea.right - 9, yPxF + 3);
					ctx.textAlign = 'left';
				});
			}
		}

		// Render Grab Handles
		if (state.drawingMode === 'cursor') {
			drawings.forEach(function(d, dIdx) {
				var pts = [];
				if (d.type === 'trendline' || d.type === 'fib') {
					pts.push({ id: dIdx + '_1', x: xScale.getPixelForValue(d.x1), y: yScale.getPixelForValue(d.y1) });
					pts.push({ id: dIdx + '_2', x: xScale.getPixelForValue(d.x2), y: yScale.getPixelForValue(d.y2) });
				} else if (d.type === 'hline') {
					var yPx = yScale.getPixelForValue(d.price);
					pts.push({ id: dIdx + '_line', x: chartArea.right - 40, y: yPx });
				}
				
				pts.forEach(function(pt) {
					var isHovered = state.hoveredAnchor && state.hoveredAnchor.id === pt.id;
					ctx.beginPath();
					ctx.arc(pt.x, pt.y, isHovered ? 6 : 4, 0, Math.PI * 2);
					ctx.fillStyle = isLight ? '#fff' : '#1e293b';
					ctx.fill();
					ctx.lineWidth = 2;
					ctx.strokeStyle = isHovered ? (isLight ? '#2563eb' : '#60a5fa') : (isLight ? '#94a3b8' : '#475569');
					ctx.stroke();
				});
			});
		}

		ctx.restore();
	}
};

// ==================== DRAWING TOOL SETUP ====================




// ==================== MULTI-CHART LAYOUT ====================








// ==================== CANDLESTICK PLUGIN ====================
var candlestickPlugin = {
	id: "candlestickDraw",
	afterDatasetsDraw: function (chart) {
		var ctx = chart.ctx;
		var xScale = chart.scales.x;
		var yScale = chart.scales.y;
		if (!xScale || !yScale) return;
		var ohlc = chart._ohlc;
		var volumes = chart._volumes;
		var isLight = state.theme === "light" || state.theme === "sepia";
		var chartArea = chart.chartArea;
		if (!chartArea) return;

		var computedStyle = getComputedStyle(document.body);
		var upColor = document.body.style.getPropertyValue('--green') || computedStyle.getPropertyValue('--green').trim() || (isLight ? "#00a846" : "#00c853");
		var downColor = document.body.style.getPropertyValue('--red') || computedStyle.getPropertyValue('--red').trim() || (isLight ? "#d50032" : "#ff1744");

		function hexToRgbaStr(hex, alpha) {
			hex = hex.replace('#', '');
			if(hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
			var r = parseInt(hex.substring(0,2), 16) || 0;
			var g = parseInt(hex.substring(2,4), 16) || 0;
			var b = parseInt(hex.substring(4,6), 16) || 0;
			return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
		}

		// -- Volume histogram (bottom 18% of chart) --
		if (volumes && volumes.length) {
			var volAreaH = (chartArea.bottom - chartArea.top) * 0.18;
			var volBottom = chartArea.bottom;
			var maxVol = 0;
			for (var vi = 0; vi < volumes.length; vi++) {
				if (volumes[vi] > maxVol) maxVol = volumes[vi];
			}
			if (maxVol > 0) {
				var volCW = Math.max(
					2,
					Math.floor((xScale.width / (volumes.length + 1)) * 0.65),
				);
				for (var vi2 = 0; vi2 < volumes.length; vi2++) {
					if (!volumes[vi2]) continue;
					var xv = xScale.getPixelForValue(vi2);
					var barH = (volumes[vi2] / maxVol) * volAreaH * 0.88;
					var isBullV =
						ohlc && ohlc[vi2]
							? ohlc[vi2].c >= ohlc[vi2].o
							: chart._lineData && vi2 > 0
								? chart._lineData[vi2] >= chart._lineData[vi2 - 1]
								: true;
					ctx.fillStyle = isBullV ? hexToRgbaStr(upColor, 0.25) : hexToRgbaStr(downColor, 0.25);
					ctx.fillRect(xv - volCW / 2, volBottom - barH, volCW, barH);
				}
			}
		}

		if (!ohlc || !ohlc.length) return;
		var count = ohlc.length;
		var rawW = xScale.width / (count + 1);
		var candleW = Math.max(2, Math.min(18, Math.floor(rawW * 0.7)));
		var wickW = candleW > 6 ? 1.5 : 1;

		ohlc.forEach(function (d, i) {
			var xPos = xScale.getPixelForValue(i);
			var openY = yScale.getPixelForValue(d.o);
			var closeY = yScale.getPixelForValue(d.c);
			var highY = yScale.getPixelForValue(d.h);
			var lowY = yScale.getPixelForValue(d.l);
			var isBull = d.c >= d.o;

			var bodyTop = Math.min(openY, closeY);
			var bodyH = Math.max(1.5, Math.abs(closeY - openY));

			var bullHi = upColor;
			var bullLo = upColor;
			var bearHi = downColor;
			var bearLo = downColor;

			// Wick (upper)
			ctx.beginPath();
			ctx.strokeStyle = isBull ? bullLo : bearLo;
			ctx.lineWidth = wickW;
			ctx.moveTo(xPos, highY);
			ctx.lineTo(xPos, bodyTop);
			ctx.stroke();
			// Wick (lower)
			ctx.beginPath();
			ctx.moveTo(xPos, bodyTop + bodyH);
			ctx.lineTo(xPos, lowY);
			ctx.stroke();

			// Candle body
			if (candleW >= 4) {
				try {
					var grad = ctx.createLinearGradient(
						xPos,
						bodyTop,
						xPos,
						bodyTop + bodyH,
					);
					grad.addColorStop(0, isBull ? bullHi : bearHi);
					grad.addColorStop(1, isBull ? bullLo : bearLo);
					ctx.fillStyle = grad;
				} catch (e) {
					ctx.fillStyle = isBull ? bullLo : bearLo;
				}
			} else {
				ctx.fillStyle = isBull ? bullLo : bearLo;
			}
			ctx.fillRect(xPos - candleW / 2, bodyTop, candleW, bodyH);

			// Doji / thin candle border highlight
			if (bodyH <= 2) {
				ctx.strokeStyle = isBull ? bullHi : bearHi;
				ctx.lineWidth = 1;
				ctx.strokeRect(
					xPos - candleW / 2,
					bodyTop,
					candleW,
					Math.max(1, bodyH),
				);
			}
		});
	},
};

// ==================== INIT ====================
export function initApp() {
	// 1. Generate PreHistory for all stocks FIRST so we have it regardless of load/new game
	marketStocks.forEach(function (s) {
		if (INDEX_CONSTITUENTS[s.ticker]) return; 
		s.preHistory = generatePreHistory(s, 66);
	});
	marketStocks.forEach(function (s) {
		if (INDEX_CONSTITUENTS[s.ticker]) {
			s.preHistory = generateIndexPreHistory(s, INDEX_CONSTITUENTS[s.ticker]);
		}
	});

	initMarket(); // Save system removed due to lag

	populateExpiryDropdown();
	setupListeners();
	setViewLength("1D"); // initialize interval button states on startup
	// Replaced by customization.js
	// applyTheme(state.theme);
	// applyFont(state.font || "outfit");

	// Load saved custom bot strategies into state so the bot engine can use them immediately
	try {
		var _savedStrats = localStorage.getItem("customStrategies");
		if (_savedStrats) state.customStrategies = JSON.parse(_savedStrats);
	} catch(e) { /* ignore */ }

	renderAll();
	startClock();

	// High-frequency HFT order book flicker (visual realism)
	depthInterval = setInterval(function () {
		if (
			state.activeStock &&
			!state.isPaused &&
			isMarketOpen(state.activeStock, state.time)
		) {
			renderMarketDepth(state.activeStock);
		}
	}, 400);

	// Keyboard Shortcuts
	window.addEventListener("keydown", function (e) {
		// Ignore if typing in an input/textarea
		if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

		if (e.key === " ") { // Space
			e.preventDefault();
			if (state.isPaused) setSpeed(state.simSpeed || 1000, document.getElementById("btn-play"));
			else activateMarketFreeze();
		} else if (e.key === "/") {
			e.preventDefault();
			var searchInp = document.getElementById("wl-search-input");
			if (searchInp) searchInp.focus();
		} else if (e.key.toLowerCase() === "b") {
			document.getElementById("btn-buy").click();
		} else if (e.key.toLowerCase() === "s") {
			document.getElementById("btn-sell").click();
		}
	});

	// setInterval(saveGame, 5000); // Removed due to lag
}

// Save system removed

// ==================== SAVE/LOAD SYSTEM ====================






function initMarket() {
	// 1. Generate history for all regular stocks
	marketStocks.forEach(function (s) {
		if (INDEX_CONSTITUENTS[s.ticker]) return; // Skip concurrent indices
		s.preHistory = generatePreHistory(s, 66);
	});

	// 2. Generate history for concurrent indices based on constituents
	marketStocks.forEach(function (s) {
		if (INDEX_CONSTITUENTS[s.ticker]) {
			s.preHistory = generateIndexPreHistory(s, INDEX_CONSTITUENTS[s.ticker]);
		}
	});

	// 3. Finalize initialization
	marketStocks.forEach(function (s) {
		s.preOHLC = buildPreOHLC(s, state.candlePeriod);
		s.history = [s.ltp];
		s.volumeHistory = [0];
		s.open = s.ltp;
		s.prevClose =
			s.preHistory.length > 0 ? s.preHistory[s.preHistory.length - 1] : s.ltp;
		s._prevTick = s.ltp;
		s.volume = 0;
		s.circuitHit = null;
		s.ohlcHistory = [];
		s.currentCandle = null;
	});
	state.niftyHistory = Array(state.historyLen).fill(state.niftyValue);
	
	if (!state.portfolioHistory) {
		state.portfolioHistory = [{day: state.day, val: INITIAL_MARGIN}];
	}
	
	selectStock(marketStocks[0]);
}

// ==================== LISTENERS ====================
function setupListeners() {
	document.getElementById("btn-freeze").addEventListener("click", function () {
		activateMarketFreeze();
	});
	document.getElementById("btn-freeze-cancel").addEventListener("click", function () {
		deactivateMarketFreeze();
	});
	document.getElementById("btn-play").addEventListener("click", function (e) {
		setSpeed(1000, e.currentTarget);
	});
	document.getElementById("btn-fast").addEventListener("click", function (e) {
		setSpeed(100, e.currentTarget);
	});
	// Removed .theme-btn and .font-btn listeners as they are handled by customization.js
	document.getElementById("btn-bank").addEventListener("click", toggleBankView);
	document.getElementById("btn-multiplayer").addEventListener("click", toggleMultiplayerView);
	var btnCloseMp = document.getElementById("btn-close-multiplayer");
	if (btnCloseMp) btnCloseMp.addEventListener("click", toggleMultiplayerView);
	document
		.getElementById("btn-realestate")
		.addEventListener("click", toggleRealEstateView);

	document.getElementById("btn-ipo").addEventListener("click", toggleIPOView);
	document.getElementById("btn-mf").addEventListener("click", toggleMFView);
	document.getElementById("btn-customize").addEventListener("click", toggleCustomizeView);

	document.getElementById("btn-syndicate").addEventListener("click", toggleSyndicateView);
	var btnCloseSyndicate = document.getElementById("btn-close-syndicate");
	if (btnCloseSyndicate) btnCloseSyndicate.addEventListener("click", toggleSyndicateView);
	document.getElementById("btn-new-day").addEventListener("click", startNewDay);
	initBankUI();
	document
		.getElementById("btn-settings")
		.addEventListener("click", toggleSettingsView);
	document
		.getElementById("btn-apply-settings")
		.addEventListener("click", applySettings);
	document
		.getElementById("btn-wipe-data")
		.addEventListener("click", wipeGameData);
	document.getElementById("cash-stat").addEventListener("click", toggleSettingsView);
	document
		.getElementById("cash-stat")
		.addEventListener("keydown", function (e) {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				toggleSettingsView();
			}
		});

	// Slider & Settings updates
	document.getElementById("settings-news-freq").addEventListener("input", function (e) {
		document.getElementById("news-freq-val").innerText = e.target.value + "%";
		NEWS_FREQ = parseFloat(e.target.value) / 100;
	});
	document.getElementById("settings-volatility").addEventListener("input", function (e) {
		document.getElementById("vol-val").innerText = parseFloat(e.target.value).toFixed(1) + "x";
		VOL_MULTIPLIER = parseFloat(e.target.value);
	});


	// Simulation Speed Setup
	document.querySelectorAll(".sim-speed-btn").forEach(function(btn) {
		btn.addEventListener("click", function(e) {
			document.querySelectorAll(".sim-speed-btn").forEach(b => b.classList.remove("active"));
			e.currentTarget.classList.add("active");
			var ms = parseInt(e.currentTarget.dataset.speed, 10);
			setSpeed(ms, document.getElementById("btn-play")); // keep top bar sync
		});
	});
	document
		.getElementById("btn-chart-line")
		.addEventListener("click", function () {
			setChartType("line");
		});
	document
		.getElementById("btn-chart-candle")
		.addEventListener("click", function () {
			setChartType("candle");
		});

	// Order type change (Market vs Limit)
	document
		.getElementById("order-type")
		.addEventListener("change", function (e) {
			var grp = document.getElementById("limit-price-group");
			var lbl = grp.querySelector("label");
			if (e.target.value === "LIMIT" || e.target.value === "STOP") {
				grp.classList.remove("hidden");
				lbl.textContent =
					e.target.value === "LIMIT" ? "Limit Price" : "Stop Price";
				var stock = state.activeStock;
				if (stock) {
					document.getElementById("order-limit-price").value = stock.ltp;
				}
			} else {
				grp.classList.add("hidden");
			}
		});

	// Scale buttons
	document
		.getElementById("btn-scale-linear")
		.addEventListener("click", function () {
			setChartScale("linear");
		});
	document
		.getElementById("btn-scale-log")
		.addEventListener("click", function () {
			setChartScale("log");
		});
	document
		.getElementById("btn-scale-pct")
		.addEventListener("click", function () {
			setChartScale("pct");
		});

	// Technical Indicators
	document
		.getElementById("btn-toggle-sma")
		.addEventListener("click", function (e) {
			state.showSMA = !state.showSMA;
			e.currentTarget.classList.toggle("active", state.showSMA);
			if (state.activeStock) renderChart(state.activeStock);
		});
	document
		.getElementById("btn-toggle-ema")
		.addEventListener("click", function (e) {
			state.showEMA = !state.showEMA;
			e.currentTarget.classList.toggle("active", state.showEMA);
			if (state.activeStock) renderChart(state.activeStock);
		});
	VIEW_LENGTHS.forEach(function (tf) {
		var btn = document.getElementById("tf-" + tf.label);
		if (btn)
			btn.addEventListener("click", function () {
				setViewLength(tf.label);
			});
	});

	var customDropdown = document.getElementById("custom-interval-dropdown");
	if (customDropdown) {
		customDropdown.addEventListener("click", function (e) {
			customDropdown.classList.toggle("open");
		});

		document.querySelectorAll(".dropdown-option").forEach(function (opt) {
			opt.addEventListener("click", function (e) {
				if (opt.classList.contains("disabled")) {
					e.stopPropagation();
					return;
				}
				var val = opt.dataset.value;
				setIntervalDropdown(val, opt.textContent);
				
				document.querySelectorAll(".dropdown-option").forEach(function(o) {
					o.classList.remove("active");
				});
				opt.classList.add("active");
			});
		});

		// Close dropdown when clicking outside
		document.addEventListener("click", function(e) {
			if (!customDropdown.contains(e.target)) {
				customDropdown.classList.remove("open");
			}
		});
	}

	// Cash preset buttons
	document.querySelectorAll(".cash-preset").forEach(function (btn) {
		btn.addEventListener("click", function () {
			document.getElementById("settings-cash").value = btn.dataset.v;
		});
	});

	var qtyInput = document.getElementById("order-qty");
	document.querySelectorAll(".preset").forEach(function (btn) {
		btn.addEventListener("click", function () {
			qtyInput.value = parseInt(qtyInput.value || 0, 10) + parseInt(btn.dataset.v, 10);
			updateOrderMargin();
		});
	});
	qtyInput.addEventListener("input", updateOrderMargin);

	document.getElementById("btn-buy").addEventListener("click", function () {
		executeTrade("BUY");
	});
	document.getElementById("btn-sell").addEventListener("click", function () {
		executeTrade("SELL");
	});

	document.getElementById("tab-equity").addEventListener("click", function () {
		switchOrderTab("equity");
	});
	document.getElementById("tab-options").addEventListener("click", function () {
		switchOrderTab("options");
	});
	document.getElementById("tab-bot").addEventListener("click", function () {
		switchOrderTab("bot");
	});



	var optLotsInput = document.getElementById("option-lots");
	document.querySelectorAll(".preset-opt").forEach(function (btn) {
		btn.addEventListener("click", function () {
			optLotsInput.value =
				parseInt(optLotsInput.value || 0, 10) + parseInt(btn.dataset.v, 10);
			updateOptionMargin();
		});
	});
	optLotsInput.addEventListener("input", updateOptionMargin);
	document
		.getElementById("expiry-date")
		.addEventListener("change", function () {
			renderOptionChain();
			updateOptionMargin();
		});

	document
		.getElementById("positions-tab")
		.addEventListener("click", function () {
			switchBottomTab("equity");
		});
	document
		.getElementById("options-pos-tab")
		.addEventListener("click", function () {
			switchBottomTab("options");
		});
	document
		.getElementById("pending-orders-tab")
		.addEventListener("click", function () {
			switchBottomTab("pending");
		});
	document.getElementById("history-tab").addEventListener("click", function () {
		switchBottomTab("history");
	});
	var botStatsTab = document.getElementById("bot-stats-tab");
	if (botStatsTab) {
		botStatsTab.addEventListener("click", function () {
			switchBottomTab("bot-stats");
		});
	}
	document
		.getElementById("btn-close-all")
		.addEventListener("click", closeAllPositions);
	document
		.getElementById("btn-export-csv")
		.addEventListener("click", exportPremiumStatement);

	// SL / Target auto-set when inputs change
	document.getElementById("sl-price").addEventListener("change", saveSlTarget);
	document
		.getElementById("target-price")
		.addEventListener("change", saveSlTarget);

	// SL / Target Quick Percentage Buttons
	document.querySelectorAll(".sl-pct-btn").forEach(function (btn) {
		btn.addEventListener("click", function (e) {
			var pct = parseFloat(e.currentTarget.getAttribute("data-pct"));
			var stock = state.activeStock;
			if (!stock) return;
			var pos = state.positions[stock.ticker];
			var basePrice = pos && pos.qty !== 0 ? pos.avg : stock.ltp;
			var isShort = pos && pos.qty < 0;
			// SL is below for long, above for short
			var newSl = basePrice * (isShort ? 1 + pct / 100 : 1 - pct / 100);
			document.getElementById("sl-price").value = newSl.toFixed(2);
			saveSlTarget();
		});
	});

	document.querySelectorAll(".tp-pct-btn").forEach(function (btn) {
		btn.addEventListener("click", function (e) {
			var pct = parseFloat(e.currentTarget.getAttribute("data-pct"));
			var stock = state.activeStock;
			if (!stock) return;
			var pos = state.positions[stock.ticker];
			var basePrice = pos && pos.qty !== 0 ? pos.avg : stock.ltp;
			var isShort = pos && pos.qty < 0;
			// Target is above for long, below for short
			var newTp = basePrice * (isShort ? 1 - pct / 100 : 1 + pct / 100);
			document.getElementById("target-price").value = newTp.toFixed(2);
			saveSlTarget();
		});
	});

	// Watchlist search
	var searchInp = document.getElementById("wl-search-input");
	if (searchInp) {
		searchInp.addEventListener("input", renderWatchlist);
		searchInp.addEventListener("keydown", function (e) {
			if (e.key === "Escape") {
				searchInp.value = "";
				renderWatchlist();
			}
		});
	}

	// Watchlist market filter buttons
	document.querySelectorAll(".wl-mf-btn").forEach(function (btn) {
		btn.addEventListener("click", function () {
			document.querySelectorAll(".wl-mf-btn").forEach(function (b) {
				b.classList.remove("active");
			});
			btn.classList.add("active");
			state.wlMarketFilter = btn.dataset.market;
			renderWatchlist();
		});
	});

	// News market filter buttons
	document.querySelectorAll(".news-mf-btn").forEach(function (btn) {
		btn.addEventListener("click", function () {
			document.querySelectorAll(".news-mf-btn").forEach(function (b) {
				b.classList.remove("active");
			});
			btn.classList.add("active");
			state.newsMarketFilter = btn.dataset.market;
			// Show/hide existing news items
			var nf = state.newsMarketFilter;
			var container = document.getElementById("news-container");
			Array.from(container.children).forEach(function (el) {
				if (nf === "ALL") {
					el.style.display = "";
				} else {
					var dm = el.getAttribute("data-market") || "NSE";
					el.style.display = dm === nf ? "" : "none";
				}
			});
		});
	});

	//Analytics
	document
		.getElementById("btn-toggle-analytics")
		.addEventListener("click", toggleAnalyticsView);

	// ── New Indicator Toggles ──
	var btnBB = document.getElementById('btn-toggle-bb');
	if (btnBB) {
		btnBB.addEventListener('click', function(e) {
			state.showBB = !state.showBB;
			e.currentTarget.classList.toggle('active', state.showBB);
			if (state.activeStock) renderChart(state.activeStock);
		});
	}
	var btnVWAP = document.getElementById('btn-toggle-vwap');
	if (btnVWAP) {
		btnVWAP.addEventListener('click', function(e) {
			state.showVWAP = !state.showVWAP;
			e.currentTarget.classList.toggle('active', state.showVWAP);
			if (state.activeStock) renderChart(state.activeStock);
		});
	}
	var btnRSI = document.getElementById('btn-toggle-rsi');
	if (btnRSI) {
		btnRSI.addEventListener('click', function(e) {
			state.showRSI = !state.showRSI;
			e.currentTarget.classList.toggle('active', state.showRSI);
			var subContainer = document.getElementById('sub-chart-container');
			if (subContainer) {
				if (state.showRSI || state.showMACD) {
					subContainer.classList.remove('hidden');
				} else {
					subContainer.classList.add('hidden');
					clearSubChartInstance();
				}
			}
			if (state.activeStock) renderChart(state.activeStock);
		});
	}
	var btnMACD = document.getElementById('btn-toggle-macd');
	if (btnMACD) {
		btnMACD.addEventListener('click', function(e) {
			state.showMACD = !state.showMACD;
			e.currentTarget.classList.toggle('active', state.showMACD);
			var subContainer = document.getElementById('sub-chart-container');
			if (subContainer) {
				if (state.showRSI || state.showMACD) {
					subContainer.classList.remove('hidden');
				} else {
					subContainer.classList.add('hidden');
					clearSubChartInstance();
				}
			}
			if (state.activeStock) renderChart(state.activeStock);
		});
	}

	// ── Layout Selector ──
	['1x', '2x', '4x'].forEach(function(layout) {
		var layoutBtn = document.getElementById('btn-layout-' + layout);
		if (layoutBtn) {
			layoutBtn.addEventListener('click', function() {
				setChartLayout(layout);
			});
		}
	});

	// ── Drawing Tools ──
	setupDrawingTools();
}



;

;



// ==================== SETTINGS / MODIFIABLE CASH ====================
function toggleSettingsView() {
	var settingsView = document.getElementById("view-settings");
	var termView = document.getElementById("view-terminal");
	var btn = document.getElementById("btn-settings");

	if (settingsView.classList.contains("hidden")) {
		settingsView.classList.remove("hidden");
		termView.classList.add("hidden");
		var views = ["view-bank", "view-realestate", "view-settings", "view-syndicate", "view-mf", "view-ipo", "view-customize", "view-multiplayer"];
        views.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                if (id === "view-customize" && !el.classList.contains("hidden")) {
                    if (typeof closeTerminalCustomization === 'function') closeTerminalCustomization(false);
                }
                if (id !== "view-settings") el.classList.add("hidden");
            }
        });
        document.querySelectorAll(".ctrl-btn").forEach(function(b) { b.classList.remove("on"); });
		btn.classList.add("on");

		// Set initial values
		document.getElementById("settings-cash").value = INITIAL_MARGIN;
		document.getElementById("settings-news-freq").value = Math.round(NEWS_FREQ * 100).toString();
		document.getElementById("news-freq-val").innerText = Math.round(NEWS_FREQ * 100) + "%";
		document.getElementById("settings-volatility").value = VOL_MULTIPLIER.toString();
		document.getElementById("vol-val").innerText = VOL_MULTIPLIER.toFixed(1) + "x";
	} else {
		settingsView.classList.add("hidden");
		termView.classList.remove("hidden");
		btn.classList.remove("on");
	}
}



function applySettings() {
	var newCash = parseFloat(document.getElementById("settings-cash").value);
	var newFreqStr = document.getElementById("settings-news-freq").value;
	var newVolStr = document.getElementById("settings-volatility").value;
	
	var newFreq = parseFloat(newFreqStr) / 100; // slider goes 1 to 15
	var newVol = parseFloat(newVolStr);

	if (isNaN(newCash) || newCash < 0) {
		toast("Error", "Starting capital must be a positive number", "error");
		return;
	}

	var cashChanged = Math.abs(newCash - state.margin) > 0.01;

	NEWS_FREQ = newFreq;
	VOL_MULTIPLIER = newVol;
	
	// Circuit Limits are now permanently on unless bypassed by Syndicate perk
	state.circuitLimits = true;

	toast("Settings Updated", "Simulation parameters have been updated.", "success");

	if (cashChanged) {
		// Reset everything
		INITIAL_MARGIN = newCash;
		state.margin = newCash;
		state.positions = {};
		state.optionsPositions = {};
	if (!state.upcomingIPOs) state.upcomingIPOs = [];
	if (!state.mfHoldings) state.mfHoldings = {};
		state.slTargets = {};
		state.pendingOrders = [];
		state.tradeHistory = [];
		state.inventory = {
			brokerageFreeDays: 0,
			bailoutCards: 0,
			insiderTips: [],
			marketFreezeMinutes: 0,
			profitBoostDays: 0,
			circuitOverrideDays: 0,
		};
		state.loans = [];
		state.fixedDeposits = [];
		state.realEstate = [];
		state.mortgages = [];
		state.cibilScore = 750;
		state.loanHistory = [];
		state.day = 1;
		state.time = START_TIME;
		state.newsCount = 0;
		state.marketOpen = true;
		state.isRunning = true;
		state.sentiment = 0;
		state.niftyValue = 22500;
		state.niftyBase = 22500;
		state.sensexValue = 74500;
		state.sensexBase = 74500;

		marketStocks.forEach(function (s) {
			s.ltp = s.base;
			s.open = s.base;
			s.prevClose = s.base;
			s._prevTick = s.base;
			if (!INDEX_CONSTITUENTS[s.ticker]) {
				s.preHistory = generatePreHistory(s, 66);
			}
		});

		marketStocks.forEach(function (s) {
			if (INDEX_CONSTITUENTS[s.ticker]) {
				s.preHistory = generateIndexPreHistory(s, INDEX_CONSTITUENTS[s.ticker]);
			}
		});

		marketStocks.forEach(function (s) {
			s.history = [s.ltp];
			s.volumeHistory = [0];
			s.volume = 0;
			s.circuitHit = null;
			s.ohlcHistory = [];
			s.currentCandle = null;
		});
		state.niftyHistory = Array(state.historyLen).fill(state.niftyValue);

		document.getElementById("news-container").innerHTML =
			'<div class="news-item"><span class="news-time mono">' + formatTime(state.time) + '</span>' +
			'<span class="news-text">Simulation reset. Starting capital: ' +
			fmtCur(newCash) +
			"</span></div>";
		document.getElementById("news-count").textContent = "0";

		clearChartInstance();
		_wlCache = {};
		_wlLastOrder = ""; // force watchlist DOM rebuild

		document.querySelectorAll(".ctrl-btn").forEach(function (b) {
			if (b.id !== "btn-theme" && b.id !== "btn-settings")
				b.classList.remove("on");
		});
		document.getElementById("btn-play").classList.add("on");

		startClock();
		toast(
			"Reset",
			"Simulation reset with " + fmtCur(newCash) + " capital",
			"success",
		);
	} else {
		toast("Settings", "Settings updated", "info");
	}

	toggleSettingsView();
	renderAll();
}

// ==================== CHART TYPE TOGGLE ====================


// ==================== CHART SCALE TOGGLE ====================


// ==================== VIEW LENGTH TOGGLE ====================




// ==================== THEME ====================
function applyTheme(themeName) {
	state.theme = themeName;
	
	// Remove all theme classes from body
	document.body.classList.remove("light", "theme-retro", "theme-neon", "theme-terminal", "theme-bloomberg", "theme-sepia", "theme-ocean", "theme-solarized");
	
	// Apply new theme class if not dark
	if (themeName === "light") document.body.classList.add("light");
	else if (themeName !== "dark") document.body.classList.add("theme-" + themeName);

	// Update active state on buttons
	document.querySelectorAll(".theme-btn").forEach(function(btn) {
		if (btn.getAttribute("data-theme") === themeName) {
			btn.classList.add("active");
		} else {
			btn.classList.remove("active");
		}
	});

	if (state.chartLayout === "1x") {
		if (state.activeStock) renderChart(state.activeStock);
	} else {
		setChartLayout(state.chartLayout);
	}
	
	if (state.showRSI || state.showMACD) {
		clearSubChartInstance();
		if (state.activeStock) {
			var prices = (state.chartType === 'candle')
				? ((chartInstance && chartInstance._ohlc) ? chartInstance._ohlc.map(function(c) { return c.c; }) : [])
				: ((chartInstance && chartInstance._lineData) ? chartInstance._lineData : []);
			renderSubChart(state.activeStock, prices);
		}
	}

	// Update Studio Backtest Chart colors if it exists
	if (typeof btChartInstance !== "undefined" && btChartInstance) {
		var isLight = (themeName === "light" || themeName === "sepia");
		var gridColor = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.05)";
		var textColor = getComputedStyle(document.body).getPropertyValue("--text-dim").trim() || (isLight ? "#666" : "#888");
		if (btChartInstance.options && btChartInstance.options.scales && btChartInstance.options.scales.y) {
			btChartInstance.options.scales.y.grid.color = gridColor;
			btChartInstance.options.scales.y.ticks.color = textColor;
		}
		if (btChartInstance.data && btChartInstance.data.datasets && btChartInstance.data.datasets[1]) {
			btChartInstance.data.datasets[1].borderColor = isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.25)";
		}
		btChartInstance.update();
	}

	toast("Theme Updated", "Switched to " + themeName + " mode", "info");
}

function applyFont(fontName) {
	state.font = fontName;
	
	// Remove all font classes from body
	document.body.classList.remove("font-outfit", "font-inter", "font-roboto-mono", "font-space-grotesk", "font-playfair", "font-poppins", "font-ibm-plex", "font-jetbrains");
	
	// Apply new font class
	document.body.classList.add("font-" + fontName);

	// Update active state on buttons
	document.querySelectorAll(".font-btn").forEach(function(btn) {
		if (btn.getAttribute("data-font") === fontName) {
			btn.classList.add("active");
		} else {
			btn.classList.remove("active");
		}
	});

	if (state.activeStock) renderChart(state.activeStock);
}

// ==================== VIEW SWITCHING ====================
function toggleBankView() {
	var bankView = document.getElementById("view-bank");
	var termView = document.getElementById("view-terminal");
	var btn = document.getElementById("btn-bank");

	if (bankView.classList.contains("hidden")) {
		// Open Bank
		bankView.classList.remove("hidden");
		termView.classList.add("hidden");
		var views = ["view-bank", "view-realestate", "view-settings", "view-syndicate", "view-mf", "view-ipo", "view-customize", "view-multiplayer"];
        views.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                if (id === "view-customize" && !el.classList.contains("hidden")) {
                    if (typeof closeTerminalCustomization === 'function') closeTerminalCustomization(false);
                }
                if (id !== "view-bank") el.classList.add("hidden");
            }
        });
        document.querySelectorAll(".ctrl-btn").forEach(function(b) { b.classList.remove("on"); });
		btn.classList.add("on"); // Highlight the button
		updateBankUI();
	} else {
		// Close Bank
		bankView.classList.add("hidden");
		termView.classList.remove("hidden");
		btn.classList.remove("on");
	}
}


function toggleIPOView() {
	var v = document.getElementById("view-ipo");
	var term = document.getElementById("view-terminal");
	var btn = document.getElementById("btn-ipo");
    if (!v) return;

	if (v.classList.contains("hidden")) {
		var views = ["view-bank", "view-realestate", "view-settings", "view-syndicate", "view-mf", "view-ipo", "view-customize", "view-multiplayer"];
        views.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                if (id === "view-customize" && !el.classList.contains("hidden")) {
                    if (typeof closeTerminalCustomization === 'function') closeTerminalCustomization(false);
                }
                el.classList.add("hidden");
            }
        });
        document.querySelectorAll(".ctrl-btn").forEach(function(b) { b.classList.remove("on"); });
        
        v.classList.remove("hidden");
		term.classList.add("hidden");
		btn.classList.add("on");
        if (typeof renderIPOUI === 'function') renderIPOUI();
	} else {
		v.classList.add("hidden");
		term.classList.remove("hidden");
		btn.classList.remove("on");
	}
}

function toggleMFView() {
	var v = document.getElementById("view-mf");
	var term = document.getElementById("view-terminal");
	var btn = document.getElementById("btn-mf");
    if (!v) return;

	if (v.classList.contains("hidden")) {
		var views = ["view-bank", "view-realestate", "view-settings", "view-syndicate", "view-mf", "view-ipo", "view-customize", "view-multiplayer"];
        views.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                if (id === "view-customize" && !el.classList.contains("hidden")) {
                    if (typeof closeTerminalCustomization === 'function') closeTerminalCustomization(false);
                }
                el.classList.add("hidden");
            }
        });
        document.querySelectorAll(".ctrl-btn").forEach(function(b) { b.classList.remove("on"); });
        
        v.classList.remove("hidden");
		term.classList.add("hidden");
		btn.classList.add("on");
        if (typeof renderMFUI === 'function') renderMFUI();
	} else {
		v.classList.add("hidden");
		term.classList.remove("hidden");
		btn.classList.remove("on");
	}
}

function toggleCustomizeView(show) {
	var v = document.getElementById("view-customize");
	var term = document.getElementById("view-terminal");
	var btn = document.getElementById("btn-customize");
    if (!v) return;

	var shouldShow = typeof show === "boolean" ? show : v.classList.contains("hidden");

	if (shouldShow) {
		var views = ["view-bank", "view-realestate", "view-settings", "view-syndicate", "view-ipo", "view-mf", "view-multiplayer"];
        views.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                if (id === "view-customize" && !el.classList.contains("hidden")) {
                    if (typeof closeTerminalCustomization === 'function') closeTerminalCustomization(false);
                }
                el.classList.add("hidden");
            }
        });
        document.querySelectorAll(".ctrl-btn").forEach(function(b) { b.classList.remove("on"); });
        
        v.classList.remove("hidden");
		term.classList.add("hidden");
		btn.classList.add("on");
        if (typeof openTerminalCustomization === 'function') openTerminalCustomization();
	} else {
		v.classList.add("hidden");
		term.classList.remove("hidden");
		btn.classList.remove("on");
        if (typeof closeTerminalCustomization === 'function') closeTerminalCustomization(false);
	}
}

function toggleMultiplayerView() {
	var v = document.getElementById("view-multiplayer");
	var term = document.getElementById("view-terminal");
	var btn = document.getElementById("btn-multiplayer");
    if (!v) return;

	if (v.classList.contains("hidden")) {
		var views = ["view-bank", "view-realestate", "view-settings", "view-syndicate", "view-mf", "view-ipo", "view-customize", "view-multiplayer"];
        views.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                if (id === "view-customize" && !el.classList.contains("hidden")) {
                    if (typeof closeTerminalCustomization === 'function') closeTerminalCustomization(false);
                }
                el.classList.add("hidden");
            }
        });
        document.querySelectorAll(".ctrl-btn").forEach(function(b) { b.classList.remove("on"); });
        
        v.classList.remove("hidden");
		term.classList.add("hidden");
		btn.classList.add("on");
	} else {
		v.classList.add("hidden");
		term.classList.remove("hidden");
		btn.classList.remove("on");
	}
}



function toggleRealEstateView() {
	var reView = document.getElementById("view-realestate");
	var termView = document.getElementById("view-terminal");
	var btn = document.getElementById("btn-realestate");

	if (reView.classList.contains("hidden")) {
		reView.classList.remove("hidden");
		termView.classList.add("hidden");
		var views = ["view-bank", "view-realestate", "view-settings", "view-syndicate", "view-mf", "view-ipo", "view-customize", "view-multiplayer"];
        views.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                if (id === "view-customize" && !el.classList.contains("hidden")) {
                    if (typeof closeTerminalCustomization === 'function') closeTerminalCustomization(false);
                }
                if (id !== "view-realestate") el.classList.add("hidden");
            }
        });
        document.querySelectorAll(".ctrl-btn").forEach(function(b) { b.classList.remove("on"); });
		btn.classList.add("on");
		updateRealEstateUI();
	} else {
		reView.classList.add("hidden");
		termView.classList.remove("hidden");
		btn.classList.remove("on");
	}
}

// ==================== TAB SWITCHING ====================
function switchOrderTab(tab) {
	state.activeTab = tab;
	document.querySelectorAll(".o-tab").forEach(function (t) {
		t.classList.remove("active");
	});
	document.getElementById("tab-" + tab).classList.add("active");
	document
		.getElementById("equity-form")
		.classList.toggle("hidden", tab !== "equity");
	document
		.getElementById("options-form")
		.classList.toggle("hidden", tab !== "options");
	document
		.getElementById("bot-form")
		.classList.toggle("hidden", tab !== "bot");
	if (tab === "options") renderOptionChain();
}

function switchBottomTab(tab) {
	state.activeBottomTab = tab;
	document.querySelectorAll(".b-tab").forEach(function (t) {
		t.classList.remove("active");
	});
	if (tab === "equity")
		document.getElementById("positions-tab").classList.add("active");
	else if (tab === "options")
		document.getElementById("options-pos-tab").classList.add("active");
	else if (tab === "pending")
		document.getElementById("pending-orders-tab").classList.add("active");
	else if (tab === "history") document.getElementById("history-tab").classList.add("active");
	else if (tab === "bot-stats") {
		var btab = document.getElementById("bot-stats-tab");
		if (btab) btab.classList.add("active");
	}

	document
		.getElementById("equity-table")
		.classList.toggle("hidden", tab !== "equity");
	document
		.getElementById("options-table")
		.classList.toggle("hidden", tab !== "options");
	document
		.getElementById("pending-table")
		.classList.toggle("hidden", tab !== "pending");
	document
		.getElementById("history-table")
		.classList.toggle("hidden", tab !== "history");
	var botTbl = document.getElementById("bot-stats-table");
	if (botTbl) botTbl.classList.toggle("hidden", tab !== "bot-stats");

	if (tab === "options") renderOptionsTable();
	if (tab === "pending") renderPendingTable();
	if (tab === "history") renderHistoryTable();
	if (tab === "bot-stats") {
		if (typeof BotManager !== "undefined" && BotManager.renderStats) {
			BotManager.renderStats();
		}
	}
}
// ==================== MARKET SIMULATION ====================
function startClock() {
	if (marketInterval) clearInterval(marketInterval);
	if (!state.isRunning) return;
	marketInterval = setInterval(tickMinute, state.speedMs);
}

// Note: window._restartClockFn and window._stopClientClockFn are
// defined at the bottom of this file with full UI-update logic.

function setSpeed(ms, btn) {
	// Bug 3 fix: clients cannot control simulation speed; it's driven by the host
	if (isMultiplayerClient) {
		toast("Client Mode", "Speed is controlled by the host.", "info");
		return;
	}
	// Block Play/Fast while Market Freeze is active
	if (state.marketFreezeActive && ms !== 0) {
		toast("Market Frozen \u2744\ufe0f", "End the freeze first to resume price movement.", "error");
		document.querySelectorAll(".ctrl-btn").forEach(function (b) {
			if (b.id !== "btn-theme" && b.id !== "btn-settings") b.classList.remove("on");
		});
		document.getElementById("btn-freeze").classList.add("on");
		return;
	}

	document.querySelectorAll(".ctrl-btn").forEach(function (b) {
		if (b.id !== "btn-theme" && b.id !== "btn-settings")
			b.classList.remove("on");
	});
	btn.classList.add("on");

	// Sync settings panel buttons
	document.querySelectorAll(".sim-speed-btn").forEach(function (b) {
		b.classList.remove("active");
		if (parseInt(b.dataset.speed, 10) === ms) {
			b.classList.add("active");
		}
	});

	if (ms === 0) {
		state.isRunning = false;
		clearInterval(marketInterval);
	} else {
		if (!state.marketOpen) {
			toast("Market Closed", "Start a new day to resume trading", "error");
			return;
		}
		state.isRunning = true;
		state.speedMs = ms;
		startClock();
	}
}

// ==================== MARKET FREEZE ====================
var freezeCountdownInterval = null;

function activateMarketFreeze() {
	if (state.marketFreezeActive) {
		toast("Market Freeze", "A freeze is already active!", "error");
		return;
	}
	var mins = state.inventory.marketFreezeMinutes || 0;
	if (mins <= 0) {
		toast("Market Freeze", "No freeze minutes in inventory. Open Syndicate crates to earn some!", "error");
		return;
	}
	if (!state.marketOpen) {
		toast("Market Freeze", "Market is closed. Start a new day first.", "error");
		return;
	}
	// Each freeze-minute = 1 real second
	var secondsTotal = mins;
	state.inventory.marketFreezeMinutes = 0;
	state.marketFreezeActive = true;
	state.marketFreezeSecondsLeft = secondsTotal;

	// Pause market
	state.isRunning = false;
	clearInterval(marketInterval);

	// Update freeze button UI
	var freezeBtn = document.getElementById("btn-freeze");
	if (freezeBtn) freezeBtn.classList.add("on");
	// Deactivate play/fast buttons visually
	document.getElementById("btn-play").classList.remove("on");
	document.getElementById("btn-fast").classList.remove("on");

	// Show HUD
	var hud = document.getElementById("freeze-hud");
	if (hud) hud.classList.remove("hidden");
	updateFreezeHudTimer();

	renderSyndicateInventory();
	toast("Market Freeze ACTIVATED", mins + " minutes of frozen prices. Analyze and trade risk-free!", "success");

	// Start real-time countdown (1 second intervals)
	if (freezeCountdownInterval) clearInterval(freezeCountdownInterval);
	freezeCountdownInterval = setInterval(function() {
		state.marketFreezeSecondsLeft--;
		updateFreezeHudTimer();
		renderSyndicateInventory();
		if (state.marketFreezeSecondsLeft <= 0) {
			deactivateMarketFreeze();
		}
	}, 1000);
}

function deactivateMarketFreeze() {
	if (freezeCountdownInterval) clearInterval(freezeCountdownInterval);
	freezeCountdownInterval = null;
	state.marketFreezeActive = false;
	state.marketFreezeSecondsLeft = 0;

	// Resume market at previous speed
	if (state.marketOpen) {
		state.isRunning = true;
		startClock();
		// Restore play button as active
		document.querySelectorAll(".ctrl-btn").forEach(function(b) {
			if (b.id !== "btn-theme" && b.id !== "btn-settings") b.classList.remove("on");
		});
		var playBtn = document.getElementById("btn-play");
		if (playBtn) playBtn.classList.add("on");
	}

	// Update freeze button
	var freezeBtn = document.getElementById("btn-freeze");
	if (freezeBtn) freezeBtn.classList.remove("on");

	// Hide HUD
	var hud = document.getElementById("freeze-hud");
	if (hud) hud.classList.add("hidden");

	renderSyndicateInventory();
	toast("Market Freeze Ended", "Prices are moving again.", "info");
}

function updateFreezeHudTimer() {
	var el = document.getElementById("freeze-hud-timer");
	if (!el) return;
	var s = Math.max(0, state.marketFreezeSecondsLeft);
	el.textContent = s + "m";
}

function isMarketOpen(stock, t) {
	if (stock.ticker === "DALAL") return true;
	if (
		stock.market === "COMM" ||
		stock.market === "CRYPTO" ||
		stock.market === "FX" ||
		stock.market === "BOND"
	)
		return true;

	var cur = stock.currency || "INR";
	if (cur === "INR") return t >= 555 && t <= 930; // 9:15 AM - 3:30 PM IST
	if (cur === "USD") return t >= 1140 || t <= 90; // 7:00 PM - 1:30 AM IST
	if (cur === "CNY") return t >= 420 && t <= 750; // 7:00 AM - 12:30 PM IST
	if (cur === "JPY") return t >= 330 && t <= 690; // 5:30 AM - 11:30 AM IST
	if (cur === "HKD") return t >= 405 && t <= 810; // 6:45 AM - 1:30 PM IST
	return t >= 810 && t <= 1320; // European fallback
}

function tickMinute() {
	if (isMultiplayerClient) return; // Clients receive ticks from the host over WebRTC
	state.time++;

	var t = state.time;
	if (t === 555) {
		pushMarketAnnouncement("Indian Market (NSE) is now OPEN", "NSE", true);
		// First reset all non-index INR equities
		marketStocks.forEach(function (s) {
			if (
				s.ticker !== "DALAL" &&
				s.currency === "INR" &&
				!["CRYPTO", "COMM", "FX", "BOND", "INDEX"].includes(s.market)
			)
				resetMarketStock(s);
		});
		// Then reset concurrent indices based on their constituents' new opens
		marketStocks.forEach(function (indexStock) {
			var constituents = INDEX_CONSTITUENTS[indexStock.ticker];
			if (!constituents || indexStock.currency !== "INR") return;
			indexStock.prevClose = indexStock.ltp;
			// Compute a market-cap-weighted open from constituent opens
			var totalPrevCap = 0, totalNewCap = 0;
			constituents.forEach(function(tk) {
				var comp = stockMap[tk];
				if (comp) {
					var shares = comp.shares || 100000000;
					totalPrevCap += comp.prevClose * shares;
					totalNewCap  += comp.ltp * shares;
				}
			});
			var overnightReturn = totalPrevCap > 0 ? (totalNewCap - totalPrevCap) / totalPrevCap : 0;
			indexStock.ltp   = parseFloat((indexStock.ltp * (1 + overnightReturn)).toFixed(2));
			indexStock.open  = indexStock.ltp;
			indexStock.base  = indexStock.ltp;
			indexStock._prevTick = indexStock.ltp;
			indexStock.volume = 0;
			indexStock.circuitHit = null;
			indexStock.history = [indexStock.ltp];
			indexStock.volumeHistory = [0];
			indexStock.ohlcHistory = [];
			indexStock.currentCandle = null;
		});
	}
	if (t === 930)
		pushMarketAnnouncement("Indian Market (NSE) has CLOSED", "NSE", false);

	if (t === 1140) {
		pushMarketAnnouncement("US Markets (NASDAQ) are now OPEN", "NASDAQ", true);
		marketStocks.forEach(function (s) {
			if (
				s.currency === "USD" &&
				!["CRYPTO", "COMM", "FX", "BOND", "INDEX"].includes(s.market)
			)
				resetMarketStock(s);
		});
		resetConcurrentIndexGroup("USD");
	}
	if (t === 90)
		pushMarketAnnouncement("US Markets (NASDAQ) have CLOSED", "NASDAQ", false);

	if (t === 420) {
		pushMarketAnnouncement("Chinese Market (SSE) is now OPEN", "SSE", true);
		marketStocks.forEach(function (s) {
			if (
				s.currency === "CNY" &&
				!["CRYPTO", "COMM", "FX", "BOND", "INDEX"].includes(s.market)
			)
				resetMarketStock(s);
		});
		resetConcurrentIndexGroup("CNY");
	}
	if (t === 750)
		pushMarketAnnouncement("Chinese Market (SSE) has CLOSED", "SSE", false);

	if (t === 330) {
		pushMarketAnnouncement("Japanese Market (TSE) is now OPEN", "TSE", true);
		marketStocks.forEach(function (s) {
			if (
				s.currency === "JPY" &&
				!["CRYPTO", "COMM", "FX", "BOND", "INDEX"].includes(s.market)
			)
				resetMarketStock(s);
		});
		resetConcurrentIndexGroup("JPY");
	}
	if (t === 690)
		pushMarketAnnouncement("Japanese Market (TSE) has CLOSED", "TSE", false);

	if (t === 405) {
		pushMarketAnnouncement("Hong Kong Market (HKEX) is now OPEN", "HKEX", true);
		marketStocks.forEach(function (s) {
			if (
				s.currency === "HKD" &&
				!["CRYPTO", "COMM", "FX", "BOND", "INDEX"].includes(s.market)
			)
				resetMarketStock(s);
		});
		resetConcurrentIndexGroup("HKD");
	}
	if (t === 810)
		pushMarketAnnouncement("Hong Kong Market (HKEX) has CLOSED", "HKEX", false);

	if (t === 810) {
		pushMarketAnnouncement("European Markets are now OPEN", "EU", true);
		marketStocks.forEach(function (s) {
			if (
				!["INR", "USD", "CNY", "JPY", "HKD"].includes(s.currency) &&
				!["CRYPTO", "COMM", "FX", "BOND", "INDEX"].includes(s.market)
			)
				resetMarketStock(s);
		});
		resetConcurrentIndexGroup("EUR");
		resetConcurrentIndexGroup("GBP");
	}
	if (t === 1320)
		pushMarketAnnouncement("European Markets have CLOSED", "EU", false);

	if (state.time > END_TIME) {
		state.time = END_TIME;
		state.isRunning = false;
		state.marketOpen = false;
		clearInterval(marketInterval);
		document.querySelectorAll(".ctrl-btn").forEach(function (b) {
			if (b.id !== "btn-theme" && b.id !== "btn-settings")
				b.classList.remove("on");
		});
		document.getElementById("btn-freeze").classList.add("on");
		showDayEndOverlay();
		renderAll();
		return;
	}

	// Price simulation: 3 micro-steps per tick for smooth, realistic movement
	var totalChange = 0;
	var microSteps = 3;
	// Shared market factor (correlation / sector rotation)
	var marketFactor = (pcg.random() - 0.5) * 0.004 * VOL_MULTIPLIER;
	var sectorFactors = {};

	marketStocks.forEach(function (stock) {
		stock._prevTick = stock.ltp; // save for flash animation
		if (!isMarketOpen(stock, state.time)) return; // Skip closed markets

		if (stock.haltUntil) {
			if (state.time < stock.haltUntil) {
				stock.history.push(stock.ltp);
				stock.volumeHistory.push(0);
				return;
			} else {
				// Halt lifts! Evaluate the pre-open auction gap against the NEW tier.
				var canExpand = stock.circuitTierIndex < CIRCUIT_TIERS.length - 1;
				var nextTierIndex = canExpand ? stock.circuitTierIndex + 1 : stock.circuitTierIndex;
				var limitMult = CIRCUIT_TIERS[nextTierIndex];
				var upperCircuitTier = stock.base * (1 + limitMult);
				var lowerCircuitTier = stock.base * (1 - limitMult);
				
				var theoreticalPrice = stock.ltp * (1 + stock.haltImbalance);
				
				if ((theoreticalPrice >= upperCircuitTier || theoreticalPrice <= lowerCircuitTier) && canExpand) {
					// Imbalance is so massive it instantly hits the next circuit!
					stock.circuitTierIndex = nextTierIndex;
					var clampedPrice = theoreticalPrice >= upperCircuitTier ? upperCircuitTier : lowerCircuitTier;
					var actualMovePct = (clampedPrice - stock.ltp) / stock.ltp;
					
					// The remaining imbalance carries over
					stock.haltImbalance = stock.haltImbalance - actualMovePct;
					
					var pDecGap = stock.ltp < 10 ? 4 : 2;
					stock.ltp = parseFloat(clampedPrice.toFixed(pDecGap));
					stock.circuitHit = theoreticalPrice >= upperCircuitTier ? "UC" : "LC";
					stock.haltUntil = state.time + 15;
					stock.history.push(stock.ltp);
					stock.volumeHistory.push(0);
					// toast("HALT EXTENDED", stock.ticker + " pre-open imbalance exceeded the new " + (limitMult*100) + "% circuit tier. Halt extended for 15 minutes!", "error");
					return; // Skip normal tick processing, it's still halted!
				} else {
					// Gap fits within the new tier, OR we hit absolute max limit
					stock.haltUntil = null;
					pDecGap = stock.ltp < 10 ? 4 : 2;
					
					var finalPrice = theoreticalPrice;
					if (finalPrice > upperCircuitTier) finalPrice = upperCircuitTier;
					if (finalPrice < lowerCircuitTier) finalPrice = lowerCircuitTier;
					
					stock.ltp = parseFloat(finalPrice.toFixed(pDecGap));
					stock.haltImbalance = 0;
					stock.postHaltVolatility = 5; // massive volatility spike for next 5 mins
					stock.circuitHit = finalPrice >= upperCircuitTier ? "UC" : (finalPrice <= lowerCircuitTier ? "LC" : null);
					stock.circuitTierIndex = nextTierIndex;
					// toast("HALT LIFTED", stock.ticker + " resumed trading. Circuit expanded to " + (limitMult*100) + "%!", "info");
				}
			}
		}

		// If it's a perfectly concurrent index, SKIP the random walk and update it later
		if (INDEX_CONSTITUENTS[stock.ticker]) return;

		var currentPostHalt = stock.postHaltVolatility || 1;
		var v = stock.vol * VOL_MULTIPLIER * currentPostHalt;
		if (stock.postHaltVolatility > 1) stock.postHaltVolatility--;

		var isNoCircuit =
			stock.market === "CRYPTO" ||
			stock.market === "FX" ||
			stock.market === "BOND" ||
			state.circuitLimits === false ||
			(state.inventory && state.inventory.circuitOverrideDays > 0);
		limitMult = isNoCircuit ? 100.0 : CIRCUIT_TIERS[stock.circuitTierIndex];
		var upperCircuit = stock.open * (1 + limitMult);
		var lowerCircuit = stock.open * (1 - limitMult);
		var price = stock.ltp;

		// Sector factor (each sector moves together slightly)
		if (!sectorFactors[stock.sector]) {
			sectorFactors[stock.sector] =
				(pcg.random() - 0.5) * 0.006 * VOL_MULTIPLIER;
		}
		var sectorBias = sectorFactors[stock.sector];

		var tickHigh = stock._prevTick || price;
		var tickLow = stock._prevTick || price;

		// Apply momentum if active
		var momentumMove = 0;
		if (stock.momentumTicks && stock.momentumTicks > 0) {
			momentumMove = stock.newsMomentum;
			stock.momentumTicks--;
		}

		// 3 micro-ticks for realism
		for (var step = 0; step < microSteps; step++) {
			var drift = (pcg.random() - 0.502) * v * 1.4;
			var meanRevert =
				stock.ticker === "DALAL"
					? 0
					: ((stock.base - price) / stock.base) * 0.0008;
			// Combine: stock drift + sector bias + broad market + momentum
			var totalMove =
				drift + meanRevert + sectorBias * 0.4 + marketFactor * 0.3 + (momentumMove / microSteps);
			price = price * (1 + totalMove);
			price = Math.max(0.0001, price);
			if (price > tickHigh) tickHigh = price;
			if (price < tickLow) tickLow = price;
		}

		// Apply price
		var pDec = stock.ltp < 10 ? 4 : 2;
		stock.ltp = parseFloat(price.toFixed(pDec));
		tickHigh = parseFloat(tickHigh.toFixed(pDec));
		tickLow = parseFloat(tickLow.toFixed(pDec));

		// Check circuit limits
		if (!isNoCircuit && !stock.haltUntil) {
			if (stock.ltp >= upperCircuit && stock.ticker !== "DALAL") {
				stock.ltp = parseFloat(upperCircuit.toFixed(pDec));
				stock.circuitHit = "UC";
				if (stock.circuitTierIndex < CIRCUIT_TIERS.length - 1) {
					stock.haltUntil = state.time + 15;
					// toast("HALTED", stock.ticker + " hit Upper Circuit! Halted for 15 minutes.", "error");
				}
			} else if (stock.ltp <= lowerCircuit && stock.ticker !== "DALAL") {
				stock.ltp = parseFloat(lowerCircuit.toFixed(pDec));
				stock.circuitHit = "LC";
				if (stock.circuitTierIndex < CIRCUIT_TIERS.length - 1) {
					stock.haltUntil = state.time + 15;
					// toast("HALTED", stock.ticker + " hit Lower Circuit! Halted for 15 minutes.", "error");
				}
			} else {
				stock.circuitHit = null;
			}
		} else if (isNoCircuit) {
			stock.circuitHit = null; // Crypto/FX never freeze
		}

		stock.history.push(stock.ltp);
		if (stock.history.length > state.historyLen) stock.history.shift();

		// OHLCV candle aggregation
		var avgTickVol = Math.floor(stock.baseVolume / 390); // 390 minutes in a standard trading day
		var volFluctuation = 0.5 + pcg.random(); // 0.5x to 1.5x variance
		var tickVol = Math.floor(avgTickVol * volFluctuation);
		if (tickVol < 1) tickVol = 1;

		stock.volumeHistory.push(tickVol);
		if (stock.volumeHistory.length > state.historyLen)
			stock.volumeHistory.shift();
		if (!stock.currentCandle) {
			stock.currentCandle = {
				o: stock._prevTick || stock.ltp,
				h: Math.max(tickHigh, stock.ltp),
				l: Math.min(tickLow, stock.ltp),
				c: stock.ltp,
				v: tickVol,
				ticks: 1,
			};
		} else {
			if (stock.ltp > stock.currentCandle.h) stock.currentCandle.h = stock.ltp;
			if (stock.ltp < stock.currentCandle.l) stock.currentCandle.l = stock.ltp;
			stock.currentCandle.c = stock.ltp;
			stock.currentCandle.v += tickVol;
			stock.currentCandle.ticks++;
			if (stock.currentCandle.ticks >= state.candlePeriod) {
				stock.ohlcHistory.push({
					o: stock.currentCandle.o,
					h: stock.currentCandle.h,
					l: stock.currentCandle.l,
					c: stock.currentCandle.c,
					v: stock.currentCandle.v,
				});
				if (stock.ohlcHistory.length > 2000) stock.ohlcHistory.shift();
				stock.currentCandle = null;
			}
		}

		// Volume simulation (realistic ranges based on true asset liquidity)
		stock.volume += tickVol;
		stock.available_liquidity = tickVol * 1.5; // Minute volume + a bit of ambient depth
		stock.bidAskSpread = stock.ltp * (pcg.random() * 0.001 + 0.0001); // 0.01% to 0.1% spread
	});

	// --- 2. Update Concurrent Indices ---
	marketStocks.forEach(function (indexStock) {
		var constituents = INDEX_CONSTITUENTS[indexStock.ticker];
		if (!constituents) return;
		if (!isMarketOpen(indexStock, state.time)) return;
		
		indexStock._prevTick = indexStock.ltp;
		
		var prevTotalCap = 0;
		var currentTotalCap = 0;
		var tickVolSum = 0;
		
		constituents.forEach(function(tk) {
			var comp = stockMap[tk];
			if (comp) {
				var shares = comp.shares || 100000000;
				prevTotalCap += comp._prevTick * shares;
				currentTotalCap += comp.ltp * shares;
				tickVolSum += (comp.volumeHistory[comp.volumeHistory.length - 1] || 0);
			}
		});
		
		var weightedReturn = prevTotalCap > 0 ? (currentTotalCap - prevTotalCap) / prevTotalCap : 0;
		indexStock.ltp = parseFloat((indexStock.ltp * (1 + weightedReturn)).toFixed(2));
		
		indexStock.history.push(indexStock.ltp);
		if (indexStock.history.length > state.historyLen) indexStock.history.shift();
		
		var tickVol = Math.max(1, Math.floor(tickVolSum * 0.1)); // Index volume is a fraction of total constituent volume
		indexStock.volumeHistory.push(tickVol);
		if (indexStock.volumeHistory.length > state.historyLen)
			indexStock.volumeHistory.shift();
		indexStock.volume += tickVol;
		indexStock.available_liquidity = tickVol * 1.5 + 5000; // Provide ambient liquidity for indices
		indexStock.bidAskSpread = indexStock.ltp * (pcg.random() * 0.0005 + 0.0001); // 0.01% to 0.05% spread
		
		if (!indexStock.currentCandle) {
			indexStock.currentCandle = {
				o: indexStock.ltp, h: indexStock.ltp, l: indexStock.ltp, c: indexStock.ltp, v: tickVol, ticks: 1
			};
		} else {
			if (indexStock.ltp > indexStock.currentCandle.h) indexStock.currentCandle.h = indexStock.ltp;
			if (indexStock.ltp < indexStock.currentCandle.l) indexStock.currentCandle.l = indexStock.ltp;
			indexStock.currentCandle.c = indexStock.ltp;
			indexStock.currentCandle.v += tickVol;
			indexStock.currentCandle.ticks++;
			if (indexStock.currentCandle.ticks >= state.candlePeriod) {
				indexStock.ohlcHistory.push({
					o: indexStock.currentCandle.o, h: indexStock.currentCandle.h, l: indexStock.currentCandle.l, c: indexStock.currentCandle.c, v: indexStock.currentCandle.v
				});
				if (indexStock.ohlcHistory.length > 2000) indexStock.ohlcHistory.shift();
				indexStock.currentCandle = null;
			}
		}
	});

	// --- Legacy redundant UI variables (preserved for backward compatibility if needed) ---
	var legacyNifty = stockMap["NIFTY 50"];
	var legacySensex = stockMap["SENSEX"];
	if (legacyNifty) state.niftyValue = legacyNifty.ltp;
	if (legacySensex) state.sensexValue = legacySensex.ltp;
	// Bug #18 fix: only push if niftyValue is a valid number to avoid undefined in history array
	if (typeof state.niftyValue === "number" && !isNaN(state.niftyValue)) {
		state.niftyHistory.push(state.niftyValue);
		if (state.niftyHistory.length > state.historyLen) state.niftyHistory.shift();
	}

	// Market sentiment (-100 to +100)
	var gainers = marketStocks.filter(function (s) {
		return s.ltp >= s.open;
	}).length;
	state.sentiment = Math.round((gainers / marketStocks.length - 0.5) * 200);

	// SL / Target auto-trigger
	Object.keys(state.slTargets).forEach(function (ticker) {
		var st = state.slTargets[ticker];
		if (!st) return;
		var pos = state.positions[ticker];
		if (!pos) {
			delete state.slTargets[ticker];
			return;
		}
		var stock = stockMap[ticker];
		if (!stock) return;
		if (stock.haltUntil) return;
		var isLong = pos.qty > 0;
		if (st.trailingAmt) {
			if (isLong) {
				var newSl = stock.ltp - st.trailingAmt;
				if (!st.sl || newSl > st.sl) st.sl = newSl;
			} else {
				newSl = stock.ltp + st.trailingAmt;
				if (!st.sl || newSl < st.sl) st.sl = newSl;
			}
		}

		if (st.sl && isLong && stock.ltp <= st.sl) {
			toast(
				"\u26d4 SL Hit",
				ticker + " stop loss triggered @ \u20b9" + stock.ltp.toFixed(2),
				"error",
			);
			closeEquityPosition(ticker, true);
			delete state.slTargets[ticker];
		} else if (st.sl && !isLong && stock.ltp >= st.sl) {
			toast(
				"\u26d4 SL Hit",
				ticker + " stop loss triggered @ \u20b9" + stock.ltp.toFixed(2),
				"error",
			);
			closeEquityPosition(ticker, true);
			delete state.slTargets[ticker];
		} else if (st.target && isLong && stock.ltp >= st.target) {
			toast(
				"\u2705 Target Hit",
				ticker + " target reached @ \u20b9" + stock.ltp.toFixed(2),
				"success",
			);
			closeEquityPosition(ticker, true);
			delete state.slTargets[ticker];
		} else if (st.target && !isLong && stock.ltp <= st.target) {
			toast(
				"\u2705 Target Hit",
				ticker + " target reached @ \u20b9" + stock.ltp.toFixed(2),
				"success",
			);
			closeEquityPosition(ticker, true);
			delete state.slTargets[ticker];
		}
	});

	// Forex Sync
	if (stockMap["USDINR"]) EXCHANGE_RATES.USD = stockMap["USDINR"].ltp;
	if (stockMap["CNYINR"]) EXCHANGE_RATES.CNY = stockMap["CNYINR"].ltp;
	if (stockMap["JPYINR"]) EXCHANGE_RATES.JPY = stockMap["JPYINR"].ltp;

	// Margin Check Loop
	if (state.margin < 0) {
		if (state.marginCallThrottle <= 0) {
			toast(
				"MARGIN CALL",
				"Your cash balance is below zero (\u20b9" +
					state.margin.toFixed(2) +
					")! Square off some positions to avoid forced liquidation.",
				"error",
			);
			state.marginCallThrottle = 15; // throttle warning toast
		} else {
			state.marginCallThrottle--;
		}
	} else {
		state.marginCallThrottle = 0;
	}

	// Forced Liquidation Check: Margin Call
	// If the user's total portfolio value (cash + equities + options) drops below 0, 
	// or their raw cash goes negative, they are margin called.
	var portVal = calcPortfolioValue();
	var hasOpenPositions =
		Object.keys(state.positions).length > 0 ||
		Object.keys(state.optionsPositions).length > 0;
		
	var requiresMarginCall = (portVal <= 0) || (state.margin < 0);
	
	// Bug #6 fix: Margin call check now runs AFTER all pending-order margins are re-locked,
	// preventing a false "margin OK" window during the tick where margins were temporarily freed.
	// (Check is moved to after the pending orders block below.)
	var _pendingMarginCallCheck = requiresMarginCall && hasOpenPositions;

	// Pending Order Matching
	if (state.pendingOrders && state.pendingOrders.length > 0) {
		state.pendingOrders.forEach(function (o) {
			if (o.lockedMargin) {
				state.margin += o.lockedMargin;
				o.lockedMargin = 0;
			}
		});
		var remainingPending = [];
		state.pendingOrders.forEach(function (order) {
			var stock = stockMap[order.ticker];
			if (!stock) return;
			if (!isMarketOpen(stock, state.time) || stock.haltUntil) {
				remainingPending.push(order);
				return;
			}
			var ltp = stock.ltp;

			if (order.orderType === "MARKET") {
				var avail = stock.available_liquidity || 0;
				if (avail > 0) {
					var fillQty = Math.min(order.qty, avail);
					var spread = stock.bidAskSpread || 0;
					var executionPrice =
						(order.side === "BUY" || order.side === "COVER")
							? stock.ltp + spread
							: Math.max(0.0001, stock.ltp - spread);
					var pDecimals = stock.ltp < 10 ? 4 : 2;
					executionPrice = parseFloat(executionPrice.toFixed(pDecimals));

					if (isMultiplayerClient) {
						if (!order.pendingHostFill) {
							order.pendingHostFill = sendOrderToHost(stock.ticker, order.side, fillQty, null, order.tif);
						}
						remainingPending.push(order);
					} else if (processEquityTrade(stock, order.side, fillQty, executionPrice)) {
						stock.available_liquidity -= fillQty;
						order.qty -= fillQty;

						if (order.qty > 0) {
							if (order.tif === "IOC") {
								toast("Order Cancelled", "IOC: Remaining " + order.qty + " shares cancelled.", "info");
							} else {
								remainingPending.push(order);
							}
						} else {
							toast(
								"Order Completed",
								"Market order fully filled: " + order.side + " " + order.ticker,
								"success",
							);
						}
					} else {
						toast(
							"Order Cancelled",
							"Market order cancelled (Insufficient Margin): " +
								order.side +
								" " +
								order.qty +
								" " +
								order.ticker,
							"error",
						);
					}
				} else {
					if (order.tif === "IOC") {
						toast("Order Cancelled", "IOC: No liquidity available to fill " + order.side + " " + order.ticker, "info");
					} else {
						remainingPending.push(order);
					}
				}
				return;
			}

			spread = stock.bidAskSpread || 0;
			var ask = stock.ltp + spread;
			var bid = Math.max(0.0001, stock.ltp - spread);
			
			var triggered = false;
			if (order.orderType === "STOP") {
				if (order.side === "BUY" || order.side === "COVER") {
					if (ask >= order.limitPrice) triggered = true;
				} else if (order.side === "SELL" || order.side === "SHORT") {
					if (bid <= order.limitPrice) triggered = true;
				}
			} else {
				// LIMIT
				if (order.side === "BUY" || order.side === "COVER") {
					if (ask <= order.limitPrice) triggered = true;
				} else if (order.side === "SELL" || order.side === "SHORT") {
					if (bid >= order.limitPrice) triggered = true;
				}
			}

			if (triggered) {
				// Block execution on circuit hit
				if (
					stock.circuitHit === "UC" &&
					(order.side === "BUY" || order.side === "COVER")
				) {
					remainingPending.push(order);
				} else if (
					stock.circuitHit === "LC" &&
					(order.side === "SELL" || order.side === "SHORT")
				) {
					remainingPending.push(order);
				} else {
					avail = stock.available_liquidity || 0;
					if (order.tif === "FOK" && avail < order.qty) {
						var oName = order.orderType === "STOP" ? "STOP" : "Limit";
						toast("Order Cancelled", "FOK: Insufficient liquidity to fill " + oName + " " + order.side + " " + order.ticker + ". Order killed.", "error");
						return;
					}
					if (avail > 0) {
						fillQty = Math.min(order.qty, avail);
						var fillPrice = (order.side === "BUY" || order.side === "COVER") ? ask : bid;
						pDecimals = stock.ltp < 10 ? 4 : 2;
						fillPrice = parseFloat(fillPrice.toFixed(pDecimals));

						if (isMultiplayerClient) {
							if (!order.pendingHostFill) {
								order.pendingHostFill = sendOrderToHost(stock.ticker, order.side, fillQty, null, order.tif);
							}
							remainingPending.push(order);
						} else if (processEquityTrade(stock, order.side, fillQty, fillPrice)) {
							stock.available_liquidity -= fillQty;
							order.qty -= fillQty;

							oName = order.orderType === "STOP" ? "STOP" : "Limit";
							if (order.qty > 0) {
								if (order.tif === "IOC") {
									toast("Order Cancelled", "IOC: Remaining " + order.qty + " shares of " + oName + " cancelled due to lack of liquidity.", "info");
								} else {
									remainingPending.push(order);
								}
							} else {
								toast(
									"Order Executed",
									oName +
										" order fully filled: " +
										order.side +
										" " +
										order.ticker +
										" @ " +
										fillPrice.toFixed(2),
									"success",
								);
							}
						} else {
							oName = order.orderType === "STOP" ? "STOP" : "Limit";
							toast(
								"Order Cancelled",
								oName +
									" order cancelled (Insufficient Margin): " +
									order.side +
									" " +
									order.qty +
									" " +
									order.ticker,
								"error",
							);
						}
					} else {
						if (order.tif === "IOC" || order.tif === "FOK") {
							oName = order.orderType === "STOP" ? "STOP" : "Limit";
							toast("Order Cancelled", order.tif + ": No liquidity available to fill " + oName + " " + order.side + " " + order.ticker, "info");
						} else {
							remainingPending.push(order);
						}
					}
				}
			} else {
				remainingPending.push(order);
			}
		});
		var finalPending = [];
		remainingPending.forEach(function (o) {
			var stock = stockMap[o.ticker];
			if (!stock) return;
			var price = o.limitPrice || stock.ltp;
			var lockedAmt = processOrderMarginLock(stock, o.side, o.qty, price);
			if (lockedAmt !== false) {
				o.lockedMargin = lockedAmt;
				finalPending.push(o);
			} else {
				toast("Order Cancelled", "Order cancelled (Insufficient Margin): " + o.side + " " + o.ticker, "error");
			}
		});
		state.pendingOrders = finalPending;
	}

	// Bug #6 fix: Margin call check moved here — AFTER pending order margins are re-locked
	// RE-EVALUATE margin after pending orders have been processed to prevent false liquidations
	var _finalMarginCallCheck = (calcPortfolioValue() <= 0 || state.margin < 0) && hasOpenPositions;

	if (_finalMarginCallCheck) {
		if (state.inventory && state.inventory.bailoutCards > 0) {
			state.inventory.bailoutCards--;
			state.margin += INITIAL_MARGIN * 0.5;
			toast("CORPORATE BAILOUT", "Your positions were saved by a Bailout Card! " + fmtCur(INITIAL_MARGIN * 0.5) + " injected.", "success");
			if (typeof renderSyndicateInventory === "function") renderSyndicateInventory();
		} else {
			liquidateAllForced();
		}
	}

	// News events
	if (pcg.random() < NEWS_FREQ) triggerNewsEvent();

	// Prevent memory bloat and data corruption in long-running sessions
	if (state.tradeHistory.length > 5000) state.tradeHistory.length = 5000;
	if (state.botTradeHistory && state.botTradeHistory.length > 10000) state.botTradeHistory.length = 10000;
	if (state.loanHistory.length > 200) state.loanHistory.splice(0, state.loanHistory.length - 200);

	// Bug #8 fix: wrap BotManager in try/catch so a crashing bot cannot break renderAll()
	if (typeof BotManager !== "undefined") {
		try { BotManager.tickAll(); } catch (botErr) { console.error("BotManager.tickAll error:", botErr); }
	}

	if (isMultiplayerHost) {
		broadcastMarketTick(state, marketStocks);
	}

	renderAll();
}

// ==================== NEW DAY ====================
function showDayEndOverlay() {
	var pnl = calcTotalPNL();

	document.getElementById("ov-day-label").textContent = "Day " + state.day;
	var pnlEl = document.getElementById("ov-day-pnl");
	pnlEl.textContent = fmtCur(pnl);
	pnlEl.className = "ov-stat-val mono " + (pnl >= 0 ? "up" : "dn");
	document.getElementById("ov-portfolio").textContent =
		fmtCur(calcPortfolioValue());
	document.getElementById("ov-cash").textContent = fmtCur(state.margin);
	var ovBrokerageEl = document.getElementById("ov-brokerage");
	if (ovBrokerageEl)
		ovBrokerageEl.textContent = fmtCur(state.totalBrokerage || 0);
	document.getElementById("ov-positions").textContent =
		Object.keys(state.positions).length +
		Object.keys(state.optionsPositions).length;

	var expiringOptions = Object.values(state.optionsPositions).filter(
		function (p) {
			return p.daysToExpiry <= 1;
		},
	);
	if (expiringOptions.length > 0) {
		document.getElementById("ov-expiry-info").classList.remove("hidden");
		document.getElementById("ov-expiry-text").textContent =
			expiringOptions.length + " option(s) will expire and be auto-settled.";
	} else {
		document.getElementById("ov-expiry-info").classList.add("hidden");
	}

	document.getElementById("day-overlay").classList.remove("hidden");
}

function resetMarketStock(stock) {
	stock.prevClose = stock.ltp; // save previous day's close
	var overnightChange = (pcg.random() - 0.5) * 0.02;

	if (stock.overnightNewsGap) {
		overnightChange += stock.overnightNewsGap;
		stock.overnightNewsGap = 0;
	}

	if (state.inventory && state.inventory.insiderTips) {
		var tipIndex = state.inventory.insiderTips.findIndex(function(t) { return t.ticker === stock.ticker && t.daysLeft <= 0; });
		if (tipIndex !== -1) {
			var tip = state.inventory.insiderTips[tipIndex];
			overnightChange = tip.gapPct;
			toast("INSIDER TIP EXECUTED", stock.ticker + " gapped " + (tip.gapPct > 0 ? "UP" : "DOWN") + " by " + (Math.abs(tip.gapPct)*100).toFixed(1) + "% as guaranteed!", "success");
			state.inventory.insiderTips.splice(tipIndex, 1);
			if (typeof renderSyndicateInventory === "function") renderSyndicateInventory();
		}
	}

	var pDec = stock.ltp < 10 ? 4 : 2;
	stock.ltp = parseFloat((stock.ltp * (1 + overnightChange)).toFixed(pDec));
	stock.ltp = Math.max(0.0001, stock.ltp); // Prevent falling to 0 which causes NaN in meanRevert
	stock.open = stock.ltp;
	stock.base = stock.ltp;
	stock._prevTick = stock.ltp;
	stock.volume = 0;
	stock.circuitHit = null;
	stock.circuitTierIndex = 0;
	stock.haltUntil = null;
	stock.haltImbalance = 0;
	stock.postHaltVolatility = 1;

	// Roll preHistory: append this day's live ticks and trim to last 66 trading days
	// 375 ticks per trading day (not 1440 which is calendar minutes)
	if (stock.preHistory && stock.history.length > 1) {
		var todayTicks = stock.history.slice(1); // skip the opening placeholder
		stock.preHistory = stock.preHistory.concat(todayTicks).slice(-66 * 375);
	}
	// Reset live history for new day
	stock.history = [stock.ltp];
	stock.volumeHistory = [0];
	// Bug #12 fix: preserve ohlcHistory across days so multi-day candle charts work.
	// We keep the accumulated history; only reset the in-progress candle.
	stock.ohlcHistory = stock.ohlcHistory || [];
	stock.currentCandle = null;
}



// ==================== IPO SYSTEM ====================

var IPO_COMPANY_NAMES = [
    // Tech & Software
    "Quantum Dynamics", "NeuralNet Systems", "Synthetix AI", "CloudNative Tech", "CyberShield Security", 
    "DataStack Analytics", "ByteForge Software", "NexGen Robotics", "Apex AI", "Visionary VR", 
    "HoloTech", "Aether Networks", "LogicFlow Systems", "Infinite Loop Tech", "Vertex Computing", 
    "AeroSoft", "Pioneer Semiconductor", "Silico Industries", "GigaByte Solutions", "AlphaNode Systems",
    
    // Finance & Fintech
    "Vault Capital", "Equinox Financial", "Pinnacle Wealth", "Zenith Banking", "BlockLedger Finance", 
    "ClearPay Solutions", "NovaTrust Bank", "Sterling Asset Management", "Meridian Cap", "First Century Finance", 
    "Crestview Holdings", "Apex Capital Group", "Golden Gate Wealth", "BlueOcean Funds", "Horizon Trading", 
    "TrustCore Bank", "SecureVest", "CapitalBridge", "Summit Financial", "Oasis Capital",
    
    // Healthcare & Pharma
    "BioSynthetix", "MediGen Pharmaceuticals", "VitaCore Health", "CureTech Labs", "Aegis Bio", 
    "NeuroPharma", "Pulse Medical", "GeneThera", "Oncology Innovators", "Lumina Health", 
    "Cellular Dynamics", "TheraTech", "Apex Biomed", "Pioneer Therapeutics", "Global Life Sciences", 
    "MedicaCorp", "HealthQuest", "BioStream", "ClearVision Medical", "Vitality Pharma",
    
    // Energy, Industrial & Aerospace
    "Solaris Power", "EcoEnergy Tech", "Titan Heavy Industries", "AeroDynamics Corp", "Stellar Aerospace", 
    "GreenGrid Solutions", "Oceanic Drilling", "Vulcan Materials", "Apex Mining", "Global Steelworks", 
    "TerraFirma Resources", "Windward Energy", "CarbonFree Solutions", "NextGen Power", "Summit Industrial", 
    "Horizon Energy", "Crestwood Logistics", "BlueSky Aviation", "Pioneer Manufacturing", "Quantum Energy",
    
    // Consumer Goods, Retail & Hospitality
    "Urban Lifestyle", "FreshBite Grocers", "Luxe Brands", "Global Retail Group", "Apex Organics", 
    "PureLife Beverages", "NextGen Apparel", "Summit Foods", "Horizon Retail", "Crest Consumer Goods", 
    "BlueWave Resorts", "Pioneer Electronics", "Oasis Hospitality", "SilverScreen Entertainment", "Global Logistics", 
    "Terra Coffee Co", "Vitality Sports", "Lumina Cosmetics", "Aura Perfumes", "Zenith Automotive"
];

function generateIPO() {
	var availableNames = IPO_COMPANY_NAMES.filter(function(n) {
		for (var key in stockMap) {
			if (stockMap[key].name === n) return false;
		}
		if (state.upcomingIPOs) {
			for (var i = 0; i < state.upcomingIPOs.length; i++) {
				if (state.upcomingIPOs[i].companyName === n) return false;
			}
		}
		return true;
	});

	if (availableNames.length === 0) return; // Exhausted all 100 IPO names

	var name = availableNames[Math.floor(pcg.random() * availableNames.length)];
	var ticker = name.substring(0, 3).toUpperCase() + (Math.floor(pcg.random() * 90) + 10);
	
	// Ensure unique ticker
	if (stockMap[ticker]) return;
	if (state.upcomingIPOs && state.upcomingIPOs.find(function(i) { return i.ticker === ticker; })) return;

	var markets = [
		{ id: "NSE", cur: "INR" },
		{ id: "NASDAQ", cur: "USD" },
		{ id: "EU", cur: "EUR" },
		{ id: "SSE", cur: "CNY" },
		{ id: "TSE", cur: "JPY" },
		{ id: "HKEX", cur: "HKD" }
	];
	// 50% chance NSE, 50% chance foreign
	var isForeign = pcg.random() > 0.5;
	var mkt = isForeign ? markets[Math.floor(pcg.random() * markets.length)] : markets[0];

	var issuePrice = Math.floor(pcg.random() * 1500) + 50; // 50 to 1550
	var fxRate = EXCHANGE_RATES[mkt.cur] || 1;
	var lotSize = Math.max(10, Math.floor((100000 / fxRate) / issuePrice)); // Approx 1 lakh INR equivalent minimum investment
	
	var ipo = {
		id: "IPO_" + Date.now(),
		companyName: name,
		ticker: ticker,
		issuePrice: issuePrice,
		lotSize: lotSize,
		minLots: 1,
		maxLots: 15,
		listingDay: state.day + Math.floor(pcg.random() * 5) + 5, // Lists in 5-9 days
		status: 'OPEN',
		market: mkt.id,
		currency: mkt.cur,
		oversubscription: parseFloat(((pcg.random() * 150) + 0.1).toFixed(2)), // 0.1x to 150x
		userBids: { lots: 0, marginBlocked: 0 }
	};
	
	if (!state.upcomingIPOs) state.upcomingIPOs = [];
	state.upcomingIPOs.push(ipo);
	pushMarketAnnouncement("IPO Alert: " + name + " (" + ticker + ") is open for subscription! Issue Price: " + fmtPrice({currency: mkt.cur}, issuePrice), mkt.id, true);
}

function processIPOListings() {
	if (!state.upcomingIPOs) return;
	
	for (var i = state.upcomingIPOs.length - 1; i >= 0; i--) {
		var ipo = state.upcomingIPOs[i];
		
		if (state.day + 1 >= ipo.listingDay && ipo.status === 'OPEN') {
			ipo.status = 'LISTED';
			
			// 1. Calculate Listing Premium based on Oversubscription
			var premiumPct;
			if (ipo.oversubscription > 100) premiumPct = pcg.random() * 0.80 + 0.20; // 20% to 100% premium
			else if (ipo.oversubscription > 50) premiumPct = pcg.random() * 0.40 + 0.10; // 10% to 50% premium
			else if (ipo.oversubscription > 10) premiumPct = pcg.random() * 0.20 + 0.05; // 5% to 25% premium
			else if (ipo.oversubscription > 1) premiumPct = pcg.random() * 0.10 - 0.02; // -2% to 8% premium
			else premiumPct = pcg.random() * 0.15 - 0.20; // -20% to -5% discount
			
			var listingPrice = parseFloat((ipo.issuePrice * (1 + premiumPct)).toFixed(2));
			
			// 2. Process Allotment Lottery
						if (ipo.userBids.lots > 0) {
				var allotmentChance = 1.0;
				if (ipo.oversubscription > 1) allotmentChance = 1.0 / (ipo.oversubscription * 0.5); // Retail usually gets a slight bump over pure QIB oversub
				
				if (pcg.random() < allotmentChance) {
					// WINNER - refund blocked margin first, then deduct share cost
										var qty = ipo.userBids.lots * ipo.lotSize;
					var shareCost = qty * ipo.issuePrice;
					var fxRate = EXCHANGE_RATES[ipo.currency] || 1;
					var shareCostINR = shareCost * fxRate;
					
					state.margin += ipo.userBids.marginBlocked; // Unblock margin
					state.margin -= shareCostINR; // Deduct actual cost of shares in INR
					if (!state.positions[ipo.ticker]) {
						state.positions[ipo.ticker] = { qty: 0, avgPrice: 0, type: "EQUITY" };
					}
					state.positions[ipo.ticker].qty += qty;
					state.positions[ipo.ticker].avgPrice = ipo.issuePrice;
					
					toast("IPO ALLOTMENT SUCCESS", "You were allotted " + qty + " shares of " + ipo.ticker + "!\nView them in your Terminal Positions.", "success");
				} else {
					// LOSER - full refund
					state.margin += ipo.userBids.marginBlocked;
					toast("IPO ALLOTMENT FAILED", "You were NOT allotted shares of " + ipo.ticker + ". \u20b9" + ipo.userBids.marginBlocked.toFixed(2) + " refunded.", "error");
				}
			}
				// CLEAR BIDS SO NO DOUBLE COUNT
				ipo.userBids.lots = 0;
				ipo.userBids.marginBlocked = 0;
			
			// 3. Inject into Market (with all required properties)
			var newStock = {
				ticker: ipo.ticker,
				name: ipo.companyName,
				market: ipo.market || "NSE",
				sector: "TECH",
				base: listingPrice,
				vol: 0.03,
				volatilityMultiplier: 0.03,
				currency: ipo.currency || "INR",
				ltp: listingPrice,
				open: listingPrice,
				prevClose: ipo.issuePrice,
				_prevTick: listingPrice,
				volume: 100000,
				history: [listingPrice],
				volumeHistory: [0],
				ohlcHistory: [],
				currentCandle: null,
				circuitHit: null,
				circuitTierIndex: 0,
				haltUntil: null,
				haltImbalance: 0,
				postHaltVolatility: 1,
				beta: 1.0 + (pcg.random() * 0.5),
				iv: 0.25 + (pcg.random() * 0.15),
				shares: 50000000,
				baseVolume: 100000
			};
			
			// Generate a flat pre-history at issue price so the chart starts smoothly
			newStock.preHistory = [];
			for(var j=0; j<66; j++) newStock.preHistory.push(ipo.issuePrice);
			newStock.preOHLC = buildPreOHLC(newStock, state.candlePeriod);
			
			marketStocks.push(newStock);
			stockMap[ipo.ticker] = newStock;
			
			var mockStock = { currency: ipo.currency || "INR" };
			pushMarketAnnouncement(ipo.ticker + " lists on the exchange at " + fmtPrice(mockStock, listingPrice) + " (" + ((premiumPct)*100).toFixed(1) + "% premium)", ipo.market || "NSE", premiumPct > 0);
			
			// Force UI updates
			renderWatchlist();
		}
	}
}

function subscribeIPO(ipoId) {
	if (!state.upcomingIPOs) return;
	var ipo = state.upcomingIPOs.find(function(i) { return i.id === ipoId; });
	if (!ipo || ipo.status !== 'OPEN') return;
	
	var mockStock = { currency: ipo.currency || "INR", ltp: ipo.issuePrice };
	var formattedIssuePrice = fmtPrice(mockStock, ipo.issuePrice);
	
	var lotsStr = prompt("How many lots do you want to bid for? (Min: " + ipo.minLots + ", Max: " + ipo.maxLots + "\n1 Lot = " + ipo.lotSize + " shares @ " + formattedIssuePrice + ")");
	if (!lotsStr) return;
	
	var lots = parseInt(lotsStr, 10);
	if (isNaN(lots) || lots < ipo.minLots || (ipo.userBids.lots + lots) > ipo.maxLots) {
		toast("Error", "Invalid lot quantity or exceeds maximum limit of " + ipo.maxLots + " total lots.", "error");
		return;
	}
	var fxRate = EXCHANGE_RATES[ipo.currency] || 1;
	var totalCostNative = lots * ipo.lotSize * ipo.issuePrice;
	var totalCostINR = totalCostNative * fxRate;
	
	if (state.margin < totalCostINR) {
		toast("Error", "Insufficient margin to block " + fmtCur(totalCostINR), "error");
		return;
	}
	
	state.margin -= totalCostINR;
	ipo.userBids.lots += lots;
	ipo.userBids.marginBlocked += totalCostINR;
	
	toast("IPO Bid Placed", "Blocked " + fmtCur(totalCostINR) + " for " + lots + " lots of " + ipo.ticker, "success");
	renderIPOs();
	renderTopBar();
};

function renderIPOs() {
	var activeTbody = document.getElementById("ipo-active-tbody");
	var bidsTbody = document.getElementById("ipo-bids-tbody");
	if (!activeTbody || !bidsTbody) return;
	
	if (!state.upcomingIPOs || state.upcomingIPOs.length === 0) {
		activeTbody.innerHTML = "<tr><td colspan='7' class='empty'>No active IPOs currently open.</td></tr>";
		bidsTbody.innerHTML = "<tr><td colspan='3' class='empty'>You have no active IPO applications.</td></tr>";
		return;
	}
	
	var activeHtml = "";
	var bidsHtml = "";
	
	state.upcomingIPOs.forEach(function(ipo) {
		var marketBadge = ipo.market || 'NSE';
		var badgeHtml = "<span class='wl-mkt-badge wlm-" + marketBadge.toLowerCase() + "'>" + marketBadge + "</span>";
		var mockStock = { currency: ipo.currency || "INR", ltp: ipo.issuePrice };
		
		if (ipo.status === 'OPEN') {
			var daysLeft = ipo.listingDay - state.day;
			var minInv = ipo.minLots * ipo.lotSize * ipo.issuePrice;
			activeHtml += "<tr>" +
				"<td><strong>" + ipo.ticker + "</strong> " + badgeHtml + "<br><span style='font-size:10px; color:var(--text-dim);'>" + ipo.companyName + "</span></td>" +
				"<td class='r'>" + (daysLeft <= 0 ? "<span style='color:var(--green); font-weight:bold;'>Listing Today!</span>" : daysLeft + " Day(s)") + "</td>" +
				"<td class='r'>" + fmtPrice(mockStock, ipo.issuePrice) + "</td>" +
				"<td class='r'>" + ipo.lotSize + " Shares</td>" +
				"<td class='r'>" + fmtPrice(mockStock, minInv) + "</td>" +
				"<td class='r'><span style='color:var(--orange); font-weight:bold;'>OPEN</span></td>" +
				"<td class='r'><button class='buy-btn btn-sm' onclick='subscribeIPO(\"" + ipo.id + "\")'>Subscribe</button></td>" +
			"</tr>";
		}
		
		if (ipo.userBids.lots > 0) {
			bidsHtml += "<tr>" +
				"<td><strong>" + ipo.ticker + "</strong> " + badgeHtml + "</td>" +
				"<td class='r'>" + ipo.userBids.lots + " Lots (" + (ipo.userBids.lots * ipo.lotSize) + " Shares)</td>" +
				"<td class='r'>" + fmtCur(ipo.userBids.marginBlocked) + "</td>" +
			"</tr>";
		}
	});
	
	activeTbody.innerHTML = activeHtml || "<tr><td colspan='7' class='empty'>No active IPOs currently open.</td></tr>";
	bidsTbody.innerHTML = bidsHtml || "<tr><td colspan='3' class='empty'>You have no active IPO applications.</td></tr>";
};

// ==================== CORPORATE ACTIONS ====================
function processCorporateActions() {
	marketStocks.forEach(function(s) {
		if (s.market === "CRYPTO" || s.market === "FX" || s.market === "BOND") return;
		if (s.ticker.indexOf("NIFTY") !== -1 || s.ticker === "DALAL" || s.ticker === "VIX") return;
		
		// 1.5% chance per day per stock for a corporate action
		if (pcg.random() < 0.015) {
			var isSplit = (pcg.random() < 0.25); // 25% splits, 75% dividends
			
			if (isSplit && s.ltp > 100) { 
				var ratios = [2, 3, 5, 10];
				var ratio = ratios[Math.floor(pcg.random() * ratios.length)];
				
				// 1. Adjust Stock Prices
				s.base /= ratio;
				s.ltp /= ratio;
				s.open /= ratio;
				s.prevClose /= ratio;
				s._prevTick /= ratio;
				
				// 2. Adjust History Arrays
				if (s.history) s.history = s.history.map(function(p) { return p / ratio; });
				if (s.preHistory) s.preHistory = s.preHistory.map(function(p) { return p / ratio; });
				if (s.preOHLC) s.preOHLC = s.preOHLC.map(function(c) {
					return { o: c.o/ratio, h: c.h/ratio, l: c.l/ratio, c: c.c/ratio, v: c.v*ratio, ticks: c.ticks };
				});
				if (s.ohlcHistory) s.ohlcHistory = s.ohlcHistory.map(function(c) {
					return { o: c.o/ratio, h: c.h/ratio, l: c.l/ratio, c: c.c/ratio, v: c.v*ratio, ticks: c.ticks };
				});
				if (s.currentCandle) {
					s.currentCandle.o /= ratio; s.currentCandle.h /= ratio;
					s.currentCandle.l /= ratio; s.currentCandle.c /= ratio;
					s.currentCandle.v *= ratio;
				}
				
				// 3. Adjust Player Equity Positions
				var pos = state.positions[s.ticker];
				if (pos && pos.qty !== 0) {
					pos.qty *= ratio;
					pos.avgPrice /= ratio;
				}
				
				// 4. Adjust Options (re-key to prevent orphaned positions)
				var optKeys = Object.keys(state.optionsPositions);
				for (var oi = 0; oi < optKeys.length; oi++) {
					var optId = optKeys[oi];
					var optPos = state.optionsPositions[optId];
					if (optPos.ticker === s.ticker) {
						var oldStrike = optPos.strike;
						optPos.strike = parseFloat((oldStrike / ratio).toFixed(4));
						optPos.lotSize *= ratio;
						optPos.avgPremium /= ratio;
						// Re-key: build new ID with adjusted strike
						var newId = optPos.ticker + "_" + optPos.type + "_" + optPos.strike + "_" + optPos.expiryType;
						if (newId !== optId) {
							state.optionsPositions[newId] = optPos;
							delete state.optionsPositions[optId];
						}
					}
				}
				
				// 5. Adjust Pending Orders
				if (state.pendingOrders) {
					for (var p = 0; p < state.pendingOrders.length; p++) {
						var order = state.pendingOrders[p];
						if (order.ticker === s.ticker) {
							order.limitPrice = parseFloat((order.limitPrice / ratio).toFixed(4));
							order.qty *= ratio;
						}
					}
				}
				
				pushMarketAnnouncement(s.ticker + " announced a " + ratio + "-for-1 Stock Split!", s.market, true);
				
			} else {
				// DIVIDEND
				// Dividend yield between 1% and 4%
				var yieldPct = pcg.random() * 0.03 + 0.01;
				var divPerShare = parseFloat((s.ltp * yieldPct).toFixed(2));
				if (divPerShare < 0.01) return;
				
				// Price drops by dividend amount
				s.ltp = Math.max(0.01, s.ltp - divPerShare);
				s.prevClose = Math.max(0.01, s.prevClose - divPerShare);
				
				pos = state.positions[s.ticker];
				if (pos && pos.qty !== 0) {
					var fxRate = EXCHANGE_RATES[s.currency] || 1;
					var totalDiv = Math.abs(pos.qty) * divPerShare; // in native currency
					var totalDivINR = totalDiv * fxRate;
					
					if (pos.qty > 0) {
						// Long holder receives dividend
						state.margin += totalDivINR;
						toast("Dividend Received", "Received \u20b9" + totalDivINR.toFixed(2) + " dividend from " + s.ticker, "success");
					} else {
						// Short seller pays dividend
						state.margin -= totalDivINR;
						toast("Dividend Paid", "Paid \u20b9" + totalDivINR.toFixed(2) + " dividend for shorting " + s.ticker, "error");
					}
				}
				
				pushMarketAnnouncement(s.ticker + " went ex-dividend today. Payout: " + fmtPrice(s, divPerShare) + " per share.", s.market, true);
			}
		}
	});
}

function startNewDay() {
	// Bug 4 fix: clients cannot advance the day; that's the host's authority
	if (isMultiplayerClient) {
		toast("Client Mode", "Day progression is controlled by the host.", "info");
		return;
	}
	document.getElementById("day-overlay").classList.add("hidden");

	if (!state.upcomingIPOs) state.upcomingIPOs = [];
	if (!state.mfHoldings) state.mfHoldings = {};
	if (pcg.random() < 0.50) generateIPO(); // 50% chance daily
	processIPOListings();
	
	if (!state.portfolioHistory) state.portfolioHistory = [];
	state.portfolioHistory.push({
		day: state.day,
		val: calcPortfolioValue()
	});

	state.day++;
	if (typeof processDailyInvestments === 'function') processDailyInvestments();

	// Daily FX drift — gently moves exchange rates ±0.3% per day using the
	// seeded PCG RNG so the simulation stays deterministic across reloads.
	// Each rate is capped at ±15% of the hard-coded baseline to prevent
	// runaway divergence over many days.
	(function driftFX() {
		var FX_BASE = { USD:91.03, CNY:13.28, JPY:0.583, HKD:11.67, GBP:115.5, EUR:98.5, AUD:54.2, CAD:61.3, CHF:102.4 };
		var MAX_DRIFT = 0.15; // ±15% from baseline
		var DAILY_VOL = 0.003; // 0.3% per day
		Object.keys(FX_BASE).forEach(function(cur) {
			var base = FX_BASE[cur];
			var current = EXCHANGE_RATES[cur];
			var drift = (pcg.random() - 0.5) * 2 * DAILY_VOL * base;
			var newRate = current + drift;
			// Clamp to ±MAX_DRIFT of baseline
			newRate = Math.max(base * (1 - MAX_DRIFT), Math.min(base * (1 + MAX_DRIFT), newRate));
			EXCHANGE_RATES[cur] = parseFloat(newRate.toFixed(4));
		});
		// Keep the multiplayer reference in sync
		if (window._EXCHANGE_RATES) Object.assign(window._EXCHANGE_RATES, EXCHANGE_RATES);
	})();

	
	processCorporateActions();

	// Quarterly Earnings Gaps
	if (pcg.random() < 0.08 && marketStocks.length > 0) { // 8% chance per day
		var targetStock = marketStocks[Math.floor(pcg.random() * marketStocks.length)];
		var nonEquityMarkets = ["INDEX", "BOND", "CRYPTO", "COMM", "FX"];
		if (!nonEquityMarkets.includes(targetStock.market) && !targetStock.name.includes("Fund") && !targetStock.name.includes("Index") && targetStock.ticker !== "DALAL") {
			var isBeat = pcg.random() > 0.5;
			var gapPct = (pcg.random() * 0.10) + 0.05; // 5% to 15% gap
			if (!isBeat) gapPct = -gapPct;
			
			var oldPrice = targetStock.ltp;
			targetStock.ltp = parseFloat((oldPrice * (1 + gapPct)).toFixed(2));
			targetStock.open = targetStock.ltp;
			
			pushMarketAnnouncement("EARNINGS " + (isBeat ? "BEAT" : "MISS") + ": " + targetStock.ticker + " gaps " + (isBeat ? "UP" : "DOWN") + " by " + (Math.abs(gapPct)*100).toFixed(1) + "%", targetStock.market, !isBeat);
		}
	}

	populateExpiryDropdown();
	state.time = START_TIME;
	state.marketOpen = true;
	state.isRunning = true;

	// Process Bank EMIs
	var loansToKeep = [];
	state.loans.forEach(function (l) {
		if (state.margin >= l.emi) {
			state.margin -= l.emi;
			l.daysLeft--;
			if (l.daysLeft > 0) {
				loansToKeep.push(l);
			} else {
				state.cibilScore = Math.min(900, state.cibilScore + 40);
				state.loanHistory.push(
					Object.assign({}, l, { status: "Repaid", closingDay: state.day }),
				);
				toast(
					"Loan Settled",
					"Loan #" + l.id + " fully repaid. CIBIL score boosted!",
					"success",
				);
			}
		} else {
			// Default!
			state.cibilScore = Math.max(300, state.cibilScore - 50);
			toast(
				"EMI DEFAULT",
				"Missed EMI for Loan #" +
					l.id +
					". CIBIL score slashed. Assets Liquidated!",
				"error",
			);

			// Force liquidate open market positions through the same close helpers
			// used elsewhere, so short collateral and option proceeds are not double-counted.
			Object.keys(state.optionsPositions).slice().forEach(function (id) {
				closeOptionPosition(id, true);
			});
			Object.keys(state.positions).slice().forEach(function (ticker) {
				closeEquityPosition(ticker, true);
			});

			// Try to recover EMI after liquidation
			if (state.margin >= l.emi) {
				state.margin -= l.emi;
				l.daysLeft--;
				toast(
					"EMI Recovered",
					"Assets liquidated to recover EMI for Loan #" + l.id,
					"warning",
				);
				if (l.daysLeft > 0) {
					loansToKeep.push(l);
				} else {
					state.loanHistory.push(
						Object.assign({}, l, {
							status: "Repaid (Force)",
							closingDay: state.day,
						}),
					);
					toast(
						"Loan Settled",
						"Loan #" + l.id + " fully repaid after liquidation.",
						"success",
					);
				}
			} else {
				// BANKRUPTCY: User has no cash and no stocks, but still owes EMI.
				// Seize all off-shore assets (FDs, Real Estate, Mutual Funds) and foreclose!
				toast(
					"BANKRUPTCY DECLARED",
					"Failed to recover EMI. Dalal Bank has seized ALL your Fixed Deposits, Properties, and Mutual Funds! CIBIL dropped to 300.",
					"error"
				);
				
				state.margin = 0;
				state.fixedDeposits = [];
				state.realEstate = [];
				state.mortgages = [];
				state.mfHoldings = {};
				state.sips = {};
				state.cibilScore = 300;
				
				state.loanHistory.push(
					Object.assign({}, l, {
						status: "Bankrupt",
						closingDay: state.day,
					}),
				);
			}
		}
	});
	state.loans = loansToKeep;

	// Process Fixed Deposits
	if (state.fixedDeposits) {
		var fdsToKeep = [];
		state.fixedDeposits.forEach(function (fd) {
			fd.daysLeft--;
			if (fd.daysLeft > 0) {
				fdsToKeep.push(fd);
			} else {
				var returnAmt = fd.principal + fd.interest;
				state.margin += returnAmt;
				toast(
					"FD Matured",
					"Fixed Deposit #" +
						fd.id +
						" matured. " +
						fmtCur(returnAmt) +
						" credited.",
					"success",
				);
			}
		});
		state.fixedDeposits = fdsToKeep;
	}

	// Process Real Estate & Mortgages
	if (state.propertyMarket) {
		var newsEvent = generateRealEstateNews();

		var rentCollected = 0;
		state.propertyMarket.forEach(function (prop) {
			var drift = (pcg.random() - 0.45) * 0.005; // Slightly upward drift
			var impact = 0;
			if (
				newsEvent.target === "ALL" ||
				newsEvent.target === prop.type ||
				newsEvent.target === prop.id
			) {
				impact = newsEvent.impact;
			}
			prop.price = Math.max(
				prop.basePrice * 0.5,
				prop.price * (1 + drift + impact),
			);
		});

		// Collect rent once per tick (distributed across 375 ticks/day = correct daily total)
		if (state.realEstate) {
			state.realEstate.forEach(function (prop) {
				var mp = state.propertyMarket.find(function (p) {
					return p.id === prop.marketId;
				});
				if (mp) prop.marketPrice = mp.price;
				rentCollected += (prop.marketPrice * (prop.yieldApr / 100)) / 365; // correct daily rent
			});
			if (rentCollected > 0) state.margin += rentCollected;
		}
	}

	if (state.mortgages) {
		var mortgagesToKeep = [];
		state.mortgages.forEach(function (m) {
			if (state.margin >= m.emi) {
				state.margin -= m.emi;
				m.daysLeft--;
				if (m.daysLeft > 0) {
					mortgagesToKeep.push(m);
				} else {
					state.cibilScore = Math.min(900, state.cibilScore + 50);
					toast(
						"Mortgage Cleared",
						"Property Mortgage fully paid off!",
						"success",
					);
				}
			} else {
				// Foreclosure!
				state.cibilScore = Math.max(300, state.cibilScore - 100);
				toast(
					"FORECLOSURE",
					"Missed Mortgage EMI. Bank seized property!",
					"error",
				);

				state.loanHistory.push({
					id: "MORTGAGE",
					principal: m.principal,
					term: m.daysTotal,
					closingDay: state.day,
					status: "DEFAULT",
				});

				// Sell the property at market value
				var propIdx = state.realEstate.findIndex(function (p) {
					return p.id === m.propId;
				});
				if (propIdx !== -1) {
					var prop = state.realEstate[propIdx];
					var debtToClear = (m.principal / m.daysTotal) * m.daysLeft;
					var proceeds = prop.marketPrice - debtToClear;
					if (proceeds > 0) state.margin += proceeds;
					state.realEstate.splice(propIdx, 1);
				}
			}
		});
		state.mortgages = mortgagesToKeep;
	}

	var bankView = document.getElementById("view-bank");
	if (bankView && !bankView.classList.contains("hidden")) updateBankUI();
	var reView = document.getElementById("view-realestate");
	if (reView && !reView.classList.contains("hidden")) updateRealEstateUI();

	// Decrement days FIRST, then settle (prevents off-by-one expiry)
	Object.values(state.optionsPositions).forEach(function (p) {
		p.daysToExpiry = Math.max(0, p.daysToExpiry - 1);
	});

	settleExpiredOptions();

	if (state.inventory && state.inventory.insiderTips && state.inventory.insiderTips.length > 0) {
		state.inventory.insiderTips.forEach(function(tip) {
			tip.daysLeft--;
		});
	}

	// 24/7 markets and overnight gap logic
	marketStocks.forEach(function (stock) {
		// Only reset 24/7 continuous markets (and DALAL) at global midnight.
		// Equities are reset at their exact opening minute in tickMinute()
		if (
			stock.ticker === "DALAL" ||
			stock.market === "CRYPTO" ||
			stock.market === "COMM" ||
			stock.market === "FX" ||
			stock.market === "BOND"
		) {
			resetMarketStock(stock);
		}
	});

	// Sync legacy state vars from live index objects
	var legNifty = stockMap["NIFTY 50"];
	var legSensex = stockMap["SENSEX"];
	if (legNifty) { state.niftyValue = legNifty.ltp; state.niftyBase = legNifty.ltp; }
	if (legSensex) { state.sensexValue = legSensex.ltp; state.sensexBase = legSensex.ltp; }
	state.niftyHistory = Array(state.historyLen).fill(state.niftyValue);
	state.sentiment = 0;
	// Note: slTargets are intentionally NOT cleared - user SL/Targets persist across days

	// Clear pending orders with DAY time-in-force at end of day
	state.pendingOrders = state.pendingOrders.filter(function(o) { return o.tif !== "DAY"; });

	document.getElementById("day-counter").textContent = "Day " + state.day;
	state.newsCount = 0;
	document.getElementById("news-count").textContent = "0";

	var container = document.getElementById("news-container");
	var el = document.createElement("div");
	el.className = "news-item";
	el.innerHTML =
		'<span class="news-time mono">12:00 AM</span><span class="news-mkt-badge nmb-global">GLOBAL</span><span class="news-text">\u2014 DAY ' +
		state.day +
		" \u2014 Global 24-hour cycle started. Daily gaps applied.</span>";
	container.prepend(el);

	clearChartInstance();
	_wlCache = {};
	_wlLastOrder = ""; // force watchlist DOM rebuild for new day

	document.querySelectorAll(".ctrl-btn").forEach(function (b) {
		if (b.id !== "btn-theme" && b.id !== "btn-settings")
			b.classList.remove("on");
	});
	document.getElementById("btn-play").classList.add("on");

	// Syndicate Perks processing
	if (state.inventory) {
		if (state.inventory.brokerageFreeDays > 0) {
			state.inventory.brokerageFreeDays--;
			if (state.inventory.brokerageFreeDays === 0) {
				toast("Syndicate", "Your Brokerage Holiday has ended.", "info");
			}
		}
		
		if (state.inventory.circuitOverrideDays > 0) {
			state.inventory.circuitOverrideDays--;
			if (state.inventory.circuitOverrideDays === 0) {
				toast("Syndicate", "Your Circuit Override has expired. Limits are back in effect.", "info");
			}
		}

		if (state.inventory.profitBoostDays > 0) {
			state.inventory.profitBoostDays--;
			if (state.inventory.profitBoostDays === 0) {
				toast("Syndicate", "Your Profit Amplifier has expired.", "info");
			}
		}
		
		// Insider tips have been moved to resetMarketStock so they gap on market open
	}

	if (typeof renderSyndicateInventory === "function") renderSyndicateInventory();

	renderAll();
	startClock();
	toast("Day " + state.day, "New trading day started! Good luck.", "success");
}

function settleExpiredOptions() {
	var expired = [];
	Object.entries(state.optionsPositions).forEach(function (entry) {
		var id = entry[0],
			pos = entry[1];
		if (pos.daysToExpiry === 0) {
			var stock = stockMap[pos.ticker];
			if (!stock) return;

			var intrinsic =
				pos.type === "CALL"
					? Math.max(0, stock.ltp - pos.strike)
					: Math.max(0, pos.strike - stock.ltp);
			var isShort = pos.lots < 0;
			var absLots = Math.abs(pos.lots);
			var totalQty = absLots * pos.lotSize;
			var settlementValue = intrinsic * totalQty;
			var fxRate = EXCHANGE_RATES[stock.currency] || 1;
			var settlementValueINR = settlementValue * fxRate;
			var brokerage = settlementValueINR * 0.001;
			if (state.inventory && state.inventory.brokerageFreeDays > 0) brokerage = 0;
			
			var pnl;
			if (isShort) {
				pnl = (pos.avgPremium - intrinsic) * totalQty * fxRate - brokerage;
				var shortReturn = pos.blockedMargin - settlementValueINR - brokerage;
				state.margin += shortReturn;
				if (state.margin < 0) {
					toast("MARGIN CALL", "Short option on " + pos.ticker + " expired deep ITM! Margin is now negative: " + fmtCur(state.margin), "error");
				}
			} else {
				var costBasis = pos.avgPremium * totalQty;
				pnl = (settlementValue - costBasis) * fxRate - brokerage;
				state.margin += settlementValueINR - brokerage;
			}
			
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
			
			state.totalBrokerage = (state.totalBrokerage || 0) + brokerage;
			expired.push({
				id: id,
				ticker: pos.ticker,
				type: pos.type,
				strike: pos.strike,
				pnl: pnl,
			});

			// Record trade history for settlement
			state.tradeHistory.unshift({
				time: formatTime(state.time),
				day: state.day,
				ticker: pos.ticker,
				side: intrinsic > 0 ? "SETTLE" : "EXPIRED",
				type: pos.type + " " + pos.strike + " EXPIRY",
				qty: totalQty,
				price: intrinsic,
				value: settlementValueINR,
				pnl: pnl
			});

			delete state.optionsPositions[id];
		}
	});

	if (expired.length > 0) {
		var totalPnl = expired.reduce(function (sum, e) {
			return sum + e.pnl;
		}, 0);
		toast(
			"Options Expired",
			expired.length + " option(s) settled. P&L: " + fmtCur(totalPnl),
			totalPnl >= 0 ? "success" : "error",
		);
	}
}

// ==================== NEWS ====================
function pushMarketAnnouncement(text, market, isOpen) {
	var container = document.getElementById("news-container");
	if (!container) return;

	state.newsCount++;
	var countEl = document.getElementById("news-count");
	if (countEl) countEl.textContent = state.newsCount;

	var el = document.createElement("div");
	el.className = "news-item " + (isOpen ? "positive" : "negative");
	el.setAttribute("data-market", market);

	var nf = state.newsMarketFilter;
	if (nf !== "ALL" && market !== nf) el.style.display = "none";

	var badgeCls = "news-mkt-badge nmb-" + market.toLowerCase();
	var marketBadge = '<span class="' + badgeCls + '">' + market + "</span>";
	el.innerHTML =
		'<span class="news-time">' +
		formatTime(state.time) +
		"</span>" +
		marketBadge +
		'<span class="news-text">Market: ' +
		text +
		"</span>";
	container.prepend(el);
	if (container.children.length > 100)
		container.removeChild(container.lastChild);

	toast("Market Update", text, "info");
	if (isMultiplayerHost) {
		queueNewsForBroadcast({ text: text, market: market, impact: isOpen ? 1 : -1, timeStr: formatTime(state.time) });
	}
}

function triggerNewsEvent() {
	var maxTries = 10;
	var ev, text, result, openStocks;

	for (var i = 0; i < maxTries; i++) {
		ev = newsEvents[Math.floor(pcg.random() * newsEvents.length)];
		text = ev.text;
		result = getNewsTargets(ev.target);
		if (!result.stocks || result.stocks.length === 0) continue;

		// Filter to only include open stocks
		openStocks = result.stocks.filter(function (s) {
			return isMarketOpen(s, state.time);
		});
		if (openStocks.length > 0) break; // Found a valid event!
	}

	if (!openStocks || openStocks.length === 0) return; // Give up if no valid event found

	var primary = openStocks[0];
	var actualImpact = Array.isArray(ev.impact) ? ev.impact[Math.floor(pcg.random() * ev.impact.length)] : ev.impact;

	if (ev.isTemplate) {
		text = generateTemplatedNews(ev.target, actualImpact, primary.name, primary.ticker);
	}
	if (result.name) text = text.replace("{name}", escapeHTML(result.name));

	if (text.includes("{val}")) {
		var dynamicVal = (Math.abs(actualImpact) * 100 * (pcg.random() * 1.5 + 0.5)).toFixed(1);
		text = text.replace(/{val}/g, dynamicVal);
	}
	if (text.includes("{idx_val}")) {
		text = text.replace(/{idx_val}/g, (105 + pcg.random() * 10).toFixed(1));
	}

	var evMarket = ev.market || "NSE";

	// Helper to apply impact to an array of stocks, keeping track of already impacted tickers
	var impactedTickers = new Set();

	function applyImpactToStocks(stocksToImpact, impactAmount) {
		stocksToImpact.forEach(function (s) {
			if (impactedTickers.has(s.ticker)) return;
			impactedTickers.add(s.ticker);

			if (!isMarketOpen(s, state.time)) {
				s.overnightNewsGap = (s.overnightNewsGap || 0) + impactAmount;
				return;
			}

			if (s.haltUntil) {
				s.haltImbalance += impactAmount; // Build imbalance if halted!
				return;
			}

			var pDec = s.ltp < 10 ? 4 : 2;
			var newPrice = parseFloat((s.ltp * (1 + impactAmount)).toFixed(pDec));
			var isNoCircuit =
				s.market === "CRYPTO" || s.market === "FX" || s.market === "BOND" || state.circuitLimits === false || (state.inventory && state.inventory.circuitOverrideDays > 0);
			var limitMult = isNoCircuit ? 100.0 : CIRCUIT_TIERS[s.circuitTierIndex];
			var upperCircuit = s.base * (1 + limitMult);
			var lowerCircuit = s.base * (1 - limitMult);
			
			if (newPrice >= upperCircuit && s.ticker !== "DALAL") {
				var actualMovePct = (upperCircuit - s.ltp) / s.ltp;
				s.haltImbalance += (impactAmount - actualMovePct); // Save overflow into imbalance!
				
				newPrice = parseFloat(upperCircuit.toFixed(pDec));
				s.circuitHit = "UC";
				if (s.circuitTierIndex < CIRCUIT_TIERS.length - 1) {
					s.haltUntil = state.time + 15;
					// toast("HALTED", s.ticker + " hit Upper Circuit! Halted for 15 minutes.", "error");
				}
			} else if (newPrice <= lowerCircuit && s.ticker !== "DALAL") {
				actualMovePct = (lowerCircuit - s.ltp) / s.ltp;
				s.haltImbalance += (impactAmount - actualMovePct); // Save overflow into imbalance!
				
				newPrice = parseFloat(lowerCircuit.toFixed(pDec));
				s.circuitHit = "LC";
				if (s.circuitTierIndex < CIRCUIT_TIERS.length - 1) {
					s.haltUntil = state.time + 15;
					// toast("HALTED", s.ticker + " hit Lower Circuit! Halted for 15 minutes.", "error");
				}
			}

			s.ltp = newPrice;
			s.newsMomentum = impactAmount * 0.3;
			s.momentumTicks = 5;
			// News causes volume spike
			s.volume += Math.floor(pcg.random() * 20000 + 5000);
		});
	}

	// 1. Apply primary impact
	var baseImpact = actualImpact * VOL_MULTIPLIER;
	applyImpactToStocks(result.stocks, baseImpact);

	// 2. Apply correlated impacts from the Matrix
	if (CORRELATION_MATRIX[ev.target]) {
		var correlations = CORRELATION_MATRIX[ev.target];
		for (i = 0; i < correlations.length; i++) {
			var cTarget = correlations[i].target;
			var cFactor = correlations[i].correlation;
			var cResult = getNewsTargets(cTarget);
			if (cResult.stocks && cResult.stocks.length > 0) {
				applyImpactToStocks(cResult.stocks, baseImpact * cFactor);
			}
		}
	}

	// Update sentiment
	state.sentiment += Math.round(actualImpact * 500);
	state.sentiment = Math.max(-100, Math.min(100, state.sentiment));

	// newsCount is incremented only here in triggerNewsEvent (pushMarketAnnouncement has its own counter for market open/close announcements)
	state.newsCount++;
	document.getElementById("news-count").textContent = state.newsCount;

	var container = document.getElementById("news-container");
	var el = document.createElement("div");
	el.className = "news-item " + (actualImpact >= 0 ? "positive" : "negative");
	el.setAttribute("data-market", evMarket);

	// Show/hide based on current news filter
	var nf = state.newsMarketFilter;
	if (nf !== "ALL" && evMarket !== nf) el.style.display = "none";

	var warIcon =
		evMarket === "WAR"
			? '<i class="fa-solid fa-gun" style="color:#ff9100;font-size:9px"></i> '
			: "";
	var badgeCls = "news-mkt-badge nmb-" + evMarket.toLowerCase();
	var marketBadge = '<span class="' + badgeCls + '">' + evMarket + "</span>";
	el.innerHTML =
		'<span class="news-time">' +
		formatTime(state.time) +
		"</span>" +
		marketBadge +
		'<span class="news-text">' +
		warIcon +
		text +
		"</span>";
	container.prepend(el);
	if (container.children.length > 100)
		container.removeChild(container.lastChild);

	toast("NEWS", text, actualImpact >= 0 ? "success" : "error"); // Bug #1 fix: was undeclared 'impact', must use 'actualImpact'
	if (isMultiplayerHost) {
		queueNewsForBroadcast({ text: text, market: evMarket, impact: actualImpact, timeStr: formatTime(state.time) });
	}
}

// ==================== TRADING ====================
function calculateOrderMarginLock(stock, side, qty, price) {
	var fxRate = EXCHANGE_RATES[stock.currency] || 1;
	var brokerage = (price * qty * fxRate) * 0.001;
	if (state.inventory && state.inventory.brokerageFreeDays > 0) brokerage = 0;
	var currentPos = state.positions[stock.ticker];
	var currentQty = currentPos ? currentPos.qty : 0;
	var pendingLong = 0;
	var pendingShort = 0;
	state.pendingOrders.forEach(function (o) {
		if (o.ticker === stock.ticker) {
			if (o.side === "BUY" || o.side === "COVER") pendingLong += o.qty;
			if (o.side === "SELL" || o.side === "SHORT") pendingShort += o.qty;
		}
	});
	var effectiveQty = currentQty;
	if (effectiveQty > 0) effectiveQty = Math.max(0, effectiveQty - pendingShort);
	else if (effectiveQty < 0) effectiveQty = Math.min(0, effectiveQty + pendingLong);
	
	var marginLock = brokerage;
	var isClosing = false;
	if (side === "BUY" || side === "COVER") {
		var coverQty = effectiveQty < 0 ? Math.min(qty, Math.abs(effectiveQty)) : 0;
		if (coverQty === qty) isClosing = true;
		var newLongQty = qty - coverQty;
		marginLock += (newLongQty * price * fxRate);
	} else if (side === "SELL" || side === "SHORT") {
		var sellQty = effectiveQty > 0 ? Math.min(qty, effectiveQty) : 0;
		if (sellQty === qty) isClosing = true;
		var newShortQty = qty - sellQty;
		marginLock += (newShortQty * price * 0.2 * fxRate);
	}
	return { amount: marginLock, isClosing: isClosing };
}

function processOrderMarginLock(stock, side, qty, price) {
	var lockData = calculateOrderMarginLock(stock, side, qty, price);
	if (!lockData.isClosing && state.margin < lockData.amount) {
		toast("Error", "Insufficient margin to place order", "error");
		return false;
	}
	state.margin -= lockData.amount;
	return lockData.amount;
}

function executeTrade(side) {
	if (!state.activeStock || !state.marketOpen) {
		if (!state.marketOpen)
			toast("Error", "Market is closed. Start a new day!", "error");
		return;
	}

	var stock = state.activeStock;

	if (stock.market === "INDEX") {
		toast(
			"Error",
			"Indices cannot be traded directly as equity. Please trade Index Options instead.",
			"error"
		);
		return;
	}

	if (stock.haltUntil) {
		toast("Halted", "Cannot trade " + stock.ticker + " while it is halted!", "error");
		return;
	}

	// Block trading if circuit hit
	if (stock.circuitHit === "UC" && (side === "BUY" || side === "COVER")) {
		toast(
			"Circuit",
			"Cannot BUY " + stock.ticker + " - Upper Circuit hit!",
			"error",
		);
		return;
	}
	if (stock.circuitHit === "LC" && (side === "SELL" || side === "SHORT")) {
		toast(
			"Circuit",
			"Cannot SELL " + stock.ticker + " - Lower Circuit hit!",
			"error",
		);
		return;
	}

	var qty = parseInt(document.getElementById("order-qty").value, 10);
	if (isNaN(qty) || qty <= 0) {
		toast("Error", "Invalid quantity", "error");
		return;
	}

	var MAX_EQUITY_QTY = 1000000;
	var currentPos = state.positions[stock.ticker];
	var currentQty = currentPos ? currentPos.qty : 0;

	var pendingLong = 0;
	var pendingShort = 0;
	state.pendingOrders.forEach(function (o) {
		if (o.ticker === stock.ticker) {
			if (o.side === "BUY" || o.side === "COVER") pendingLong += o.qty;
			if (o.side === "SELL" || o.side === "SHORT") pendingShort += o.qty;
		}
	});

	var maxLong =
		(currentQty > 0 ? currentQty : 0) +
		pendingLong +
		((side === "BUY" || side === "COVER") ? qty : 0);
	var maxShort =
		(currentQty < 0 ? Math.abs(currentQty) : 0) +
		pendingShort +
		((side === "SELL" || side === "SHORT") ? qty : 0);

	if (maxLong > MAX_EQUITY_QTY || maxShort > MAX_EQUITY_QTY) {
		toast(
			"Error",
			"Position Limit Exceeded (Max 1M shares limit includes pending orders)",
			"error",
		);
		return;
	}

	var orderType = document.getElementById("order-type").value;
	var tif = document.getElementById("order-tif")
		? document.getElementById("order-tif").value
		: "DAY";
	var spread = stock.bidAskSpread || 0;
	var executionPrice =
		(side === "BUY" || side === "COVER") ? stock.ltp + spread : Math.max(0.0001, stock.ltp - spread);
	var pDecimals = stock.ltp < 10 ? 4 : 2;
	executionPrice = parseFloat(executionPrice.toFixed(pDecimals));

	if (orderType === "LIMIT") {
		var limitPrice = parseFloat(
			document.getElementById("order-limit-price").value,
		);
		if (isNaN(limitPrice) || limitPrice <= 0) {
			toast("Error", "Invalid limit price", "error");
			return;
		}
		var lockedAmt = processOrderMarginLock(stock, side, qty, limitPrice);
		if (lockedAmt === false) return;
		state.pendingOrders.push({
			id: pcg.random().toString(36).substr(2, 9),
			time: formatTime(state.time),
			day: state.day,
			ticker: stock.ticker,
			side: side,
			qty: qty,
			limitPrice: limitPrice,
			lockedMargin: lockedAmt,
			orderType: "LIMIT",
			tif: tif,
			currency: stock.currency,
		});
		toast(
			"Pending Order",
			"Limit order placed: " +
				side +
				" " +
				qty +
				" " +
				stock.ticker +
				" @ " +
				limitPrice.toFixed(2),
			"info",
		);
		document.getElementById("order-qty").value = 1;
		document.getElementById("order-type").value = "MARKET";
		document.getElementById("limit-price-group").classList.add("hidden");
		renderAll();
		return;
	}

	if (orderType === "STOP") {
		var stopPrice = parseFloat(
			document.getElementById("order-limit-price").value,
		);
		if (isNaN(stopPrice) || stopPrice <= 0) {
			toast("Error", "Invalid stop price", "error");
			return;
		}
		if ((side === "BUY" || side === "COVER") && stopPrice <= stock.ltp) {
			toast(
				"Error",
				"BUY STOP price must be placed ABOVE the current market price (" +
					stock.ltp +
					").",
				"error",
			);
			return;
		}
		if ((side === "SELL" || side === "SHORT") && stopPrice >= stock.ltp) {
			toast(
				"Error",
				"SELL STOP price must be placed BELOW the current market price (" +
					stock.ltp +
					").",
				"error",
			);
			return;
		}
		lockedAmt = processOrderMarginLock(stock, side, qty, stopPrice);
		if (lockedAmt === false) return;
		state.pendingOrders.push({
			id: pcg.random().toString(36).substr(2, 9),
			time: formatTime(state.time),
			day: state.day,
			ticker: stock.ticker,
			side: side,
			qty: qty,
			limitPrice: stopPrice, // Reuse limitPrice field for simplicity in execution
			lockedMargin: lockedAmt,
			orderType: "STOP",
			tif: tif,
			currency: stock.currency,
		});
		toast(
			"Pending Order",
			"STOP order placed: " +
				side +
				" " +
				qty +
				" " +
				stock.ticker +
				" @ " +
				stopPrice.toFixed(2),
			"info",
		);
		document.getElementById("order-qty").value = 1;
		document.getElementById("order-type").value = "MARKET";
		document.getElementById("limit-price-group").classList.add("hidden");
		renderAll();
		return;
	}

	if (orderType === "MARKET") {
		if (!isMarketOpen(stock, state.time)) {
			toast(
				"Closed",
				"Cannot place MARKET orders when " +
					stock.market +
					" is closed. Use LIMIT order to queue for open.",
				"error",
			);
			return;
		}
		var avail = stock.available_liquidity || 0;

		if (tif === "FOK" && qty > avail) {
			toast(
				"Order Rejected",
				"FOK: Insufficient liquidity to fill entire order instantly.",
				"error",
			);
			return;
		}

		var fillQty = Math.min(qty, avail);
		var remainingQty = qty - fillQty;

		if (fillQty > 0) {
			// Bug A fix: Send MARKET orders to host if we are a client
			if (isMultiplayerClient) {
				var fxRate = EXCHANGE_RATES[stock.currency] || 1;
				var costINR = (executionPrice * fillQty) * fxRate;
				var pos = state.positions[stock.ticker] || { qty: 0 };
				var hasMargin = true;
				if (side === "BUY" && pos.qty >= 0) {
					if (state.margin < costINR) hasMargin = false;
				} else if (side === "SHORT" || (side === "SELL" && pos.qty <= 0)) {
					if (state.margin < costINR * 0.2) hasMargin = false;
				}
				if (!hasMargin) {
					toast("Error", "Insufficient margin to place MARKET order", "error");
					return;
				}
				sendOrderToHost(stock.ticker, side, fillQty, null, tif);
				document.getElementById("order-qty").value = 1;
				toast("Order Sent", "Waiting for host to fill...", "info");
				return;
			}

			if (processEquityTrade(stock, side, fillQty, executionPrice)) {
				stock.available_liquidity -= fillQty;

				if (remainingQty === 0) {
					document.getElementById("order-qty").value = 1;
				} else {
					if (tif === "IOC") {
						toast(
							"Partial Fill (IOC)",
							"Filled " + fillQty + ", cancelled remaining " + remainingQty,
							"info",
						);
						document.getElementById("order-qty").value = 1;
					} else if (tif === "DAY") {
						toast(
							"Partial Fill",
							"Filled " + fillQty + ", pending " + remainingQty,
							"info",
						);
						lockedAmt = processOrderMarginLock(stock, side, remainingQty, stock.ltp);
						if (lockedAmt !== false) {
							state.pendingOrders.push({
								id: pcg.random().toString(36).substr(2, 9),
								time: formatTime(state.time),
								day: state.day,
								ticker: stock.ticker,
								side: side,
								qty: remainingQty,
								lockedMargin: lockedAmt,
								orderType: "MARKET",
								tif: "DAY",
								currency: stock.currency,
							});
						}
						document.getElementById("order-qty").value = 1;
					}
				}
				renderAll();
			}
		} else {
			if (tif === "IOC") {
				toast(
					"Order Cancelled",
					"IOC: No liquidity available right now.",
					"error",
				);
			} else if (tif === "DAY") {
				lockedAmt = processOrderMarginLock(stock, side, qty, stock.ltp);
				if (lockedAmt === false) return;
				state.pendingOrders.push({
					id: pcg.random().toString(36).substr(2, 9),
					time: formatTime(state.time),
					day: state.day,
					ticker: stock.ticker,
					side: side,
					qty: qty,
					lockedMargin: lockedAmt,
					orderType: "MARKET",
					tif: "DAY",
					currency: stock.currency,
				});
				toast(
					"Pending Order",
					"Market order queued (Awaiting Liquidity)",
					"info",
				);
				document.getElementById("order-qty").value = 1;
				renderAll();
			}
		}
	}
}

function processEquityTrade(stock, side, qty, price, isBot) {
	var fxRate = EXCHANGE_RATES[stock.currency] || 1; // INR per 1 unit of stock's currency
	var cost = price * qty; // in native currency
	var costINR = cost * fxRate; // in INR
	var brokerage = costINR * 0.001; // 0.1% Brokerage
		if (state.inventory && state.inventory.brokerageFreeDays > 0) brokerage = 0;
	var currentPos = state.positions[stock.ticker] || { qty: 0, avgPrice: 0 };
	var pos = { qty: currentPos.qty, avgPrice: currentPos.avgPrice };
	var nextMargin = state.margin;
	var tradeType;
	var toastArgs;
	var pnlRealized = null;

	if (side === "BUY") {
		if (pos.qty < 0) {
			var coverQty = Math.min(qty, Math.abs(pos.qty));
			var pnl = (pos.avgPrice - price) * coverQty; // native currency
			pnlRealized = pnl * fxRate; // INR
			// Bug #3 fix: when covering a short, release the FULL short proceeds (avgPrice * qty)
			// that were held in escrow by the broker, plus the 20% reserved margin,
			// minus the cost to buy back (price * coverQty). Net = avgPrice*coverQty + reservedMargin - price*coverQty
			// = reservedMargin + (avgPrice - price)*coverQty = reservedMargin + pnl
			// But since the full short proceeds were not deducted at open (only 20% margin was),
			// the correct credit is: full proceeds refund + pnl accounting.
			// = pos.avgPrice * coverQty (proceeds back) + 0.2 * pos.avgPrice * coverQty (margin back) - price * coverQty (buyback cost)
			// Simplified: (pos.avgPrice - price) * coverQty + pos.avgPrice * coverQty * 0.2 + proceeds already excluded at open
			// Original short open: only deducted 20% margin. So on close we get back: 20% margin + PnL (correct).
			// Additional 80% of proceeds were never taken, so we only return: releasedMargin + pnl.
			var releasedShortMargin = pos.avgPrice * coverQty * 0.2;
			nextMargin += (releasedShortMargin + pnl) * fxRate;
			pos.qty += coverQty;

			var remaining = qty - coverQty;
			if (remaining > 0) {
				var addCost = price * remaining; // native
				var addCostINR = addCost * fxRate; // INR
				if (nextMargin < addCostINR) {
					if (!isBot) toast("Error", "Insufficient margin", "error");
					return false;
				}
				if (pos.qty === 0) pos.avgPrice = price;
				var totalCost = pos.avgPrice * pos.qty + price * remaining; // native
				pos.qty += remaining;
				pos.avgPrice = totalCost / pos.qty; // stored in native currency
				nextMargin -= addCostINR;
			}
			if (pos.qty === 0) pos.avgPrice = 0;
			tradeType = "COVER";
			toastArgs = [
				"Covered",
				"Covered " +
					coverQty +
					" " +
					stock.ticker +
					" @ " +
					fmtPrice(stock, price) +
					" (\u20b9" +
					(price * fxRate).toFixed(2) +
					")",
				"success",
			];
		} else {
			if (nextMargin < costINR) {
				if (!isBot) toast("Error", "Insufficient margin for BUY", "error");
				return false;
			}
			var totalCost2 = pos.qty * pos.avgPrice + cost; // native
			pos.qty += qty;
			pos.avgPrice = totalCost2 / pos.qty; // stored in native currency
			nextMargin -= costINR;
			tradeType = "BUY";
			toastArgs = [
				"BUY",
				"Bought " +
					qty +
					" " +
					stock.ticker +
					" @ " +
					fmtPrice(stock, price) +
					" (\u20b9" +
					costINR.toFixed(2) +
					" deducted)",
				"success",
			];
		}
	} else {
		if (pos.qty > 0) {
			var sellQty = Math.min(qty, pos.qty);
			pnlRealized = (price - pos.avgPrice) * sellQty * fxRate; // INR
			nextMargin += price * sellQty * fxRate; // convert proceeds to INR
			pos.qty -= sellQty;

			var remaining2 = qty - sellQty;
			if (remaining2 > 0) {
				var shortMargin = price * remaining2 * 0.2; // native
				var shortMarginINR = shortMargin * fxRate; // INR
				if (nextMargin < shortMarginINR) {
					if (!isBot) toast("Error", "Insufficient margin for short", "error");
					return false;
				}
				pos.qty -= remaining2;
				pos.avgPrice = price; // stored in native currency
				nextMargin -= shortMarginINR;
				tradeType = "SHORT";
				toastArgs = [
					"SHORT",
					"Shorted " +
						remaining2 +
						" " +
						stock.ticker +
						" @ " +
						fmtPrice(stock, price),
					"error",
				];
			} else {
				tradeType = "SELL";
				toastArgs = [
					"SELL",
					"Sold " +
						sellQty +
						" " +
						stock.ticker +
						" @ " +
						fmtPrice(stock, price) +
						" (\u20b9" +
						(price * sellQty * fxRate).toFixed(2) +
						" added)",
					"success",
				];
			}
			if (pos.qty === 0) pos.avgPrice = 0;
		} else {
			var shortMargin2 = price * qty * 0.2; // native
			var shortMargin2INR = shortMargin2 * fxRate; // INR
			if (nextMargin < shortMargin2INR) {
				if (!isBot) toast("Error", "Insufficient margin for short", "error");
				return false;
			}
			if (pos.qty === 0) {
				pos.avgPrice = price; // stored in native currency
				pos.qty = -qty;
			} else {
				var totalVal = Math.abs(pos.qty) * pos.avgPrice + qty * price; // native
				pos.qty -= qty;
				pos.avgPrice = totalVal / Math.abs(pos.qty); // stored in native currency
			}
			nextMargin -= shortMargin2INR;
			tradeType = "SHORT";
			toastArgs = [
				"SHORT",
				"Shorted " + qty + " " + stock.ticker + " @ " + fmtPrice(stock, price),
				"error",
			];
		}
	}

	// Opening trades (BUY/SHORT) are blocked if brokerage can't be covered.
	// Closing trades (SELL/COVER) are always allowed but brokerage is capped at available margin
	// to avoid driving the balance deeply negative.
	if (nextMargin - brokerage < 0) {
		if (tradeType !== "SELL" && tradeType !== "COVER") {
			if (!isBot) toast("Error", "Insufficient margin to cover brokerage", "error");
			return false;
		}
		// Cap brokerage to what's available so margin floors at 0 rather than going deeply negative
		brokerage = Math.max(0, nextMargin);
	}

	state.margin = nextMargin - brokerage;
	state.totalBrokerage = (state.totalBrokerage || 0) + brokerage;

	var dalalStock = marketStocks.find(function (s) {
		return s.ticker === "DALAL";
	});
	if (dalalStock) {
		var priceIncrease = brokerage / dalalStock.shares;
		dalalStock.ltp = parseFloat((dalalStock.ltp + priceIncrease).toFixed(4));
	}

	if (pnlRealized > 0) {
		var tax = pnlRealized * 0.15;
		state.margin -= tax;
		state.totalTaxesPaid = (state.totalTaxesPaid || 0) + tax;
		
		if (state.inventory && state.inventory.profitBoostDays > 0) {
			var bonus = pnlRealized * 0.25;
			state.margin += bonus;
			if (typeof toast === "function") toast("Profit Amplifier", "Bonus " + fmtCur(bonus) + " added to margin", "success");
		}
	}

	if (!isBot && toastArgs) {
		toast.apply(null, toastArgs);
	}

	// Record trade history (value stored in INR)
	var tradeRecord = {
		time: formatTime(state.time),
		day: state.day,
		ticker: stock.ticker,
		side: tradeType || side,
		type: "Equity",
		qty: qty,
		price: price,
		value: costINR,
		pnl: pnlRealized
	};

	if (isBot) {
		state.botTradeHistory.unshift(tradeRecord);
		if (state.botTradeHistory.length > 500) state.botTradeHistory.pop();
	} else {
		state.tradeHistory.unshift(tradeRecord);
		if (state.tradeHistory.length > 500) state.tradeHistory.pop();
	}

	// Add to volume
	stock.volume += qty;

	if (pos.qty === 0) {
		delete state.positions[stock.ticker];
	} else {
		state.positions[stock.ticker] = pos;
	}

	return true;
}

// ==================== OPTIONS ====================
function populateExpiryDropdown() {
	var sel = document.getElementById("expiry-date");
	if (!sel) return;
	
	var currentVal = sel.value;
	sel.innerHTML = "";
	
	var currentDay = state.day;
	var baseDate = new Date("2026-07-06T00:00:00Z"); // Monday
	
	var nextWeekly = Math.ceil(currentDay / 5) * 5;
	if (nextWeekly < currentDay) nextWeekly = currentDay + (5 - (currentDay % 5));
	
	var expiries = [];
	for (var i = 0; i < 4; i++) {
		expiries.push(nextWeekly + (i * 5));
	}
	
	var nextMonthly = Math.ceil(currentDay / 20) * 20;
	if (nextMonthly < currentDay) nextMonthly = currentDay + (20 - (currentDay % 20));
	if (expiries.indexOf(nextMonthly) === -1) {
		expiries.push(nextMonthly);
	}
	
	expiries.sort(function(a, b) { return a - b; });
	var uniqueExps = [];
	expiries.forEach(function(e) {
		if (uniqueExps.indexOf(e) === -1) uniqueExps.push(e);
	});
	
	uniqueExps.forEach(function(expDay) {
		var isMonthly = (expDay % 20 === 0);
		var label = "Day " + expDay + (isMonthly ? " (Monthly)" : " (Weekly)");
		
		var opt = document.createElement("option");
		opt.value = expDay;
		opt.textContent = label;
		sel.appendChild(opt);
	});
	
	var found = false;
	for (var j = 0; j < sel.options.length; j++) {
		if (sel.options[j].value === currentVal) {
			sel.selectedIndex = j;
			found = true;
			break;
		}
	}
	if (!found) sel.selectedIndex = 0;
}



function getDayFraction() {
	// Bug #2 fix: denominator must be the trading session length (375 min).
	// Using 1440 caused T to be ~4x too large, making all options dramatically overpriced
	// and theta decay far too slow.
	var sessionLen = 375; // 375 minutes
	var frac = (state.time - START_TIME) / (sessionLen > 0 ? sessionLen : 375);
	return Math.min(1.0, Math.max(0, frac)); // Clamp to [0, 1] to prevent NaN after hours
}



// Black-Scholes Math
function stdNormPDF(x) {
	return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function stdNormCDF(x) {
	var sign = x < 0 ? -1 : 1;
	var xAbs = Math.abs(x) / Math.sqrt(2.0);
	var t = 1.0 / (1.0 + 0.3275911 * xAbs);
	var erf =
		1.0 -
		((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
			t +
			0.254829592) *
			t *
			Math.exp(-xAbs * xAbs);
	return 0.5 * (1.0 + sign * erf);
}





function getBidAsk(theoreticalPrice, type, strike, ltp, sigma) {
	var intrinsic = type === "CALL" ? Math.max(0, ltp - strike) : Math.max(0, strike - ltp);
		var spreadPct = 0.01 + (sigma * 0.02) + (Math.abs(strike - ltp)/ltp * 0.1);
	var spread = Math.max(ltp < 10 ? 0.001 : 0.1, theoreticalPrice * spreadPct);
	
	var bid = Math.max(intrinsic, theoreticalPrice - spread / 2);
	var ask = Math.max(0, theoreticalPrice + spread / 2);
	if (ask <= bid) ask = bid + (ltp < 10 ? 0.001 : 0.01);

	return { bid: bid, ask: ask };
}

function updateGreeksUI(greeks) {
	var dEl = document.getElementById("g-delta");
	var gEl = document.getElementById("g-gamma");
	var tEl = document.getElementById("g-theta");
	var vEl = document.getElementById("g-vega");
	if (!dEl) return;

	var flash = function (el, val, oldVal) {
		if (Math.abs(val - oldVal) < 0.0001) return;
		el.classList.remove("flash-up", "flash-dn");
		void el.offsetWidth;
		el.classList.add(val > oldVal ? "flash-up" : "flash-dn");
		setTimeout(function () {
			el.classList.remove("flash-up", "flash-dn");
		}, 200);
	};

	var oldD = parseFloat(dEl.textContent) || 0;
	var oldG = parseFloat(gEl.textContent) || 0;
	var oldT = parseFloat(tEl.textContent) || 0;
	var oldV = parseFloat(vEl.textContent) || 0;

	dEl.textContent = greeks.delta.toFixed(3);
	gEl.textContent = greeks.gamma.toFixed(4);
	tEl.textContent = greeks.theta.toFixed(3);
	vEl.textContent = greeks.vega.toFixed(3);

	flash(dEl, greeks.delta, oldD);
	flash(gEl, greeks.gamma, oldG);
	flash(tEl, greeks.theta, oldT);
	flash(vEl, greeks.vega, oldV);
}





function renderOptionChain() {
	if (!state.activeStock) return;
	var stock = state.activeStock;
	var strikes = generateStrikes(stock);
	var tbody = document.getElementById("oc-tbody");
	if (!tbody) return;
	tbody.innerHTML = "";
	var days = getExpiryDays() - getDayFraction();
	
	var ltpEl = document.getElementById("oc-ltp");
	if (ltpEl) ltpEl.textContent = fmtPrice(stock, stock.ltp);
	
	strikes.forEach(function(s) {
		var cg = calcGreeks("CALL", s, stock.ltp, days, stock.iv);
		var pg = calcGreeks("PUT", s, stock.ltp, days, stock.iv);
		var cPrice = Math.max(cg.price, stock.ltp < 10 ? 0.0005 : 0.05);
		var pPrice = Math.max(pg.price, stock.ltp < 10 ? 0.0005 : 0.05);
		var cBa = getBidAsk(cPrice, "CALL", s, stock.ltp, cg.sigma);
		var pBa = getBidAsk(pPrice, "PUT", s, stock.ltp, pg.sigma);
		
		var tr = document.createElement("tr");
		tr.className = "oc-row";
		if (s < stock.ltp) tr.classList.add("itm-call");
		if (s > stock.ltp) tr.classList.add("itm-put");
		
		var fmt = function(v) { return (v < 10 && v > 0) ? v.toFixed(3) : v.toFixed(2); };
		
		tr.innerHTML = 
			'<td class="call-col">' + (cg.sigma*100).toFixed(1) + '% / ' + cg.theta.toFixed(3) + '</td>' +
			'<td class="call-col">' + cg.delta.toFixed(2) + '</td>' +
			'<td class="call-col"><button class="oc-btn bid" onclick="executeChainTrade(\'SELL\', \'CALL\', ' + s + ', ' + cBa.bid + ')" onmouseenter="previewOption(\'SHORT\', \'CALL\', ' + s + ', ' + cBa.bid + ')" onmouseleave="clearOptionPreview()">' + fmt(cBa.bid) + '</button></td>' +
			'<td class="call-col" style="border-right:1px solid var(--border);"><button class="oc-btn ask" onclick="executeChainTrade(\'BUY\', \'CALL\', ' + s + ', ' + cBa.ask + ')" onmouseenter="previewOption(\'BUY\', \'CALL\', ' + s + ', ' + cBa.ask + ')" onmouseleave="clearOptionPreview()">' + fmt(cBa.ask) + '</button></td>' +
			'<td class="oc-strike">' + s + '</td>' +
			'<td class="put-col" style="border-left:1px solid var(--border);"><button class="oc-btn bid" onclick="executeChainTrade(\'SELL\', \'PUT\', ' + s + ', ' + pBa.bid + ')" onmouseenter="previewOption(\'SHORT\', \'PUT\', ' + s + ', ' + pBa.bid + ')" onmouseleave="clearOptionPreview()">' + fmt(pBa.bid) + '</button></td>' +
			'<td class="put-col"><button class="oc-btn ask" onclick="executeChainTrade(\'BUY\', \'PUT\', ' + s + ', ' + pBa.ask + ')" onmouseenter="previewOption(\'BUY\', \'PUT\', ' + s + ', ' + pBa.ask + ')" onmouseleave="clearOptionPreview()">' + fmt(pBa.ask) + '</button></td>' +
			'<td class="put-col">' + pg.delta.toFixed(2) + '</td>' +
			'<td class="put-col">' + (pg.sigma*100).toFixed(1) + '% / ' + pg.theta.toFixed(3) + '</td>';
		
		tbody.appendChild(tr);
	});
	
	updateOptionMargin();
}

function updateOptionMargin() {
	if (!state.activeStock) return;
	var stock = state.activeStock;
	var lotSize = LOT_SIZES[stock.ticker] || 100;
	var lots = parseInt(document.getElementById("option-lots").value, 10) || 1;
	var lsEl = document.getElementById("lot-size");
	var tqEl = document.getElementById("total-qty");
	if (lsEl) lsEl.textContent = lotSize;
	if (tqEl) tqEl.textContent = lots * lotSize;
}

function previewOption(side, type, strike, price) {
	if (!state.activeStock) return;
	var stock = state.activeStock;
	var lotSize = LOT_SIZES[stock.ticker] || 100;
	var lots = parseInt(document.getElementById("option-lots").value, 10) || 1;
	var fxRate = EXCHANGE_RATES[stock.currency] || 1;
	
	var totalQty = lots * lotSize;
	var premiumVal = price * totalQty * fxRate;
	
	var spanEl = document.getElementById("oc-preview");
	if (!spanEl) return;
	
	if (side === "BUY") {
		spanEl.innerHTML = '<span style="color:var(--red);">Premium Required: ' + fmtCur(premiumVal) + '</span>';
	} else {
		var spanMargin = 0.1 * stock.ltp * totalQty * fxRate;
		spanEl.innerHTML = '<span style="color:var(--green);">Premium Rcvd: ' + fmtCur(premiumVal) + '</span> | <span style="color:var(--accent);">Margin Req: ' + fmtCur(spanMargin) + '</span>';
	}
}

function clearOptionPreview() {
	var spanEl = document.getElementById("oc-preview");
	if (spanEl) spanEl.innerHTML = 'Hover price to preview';
}

function executeChainTrade(side, optType, strike, priceOverride) {
	if (!state.activeStock || !state.marketOpen) {
		if (!state.marketOpen) toast("Error", "Market is closed. Start a new day!", "error");
		return;
	}
	var stock = state.activeStock;
	if (!isMarketOpen(stock, state.time)) {
		toast("Closed", "Cannot trade options when " + stock.market + " is closed.", "error");
		return;
	}
	if (stock.haltUntil) {
		toast("Halted", "Cannot trade options for " + stock.ticker + " while it is halted!", "error");
		return;
	}
	var expiryType = document.getElementById("expiry-date").value;
	var lots = parseInt(document.getElementById("option-lots").value, 10) || 0;
	var lotSize = LOT_SIZES[stock.ticker] || 100;
	
	if (lots <= 0) {
		toast("Error", "Invalid lot count", "error");
		return;
	}
	
	var MAX_OPTION_LOTS = 10000;
	var optionId = stock.ticker + "_" + optType + "_" + strike + "_" + expiryType;
	var currentPosOpt = state.optionsPositions[optionId];
	var newLots = currentPosOpt ? currentPosOpt.lots + (side === "BUY" ? lots : -lots) : side === "BUY" ? lots : -lots;
	
	if (Math.abs(newLots) > MAX_OPTION_LOTS) {
		toast("Error", "Position Limit Exceeded (Max 10K lots)", "error");
		return;
	}
	
	var fxRate = EXCHANGE_RATES[stock.currency] || 1;
	
	if (processOptionTrade(stock, side, optType, strike, expiryType, lots, lotSize, fxRate, false, priceOverride)) {
		renderAll();
	}
}



// ==================== RENDER ====================
// Coalesce multiple rapid renderAll() calls into one paint per animation frame
var _rafPending = false;
function renderAll() {
	if (_rafPending) return;
	_rafPending = true;
	requestAnimationFrame(function () {
		try {
		_rafPending = false;

		// 1. LIVE ANALYTICS HOOK (Runs every tick if the panel is open)
		var analyticsEl = document.getElementById("analytics-panel");
		if (analyticsEl && !analyticsEl.classList.contains("hidden")) {
			if (typeof updateAnalyticsLive === "function") {
				updateAnalyticsLive();
			}
		}

		// 2. STANDARD TERMINAL RENDER
		renderTopBar();
		renderWatchlist();
		renderActiveStock();
		renderPositionsTable();
		if (state.activeTab === "options") renderOptionChain();
		if (state.activeBottomTab === "options") renderOptionsTable();
		if (state.activeBottomTab === "pending") renderPendingTable();
		if (state.activeBottomTab === "bot-stats") {
			if (typeof BotManager !== "undefined" && BotManager.renderStats) {
				BotManager.renderStats();
			}
		}

		if (state.activeBottomTab === "history") renderHistoryTable();

		// 3. MULTI-CHART PANEL UPDATE
		updateAllPanels();
		} catch (err) {
			console.error('Fatal error in renderAll:', err);
		}
	});
}


// Watchlist DOM row cache - built once per filter change, updated in-place every tick
var _wlCache = {};
var _wlLastOrder = "";

function renderTopBar() {
	document.getElementById("market-time").textContent = formatTime(state.time);
	document.getElementById("cash-balance").textContent = fmtCur(state.margin);
	document.getElementById("day-counter").textContent = "Day " + state.day;

	// Indices Cycling
	var openIndices = marketStocks.filter(function (s) {
		return s.sector === "Index" && isMarketOpen(s, state.time);
	});
	if (openIndices.length === 0) {
		// Fallback if none open
		openIndices = marketStocks.filter(function (s) {
			return (
				s.ticker === "NIFTY 50" ||
				s.ticker === "SPX500" ||
				s.ticker === "NIKKEI225"
			);
		});
	}

	// Cycle every 4 seconds
	var cycleLength = Math.max(1, Math.ceil(openIndices.length / 2));
	var cycleIdx = Math.floor(Date.now() / 4000) % cycleLength;
	var idx1 = openIndices[cycleIdx * 2] || openIndices[0];
	var idx2 = openIndices[cycleIdx * 2 + 1] || openIndices[1] || openIndices[0];

	// Make sure they are never the same
	if (idx1 && idx2 && idx1.ticker === idx2.ticker) {
		// Find any other major index to show in the second slot
		var allIndices = marketStocks.filter(function (s) {
			return s.sector === "Index";
		});
		for (var i = 0; i < allIndices.length; i++) {
			if (allIndices[i].ticker !== idx1.ticker) {
				idx2 = allIndices[i];
				break;
			}
		}
	}

	var idx1El = document.getElementById("idx1-value");
	var idx1Lbl = document.getElementById("idx1-label");
	if (idx1 && idx1El && idx1Lbl) {
		var idx1Chg = idx1.ltp - idx1.base;
		idx1Lbl.textContent = idx1.ticker;
		idx1El.textContent = idx1.ltp.toLocaleString("en-IN", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
		idx1El.className = "stat-val " + (idx1Chg >= 0 ? "up" : "dn");
	}

	var idx2El = document.getElementById("idx2-value");
	var idx2Lbl = document.getElementById("idx2-label");
	if (idx2 && idx2El && idx2Lbl) {
		var idx2Chg = idx2.ltp - idx2.base;
		idx2Lbl.textContent = idx2.ticker;
		idx2El.textContent = idx2.ltp.toLocaleString("en-IN", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
		idx2El.className = "stat-val " + (idx2Chg >= 0 ? "up" : "dn");
	}

	// Fear & Greed Index
	var fgEl = document.getElementById("fear-greed-value");
	if (fgEl) {
		var fgScore = Math.max(0, Math.min(100, Math.floor(50 + state.sentiment)));
		var fgIcon, fgText, fgClass;
		if (fgScore >= 75) {
			fgIcon = "fa-solid fa-fire";
			fgText = " Extreme Greed";
			fgClass = "up";
		} else if (fgScore >= 55) {
			fgIcon = "fa-solid fa-arrow-trend-up";
			fgText = " Greed";
			fgClass = "up";
		} else if (fgScore <= 25) {
			fgIcon = "fa-solid fa-skull";
			fgText = " Extreme Fear";
			fgClass = "dn";
		} else if (fgScore <= 45) {
			fgIcon = "fa-solid fa-arrow-trend-down";
			fgText = " Fear";
			fgClass = "dn";
		} else {
			fgIcon = "fa-solid fa-scale-balanced";
			fgText = " Neutral";
			fgClass = "";
		}
		fgEl.innerHTML = '<i class="' + fgIcon + '"></i> ' + fgScore + fgText;
		fgEl.className = "stat-val " + fgClass;
	}

	// PnL
	var pnl = calcTotalPNL();
	var elPnl = document.getElementById("total-pnl");
	if (elPnl) {
		elPnl.textContent = fmtCur(pnl);
		elPnl.title = elPnl.textContent;
		elPnl.className = "stat-val " + (pnl > 0 ? "up" : pnl < 0 ? "dn" : "");
	}

	var portValEl = document.getElementById("portfolio-value");
	if (portValEl) {
		portValEl.textContent = fmtCur(calcPortfolioValue());
		portValEl.title = portValEl.textContent;
	}

	var cashBalEl = document.getElementById("cash-balance");
	if (cashBalEl) {
		cashBalEl.textContent = fmtCur(state.margin);
		cashBalEl.title = cashBalEl.textContent;
	}

	var pendingCountEl = document.getElementById("pending-count");
	if (pendingCountEl) pendingCountEl.textContent = state.pendingOrders.length;

	var brokerageEl = document.getElementById("brokerage-paid");
	if (brokerageEl) {
		brokerageEl.textContent = fmtCur(state.totalBrokerage || 0);
		brokerageEl.title = brokerageEl.textContent;
	}

	var elMax = document.getElementById("loan-max-eligibility");
	if (elMax) elMax.textContent = "Max: " + fmtCur(getMaxLoanAmount());
}

function renderWatchlist() {
	var list = document.getElementById("watchlist");
	var searchEl = document.getElementById("wl-search-input");
	var query = searchEl ? searchEl.value.trim().toUpperCase() : "";
	var mf = state.wlMarketFilter;
	var byMarket =
		mf === "ALL"
			? marketStocks
			: marketStocks.filter(function (s) {
					return s.market === mf;
				});
	var filtered = query
		? byMarket.filter(function (s) {
				return (
					s.ticker.indexOf(query) !== -1 ||
					s.name.toUpperCase().indexOf(query) !== -1 ||
					s.sector.toUpperCase().indexOf(query) !== -1
				);
			})
		: byMarket;

	var orderKey = filtered
		.map(function (s) {
			return s.ticker;
		})
		.join(",");
	var needsRebuild = orderKey !== _wlLastOrder;


	if (state.wlMarketFilter === "HEATMAP") {
		list = document.getElementById("watchlist");
		list.innerHTML = "";
		var html = "<div style='display:flex; flex-wrap:wrap; padding:5px; gap:4px;'>";
		marketStocks.forEach(function(s) {
			if (query && s.ticker.indexOf(query) === -1 && s.name.toUpperCase().indexOf(query) === -1) return;
			var pct = s.prevClose ? (s.ltp - s.prevClose) / s.prevClose : 0;
			var pctStr = (pct * 100).toFixed(2) + "%";
			var isLight = document.body.classList.contains("light");
			var bg, txt;
			
			if (pct >= 0.025) { bg = "#089981"; txt = "#fff"; }
			else if (pct >= 0.01) { bg = isLight ? "#34b39e" : "#0a6b5c"; txt = "#fff"; }
			else if (pct > 0) { bg = isLight ? "#7bd4c6" : "#0e4239"; txt = isLight ? "#000" : "#fff"; }
			else if (pct === 0) { bg = isLight ? "#e0e3eb" : "#2a2e39"; txt = isLight ? "#000" : "#fff"; }
			else if (pct > -0.01) { bg = isLight ? "#f29b9f" : "#59212c"; txt = isLight ? "#000" : "#fff"; }
			else if (pct > -0.025) { bg = isLight ? "#ed5f66" : "#a62635"; txt = "#fff"; }
			else { bg = "#f23645"; txt = "#fff"; }
			
			html += "<div onclick='selectStock(\"" + s.ticker + "\")' style='flex:1 1 80px; height:60px; background:" + bg + "; color:" + txt + "; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:4px; cursor:pointer; border:1px solid rgba(255,255,255,0.1);'>" +
				"<span style='font-weight:bold; font-size:12px;'>" + s.ticker + "</span>" +
				"<span style='font-size:10px;'>" + (pct > 0 ? "+" : "") + pctStr + "</span>" +
				"</div>";
		});
		html += "</div>";
		list.innerHTML = html;
		var cntEl0 = document.getElementById("wl-count");
		if (cntEl0) cntEl0.textContent = "Heatmap";
		return;
	}


	if (state.wlMarketFilter === "HEATMAP") {
		list = document.getElementById("watchlist");
		list.innerHTML = "";
		html = "<div style='display:flex; flex-wrap:wrap; padding:5px; gap:4px;'>";
		marketStocks.forEach(function(s) {
			if (query && s.ticker.indexOf(query) === -1 && s.name.toUpperCase().indexOf(query) === -1) return;
			var pct = s.prevClose ? (s.ltp - s.prevClose) / s.prevClose : 0;
			var pctStr = (pct * 100).toFixed(2) + "%";
			var intensity = Math.min(1, Math.abs(pct) * 20); 
			var bg;
			if (pct > 0) bg = "rgba(0, 255, 0, " + (0.2 + intensity * 0.8) + ")";
			else if (pct < 0) bg = "rgba(255, 0, 0, " + (0.2 + intensity * 0.8) + ")";
			else bg = "var(--border)";
			
			html += "<div onclick='selectStock(\"" + s.ticker + "\")' style='flex:1 1 80px; height:60px; background:" + bg + "; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:4px; cursor:pointer; text-shadow:0 1px 2px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.1);'>" +
				"<span style='font-weight:bold; font-size:12px;'>" + s.ticker + "</span>" +
				"<span style='font-size:10px;'>" + (pct > 0 ? "+" : "") + pctStr + "</span>" +
				"</div>";
		});
		html += "</div>";
		list.innerHTML = html;
		cntEl0 = document.getElementById("wl-count");
		if (cntEl0) cntEl0.textContent = "Heatmap";
		return;
	}

	if (filtered.length === 0) {
		if (needsRebuild) {
			list.innerHTML =
				'<div class="wl-empty">No stocks match "' + query + '"</div>';
			_wlLastOrder = orderKey;
		}
		cntEl0 = document.getElementById("wl-count");
		if (cntEl0) cntEl0.textContent = "0/" + marketStocks.length;
		return;
	}

	// Structural rebuild only when the visible stock list or order changes
	if (needsRebuild) {
		var scrollTop = list.scrollTop;
		var frag = document.createDocumentFragment();
		_wlCache = {};
		filtered.forEach(function (s) {
			var row = document.createElement("div");
			var left = document.createElement("div");
			left.style.flex = "1.5";

			var symLine = document.createElement("span");
			symLine.className = "wl-sym";
			symLine.textContent = s.ticker;
			if (s.market !== "NSE") {
				var badge = document.createElement("span");
				badge.className = "wl-mkt-badge wlm-" + s.market.toLowerCase();
				badge.textContent = s.market;
				symLine.appendChild(badge);
			}
			var circuitEl = document.createElement("span");
			circuitEl.className = "circuit-badge";
			circuitEl.style.display = "none";
			symLine.appendChild(circuitEl);

			var sectorEl = document.createElement("div");
			sectorEl.className = "wl-sector";
			sectorEl.textContent = s.sector;

			var bar = document.createElement("div");
			bar.className = "vol-bar";
			var barFill = document.createElement("div");
			barFill.className = "vol-fill";
			bar.appendChild(barFill);

			left.appendChild(symLine);
			left.appendChild(sectorEl);
			left.appendChild(bar);

			var ltpEl = document.createElement("span");
			ltpEl.className = "wl-ltp";
			var chgEl = document.createElement("span");
			chgEl.className = "wl-chg";

			row.appendChild(left);
			row.appendChild(ltpEl);
			row.appendChild(chgEl);
			row.addEventListener(
				"click",
				(function (stock) {
					return function () {
						selectStock(stock);
					};
				})(s),
			);

			_wlCache[s.ticker] = {
				row: row,
				ltpEl: ltpEl,
				chgEl: chgEl,
				barFill: barFill,
				circuitEl: circuitEl,
			};
			frag.appendChild(row);
		});
		list.innerHTML = "";
		list.appendChild(frag);
		list.scrollTop = scrollTop;
		_wlLastOrder = orderKey;
	}

	// In-place value updates every tick - only touches DOM when value actually changed
	var maxVol = 300000;
	filtered.forEach(function (s) {
		var c = _wlCache[s.ticker];
		if (!c) return;
		var basePrice = s.prevClose || s.open;
		var dayChange = ((s.ltp - basePrice) / basePrice) * 100;
		var cls = dayChange >= 0 ? "up" : "dn";
		var rowCls = "wl-row" + (state.activeStock === s ? " active" : "");
		if (c.row.className !== rowCls) c.row.className = rowCls;

		var ltpText = fmtPrice(s, s.ltp);
		var ltpCls = "wl-ltp " + cls;
		if (c.ltpEl.className !== ltpCls) c.ltpEl.className = ltpCls;
		if (c.ltpEl.textContent !== ltpText) c.ltpEl.textContent = ltpText;

		var chgText = (dayChange >= 0 ? "+" : "") + dayChange.toFixed(2) + "%";
		var chgCls = "wl-chg " + cls;
		if (c.chgEl.className !== chgCls) c.chgEl.className = chgCls;
		if (c.chgEl.textContent !== chgText) c.chgEl.textContent = chgText;

		if (s.circuitHit) {
			var disp = "inline-block";
			var color = s.circuitHit === 'UP' ? "var(--green)" : "var(--red)";
			var txt = s.circuitHit === 'UP' ? "UC" : "LC";
			if (c.circuitEl.style.display !== disp) c.circuitEl.style.display = disp;
			if (c.circuitEl.style.background !== color) c.circuitEl.style.background = color;
			if (c.circuitEl.textContent !== txt) c.circuitEl.textContent = txt;
		} else {
			if (c.circuitEl.style.display !== "none") c.circuitEl.style.display = "none";
		}

		var volPct = Math.min(100, (s.volume / maxVol) * 100).toFixed(1) + "%";
		if (c.barFill.style.width !== volPct) c.barFill.style.width = volPct;


		if (s.haltUntil) {
			var cbCls = "circuit-badge halted";
			if (c.circuitEl.className !== cbCls) c.circuitEl.className = cbCls;
			if (c.circuitEl.textContent !== "HALTED")
				c.circuitEl.textContent = "HALTED";
			if (c.circuitEl.style.display !== "inline-block")
				c.circuitEl.style.display = "inline-block";
			c.circuitEl.style.backgroundColor = "#ff9100";
			c.circuitEl.style.color = "#fff";
			c.barFill.style.width = "0%";
		} else if (s.circuitHit) {
			cbCls = "circuit-badge " + (s.circuitHit === "UC" ? "uc" : "lc");
			if (c.circuitEl.className !== cbCls) c.circuitEl.className = cbCls;
			if (c.circuitEl.textContent !== s.circuitHit)
				c.circuitEl.textContent = s.circuitHit;
			if (c.circuitEl.style.display !== "inline-block")
				c.circuitEl.style.display = "inline-block";
			c.circuitEl.style.backgroundColor = "";
			c.circuitEl.style.color = "";
		} else {
			if (c.circuitEl.style.display !== "none")
				c.circuitEl.style.display = "none";
			c.circuitEl.style.backgroundColor = "";
			c.circuitEl.style.color = "";
		}
	});

	var cntEl = document.getElementById("wl-count");
	if (cntEl) {
		var cntText = filtered.length + "/" + marketStocks.length;
		if (cntEl.textContent !== cntText) cntEl.textContent = cntText;
	}
}

function selectStock(stock) {
	if (!stock) return;
	if (typeof stock === 'string') stock = stockMap[stock];
	if (!stock) return;
	
	state.activeStock = stock;

	// Automatically switch back to terminal view if they are in IPO/MF/Bank/etc.
	var term = document.getElementById("view-terminal");
	if (term && term.classList.contains("hidden")) {
		var views = ["view-bank", "view-realestate", "view-settings", "view-syndicate", "view-mf", "view-ipo", "view-customize"];
		views.forEach(function(id) {
			var el = document.getElementById(id);
			if (el) {
				if (id === "view-customize" && !el.classList.contains("hidden")) {
					if (typeof closeTerminalCustomization === 'function') closeTerminalCustomization(false);
				}
				el.classList.add("hidden");
			}
		});
		document.querySelectorAll(".ctrl-btn").forEach(function(b) { b.classList.remove("on"); });
		term.classList.remove("hidden");
		var termBtn = document.getElementById("btn-terminal");
		if (termBtn) termBtn.classList.add("on");
	}

	// Trigger main UI update
	renderAll();

	if (state.activeTab === "options") renderOptionChain();

	// If Analytics is currently open, do a full rebuild for the new stock
	var analyticsEl = document.getElementById("analytics-panel");
	if (analyticsEl && !analyticsEl.classList.contains("hidden")) {
		if (typeof renderAnalytics === "function") {
			renderAnalytics();
		}
	}
}

function renderActiveStock() {
	var stock = state.activeStock;
	if (!stock) return;

	if (state.chartLayout !== '1x') {
		document.getElementById("active-symbol").textContent = "Multiple View";
		document.getElementById("active-name").textContent = "Multi-Chart Layout";
		document.getElementById("active-price").textContent = "---";
		document.getElementById("active-price").className = "ct-price";
		document.getElementById("active-change").textContent = "---";
		document.getElementById("active-change").className = "ct-change";
		var elPrev = document.getElementById("active-prev-close");
		if (elPrev) elPrev.innerHTML = "";
		var badge = document.getElementById("market-status-badge");
		if (badge) badge.style.display = "none";
	} else {
		badge = document.getElementById("market-status-badge");
		if (badge) {
			badge.style.display = "";
			var open = isMarketOpen(stock, state.time);
			badge.textContent = open ? "OPEN" : "CLOSED";
			// Give it a slightly bolder background so the pill stands out nicely
			badge.style.backgroundColor = open
				? "rgba(0, 200, 83, 0.15)"
				: "rgba(255, 23, 68, 0.15)";
			badge.style.border = open
				? "1px solid rgba(0, 200, 83, 0.3)"
				: "1px solid rgba(255, 23, 68, 0.3)";
			badge.style.color = open ? "#00e676" : "#ff4b4b";
		}

		document.getElementById("active-symbol").textContent = stock.ticker;
		document.getElementById("active-name").textContent =
			stock.name + " · " + stock.sector + " [" + stock.market + "]";

		var basePrice = stock.prevClose || stock.open;
		var dayChg = stock.ltp - basePrice;
		var dayPct = (dayChg / basePrice) * 100;
		var isUp = dayChg >= 0;

		var elPrice = document.getElementById("active-price");
		elPrice.textContent = fmtPrice(stock, stock.ltp);
		elPrice.className = "ct-price " + (isUp ? "up" : "dn");

		var elChg = document.getElementById("active-change");
		var circuitStr = stock.circuitHit ? " | " + stock.circuitHit : "";
		if (stock.haltUntil) circuitStr = " | HALTED";
		
		elChg.textContent =
			(isUp ? "+" : "") +
			dayChg.toFixed(2) +
			" (" +
			dayPct.toFixed(2) +
			"%)" +
			circuitStr;
		elChg.className = "ct-change " + (isUp ? "up" : "dn");

		elPrev = document.getElementById("active-prev-close");
		if (elPrev) {
			if (stock.prevClose) {
				var intraChg = stock.ltp - stock.open;
				var intraPct = (intraChg / stock.open) * 100;
				var colorClass = intraChg >= 0 ? "up" : "dn";
				var sign = intraChg >= 0 ? "+" : "";
				elPrev.innerHTML =
					"Prev Close: " +
					fmtPrice(stock, stock.prevClose) +
					' &nbsp;<span class="' +
					colorClass +
					'">[Intraday: ' +
					sign +
					intraPct.toFixed(2) +
					"%]</span>";
				elPrev.className = "ct-prev-close";
			} else {
				elPrev.innerHTML = "";
			}
		}

		renderChart(stock);
	}

	document.getElementById("order-symbol").textContent = stock.ticker;
	updateOrderMargin();
	renderPositionCard(stock);

	// Populate SL / Target fields for active stock
	var st = state.slTargets[stock.ticker];
	document.getElementById("sl-price").value = st && st.sl ? st.sl : "";
	document.getElementById("target-price").value =
		st && st.target ? st.target : "";

	renderMarketDepth(stock);
}

function renderMarketDepth(stock) {
	if (!stock) return;
	var bidsContainer = document.getElementById("l2-bids");
	var asksContainer = document.getElementById("l2-asks");
	if (!bidsContainer || !asksContainer) return;

	var step =
		stock.ltp > 5000
			? 5
			: stock.ltp > 1000
				? 1
				: stock.ltp > 200
					? 0.5
					: stock.ltp > 10
						? 0.05
						: stock.ltp > 1
							? 0.01
							: 0.001;
	var decimals = stock.currency === "JPY" ? 0 : stock.ltp < 10 ? 4 : 2;

	// Calculate price momentum imbalance
	var momentum = stock.open ? (stock.ltp - stock.open) / stock.open : 0;
	var bidSkew = 1.0;
	var askSkew = 1.0;
	if (momentum < -0.01) {
		askSkew = 1.6;
		bidSkew = 0.5;
	} // Heavy sell pressure
	else if (momentum > 0.01) {
		bidSkew = 1.6;
		askSkew = 0.5;
	} // Heavy buy pressure

	// Base depth anchored to true asset liquidity
	var avgTickVol = Math.floor(stock.baseVolume / 390);
	var baseDepth = avgTickVol * 0.2; // 20% of minute volume per depth level
	if (baseDepth < 10) baseDepth = 10;
	var isOpen = isMarketOpen(stock, state.time);

	if (isOpen) {
		stock._cachedDepthHTML = null;
	}

	// Ironclad lock: If market is closed, cache the depth and never recalculate it
	if (!isOpen && stock._cachedDepthHTML) {
		if (!stock._cachedDepthHTML.applied) {
			bidsContainer.innerHTML = stock._cachedDepthHTML.bids;
			asksContainer.innerHTML = stock._cachedDepthHTML.asks;

			var ratioBidEl = document.getElementById("l2-ratio-bid");
			var ratioAskEl = document.getElementById("l2-ratio-ask");
			if (ratioBidEl)
				ratioBidEl.style.width = stock._cachedDepthHTML.bidPct + "%";
			if (ratioAskEl)
				ratioAskEl.style.width = stock._cachedDepthHTML.askPct + "%";

			var bidPctEl = document.getElementById("l2-bid-pct");
			var askPctEl = document.getElementById("l2-ask-pct");
			if (bidPctEl)
				bidPctEl.textContent = Math.round(stock._cachedDepthHTML.bidPct) + "%";
			if (askPctEl)
				askPctEl.textContent = Math.round(stock._cachedDepthHTML.askPct) + "%";
			
			stock._cachedDepthHTML.applied = true;
		}
		return;
	}

	var staticSeed = stock.ticker.charCodeAt(0) + stock.ltp; // Frozen seed for closed markets

	function getQty(level, isBid) {
		var flicker, variance;
		if (isOpen) {
			// Bug #13 fix: use Math.random() for DISPLAY-ONLY market depth flicker.
			// Previously used pcg.random() which consumed the deterministic simulation seed,
			// causing stock prices to differ based on whether the DOM panel was open or not.
			flicker = 0.6 + Math.random() * 0.8;
			variance = Math.random();
		} else {
			// Frozen deterministic math for closed markets
			flicker =
				0.8 + Math.abs(Math.sin(staticSeed + level + (isBid ? 1 : 2))) * 0.4;
			variance = Math.abs(Math.cos(staticSeed + level));
		}

		var skew = isBid ? bidSkew : askSkew;
		var qty = Math.floor(baseDepth * flicker * skew);
		// Add level falloff variance
		qty = Math.floor(qty * (1 + variance * (level * 0.3)));
		return qty;
	}

	var bidHTML = "";
	var askHTML = "";
	var totalBidQty = 0;
	var totalAskQty = 0;
	var bids = [];
	var asks = [];
	var maxQty = 0;

	for (var i = 0; i < 5; i++) {
		var isLC = stock.circuitHit === "LC";
		var isUC = stock.circuitHit === "UC";

		var bidQty = isLC
			? 0
			: isUC
				? i === 0
					? getQty(i, true) * 20
					: i === 1
						? getQty(i, true) * 5
						: 0
				: getQty(i, true);
		var askQty = isUC
			? 0
			: isLC
				? i === 0
					? getQty(i, false) * 20
					: i === 1
						? getQty(i, false) * 5
						: 0
				: getQty(i, false);

		var bidP = isUC
			? i === 0
				? stock.ltp
				: stock.ltp - step
			: stock.ltp - (i + 1) * step;
		var askP = isLC
			? i === 0
				? stock.ltp
				: stock.ltp + step
			: stock.ltp + (i + 1) * step;

		bidP = Math.max(0.0001, bidP);

		bids.push({ p: bidP, q: bidQty });
		asks.push({ p: askP, q: askQty });

		totalBidQty += bidQty;
		totalAskQty += askQty;
		if (bidQty > maxQty) maxQty = bidQty;
		if (askQty > maxQty) maxQty = askQty;
	}

	for (i = 0; i < 5; i++) {
		var bid = bids[i];
		var ask = asks[i];
		var bidW = maxQty > 0 ? (bid.q / maxQty) * 100 : 0;
		var askW = maxQty > 0 ? (ask.q / maxQty) * 100 : 0;

		var dispBidP = bid.q === 0 ? "-" : bid.p.toFixed(decimals);
		var dispBidQ = bid.q === 0 ? "-" : bid.q;
		var dispAskP = ask.q === 0 ? "-" : ask.p.toFixed(decimals);
		var dispAskQ = ask.q === 0 ? "-" : ask.q;

		var bidClick = bid.q > 0 ? ' onclick="setLimitPrice(' + bid.p + ')" ' : " ";
		var askClick = ask.q > 0 ? ' onclick="setLimitPrice(' + ask.p + ')" ' : " ";

		bidHTML +=
			'<div class="l2-row"' +
			bidClick +
			'style="position:relative; padding:2px 4px;"><div style="position:absolute; right:0; top:1px; bottom:1px; width:' +
			bidW +
			'%; background:var(--green-dim); z-index:0; border-radius:2px;"></div><span class="up mono" style="z-index:1">' +
			dispBidP +
			'</span><span class="mono" style="z-index:1">' +
			dispBidQ +
			"</span></div>";

		askHTML +=
			'<div class="l2-row"' +
			askClick +
			'style="position:relative; padding:2px 4px;"><div style="position:absolute; left:0; top:1px; bottom:1px; width:' +
			askW +
			'%; background:var(--red-dim); z-index:0; border-radius:2px;"></div><span class="dn mono" style="z-index:1">' +
			dispAskP +
			'</span><span class="mono" style="z-index:1">' +
			dispAskQ +
			"</span></div>";
	}

	bidsContainer.innerHTML = bidHTML;
	asksContainer.innerHTML = askHTML;

	var total = totalBidQty + totalAskQty;
	var bidPct = total > 0 ? (totalBidQty / total) * 100 : 50;
	var askPct = 100 - bidPct;

	ratioBidEl = document.getElementById("l2-ratio-bid");
	ratioAskEl = document.getElementById("l2-ratio-ask");
	if (ratioBidEl) ratioBidEl.style.width = bidPct + "%";
	if (ratioAskEl) ratioAskEl.style.width = askPct + "%";

	bidPctEl = document.getElementById("l2-bid-pct");
	askPctEl = document.getElementById("l2-ask-pct");
	if (bidPctEl) bidPctEl.textContent = Math.round(bidPct) + "%";
	if (askPctEl) askPctEl.textContent = Math.round(askPct) + "%";

	if (!isOpen) {
		stock._cachedDepthHTML = {
			bids: bidHTML,
			asks: askHTML,
			bidPct: bidPct,
			askPct: askPct,
			applied: true
		};
	}

	// Disable equity buttons for Index stocks
	var isIndex = stock.market === "INDEX";
	var btnBuy = document.getElementById("btn-buy");
	var btnSell = document.getElementById("btn-sell");
	var btnMobileBuy = document.getElementById("mobile-buy-btn");
	var btnMobileSell = document.getElementById("mobile-sell-btn");
	if (btnBuy) btnBuy.disabled = isIndex;
	if (btnSell) btnSell.disabled = isIndex;
	if (btnMobileBuy) btnMobileBuy.disabled = isIndex;
	if (btnMobileSell) btnMobileSell.disabled = isIndex;
	
	var orderNotice = document.getElementById("index-order-notice");
	if (isIndex && state.activeTab === "positions") {
		if (!orderNotice) {
			orderNotice = document.createElement("div");
			orderNotice.id = "index-order-notice";
			orderNotice.style.color = "#ff9100";
			orderNotice.style.fontSize = "12px";
			orderNotice.style.marginTop = "10px";
			orderNotice.style.textAlign = "center";
			orderNotice.textContent = "Indices cannot be traded directly. Switch to Options tab.";
			var actionPanel = document.querySelector(".action-panel .order-actions");
			if (actionPanel) {
				actionPanel.parentNode.insertBefore(orderNotice, actionPanel.nextSibling);
			}
		} else {
			orderNotice.style.display = "block";
		}
	} else if (orderNotice) {
		orderNotice.style.display = "none";
	}
}

function setLimitPrice (price) {
	var orderTypeEl = document.getElementById("order-type");
	var limitPriceGroup = document.getElementById("limit-price-group");
	var limitPriceInput = document.getElementById("order-limit-price");
	if (orderTypeEl && limitPriceGroup && limitPriceInput) {
		orderTypeEl.value = "LIMIT";
		limitPriceGroup.classList.remove("hidden");
		var decimals =
			state.activeStock && state.activeStock.currency === "JPY" ? 0 : 2;
		limitPriceInput.value = price.toFixed(decimals);

		limitPriceInput.style.transition = "background 0.3s";
		limitPriceInput.style.backgroundColor = "var(--accent)";
		limitPriceInput.style.color = "#fff";
		setTimeout(function () {
			limitPriceInput.style.backgroundColor = "";
			limitPriceInput.style.color = "";
		}, 200);
	}
};

function formatVolume(v, currency) {
	if (!currency || currency === "INR") {
		if (v >= 10000000) return (v / 10000000).toFixed(2) + "Cr";
		if (v >= 100000) return (v / 100000).toFixed(2) + "L";
		if (v >= 1000) return (v / 1000).toFixed(1) + "K";
	} else {
		if (v >= 1000000000) return (v / 1000000000).toFixed(2) + "B";
		if (v >= 1000000) return (v / 1000000).toFixed(2) + "M";
		if (v >= 1000) return (v / 1000).toFixed(1) + "K";
	}
	return v.toString();
}

// ==================== CANDLE DATA BUILDER ====================
function buildCandleData(stock, totalNeeded) {
	var period = state.candlePeriod;
	if (totalNeeded === undefined) {
		totalNeeded = Math.min(200, Math.ceil(state.viewLen / period) + 2);
	}

	// -- Live OHLCV candles (from this session) --
	var liveCandles = [];
	var hist = stock.history;
	var volHist = stock.volumeHistory || [];
	var histLen = hist.length;
	
	for (var i = 0; i < histLen; i += period) {
		var sl = hist.slice(i, i + period);
		var slV = volHist.slice(i, i + period);
		if (!sl.length) break;
		var sumV = 0;
		for (var vi = 0; vi < slV.length; vi++) sumV += (slV[vi] || 0);
		
		var c = sl[sl.length - 1];
		var o = sl[0];
		var h = Math.max.apply(null, sl);
		var l = Math.min.apply(null, sl);
		
		var isLastSlice = (i + period >= histLen);
		
		if (isLastSlice && stock.currentCandle) {
			h = Math.max(h, stock.currentCandle.h);
			l = Math.min(l, stock.currentCandle.l);
		} else if (sl.length === 1) {
			var tickSeed = i + stock.ticker.charCodeAt(0);
			var pRandWick1 = Math.abs(Math.sin(tickSeed * 12.9898)) % 1;
			var pRandWick2 = Math.abs(Math.cos(tickSeed * 78.233)) % 1;
			
			var wickBase = (stock.vol || 0.01) * c * 0.4;
			h += pRandWick1 * wickBase;
			l -= pRandWick2 * wickBase;
			if (o > c) { h = Math.max(h, o); l = Math.min(l, c); }
			else { h = Math.max(h, c); l = Math.min(l, o); }
			h = parseFloat(h.toFixed(4));
			l = parseFloat(l.toFixed(4));
		}
		
		liveCandles.push({ o: o, h: h, l: l, c: c, v: sumV });
	}
	liveCandles = liveCandles.slice(-totalNeeded);

	// -- Pre-history candles to fill remaining slots --
	var preCount = totalNeeded - liveCandles.length;
	var preCandles = buildPreOHLC(stock, period, preCount);

	// -- Combine and re-index --
	var combined = preCandles.concat(liveCandles).slice(-totalNeeded);
	return combined.map(function (c, i) {
		return { x: i, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v || 0 };
	});
}

// Fast in-place data mutator - never destroys the chart instance
function _applyChartData(stock, isLight) {
	var ds = chartInstance.data.datasets[0];
	var scX = chartInstance.options.scales.x;
	var scY = chartInstance.options.scales.y;
	var tip = chartInstance.options.plugins.tooltip;
	var isPct = state.chartScale === "pct";

	var firstPrice = 1;
	var dataLen;
	var smaData;
	var emaData;

	if (state.chartType === "candle") {
		var baseTotal = Math.min(
			1000,
			Math.ceil(state.viewLen / state.candlePeriod) + 2,
		);
		// Build once with extra 20 candles for indicator warm-up, then slice for display
		var ohlcDataFull = buildCandleData(stock, baseTotal + 20);
		var ohlcData = ohlcDataFull.slice(-baseTotal).map(function(c, i) {
			return { x: i, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v };
		});
		firstPrice = ohlcData.length > 0 ? ohlcData[0].o || 1 : 1;

		var closePrices = ohlcDataFull.map(function (c) {
			return c.c;
		});
		var rawSMA = calcSMA(closePrices, 20).slice(-ohlcData.length);
		var rawEMA = calcEMA(closePrices, 20).slice(-ohlcData.length);

		var allH = ohlcData.map(function (d) { return d.h; });
		var allL = ohlcData.map(function (d) { return d.l; });
		var yMax = allH.length ? Math.max.apply(null, allH) : 0;
		var yMin = allL.length ? Math.min.apply(null, allL) : 0;
		var yRange = yMax - yMin || yMin * 0.01 || 1;
		var yPad = yRange * 0.06;
		var yBottomPad = yRange * 0.22;

		// % Change transform for candle
		if (isPct) {
			var baseC = firstPrice;
			ohlcData = ohlcData.map(function (d, i) {
				return {
					x: i,
					o: ((d.o - baseC) / baseC) * 100,
					h: ((d.h - baseC) / baseC) * 100,
					l: ((d.l - baseC) / baseC) * 100,
					c: ((d.c - baseC) / baseC) * 100,
					v: d.v,
				};
			});
			var allHp = ohlcData.map(function (d) { return d.h; });
			var allLp = ohlcData.map(function (d) { return d.l; });
			yMax = allHp.length ? Math.max.apply(null, allHp) : 0;
			yMin = allLp.length ? Math.min.apply(null, allLp) : 0;
			yRange = yMax - yMin || 1;
			yPad = yRange * 0.06;
			yBottomPad = yRange * 0.22;

			smaData = rawSMA.map(function (v) { return v === null ? null : ((v - baseC) / baseC) * 100; });
			emaData = rawEMA.map(function (v) { return v === null ? null : ((v - baseC) / baseC) * 100; });
		} else {
			smaData = rawSMA;
			emaData = rawEMA;
		}

		chartInstance.data.labels = ohlcData.map(function (_, i) { return i; });
		ds.data = ohlcData.map(function (d) { return d.c; });
		ds.borderColor = "transparent";
		ds.backgroundColor = "transparent";
		ds.fill = false;
		ds.tension = 0;
		ds.pointHoverRadius = 0;
		chartInstance._ohlc = ohlcData;
		chartInstance._volumes = ohlcData.map(function (d) { return d.v || 0; });
		
		var times = [];
		ohlcData.forEach(function (_, i) {
			var reverseIdx = ohlcData.length - 1 - i;
			// Each candle covers candlePeriod minutes; walk back from current time
			var pointTime = state.time - (reverseIdx * (state.candlePeriod || 375));
			var pointDay = state.day;
			while (pointTime < START_TIME) {
				pointTime += 375; // one trading session = 375 ticks
				pointDay--;
			}
			var dayLabel = pointDay < 1 ? "Day -" + Math.abs(pointDay - 1) : "Day " + pointDay;
			// Bug #11 fix: don't modulo by 375 — pointTime is already a valid absolute minute
			// value (e.g. 555-930 for NSE session). The old % 375 mapped all times to 0-374 (midnight-6AM).
			times.push(dayLabel + ", " + formatTime(pointTime));
		});
		chartInstance._times = times;

		if (state.chartScale === "log") {
			scY.min = undefined;
			scY.max = undefined;
		} else {
			// Never let Y-axis minimum go below 0 for price charts (stocks can't be negative)
			var rawYMin = yMin - yBottomPad;
			scY.min = isPct ? rawYMin : Math.max(0, rawYMin);
			scY.max = yMax + yPad;
		}
		var ds2c = chartInstance.data.datasets[1];
		if (stock.prevClose && ohlcData.length) {
			var pc = isPct ? 0 : stock.prevClose; // 0% = prev close baseline in pct mode
			ds2c.data = Array(ohlcData.length).fill(pc);
			ds2c.hidden = false;
		} else {
			ds2c.data = [];
			ds2c.hidden = true;
		}
		dataLen = ohlcData.length;

		tip.callbacks = {
			title: function (ctx) {
				var d =
					chartInstance._ohlc &&
					chartInstance._ohlc[ctx[0] && ctx[0].dataIndex];
				if (!d) return state.activeStock ? state.activeStock.ticker : "";
				return (
					(state.activeStock ? state.activeStock.ticker : "") +
					"  #" +
					(ctx[0].dataIndex + 1)
				);
			},
			label: function (tCtx) {
				var cd = tCtx.chart._ohlc;
				var d = cd && cd[tCtx.dataIndex];
				if (!d) return "";
				var fmt = isPct
					? function (n) {
							return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
						}
					: function (n) {
							return fmtPrice(state.activeStock, n);
						};
				var volStr = d.v
					? "  Vol: " +
						formatVolume(
							d.v,
							state.activeStock ? state.activeStock.currency : "INR",
						)
					: "";
				return [
					"O: " + fmt(d.o),
					"H: " + fmt(d.h) + "  \u2197",
					"L: " + fmt(d.l) + "  \u2198",
					"C: " + fmt(d.c) + (d.c >= d.o ? "  \u25b2" : "  \u25bc") + volStr,
				];
			},
		};
	} else {
		// -- Line chart --
		// Merge preHistory + live history for full-depth view
		var fullHistory =
			stock.preHistory && stock.preHistory.length
				? stock.preHistory.concat(stock.history)
				: stock.history;
		var lineSlice = fullHistory.slice(-state.viewLen);

		firstPrice = lineSlice[0] || 1;
		var lastPrice = lineSlice[lineSlice.length - 1] || 0;

		// Indicators for line chart
		var lineSliceForIndicators = fullHistory.slice(-(state.viewLen + 20));
		rawSMA = calcSMA(lineSliceForIndicators, 20).slice(-lineSlice.length);
		rawEMA = calcEMA(lineSliceForIndicators, 20).slice(-lineSlice.length);

		var startIndex = fullHistory.length - lineSlice.length;
		var dLabels = [];
		for (var i = 0; i < lineSlice.length; i++) {
			dLabels.push(startIndex + i);
		}

		// Chart Virtualization (Decimation) to massively reduce Canvas draw lag
		var MAX_DRAW_POINTS = 300;
		if (lineSlice.length > MAX_DRAW_POINTS) {
			var stepSize = Math.ceil(lineSlice.length / MAX_DRAW_POINTS);
			var dLine = [], dSma = [], dEma = [], dLab = [];
			for (i = 0; i < lineSlice.length; i++) {
				if ((startIndex + i) % stepSize === 0) {
					dLine.push(lineSlice[i]);
					dSma.push(rawSMA[i]);
					dEma.push(rawEMA[i]);
					dLab.push(dLabels[i]);
				}
			}
			// Ensure the last real-time tick is always the terminal point on the chart
			if ((startIndex + lineSlice.length - 1) % stepSize !== 0 && dLine.length > 0) {
				dLine[dLine.length - 1] = lineSlice[lineSlice.length - 1];
				dSma[dSma.length - 1] = rawSMA[rawSMA.length - 1];
				dEma[dEma.length - 1] = rawEMA[rawEMA.length - 1];
				dLab[dLab.length - 1] = dLabels[lineSlice.length - 1];
			}
			lineSlice = dLine;
			rawSMA = dSma;
			rawEMA = dEma;
			dLabels = dLab;
		}

		// % Change transform
		if (isPct) {
			lineSlice = lineSlice.map(function (p) {
				return ((p - firstPrice) / firstPrice) * 100;
			});
			lastPrice = lineSlice[lineSlice.length - 1] || 0;
			smaData = rawSMA.map(function (v) {
				return v === null ? null : ((v - firstPrice) / firstPrice) * 100;
			});
			emaData = rawEMA.map(function (v) {
				return v === null ? null : ((v - firstPrice) / firstPrice) * 100;
			});
		} else {
			smaData = rawSMA;
			emaData = rawEMA;
		}

		var computedStyle = getComputedStyle(document.body);
		var upColor = document.body.style.getPropertyValue('--green') || computedStyle.getPropertyValue('--green').trim() || (isLight ? "#00a846" : "#00c853");
		var downColor = document.body.style.getPropertyValue('--red') || computedStyle.getPropertyValue('--red').trim() || (isLight ? "#d50032" : "#ff1744");
		
		var lineColor = (isPct ? lastPrice >= 0 : lastPrice >= firstPrice) ? upColor : downColor;

		chartInstance.data.labels = lineSlice.map(function (_, i) {
			return i;
		});
		ds.data = lineSlice;
		ds.borderColor = lineColor;
		ds.pointHoverBackgroundColor = lineColor;
		ds.fill = tcState && tcState.chartFill !== undefined ? tcState.chartFill : true;
		ds.tension = 0.15;
		ds.pointHoverRadius = 4;
		chartInstance._ohlc = null;
		chartInstance._volumes = null; // no volume overlay on line chart (volumeHistory is live-only and misaligns with pre-history)
		chartInstance._lineData = lineSlice;
		scY.min = undefined;
		scY.max = undefined;

		times = [];
		var totalLen = fullHistory.length;
		dLabels.forEach(function (x) {
			var reverseIdx = totalLen - 1 - x;
			var pointTime = state.time - reverseIdx;
			var pointDay = state.day;
			while (pointTime < 0) {
				pointTime += 1440;
				pointDay--;
			}
			var dayLabel = pointDay < 1 ? "Pre-Day " + Math.abs(pointDay - 1) : "Day " + pointDay;
			times.push(dayLabel + ", " + formatTime(pointTime));
		});
		chartInstance._times = times;

		// Prev close reference line
		var ds2 = chartInstance.data.datasets[1];
		if (!isPct && stock.prevClose && lineSlice.length) {
			ds2.data = Array(lineSlice.length).fill(stock.prevClose);
			ds2.hidden = false;
		} else {
			ds2.data = [];
			ds2.hidden = true;
		}

		var area = chartInstance.chartArea;
		if (area) {
			var grad = chartInstance.ctx.createLinearGradient(
				0,
				area.top,
				0,
				area.bottom,
			);
			grad.addColorStop(0, lineColor + "30");
			grad.addColorStop(1, lineColor + "02");
			ds.backgroundColor = grad;
		} else {
			ds.backgroundColor = lineColor + "15";
		}
		dataLen = lineSlice.length;

		tip.callbacks = {
			title: function () {
				return state.activeStock ? state.activeStock.ticker : "";
			},
			label: function (tCtx) {
				if (isPct)
					return (
						(tCtx.parsed.y >= 0 ? "+" : "") + tCtx.parsed.y.toFixed(2) + "%"
					);
				return fmtPrice(state.activeStock, tCtx.parsed.y);
			},
		};
	}

	// -- Update Position Cost, SL, Target Lines --
	var dsAvg = chartInstance.data.datasets[2];
	var pos = state.positions[stock.ticker];
	if (pos && dataLen) {
		var avgVal = isPct
			? ((pos.avgPrice - firstPrice) / firstPrice) * 100
			: pos.avgPrice;
		dsAvg.data = Array(dataLen).fill(avgVal);
		dsAvg.hidden = false;
	} else {
		dsAvg.data = [];
		dsAvg.hidden = true;
	}

	var dsSL = chartInstance.data.datasets[3];
	var st = state.slTargets[stock.ticker];
	if (st && st.sl && dataLen) {
		var slVal = isPct ? ((st.sl - firstPrice) / firstPrice) * 100 : st.sl;
		dsSL.data = Array(dataLen).fill(slVal);
		dsSL.hidden = false;
	} else {
		dsSL.data = [];
		dsSL.hidden = true;
	}

	var dsTgt = chartInstance.data.datasets[4];
	if (st && st.target && dataLen) {
		var tgtVal = isPct
			? ((st.target - firstPrice) / firstPrice) * 100
			: st.target;
		dsTgt.data = Array(dataLen).fill(tgtVal);
		dsTgt.hidden = false;
	} else {
		dsTgt.data = [];
		dsTgt.hidden = true;
	}

	// -- Update SMA & EMA Indicators --
	var dsSMA = chartInstance.data.datasets[5];
	if (state.showSMA && dataLen) {
		dsSMA.data = smaData;
		dsSMA.hidden = false;
	} else {
		dsSMA.data = [];
		dsSMA.hidden = true;
	}

	var dsEMA = chartInstance.data.datasets[6];
	if (state.showEMA && dataLen) {
		dsEMA.data = emaData;
		dsEMA.hidden = false;
	} else {
		dsEMA.data = [];
		dsEMA.hidden = true;
	}

	// ── Bollinger Bands (datasets 7, 8) ──
	var dsBBUpper = chartInstance.data.datasets[7];
	var dsBBLower = chartInstance.data.datasets[8];
	if (state.showBB && dataLen) {
		var bbPrices = smaData.map(function(_, idx) {
			return chartInstance.data.datasets[0].data[idx] || 0;
		});
		// Use the actual raw price slice for BB calc
		var rawPricesForBB = (state.chartType === 'candle')
			? (chartInstance._ohlc || []).map(function(c) { return c.c; })
			: (chartInstance._lineData || chartInstance.data.datasets[0].data || []);
		var bb = calcBollingerBands(rawPricesForBB, 20, 2);
		var bbU = bb.upper, bbL = bb.lower;
		if (isPct && firstPrice) {
			bbU = bbU.map(function(v) { return v === null ? null : ((v - firstPrice) / firstPrice) * 100; });
			bbL = bbL.map(function(v) { return v === null ? null : ((v - firstPrice) / firstPrice) * 100; });
		}
		dsBBUpper.data = bbU;
		dsBBLower.data = bbL;
		dsBBUpper.hidden = false;
		dsBBLower.hidden = false;
	} else {
		dsBBUpper.data = []; dsBBLower.data = [];
		dsBBUpper.hidden = true; dsBBLower.hidden = true;
	}

	// ── VWAP (dataset 9) ──
	var dsVWAP = chartInstance.data.datasets[9];
	if (state.showVWAP && dataLen) {
		var rawCloses = (state.chartType === 'candle')
			? (chartInstance._ohlc || []).map(function(c) { return c.c; })
			: (chartInstance._lineData || chartInstance.data.datasets[0].data || []);
		var rawVols = (state.chartType === 'candle')
			? (chartInstance._volumes || [])
			: (stock.volumeHistory || []).slice(-rawCloses.length);
		var vwapData = calcVWAP(rawCloses, rawVols);
		if (isPct && firstPrice) {
			vwapData = vwapData.map(function(v) { return v === null ? null : ((v - firstPrice) / firstPrice) * 100; });
		}
		dsVWAP.data = vwapData;
		dsVWAP.hidden = false;
	} else {
		dsVWAP.data = [];
		dsVWAP.hidden = true;
	}

	// Y-axis tick format (pct mode overrides price format)
	scY.ticks.callback = isPct
		? function (v) {
				return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
			}
		: function (v) {
				var cur = state.activeStock ? state.activeStock.currency : "INR";
				var sym = "\u20b9";
				if (cur === "USD") sym = "$";
				else if (cur === "CNY" || cur === "JPY") sym = "\u00a5";
				else if (cur === "HKD") sym = "HK$";
				else if (cur === "GBP") sym = "\u00a3";
				else if (cur === "EUR") sym = "\u20ac";
				else if (cur === "AUD") sym = "A$";
				else if (cur === "CAD") sym = "C$";
				else if (cur === "CHF") sym = "CHF ";

				if (cur === "JPY") return sym + v.toFixed(0);
				if (v >= 10000) return sym + (v / 1000).toFixed(1) + "k";
				if (v >= 1000) return sym + v.toFixed(0);
				return (
					sym +
					v.toFixed(state.activeStock && state.activeStock.ltp < 10 ? 4 : 2)
				);
			};

	// Theme colours
	scX.grid.color = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.03)";
	scY.grid.color = isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.05)";
	scY.ticks.color = isLight ? "#666" : "#707888";
	tip.backgroundColor = isLight
		? "rgba(255,255,255,0.97)"
		: "rgba(18,18,26,0.97)";
	tip.titleColor = isLight ? "#111" : "#eeeef2";
	tip.bodyColor = isLight ? "#333" : "#9ba0b0";
	tip.borderColor = isLight ? "#ddd" : "#2a2a3a";

	chartInstance.update("none");

	// ── Render sub-chart (RSI / MACD) in sync ──
	if (state.showRSI || state.showMACD) {
		var subPrices = (state.chartType === 'candle')
			? (chartInstance._ohlc || []).map(function(c) { return c.c; })
			: (chartInstance._lineData || chartInstance.data.datasets[0].data || []);
		renderSubChart(stock, subPrices);
	}
}

// ==================== CUSTOM HTML TOOLTIP ====================
function customTooltipHandler(context) {
	var chart = context.chart;
	var tooltip = context.tooltip;

	var tooltipEl = document.getElementById('custom-tooltip');
	if (!tooltipEl) {
		tooltipEl = document.createElement('div');
		tooltipEl.id = 'custom-tooltip';
		document.body.appendChild(tooltipEl);
	}

	if (tooltip.opacity === 0) {
		tooltipEl.style.opacity = 0;
		return;
	}

	// Set Text
	if (tooltip.body) {
		var isPct = state.chartScale === "pct";
		var cd = chart._ohlc;
		var d = cd && cd[tooltip.dataPoints[0].dataIndex];

		var fmt = isPct
			? function (n) { return (n >= 0 ? "+" : "") + n.toFixed(2) + "%"; }
			: function (n) { return fmtPrice(state.activeStock, n); };

		var idx = tooltip.dataPoints[0].dataIndex;
		var timeStr = chart._times && chart._times[idx] ? chart._times[idx] : "";

		if (!d) {
			// Line Chart Fallback
			var val = tooltip.dataPoints[0].parsed.y;
			if (val === undefined || val === null) {
				tooltipEl.style.opacity = 0;
				return;
			}
			
			tooltipEl.style.minWidth = "140px";

			tooltipEl.innerHTML = `
				<div class="tooltip-header">
					<span>${state.activeStock ? state.activeStock.ticker : ""}</span>
					<span>${timeStr}</span>
				</div>
				<div class="tooltip-grid" style="display:flex; justify-content:space-between; padding-top: 6px;">
					<span class="tooltip-label">Price</span>
					<span class="tooltip-val" style="color:var(--text); font-size: 14px; font-weight: 600;">${fmt(val)}</span>
				</div>
			`;
		} else {
			tooltipEl.style.minWidth = ""; // use css default
			var isBull = d.c >= d.o;
			var bullBearClass = isBull ? "bull" : "bear";
			var closeFmt = fmt(d.c);
			var openFmt = fmt(d.o);
			var highFmt = fmt(d.h);
			var lowFmt = fmt(d.l);

			var volStr = d.v ? formatVolume(d.v, state.activeStock ? state.activeStock.currency : "INR") : "0";

			var pctMove = ((d.c - d.o) / d.o) * 100;
			var pctStr = (pctMove > 0 ? "+" : "") + pctMove.toFixed(2) + "%";

			tooltipEl.innerHTML = `
				<div class="tooltip-header">
					<span>${state.activeStock ? state.activeStock.ticker : ""}</span>
					<span>${timeStr}</span>
				</div>
				<div class="tooltip-grid">
					<div class="tooltip-row"><span class="tooltip-label">O</span> <span class="tooltip-val">${openFmt}</span></div>
					<div class="tooltip-row"><span class="tooltip-label">H</span> <span class="tooltip-val" style="color:var(--green)">${highFmt}</span></div>
					<div class="tooltip-row"><span class="tooltip-label">C</span> <span class="tooltip-val ${bullBearClass}">${closeFmt}</span></div>
					<div class="tooltip-row"><span class="tooltip-label">L</span> <span class="tooltip-val" style="color:var(--red)">${lowFmt}</span></div>
				</div>
				<div class="tooltip-footer">
					<span class="tooltip-label">Vol: <span style="color:var(--text)">${volStr}</span></span>
					<span class="tooltip-pct ${bullBearClass}">${pctStr}</span>
				</div>
			`;
		}
	}

	var position = context.chart.canvas.getBoundingClientRect();
	tooltipEl.style.opacity = 1;
	tooltipEl.style.left = position.left + window.pageXOffset + tooltip.caretX + 'px';
	
	// Shift tooltip slightly to the side to keep the exact data point visible
	var shiftX = tooltip.caretX > chart.width * 0.7 ? 'calc(-100% - 15px)' : '15px';
	
	// Better positioning: if too close to top edge, push down
	var topPos = position.top + window.pageYOffset + tooltip.caretY;
	if (topPos - 130 < window.pageYOffset) {
		tooltipEl.style.transform = 'translate(' + shiftX + ', 20px)';
	} else {
		tooltipEl.style.transform = 'translate(' + shiftX + ', -110%)';
	}
	tooltipEl.style.top = topPos + 'px';
}



function updateOrderMargin() {
	if (!state.activeStock) return;
	var qty = parseInt(document.getElementById("order-qty").value, 10) || 0;
	var req = toINR(state.activeStock.ltp * qty, state.activeStock.currency);
	document.getElementById("req-margin").textContent = fmtCur(req);
}

function renderPositionCard(stock) {
	var pos = state.positions[stock.ticker];
	if (!pos) {
		document.getElementById("pos-qty").textContent = "0";
		document.getElementById("pos-avg").textContent = "0.00";
		document.getElementById("pos-ltp").textContent = stock.ltp.toFixed(2);
		var pnlEl = document.getElementById("pos-pnl");
		pnlEl.textContent = "\u20b9 0.00";
		pnlEl.className = "pc-val mono";
		return;
	}

	var pnl =
		pos.qty > 0
			? toINR((stock.ltp - pos.avgPrice) * pos.qty, stock.currency)
			: toINR((pos.avgPrice - stock.ltp) * Math.abs(pos.qty), stock.currency);

	document.getElementById("pos-qty").textContent = pos.qty;
	// Bug #17 fix: avgPrice and ltp are stored in native currency; show currency symbol for clarity
	var currSym = stock.currency === "INR" ? "₹" : (stock.currency || "");
	var pDec = stock.ltp < 10 ? 4 : 2;
	document.getElementById("pos-avg").textContent = currSym + " " + pos.avgPrice.toFixed(pDec);
	document.getElementById("pos-ltp").textContent = currSym + " " + stock.ltp.toFixed(pDec);
	var pnlEl2 = document.getElementById("pos-pnl");
	pnlEl2.textContent = (pnl >= 0 ? "+" : "") + fmtCur(pnl);
	pnlEl2.className = "pc-val mono " + (pnl >= 0 ? "up" : "dn");
}

// ==================== CLOSE POSITION HELPERS ====================
function closeEquityPosition(ticker, forceInstant) {
	var pos = state.positions[ticker];
	var stock = stockMap[ticker];
	if (!pos || !stock) return;

	var absQty = Math.abs(pos.qty);
	var isShort = pos.qty < 0;
	var side = isShort ? "BUY" : "SELL";

	if (forceInstant) {
		var price = stock.ltp;
		var fxRate = EXCHANGE_RATES[stock.currency] || 1;
		var pnl = isShort
			? (pos.avgPrice - price) * absQty
			: (price - pos.avgPrice) * absQty; // native
		var pnlINR = pnl * fxRate;

		if (isShort) {
			state.margin += (pos.avgPrice * absQty * 0.2 + pnl) * fxRate;
		} else {
			state.margin += price * absQty * fxRate;
		}
		
		var brokerage = price * absQty * fxRate * 0.001;
		if (state.inventory && state.inventory.brokerageFreeDays > 0) brokerage = 0;
		state.margin -= brokerage;
		state.totalBrokerage = (state.totalBrokerage || 0) + brokerage;

		if (pnlINR > 0) {
			var tax = pnlINR * 0.15;
			state.margin -= tax;
			state.totalTaxesPaid = (state.totalTaxesPaid || 0) + tax;
			
			if (state.inventory && state.inventory.profitBoostDays > 0) {
				var bonus = pnlINR * 0.25;
				state.margin += bonus;
				if (typeof toast === "function") toast("Profit Amplifier", "Bonus " + fmtCur(bonus) + " added to margin", "success");
			}
		}

		state.tradeHistory.unshift({
			time: formatTime(state.time),
			day: state.day,
			ticker: ticker,
			side: isShort ? "COVER" : "SELL",
			type: "Equity",
			qty: absQty,
			price: price,
			value: price * absQty * fxRate,
			pnl: pnlINR
		});

		delete state.positions[ticker];
		delete state.slTargets[ticker];
		stock.volume += absQty;

		if (state.activeStock && state.activeStock.ticker === ticker) {
			document.getElementById("sl-price").value = "";
			document.getElementById("target-price").value = "";
		}

		renderAll();
	} else {
		// User initiated close -> submit a MARKET order via pendingOrders engine
		if (!isMarketOpen(stock, state.time)) {
			toast(
				"Closed",
				"Cannot close position when " +
					stock.market +
					" is closed. Place a LIMIT order instead.",
				"error",
			);
			return;
		}
		if (stock.haltUntil) {
			toast("Halted", "Cannot close positions for " + stock.ticker + " while it is halted!", "error");
			return;
		}

		var pendingOpposite = 0;
		state.pendingOrders.forEach(function (o) {
			if (o.ticker === ticker && o.side === side && o.orderType === "MARKET") {
				pendingOpposite += o.qty;
			}
		});

		var qtyToSubmit = absQty - pendingOpposite;
		if (qtyToSubmit <= 0) {
			toast(
				"Pending",
				"A market order is already actively closing this position.",
				"info",
			);
			return;
		}

		state.pendingOrders.push({
			id: pcg.random().toString(36).substr(2, 9),
			time: formatTime(state.time),
			day: state.day,
			ticker: ticker,
			side: side,
			qty: qtyToSubmit,
			limitPrice: stock.ltp, // Needed for partial fill logic
			orderType: "MARKET",
			tif: "DAY",
			currency: stock.currency,
		});

		toast(
			"Order Placed",
			"Market order submitted to close " + qtyToSubmit + " " + ticker,
			"info",
		);
		delete state.slTargets[ticker];
		renderAll();
	}
}

function closeOptionPosition(id, silent) {
	var pos = state.optionsPositions[id];
	var stock = stockMap[pos && pos.ticker];
	if (!pos || !stock) return;

	if (!silent && !isMarketOpen(stock, state.time)) {
		toast(
			"Closed",
			"Cannot close options when " + stock.market + " is closed.",
			"error",
		);
		return;
	}
	if (!silent && stock.haltUntil) {
		toast("Halted", "Cannot close options for " + stock.ticker + " while it is halted!", "error");
		return;
	}

	var fxRate = EXCHANGE_RATES[stock.currency] || 1;
	var side = pos.lots > 0 ? "SELL" : "BUY";
	
	processOptionTrade(stock, side, pos.type, pos.strike, pos.expiryType, Math.abs(pos.lots), pos.lotSize, fxRate, silent);
	
	if (!silent) renderAll();
}

function closeAllPositions() {
	var equityKeys = Object.keys(state.positions);
	var optionKeys = Object.keys(state.optionsPositions);
	if (equityKeys.length === 0 && optionKeys.length === 0) {
		toast("Info", "No open positions to close", "info");
		return;
	}
	if (!confirm("Are you sure you want to close ALL open positions at market price?")) {
		return;
	}
	
	var closedCount = 0;
	var skippedCount = 0;
	
	optionKeys.slice().forEach(function (id) {
		var pos = state.optionsPositions[id];
		var stock = stockMap[pos && pos.ticker];
		if (!stock || !isMarketOpen(stock, state.time) || stock.haltUntil) {
			skippedCount++;
			return;
		}
		closeOptionPosition(id, true);
		closedCount++;
	});
	
	equityKeys.slice().forEach(function (t) {
		var stock = stockMap[t];
		if (!stock || !isMarketOpen(stock, state.time) || stock.haltUntil) {
			skippedCount++;
			return;
		}
		closeEquityPosition(t, true);
		closedCount++;
	});
	
	if (closedCount > 0) {
		toast(
			"Closed All",
			closedCount + " position(s) squared off instantly.",
			"success",
		);
	}
	if (skippedCount > 0) {
		toast(
			"Skipped",
			skippedCount + " position(s) could not be closed because their markets are closed or halted.",
			"error",
		);
	}
	renderAll();
}

function liquidateAllForced() {
	var equityKeys = Object.keys(state.positions);
	var optionKeys = Object.keys(state.optionsPositions);
	if (equityKeys.length === 0 && optionKeys.length === 0) return;

	equityKeys.forEach(function (ticker) {
		var pos = state.positions[ticker];
		var stock = stockMap[ticker];
		if (!pos || !stock) return;
		// Halt safeguard removed: Forced liquidation bypasses halts to prevent infinite debt spiral

		var absQty = Math.abs(pos.qty);
		var price = stock.ltp;
		var fxRate = EXCHANGE_RATES[stock.currency] || 1;
		var isShort = pos.qty < 0;
		var pnl = isShort
			? (pos.avgPrice - price) * absQty
			: (price - pos.avgPrice) * absQty;

		if (isShort) {
			state.margin += (pos.avgPrice * absQty * 0.2 + pnl) * fxRate;
		} else {
			state.margin += price * absQty * fxRate;
		}

		var brokerage = price * absQty * fxRate * 0.001;
		if (state.inventory && state.inventory.brokerageFreeDays > 0) brokerage = 0;
		state.margin -= brokerage;
		state.totalBrokerage = (state.totalBrokerage || 0) + brokerage;

		var pnlINR = pnl * fxRate;
		if (pnlINR > 0) {
			var tax = pnlINR * 0.15;
			state.margin -= tax;
			state.totalTaxesPaid = (state.totalTaxesPaid || 0) + tax;
			
			if (state.inventory && state.inventory.profitBoostDays > 0) {
				var bonus = pnlINR * 0.25;
				state.margin += bonus;
				if (typeof toast === "function") toast("Profit Amplifier", "Bonus " + fmtCur(bonus) + " added to margin", "success");
			}
		}

		state.tradeHistory.unshift({
			time: formatTime(state.time),
			day: state.day,
			ticker: ticker,
			side: "LIQUIDATED",
			type: "Equity",
			qty: absQty,
			price: price,
			value: price * absQty * fxRate,
		});

		delete state.positions[ticker];
		delete state.slTargets[ticker];
		stock.volume += absQty;
	});

	optionKeys.forEach(function (id) {
		var pos = state.optionsPositions[id];
		var stock = stockMap[pos && pos.ticker];
		if (!pos || !stock) return;
		// Halt safeguard removed: Forced liquidation bypasses halts to prevent infinite debt spiral

		var fxRate = EXCHANGE_RATES[stock.currency] || 1;
		var remainingDays = Math.max(0.01, pos.daysToExpiry - getDayFraction());
		var theoPrem = calcPremium(pos.type, pos.strike, stock.ltp, remainingDays, stock.iv);
		var cg = calcGreeks(pos.type, pos.strike, stock.ltp, remainingDays, stock.iv);
		var ba = getBidAsk(theoPrem, pos.type, pos.strike, stock.ltp, cg.sigma);
		
		var curPrem = pos.lots > 0 ? ba.bid : ba.ask; // if long, sell at bid. if short, buy at ask.
		var absLots = Math.abs(pos.lots);
		var totalQty = absLots * pos.lotSize;
		var valINR = curPrem * totalQty * fxRate;
		var brokerage = valINR * 0.001;
		if (state.inventory && state.inventory.brokerageFreeDays > 0) brokerage = 0;
		
		var pnl;
		if (pos.lots < 0) {
			pnl = (pos.avgPremium - curPrem) * totalQty * fxRate;
			state.margin += pos.blockedMargin - valINR - brokerage;
		} else {
			pnl = (curPrem - pos.avgPremium) * totalQty * fxRate;
			state.margin += valINR - brokerage;
		}
		
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
		
		state.totalBrokerage = (state.totalBrokerage || 0) + brokerage;

		state.tradeHistory.unshift({
			time: formatTime(state.time),
			day: state.day,
			ticker: pos.ticker,
			side: "LIQUIDATED",
			type: pos.type + " " + pos.strike + " OPT",
			qty: totalQty,
			price: curPrem,
			value: valINR,
			pnl: pnl
		});

		delete state.optionsPositions[id];
	});

	state.pendingOrders = [];
	toast(
		"PORTFOLIO LIQUIDATED",
		"All positions force closed: Portfolio value fell below 1% of starting capital!",
		"error",
	);
	renderAll();
}


function saveSlTarget() {
	if (!state.activeStock) return;
	var stock = state.activeStock;
	var ticker = stock.ticker;
	var sl = parseFloat(document.getElementById("sl-price").value);
	var tgt = parseFloat(document.getElementById("target-price").value);
	var tsl = document.getElementById("tsl-check") ? document.getElementById("tsl-check").checked : false;
	
	var trailingAmt = null;
	if (tsl && !isNaN(sl) && sl > 0) {
		var isLong = state.positions[ticker] && state.positions[ticker].qty > 0;
		var isShort = state.positions[ticker] && state.positions[ticker].qty < 0;
		var currentLtp = stock.ltp;
		if (isLong) trailingAmt = Math.max(0, currentLtp - sl);
		else if (isShort) trailingAmt = Math.max(0, sl - currentLtp);
		else trailingAmt = Math.max(0, currentLtp - sl); // Default to long assumption if no pos
	}
	
	state.slTargets[ticker] = {
		sl: isNaN(sl) || sl <= 0 ? null : sl,
		target: isNaN(tgt) || tgt <= 0 ? null : tgt,
		trailingAmt: trailingAmt
	};
	
	var msg = [];
	if (state.slTargets[ticker].sl) msg.push((tsl ? "Trailing SL " : "SL ") + fmtPrice(stock, sl));
	if (state.slTargets[ticker].target) msg.push("Target " + fmtPrice(stock, tgt));
	if (msg.length) toast("Alert Set", ticker + ": " + msg.join(", "), "info");
}


function renderPositionsTable() {
	var tbody = document.getElementById("positions-tbody");
	var keys = Object.keys(state.positions);

	if (keys.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="10" class="empty">No open positions</td></tr>';
		return;
	}

	tbody.innerHTML = "";
	var fragment = document.createDocumentFragment();
	keys.forEach(function (ticker) {
		var pos = state.positions[ticker];
		var stock = stockMap[ticker];
		if (!stock) return;

		var isShort = pos.qty < 0;
		var absQty = Math.abs(pos.qty);
		var curVal = toINR(absQty * stock.ltp, stock.currency);
		var pnl = isShort
			? toINR((pos.avgPrice - stock.ltp) * absQty, stock.currency)
			: toINR((stock.ltp - pos.avgPrice) * absQty, stock.currency);
		var pnlPct = (
			(pnl / toINR(pos.avgPrice * absQty, stock.currency)) *
			100
		).toFixed(2);
		var pnlCls = pnl >= 0 ? "up" : "dn";
		var hasSl =
			state.slTargets[ticker] &&
			(state.slTargets[ticker].sl || state.slTargets[ticker].target);
		var isTrailing = hasSl && state.slTargets[ticker].trailingAmt;

		var tr = document.createElement("tr");
		tr.style.cursor = "pointer";
		tr.title = "Click to select " + ticker;
		tr.innerHTML =
			'<td class="sym-cell">' +
			ticker +
			(hasSl
				? ' <i class="fa-solid ' + (isTrailing ? 'fa-arrow-trend-up' : 'fa-bell') + '" style="font-size:9px;color:var(--orange)" title="' + (isTrailing ? 'Trailing SL Active' : 'SL/Target Active') + '"></i>'
				: "") +
			"</td>" +
			'<td class="' +
			(isShort ? "side-short" : "side-long") +
			'">' +
			(isShort ? "SHORT" : "LONG") +
			"</td>" +
			"<td>CNC</td>" +
			'<td class="r">' +
			pos.qty +
			"</td>" +
			'<td class="r">' +
			pos.avgPrice.toFixed(2) +
			"</td>" +
			'<td class="r">' +
			stock.ltp.toFixed(2) +
			"</td>" +
			'<td class="r">' +
			fmtCur(curVal) +
			"</td>" +
			'<td class="r ' +
			pnlCls +
			'">' +
			(pnl >= 0 ? "+" : "") +
			fmtCur(pnl) +
			"</td>" +
			'<td class="r ' +
			pnlCls +
			'">' +
			(pnl >= 0 ? "+" : "") +
			pnlPct +
			"%</td>" +
			'<td class="r"><button class="btn-close-pos" onclick="event.stopPropagation();closeEquityPosition(\'' +
			ticker +
			'\')" title="Close position">&#x2715; Close</button></td>';
		tr.onclick = function () {
			selectStock(stockMap[ticker]);
		};
		fragment.appendChild(tr);
	});
	tbody.appendChild(fragment);
}

function renderOptionsTable() {
	var tbody = document.getElementById("options-tbody");
	var keys = Object.keys(state.optionsPositions);

	if (keys.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="10" class="empty">No option positions</td></tr>';
		return;
	}

	tbody.innerHTML = "";
	var fragment = document.createDocumentFragment();
	keys.forEach(function (id) {
		var pos = state.optionsPositions[id];
		var stock = stockMap[pos.ticker];
		if (!stock) return;

		var remainingDays = pos.daysToExpiry - getDayFraction();
		var curPrem = calcPremium(pos.type, pos.strike, stock.ltp, remainingDays, stock.iv);
		var totalQty = Math.abs(pos.lots) * pos.lotSize;
		var pnlNative = (pos.lots > 0) ? (curPrem - pos.avgPremium) * totalQty : (pos.avgPremium - curPrem) * totalQty;
		var pnlINR = toINR(pnlNative, stock.currency); // convert P&L to INR
		var cls = pnlINR >= 0 ? "up" : "dn";

		var tr = document.createElement("tr");
		tr.style.cursor = "pointer";
		tr.title = "Click to select " + pos.ticker;
		tr.innerHTML =
			'<td class="sym-cell">' +
			pos.ticker +
			"</td>" +
			"<td>" +
			pos.type +
			"</td>" +
			'<td class="r">' +
			pos.strike +
			"</td>" +
			"<td>" +
			pos.expiryType +
			" (" +
			remainingDays.toFixed(1) +
			"d)</td>" +
			'<td class="r">' +
			pos.lots +
			"</td>" +
			'<td class="r">' +
			totalQty +
			"</td>" +
			'<td class="r">' +
			fmtPrice(stock, pos.avgPremium) +
			"</td>" +
			'<td class="r">' +
			fmtPrice(stock, curPrem) +
			"</td>" +
			'<td class="r ' +
			cls +
			'">' +
			(pnlINR >= 0 ? "+" : "") +
			fmtCur(pnlINR) +
			"</td>" +
			'<td class="r"><button class="btn-close-pos" onclick="event.stopPropagation();closeOptionPosition(\'' +
			id +
			'\')" title="Close option">&#x2715; Close</button></td>';
		tr.onclick = function () {
			selectStock(stockMap[pos.ticker]);
		};
		fragment.appendChild(tr);
	});
	tbody.appendChild(fragment);
}

function renderPendingTable() {
	var tbody = document.getElementById("pending-tbody");
	if (state.pendingOrders.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="9" class="empty">No pending orders</td></tr>';
		return;
	}
	tbody.innerHTML = "";
	state.pendingOrders.forEach(function (order, index) {
		var stock = stockMap[order.ticker];
		var curLTP = stock ? stock.ltp : 0;
		var tr = document.createElement("tr");
		tr.style.cursor = "pointer";
		tr.title = "Click to select " + order.ticker;
		var sideClass =
			order.side === "BUY" || order.side === "COVER"
				? "side-long"
				: "side-short";
		var typeText = order.orderType || "LIMIT";
		if (order.tif) typeText += " (" + order.tif + ")";
		var priceText =
			order.orderType === "MARKET"
				? "MKT"
				: stock
					? fmtPrice(stock, order.limitPrice)
					: order.limitPrice.toFixed(2);
		var qtyText =
			order.orderType === "MARKET" ? "Pending: " + order.qty : order.qty;

		tr.innerHTML =
			'<td class="mono">' +
			order.time +
			"</td>" +
			"<td>Day " +
			order.day +
			"</td>" +
			'<td class="sym-cell">' +
			order.ticker +
			"</td>" +
			'<td class="' +
			sideClass +
			'">' +
			order.side +
			"</td>" +
			"<td>" +
			typeText +
			"</td>" +
			'<td class="r">' +
			qtyText +
			"</td>" +
			'<td class="r">' +
			priceText +
			"</td>" +
			'<td class="r">' +
			(stock ? fmtPrice(stock, curLTP) : "0.00") +
			"</td>" +
			'<td class="r"><button class="btn-cancel-order" onclick="event.stopPropagation();cancelPendingOrder(\'' +
			order.id +
			'\')" title="Cancel order">&#x2715; Cancel</button></td>';

		if (stock) {
			tr.onclick = function () {
				selectStock(stock);
			};
		}
		tbody.appendChild(tr);
	});
}

function cancelPendingOrder(id) {
	var index = state.pendingOrders.findIndex(function(o) { return o.id === id; });
	if (index >= 0 && index < state.pendingOrders.length) {
		var order = state.pendingOrders[index];
		state.pendingOrders.splice(index, 1);
		if (order.lockedMargin) {
			state.margin += order.lockedMargin;
		}
		var priceStr =
			order.limitPrice != null ? order.limitPrice.toFixed(2) : "MKT";
		toast(
			"Order Cancelled",
			order.side +
				" " +
				order.qty +
				" " +
				order.ticker +
				" @ " +
				priceStr +
				" cancelled.",
			"info",
		);
		renderAll();
	}
}

function renderHistoryTable() {
	var tbody = document.getElementById("history-tbody");

	var combinedHistory = [];
	state.tradeHistory.forEach(function(t) { 
		var t2 = Object.assign({}, t); t2.executor = "Manual"; combinedHistory.push(t2); 
	});
	if (state.botTradeHistory) {
		state.botTradeHistory.forEach(function(t) { 
			var t2 = Object.assign({}, t); t2.executor = "Bot"; combinedHistory.push(t2); 
		});
	}

	if (combinedHistory.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="8" class="empty">No trades yet</td></tr>';
		return;
	}

	combinedHistory.sort(function(a, b) {
		if (b.day !== a.day) return b.day - a.day;
		
		function parseToMins(tStr) {
			var parts = tStr.split(" ");
			if (parts.length !== 2) return 0;
			var hm = parts[0].split(":");
			var h = parseInt(hm[0], 10) || 0;
			var m = parseInt(hm[1], 10) || 0;
			if (parts[1] === "PM" && h !== 12) h += 12;
			if (parts[1] === "AM" && h === 12) h = 0;
			return h * 60 + m;
		}
		
		if (b.time !== a.time) return parseToMins(b.time) - parseToMins(a.time);
		return 0;
	});

	tbody.innerHTML = "";
	var fragment = document.createDocumentFragment();
	combinedHistory.forEach(function (trade) {
		var sideClass =
			trade.side === "BUY" || trade.side === "COVER"
				? "side-long"
				: "side-short";
		
		var tickerHtml = trade.ticker;
		if (trade.executor === "Bot") {
			tickerHtml += ' <span style="font-size: 10px; background: rgba(255,165,0,0.2); color: orange; padding: 2px 4px; border-radius: 3px;">BOT</span>';
		}

		var tr = document.createElement("tr");
		tr.innerHTML =
			'<td class="mono">' +
			trade.time +
			"</td>" +
			"<td>Day " +
			trade.day +
			"</td>" +
			'<td class="sym-cell">' +
			tickerHtml +
			"</td>" +
			'<td class="' +
			sideClass +
			'">' +
			trade.side +
			"</td>" +
			"<td>" +
			trade.type +
			"</td>" +
			'<td class="r">' +
			trade.qty +
			"</td>" +
			'<td class="r">' +
			// Bug #15 fix: guard against null/undefined/NaN price (possible for settled options)
			(trade.price != null && !isNaN(trade.price) ? (+trade.price).toFixed(2) : "—") +
			"</td>" +
			'<td class="r">' +
			fmtCur(trade.value) +
			"</td>";
		fragment.appendChild(tr);
	});
	tbody.appendChild(fragment);
}

function exportPremiumStatement() {
	if (state.tradeHistory.length === 0 && (!state.botTradeHistory || state.botTradeHistory.length === 0)) {
		toast("Export", "No trade history to export", "error");
		return;
	}

	var combinedHistory = [];
	state.tradeHistory.forEach(function(t) { 
		var t2 = Object.assign({}, t); t2.executor = "Manual"; combinedHistory.push(t2); 
	});
	if (state.botTradeHistory) {
		state.botTradeHistory.forEach(function(t) { 
			var t2 = Object.assign({}, t); t2.executor = "Bot"; combinedHistory.push(t2); 
		});
	}

	combinedHistory.sort(function(a, b) {
		if (a.day !== b.day) return a.day - b.day;
		
		function parseToMins(tStr) {
			var parts = tStr.split(" ");
			if (parts.length !== 2) return 0;
			var hm = parts[0].split(":");
			var h = parseInt(hm[0], 10) || 0;
			var m = parseInt(hm[1], 10) || 0;
			if (parts[1] === "PM" && h !== 12) h += 12;
			if (parts[1] === "AM" && h === 12) h = 0;
			return h * 60 + m;
		}
		
		return parseToMins(a.time) - parseToMins(b.time);
	});

	var posValue = calcEquityValue();
	var optValue = calcOptionsValue();
	var unrealizedPNL = calcTotalPNL();
	var portfolioValue = calcPortfolioValue();
	var overallPNL = portfolioValue - INITIAL_MARGIN;
	var overallPNLPct = ((overallPNL / INITIAL_MARGIN) * 100).toFixed(2);
	var pnlClass = overallPNL >= 0 ? "positive" : "negative";

	if (window.jspdf && window.jspdf.jsPDF) {
		var doc = new window.jspdf.jsPDF('landscape', 'pt', 'a4');
		
		// Dark mode background
		doc.setFillColor(5, 6, 8);
		doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');
		
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(24);
		doc.setFont("helvetica", "bold");
		doc.text("TRADING TERMINAL", 40, 50);
		
		doc.setTextColor(148, 163, 184);
		doc.setFontSize(12);
		doc.setFont("helvetica", "normal");
		doc.text("Premium Account Statement", 40, 70);
		
		doc.setFontSize(10);
		var rightX = doc.internal.pageSize.width - 40;
		doc.text("Generated: Day " + state.day, rightX, 50, { align: "right" });
		doc.text("Total Trades: " + combinedHistory.length, rightX, 65, { align: "right" });
		
		// Blue accent bar at top
		doc.setFillColor(59, 130, 246);
		doc.rect(0, 0, doc.internal.pageSize.width, 8, 'F');
		
		// Metrics
		var startY = 120;
		var drawMetric = function(label, value, x, isPositive, isNegative) {
			// Draw rounded card background
			doc.setFillColor(20, 22, 28);
			doc.setDrawColor(255, 255, 255, 0.1);
			doc.setLineWidth(0.5);
			doc.roundedRect(x - 15, startY - 20, 180, 60, 6, 6, 'FD');
			
			doc.setFontSize(10);
			doc.setFont("helvetica", "bold");
			doc.setTextColor(148, 163, 184);
			doc.text(label, x, startY);
			
			doc.setFontSize(16);
			if (isPositive) doc.setTextColor(16, 185, 129);
			else if (isNegative) doc.setTextColor(239, 68, 68);
			else doc.setTextColor(255, 255, 255);
			doc.text(value, x, startY + 20);
		};
		
		drawMetric("NET WORTH", fmtCur(portfolioValue), 55);
		var pnlStr = (overallPNL >= 0 ? "+" : "") + fmtCur(overallPNL) + " (" + overallPNLPct + "%)";
		drawMetric("TOTAL P&L", pnlStr, 255, overallPNL >= 0, overallPNL < 0);
		drawMetric("CASH BALANCE", fmtCur(state.margin), 455);
		var upnlStr = (unrealizedPNL >= 0 ? "+" : "") + fmtCur(unrealizedPNL);
		drawMetric("UNREALIZED P&L", upnlStr, 655, unrealizedPNL >= 0, unrealizedPNL < 0);
		
		var rows = [];
		combinedHistory.forEach(function(t) {
			var pnlFormatted = t.pnl != null ? fmtCur(t.pnl) : "-";
			if(t.pnl != null && t.pnl > 0) pnlFormatted = "+" + pnlFormatted;
			rows.push([
				"Day " + t.day + " " + t.time,
				t.executor,
				t.ticker,
				t.type,
				t.side,
				t.qty.toString(),
				(t.price != null && !isNaN(t.price)) ? t.price.toFixed(2) : "-",
				fmtCur(t.value),
				pnlFormatted
			]);
		});
		
		doc.autoTable({
			startY: startY + 60,
			head: [['Time', 'Executor', 'Symbol', 'Type', 'Action', 'Qty', 'Price', 'Value', 'P&L']],
			body: rows,
			theme: 'grid',
			styles: { font: "helvetica", textColor: [226, 232, 240], lineColor: [30, 34, 40], lineWidth: 1 },
			headStyles: { fillColor: [20, 22, 28], textColor: [148, 163, 184], fontStyle: 'bold' },
			bodyStyles: { fillColor: [5, 6, 8] },
			alternateRowStyles: { fillColor: [15, 16, 20] },
			columnStyles: {
				5: { halign: 'right' },
				6: { halign: 'right' },
				7: { halign: 'right' },
				8: { halign: 'right' }
			},
			didParseCell: function(data) {
				if (data.section === 'body') {
					if (data.column.index === 8) {
						var val = data.cell.raw;
						if (val.startsWith('+')) data.cell.styles.textColor = [16, 185, 129];
						else if (val.startsWith('-') && val !== '-') data.cell.styles.textColor = [239, 68, 68];
					}
					if (data.column.index === 4) {
						val = data.cell.raw;
						if (val === 'BUY') data.cell.styles.textColor = [16, 185, 129];
						else if (val === 'SELL') data.cell.styles.textColor = [239, 68, 68];
						else if (val === 'SHORT') data.cell.styles.textColor = [234, 179, 8];
						else if (val === 'COVER') data.cell.styles.textColor = [59, 130, 246];
						else if (val === 'LIQUIDATED') data.cell.styles.textColor = [239, 68, 68];
					}
				}
			},
			didDrawPage: function(data) {
				doc.setFontSize(10);
				doc.setTextColor(148, 163, 184);
				doc.text(
					"Generated automatically by Trading Terminal. All balances are simulated.",
					doc.internal.pageSize.width / 2,
					doc.internal.pageSize.height - 20,
					{ align: "center" }
				);
			}
		});
		
		toast("Export", "Generating Native PDF...", "info");
		doc.save("Premium_Statement_Day" + state.day + ".pdf");
		setTimeout(function() {
			toast("Export", "Premium Statement PDF downloaded!", "success");
		}, 500);
	} else {
		toast("Export Error", "PDF generation library failed to load. Please check your internet connection.", "error");
	}
}

// ==================== UTILS ====================
function calcTotalPNL() {
	var total = 0;
	Object.entries(state.positions).forEach(function (entry) {
		var t = entry[0],
			p = entry[1];
		var s = stockMap[t];
		if (!s) return;
		var pnlNative =
			p.qty > 0
				? (s.ltp - p.avgPrice) * p.qty
				: (p.avgPrice - s.ltp) * Math.abs(p.qty);
		total += toINR(pnlNative, s.currency);
	});
	Object.values(state.optionsPositions).forEach(function (p) {
		var s = stockMap[p.ticker];
		if (!s) return;
		var remainingDays = p.daysToExpiry - getDayFraction();
		var cur = calcPremium(p.type, p.strike, s.ltp, remainingDays, s.iv);
		total += toINR((cur - p.avgPremium) * p.lots * p.lotSize, s.currency); // convert to INR
	});
	return total;
}

function toINR(amount, currency) {
	return amount * (EXCHANGE_RATES[currency] || 1);
}

function fmtCur(n) {
	// Bug #16 fix: guard against null/undefined/NaN to prevent TypeError in UI rendering
	if (n == null || isNaN(n)) n = 0;
	return (
		"\u20b9 " +
		n.toLocaleString("en-IN", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})
	);
}

function calcEquityValue() {
	var total = 0;
	Object.entries(state.positions).forEach(function (entry) {
		var ticker = entry[0],
			pos = entry[1];
		var stock = stockMap[ticker];
		if (!stock) return;
		if (pos.qty > 0) {
			total += toINR(stock.ltp * pos.qty, stock.currency);
		} else {
			var absQty = Math.abs(pos.qty);
			var reservedMargin = pos.avgPrice * absQty * 0.2;
			// The proceeds from shorting (pos.avgPrice * absQty) are held in escrow by the broker along with the reserved margin.
			// The cost to close is stock.ltp * absQty.
			// Therefore, equity value = (Proceeds + Reserved Margin) - Cost To Close.
			// Which simplifies to: Reserved Margin + (Proceeds - Cost To Close) = Reserved Margin + Unrealized PNL.
			var unrealizedPNL = (pos.avgPrice - stock.ltp) * absQty;
			total += toINR(reservedMargin + unrealizedPNL, stock.currency);
		}
	});
	return total;
}

function calcOptionsValue() {
	var total = 0;
	Object.values(state.optionsPositions).forEach(function (pos) {
		var stock = stockMap[pos.ticker];
		if (!stock) return;
		var remainingDays = pos.daysToExpiry - getDayFraction();
		var curPrem = calcPremium(pos.type, pos.strike, stock.ltp, remainingDays, stock.iv);
		
		var val = toINR(curPrem * pos.lots * pos.lotSize, stock.currency);
		if (pos.lots < 0) {
			val += (pos.blockedMargin || 0);
		}
		total += val;
	});
	return total;
}

function calcPortfolioValue() {
	var v = state.margin;
	Object.keys(state.positions).forEach(function (t) {
		var pos = state.positions[t];
		var stock = stockMap[t];
		if (stock && pos.qty !== 0) {
			var fxRate = EXCHANGE_RATES[stock.currency] || 1;
			if (pos.qty > 0) {
				v += pos.qty * stock.ltp * fxRate;
			} else {
				var absQty = Math.abs(pos.qty);
				var proceeds = absQty * pos.avgPrice * fxRate;
				var marginHeld = proceeds * 0.2;
				var liability = absQty * stock.ltp * fxRate;
				v += (proceeds + marginHeld - liability);
			}
		}
	});
	v += calcOptionsValue();
	if (state.realEstate) {
		state.realEstate.forEach(function(re) { v += (re.marketPrice || 0); });
	}
	if (state.fixedDeposits) {
		state.fixedDeposits.forEach(function(fd) { 
			var elapsedDays = fd.daysTotal - fd.daysLeft;
			var accrued = fd.daysTotal > 0 ? (fd.interest || 0) * (elapsedDays / fd.daysTotal) : 0;
			v += (fd.principal + accrued); 
		});
	}
	if (state.upcomingIPOs) {
		state.upcomingIPOs.forEach(function(ipo) {
			if (ipo.userBids && ipo.userBids.marginBlocked > 0) v += ipo.userBids.marginBlocked;
		});
	}
	if (state.pendingOrders) {
		state.pendingOrders.forEach(function(order) {
			if (order.lockedMargin > 0) v += order.lockedMargin;
		});
	}
	if (state.mfHoldings) {
		Object.keys(state.mfHoldings).forEach(function(fid) {
			var holding = state.mfHoldings[fid];
			var fund = mutualFunds ? mutualFunds.find(function(f) { return f.id === fid; }) : null;
			if (holding && holding.units > 0 && fund) {
				v += holding.units * calcCurrentNAV(fund);
			}
		});
	}
	return v;
}
function fmtPrice(stock, value) {
	if (value === undefined || value === null || isNaN(value)) return value;
	var fraction = stock && stock.ltp < 10 ? 4 : 2;
	if (!stock || stock.currency === "INR")
		return (
			"\u20b9" +
			value.toLocaleString("en-IN", {
				minimumFractionDigits: fraction,
				maximumFractionDigits: fraction,
			})
		);
	if (stock.currency === "USD")
		return (
			"$" +
			value.toLocaleString("en-US", {
				minimumFractionDigits: fraction,
				maximumFractionDigits: fraction,
			})
		);
	if (stock.currency === "CNY") return "\u00a5" + value.toFixed(fraction);
	if (stock.currency === "JPY")
		return "\u00a5" + (stock.ltp < 10 ? value.toFixed(2) : value.toFixed(0));
	if (stock.currency === "HKD")
		return (
			"HK$" +
			value.toLocaleString("en-HK", {
				minimumFractionDigits: fraction,
				maximumFractionDigits: fraction,
			})
		);
	if (stock.currency === "GBP")
		return (
			"\u00a3" +
			value.toLocaleString("en-GB", {
				minimumFractionDigits: fraction,
				maximumFractionDigits: fraction,
			})
		);
	if (stock.currency === "EUR")
		return (
			"\u20ac" +
			value.toLocaleString("en-IE", {
				minimumFractionDigits: fraction,
				maximumFractionDigits: fraction,
			})
		);
	if (stock.currency === "AUD")
		return (
			"A$" +
			value.toLocaleString("en-AU", {
				minimumFractionDigits: fraction,
				maximumFractionDigits: fraction,
			})
		);
	if (stock.currency === "CAD")
		return (
			"C$" +
			value.toLocaleString("en-CA", {
				minimumFractionDigits: fraction,
				maximumFractionDigits: fraction,
			})
		);
	if (stock.currency === "CHF")
		return (
			"CHF " +
			value.toLocaleString("de-CH", {
				minimumFractionDigits: fraction,
				maximumFractionDigits: fraction,
			})
		);
	return value.toFixed(fraction);
}

function formatTime(mins) {
	var h = Math.floor(mins / 60);
	var m = mins % 60;
	var ampm = (h >= 12 && h < 24) ? "PM" : "AM";
	h = h % 12 || 12;
	return (
		h.toString().padStart(2, "0") +
		":" +
		m.toString().padStart(2, "0") +
		" " +
		ampm
	);
}

function escapeHtmlGlobal(unsafe) {
    return (unsafe || "").toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}


// ==================== AUDIO SYSTEM ====================
var audioCtx = null;
function initAudio() {
	if (!audioCtx) {
		try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { console.error(e); }
	}
	if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
document.addEventListener('click', initAudio, { once: true });

function playSound(type) {
	if (!audioCtx) return;
	if (audioCtx.state === 'suspended') audioCtx.resume();
	try {
		var osc = audioCtx.createOscillator();
		var gain = audioCtx.createGain();
		osc.connect(gain);
		gain.connect(audioCtx.destination);
		
		var now = audioCtx.currentTime;
		if (type === 'success') {
			osc.type = 'sine';
			osc.frequency.setValueAtTime(800, now);
			osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
			gain.gain.setValueAtTime(0.1, now);
			gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
			osc.start(now); osc.stop(now + 0.1);
		} else if (type === 'error') {
			osc.type = 'sawtooth';
			osc.frequency.setValueAtTime(150, now);
			osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
			gain.gain.setValueAtTime(0.1, now);
			gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
			osc.start(now); osc.stop(now + 0.2);
		} else if (type === 'bell') {
			osc.type = 'triangle';
			osc.frequency.setValueAtTime(440, now);
			gain.gain.setValueAtTime(0.2, now);
			gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
			osc.start(now); osc.stop(now + 0.5);
		}
	} catch (e) { console.error(e); }
};

function toast(title, msg, type) {
	type = type || "info";
	var container = document.getElementById("toast-container");
	// Bug #27 fix: cap toast count to prevent DOM bloat during fast simulation
	if (container && container.children.length >= 10) {
		container.removeChild(container.firstChild);
	}
	var el = document.createElement("div");
	el.className = "toast " + type;
	el.innerHTML =
		'<span class="toast-title">' +
		escapeHtmlGlobal(title) +
		'</span><span class="toast-msg">' +
		escapeHtmlGlobal(msg) +
		"</span>";
	container.appendChild(el);
	setTimeout(function () {
		el.style.opacity = "0";
		el.style.transform = "translateY(10px)";
		el.style.transition = "0.2s";
		setTimeout(function () {
			el.remove();
		}, 200);
	}, 3000);
}

function calcSMA(prices, period) {
	// Bug #26 & #14 fix: O(n) sliding window, and return null for incomplete initial window
	var sma = [];
	var windowSum = 0;
	for (var i = 0; i < prices.length; i++) {
		windowSum += prices[i];
		if (i >= period) windowSum -= prices[i - period];
		if (i < period - 1) {
			sma.push(null);
		} else {
			sma.push(windowSum / period);
		}
	}
	return sma;
}

function calcEMA(prices, period) {
	var ema = [];
	var emaVal = 0;
	for (var i = 0; i < prices.length; i++) {
		if (i === 0) {
			emaVal = prices[0];
			ema.push(emaVal);
		} else {
			var currentPeriod = Math.min(i + 1, period);
			var dynK = 2 / (currentPeriod + 1);
			emaVal = prices[i] * dynK + emaVal * (1 - dynK);
			ema.push(emaVal);
		}
	}
	return ema;
}

// ==================== BOLLINGER BANDS (20, 2) ====================
function calcBollingerBands(prices, period, multiplier) {
	period = period || 20;
	multiplier = multiplier || 2;
	var upper = [], lower = [], middle = [];
	var sum = 0, sumSq = 0;
	// Bug #14 & #26 fix: use O(n) sliding window for BB and return null for incomplete windows
	for (var i = 0; i < prices.length; i++) {
		sum += prices[i];
		sumSq += prices[i] * prices[i];
		if (i >= period) {
			sum -= prices[i - period];
			sumSq -= prices[i - period] * prices[i - period];
		}
		if (i < period - 1) {
			middle.push(null);
			upper.push(null);
			lower.push(null);
		} else {
			var mean = sum / period;
			// variance = E[X^2] - (E[X])^2
			var variance = (sumSq / period) - (mean * mean);
			// floating point errors can make variance slightly negative
			var stdDev = Math.sqrt(Math.max(0, variance));
			middle.push(mean);
			upper.push(mean + multiplier * stdDev);
			lower.push(mean - multiplier * stdDev);
		}
	}
	return { upper: upper, middle: middle, lower: lower };
}

// ==================== VWAP ====================
// Approximates VWAP using close prices and simulated volumes
function calcVWAP(closes, volumes) {
	var vwap = [];
	var cumPV = 0, cumVol = 0;
	for (var i = 0; i < closes.length; i++) {
		var vol = (volumes && volumes[i]) ? volumes[i] : 1;
		cumPV += closes[i] * vol;
		cumVol += vol;
		vwap.push(cumVol > 0 ? cumPV / cumVol : closes[i]);
	}
	return vwap;
}

// ==================== RSI (14) ====================
function calcRSI(prices, period) {
	period = period || 14;
	var rsi = [];
	if (prices.length < period + 1) {
		return Array(prices.length).fill(null);
	}
	var gains = 0, losses = 0;
	for (var i = 1; i <= period; i++) {
		var diff = prices[i] - prices[i - 1];
		if (diff > 0) gains += diff; else losses -= diff;
	}
	var avgGain = gains / period;
	var avgLoss = losses / period;
	for (var i2 = 0; i2 < period; i2++) rsi.push(null);
	var firstRs = avgLoss === 0 ? null : avgGain / avgLoss;
	rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + firstRs));
	for (var i3 = period + 1; i3 < prices.length; i3++) {
		var d = prices[i3] - prices[i3 - 1];
		var g = d > 0 ? d : 0;
		var l = d < 0 ? -d : 0;
		avgGain = (avgGain * (period - 1) + g) / period;
		avgLoss = (avgLoss * (period - 1) + l) / period;
		var rs = avgLoss === 0 ? null : avgGain / avgLoss;
		rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + rs));
	}
	return rsi;
}

// ==================== MACD (12, 26, 9) ====================
function calcMACD(prices, fast, slow, signal) {
	fast = fast || 12; slow = slow || 26; signal = signal || 9;
	var emaFast = calcEMA(prices, fast);
	var emaSlow = calcEMA(prices, slow);
	var macdLine = [], signalLine = [], histogram = [];
	for (var i = 0; i < prices.length; i++) {
		if (emaFast[i] === null || emaSlow[i] === null) {
			macdLine.push(null);
		} else {
			macdLine.push(emaFast[i] - emaSlow[i]);
		}
	}
	// Signal = EMA(9) of MACD
	var validMacd = macdLine.filter(function(v) { return v !== null; });
	var sigFull = calcEMA(validMacd, signal);
	var validIdx = 0;
	for (var i2 = 0; i2 < macdLine.length; i2++) {
		if (macdLine[i2] === null) {
			signalLine.push(null);
			histogram.push(null);
		} else {
			var sig = sigFull[validIdx++];
			signalLine.push(sig === null ? null : sig);
			histogram.push(sig === null ? null : macdLine[i2] - sig);
		}
	}
	return { macdLine: macdLine, signalLine: signalLine, histogram: histogram };
}

// ==================== DALAL BANK ====================
function initBankUI() {
	var amtInput = document.getElementById("loan-amount");
	var termInput = document.getElementById("loan-term");

	if (amtInput) amtInput.addEventListener("input", updateLoanQuote);
	if (termInput) termInput.addEventListener("change", updateLoanQuote);
	var btnTake = document.getElementById("btn-take-loan");
	if (btnTake) btnTake.addEventListener("click", takeLoan);

	var fdAmtInput = document.getElementById("fd-amount");
	var fdTermInput = document.getElementById("fd-term");
	if (fdAmtInput) fdAmtInput.addEventListener("input", updateFdQuote);
	if (fdTermInput) fdTermInput.addEventListener("change", updateFdQuote);
	var btnOpenFd = document.getElementById("btn-open-fd");
	if (btnOpenFd) btnOpenFd.addEventListener("click", openFixedDeposit);
}

function getInterestRate(cibil, days) {
	var baseRate;
	if (cibil >= 850) baseRate = 4;
	else if (cibil >= 800) baseRate = 6;
	else if (cibil >= 750) baseRate = 8.5;
	else if (cibil >= 700) baseRate = 12;
	else if (cibil >= 600) baseRate = 18;
	else baseRate = 24;

	var termPenalty = 0;
	if (days >= 14) termPenalty = 10;
	else if (days >= 7) termPenalty = 5;
	else if (days >= 5) termPenalty = 3;
	else if (days >= 3) termPenalty = 1;

	return baseRate + termPenalty;
}

function getMaxLoanAmount() {
	// Use cash + real equity only, NOT DALAL stock (to prevent pump exploit)
	var equityVal = 0;
	Object.keys(state.positions).forEach(function (ticker) {
		if (ticker === "DALAL") return; // Exclude DALAL from collateral
		var pos = state.positions[ticker];
		var stk = marketStocks.find(function (s) {
			return s.ticker === ticker;
		});
		if (stk && pos.qty > 0) {
			equityVal += pos.qty * stk.ltp * (EXCHANGE_RATES[stk.currency] || 1);
		}
	});
	
	var currentDebt = 0;
	if (state.loans) {
		state.loans.forEach(function (l) {
			currentDebt += l.principal;
		});
	}
	
	// Subtract current debt to prevent infinite leverage glitch
	var netWorth = Math.max(0, (state.margin + equityVal) - currentDebt);
	var factor = 0.5;
	if (state.cibilScore >= 800) factor = 3;
	else if (state.cibilScore >= 750) factor = 2;
	else if (state.cibilScore >= 700) factor = 1;
	else if (state.cibilScore >= 600) factor = 0.7;

	// No hard cap, based purely on netWorth and factor
	return Math.max(50000, netWorth * factor);
}

function updateLoanQuote() {
	var amt = parseFloat(document.getElementById("loan-amount").value) || 0;
	var days = Math.max(1, parseInt(document.getElementById("loan-term").value, 10) || 1);
	var rate = getInterestRate(state.cibilScore, days);

	document.getElementById("loan-rate").textContent = rate + "% APR";

	if (amt >= 1000) {
		var totalInterest = ((amt * (rate / 100)) / 365) * days;
		var totalRepayment = amt + totalInterest;
		var dailyEmi = totalRepayment / days;
		document.getElementById("loan-emi").textContent = fmtCur(dailyEmi);
	} else {
		document.getElementById("loan-emi").textContent = "₹ 0.00";
	}
}

function takeLoan() {
	var amt = parseFloat(document.getElementById("loan-amount").value) || 0;
	var days = Math.max(1, parseInt(document.getElementById("loan-term").value, 10) || 1);

	if (state.loans.length >= 3) {
		toast("Loan Rejected", "You can only have up to 3 active loans.", "error");
		return;
	}

	var currentDebt = 0;
	if (state.loans)
		state.loans.forEach(function (l) {
			currentDebt += l.principal;
		});
	var maxAmt = getMaxLoanAmount();
	if (currentDebt + amt > maxAmt) {
		toast(
			"Loan Rejected",
			"Your CIBIL score and net worth only allow a maximum total debt of " +
				fmtCur(maxAmt),
			"error",
		);
		return;
	}

	if (amt < 1000) {
		toast("Loan Rejected", "Minimum loan amount is ₹ 1,000.", "error");
		return;
	}
	if (state.cibilScore < 500) {
		toast(
			"Loan Rejected",
			"CIBIL Score too low. Improve your credit first.",
			"error",
		);
		return;
	}

	var rate = getInterestRate(state.cibilScore, days);
	var totalInterest = ((amt * (rate / 100)) / 365) * days;
	var dailyEmi = (amt + totalInterest) / days;

	var loan = {
		id: state.nextLoanId++,
		principal: amt,
		totalInterest: totalInterest,
		emi: dailyEmi,
		daysTotal: days,
		daysLeft: days,
	};

	state.loans.push(loan);
	state.margin += amt;

	state.cibilScore = Math.max(300, state.cibilScore - 5); // small hit for applying
	toast(
		"Loan Approved",
		"₹ " +
			amt.toLocaleString("en-IN") +
			" disbursed to your account. CIBIL score hit.",
		"success",
	);

	renderTopBar();
	updateBankUI();
}

function getFdInterestRate(days) {
	if (days >= 15) return 12.5;
	if (days >= 10) return 10.0;
	return 7.5; // 5 days
}

function updateFdQuote() {
	var amt = parseFloat(document.getElementById("fd-amount").value) || 0;
	var days = Math.max(1, parseInt(document.getElementById("fd-term").value, 10) || 7);
	var rate = getFdInterestRate(days);

	document.getElementById("fd-rate").textContent = rate.toFixed(1) + "% APR";

	if (amt > 0) {
		var interest = ((amt * (rate / 100)) / 365) * days;
		document.getElementById("fd-maturity").textContent = fmtCur(amt + interest);
	} else {
		document.getElementById("fd-maturity").textContent = "₹ 0.00";
	}
}

function openFixedDeposit() {
	var amt = parseFloat(document.getElementById("fd-amount").value) || 0;
	var days = Math.max(1, parseInt(document.getElementById("fd-term").value, 10) || 7);

	if (amt < 1000) {
		toast("FD Rejected", "Minimum deposit is ₹ 1,000.", "error");
		return;
	}
	if (state.margin < amt) {
		toast("FD Rejected", "Insufficient cash balance.", "error");
		return;
	}

	var rate = getFdInterestRate(days);
	var interest = ((amt * (rate / 100)) / 365) * days;

	var dalalStock = marketStocks.find(function (s) {
		return s.ticker === "DALAL";
	});
	if (dalalStock) {
		var equityIncrease = amt * 0.01; // Bank generates 1% equity value from the deposit
		var priceIncrease = equityIncrease / dalalStock.shares;
		dalalStock.ltp = parseFloat((dalalStock.ltp + priceIncrease).toFixed(4));
	}
	var fd = {
		id: state.nextFdId++,
		principal: amt,
		interest: interest,
		daysTotal: days,
		daysLeft: days,
	};

	state.margin -= amt;
	state.fixedDeposits.push(fd);

	document.getElementById("fd-amount").value = "";
	updateFdQuote();

	toast(
		"FD Created",
		"₹ " + amt.toLocaleString("en-IN") + " locked for " + days + " days.",
		"success",
	);

	renderTopBar();
	updateBankUI();
}

function breakFixedDeposit(id) {
	var fdIndex = state.fixedDeposits.findIndex(function (f) {
		return f.id === id;
	});
	if (fdIndex === -1) return;

	var fd = state.fixedDeposits[fdIndex];
	state.fixedDeposits.splice(fdIndex, 1);

	// Apply a 2% early withdrawal penalty on principal; also forfeit accrued interest (penalty covers it)
	// Bug #28 fix: previously fd.interest was completely ignored. Now we calculate accrued interest
	// for days elapsed and include it in the refund, then deduct the 2% penalty.
	var elapsedDays = fd.daysTotal - fd.daysLeft;
	var accruedInterest = fd.daysTotal > 0 ? (fd.interest || 0) * (elapsedDays / fd.daysTotal) : 0;
	var penalty = (fd.principal + accruedInterest) * 0.02;
	var refund = fd.principal + accruedInterest - penalty;
	state.margin += refund;

	var dalalStock = marketStocks.find(function (s) {
		return s.ticker === "DALAL";
	});
	if (dalalStock) {
		// Bank profits off the penalty! Increases Dalal Stock!
		var equityIncrease = penalty; 
		var priceIncrease = equityIncrease / dalalStock.shares;
		dalalStock.ltp = parseFloat((dalalStock.ltp + priceIncrease).toFixed(4));
	}

	toast(
		"FD Broken Early",
		"FD #" +
			fd.id +
			" broken. " +
			fmtCur(refund) +
			" refunded (2% penalty applied).",
		"warning",
	);

	renderTopBar();
	updateBankUI();
}

function updateBankUI() {
	var cibilEl = document.getElementById("cibil-score");
	if (!cibilEl) return;
	cibilEl.textContent = state.cibilScore;

	var statusEl = document.getElementById("cibil-status");
	if (state.cibilScore >= 800) {
		statusEl.textContent = "Excellent";
		statusEl.style.color = "var(--green)";
	} else if (state.cibilScore >= 700) {
		statusEl.textContent = "Good";
		statusEl.style.color = "#2962ff";
	} else if (state.cibilScore >= 600) {
		statusEl.textContent = "Average";
		statusEl.style.color = "var(--orange)";
	} else {
		statusEl.textContent = "Poor";
		statusEl.style.color = "var(--red)";
	}

	var pct = (state.cibilScore - 300) / 600;
	pct = Math.max(0, Math.min(1, pct));
	var offset = 283 - pct * 283;
	var prog = document.getElementById("cibil-progress");
	prog.style.strokeDashoffset = offset;
	prog.style.stroke = statusEl.style.color;

	updateLoanQuote();

	var tbody = document.getElementById("bank-loans-tbody");
	tbody.innerHTML = "";

	if (state.loans.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="6" class="empty">No active loans</td></tr>';
	} else {
		state.loans.forEach(function (l) {
			var tr = document.createElement("tr");
			var remainingPrincipal = (l.principal / l.daysTotal) * l.daysLeft;

			tr.innerHTML =
				"<td>#L" +
				l.id.toString().padStart(3, "0") +
				"</td>" +
				'<td class="r mono">' +
				fmtCur(remainingPrincipal) +
				"</td>" +
				'<td class="r mono">' +
				fmtCur(l.totalInterest) +
				"</td>" +
				'<td class="r mono">' +
				fmtCur(l.emi) +
				"</td>" +
				'<td class="r">' +
				l.daysLeft +
				" Days</td>" +
				'<td class="r"><button class="btn-sm" style="background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;cursor:pointer;" onclick="forecloseLoan(' +
				l.id +
				')">Foreclose</button></td>';
			tbody.appendChild(tr);
		});
	}
	var elMax = document.getElementById("loan-max-eligibility");
	if (elMax) elMax.textContent = "Max: " + fmtCur(getMaxLoanAmount());

	var hbody = document.getElementById("bank-history-tbody");
	if (hbody) {
		hbody.innerHTML = "";
		if (!state.loanHistory || state.loanHistory.length === 0) {
			hbody.innerHTML =
				'<tr><td colspan="5" class="empty">No credit history</td></tr>';
		} else {
			var historyRev = state.loanHistory.slice().reverse();
			historyRev.forEach(function (l) {
				var tr = document.createElement("tr");
				tr.innerHTML =
					"<td>#L" +
					l.id.toString().padStart(3, "0") +
					"</td>" +
					'<td class="r mono">' +
					fmtCur(l.principal) +
					"</td>" +
					'<td class="r">' +
					l.daysTotal +
					" Days</td>" +
					'<td class="r">Day ' +
					(l.closingDay || "?") +
					"</td>" +
					'<td class="r" style="color:' +
					(l.status.includes("Force") || l.status.includes("Default")
						? "var(--red)"
						: "var(--green)") +
					'">' +
					l.status +
					"</td>";
				hbody.appendChild(tr);
			});
		}
	}

	updateFdQuote();
	var fdMaxEl = document.getElementById("fd-max-balance");
	if (fdMaxEl) fdMaxEl.textContent = "Avail: " + fmtCur(state.margin);

	var fdBody = document.getElementById("bank-fds-tbody");
	if (fdBody) {
		fdBody.innerHTML = "";
		if (!state.fixedDeposits || state.fixedDeposits.length === 0) {
			fdBody.innerHTML =
				'<tr><td colspan="5" class="empty">No active deposits</td></tr>';
		} else {
			state.fixedDeposits.forEach(function (fd) {
				var tr = document.createElement("tr");
				tr.innerHTML =
					"<td>#FD" +
					fd.id.toString().padStart(3, "0") +
					"</td>" +
					'<td class="r mono">' +
					fmtCur(fd.principal) +
					"</td>" +
					'<td class="r mono">' +
					fmtCur(fd.interest) +
					"</td>" +
					'<td class="r">' +
					fd.daysLeft +
					" Days</td>" +
					'<td class="r"><button class="btn-sm" style="background:var(--bg-2);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;cursor:pointer;" onclick="breakFixedDeposit(' +
					fd.id +
					')">Break FD</button></td>';
				fdBody.appendChild(tr);
			});
		}
	}
}

function forecloseLoan(id) {
	var idx = state.loans.findIndex(function (l) {
		return l.id === id;
	});
	if (idx === -1) return;

	var l = state.loans[idx];
	// Bug #10 fix: straight-line principal amortization underestimates how much has been paid off
	// because each EMI includes interest. The actual remaining principal is lower than
	// principal * (daysLeft/daysTotal). Use total remaining EMI payments as a proxy for outstanding debt.
	var remainingPrincipal = l.emi * l.daysLeft;
	var penalty = remainingPrincipal * 0.02; // 2% foreclosure penalty
	var totalToPay = remainingPrincipal + penalty;

	if (
		!confirm(
			"Are you sure you want to foreclose this loan?\n\nRemaining Principal: " +
				fmtCur(remainingPrincipal) +
				"\n2% Foreclosure Penalty: " +
				fmtCur(penalty) +
				"\n\nTotal Deducted from Cash: " +
				fmtCur(totalToPay),
		)
	) {
		return;
	}

	if (state.margin < totalToPay) {
		toast(
			"Foreclosure Failed",
			"Insufficient margin to pay " +
				fmtCur(totalToPay) +
				" (includes 2% penalty).",
			"error",
		);
		return;
	}

	state.margin -= totalToPay;
	state.loans.splice(idx, 1);

	var daysPaid = l.daysTotal - l.daysLeft;
	var boost = 5 + Math.floor(35 * (daysPaid / l.daysTotal));
	state.cibilScore = Math.min(900, state.cibilScore + boost);

	state.loanHistory.push(
		Object.assign({}, l, { status: "Foreclosed", closingDay: state.day }),
	);

	toast(
		"Loan Foreclosed",
		"Paid " + fmtCur(totalToPay) + " to settle loan early.",
		"success",
	);
	renderTopBar();
	updateBankUI();
}

// ==================== REAL ESTATE ====================

function updateRealEstateUI() {
	var marketTbody = document.getElementById("re-market-tbody");
	var ownedTbody = document.getElementById("re-owned-tbody");

	if (marketTbody) {
		marketTbody.innerHTML = "";
		state.propertyMarket.forEach(function (prop) {
			var owned = state.realEstate.find(function (p) {
				return p.marketId === prop.id;
			});
			if (owned) return; // Don't show owned properties in market

			var dailyRent = (prop.price * (prop.yieldApr / 100)) / 365;

			var loanAmount = prop.price * 0.8;
			var rate = 4.0;
			if (state.cibilScore < 750) rate = 6.0;
			if (state.cibilScore < 700) rate = 8.0;
			var estimatedEmi = (loanAmount + loanAmount * (rate / 100)) / 14;

			var tr = document.createElement("tr");
			tr.innerHTML =
				"<td><strong>" +
				prop.name +
				'</strong><br><small style="color:var(--text-dim)">' +
				prop.type +
				"</small></td>" +
				'<td class="r mono">' +
				fmtCur(prop.price) +
				"</td>" +
				'<td class="r mono" style="color:var(--green)">+' +
				fmtCur(dailyRent) +
				"</td>" +
				'<td class="r mono">20% Down<br><small>' +
				fmtCur(prop.price * 0.2) +
				"<br>EMI: ~" +
				fmtCur(estimatedEmi) +
				"/d</small></td>" +
				'<td class="r">' +
				'<button class="uiverse-btn btn-buy-cash" onclick="buyProperty(\'' +
				prop.id +
				'\', false)"><div class="button-outer"><div class="button-inner"><span>Buy Cash</span></div></div></button>' +
				'<button class="uiverse-btn btn-mortgage" onclick="buyProperty(\'' +
				prop.id +
				'\', true)"><div class="button-outer"><div class="button-inner"><span>Mortgage</span></div></div></button>' +
				"</td>";
			marketTbody.appendChild(tr);
		});
		if (marketTbody.innerHTML === "") {
			marketTbody.innerHTML =
				'<tr><td colspan="5" class="empty">No properties available on the market.</td></tr>';
		}
	}

	if (ownedTbody) {
		ownedTbody.innerHTML = "";
		if (state.realEstate.length === 0) {
			ownedTbody.innerHTML =
				'<tr><td colspan="5" class="empty">You do not own any properties.</td></tr>';
		} else {
			state.realEstate.forEach(function (prop) {
				var dailyRent = (prop.marketPrice * (prop.yieldApr / 100)) / 365;
				var mortgage = (state.mortgages || []).find(function (m) {
					return m.propId === prop.id;
				});
				var debtToClear = mortgage
					? (mortgage.principal / mortgage.daysTotal) * mortgage.daysLeft
					: 0;
				var debtStr = mortgage
					? fmtCur(debtToClear) +
						"<br><small>EMI: " +
						fmtCur(mortgage.emi) +
						"/d</small>"
					: '<span style="color:var(--text-dim)">Fully Owned</span>';

				var tr = document.createElement("tr");
				tr.innerHTML =
					"<td><strong>" +
					prop.name +
					'</strong><br><small style="color:var(--text-dim)">' +
					prop.type +
					"</small></td>" +
					'<td class="r mono">' +
					fmtCur(prop.marketPrice) +
					'<br><small class="' +
					(prop.marketPrice >= prop.purchasePrice ? "up" : "dn") +
					'">' +
					((prop.marketPrice / prop.purchasePrice - 1) * 100).toFixed(2) +
					"%</small></td>" +
					'<td class="r mono" style="color:var(--green)">+' +
					fmtCur(dailyRent) +
					"</td>" +
					'<td class="r mono">' +
					debtStr +
					"</td>" +
					'<td class="r">' +
					(mortgage
						? '<button class="btn-sm" style="background:var(--bg-2);border:1px solid var(--orange);color:var(--orange);padding:4px 8px;border-radius:4px;cursor:pointer;margin-right:5px;" onclick="payOffMortgage(' +
							prop.id +
							')">Pay Off</button>'
						: "") +
					'<button class="btn-sm" style="background:var(--bg-2);border:1px solid var(--red);color:var(--red);padding:4px 8px;border-radius:4px;cursor:pointer;" onclick="sellProperty(' +
					prop.id +
					')">Sell Property</button></td>';
				ownedTbody.appendChild(tr);
			});
		}
	}

	var newsContainer = document.getElementById("re-news-container");
	if (newsContainer && state.reNews) {
		if (state.reNews.length === 0) {
			newsContainer.innerHTML =
				'<div style="color:var(--text-dim); font-size:12px; text-align:center; padding: 20px;">Waiting for market events...</div>';
		} else {
			newsContainer.innerHTML = "";
			state.reNews.forEach(function (item) {
				var icon =
					item.type === "bull"
						? '<i class="fa-solid fa-arrow-trend-up" style="color:var(--green)"></i>'
						: '<i class="fa-solid fa-arrow-trend-down" style="color:var(--red)"></i>';
				var div = document.createElement("div");
				div.style =
					"background: rgba(0,0,0,0.2); padding: 10px; border-left: 3px solid " +
					(item.type === "bull" ? "var(--green)" : "var(--red)");
				div.innerHTML =
					'<div style="font-size:10px; color:var(--text-dim); margin-bottom:5px;">Day ' +
					item.day +
					"</div>" +
					'<div style="font-size:13px;">' +
					icon +
					" " +
					item.text +
					"</div>";
				newsContainer.appendChild(div);
			});
		}
	}
}

function buyProperty(marketId, useMortgage) {
	var marketProp = state.propertyMarket.find(function (p) {
		return p.id === marketId;
	});
	if (!marketProp) return;

	var price = marketProp.price;
	var downPayment = useMortgage ? price * 0.2 : price;
	var closingCost = price * 0.05; // 5% Closing Cost
	var totalCost = downPayment + closingCost;

	if (state.margin < totalCost) {
		toast(
			"Purchase Failed",
			"Insufficient funds for down payment + 5% closing cost. You need " +
				fmtCur(totalCost),
			"error",
		);
		return;
	}

	if (useMortgage && state.cibilScore < 650) {
		toast(
			"Mortgage Denied",
			"Your CIBIL score is too low for a mortgage. Minimum 650 required.",
			"error",
		);
		return;
	}

	var term = 14; // default 14 day mortgage
	var loanAmount = useMortgage ? price - downPayment : 0;

	var prop = {
		id: state.nextPropId++,
		marketId: marketProp.id,
		name: marketProp.name,
		type: marketProp.type,
		yieldApr: marketProp.yieldApr,
		purchasePrice: price,
		marketPrice: price,
	};

	state.margin -= totalCost;
	state.realEstate.push(prop);

	if (useMortgage) {
		var rate = 4.0; // base mortgage rate
		if (state.cibilScore < 750) rate = 6.0;
		if (state.cibilScore < 700) rate = 8.0;

		var totalInterest = ((loanAmount * (rate / 100)) / 365) * term;
		var emi = (loanAmount + totalInterest) / term;

		var mortgage = {
			id: state.nextLoanId++,
			propId: prop.id,
			principal: loanAmount,
			totalInterest: totalInterest,
			emi: emi,
			daysTotal: term,
			daysLeft: term,
		};
		state.mortgages = state.mortgages || [];
		state.mortgages.push(mortgage);
		state.cibilScore = Math.max(300, state.cibilScore - 10); // Hard pull
	}

	toast("Property Acquired", "You purchased " + prop.name + "!", "success");
	updateRealEstateUI();
	renderTopBar();
}

function sellProperty(propId) {
	var idx = state.realEstate.findIndex(function (p) {
		return p.id === propId;
	});
	if (idx === -1) return;
	var prop = state.realEstate[idx];

	state.mortgages = state.mortgages || [];
	var mortgageIdx = state.mortgages.findIndex(function (m) {
		return m.propId === prop.id;
	});
	var mortgage = mortgageIdx !== -1 ? state.mortgages[mortgageIdx] : null;

	var debtToClear = 0;
	if (mortgage) {
		// Bug #10b fix: use remaining EMI payments as outstanding debt (consistent with forecloseLoan)
		debtToClear = mortgage.emi ? mortgage.emi * mortgage.daysLeft : (mortgage.principal / mortgage.daysTotal) * mortgage.daysLeft;
	}

	var proceeds = prop.marketPrice - debtToClear;

	if (proceeds < 0) {
		toast(
			"Cannot Sell",
			"Your outstanding mortgage (" +
				fmtCur(debtToClear) +
				") exceeds the market value (" +
				fmtCur(prop.marketPrice) +
				"). Pay off some mortgage first.",
			"error",
		);
		return;
	}

	if (
		!confirm(
			"Are you sure you want to sell " +
				prop.name +
				" at market value?\n\nMarket Value: " +
				fmtCur(prop.marketPrice) +
				"\nMortgage Debt Cleared: " +
				fmtCur(debtToClear) +
				"\n\nNet Cash to You: " +
				fmtCur(proceeds),
		)
	) {
		return;
	}

	state.realEstate.splice(idx, 1);
	if (mortgageIdx !== -1) {
		state.mortgages.splice(mortgageIdx, 1);
		state.cibilScore = Math.min(900, state.cibilScore + 15); // Bonus for clearing mortgage
	}

	state.margin += proceeds;
	toast(
		"Property Sold",
		"Sold " + prop.name + " for net " + fmtCur(proceeds),
		"success",
	);

	updateRealEstateUI();
	renderTopBar();
}

function payOffMortgage(propId) {
	var mortgageIdx = state.mortgages.findIndex(function (m) {
		return m.propId === propId;
	});
	if (mortgageIdx === -1) return;

	var mortgage = state.mortgages[mortgageIdx];
	// Bug #10c fix: use remaining EMI payments as outstanding debt
	var debtToClear = mortgage.emi ? mortgage.emi * mortgage.daysLeft : (mortgage.principal / mortgage.daysTotal) * mortgage.daysLeft;

	if (state.margin < debtToClear) {
		toast(
			"Insufficient Funds",
			"You need " + fmtCur(debtToClear) + " to pay off this mortgage.",
			"error",
		);
		return;
	}

	if (
		!confirm(
			"Are you sure you want to pay off this mortgage early?\n\nDebt to Clear: " +
				fmtCur(debtToClear),
		)
	) {
		return;
	}

	state.margin -= debtToClear;
	state.mortgages.splice(mortgageIdx, 1);
	state.cibilScore = Math.min(900, state.cibilScore + 30); // Big bonus for paying off early!

	toast(
		"Mortgage Cleared",
		"Successfully paid off mortgage. Property is fully owned!",
		"success",
	);
	updateRealEstateUI();
	renderTopBar();
	updateBankUI();
}

const RE_NEWS_DB = [
	// Global & Macro Events
	{
		text: "Central Bank aggressively cuts interest rates! Mortgage applications surge 400%.",
		impact: 0.15,
		target: "ALL",
	},
	{
		text: "Recession fears loom! Global real estate market freezes as buyers vanish.",
		impact: -0.12,
		target: "ALL",
	},
	{
		text: "Inflation hits record highs! Investors pour cash into hard assets like real estate.",
		impact: 0.08,
		target: "ALL",
	},
	{
		text: "Global liquidity crunch: Banks tighten lending standards, crushing mortgage approvals.",
		impact: -0.1,
		target: "ALL",
	},
	{
		text: "Massive government stimulus packages announced! Real estate values soar globally.",
		impact: 0.12,
		target: "ALL",
	},
	{
		text: "Stock market crash triggers margin calls. Investors forced to liquidate real estate.",
		impact: -0.15,
		target: "ALL",
	},

	// Sector-wide Events: Residential
	{
		text: "Massive zoning deregulation allows new developments. Supply floods the market.",
		impact: -0.08,
		target: "Residential",
	},
	{
		text: "New global property tax hits residential homeowners hard.",
		impact: -0.05,
		target: "Residential",
	},
	{
		text: "Millennials enter prime homebuying age. Residential demand spikes to all-time highs.",
		impact: 0.1,
		target: "Residential",
	},
	{
		text: "Severe shortage of building materials halts new construction. Existing homes see a premium.",
		impact: 0.08,
		target: "Residential",
	},
	{
		text: "Remote work reversal: Companies mandate RTO, causing a massive sell-off in suburban housing.",
		impact: -0.1,
		target: "Residential",
	},
	{
		text: "Government introduces massive subsidies for first-time homebuyers.",
		impact: 0.12,
		target: "Residential",
	},

	// Sector-wide Events: Commercial
	{
		text: "Tech boom! Companies scramble for office space, driving up commercial rents.",
		impact: 0.1,
		target: "Commercial",
	},
	{
		text: "Work-From-Home becomes permanent for top firms. Office buildings empty out.",
		impact: -0.15,
		target: "Commercial",
	},
	{
		text: "E-commerce explosion! Demand for retail shops collapses globally.",
		impact: -0.12,
		target: "Commercial",
	},
	{
		text: "Retail renaissance! Consumers flock back to physical stores, reviving commercial real estate.",
		impact: 0.09,
		target: "Commercial",
	},
	{
		text: "Corporate tax hikes announced. Commercial property yields compress rapidly.",
		impact: -0.08,
		target: "Commercial",
	},
	{
		text: "Global supply chain stabilization leads to massive investments in industrial parks.",
		impact: 0.11,
		target: "Commercial",
	},

	// Sector-wide Events: Luxury
	{
		text: "Billionaire tax introduced. Luxury properties see mass sell-off.",
		impact: -0.1,
		target: "Luxury",
	},
	{
		text: "Foreign investment surges in the luxury market. Mansions selling over asking price!",
		impact: 0.12,
		target: "Luxury",
	},
	{
		text: "Crypto billionaires cash out and dump profits into luxury real estate.",
		impact: 0.15,
		target: "Luxury",
	},
	{
		text: "Crackdown on offshore shell companies freezes luxury market transactions.",
		impact: -0.14,
		target: "Luxury",
	},
	{
		text: "Ultra-high net worth individuals flee volatile equity markets for safe-haven luxury estates.",
		impact: 0.09,
		target: "Luxury",
	},

	// Specific Property Events
	{
		text: "Major tech giant announces new headquarters in Bangalore! Local property values skyrocket.",
		impact: 0.25,
		target: "prop2",
	}, // 3BHK Villa, Bangalore
	{
		text: "Severe flooding damages coastal properties. Malibu real estate takes a hit.",
		impact: -0.2,
		target: "prop11",
	}, // Malibu
	{
		text: "New underground Metro line connects directly to Downtown Tech Park!",
		impact: 0.18,
		target: "prop5",
	}, // Downtown Tech Park
	{
		text: "Tourism boom in Maldives! Private islands are in extreme demand.",
		impact: 0.22,
		target: "prop6",
	}, // Maldives
	{
		text: "Casino regulations tightened. Macau resorts suffer a massive blow to valuations.",
		impact: -0.3,
		target: "prop18",
	}, // Macau
	{
		text: "Global supply chain crisis! German industrial warehouses are completely full.",
		impact: 0.15,
		target: "prop17",
	}, // Germany Warehouse
	{
		text: "Historic preservation grant awarded to French Chateaus. Value increases.",
		impact: 0.1,
		target: "prop15",
	}, // French Chateau
	{
		text: "Major earthquake rattles Tokyo. Safety concerns cause residential prices to dip.",
		impact: -0.18,
		target: "prop7",
	}, // Tokyo Condo
	{
		text: "Oil prices surge! Texas economy booms, driving massive demand for suburban homes.",
		impact: 0.2,
		target: "prop8",
	}, // Texas Home
	{
		text: "Toronto enacts strict foreign buyer ban. High-rise condo market crashes.",
		impact: -0.25,
		target: "prop9",
	}, // Toronto Condo
	{
		text: "Brexit uncertainties cleared. London townhouse prices surge.",
		impact: 0.15,
		target: "prop10",
	}, // London Townhouse
	{
		text: "Record-breaking snowfall boosts ski tourism. Swiss Chalet values peak.",
		impact: 0.18,
		target: "prop12",
	}, // Swiss Alps
	{
		text: "New York City introduces aggressive rent control laws. Luxury penthouses take a hit.",
		impact: -0.15,
		target: "prop13",
	}, // NYC Penthouse
	{
		text: "Dubai announces zero-tax residency for global elites. Palm Jumeirah villas double in demand.",
		impact: 0.3,
		target: "prop14",
	}, // Dubai Villa
	{
		text: "Pro-democracy protests in Hong Kong disrupt business. Skyscrapers lose tenant value.",
		impact: -0.22,
		target: "prop16",
	}, // HK Skyscraper
	{
		text: "Singapore emerges as the new financial capital of Asia. Shopping malls see record foot traffic.",
		impact: 0.25,
		target: "prop19",
	}, // Singapore Mall
	{
		text: "AI revolution drives unprecedented demand for cloud infrastructure. Nevada Data Center value explodes!",
		impact: 0.35,
		target: "prop20",
	}, // Nevada Data Center
	{
		text: "Paris hosts the Olympics! Boutique hotels are fully booked for years, driving up valuations.",
		impact: 0.28,
		target: "prop21",
	}, // Paris Hotel
	{
		text: "International student visas capped in Australia. Melbourne student housing market collapses.",
		impact: -0.28,
		target: "prop22",
	}, // Melbourne Housing
	{
		text: "Europe's energy crisis impacts logistics. Rotterdam hub operations severely slowed.",
		impact: -0.15,
		target: "prop23",
	}, // Rotterdam Hub
	{
		text: "Startup funding dries up. Berlin coworking spaces are forced to slash rents.",
		impact: -0.2,
		target: "prop24",
	}, // Berlin Coworking
	{
		text: "Vintage wine boom! Tuscan farmhouses with vineyards see immense buyer interest.",
		impact: 0.18,
		target: "prop25",
	}, // Tuscany Farmhouse
	{
		text: "New ultra-efficient living trends make Hong Kong micro-apartments the hottest asset.",
		impact: 0.15,
		target: "prop26",
	}, // HK Micro
	{
		text: "Monaco yacht show attracts billionaires globally. Berth values jump 20%.",
		impact: 0.2,
		target: "prop27",
	}, // Monaco Berth
	{
		text: "Eco-tourism surges in Africa. Kenyan Safari Lodges become prime investment targets.",
		impact: 0.25,
		target: "prop28",
	}, // Kenya Lodge
	{
		text: "Wildfires threaten Napa Valley. California vineyard estates suffer massive insurance hikes and value drops.",
		impact: -0.3,
		target: "prop29",
	}, // California Vineyard
	{
		text: "Breakthrough biotech research funded. Boston Medical Complex becomes the most valuable commercial asset.",
		impact: 0.35,
		target: "prop30",
	}, // Boston Medical
	{
		text: "Monsoon floods submerge coastal roads in Mumbai. Apartment valuations take a dive.",
		impact: -0.12,
		target: "prop1",
	}, // Mumbai 1BHK
	{
		text: "Retail apocalypse! Commercial retail shops face massive wave of bankruptcies.",
		impact: -0.25,
		target: "prop4",
	}, // Retail Shop
];

function generateRealEstateNews() {
	state.reNews = state.reNews || [];

	// 50% chance of a news event per day so it's more frequent
	if (pcg.random() > 0.5) return { impact: 0, target: "NONE" };

	var event = RE_NEWS_DB[Math.floor(pcg.random() * RE_NEWS_DB.length)];

	var newsItem = {
		day: state.day,
		text: event.text,
		type: event.impact > 0 ? "bull" : "bear",
	};

	state.reNews.unshift(newsItem);
	if (state.reNews.length > 20) state.reNews.pop(); // keep last 20

	return event;
}

//Analytics
function toggleAnalyticsView() {
	var chartEl = document.querySelector(".chart-container");
	var newsEl = document.querySelector(".news-panel");
	var analyticsEl = document.getElementById("analytics-panel");
	var btn = document.getElementById("btn-toggle-analytics");

	if (analyticsEl.classList.contains("hidden")) {
		// Show analytics
		chartEl.classList.add("hidden");
		newsEl.classList.add("hidden");
		analyticsEl.classList.remove("hidden");
		btn.classList.add("active");
		if (typeof renderAnalytics === 'function') renderAnalytics();
	} else {
		// Show chart
		chartEl.classList.remove("hidden");
		newsEl.classList.remove("hidden");
		analyticsEl.classList.add("hidden");
		btn.classList.remove("active");
	}
}
// ==================== MOBILE RESPONSIVENESS LOGIC ====================
(function initMobileUI() {
    var mobileMenuBtn = document.getElementById('mobile-menu-btn');
    var sidebarLeft = document.querySelector('.watchlist-panel');
    var mobileBuyBtn = document.getElementById('mobile-buy-btn');
    var mobileSellBtn = document.getElementById('mobile-sell-btn');
    var sidebarRight = document.querySelector('.order-panel');
    var orderTypeSelect = document.getElementById('order-type');
    var orderQtyInput = document.getElementById('order-qty');

    // Toggle Left Sidebar (Watchlist)

    const mobileWlClose = document.getElementById('mobile-wl-close');
    if (mobileWlClose) {
        mobileWlClose.addEventListener('click', function() {
            sidebarLeft.classList.remove('mobile-open');
        });
    }
    const mobileOrderClose = document.getElementById('mobile-order-close');
    if (mobileOrderClose) {
        mobileOrderClose.addEventListener('click', function() {
            sidebarRight.classList.remove('sheet-open');
        });
    }

    if (mobileMenuBtn && sidebarLeft) {
        mobileMenuBtn.addEventListener('click', function() {
            sidebarLeft.classList.toggle('mobile-open');
        });
    }

    // Close Left Sidebar when a stock is clicked in the watchlist
    var wlBody = document.getElementById('watchlist');
    if (wlBody && sidebarLeft) {
        wlBody.addEventListener('click', function(e) {
            if (e.target.closest('.wl-row')) {
                sidebarLeft.classList.remove('mobile-open');
            }
        });
    }

    // Toggle Right Sidebar (Order Entry) via Buy Button
    if (mobileBuyBtn && sidebarRight) {
        mobileBuyBtn.addEventListener('click', function() {
            sidebarRight.classList.add('sheet-open');
            document.querySelectorAll('.order-action-btn').forEach(function (b) { b.classList.remove('active'); });
            var buyActionBtn = document.getElementById('btn-order-buy') || document.getElementById('btn-buy');
            if (buyActionBtn) buyActionBtn.classList.add('active');
            orderQtyInput && orderQtyInput.focus();
        });
    }

    // Toggle Right Sidebar (Order Entry) via Sell Button
    if (mobileSellBtn && sidebarRight) {
        mobileSellBtn.addEventListener('click', function() {
            sidebarRight.classList.add('sheet-open');
            document.querySelectorAll('.order-action-btn').forEach(function (b) { b.classList.remove('active'); });
            var sellActionBtn = document.getElementById('btn-order-sell') || document.getElementById('btn-sell');
            if (sellActionBtn) sellActionBtn.classList.add('active');
            orderQtyInput && orderQtyInput.focus();
        });
    }

    // Close Right Sidebar (Order Entry) if clicking outside or on a close button
    // (We'll add a simple click outside listener on the app container)
    var appBody = document.querySelector('.app');
    if (appBody && sidebarRight) {
        appBody.addEventListener('click', function(e) {
            // Close order sheet if clicking outside of it, but not if clicking the buy/sell buttons
            if (sidebarRight.classList.contains('sheet-open') && 
                !sidebarRight.contains(e.target) && 
                !e.target.closest('#mobile-buy-btn') && 
                !e.target.closest('#mobile-sell-btn')) {
                sidebarRight.classList.remove('sheet-open');
            }
        });
    }
})();


function downloadChart() {
	var canvas = document.getElementById("main-chart");
	if(!canvas) return;
	// Create a white background canvas so it doesn't download transparent
	var tempCanvas = document.createElement("canvas");
	tempCanvas.width = canvas.width;
	tempCanvas.height = canvas.height;
	var ctx = tempCanvas.getContext("2d");
	ctx.fillStyle = state.theme === 'light' ? "#ffffff" : "#111111";
	ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
	ctx.drawImage(canvas, 0, 0);
	
	var url = tempCanvas.toDataURL("image/png");
	var a = document.createElement("a");
	a.href = url;
	a.download = (state.activeStock ? state.activeStock.ticker : "chart") + "_trade.png";
	a.click();
	toast("Screenshot Saved", "Chart exported to PNG", "success");
};

export { getFxRate, toggleMultiplayerView, EXCHANGE_RATES, INDEX_CONSTITUENTS, LOT_SIZES, buildPreOHLC, calcBollingerBands, calcEMA, calcMACD, calcPremium, calcRSI, calcSMA, closeOptionChain, executeOptionStrategy, fmtCur, fmtPrice, generateIPO, generateIndexPreHistory, generatePreHistory, generateStrikes, getDayFraction, getExpiryDays, isMarketOpen, marketStocks, openOptionChain, openSyndicateCrate, pcg, processEquityTrade, processOptionTrade, renderAll, renderChart, renderIPOs, renderSubChart, renderTopBar, selectStock, setChartLayout, showCrateReveal, state, stockMap, toast, toggleCustomizeView, updateOptionMargin, updateOrderMargin, subscribeIPO, executeChainTrade, previewOption, clearOptionPreview, setLimitPrice, closeEquityPosition, closeOptionPosition, cancelPendingOrder, forecloseLoan, breakFixedDeposit, buyProperty, payOffMortgage, sellProperty, stdNormCDF, stdNormPDF, renderOptionChain, getBidAsk, formatTime, calcVWAP, VIEW_LENGTHS, _applyChartData, calcPortfolioValue, candlestickPlugin, drawingPlugin, customTooltipHandler };
// Bug 2 fix: expose clock control so multiplayer.js can halt/resume the local interval
window.setClientTime = function(day, time) { state.day = day; state.time = time; };
window.renderAllFromClient = renderAll;
window._stopClientClockFn = function() {
    clearInterval(marketInterval);
    marketInterval = null;
    state.isRunning = false;
    // Grey out the play/pause controls to signal client-mode
    document.querySelectorAll(".ctrl-btn").forEach(function(b) {
        if (b.id !== "btn-theme" && b.id !== "btn-settings" && b.id !== "btn-multiplayer") b.classList.remove("on");
    });
    var freezeBtn = document.getElementById("btn-freeze");
    if (freezeBtn) freezeBtn.classList.add("on");
};
window._restartClockFn = function() {
    // Bug 1 fix: when a client disconnects, purge any pendingOrders that were
    // waiting for a host fill — the host is gone and will never respond, so
    // leaving them in the queue causes an infinite retry loop.
    if (state && state.pendingOrders) {
        state.pendingOrders = state.pendingOrders.filter(function(o) {
            return !o.pendingHostFill;
        });
    }
    state.isRunning = true;
    startClock();
};

// Bug 3 fix: expose EXCHANGE_RATES so multiplayer.js can perform post-fill
// margin checks using the same FX rates as the rest of the app.
window._EXCHANGE_RATES = EXCHANGE_RATES;

// Bug 4 fix: define _tickClientEngine so that MARKET_TICK messages from the
// host drive day-end overlays and investment ticks on the client, not just
// a raw time assignment via setClientTime.
window._tickClientEngine = function(day, time) {
    // If the host has advanced to a new day, trigger the day-end flow.
    if (day > state.day) {
        // Advance through any skipped days (host could jump multiple days).
        while (state.day < day) {
            // Run daily investment processing for each skipped day.
            try { processDailyInvestments(); } catch(e) { console.error('[client] processDailyInvestments error:', e); }
            state.day++;
        }
    }
    state.day = day;
    state.time = time;
};
