import { pcg, state } from './app.js';

// ==================== NEWS EVENTS (80+) ====================
var newsEvents = [
	// ---- MACRO / MARKET-WIDE ----
	{
		text: "NIFTY drops 100 pts on global sell-off. Bearish sentiment sweeps the market.",
		impact: -0.012,
		target: "ALL",
	},
	{
		text: "FII outflows continue for 5th consecutive session. Broad weakness across sectors.",
		impact: -0.01,
		target: "ALL",
	},
	{
		text: "Crude oil surges {val}%. Import-heavy sectors face headwinds.",
		impact: -0.015,
		target: "GLOBAL",
	},
	{
		text: "India GDP growth beats estimates at {val}%. Market rallies on optimism.",
		impact: 0.018,
		target: "ALL",
	},
	{
		text: "Rupee hits all-time low against USD. Import costs spike.",
		impact: -0.012,
		target: "ALL",
	},
	{
		text: "DII buying supports market amid FII selling. Mid-caps outperform.",
		impact: 0.008,
		target: "ALL",
	},
	{
		text: "Global rally: US Fed hints at rate cuts. Risk-on sentiment globally.",
		impact: 0.02,
		target: "GLOBAL",
	},
	{
		text: "US inflation data comes in higher than expected. Global sell-off.",
		impact: -0.018,
		target: "GLOBAL",
	},
	{
		text: "Geopolitical tensions in Middle East escalate. Oil prices spike.",
		impact: -0.014,
		target: "GLOBAL",
	},
	{
		text: "India-EU free trade agreement signed. Export sectors celebrate.",
		impact: 0.015,
		target: "ALL",
	},
	{
		text: "SEBI tightens margin rules. Speculative stocks under pressure.",
		impact: -0.008,
		target: "ALL",
	},
	{
		text: "Government announces surprise fiscal stimulus package worth 2L Cr.",
		impact: 0.025,
		target: "ALL",
	},
	{
		text: "China PMI data disappoints. Asian markets sell off.",
		impact: -0.01,
		target: "GLOBAL",
	},
	{
		text: "Japan BOJ surprises with rate hike. Carry trade unwind hits EM stocks.",
		impact: -0.02,
		target: "GLOBAL",
	},
	{
		text: "VIX spikes {val}%. Fear gauge signals extreme volatility ahead.",
		impact: -0.015,
		target: "GLOBAL",
	},

	// ---- BANKING ----
	{
		text: "RBI keeps repo rate unchanged at {val}%. Banks rally on status quo.",
		impact: 0.015,
		target: "BANK",
	},
	{
		text: "Interest rate hike fears rattle banking sector. NPA concerns surface.",
		impact: -0.018,
		target: "BANK",
	},
	{
		text: "RBI imposes restrictions on a mid-size private bank. Sector cautious.",
		impact: -0.012,
		target: "BANK",
	},
	{
		text: "Credit growth hits 18-month high. Banking sector upgrade by brokerages.",
		impact: 0.02,
		target: "BANK",
	},
	{
		text: "PSU bank recapitalization announced. Government injects 20K Cr.",
		impact: 0.025,
		target: "BANK",
	},
	{
		text: "HDFC Bank Q4 results: NII up {val}%, asset quality improves.",
		impact: 0.03,
		target: "HDFCBANK",
	},
	{
		text: "SBI reports highest-ever quarterly profit. Dividend announced.",
		impact: 0.028,
		target: "SBIN",
	},
	{
		text: "Kotak Bank receives RBI approval for new business vertical.",
		impact: 0.018,
		target: "KOTAKBANK",
	},
	{
		text: "Axis Bank completes acquisition of Citibank India retail business.",
		impact: 0.015,
		target: "AXISBANK",
	},
	{
		text: "Bajaj Finance AUM crosses 3 lakh crore milestone.",
		impact: 0.022,
		target: "BAJFINANCE",
	},

	// ---- IT ----
	{
		text: "New multi-billion dollar deal boosts IT sector confidence.",
		impact: 0.018,
		target: "IT",
	},
	{
		text: "Global tech rout weighs on Indian IT. NASDAQ down {val}%.",
		impact: -0.02,
		target: "IT",
	},
	{
		text: "TCS wins largest-ever deal worth $5B from US government.",
		impact: 0.035,
		target: "TCS",
	},
	{
		text: "Infosys raises FY guidance: revenue growth at 13-{val}%.",
		impact: 0.028,
		target: "INFY",
	},
	{
		text: "HCL Tech cloud revenue grows {val}%. Multi-year deal pipeline strong.",
		impact: 0.02,
		target: "HCLTECH",
	},
	{
		text: "Wipro CEO resigns unexpectedly. Leadership uncertainty rattles investors.",
		impact: -0.035,
		target: "WIPRO",
	},
	{
		text: "US H-1B visa restrictions tightened. IT stocks face headwinds.",
		impact: -0.018,
		target: "IT",
	},
	{
		text: "AI adoption drives cloud spending surge. Indian IT set to benefit.",
		impact: 0.015,
		target: "IT",
	},

	// ---- ENERGY / OIL ----
	{
		text: "OPEC cuts production by 2M barrels/day. Energy stocks surge.",
		impact: 0.02,
		target: "ENERGY",
	},
	{
		text: "Reliance new energy division secures 10GW solar contract.",
		impact: 0.03,
		target: "RELIANCE",
	},
	{
		text: "Reliance Jio subscriber base crosses 500 million mark.",
		impact: 0.025,
		target: "RELIANCE",
	},
	{
		text: "NTPC commissions India's largest floating solar plant.",
		impact: 0.02,
		target: "NTPC",
	},
	{
		text: "Power Grid wins 8 new transmission projects worth 12K Cr.",
		impact: 0.018,
		target: "POWERGRID",
	},
	{
		text: "India electricity demand hits record high. Power stocks surge.",
		impact: 0.022,
		target: "POWER",
	},

	// ---- INFRA ----
	{
		text: "Government announces capex boost. Infra spending up {val}% YoY.",
		impact: 0.02,
		target: "INFRA",
	},
	{
		text: "L&T bags mega order worth 25K Cr from Saudi Arabia.",
		impact: 0.03,
		target: "LT",
	},
	{
		text: "Adani group under fresh selling pressure. Hindenburg report follow-up.",
		impact: -0.04,
		target: "ADANIENT",
	},
	{
		text: "Adani Enterprises wins rights to develop 3 new airports.",
		impact: 0.03,
		target: "ADANIENT",
	},
	{
		text: "National Infrastructure Pipeline: 50 new projects worth 10L Cr announced.",
		impact: 0.025,
		target: "INFRA",
	},

	// ---- AUTO ----
	{
		text: "Auto sales surge {val}% MoM. Sector outperforms on festive demand.",
		impact: 0.025,
		target: "AUTO",
	},
	{
		text: "Maruti launches new EV platform. Electric SUV bookings cross 50K.",
		impact: 0.028,
		target: "MARUTI",
	},
	{
		text: "Tata Motors EV deliveries hit record high. 30K units in one month.",
		impact: 0.025,
		target: "TATAMOTORS",
	},
	{
		text: "Auto sector faces chip shortage again. Production cuts likely.",
		impact: -0.02,
		target: "AUTO",
	},
	{
		text: "GST on hybrid cars reduced from {val}% to {val}%. Auto rally.",
		impact: 0.022,
		target: "AUTO",
	},

	// ---- PHARMA ----
	{
		text: "USFDA approves new blockbuster drug from Sun Pharma. Pharma rally.",
		impact: 0.03,
		target: "PHARMA",
	},
	{
		text: "USFDA issues warning letter to Sun Pharma for Halol plant.",
		impact: -0.04,
		target: "SUNPHARMA",
	},
	{
		text: "Government announces price caps on key drugs. Pharma margins squeezed.",
		impact: -0.02,
		target: "PHARMA",
	},
	{
		text: "India becomes world's largest generic drug exporter. Pharma sector rallies.",
		impact: 0.02,
		target: "PHARMA",
	},

	// ---- METAL ----
	{
		text: "Steel demand rises on infra spending. Metal stocks gain on volume.",
		impact: 0.022,
		target: "METAL",
	},
	{
		text: "China demand recovery lifts metal prices globally. Steel exports up.",
		impact: 0.02,
		target: "METAL",
	},
	{
		text: "JSW Steel capacity expansion to 50 MTPA approved by board.",
		impact: 0.025,
		target: "JSWSTEEL",
	},
	{
		text: "Coal India production up {val}% in Q3. Record coal dispatch achieved.",
		impact: 0.02,
		target: "COALINDIA",
	},
	{
		text: "Anti-dumping duty on Chinese steel imports. Domestic steel makers benefit.",
		impact: 0.018,
		target: "METAL",
	},
	{
		text: "Iron ore prices crash {val}%. Steel margins under severe pressure.",
		impact: -0.025,
		target: "METAL",
	},

	// ---- TELECOM ----
	{
		text: "5G subscriber adds beat estimates. Telecom stocks jump.",
		impact: 0.018,
		target: "TELECOM",
	},
	{
		text: "Airtel raises tariffs by {val}%. ARPU improvement expected.",
		impact: 0.025,
		target: "BHARTIARTL",
	},
	{
		text: "TRAI proposes new spectrum allocation. Telecom capex to rise.",
		impact: -0.01,
		target: "TELECOM",
	},

	// ---- FMCG ----
	{
		text: "HUL margin pressure due to palm oil price surge.",
		impact: -0.02,
		target: "FMCG",
	},
	{
		text: "ITC FMCG segment turns profitable for first time. Stock re-rates.",
		impact: 0.025,
		target: "ITC",
	},
	{
		text: "Rural demand recovery drives FMCG volume growth to {val}%.",
		impact: 0.015,
		target: "FMCG",
	},
	{
		text: "ITC demerger of hotel business completed. Unlocks value.",
		impact: 0.02,
		target: "ITC",
	},

	// ---- NEW AGE / TECH ----
	{
		text: "Zomato quick commerce grows {val}% QoQ. Blinkit leads market.",
		impact: 0.04,
		target: "ZOMATO",
	},
	{
		text: "Zomato Hyperpure revenue doubles. B2B supply chain expanding.",
		impact: 0.025,
		target: "ZOMATO",
	},
	{
		text: "Zomato insider selling: Promoter offloads {val}% stake via block deal.",
		impact: -0.03,
		target: "ZOMATO",
	},

	// ---- RANDOM / GENERIC ----
	{
		text: "Earnings beat for {name}! Revenue up {val}% YoY. Margins expand.",
		impact: 0.025,
		target: "RANDOM",
	},
	{
		text: "Earnings miss for {name}. Revenue flat, margins contract 150bps.",
		impact: -0.025,
		target: "RANDOM",
	},
	{
		text: "SEBI initiates regulatory probe against {name}. Compliance under review.",
		impact: -0.04,
		target: "RANDOM",
	},
	{
		text: "Block deal: Institutional investor buys {name} at {val}% premium to CMP.",
		impact: 0.015,
		target: "RANDOM",
	},
	{
		text: "{name} announces stock buyback program of 5,000 Cr.",
		impact: 0.03,
		target: "RANDOM",
	},
	{
		text: "Short squeeze in {name}! Bears caught off guard. Massive short covering.",
		impact: 0.05,
		target: "RANDOM",
	},
	{
		text: "Profit booking in {name} after {val}% rally in 5 sessions.",
		impact: -0.025,
		target: "RANDOM",
	},
	{
		text: "Analyst upgrade: {name} target price raised {val}% by Goldman Sachs.",
		impact: 0.02,
		target: "RANDOM",
	},
	{
		text: "Analyst downgrade: {name} target slashed by Morgan Stanley. Sell rating.",
		impact: -0.025,
		target: "RANDOM",
	},
	{
		text: "Insider buying detected in {name}. Promoter raises stake by {val}%.",
		impact: 0.018,
		target: "RANDOM",
	},
	{
		text: "Promoter pledge in {name} rises to {val}%. Market concerned.",
		impact: -0.022,
		target: "RANDOM",
	},
	{
		text: "Mutual fund holdings in {name} increase by {val}% this quarter.",
		impact: 0.012,
		target: "RANDOM",
	},
	{
		text: "{name} board approves 1:1 bonus share issue. Record date next week.",
		impact: 0.035,
		target: "RANDOM",
	},
	{
		text: "{name} CFO resignation. Key management departure rattles street.",
		impact: -0.03,
		target: "RANDOM",
	},
	{
		text: "New strategic partnership announced by {name} with global giant.",
		impact: 0.022,
		target: "RANDOM",
	},
	{
		text: "{name} acquires competitor in 8,000 Cr all-cash deal.",
		impact: -0.015,
		target: "RANDOM",
	},
	{
		text: "Large OI buildup in {name} futures. Institutional activity surges.",
		impact: 0.01,
		target: "RANDOM",
	},
	{
		text: "{name} hits 52-week high! Momentum traders pile in.",
		impact: 0.03,
		target: "RANDOM",
	},
	{
		text: "{name} breaks key support level. Technical breakdown triggers selling.",
		impact: -0.03,
		target: "RANDOM",
	},
	{
		text: "Credit rating upgrade for {name} by CRISIL. Outlook stable.",
		impact: 0.015,
		target: "RANDOM",
	},

	// ---- ADDITIONAL MACRO ----
	{
		text: "India CPI inflation drops to {val}%. Monetary easing hopes rise.",
		impact: 0.016,
		target: "ALL",
	},
	{
		text: "RBI announces surprise 25bps CRR cut. Liquidity injection into banking.",
		impact: 0.02,
		target: "BANK",
	},
	{
		text: "US 10-year bond yield crosses {val}%. Global equity rout intensifies.",
		impact: -0.022,
		target: "ALL",
	},
	{
		text: "S&P upgrades India's sovereign rating outlook to positive.",
		impact: 0.025,
		target: "ALL",
	},
	{
		text: "India manufacturing PMI hits 16-month high at 58.3.",
		impact: 0.014,
		target: "ALL",
	},
	{
		text: "Monsoon forecast revised below normal. Rural consumption at risk.",
		impact: -0.01,
		target: "FMCG",
	},
	{
		text: "India forex reserves cross $700 billion. Record high.",
		impact: 0.008,
		target: "ALL",
	},
	{
		text: "Government raises windfall tax on oil. Energy margins hit.",
		impact: -0.02,
		target: "ENERGY",
	},
	{
		text: "GST collections hit record 2.1L Cr in March. Fiscal health strong.",
		impact: 0.012,
		target: "ALL",
	},
	{
		text: "Global recession fears mount. IMF cuts world growth projection.",
		impact: -0.016,
		target: "ALL",
	},
	{
		text: "India included in JPMorgan Global Bond Index. FII inflows surge.",
		impact: 0.022,
		target: "ALL",
	},
	{
		text: "European Central Bank surprises with 50bps rate cut. Risk-on wave.",
		impact: 0.015,
		target: "ALL",
	},
	{
		text: "Crypto crash spills into equity markets. Risk assets under pressure.",
		impact: -0.008,
		target: "ALL",
	},
	{
		text: "India trade deficit narrows sharply. Exports hit all-time high.",
		impact: 0.012,
		target: "ALL",
	},
	{
		text: "Earthquake in Taiwan disrupts semiconductor supply chain.",
		impact: -0.02,
		target: "IT",
	},
	{
		text: "US-China trade tensions re-escalate. New tariffs announced.",
		impact: -0.014,
		target: "ALL",
	},
	{
		text: "Gold hits all-time highs. Safe haven demand surges.",
		impact: -0.006,
		target: "ALL",
	},
	{
		text: "India becomes 3rd largest economy by GDP. Overtakes Japan.",
		impact: 0.02,
		target: "ALL",
	},
	{
		text: "RBI Governor makes hawkish comments. Rate cut expectations dashed.",
		impact: -0.012,
		target: "BANK",
	},
	{
		text: "Union Budget announces zero tax up to 12L income. Consumption boost expected.",
		impact: 0.025,
		target: "FMCG",
	},

	// ---- ADDITIONAL BANKING / FINANCE ----
	{
		text: "ICICI Bank net profit jumps {val}%. Best quarterly performance in 5 years.",
		impact: 0.03,
		target: "ICICIBANK",
	},
	{
		text: "Kotak Mahindra Bank faces RBI embargo on digital onboarding.",
		impact: -0.035,
		target: "KOTAKBANK",
	},
	{
		text: "Axis Bank NPA ratio improves to {val}%. Clean-up cycle nearing end.",
		impact: 0.02,
		target: "AXISBANK",
	},
	{
		text: "Bajaj Finance EMI card user base crosses 80 million.",
		impact: 0.018,
		target: "BAJFINANCE",
	},
	{
		text: "NBFC liquidity crisis fears return. Shadow banking stocks tumble.",
		impact: -0.025,
		target: "BANK",
	},
	{
		text: "Digital lending regulations tightened by RBI. Fintech stocks fall.",
		impact: -0.015,
		target: "BANK",
	},
	{
		text: "Bank Nifty crosses 55,000 for the first time. Banking euphoria.",
		impact: 0.025,
		target: "BANK",
	},
	{
		text: "Home loan rates cut by 50bps across PSU banks. Housing demand to rise.",
		impact: 0.015,
		target: "BANK",
	},
	{
		text: "SBI raises 30K Cr via QIP. Institutional demand 3x oversubscribed.",
		impact: 0.015,
		target: "SBIN",
	},
	{
		text: "HDFC Bank faces deposits growth slowdown concern. Street cautious.",
		impact: -0.018,
		target: "HDFCBANK",
	},

	// ---- ADDITIONAL IT ----
	{
		text: "TCS board announces Rs 18,000 Cr share buyback at premium.",
		impact: 0.03,
		target: "TCS",
	},
	{
		text: "Infosys faces $500M tax demand from GST authorities.",
		impact: -0.03,
		target: "INFY",
	},
	{
		text: "Wipro bags $1.5B deal from European telco. Largest in 3 years.",
		impact: 0.035,
		target: "WIPRO",
	},
	{
		text: "HCL Tech launches GenAI platform. Enterprise AI revenue pipeline $2B.",
		impact: 0.025,
		target: "HCLTECH",
	},
	{
		text: "Indian IT headcount shrinks for 3rd quarter. Automation impact visible.",
		impact: -0.015,
		target: "IT",
	},
	{
		text: "US tech spending outlook improves. CIO surveys bullish for FY26.",
		impact: 0.018,
		target: "IT",
	},
	{
		text: "Currency tailwind: Rupee depreciation boosts IT earnings outlook.",
		impact: 0.012,
		target: "IT",
	},
	{
		text: "European DORA regulation creates compliance demand. IT firms benefit.",
		impact: 0.015,
		target: "IT",
	},

	// ---- ADDITIONAL ENERGY / POWER ----
	{
		text: "Reliance Retail revenue crosses 3L Cr. Fastest growing retail chain.",
		impact: 0.025,
		target: "RELIANCE",
	},
	{
		text: "Reliance warns of petrochemical margin weakness in Q3 call.",
		impact: -0.02,
		target: "RELIANCE",
	},
	{
		text: "NTPC Green Energy IPO listing at {val}% premium. Parent stock rallies.",
		impact: 0.02,
		target: "NTPC",
	},
	{
		text: "Power Grid dividend yield at {val}%. Defensive pick in volatile market.",
		impact: 0.01,
		target: "POWERGRID",
	},
	{
		text: "India's renewable energy capacity crosses 200GW milestone.",
		impact: 0.015,
		target: "POWER",
	},
	{
		text: "Gas price revision: APM price hiked {val}%. Upstream companies benefit.",
		impact: 0.018,
		target: "ENERGY",
	},
	{
		text: "Power demand dips on unseasonable rain. Utility stocks correct.",
		impact: -0.012,
		target: "POWER",
	},
	{
		text: "Adani Green completes 25GW wind-solar hybrid project.",
		impact: 0.02,
		target: "ADANIENT",
	},

	// ---- ADDITIONAL AUTO ----
	{
		text: "Maruti Q3 profit surges {val}%. SUV mix at all-time high of {val}%.",
		impact: 0.03,
		target: "MARUTI",
	},
	{
		text: "Tata Motors JLR margins expand to {val}%. Best in 4 years.",
		impact: 0.028,
		target: "TATAMOTORS",
	},
	{
		text: "EV subsidy FAME-III scheme launched. 50K Cr allocated over 5 years.",
		impact: 0.025,
		target: "AUTO",
	},
	{
		text: "Auto insurance costs rise {val}%. Negative for auto demand outlook.",
		impact: -0.012,
		target: "AUTO",
	},
	{
		text: "Maruti recalls 50,000 vehicles over safety defect. Shares dip.",
		impact: -0.02,
		target: "MARUTI",
	},
	{
		text: "Tata Motors to demerge EV business. Listing expected next quarter.",
		impact: 0.035,
		target: "TATAMOTORS",
	},

	// ---- ADDITIONAL PHARMA ----
	{
		text: "Sun Pharma specialty portfolio revenue crosses $1B for first time.",
		impact: 0.028,
		target: "SUNPHARMA",
	},
	{
		text: "India pharma exports to Africa double in 2 years. New markets open.",
		impact: 0.015,
		target: "PHARMA",
	},
	{
		text: "Biosimilar approval in EU boosts Indian pharma companies.",
		impact: 0.02,
		target: "PHARMA",
	},
	{
		text: "Drug price control order expanded. 150 new drugs under ceiling.",
		impact: -0.018,
		target: "PHARMA",
	},

	// ---- ADDITIONAL METAL ----
	{
		text: "Tata Steel completes Netherlands plant restructuring. Losses to narrow.",
		impact: 0.02,
		target: "TATASTEEL",
	},
	{
		text: "JSW Steel reports record quarterly EBITDA. Volume guidance raised.",
		impact: 0.025,
		target: "JSWSTEEL",
	},
	{
		text: "Coal India e-auction premiums at 3-year high. Profitability surges.",
		impact: 0.022,
		target: "COALINDIA",
	},
	{
		text: "Global aluminum surplus leads to price crash. Metal sector bleeds.",
		impact: -0.022,
		target: "METAL",
	},
	{
		text: "India imposes export duty on iron ore. Steel input costs to rise.",
		impact: -0.015,
		target: "METAL",
	},
	{
		text: "Copper prices hit $12,000/ton. EV-driven demand reaches new high.",
		impact: 0.018,
		target: "METAL",
	},

	// ---- ADDITIONAL TELECOM ----
	{
		text: "Jio announces satellite broadband plans. Direct competition with Starlink.",
		impact: 0.02,
		target: "RELIANCE",
	},
	{
		text: "Airtel Africa revenue grows {val}%. International ops becoming significant.",
		impact: 0.018,
		target: "BHARTIARTL",
	},
	{
		text: "TRAI mandates {val}% tariff cut for basic plans. Revenue impact feared.",
		impact: -0.02,
		target: "TELECOM",
	},
	{
		text: "Airtel wins 700 MHz spectrum in latest auction. Rural 5G expansion.",
		impact: 0.015,
		target: "BHARTIARTL",
	},

	// ---- ADDITIONAL FMCG ----
	{
		text: "Hindustan Unilever premium portfolio grows {val}%. Premiumization trend strong.",
		impact: 0.018,
		target: "HINDUNILVR",
	},
	{
		text: "ITC cigarette volumes defy ESG concerns. Tax stability helps.",
		impact: 0.015,
		target: "ITC",
	},
	{
		text: "FMCG sector faces urban slowdown. Quick commerce cannibalizes kiranas.",
		impact: -0.012,
		target: "FMCG",
	},
	{
		text: "Hindustan Unilever announces Rs 12,000 Cr buyback at premium.",
		impact: 0.025,
		target: "HINDUNILVR",
	},

	// ---- ADDITIONAL INFRA ----
	{
		text: "L&T order book crosses 5L Cr. Highest backlog in company history.",
		impact: 0.025,
		target: "LT",
	},
	{
		text: "Adani Ports handles record cargo of 40 MT in single quarter.",
		impact: 0.02,
		target: "ADANIENT",
	},
	{
		text: "Real estate demand boom fuels cement and infra stocks higher.",
		impact: 0.018,
		target: "INFRA",
	},
	{
		text: "Road construction pace drops {val}%. Labour shortage impacts projects.",
		impact: -0.015,
		target: "INFRA",
	},
	{
		text: "L&T Smart World wins Rs 8,000 Cr smart city contract.",
		impact: 0.02,
		target: "LT",
	},

	// ---- ADDITIONAL NEW AGE / TECH ----
	{
		text: "Zomato enters live events and ticketing. New revenue vertical launched.",
		impact: 0.02,
		target: "ZOMATO",
	},
	{
		text: "Quick commerce war: Zomato Blinkit burns Rs 500 Cr in quarter.",
		impact: -0.025,
		target: "ZOMATO",
	},
	{
		text: "Zomato gets GST demand notice of Rs 800 Cr. Stock under pressure.",
		impact: -0.03,
		target: "ZOMATO",
	},
	{
		text: "Zomato gold membership crosses 10 million subscribers.",
		impact: 0.02,
		target: "ZOMATO",
	},

	// ---- MORE RANDOM / GENERIC ----
	{
		text: "{name} signs $2B joint venture with global PE fund.",
		impact: 0.028,
		target: "RANDOM",
	},
	{
		text: "Whistleblower complaint against {name}. Corporate governance concerns.",
		impact: -0.035,
		target: "RANDOM",
	},
	{
		text: "Board of {name} approves 5:1 stock split. Improves retail participation.",
		impact: 0.02,
		target: "RANDOM",
	},
	{
		text: "{name} enters Fortune 500 list for the first time.",
		impact: 0.015,
		target: "RANDOM",
	},
	{
		text: "Tax raid on {name} offices. I-T department seizes documents.",
		impact: -0.04,
		target: "RANDOM",
	},
	{
		text: "{name} CEO buys shares worth 50 Cr in open market. Confidence signal.",
		impact: 0.025,
		target: "RANDOM",
	},
	{
		text: "PE ratio of {name} crosses 80x. Valuation concerns intensify.",
		impact: -0.018,
		target: "RANDOM",
	},
	{
		text: "{name} production halted due to factory fire. Operations disrupted.",
		impact: -0.045,
		target: "RANDOM",
	},
	{
		text: "{name} wins government contract worth 15,000 Cr. Order book surges.",
		impact: 0.03,
		target: "RANDOM",
	},
	{
		text: "Warren Buffett's Berkshire takes {val}% stake in {name}. Global attention.",
		impact: 0.04,
		target: "RANDOM",
	},
	{
		text: "{name} launches QIP worth 10,000 Cr. Equity dilution concerns.",
		impact: -0.02,
		target: "RANDOM",
	},
	{
		text: "Foreign broker initiates coverage on {name} with BUY. Target {val}% upside.",
		impact: 0.025,
		target: "RANDOM",
	},
	{
		text: "{name} announced as replacement in NIFTY 50 index. Passive inflows expected.",
		impact: 0.035,
		target: "RANDOM",
	},
	{
		text: "{name} excluded from MSCI Emerging Markets index. FII selling likely.",
		impact: -0.03,
		target: "RANDOM",
	},
	{
		text: "{name} debt-to-equity ratio improves to 0.3x. Balance sheet strengthens.",
		impact: 0.015,
		target: "RANDOM",
	},
	{
		text: "ESG rating downgrade for {name}. Sustainability-focused funds exit.",
		impact: -0.02,
		target: "RANDOM",
	},
	{
		text: "{name} ROCE improves to {val}%. Capital efficiency gains noted by analysts.",
		impact: 0.018,
		target: "RANDOM",
	},
	{
		text: "Unusual options activity in {name}. Massive call buying detected.",
		impact: 0.025,
		target: "RANDOM",
	},
	{
		text: "{name} subsidiary IPO valued at premium. Unlocking hidden value.",
		impact: 0.022,
		target: "RANDOM",
	},
	{
		text: "Labour strike at {name} factory enters 2nd week. Production loss mounting.",
		impact: -0.03,
		target: "RANDOM",
	},
	{
		text: "{name} dividend yield at {val}%. Attractive for income investors.",
		impact: 0.01,
		target: "RANDOM",
	},
	{
		text: "Short selling in {name} at 3-year high. Bears circling aggressively.",
		impact: -0.02,
		target: "RANDOM",
	},
	{
		text: "{name} signs MoU with Indian Army for defense supplies.",
		impact: 0.02,
		target: "RANDOM",
	},
	{
		text: "{name} patent portfolio valued at $800M by independent assessors.",
		impact: 0.015,
		target: "RANDOM",
	},
	{
		text: "Regulatory clearance granted to {name} for new product launch.",
		impact: 0.018,
		target: "RANDOM",
	},
	{
		text: "{name} faces class action lawsuit in US courts. Legal risk escalates.",
		impact: -0.035,
		target: "RANDOM",
	},
	{
		text: "Bulk deal: Singapore sovereign fund buys {val}% of {name}.",
		impact: 0.02,
		target: "RANDOM",
	},
	{
		text: "{name} management guides for {val}% profit growth in FY26.",
		impact: 0.025,
		target: "RANDOM",
	},
	{
		text: "Data breach reported at {name}. Customer information compromised.",
		impact: -0.025,
		target: "RANDOM",
	},
	{
		text: "{name} expands to 3 new international markets. Revenue diversification.",
		impact: 0.018,
		target: "RANDOM",
	},

	// ---- AUTO (NEW) ----
	{
		text: "M&M electric SUV XEV 9e gets 30,000 bookings in 48 hours.",
		impact: 0.032,
		target: "MM",
	},
	{
		text: "M&M farm equipment segment: tractor volumes up {val}% YoY.",
		impact: 0.015,
		target: "MM",
	},
	{
		text: "Eicher Motors Royal Enfield exports cross 1 lakh units. Southeast Asia boom.",
		impact: 0.025,
		target: "EICHERMOT",
	},
	{
		text: "Eicher Motors premium bike Guerrilla 450 fully sold out within hours.",
		impact: 0.022,
		target: "EICHERMOT",
	},
	{
		text: "Auto sector inventory normalizes after festive run. Outlook bullish.",
		impact: 0.018,
		target: "AUTO",
	},
	{
		text: "PLI scheme for auto components: 18 firms qualify. Ancillary stocks rally.",
		impact: 0.015,
		target: "AUTO",
	},

	// ---- PHARMA (NEW) ----
	{
		text: "Cipla launches biosimilar in US market. Addressable market worth $800M.",
		impact: 0.03,
		target: "CIPLA",
	},
	{
		text: "Cipla chronic care portfolio growing {val}% YoY. Branded generics outperform.",
		impact: 0.02,
		target: "CIPLA",
	},
	{
		text: "Dr Reddy's receives USFDA tentative approval for 3 blockbuster generics.",
		impact: 0.028,
		target: "DRREDDY",
	},
	{
		text: "Dr Reddy's specialty formulations revenue surpasses ₹3,000 Cr milestone.",
		impact: 0.022,
		target: "DRREDDY",
	},
	{
		text: "India pharma exports cross $30B mark. Generics dominate global supply.",
		impact: 0.018,
		target: "PHARMA",
	},

	// ---- FMCG (NEW) ----
	{
		text: "Britannia launches premium biscuit range. Gross margins improve 200bps.",
		impact: 0.02,
		target: "BRITANNIA",
	},
	{
		text: "Britannia Q3 profit beats estimates by {val}%. Volume recovery on rural demand.",
		impact: 0.025,
		target: "BRITANNIA",
	},
	{
		text: "Nestle India Maggi noodle market share hits all-time high of {val}%.",
		impact: 0.022,
		target: "NESTLEIND",
	},
	{
		text: "Nestle India premium portfolio (Munch, KitKat) revenue up {val}% YoY.",
		impact: 0.018,
		target: "NESTLEIND",
	},
	{
		text: "Tata Consumer Products expands into snacks category. ₹500 Cr investment.",
		impact: 0.025,
		target: "TATACONSUM",
	},
	{
		text: "Tata Consumer Starbucks India opens 50 new stores. Premium beverage boom.",
		impact: 0.018,
		target: "TATACONSUM",
	},

	// ---- ENERGY / OIL & GAS (NEW) ----
	{
		text: "ONGC discovers new deepwater gas field in Bay of Bengal. Reserves +{val}%.",
		impact: 0.03,
		target: "ONGC",
	},
	{
		text: "ONGC Q3 profit beats: crude realization jumps. Dividend announced.",
		impact: 0.025,
		target: "ONGC",
	},
	{
		text: "BPCL upgrades Mumbai refinery: throughput increases to 14.5 MMTPA.",
		impact: 0.022,
		target: "BPCL",
	},
	{
		text: "BPCL overseas E&P block Mozambique starts production ahead of schedule.",
		impact: 0.028,
		target: "BPCL",
	},
	{
		text: "Global crude oil drops sharply. OMCs rally on marketing margin expansion.",
		impact: 0.025,
		target: "OILGAS",
	},
	{
		text: "Government revises LPG price upward. OMC under-recovery narrows sharply.",
		impact: 0.018,
		target: "OILGAS",
	},
	{
		text: "Crude oil spikes. Refinery margins squeezed. ONGC benefits.",
		impact: -0.02,
		target: "BPCL",
	},

	// ---- CEMENT (NEW) ----
	{
		text: "UltraTech Cement capacity expansion: 22.6 MTPA greenfield plant commissioned.",
		impact: 0.025,
		target: "ULTRACEMCO",
	},
	{
		text: "UltraTech Q3 results: EBITDA/ton at ₹1,380. Best in 6 quarters.",
		impact: 0.028,
		target: "ULTRACEMCO",
	},
	{
		text: "India cement demand grows {val}% in Q3. Infra + housing demand robust.",
		impact: 0.02,
		target: "CEMENT",
	},
	{
		text: "Cement prices rise ₹20/bag pan-India. Volume growth intact.",
		impact: 0.022,
		target: "CEMENT",
	},
	{
		text: "Coal prices correction boosts cement cost structure. Margins expand.",
		impact: 0.018,
		target: "CEMENT",
	},

	// ---- CONSUMER (NEW) ----
	{
		text: "Titan Company: jewelry segment revenue crosses ₹10,000 Cr in Q3.",
		impact: 0.025,
		target: "TITAN",
	},
	{
		text: "Titan Tanishq reaches ₹50,000 Cr retail target 2 years ahead of plan.",
		impact: 0.03,
		target: "TITAN",
	},
	{
		text: "Gold prices rally {val}% YTD. Titan margin expansion on studded ratio.",
		impact: 0.022,
		target: "TITAN",
	},
	{
		text: "Titan CaratLane acquisition accelerates lab-grown diamond push.",
		impact: 0.018,
		target: "TITAN",
	},
	{
		text: "Premium consumer spending surges as India's middle class expands.",
		impact: 0.015,
		target: "CONSUMER",
	},

	// ---- FINANCE (NEW) ----
	{
		text: "Bajaj Finserv health insurance subsidiary hits 5M policies. Fastest growth.",
		impact: 0.022,
		target: "BAJAJFINSV",
	},
	{
		text: "Bajaj Finserv Q3: Allianz JV exit roadmap finalized. Valuation upside.",
		impact: 0.025,
		target: "BAJAJFINSV",
	},
	{
		text: "NBFC credit growth at {val}%. Bajaj Finance and Finserv set to benefit.",
		impact: 0.018,
		target: "BAJAJFINSV",
	},

	// ---- IT (NEW) ----
	{
		text: "Tech Mahindra Network Services wins ₹3,500 Cr telecom deal. Largest in 5 yrs.",
		impact: 0.03,
		target: "TECHM",
	},
	{
		text: "Tech Mahindra CEO outlines turnaround. EBIT margin to reach {val}% by FY26.",
		impact: 0.025,
		target: "TECHM",
	},
	{
		text: "LTIMindtree BFSI vertical grows {val}% YoY. Deal wins at record $1.2B TCV.",
		impact: 0.03,
		target: "LTIM",
	},
	{
		text: "LTIMindtree AI CoE launches enterprise LLM platform. Early adoption strong.",
		impact: 0.022,
		target: "LTIM",
	},
	{
		text: "IT sector Q3 preview: TCV deal wins at $10.5B. Beat estimates.",
		impact: 0.015,
		target: "IT",
	},
	{
		text: "IT stocks rally as US Fed cuts rates. ITES stocks up 3-{val}% in a day.",
		impact: 0.02,
		target: "IT",
	},

	// ---- DEFENSE (NEW) ----
	{
		text: "BEL wins ₹8,000 Cr radar contract from Indian Army. Largest ever order.",
		impact: 0.04,
		target: "DEFENSE",
	},
	{
		text: "BEL Akash missile system export order to friendly nation. ₹5,000 Cr deal.",
		impact: 0.035,
		target: "DEFENSE",
	},
	{
		text: "India defense budget raised to ₹7.5L Cr. PSU defense stocks rally.",
		impact: 0.025,
		target: "DEFENSE",
	},
	{
		text: "BEL order book crosses ₹75,000 Cr. Execution pace accelerating.",
		impact: 0.022,
		target: "DEFENSE",
	},

	// ---- NEW AGE TECH (NEW) ----
	{
		text: "Paytm receives RBI NBFC license. Path to profitability clearer.",
		impact: 0.045,
		target: "PAYTM",
	},
	{
		text: "Paytm UPI market share rebounds to {val}% after regulatory pause.",
		impact: 0.03,
		target: "PAYTM",
	},
	{
		text: "Paytm founder increases stake to {val}%. Confidence signal.",
		impact: 0.025,
		target: "PAYTM",
	},
	{
		text: "IRCTC announces dynamic pricing for premium trains. Revenue impact +{val}%.",
		impact: 0.028,
		target: "IRCTC",
	},
	{
		text: "IRCTC to launch 50 new Vande Bharat trains. Catering revenue uplift.",
		impact: 0.022,
		target: "IRCTC",
	},
	{
		text: "IRCTC Q3 profit up {val}% YoY. Rail tourism segment doubles.",
		impact: 0.03,
		target: "IRCTC",
	},

	// ---- MACRO (NEW) ----
	{
		text: "India MSCI weight increases. Passive inflows of $1.8B expected.",
		impact: 0.022,
		target: "ALL",
	},
	{
		text: "RBI cuts repo rate by 25bps to {val}%. Rate-sensitive sectors rally hard.",
		impact: 0.025,
		target: "ALL",
	},
	{
		text: "Union Budget: ₹11L Cr capex planned. Infrastructure and defense boost.",
		impact: 0.018,
		target: "ALL",
	},
	{
		text: "India retail inflation hits 4-year low at {val}%. Rate cut cycle likely.",
		impact: 0.02,
		target: "ALL",
	},
	{
		text: "Global sovereign funds increase India allocations. $5B inflow expected.",
		impact: 0.016,
		target: "ALL",
	},
	{
		text: "India manufacturing PMI at 58.9 - highest in 16 years. Industrial boom.",
		impact: 0.018,
		target: "ALL",
	},
	{
		text: "Bank credit growth slows to {val}%. Concerns of tightening credit cycle.",
		impact: -0.012,
		target: "BANK",
	},
	{
		text: "Moody's upgrades India outlook to positive from stable.",
		impact: 0.02,
		target: "ALL",
	},
	{
		text: "FII buying resumes: ₹12,000 Cr net inflows in single week.",
		impact: 0.018,
		target: "ALL",
	},
	{
		text: "Nifty 50 PE crosses 25x. High valuations spark profit booking.",
		impact: -0.015,
		target: "ALL",
	},
	{
		text: "Dollar index surges to {idx_val}. EM currencies under pressure including rupee.",
		impact: -0.018,
		target: "ALL",
	},
	{
		text: "China manufacturing data beats expectations. Metal and energy stocks rally.",
		impact: 0.02,
		target: "METAL",
	},

	// ---- DALAL STREET INC (NEW) ----
	{
		text: "Dalal Street Inc posts record breaking quarter. Earnings smash expectations by {val}%.",
		impact: 0.05,
		target: "DALAL",
	},
	{
		text: "Institutional investors flock to Dalal Street Inc as fundamentals strengthen. Analyst upgrades stock.",
		impact: 0.04,
		target: "DALAL",
	},
	{
		text: "Dalal Street Inc announces strategic acquisition. Synergies expected to boost margins.",
		impact: 0.035,
		target: "DALAL",
	},
	{
		text: "Dalal Street Inc CEO buys shares in open market. Investor confidence skyrockets.",
		impact: 0.045,
		target: "DALAL",
	},
	{
		text: "Major breakthrough for Dalal Street Inc new product line. Pre-orders exceed 1 Million.",
		impact: 0.04,
		target: "DALAL",
	},
	{
		text: "Dalal Street Inc included in global indexes! Huge passive buying expected.",
		impact: 0.038,
		target: "DALAL",
	},
	{
		text: "Dalal Street Inc debt free ahead of schedule. Balance sheet strongest in industry.",
		impact: 0.03,
		target: "DALAL",
	},
	{
		text: "Dalal Street Inc announces 1:1 bonus share issue and special dividend.",
		impact: 0.042,
		target: "DALAL",
	},

	// ---- WAR / GEOPOLITICAL ----
	{
		text: "Russia-Ukraine conflict escalates. European gas prices spike {val}%. Markets risk-off.",
		impact: -0.018,
		target: "ALL",
		market: "WAR",
	},
	{
		text: "NATO activates Article 5 for the first time. Global equity sell-off intensifies.",
		impact: -0.025,
		target: "ALL",
		market: "WAR",
	},
	{
		text: "Middle East war expands. Strait of Hormuz shipping route disrupted.",
		impact: -0.03,
		target: "ALL",
		market: "WAR",
	},
	{
		text: "Oil tanker attacked in Red Sea. Crude surges on supply fears.",
		impact: -0.02,
		target: "ENERGY",
		market: "WAR",
	},
	{
		text: "India-Pakistan border tensions flare. Indian defence stocks surge.",
		impact: 0.04,
		target: "DEFENSE",
		market: "WAR",
	},
	{
		text: "India-Pakistan military standoff deepens. Markets enter risk-off mode.",
		impact: -0.018,
		target: "ALL",
		market: "WAR",
	},
	{
		text: "US-Iran standoff: aircraft carrier deployed to Persian Gulf.",
		impact: -0.022,
		target: "ALL",
		market: "WAR",
	},
	{
		text: "Taiwan Strait crisis: China PLA military drills near Taiwan.",
		impact: -0.025,
		target: "ALL",
		market: "WAR",
	},
	{
		text: "Ceasefire in Gaza announced. Oil eases, risk assets globally recover.",
		impact: 0.018,
		target: "ALL",
		market: "WAR",
	},
	{
		text: "North Korea fires ballistic missiles over Japan. Nikkei drops {val}%.",
		impact: -0.02,
		target: "ALL",
		market: "WAR",
	},
	{
		text: "Sanctions on Russia energy exports expanded. Oil & gas prices spike.",
		impact: -0.015,
		target: "ENERGY",
		market: "WAR",
	},
	{
		text: "Ukraine drone attack on Russian oil depot. Energy prices surge.",
		impact: 0.022,
		target: "ENERGY",
		market: "WAR",
	},
	{
		text: "Ballistic missile strikes near Suez Canal. Global shipping halted.",
		impact: -0.02,
		target: "ALL",
		market: "WAR",
	},
	{
		text: "China invades Taiwan: worst-case geopolitical scenario hits global markets.",
		impact: -0.05,
		target: "ALL",
		market: "WAR",
	},
	{
		text: "UN Security Council emergency meeting on Middle East. Markets stabilize.",
		impact: 0.01,
		target: "ALL",
		market: "WAR",
	},
	{
		text: "War premium in gold prices rises. Safe haven demand surges.",
		impact: 0.035,
		target: "GOLD",
		market: "WAR",
	},
	{
		text: "Conflict in Eastern Europe disrupts wheat supply. Global food inflation spike.",
		impact: -0.01,
		target: "FMCG",
		market: "WAR",
	},

	// ---- NASDAQ ----
	{
		text: "Apple iPhone 17 pre-orders hit record 50M units in first week.",
		impact: 0.03,
		target: "AAPL",
		market: "NASDAQ",
	},
	{
		text: "Apple Vision Pro 2 sells out in 4 hours. Services revenue upgraded.",
		impact: 0.022,
		target: "AAPL",
		market: "NASDAQ",
	},
	{
		text: "Microsoft Azure revenue grows {val}% YoY. AI workload demand explosively.",
		impact: 0.025,
		target: "MSFT",
		market: "NASDAQ",
	},
	{
		text: "Microsoft Copilot enterprise subscriptions cross 50M. AI monetization.",
		impact: 0.03,
		target: "MSFT",
		market: "NASDAQ",
	},
	{
		text: "NVIDIA Blackwell chip demand exceeds supply. Waitlist grows to 18 months.",
		impact: 0.045,
		target: "NVDA",
		market: "NASDAQ",
	},
	{
		text: "US-China chip export ban tightened. NVIDIA China revenue at risk.",
		impact: -0.04,
		target: "NVDA",
		market: "NASDAQ",
	},
	{
		text: "Tesla misses Q4 delivery estimates. EV demand slowdown globally.",
		impact: -0.04,
		target: "TSLA",
		market: "NASDAQ",
	},
	{
		text: "Tesla Full Self-Driving V13 gets regulatory approval in 3 US states.",
		impact: 0.038,
		target: "TSLA",
		market: "NASDAQ",
	},
	{
		text: "Meta AI ad revenue surges {val}%. Largest quarter in company history.",
		impact: 0.035,
		target: "META",
		market: "NASDAQ",
	},
	{
		text: "Meta Llama 4 model outperforms GPT on all benchmarks. Stock rockets.",
		impact: 0.04,
		target: "META",
		market: "NASDAQ",
	},
	{
		text: "Google loses landmark antitrust case. DOJ seeks structural breakup.",
		impact: -0.05,
		target: "GOOGL",
		market: "NASDAQ",
	},
	{
		text: "Google Gemini Ultra 2.0 dominates AI market. Search revenue intact.",
		impact: 0.025,
		target: "GOOGL",
		market: "NASDAQ",
	},
	{
		text: "Amazon AWS profitability hits all-time high. Operating margin crosses {val}%.",
		impact: 0.03,
		target: "AMZN",
		market: "NASDAQ",
	},
	{
		text: "Amazon pharmacy segment revenue doubles. Healthcare expansion gains.",
		impact: 0.025,
		target: "AMZN",
		market: "NASDAQ",
	},
	{
		text: "Netflix adds 20M subscribers in Q4. Password-sharing crackdown a success.",
		impact: 0.04,
		target: "NFLX",
		market: "NASDAQ",
	},
	{
		text: "Netflix ad-supported tier revenue exceeds subscription in 8 countries.",
		impact: 0.035,
		target: "NFLX",
		market: "NASDAQ",
	},
	{
		text: "Fed cuts rates 25bps. NASDAQ 100 rallies {val}% on liquidity hopes.",
		impact: 0.022,
		target: "ALL_NASDAQ",
		market: "NASDAQ",
	},
	{
		text: "US CPI surprise: inflation at {val}%. Rate cut hopes fade, tech sells off.",
		impact: -0.02,
		target: "ALL_NASDAQ",
		market: "NASDAQ",
	},
	{
		text: "US recession fears mount. NASDAQ 100 drops {val}% on PMI miss.",
		impact: -0.028,
		target: "ALL_NASDAQ",
		market: "NASDAQ",
	},
	{
		text: "Buffett increases tech holdings. NASDAQ sentiment improves sharply.",
		impact: 0.018,
		target: "ALL_NASDAQ",
		market: "NASDAQ",
	},

	// ---- SSE (Shanghai Stock Exchange) ----
	{
		text: "China PBOC cuts RRR by 50bps. Massive liquidity injected into market.",
		impact: 0.025,
		target: "ALL_SSE",
		market: "SSE",
	},
	{
		text: "China Q3 GDP growth beats at {val}%. Market rally on economic recovery.",
		impact: 0.03,
		target: "ALL_SSE",
		market: "SSE",
	},
	{
		text: "China slows: PMI falls to 48.2. Factory output at 3-year low.",
		impact: -0.025,
		target: "ALL_SSE",
		market: "SSE",
	},
	{
		text: "China announces RMB 10 trillion stimulus package. SSE surges.",
		impact: 0.04,
		target: "ALL_SSE",
		market: "SSE",
	},
	{
		text: "Evergrande liquidation completed. Property sector fears re-emerge.",
		impact: -0.03,
		target: "ALL_SSE",
		market: "SSE",
	},
	{
		text: "Kweichow Moutai Q3 revenue hits record 30B CNY. Premium liquor boom.",
		impact: 0.03,
		target: "MOUTAI",
		market: "SSE",
	},
	{
		text: "Moutai export to 60 countries launched. International expansion.",
		impact: 0.025,
		target: "MOUTAI",
		market: "SSE",
	},
	{
		text: "ICBC bad loan ratio rises to {val}%. Property sector NPAs rise.",
		impact: -0.02,
		target: "ICBC",
		market: "SSE",
	},
	{
		text: "ICBC dividend yield at {val}%. Value investors accumulate.",
		impact: 0.015,
		target: "ICBC",
		market: "SSE",
	},
	{
		text: "China Merchants Bank wealth management AUM crosses CNY 4T.",
		impact: 0.022,
		target: "CMBANK",
		market: "SSE",
	},
	{
		text: "Ping An Insurance dividend increased {val}%. Record payout.",
		impact: 0.02,
		target: "PINGAN",
		market: "SSE",
	},
	{
		text: "PetroChina crude output hits 4.5M bbl/day record. Best in decade.",
		impact: 0.025,
		target: "PETROCH",
		market: "SSE",
	},
	{
		text: "US-China trade war re-escalates. {val}% tariffs on Chinese goods.",
		impact: -0.035,
		target: "ALL_SSE",
		market: "SSE",
	},

	// ---- TSE (Tokyo Stock Exchange / Japan) ----
	{
		text: "Bank of Japan raises rates to {val}%. Yen strengthens, Nikkei corrects.",
		impact: -0.025,
		target: "ALL_TSE",
		market: "TSE",
	},
	{
		text: "Japan GDP growth surprises at {val}% annualized. Nikkei rally.",
		impact: 0.02,
		target: "ALL_TSE",
		market: "TSE",
	},
	{
		text: "Yen hits 160 vs USD. Japan exporters rally on currency tailwind.",
		impact: 0.018,
		target: "TOYOTA",
		market: "TSE",
	},
	{
		text: "Toyota FY net profit hits record. Hybrid vehicles outsell pure EVs.",
		impact: 0.03,
		target: "TOYOTA",
		market: "TSE",
	},
	{
		text: "Toyota solid-state battery production starts. EV range 900km.",
		impact: 0.04,
		target: "TOYOTA",
		market: "TSE",
	},
	{
		text: "Sony PlayStation 6 announcement: 40M pre-orders in 24 hours.",
		impact: 0.035,
		target: "SONY",
		market: "TSE",
	},
	{
		text: "Sony Music Entertainment acquires major label. IP portfolio doubles.",
		impact: 0.022,
		target: "SONY",
		market: "TSE",
	},
	{
		text: "SoftBank Vision Fund 3 posts $12B gain. AI startup portfolio boom.",
		impact: 0.04,
		target: "SOFTBNK",
		market: "TSE",
	},
	{
		text: "SoftBank ARM IPO proceeds used for $20B AI investment spree.",
		impact: 0.03,
		target: "SOFTBNK",
		market: "TSE",
	},
	{
		text: "Honda-Nissan merger approved by regulators. Auto consolidation.",
		impact: 0.025,
		target: "HONDA",
		market: "TSE",
	},
	{
		text: "Nintendo Switch 2 sells 5M units in first week. All-time record.",
		impact: 0.045,
		target: "NINTNDO",
		market: "TSE",
	},
	{
		text: "Nintendo next Pokemon game breaks franchise records. Stock surges.",
		impact: 0.03,
		target: "NINTNDO",
		market: "TSE",
	},
	{
		text: "Japan earthquake disrupts auto supply chain. Production halted.",
		impact: -0.03,
		target: "TOYOTA",
		market: "TSE",
	},

	// ---- COMMODITIES ----
	{
		text: "Gold hits all-time highs. War fears drive safe haven demand.",
		impact: 0.028,
		target: "GOLD",
		market: "COMM",
	},
	{
		text: "Gold falls sharply as US dollar strengthens.",
		impact: -0.02,
		target: "GOLD",
		market: "COMM",
	},
	{
		text: "Central banks buy record 1,000 tonnes of gold. De-dollarization trend.",
		impact: 0.025,
		target: "GOLD",
		market: "COMM",
	},
	{
		text: "Silver surges on industrial demand from solar panel manufacturers.",
		impact: 0.03,
		target: "SILVER",
		market: "COMM",
	},
	{
		text: "Silver industrial demand from EVs grows {val}% YoY. Supply deficit.",
		impact: 0.025,
		target: "SILVER",
		market: "COMM",
	},
	{
		text: "Silver short squeeze: hedge funds scramble to cover positions.",
		impact: 0.045,
		target: "SILVER",
		market: "COMM",
	},
	{
		text: "Copper prices jump {val}% on China infrastructure stimulus news.",
		impact: 0.028,
		target: "COPPER",
		market: "COMM",
	},
	{
		text: "Copper mine strike in Chile halts {val}% of global production.",
		impact: 0.035,
		target: "COPPER",
		market: "COMM",
	},
	{
		text: "Copper drops on slowing EV demand outlook. Surplus forecast rises.",
		impact: -0.022,
		target: "COPPER",
		market: "COMM",
	},
	{
		text: "Aluminium supply glut: China production surge leads to {val}% price crash.",
		impact: -0.038,
		target: "ALUM",
		market: "COMM",
	},
	{
		text: "Aluminium demand from aircraft manufacturing hits record. Prices recover.",
		impact: 0.022,
		target: "ALUM",
		market: "COMM",
	},
	{
		text: "EU carbon tax on aluminium imports pressures producers.",
		impact: -0.018,
		target: "ALUM",
		market: "COMM",
	},
	{
		text: "Zinc mine closure in Peru disrupts {val}% of global supply.",
		impact: 0.028,
		target: "ZINC",
		market: "COMM",
	},
	{
		text: "Zinc galvanization demand from construction sector at 5-year high.",
		impact: 0.02,
		target: "ZINC",
		market: "COMM",
	},
	{
		text: "Zinc prices plunge on weak Chinese steel sector demand.",
		impact: -0.025,
		target: "ZINC",
		market: "COMM",
	},
	{
		text: "OPEC+ announces surprise crude oil production cut.",
		impact: 0.045,
		target: "CRUDE",
		market: "COMM",
	},
	{
		text: "US crude inventories rise unexpectedly, easing supply fears.",
		impact: -0.035,
		target: "CRUDE",
		market: "COMM",
	},
	{
		text: "Natural gas futures spike {val}% on severe winter storm forecast.",
		impact: 0.055,
		target: "NATGAS",
		market: "COMM",
	},
	{
		text: "Platinum deficit deepens as South African power cuts hit mines.",
		impact: 0.032,
		target: "PLAT",
		market: "COMM",
	},
	{
		text: "Palladium slumps to 4-year low as automakers switch to platinum.",
		impact: -0.042,
		target: "PALLAD",
		market: "COMM",
	},
	{
		text: "Lead batteries recycling rate hits new highs, pressuring primary lead prices.",
		impact: -0.015,
		target: "LEAD",
		market: "COMM",
	},

	// ---- CRYPTO ----
	{
		text: "SEC approves Ethereum spot ETF. Institutional inflows expected to surge.",
		impact: 0.06,
		target: "ETH",
		market: "CRYPTO",
	},
	{
		text: "Bitcoin halving event completed successfully. Block reward slashed.",
		impact: 0.045,
		target: "BTC",
		market: "CRYPTO",
	},
	{
		text: "Solana network suffers 4-hour outage. Price dumps on stability concerns.",
		impact: -0.08,
		target: "SOL",
		market: "CRYPTO",
	},
	{
		text: "Major US bank announces Bitcoin custody services for high-net-worth clients.",
		impact: 0.035,
		target: "BTC",
		market: "CRYPTO",
	},
	{
		text: "Binance reaches settlement with US DOJ. Regulatory overhang cleared.",
		impact: 0.05,
		target: "BNB",
		market: "CRYPTO",
	},
	{
		text: "Ripple wins major court ruling against SEC. XRP labeled not a security.",
		impact: 0.12,
		target: "XRP",
		market: "CRYPTO",
	},
	{
		text: "Elon Musk tweets picture of his dog. Dogecoin rallies instantly.",
		impact: 0.09,
		target: "DOGE",
		market: "CRYPTO",
	},
	{
		text: "US Government transfers 10,000 seized BTC to Coinbase. Massive dump expected.",
		impact: -0.05,
		target: "BTC",
		market: "CRYPTO",
	},
	{
		text: "Crypto exchange hacked for $500M. Sector-wide panic selling.",
		impact: -0.04,
		target: "ALL_CRYPTO",
		market: "CRYPTO",
	},
	{
		text: "Global crypto adoption hits {val}% milestone. Strong retail buying.",
		impact: 0.03,
		target: "ALL_CRYPTO",
		market: "CRYPTO",
	},

	// ---- FOREX ----
	{
		text: "ECB cuts interest rates by 25bps. Euro weakens against the Dollar.",
		impact: -0.008,
		target: "EURUSD",
		market: "FX",
	},
	{
		text: "Bank of England unexpectedly raises rates to fight inflation. Pound surges.",
		impact: 0.012,
		target: "GBPUSD",
		market: "FX",
	},
	{
		text: "Bank of Japan intervenes in FX market. Massive yen buying seen.",
		impact: -0.02,
		target: "USDJPY",
		market: "FX",
	},
	{
		text: "US Non-Farm Payrolls crush expectations. Dollar rallies across the board.",
		impact: -0.006,
		target: "EURUSD",
		market: "FX",
	},
	{
		text: "US Non-Farm Payrolls crush expectations. Dollar rallies across the board.",
		impact: 0.01,
		target: "USDJPY",
		market: "FX",
	},
	{
		text: "Australia reports record trade surplus on commodity exports. AUD gains.",
		impact: 0.008,
		target: "AUDUSD",
		market: "FX",
	},
	{
		text: "Bank of Canada pauses rate hikes. Canadian Dollar drops.",
		impact: 0.005,
		target: "USDCAD",
		market: "FX",
	},

	// ---- NASDAQ - AMD ----
	{
		text: "AMD MI300X AI accelerator ships to 12 new hyperscaler clients. Data center revenue doubles.",
		impact: 0.04,
		target: "AMD",
		market: "NASDAQ",
	},
	{
		text: "AMD Ryzen 9000 series captures {val}% consumer CPU market share. Intel losing ground.",
		impact: 0.028,
		target: "AMD",
		market: "NASDAQ",
	},
	{
		text: "AMD supply chain issues delay RDNA 4 GPU launch. Stock falls on news.",
		impact: -0.03,
		target: "AMD",
		market: "NASDAQ",
	},
	{
		text: "AMD partners with Microsoft for custom AI training chips. Multi-year $3B deal.",
		impact: 0.035,
		target: "AMD",
		market: "NASDAQ",
	},

	// ---- NASDAQ - ADBE ----
	{
		text: "Adobe Firefly AI generated 9 billion images. Creatives enterprise subscriptions up {val}%.",
		impact: 0.03,
		target: "ADBE",
		market: "NASDAQ",
	},
	{
		text: "Adobe Creative Cloud price increases {val}%. Wall Street cheers margin expansion.",
		impact: 0.025,
		target: "ADBE",
		market: "NASDAQ",
	},
	{
		text: "Adobe Q2 results: Digital Media ARR hits $16.8B. Beat by $400M.",
		impact: 0.032,
		target: "ADBE",
		market: "NASDAQ",
	},
	{
		text: "Adobe faces growing pressure from Canva and Figma. Market share risk.",
		impact: -0.025,
		target: "ADBE",
		market: "NASDAQ",
	},

	// ---- NASDAQ - AVGO ----
	{
		text: "Broadcom custom AI ASIC revenue surges: hyperscaler AI pods driving $10B opportunity.",
		impact: 0.04,
		target: "AVGO",
		market: "NASDAQ",
	},
	{
		text: "Broadcom VMware integration complete. Enterprise software ARR at $8.5B run rate.",
		impact: 0.03,
		target: "AVGO",
		market: "NASDAQ",
	},
	{
		text: "Broadcom Ethernet networking chips win deals from Meta and Google. AI infrastructure play.",
		impact: 0.028,
		target: "AVGO",
		market: "NASDAQ",
	},
	{
		text: "Broadcom loses one hyperscaler AI chip contract. Revenue concentration risk.",
		impact: -0.025,
		target: "AVGO",
		market: "NASDAQ",
	},

	// ---- NASDAQ - COIN ----
	{
		text: "Coinbase approved for crypto futures trading in 3 new countries. Regulatory win.",
		impact: 0.045,
		target: "COIN",
		market: "NASDAQ",
	},
	{
		text: "Bitcoin ETF inflows hit $2B single day. Coinbase custody fees surge.",
		impact: 0.05,
		target: "COIN",
		market: "NASDAQ",
	},
	{
		text: "Coinbase Q2 revenue triples on crypto bull run. Record trading volumes.",
		impact: 0.055,
		target: "COIN",
		market: "NASDAQ",
	},
	{
		text: "SEC launches new probe into Coinbase staking products. Regulatory overhang.",
		impact: -0.05,
		target: "COIN",
		market: "NASDAQ",
	},
	{
		text: "Crypto winter hits Coinbase: trading revenue drops {val}% QoQ on low volatility.",
		impact: -0.04,
		target: "COIN",
		market: "NASDAQ",
	},

	// ---- NASDAQ - PLTR ----
	{
		text: "Palantir wins $1.5B US Army AI decision-making platform contract. Largest ever.",
		impact: 0.055,
		target: "PLTR",
		market: "NASDAQ",
	},
	{
		text: "Palantir AIP commercial revenue grows {val}% YoY. Boot camp model driving enterprise deals.",
		impact: 0.04,
		target: "PLTR",
		market: "NASDAQ",
	},
	{
		text: "Palantir added to S&P 500. Passive inflows expected of $2B.",
		impact: 0.045,
		target: "PLTR",
		market: "NASDAQ",
	},
	{
		text: "Palantir CEO dumps $300M of shares. Insider selling weighs on sentiment.",
		impact: -0.03,
		target: "PLTR",
		market: "NASDAQ",
	},

	// ---- NASDAQ - MU ----
	{
		text: "Micron HBM3E memory wins NVIDIA H200 design. AI memory revenue to triple.",
		impact: 0.045,
		target: "MU",
		market: "NASDAQ",
	},
	{
		text: "Micron raises Q3 guidance: data center DRAM pricing up {val}%. Memory supercycle.",
		impact: 0.04,
		target: "MU",
		market: "NASDAQ",
	},
	{
		text: "Micron's new NAND factory in Idaho starts production. Cost structure improves.",
		impact: 0.025,
		target: "MU",
		market: "NASDAQ",
	},
	{
		text: "PC DRAM oversupply hits Micron. Spot prices down {val}%. Margin pressure.",
		impact: -0.03,
		target: "MU",
		market: "NASDAQ",
	},

	// ---- MORE ALL_NASDAQ ----
	{
		text: "NASDAQ 100 hits all-time high. AI-driven earnings euphoria sweeps tech sector.",
		impact: 0.025,
		target: "ALL_NASDAQ",
		market: "NASDAQ",
	},
	{
		text: "Mag-7 earnings season: all 7 companies beat estimates. NASDAQ rallies {val}%.",
		impact: 0.03,
		target: "ALL_NASDAQ",
		market: "NASDAQ",
	},
	{
		text: "US antitrust regulator files sweeping Big Tech breakup proposal. Sector tanks.",
		impact: -0.03,
		target: "ALL_NASDAQ",
		market: "NASDAQ",
	},
	{
		text: "AI capex spending upgraded by all hyperscalers. Semicon and cloud stocks surge.",
		impact: 0.028,
		target: "ALL_NASDAQ",
		market: "NASDAQ",
	},
	{
		text: "US Treasury yield drops to {val}%. Growth stocks re-rate higher.",
		impact: 0.02,
		target: "ALL_NASDAQ",
		market: "NASDAQ",
	},
	{
		text: "Tech layoffs resume: 25,000 jobs cut across 10 companies. Margin expansion.",
		impact: 0.015,
		target: "ALL_NASDAQ",
		market: "NASDAQ",
	},

	{
		text: "SAIC Motor EV sales jump {val}% in Europe.",
		impact: 0.022,
		target: "SAIC",
		market: "SSE",
	},
	{
		text: "CITIC Securities reports record trading volumes in Q2.",
		impact: 0.025,
		target: "CITICS",
		market: "SSE",
	},
	{
		text: "Sinopec discovers major new oil field in Tarim Basin.",
		impact: 0.035,
		target: "SINOPEC",
		market: "SSE",
	},
	{
		text: "Agricultural Bank of China expands rural lending by {val}%.",
		impact: 0.018,
		target: "AGBANK",
		market: "SSE",
	},
	{
		text: "China Life Insurance premium income hits all-time high.",
		impact: 0.02,
		target: "CHINALIFE",
		market: "SSE",
	},
	{
		text: "ZTE wins massive 5G infrastructure contract in Middle East.",
		impact: 0.04,
		target: "ZTE",
		market: "SSE",
	},
	{
		text: "Baosteel announces aggressive carbon-neutral transition plan.",
		impact: 0.015,
		target: "BAOSTEEL",
		market: "SSE",
	},
	// ---- SSE - BYD ----
	{
		text: "BYD monthly EV sales hit 500,000 units for first time. Global No.1 title defended.",
		impact: 0.04,
		target: "BYD",
		market: "SSE",
	},
	{
		text: "BYD launches next-gen Blade Battery 2.0: 800km range. Orders flood in.",
		impact: 0.035,
		target: "BYD",
		market: "SSE",
	},
	{
		text: "BYD opens first Europe gigafactory in Hungary. EU tariff bypass strategy.",
		impact: 0.03,
		target: "BYD",
		market: "SSE",
	},
	{
		text: "BYD EV price war escalates. Entry-model cut to CNY 69,800. Margins squeezed.",
		impact: -0.025,
		target: "BYD",
		market: "SSE",
	},

	// ---- SSE - CATL ----
	{
		text: "CATL solid-state battery mass production announced for 2027. Revolution ahead.",
		impact: 0.045,
		target: "CATL",
		market: "SSE",
	},
	{
		text: "CATL signs €8B battery supply deal with BMW and Mercedes. European dominance.",
		impact: 0.035,
		target: "CATL",
		market: "SSE",
	},
	{
		text: "CATL Shenxing super-fast charging battery: 400km in 10 minutes. Game changer.",
		impact: 0.03,
		target: "CATL",
		market: "SSE",
	},
	{
		text: "US CATL battery blacklist expands. North American market access blocked.",
		impact: -0.035,
		target: "CATL",
		market: "SSE",
	},

	// ---- SSE - LONGI ----
	{
		text: "LONGi breaks solar efficiency world record at {val}%. Revolutionary milestone.",
		impact: 0.04,
		target: "LONGI",
		market: "SSE",
	},
	{
		text: "LONGi bifacial Hi-MO 9 module wins 10GW tender from Saudi Arabia.",
		impact: 0.03,
		target: "LONGI",
		market: "SSE",
	},
	{
		text: "Solar panel oversupply crisis: LONGi cuts ASP guidance by {val}%.",
		impact: -0.03,
		target: "LONGI",
		market: "SSE",
	},

	// ---- SSE - SAIC ----
	{
		text: "SAIC IM Motors launches L4 autonomous EV. Robotaxi permit in 5 Chinese cities.",
		impact: 0.03,
		target: "SAIC",
		market: "SSE",
	},
	{
		text: "SAIC-GM joint venture sales drop {val}% YoY. ICE vehicle demand collapses.",
		impact: -0.03,
		target: "SAIC",
		market: "SSE",
	},
	{
		text: "SAIC MG brand hits record overseas sales in Europe and India. Export strategy pays.",
		impact: 0.025,
		target: "SAIC",
		market: "SSE",
	},

	// ---- SSE - CITICS ----
	{
		text: "CITIC Securities IPO pipeline at 5-year high. Capital markets activity booming.",
		impact: 0.025,
		target: "CITICS",
		market: "SSE",
	},
	{
		text: "CITIC Securities reports record wealth management AUM of CNY 5.2 trillion.",
		impact: 0.022,
		target: "CITICS",
		market: "SSE",
	},
	{
		text: "China brokerage industry consolidation: CITIC merges with CSC Securities.",
		impact: 0.03,
		target: "CITICS",
		market: "SSE",
	},

	// ---- MORE ALL_SSE ----
	{
		text: "China PBOC announces targeted easing: CNY 500B injected via MLF.",
		impact: 0.022,
		target: "ALL_SSE",
		market: "SSE",
	},
	{
		text: "China property market stabilizes: home prices rise for 1st time in 18 months.",
		impact: 0.028,
		target: "ALL_SSE",
		market: "SSE",
	},
	{
		text: "China consumer confidence index hits 2-year high. Domestic demand recovering.",
		impact: 0.025,
		target: "ALL_SSE",
		market: "SSE",
	},
	{
		text: "China retaliatory tariffs on US semiconductors. Tech sector under pressure.",
		impact: -0.028,
		target: "ALL_SSE",
		market: "SSE",
	},
	{
		text: "China stock connect sees record HK northbound inflow of CNY 15B in one week.",
		impact: 0.022,
		target: "ALL_SSE",
		market: "SSE",
	},
	{
		text: "China imposes platform economy regulation on big tech. Ant, Tencent selloff.",
		impact: -0.02,
		target: "ALL_SSE",
		market: "SSE",
	},

	// ---- TSE - MUFG ----
	{
		text: "MUFG benefits from BOJ rate hike: net interest income rises JPY 800B YoY.",
		impact: 0.03,
		target: "MUFG",
		market: "TSE",
	},
	{
		text: "MUFG sells remaining Morgan Stanley stake for $5B profit. Capital boost.",
		impact: 0.025,
		target: "MUFG",
		market: "TSE",
	},
	{
		text: "MUFG announces record share buyback: JPY 500B. Highest ever by a Japanese bank.",
		impact: 0.028,
		target: "MUFG",
		market: "TSE",
	},

	// ---- TSE - FASTRET (Uniqlo) ----
	{
		text: "Fast Retailing Uniqlo India opens 50th store. Asia revenue contribution hits {val}%.",
		impact: 0.025,
		target: "FASTRET",
		market: "TSE",
	},
	{
		text: "Uniqlo LifeWear collaboration with Lemaire sells out in 3 hours globally.",
		impact: 0.022,
		target: "FASTRET",
		market: "TSE",
	},
	{
		text: "Fast Retailing raises FY profit guidance {val}%. Overseas same-store sales +{val}%.",
		impact: 0.03,
		target: "FASTRET",
		market: "TSE",
	},
	{
		text: "Uniqlo faces copycat competition in China. Market share erosion risk.",
		impact: -0.02,
		target: "FASTRET",
		market: "TSE",
	},

	// ---- TSE - KEYENCE ----
	{
		text: "Keyence factory automation sensors see record orders from EV gigafactories.",
		impact: 0.035,
		target: "KEYENCE",
		market: "TSE",
	},
	{
		text: "Keyence launches AI-vision inspection system. Semiconductor fab clients surge.",
		impact: 0.03,
		target: "KEYENCE",
		market: "TSE",
	},
	{
		text: "Keyence Q3 operating margin at {val}%. World-class profitability sustained.",
		impact: 0.025,
		target: "KEYENCE",
		market: "TSE",
	},

	// ---- TSE - DAIKIN ----
	{
		text: "Daikin India air conditioner sales up {val}% on record heat wave. Market share {val}%.",
		impact: 0.03,
		target: "DAIKIN",
		market: "TSE",
	},
	{
		text: "Daikin Europe heat pump revenue doubles. EU energy transition accelerates.",
		impact: 0.028,
		target: "DAIKIN",
		market: "TSE",
	},
	{
		text: "Daikin launches next-gen refrigerant R-290 ACs. Ahead of 2025 EU regulation.",
		impact: 0.022,
		target: "DAIKIN",
		market: "TSE",
	},

	// ---- TSE - CANON ----
	{
		text: "Canon medical imaging division wins 1,000-unit CT scanner order from US hospitals.",
		impact: 0.025,
		target: "CANON7751",
		market: "TSE",
	},
	{
		text: "Canon semiconductor lithography equipment orders surge {val}% on AI chip demand.",
		impact: 0.03,
		target: "CANON7751",
		market: "TSE",
	},
	{
		text: "Canon mirrorless camera R6 III sells out globally. Camera segment revenue up {val}%.",
		impact: 0.018,
		target: "CANON7751",
		market: "TSE",
	},

	{
		text: "Nissan announces aggressive solid-state battery timeline for 2028.",
		impact: 0.035,
		target: "NISSAN",
		market: "TSE",
	},
	{
		text: "Panasonic ramps up 4680 battery cell production for Tesla.",
		impact: 0.032,
		target: "PANASONIC",
		market: "TSE",
	},
	{
		text: "Hitachi energy grid solutions see record demand from US and Europe.",
		impact: 0.028,
		target: "HITACHI",
		market: "TSE",
	},
	{
		text: "Mitsui & Co. reports stellar earnings on strong commodities trading.",
		impact: 0.025,
		target: "MITSUI",
		market: "TSE",
	},
	{
		text: "Nidec precision motor sales soar on data center cooling demand.",
		impact: 0.038,
		target: "NIDEC",
		market: "TSE",
	},

	// ---- MORE ALL_TSE ----
	{
		text: "Yen weakens to 155 vs USD. Japan exporters hit 12-month earnings high.",
		impact: 0.022,
		target: "ALL_TSE",
		market: "TSE",
	},
	{
		text: "Yen strengthens sharply to 135. Japan export stocks face earnings downgrade.",
		impact: -0.022,
		target: "ALL_TSE",
		market: "TSE",
	},
	{
		text: "Tokyo Stock Exchange corporate governance reforms: {val}% of listed firms now buy back shares.",
		impact: 0.02,
		target: "ALL_TSE",
		market: "TSE",
	},
	{
		text: "Japan PM announces ¥50 trillion economic package. Domestic demand stocks rally.",
		impact: 0.025,
		target: "ALL_TSE",
		market: "TSE",
	},
	{
		text: "Japan core inflation hits {val}%. BOJ signals faster pace of rate normalization.",
		impact: -0.018,
		target: "ALL_TSE",
		market: "TSE",
	},
	{
		text: "Warren Buffett increases Japan trading house stake to {val}%. Nikkei rally.",
		impact: 0.025,
		target: "ALL_TSE",
		market: "TSE",
	},
	{
		text: "Japan GPIF rebalances: $12B shift into domestic equities from bonds.",
		impact: 0.022,
		target: "ALL_TSE",
		market: "TSE",
	},

	// ---- EUROPEAN MARKETS (EU) ----
	{
		text: "ECB cuts interest rates by 25 bps. European markets rally.",
		impact: 0.018,
		target: "EU",
		market: "EU",
	},
	{
		text: "Eurozone inflation falls to {val}%. Equity markets see fresh buying.",
		impact: 0.02,
		target: "EU",
		market: "EU",
	},
	{
		text: "LVMH reports record luxury sales in Asia. Shares hit 52-week high.",
		impact: 0.035,
		target: "LVMH",
		market: "EU",
	},
	{
		text: "ASML secures major EUV lithography orders. Chip sector boosted.",
		impact: 0.032,
		target: "ASML",
		market: "EU",
	},
	{
		text: "SAP announces major cloud restructuring and AI push. Margins improve.",
		impact: 0.028,
		target: "SAP",
		market: "EU",
	},
	{
		text: "Siemens reports {val}% jump in industrial automation revenue.",
		impact: 0.025,
		target: "SIEMENS",
		market: "EU",
	},
	{
		text: "L'Oreal sales slump in North America. Consumer sector weighs on index.",
		impact: -0.025,
		target: "LOREAL",
		market: "EU",
	},
	{
		text: "AstraZeneca cancer drug trial shows {val}% higher efficacy. Stock surges.",
		impact: 0.04,
		target: "AZN",
		market: "EU",
	},
	{
		text: "Shell announces massive $5B share buyback. Energy stocks rally.",
		impact: 0.03,
		target: "SHEL",
		market: "EU",
	},
	{
		text: "HSBC Holdings hit by unexpected European banking tax. Financials drag.",
		impact: -0.022,
		target: "HSBA",
		market: "EU",
	},

	// ---- CRYPTO ----
	{
		text: "SEC approves new spot Bitcoin ETFs. Crypto markets surge {val}%.",
		impact: 0.08,
		target: "BTC",
		market: "CRYPTO",
	},
	{
		text: "Major crypto exchange hacked for $500M. Bitcoin plummets.",
		impact: -0.07,
		target: "BTC",
		market: "CRYPTO",
	},
	{
		text: "Ethereum gas fees drop to record lows amid network upgrade.",
		impact: 0.05,
		target: "ETH",
		market: "CRYPTO",
	},
	{
		text: "Solana network suffers 4-hour outage. Confidence drops.",
		impact: -0.06,
		target: "SOL",
		market: "CRYPTO",
	},
	{
		text: "Binance resolves SEC lawsuit with $4B settlement. Uncertainty cleared.",
		impact: 0.05,
		target: "BNB",
		market: "CRYPTO",
	},
	{
		text: "Ripple wins landmark SEC case on XRP classification. Massive rally.",
		impact: 0.15,
		target: "XRP",
		market: "CRYPTO",
	},
	{
		text: "Elon Musk tweets about Dogecoin integration on X. Doge rockets.",
		impact: 0.12,
		target: "DOGE",
		market: "CRYPTO",
	},
	{
		text: "Global regulatory crackdown on stablecoins announced by FATF.",
		impact: -0.05,
		target: "ALL_CRYPTO",
		market: "CRYPTO",
	},
	{
		text: "Bitcoin halving event completes successfully. Supply shock anticipated.",
		impact: 0.06,
		target: "BTC",
		market: "CRYPTO",
	},

	// ---- COMMODITIES ----
	{
		text: "Gold prices hit all-time high amid global geopolitical uncertainty.",
		impact: 0.03,
		target: "GOLD",
		market: "COMM",
	},
	{
		text: "Silver industrial demand outpaces supply. Breakout rally.",
		impact: 0.04,
		target: "SILVER",
		market: "COMM",
	},
	{
		text: "Major copper mine in Chile faces strike. Supply deficit widens.",
		impact: 0.035,
		target: "COPPER",
		market: "COMM",
	},
	{
		text: "OPEC+ surprises market with 1M bpd production cut. Crude jumps.",
		impact: 0.04,
		target: "CRUDE",
		market: "COMM",
	},
	{
		text: "US natural gas storage hits 5-year high. Prices collapse.",
		impact: -0.05,
		target: "NATGAS",
		market: "COMM",
	},
	{
		text: "China construction sector slows, dragging down base metal prices.",
		impact: -0.03,
		target: "METAL",
		market: "COMM",
	},
	{
		text: "Aluminum smelters in Europe shut down due to high energy costs.",
		impact: 0.025,
		target: "ALUM",
		market: "COMM",
	},
	{
		text: "Zinc inventory on LME drops to critical lows.",
		impact: 0.03,
		target: "ZINC",
		market: "COMM",
	},

	// ---- FOREX ----
	{
		text: "US Federal Reserve hikes rates unexpectedly. USD surges.",
		impact: 0.015,
		target: "ALL_USD_FX",
		market: "FX",
	},
	{
		text: "ECB signals end of rate hikes. Euro weakens against the dollar.",
		impact: -0.012,
		target: "EURUSD",
		market: "FX",
	},
	{
		text: "Bank of England cuts rates to stimulate economy. Pound drops.",
		impact: -0.015,
		target: "GBPUSD",
		market: "FX",
	},
	{
		text: "Bank of Japan intervenes in currency market to prop up Yen.",
		impact: -0.02,
		target: "USDJPY",
		market: "FX",
	},
	{
		text: "Reserve Bank of Australia maintains hawkish stance. AUD rallies.",
		impact: 0.01,
		target: "AUDUSD",
		market: "FX",
	},
	{
		text: "Oil prices drag Canadian Dollar lower despite strong jobs data.",
		impact: -0.01,
		target: "USDCAD",
		market: "FX",
	},
	{
		text: "RBI defends Rupee actively at 83.5 level. Volatility drops.",
		impact: 0.005,
		target: "USDINR",
		market: "FX",
	},

	// ---- WAR / GEOPOLITICAL ----
	{
		text: "Tensions escalate in the South China Sea. Defense stocks rally.",
		impact: -0.04,
		target: "ALL_US",
		market: "WAR",
	},
	{
		text: "Middle East conflict threatens Strait of Hormuz. Oil skyrockets.",
		impact: 0.08,
		target: "CRUDE",
		market: "WAR",
	},
	{
		text: "Peace talks initiate in Eastern Europe. Markets breathe sigh of relief.",
		impact: 0.03,
		target: "ALL_EU",
		market: "WAR",
	},
	{
		text: "Cyberattack on major US infrastructure attributed to state actors.",
		impact: -0.03,
		target: "ALL_US",
		market: "WAR",
	},

	// ---- TECH / NASDAQ EXTENDED ----
	{
		text: "Apple announces revolutionary new AR/VR headset. Tech sector rallies.",
		impact: 0.04,
		target: "AAPL",
		market: "NASDAQ",
	},
	{
		text: "Microsoft Azure growth slows to {val}%. Misses expectations.",
		impact: -0.035,
		target: "MSFT",
		market: "NASDAQ",
	},
	{
		text: "Amazon AWS reports blockbuster quarter. Margins expand.",
		impact: 0.045,
		target: "AMZN",
		market: "NASDAQ",
	},
	{
		text: "NVIDIA announces next-gen Blackwell AI chips. Demand off the charts.",
		impact: 0.06,
		target: "NVDA",
		market: "NASDAQ",
	},
	{
		text: "Alphabet's new Gemini AI model benchmarks beat GPT-4. Stock surges.",
		impact: 0.05,
		target: "GOOGL",
		market: "NASDAQ",
	},
	{
		text: "Meta ad revenue hit by new privacy regulations in Europe.",
		impact: -0.04,
		target: "META",
		market: "NASDAQ",
	},
	{
		text: "Tesla vehicle deliveries drop {val}% YoY amid EV slowdown.",
		impact: -0.05,
		target: "TSLA",
		market: "NASDAQ",
	},
	{
		text: "Netflix subscriber growth beats estimates by 5 million.",
		impact: 0.05,
		target: "NFLX",
		market: "NASDAQ",
	},

	// ---- ADDITIONAL RANDOM EVENTS ----
	{
		text: "Auditor resigns unexpectedly for {name} citing lack of transparency.",
		impact: -0.08,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "{name} secures a massive 10-year contract with the US Department of Defense.",
		impact: 0.06,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "Factory fire halts production for {name} indefinitely.",
		impact: -0.05,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "Activist investor takes {val}% stake in {name}, demanding immediate board changes.",
		impact: 0.04,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "{name} raises full-year guidance by {val}%. Massive short squeeze follows.",
		impact: 0.07,
		target: "RANDOM",
		market: "ALL",
	},

	// ---- 96 ADDITIONAL EXTENDED EVENTS (Batch 2) ----

	// -- Random Corporate (16 events) --
	{
		text: "CBI launches investigation into {name} for alleged money laundering.",
		impact: -0.06,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "Global index provider MSCI increases weightage for {name}.",
		impact: 0.03,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "Major mutual fund house dumps 3 million shares of {name}.",
		impact: -0.025,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "{name} reports massive cyberattack; customer data stolen.",
		impact: -0.04,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "Labor strike at {name} manufacturing plant resolved. Operations resume.",
		impact: 0.02,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "Venture Capital firm exits {name} completely through block deal.",
		impact: -0.015,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "{name} announces massive debt restructuring to avoid default.",
		impact: -0.05,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "{name} successfully refinances $1B debt at much lower interest rates.",
		impact: 0.03,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "Promoter of {name} revokes {val}% of pledged shares.",
		impact: 0.04,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "Rival company files patent infringement lawsuit against {name}.",
		impact: -0.03,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "Court rules in favor of {name} in long-standing tax dispute.",
		impact: 0.035,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "{name} expands footprint into Latin America with new JV.",
		impact: 0.015,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "CEO of {name} wins 'Business Leader of the Year' award. Sentiment boosts.",
		impact: 0.01,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "Massive inventory write-down announced by {name}. Margins crushed.",
		impact: -0.045,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "{name} announces 1:2 stock split. Retail investors cheer.",
		impact: 0.02,
		target: "RANDOM",
		market: "ALL",
	},
	{
		text: "Major product recall by {name} due to safety concerns.",
		impact: -0.035,
		target: "RANDOM",
		market: "ALL",
	},

	// -- Crypto (10 events) --
	{
		text: "US Treasury proposes strict KYC rules for unhosted crypto wallets.",
		impact: -0.04,
		target: "ALL_CRYPTO",
		market: "CRYPTO",
	},
	{
		text: "Major South American country adopts Bitcoin as legal tender.",
		impact: 0.06,
		target: "BTC",
		market: "CRYPTO",
	},
	{
		text: "Ethereum Layer 2 adoption hits all-time high. TVL surges {val}%.",
		impact: 0.04,
		target: "ETH",
		market: "CRYPTO",
	},
	{
		text: "Binance burns $500M worth of BNB tokens. Deflationary pressure.",
		impact: 0.03,
		target: "BNB",
		market: "CRYPTO",
	},
	{
		text: "Solana DeFi ecosystem suffers $100M exploit.",
		impact: -0.045,
		target: "SOL",
		market: "CRYPTO",
	},
	{
		text: "Ripple announces major banking partnership in the Middle East.",
		impact: 0.05,
		target: "XRP",
		market: "CRYPTO",
	},
	{
		text: "Retail FOMO returns! Dogecoin trends #1 globally on X.",
		impact: 0.08,
		target: "DOGE",
		market: "CRYPTO",
	},
	{
		text: "Mining difficulty for Bitcoin reaches new ATH. Miners struggle.",
		impact: -0.02,
		target: "BTC",
		market: "CRYPTO",
	},
	{
		text: "Institutional inflow into crypto ETFs breaks $1B in a single day.",
		impact: 0.05,
		target: "ALL_CRYPTO",
		market: "CRYPTO",
	},
	{
		text: "Major central bank warns against crypto investments. Market ignores.",
		impact: -0.01,
		target: "ALL_CRYPTO",
		market: "CRYPTO",
	},

	// -- Forex (10 events) --
	{
		text: "US Non-Farm Payrolls smash expectations. Dollar rockets higher.",
		impact: 0.015,
		target: "ALL_USD_FX",
		market: "FX",
	},
	{
		text: "US CPI drops faster than expected. Dollar index plunges.",
		impact: -0.015,
		target: "ALL_USD_FX",
		market: "FX",
	},
	{
		text: "ECB President gives extremely dovish speech. Euro tanks.",
		impact: -0.012,
		target: "EURUSD",
		market: "FX",
	},
	{
		text: "UK Retail Sales surprise to the upside. Pound Sterling rallies.",
		impact: 0.01,
		target: "GBPUSD",
		market: "FX",
	},
	{
		text: "Bank of Japan officially ends yield curve control. Yen strengthens.",
		impact: -0.018,
		target: "USDJPY",
		market: "FX",
	},
	{
		text: "China PBOC cuts RRR to stimulate economy. Yuan weakens.",
		impact: 0.008,
		target: "CNYINR",
		market: "FX",
	},
	{
		text: "Australia posts record trade surplus. AUD gains ground.",
		impact: 0.012,
		target: "AUDUSD",
		market: "FX",
	},
	{
		text: "Canada inflation ticks higher. Bank of Canada rate hike priced in.",
		impact: -0.01,
		target: "USDCAD",
		market: "FX",
	},
	{
		text: "FDI inflows into India hit record high. Rupee appreciates sharply.",
		impact: -0.008,
		target: "USDINR",
		market: "FX",
	},
	{
		text: "Global carry trade unwinds violently. Yen and Swiss Franc surge.",
		impact: -0.02,
		target: "USDJPY",
		market: "FX",
	},

	// -- Commodities (10 events) --
	{
		text: "Gold central bank purchases reach record high in Q3.",
		impact: 0.025,
		target: "GOLD",
		market: "COMM",
	},
	{
		text: "Silver photovoltaic (solar) demand expected to double by 2030.",
		impact: 0.03,
		target: "SILVER",
		market: "COMM",
	},
	{
		text: "Copper warehouse inventories jump {val}%. Traders dump futures.",
		impact: -0.03,
		target: "COPPER",
		market: "COMM",
	},
	{
		text: "US Hurricane threatens Gulf of Mexico oil rigs. Crude spikes.",
		impact: 0.04,
		target: "CRUDE",
		market: "COMM",
	},
	{
		text: "Mild winter in Europe sends Natural Gas prices plunging {val}%.",
		impact: -0.06,
		target: "NATGAS",
		market: "COMM",
	},
	{
		text: "China announces massive infra stimulus. Industrial metals rally.",
		impact: 0.025,
		target: "ALL_COMM",
		market: "COMM",
	},
	{
		text: "Platinum deficit deepens due to South African power crisis.",
		impact: 0.035,
		target: "PLAT",
		market: "COMM",
	},
	{
		text: "Palladium substitute tech advances. Auto-catalyst demand drops.",
		impact: -0.04,
		target: "PALLAD",
		market: "COMM",
	},
	{
		text: "Global economic slowdown fears crush base metal prices.",
		impact: -0.025,
		target: "ALL_COMM",
		market: "COMM",
	},
	{
		text: "Electric Vehicle slowdown hurts battery metal outlook.",
		impact: -0.02,
		target: "ALUM",
		market: "COMM",
	},

	// -- War / Macro Geo (10 events) --
	{
		text: "Missile strikes reported near major Middle East oil facility.",
		impact: 0.05,
		target: "CRUDE",
		market: "WAR",
	},
	{
		text: "UN announces historic ceasefire agreement in regional conflict.",
		impact: -0.04,
		target: "GOLD",
		market: "WAR",
	},
	{
		text: "Taiwan straight naval exercises cause panic in semiconductor sector.",
		impact: -0.035,
		target: "ALL_US",
		market: "WAR",
	},
	{
		text: "Defense spending in Europe increased by {val}% of GDP across NATO.",
		impact: 0.02,
		target: "ALL_EU",
		market: "WAR",
	},
	{
		text: "Sanctions placed on major global commodities exporter.",
		impact: 0.03,
		target: "ALL_COMM",
		market: "WAR",
	},
	{
		text: "Drone attack on shipping lanes disrupts global supply chains.",
		impact: -0.02,
		target: "ALL_US",
		market: "WAR",
	},
	{
		text: "BRICS nations announce new alternative payment system.",
		impact: -0.015,
		target: "ALL_USD_FX",
		market: "WAR",
	},
	{
		text: "US elections surprise result! Markets volatile on uncertainty.",
		impact: -0.02,
		target: "ALL_US",
		market: "WAR",
	},
	{
		text: "OPEC and non-OPEC allies fail to reach production agreement.",
		impact: -0.04,
		target: "CRUDE",
		market: "WAR",
	},
	{
		text: "Global cyber pandemic shuts down major banking networks for 24 hours.",
		impact: -0.05,
		target: "ALL",
		market: "WAR",
	},

	// -- EU Markets (10 events) --
	{
		text: "LVMH acquires major independent luxury watchmaker. Synergy expected.",
		impact: 0.025,
		target: "LVMH",
		market: "EU",
	},
	{
		text: "ASML faces new export restrictions to China. Revenue guidance cut.",
		impact: -0.04,
		target: "ASML",
		market: "EU",
	},
	{
		text: "SAP Q4 cloud revenue growth exceeds {val}%. Stock hits ATH.",
		impact: 0.03,
		target: "SAP",
		market: "EU",
	},
	{
		text: "Siemens mobility division wins €3B high-speed rail contract.",
		impact: 0.028,
		target: "SIEMENS",
		market: "EU",
	},
	{
		text: "L'Oreal CEO steps down unexpectedly. Stock drops on transition fears.",
		impact: -0.025,
		target: "LOREAL",
		market: "EU",
	},
	{
		text: "AstraZeneca fails Phase 3 trial for experimental obesity drug.",
		impact: -0.05,
		target: "AZN",
		market: "EU",
	},
	{
		text: "Shell discovers massive offshore oil field in Namibia.",
		impact: 0.035,
		target: "SHEL",
		market: "EU",
	},
	{
		text: "HSBC announces deep job cuts to improve efficiency ratio.",
		impact: 0.02,
		target: "HSBA",
		market: "EU",
	},
	{
		text: "EU Parliament passes sweeping AI act. Tech compliance costs to rise.",
		impact: -0.015,
		target: "ALL_EU",
		market: "EU",
	},
	{
		text: "European manufacturing PMI jumps back into expansion territory.",
		impact: 0.02,
		target: "ALL_EU",
		market: "EU",
	},

	// -- US / NASDAQ (10 events) --
	{
		text: "Apple iPhone 16 sales in China drop {val}% YoY. Competition bites.",
		impact: -0.03,
		target: "AAPL",
		market: "NASDAQ",
	},
	{
		text: "Microsoft announces $10B investment in new AI data centers.",
		impact: 0.025,
		target: "MSFT",
		market: "NASDAQ",
	},
	{
		text: "Amazon Prime day breaks all-time sales records. Stock surges.",
		impact: 0.03,
		target: "AMZN",
		market: "NASDAQ",
	},
	{
		text: "NVIDIA margins contract slightly due to TSMC price hikes.",
		impact: -0.02,
		target: "NVDA",
		market: "NASDAQ",
	},
	{
		text: "Google ad revenue growth accelerates. YouTube shorts monetization succeeds.",
		impact: 0.035,
		target: "GOOGL",
		market: "NASDAQ",
	},
	{
		text: "Meta launches new VR social platform. User adoption faster than expected.",
		impact: 0.025,
		target: "META",
		market: "NASDAQ",
	},
	{
		text: "Tesla fully autonomous driving (FSD v12) approved in Europe.",
		impact: 0.045,
		target: "TSLA",
		market: "NASDAQ",
	},
	{
		text: "Netflix cracking down on password sharing yields 10M new subs.",
		impact: 0.03,
		target: "NFLX",
		market: "NASDAQ",
	},
	{
		text: "US Tech sector sees wave of M&A activity. Valuations expand.",
		impact: 0.02,
		target: "ALL_NASDAQ",
		market: "NASDAQ",
	},
	{
		text: "US consumer confidence plummets. Retail and Tech selloff.",
		impact: -0.025,
		target: "ALL_NASDAQ",
		market: "NASDAQ",
	},

	// -- NSE / India (10 events) --
	{
		text: "Reliance Jio announces 5G tariffs, higher than expected.",
		impact: 0.025,
		target: "RELIANCE",
		market: "NSE",
	},
	{
		text: "HDFC Bank deposit growth finally outpaces credit growth.",
		impact: 0.02,
		target: "HDFCBANK",
		market: "NSE",
	},
	{
		text: "TCS wins $1B AI implementation contract from European bank.",
		impact: 0.025,
		target: "TCS",
		market: "NSE",
	},
	{
		text: "Infosys cuts headcount by 5000 in cost optimization drive.",
		impact: 0.015,
		target: "INFY",
		market: "NSE",
	},
	{
		text: "ICICI Bank reports zero slippages in corporate book.",
		impact: 0.02,
		target: "ICICIBANK",
		market: "NSE",
	},
	{
		text: "SBI retail NPA ticks up slightly due to unsecured loan stress.",
		impact: -0.015,
		target: "SBIN",
		market: "NSE",
	},
	{
		text: "Bajaj Finance margins compress due to higher cost of funds.",
		impact: -0.02,
		target: "BAJFINANCE",
		market: "NSE",
	},
	{
		text: "ITC cigarette volumes hit by unexpected excise duty hike.",
		impact: -0.03,
		target: "ITC",
		market: "NSE",
	},
	{
		text: "L&T wins bullet train civil construction package worth 10k Cr.",
		impact: 0.03,
		target: "LT",
		market: "NSE",
	},
	{
		text: "Adani Enterprises successfully raises $2B via QIP.",
		impact: 0.025,
		target: "ADANIENT",
		market: "NSE",
	},

	// -- TSE / Japan (10 events) --
	{
		text: "Toyota announces breakthrough in solid-state battery manufacturing.",
		impact: 0.04,
		target: "TOYOTA",
		market: "TSE",
	},
	{
		text: "Sony PS6 console specs leaked, massive upgrade expected.",
		impact: 0.025,
		target: "SONY",
		market: "TSE",
	},
	{
		text: "SoftBank Vision Fund returns to profitability after 2 years.",
		impact: 0.035,
		target: "SOFTBANK",
		market: "TSE",
	},
	{
		text: "Nintendo next-gen console delayed to 2026. Stock plummets.",
		impact: -0.05,
		target: "NINTNDO",
		market: "TSE",
	},
	{
		text: "Mitsubishi UFJ (MUFG) net interest margins expand as BOJ hikes.",
		impact: 0.03,
		target: "MUFG",
		market: "TSE",
	},
	{
		text: "Fast Retailing (Uniqlo) reports phenomenal growth in North America.",
		impact: 0.028,
		target: "FASTRET",
		market: "TSE",
	},
	{
		text: "Keyence profit margins hit {val}%, highest in automation sector.",
		impact: 0.025,
		target: "KEYENCE",
		market: "TSE",
	},
	{
		text: "Daikin global HVAC sales dragged down by European housing slump.",
		impact: -0.02,
		target: "DAIKIN",
		market: "TSE",
	},
	{
		text: "Nissan cuts global production capacity by {val}%. Restructuring begins.",
		impact: -0.03,
		target: "NISSAN",
		market: "TSE",
	},
	{
		text: "Japan core machinery orders beat expectations. Capex boom.",
		impact: 0.015,
		target: "ALL_TSE",
		market: "TSE",
	},
	// ---- TEMPLATES ----
	{
		isTemplate: true,
		impact: 0.02,
		target: "RANDOM",
		market: "NSE"
	},
	{
		isTemplate: true,
		impact: -0.015,
		target: "RANDOM",
		market: "NSE"
	},
	{
		isTemplate: true,
		impact: 0.025,
		target: "RANDOM",
		market: "NSE"
	},
	{
		time: "Random",
		type: "HKEX",
		text: "Hong Kong monetary authority injects liquidity. Hang Seng index surges.",
		target: "ALL_HKEX",
		market: "HKEX",
		impact: 0.025
	},
	{
		time: "Random",
		type: "HKEX",
		text: "Regulatory crackdown on tech sectors in China hits Hong Kong listed stocks.",
		target: "ALL_HKEX",
		market: "HKEX",
		impact: -0.03
	},
	{
		time: "Random",
		type: "Macro",
		text: "Global index provider MSCI drops weightage for Asian markets.",
		target: "ALL_INDEX",
		market: "GLOBAL",
		impact: -0.015
	},
	{
		time: "Random",
		type: "Macro",
		text: "Passive inflows hit record high as ETF buying accelerates globally.",
		target: "ALL_INDEX",
		market: "GLOBAL",
		impact: 0.02
	}
];

function generateTemplatedNews(targetStr, impact, stockName, ticker) {
	var metrics = ["Earnings", "Revenue", "Q3 Margins", "Sales"];
	// Bug #9 fix: use pcg.random() instead of Math.random() to preserve seeded simulation reproducibility.
	// Math.random() is non-deterministic and breaks replay/seed consistency.
	var metric = metrics[Math.floor(pcg.random() * metrics.length)];
	var percent = Math.floor(pcg.random() * 15) + 5;
	
	if (impact > 0) {
		return ticker + " reports " + metric + " beat by " + percent + "%. Stock rallies.";
	} else {
		return ticker + " misses " + metric + " estimates by " + percent + "%. Analysts downgrade.";
	}
}



// Auto-generated ES exports
export { generateTemplatedNews, newsEvents };
