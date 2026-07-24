<div align="center">
  <h1>ðŸ“ˆ Trading Terminal Simulator (Dalal Street)</h1>
  <p><b><i>An ultra-realistic, high-performance, real-time trading terminal simulator built entirely with client-side web technologies and WebRTC Peer-to-Peer multiplayer.</i></b></p>
  
  <div>
    <img src="https://img.shields.io/badge/version-2.0.0-blue.svg?style=for-the-badge&logo=github" alt="Version">
    <img src="https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge" alt="License">
    <img src="https://img.shields.io/badge/environment-Client--Side-orange.svg?style=for-the-badge&logo=googlechrome" alt="Environment">
    <img src="https://img.shields.io/badge/webrtc-P2P--Multiplayer-brightgreen.svg?style=for-the-badge&logo=webrtc" alt="WebRTC">
    <img src="https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E" alt="JavaScript">
    <img src="https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
    <img src="https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
    <img src="https://img.shields.io/badge/Vercel-Ready-black.svg?style=for-the-badge&logo=vercel" alt="Vercel Ready">
  </div>
</div>

<hr>

<details>
<summary><b>ðŸ“‘ Table of Contents</b> (Click to expand)</summary>

- [ðŸŒŸ The Ultimate Sandbox](#-the-ultimate-sandbox)
- [ðŸ›  Core Architecture & Tech Stack](#-core-architecture--tech-stack)
- [ðŸŒ Real-Time Peer-to-Peer Multiplayer](#-real-time-peer-to-peer-multiplayer)
- [ðŸ“ Project Structure](#-project-structure)
- [ðŸ§® Simulation Engine & Math Models](#-simulation-engine--math-models)
- [ðŸ”¥ Every Nudge & Feature](#-every-nudge--feature)
- [ðŸŽ® How to Play](#-how-to-play)
- [ðŸ’» Quick Start](#-quick-start)
- [ðŸš€ Deploying to Vercel](#-deploying-to-vercel)
- [ðŸ§ª Running Tests](#-running-tests)
- [ðŸ›¡ Security Note](#-security-note)
- [ðŸ¤ Contributing](#-contributing)
- [ðŸ“„ License](#-license)
</details>

---

## ðŸŒŸ The Ultimate Sandbox
Welcome to **Trading Terminal Simulator**â€”a highly accurate, tick-by-tick financial market microstructure simulator. Engineered for quantitative analysis, strategy backtesting, algorithmic bot development, peer-to-peer multiplayer trading, and educational purposes. It allows users to interact with synthetic markets featuring authentic liquidity constraints, timezone synchronization, dynamic macroeconomic news, Black-Scholes derivatives pricing, interactive Option Chains, technical indicators (VWAP, RSI, MACD, Bollinger Bands), and a living economy with **daily-drifting foreign exchange rates**.

---

## ðŸ›  Core Architecture & Tech Stack

This application is built from the ground up with a strict focus on **zero-latency execution** and **high-frequency DOM updates**. To achieve this, it relies entirely on native browser APIs without the overhead of heavy frameworks.

### Technology Stack
*   **Core UI / Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+). Modern glassmorphism UI with high-contrast emerald & crimson action controls.
*   **Multiplayer Engine**: PeerJS & WebRTC for real-time host-client state broadcasting, order routing, and peer synchronization.
*   **State Management**: 100% in-memory client-side architecture for blazing fast order matching.
*   **Rendering & Charting**: Custom batched DOM updates and Canvas/SVG charting supporting Candlesticks, Technical Indicators (RSI, MACD, VWAP, SMA/EMA), and interactive drawing tools.
*   **Math Utilities**: Pure, side-effect-free math functions extracted into `js/math-utils.js` â€” shared by the simulation engine and the test suite.
*   **Code Quality / Linting**: **ESLint** configured (`eslint.config.mjs`) to ensure strict ECMAScript rules across the codebase.

```mermaid
graph TD
    UI[Frontend UI HTML/CSS] -->|DOM Updates| RenderEngine[Batched Rendering Engine]
    RenderEngine --> State[In-Memory State Manager]
    State --> Matching[Order Matching Engine]
    State --> Market[Market Tick Generator]
    Market -->|Correlated Shocks| News[Macro News Engine]
    Market -->|Daily Drift| FX[FX Rate Simulator]
    
    subgraph Multiplayer [WebRTC Peer-to-Peer System]
        Host[Host Peer] <-->|Tick Sync & Order Fills| Clients[Client Peers]
        Clients -->|PLACE_ORDER| Host
        Host -->|SYNC_STATE / MARKET_TICK| Clients
    end
    State <--> Host
```

---

## ðŸŒ Real-Time Peer-to-Peer Multiplayer

The simulator features a serverless **WebRTC Peer-to-Peer Multiplayer System** built using PeerJS:

*   **Host & Room Generation**: Create rooms instantly with random room codes (e.g. `DALAL-A1B2`) featuring automatic collision detection and ID retries.
*   **Peer Synchronization**: Host broadcasts tick data, LTP, open/base prices, bids/asks, order book depth, liquidity, and news events to connected clients in real time.
*   **Client Clock Suspension**: Client simulation intervals automatically pause (`window._stopClientClockFn`) while connected to follow the host's market clock, resuming cleanly upon disconnect (`window._restartClockFn`).
*   **Host Order Matching**: Clients dispatch order requests (`PLACE_ORDER`) over WebRTC. The host validates margin, circuit halts, and liquidity, responding with `ORDER_FILLED`, `ORDER_REJECTED`, or `PARTIAL_FILL` messages.
*   **Auto-Retry Partial Fills**: Partial fills unlock margin proportionally and assign a pre-generated retry ID to cleanly handle unfilled quantity retries without double-execution race conditions.
*   **Connection Health**: The session panel reports measured ping, jitter, route (`Direct P2P` or `TURN relay` where browser stats are available), last host tick, synchronization state, session duration, and host-side connected-client status.
*   **Resilient WebRTC Lifecycle**: Features 12-second join timeout guards, atomic news draining, duplicate tick push guards, XSS-safe DOM node creation, immediate peer-close cleanup, and a 15-second heartbeat timeout for peers that disappear without sending a close event.

### Multiplayer Network Notes

The host is the browser that creates the room; it must remain open for the session to continue. Multiplayer connections use WebRTC. Most networks connect directly, but restrictive networks, VPNs, and some carrier-grade NAT configurations may require a TURN relay. A GitHub Pages deployment hosts the static app only and does not itself provide a TURN server.

The **Connection Health** panel is role-aware:

* **Clients** see the measured round-trip ping to the host, jitter derived from recent pings, time since the last received host tick, sync status, route detection, and session duration.
* **Hosts** see active client count, host-to-client ping and jitter, broadcast activity, route detection for an active peer, and session duration. Disconnected or unresponsive peers are removed from the peer list automatically.

---

## ðŸ“ Project Structure

The codebase is highly modular, separating core engine logic from UI events, technical indicators, multiplayer networking, and feature modules:

```text
tradingterminal/
â”œâ”€â”€ index.html              # The main single-page application view
â”œâ”€â”€ studio.html             # The standalone Algorithmic Bot IDE window
â”œâ”€â”€ server.js               # Node.js static server for local development
â”œâ”€â”€ start.bat               # One-click Windows launch script
â”œâ”€â”€ vercel.json             # Vercel deployment config (headers, rewrites, CSP)
â”œâ”€â”€ README.md               # Documentation
â”œâ”€â”€ eslint.config.mjs       # Strict linting rules for the codebase
â”œâ”€â”€ package.json            # Node/NPM dependencies & dev scripts
â”œâ”€â”€ css/
â”‚   â””â”€â”€ styles.css          # Core design system, glassmorphism, responsive layout
â”œâ”€â”€ components/             # Reusable UI view templates (view-terminal, view-multiplayer, etc.)
â”œâ”€â”€ tests/
â”‚   â””â”€â”€ indicators.test.js  # Unit tests â€” imports directly from js/math-utils.js
â””â”€â”€ js/
    â”œâ”€â”€ app.js              # Core initialization, rendering loop, and state management engine
    â”œâ”€â”€ bot.js              # Algorithmic Bot execution sandbox & API interfaces
    â”œâ”€â”€ charts.js           # Canvas/SVG charting (Candlesticks, RSI, MACD, VWAP, Bollinger Bands)
    â”œâ”€â”€ customization.js    # Themes (Dark, Cyberpunk, Light, Sepia), font selectors, UI preferences
    â”œâ”€â”€ data.js             # Asset definitions, sector base volumes, fundamental constants
    â”œâ”€â”€ investments.js      # Mutual Funds, Daily SIP automation, IPO lotteries, Real Estate
    â”œâ”€â”€ main.js             # Component mounting & entry point bootstrapping
    â”œâ”€â”€ math-utils.js       # Pure math utilities (SMA, stdNormCDF/PDF, escapeHTML, fmtPrice)
    â”œâ”€â”€ multiplayer.js      # WebRTC PeerJS multiplayer engine, host/client state sync
    â”œâ”€â”€ news.js             # Macroeconomic news engine & asset correlation matrix
    â”œâ”€â”€ options.js          # Black-Scholes pricing model, Option Chains, multi-leg strategies
    â”œâ”€â”€ storage.js          # localStorage adapter for simulation persistence
    â”œâ”€â”€ studio.js           # CodeMirror IDE logic for the algorithmic studio
    â”œâ”€â”€ syndicate.js        # Black Market crate system & insider perk logic
    â””â”€â”€ ui_events.js        # Global DOM event listeners & user interactions
```

---

## ðŸ§® Simulation Engine & Math Models

We don't just generate random numbers. The engine simulates a professional trading environment:

*   **Stochastic Calculus (GBM)**: Tick generation mimics Geometric Brownian Motion, factoring in asset-specific volatility and drift.
*   **Live FX Simulation**: Exchange rates (USD, CNY, JPY, GBP, EUR, HKD, AUD, CAD, CHF) drift Â±0.3% per simulated day using the seeded PCG RNG, capped at Â±15% of their baseline values â€” making cross-currency trades feel dynamic over time.
*   **Order Book & Liquidity**: Level 2 Order Books scale dynamically based on Base Volume. Large market orders *will* suffer from slippage.
*   **Options Pricing & Greeks**: Dynamic premium decay (Theta) and elasticity (Delta, Gamma, Vega, Rho) calculated using Black-Scholes formulas.
*   **Technical Analysis Plugins**: Real-time recalculation of VWAP, RSI (14), MACD (12, 26, 9), SMA, EMA, and Bollinger Bands.
*   **Macro Correlation**: Global assets are linked via a Correlation Matrix. A single news event can trigger sector-wide rallies or market crashes.

---

## ðŸ”¥ Every Nudge & Feature

### ðŸ“Š 1. Market Microstructure & Charting
*   **Realistic Liquidity**: Orders consume bid/ask order book depth with dynamic slippage.
*   **Global Exchanges**: NYSE, NASDAQ, NSE, TSE, HKEX, LSE with timezone synchronization.
*   **Circuit Breakers**: Extreme volatility triggers upper/lower circuit halts, locking trading until reset.
*   **Technical Charting**: Candlestick toggle, volume bars, technical indicators (VWAP, RSI, MACD, SMA/EMA, Bollinger Bands), and canvas drawing tools.

### âš¡ 2. Order Execution & High-Contrast UI
*   **Order Types**: Market, Limit, Stop, and Stop-Limit orders.
*   **Time-in-Force (TIF)**: DAY, Immediate or Cancel (IOC), Fill or Kill (FOK).
*   **Modern Action Controls**: Redesigned glowing emerald **BUY** and rose crimson **SELL / SHORT** buttons with high visibility and subtle micro-animations.
*   **Margin & Risk**: Strict position caps, margin locks, trailing stop-losses (TSL), target auto-squareoff, short selling escrows, and live P&L tracking.

### ðŸŒ 3. Real-Time WebRTC Multiplayer
*   **Host or Join Markets**: Share 4-digit room codes to host multi-trader sessions.
*   **Shared Market Clock**: Client clocks pause automatically and sync to the host's tick speed.
*   **Remote Order Execution**: Client orders route to the host's matching engine with instant fill confirmation, partial fill auto-retry, or rejection feedback.

### ðŸ“‰ 4. Derivatives & Option Chains
*   **Calls & Puts**: Trade synthetic option contracts across strike prices.
*   **Interactive Option Chain**: Visual option chain modal showing live strike prices, bids, asks, and volume.
*   **Multi-Leg Strategies**: Execute Straddles, Strangles, Bull/Bear Spreads, and Iron Condors with auto-calculated margin requirements.
*   **Live Greeks**: Monitor real-time Delta, Gamma, Theta, Vega, and Rho tick-by-tick.

### ðŸ¤– 5. Algorithmic Bot Studio
*   **Embedded IDE**: CodeMirror IDE for building automated trading algorithms.
*   **JavaScript Sandbox**: Access tick streams, technical indicators, and portfolio API.
*   **Backtesting & HFT Models**: Pre-built momentum and mean-reversion strategies with backtest visualizations.

### ðŸ¦ 6. Dalal Bank & Credit System
*   **CIBIL Credit Score**: Dynamic credit rating (300â€“900) based on financial discipline.
*   **Margin Loans & Foreclosure**: High-leverage loans with daily EMI deductions and early foreclosure options.
*   **Fixed Deposits**: Park excess capital in FDs with risk-free compounding returns and premature break options.
*   **Automatic Liquidations**: Margin call default triggers asset liquidation.

### ðŸ™ï¸ 7. Alternative Investments
*   **IPOs**: Bid for lotteries in upcoming initial public offerings with allotment notifications.
*   **Mutual Funds & Daily SIPs**: Invest in global equity, debt, and index funds with automated Systematic Investment Plans (SIPs).
*   **Real Estate Portfolio**: Purchase residential and commercial properties globally to collect recurring rental income.

### ðŸ•¶ï¸ 8. The Syndicate (Black Market)
*   **Crates & Loot Boxes**: Unlock Bronze, Silver, or Gold crates for random market perks.
*   **Insider Buffs**: Activate temporary perks like **Brokerage Holiday**, **Circuit Override**, or **Privileged News Access**.

### ðŸ“° 9. Dynamic Macro News Engine
*   **Correlated Shocks**: Live news ticker firing macroeconomic events that directly trigger market rallies or crashes.

---

## ðŸŽ® How to Play

1.  **The Daily Cycle**: Trade during market hours, then click **Start Next Day** to process settlements, option decay, and loan EMIs.
2.  **Order Execution**: Enter quantity, set Stop-Loss or Target, and click the emerald **BUY** or crimson **SELL / SHORT** buttons.
3.  **Derivatives & Options**: Open the **Option Chain** modal to trade call/put strategies or monitor option Greeks.
4.  **Multiplayer Mode**: Click **Multiplayer**, select **Host**, and share your room code with friends to run a shared live market session!

---

## ðŸ’» Quick Start

No database or build setup required. Just pure client-side power.

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/tradingterminal.git

# 2. Enter the directory
cd tradingterminal

# 3. Open index.html directly in your browser, or start the optional local server:
node server.js
```

> [!TIP]
> **Pro Tip:** You can also double-click `start.bat` on Windows to launch the local web application server instantly!

---

## Deploying to GitHub Pages

This is a zero-build static site. The included workflow at
`.github/workflows/static.yml` publishes it to GitHub Pages whenever changes
are pushed to `main`.

1. Create a repository on GitHub and push this project to its `main` branch.
2. On GitHub, open **Settings** → **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push a commit (or run **Deploy static content to Pages** from the Actions
   tab). When it completes, GitHub will show the live site URL.

For a project repository, the URL is normally:

```
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

All application paths are relative, so the site works from this project URL
without any build configuration. GitHub Pages serves the static client only;
the optional `server.js` is for local development and is not used in hosting.

---

## ðŸš€ Deploying to Vercel

This project is a **zero-build static site** and deploys to Vercel with no configuration needed beyond what's already in `vercel.json`.

```bash
# Option A â€” Vercel CLI
npx vercel login
npx vercel --prod
```

**Option B â€” GitHub Integration (recommended)**
1. Push the repository to GitHub
2. Go to [vercel.com](https://vercel.com) â†’ **New Project** â†’ Import your repo
3. Leave all build settings blank â€” Vercel will detect the static site automatically
4. Click **Deploy** âœ…

The `vercel.json` already configures:
- `/studio` clean URL rewrite â†’ `studio.html`
- Cache-Control headers for `/js/` and `/css/` assets
- Content-Security-Policy allowing PeerJS WebRTC connections
- `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` security headers

---

## ðŸ§ª Running Tests

The test suite imports directly from `js/math-utils.js` â€” the shared source of truth for pure math utilities â€” so tests always validate production code, never a hand-rolled duplicate.

```bash
npm test
```

Current coverage: **11 tests** across SMA sliding window, Black-Scholes CDF/PDF, price formatting (INR/USD), and HTML sanitization.

---

## ðŸ›¡ Security Note

*   **XSS Prevention**: All user-facing dynamic content uses `escapeHTML()` or safe `textContent`/`createElement` DOM APIs. News items from multiplayer peers are built entirely with DOM nodes, never `innerHTML`.
*   **Ticker Injection Guard**: Bot stat table rows escape ticker names before interpolating them into `onclick` attribute strings.
*   **Multiplayer Data Validation**: All WebRTC messages are validated and JSON-parsed in `try/catch` blocks before modifying state.
*   **Strict Math Guards**: Floating-point sanitization prevents `NaN` and `Infinity` from entering position calculations.
*   **Security Headers**: CSP, `X-Frame-Options`, and `X-Content-Type-Options` headers served on every response via `vercel.json`.

---

## ðŸ“„ License
This project is licensed under the MIT License - see the `LICENSE` file for details.

