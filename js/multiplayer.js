import { toast, marketStocks, state, processEquityTrade, stockMap } from './app.js';

export let isMultiplayerHost = false;
export let isMultiplayerClient = false;
export let peer = null;
export let hostConnection = null;
// Bug 2 fix: never reassign this array — mutate in-place so external importers
// always hold a live reference to the same array object.
export let clientConnections = [];
export let roomCode = "";

// Bug 5 fix: use an array so multiple news events in the same tick are all broadcast
let _pendingNews = [];

// Bug 1 fix: set after SYNC_STATE so the next MARKET_TICK skips the history push
// to avoid duplicating prices already copied during sync.
let _syncJustApplied = false;

// Bug 6 fix: handle for the join-timeout so it can be cancelled on success/error
let _joinTimeoutHandle = null;
let _latencyInterval = null;
let _hostLatencyInterval = null;
let _healthInterval = null;
let _latencySamples = [];
let _lastHostTickAt = null;
let _marketSynced = false;
let _sessionStartedAt = null;
let _connectionRoute = "--";
const PEER_HEARTBEAT_TIMEOUT_MS = 15000;
const _lastPeerResponseAt = new WeakMap();

// Called by app.js whenever a news item fires, so we can piggyback it on the next tick
export function queueNewsForBroadcast(newsItem) {
    // newsItem = { text, market, impact, timeStr }
    _pendingNews.push(newsItem);
}

// Generate a random 4-character hex code for the room
function generateRoomCode() {
    return "DALAL-" + Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, '0');
}

// Convenience wrapper matching app.js toast(title, body, type) signature
function notify(title, body, type) {
    toast(title, body, type);
}

export function initMultiplayer() {
    const hostBtn = document.getElementById("btn-mp-host");
    const joinBtn = document.getElementById("btn-mp-join");
    const discBtn = document.getElementById("btn-mp-disconnect");
    if (hostBtn) hostBtn.addEventListener("click", hostGame);
    if (joinBtn) joinBtn.addEventListener("click", joinGame);
    if (discBtn) discBtn.addEventListener("click", disconnect);
}

function updateUIConnected(role, code) {
    let hc = document.getElementById("mp-host-card"); if (hc) hc.style.display = "none";
    let jc = document.getElementById("mp-join-card"); if (jc) jc.style.display = "none";
    let sc = document.getElementById("mp-status-card"); if (sc) sc.style.display = "block";
    let rt = document.getElementById("mp-role-text"); if (rt) rt.innerText = "Role: " + role;
    let cd = document.getElementById("mp-room-code-display"); if (cd) cd.innerText = code;
    _sessionStartedAt = Date.now();
    _lastHostTickAt = null;
    _marketSynced = role === "Host";
    _connectionRoute = role === "Host" ? "Waiting for peer" : "Checking...";
    _latencySamples = [];
    setConnectionHealth(role === "Client" ? "Connection: Measuring ping..." : "Connection: Stable · Hosting");
    renderConnectionDetails();
}

function setConnectionHealth(message) {
    const health = document.getElementById("mp-health-text");
    if (health) health.textContent = message;
}

function setHealthDetail(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

function formatSessionDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingSeconds = String(seconds % 60).padStart(2, "0");
    return (hours > 0 ? hours + "h " : "") + (minutes % 60) + "m " + remainingSeconds + "s";
}

function getJitter() {
    if (_latencySamples.length < 2) return null;
    const average = _latencySamples.reduce((sum, value) => sum + value, 0) / _latencySamples.length;
    const variance = _latencySamples.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / _latencySamples.length;
    return Math.round(Math.sqrt(variance));
}

function renderConnectionDetails() {
    const jitter = getJitter();
    const lastTickAge = _lastHostTickAt === null ? "--" : Math.max(0, (Date.now() - _lastHostTickAt) / 1000).toFixed(1) + "s ago";
    const hostPeerStatus = clientConnections.length === 0 ? "Waiting for peer" : _connectionRoute;
    setHealthDetail("mp-route-text", "Route: " + (isMultiplayerHost ? hostPeerStatus : _connectionRoute));
    setHealthDetail("mp-jitter-text", "Jitter: " + (jitter === null ? "--" : "±" + jitter + " ms"));
    setHealthDetail("mp-last-tick-text", "Last host tick: " + lastTickAge);
    setHealthDetail("mp-sync-text", "Market state: " + (isMultiplayerHost ? "Broadcasting" : (_marketSynced ? "Synced" : "Syncing...")));
    setHealthDetail("mp-session-text", "Session: " + (_sessionStartedAt === null ? "--" : formatSessionDuration(Date.now() - _sessionStartedAt)));
}

function startLatencyProbe() {
    stopLatencyProbe();
    const pingHost = () => {
        if (!hostConnection || !hostConnection.open) return;
        hostConnection.send(JSON.stringify({ type: 'PING', sentAt: Date.now() }));
    };
    pingHost();
    _latencyInterval = setInterval(pingHost, 5000);
    startHealthTimer();
    detectConnectionRoute();
}

function startHealthTimer() {
    if (_healthInterval) clearInterval(_healthInterval);
    _healthInterval = setInterval(() => {
        renderConnectionDetails();
        detectConnectionRoute();
    }, 1000);
}

function startHostLatencyProbe() {
    if (_hostLatencyInterval) clearInterval(_hostLatencyInterval);
    const pingClients = () => {
        [...clientConnections].forEach(conn => {
            const lastResponse = _lastPeerResponseAt.get(conn) || 0;
            if (!conn.open || Date.now() - lastResponse > PEER_HEARTBEAT_TIMEOUT_MS) {
                try { conn.close(); } catch (_) {}
                removeClientConnection(conn, "Connection to a trader timed out.");
                return;
            }
            conn.send(JSON.stringify({ type: 'HOST_PING', sentAt: Date.now() }));
        });
    };
    pingClients();
    _hostLatencyInterval = setInterval(pingClients, 5000);
}

function removeClientConnection(conn, message) {
    const index = clientConnections.indexOf(conn);
    if (index === -1) return;
    clientConnections.splice(index, 1);
    if (clientConnections.length === 0) _connectionRoute = "Waiting for peer";
    notify("Trader Left", message || "A trader disconnected from your market.", "info");
    updateClientList();
    renderConnectionDetails();
}

function stopLatencyProbe() {
    if (_latencyInterval) {
        clearInterval(_latencyInterval);
        _latencyInterval = null;
    }
    if (_healthInterval) {
        clearInterval(_healthInterval);
        _healthInterval = null;
    }
    if (_hostLatencyInterval) {
        clearInterval(_hostLatencyInterval);
        _hostLatencyInterval = null;
    }
}

async function detectConnectionRoute() {
    const connectionSource = hostConnection || clientConnections[0];
    const connection = connectionSource && connectionSource.peerConnection;
    if (!connection || typeof connection.getStats !== "function") return;
    try {
        const stats = await connection.getStats();
        let selectedPair = null;
        stats.forEach(report => {
            if (report.type === "candidate-pair" && (report.selected || (report.nominated && report.state === "succeeded"))) {
                selectedPair = report;
            }
        });
        if (!selectedPair) return;
        const local = stats.get(selectedPair.localCandidateId);
        const remote = stats.get(selectedPair.remoteCandidateId);
        _connectionRoute = (local && local.candidateType === "relay") || (remote && remote.candidateType === "relay")
            ? "TURN relay"
            : "Direct P2P";
        renderConnectionDetails();
    } catch (_) {
        // Route inspection is optional; the data connection continues normally.
    }
}

function updateUIDisconnected() {
    let hc = document.getElementById("mp-host-card"); if (hc) hc.style.display = "block";
    let jc = document.getElementById("mp-join-card"); if (jc) jc.style.display = "block";
    let sc = document.getElementById("mp-status-card"); if (sc) sc.style.display = "none";
    let pu = document.getElementById("mp-peers-ul"); if (pu) pu.innerHTML = "";
}

function updateClientList() {
    let ul = document.getElementById("mp-peers-ul");
    if (!ul) return;
    ul.innerHTML = "";
    if (isMultiplayerHost) {
        clientConnections.forEach(conn => {
            let li = document.createElement("li");
            li.innerText = "🟢 Peer: " + conn.peer;
            ul.appendChild(li);
        });
    } else if (isMultiplayerClient && hostConnection) {
        let li = document.createElement("li");
        li.innerText = "🟢 Host: " + hostConnection.peer;
        ul.appendChild(li);
    }
}

export function hostGame() {
    // Bug 6 fix: block if already in any multiplayer session
    if (peer || isMultiplayerHost || isMultiplayerClient) return;
    roomCode = generateRoomCode();
    
    peer = new Peer(roomCode);
    
    peer.on('open', (id) => {
        isMultiplayerHost = true;
        isMultiplayerClient = false;
        notify("Hosting Started", "Room code: " + id + "\nShare this with others!", "success");
        updateUIConnected("Host", id);
        startHealthTimer();
        startHostLatencyProbe();
    });

    peer.on('connection', (conn) => {
        clientConnections.push(conn);
        _lastPeerResponseAt.set(conn, Date.now());
        _connectionRoute = "Checking...";
        notify("Trader Joined", "A new trader connected to your market!", "success");
        updateClientList();

        let syncFn = () => {
            let fullState = {
                type: 'SYNC_STATE',
                stocks: marketStocks.map(s => ({
                    // Bug 2 fix: include all price fields so the client renders
                    // correct prices immediately instead of waiting for the next tick
                    ticker: s.ticker,
                    ltp: s.ltp,
                    open: s.open,
                    base: s.base,
                    volume: s.volume,
                    circuitHit: s.circuitHit,
                    ask: s.ask,
                    bid: s.bid,
                    available_liquidity: s.available_liquidity,
                    haltUntil: s.haltUntil,
                    history: s.history,
                    volumeHistory: s.volumeHistory
                }))
            };
            conn.send(JSON.stringify(fullState));
        };
        const onClientOpen = () => {
            syncFn();
            startHostLatencyProbe();
            detectConnectionRoute();
            renderConnectionDetails();
        };
        if (conn.open) onClientOpen();
        else conn.on('open', onClientOpen);
        detectConnectionRoute();
        renderConnectionDetails();

        conn.on('data', (data) => {
            handleClientData(conn, data);
        });

        conn.on('close', () => {
            removeClientConnection(conn);
        });
    });

    peer.on('error', (err) => {
        // Bug 6 fix: handle unavailable-id gracefully
        if (err.type === 'unavailable-id') {
            notify("Room Taken", "Code " + roomCode + " is taken. Trying a new one...", "info");
            peer.destroy();
            peer = null;
            isMultiplayerHost = false;
            setTimeout(hostGame, 500); // retry with a new code
        } else {
            notify("WebRTC Error", err.type, "error");
            disconnect();
        }
    });
}

export function joinGame() {
    // Bug 6 fix: block if already in any multiplayer session
    if (peer || isMultiplayerHost || isMultiplayerClient) return;
    let code = document.getElementById("mp-join-code").value.trim().toUpperCase();
    if (!code) {
        notify("Missing Code", "Please enter a room code to join.", "error");
        return;
    }
    
    peer = new Peer();
    
    peer.on('open', (id) => {
        hostConnection = peer.connect(code);

        // Bug 6 fix: timeout if host never responds within 12 seconds
        _joinTimeoutHandle = setTimeout(() => {
            if (!isMultiplayerClient) {
                notify("Join Timeout", "Host did not respond for code: " + code + ". Please try again.", "error");
                disconnect();
            }
        }, 12000);
        
        hostConnection.on('open', () => {
            // Bug 6 fix: cancel the join timeout now that we're connected
            if (_joinTimeoutHandle) {
                clearTimeout(_joinTimeoutHandle);
                _joinTimeoutHandle = null;
            }

            isMultiplayerClient = true;
            isMultiplayerHost = false;
            roomCode = code;
            
            // Bug 2 fix: stop the client's local simulation clock
            _stopClientClock();

            notify("Connected!", "Joined host market: " + code, "success");
            updateUIConnected("Client", code);
            startLatencyProbe();
            updateClientList();
        });

        hostConnection.on('data', (data) => {
            handleHostData(data);
        });

        hostConnection.on('close', () => {
            // Guard: if disconnect() already ran (e.g. user clicked disconnect),
            // this async close event must not fire a second "Disconnected" toast.
            if (!isMultiplayerClient) return;
            notify("Host Disconnected", "The host closed the market.", "error");
            disconnect();
        });
        
        hostConnection.on('error', (err) => {
            // Same guard: avoid double-disconnect if we're already tearing down.
            if (!isMultiplayerClient) return;
            notify("Connection Error", err.type, "error");
            disconnect();
        });
    });

    peer.on('error', (err) => {
        // Bug 6 fix: cancel join timeout on any peer error
        if (_joinTimeoutHandle) {
            clearTimeout(_joinTimeoutHandle);
            _joinTimeoutHandle = null;
        }
        if (err.type === 'peer-unavailable') {
            notify("Room Not Found", "No host found for code: " + code + ". Check the code and try again.", "error");
            // Bug 5 fix: cleanly close the half-open connection before nulling
            if (hostConnection) {
                try { hostConnection.close(); } catch(_) {}
                hostConnection = null;
            }
            peer.destroy();
            peer = null;
        } else {
            notify("WebRTC Error", err.type, "error");
            disconnect();
        }
    });
}

// Bug 2 fix: cleanly halt the client's local tick engine
// Bug 3 fix: one-shot guard so re-entrant 'open' events don't call the hook twice
let _clockStopped = false;
function _stopClientClock() {
    if (_clockStopped) return;
    _clockStopped = true;
    if (window._stopClientClockFn) {
        window._stopClientClockFn();
    } else {
        // Bug 4 fix: warn loudly if hook is missing so app.js can be wired up
        console.warn("[multiplayer] window._stopClientClockFn is not defined. " +
            "Client will run a parallel price simulation diverging from the host. " +
            "Wire up window._stopClientClockFn in app.js.");
    }
}

export function disconnect() {
    // Bug 6 fix: cancel any pending join timeout
    if (_joinTimeoutHandle) {
        clearTimeout(_joinTimeoutHandle);
        _joinTimeoutHandle = null;
    }
    stopLatencyProbe();
    _latencySamples = [];
    _lastHostTickAt = null;
    _marketSynced = false;
    _sessionStartedAt = null;
    _connectionRoute = "--";

    // Bug 1 fix: only restart the local clock if WE were the client
    const wasClient = isMultiplayerClient;

    // Bug 2 fix: close hostConnection BEFORE peer.destroy() so a clean
    // close frame is sent to the host (peer.destroy tears down all sockets).
    if (hostConnection) {
        try { hostConnection.close(); } catch(_) {}
        hostConnection = null;
    }

    if (peer) {
        peer.destroy();
        peer = null;
    }

    // Bug 2 fix: mutate in-place instead of reassigning to preserve external refs
    clientConnections.splice(0, clientConnections.length);

    isMultiplayerHost = false;
    isMultiplayerClient = false;
    _pendingNews.splice(0); // Bug 1 fix: drain in-place rather than reassign
    _syncJustApplied = false;
    _clockStopped = false; // Bug 3 fix: reset one-shot guard for future sessions

    // Bug 8 fix: clear the stale room code
    roomCode = "";

    // Clear any stuck pendingHostFill flags from pending orders
    if (state && state.pendingOrders) {
        state.pendingOrders.forEach(o => o.pendingHostFill = null);
    }

    updateUIDisconnected();
    notify("Disconnected", "Left the multiplayer session.", "info");

    // Restart local clock only if we were a client (host clock was never stopped)
    if (wasClient && window._restartClockFn) {
        window._restartClockFn();
    }
}

// ----------------------------------------------------------------------
// DATA PROTOCOL
// ----------------------------------------------------------------------

export function broadcastMarketTick(stateObj, stocksArr) {
    if (!isMultiplayerHost) return;
    _lastHostTickAt = Date.now();
    if (clientConnections.length === 0) {
        _pendingNews.splice(0); // Bug D fix: flush stale news if no clients (splice in-place for consistency)
        return;
    }

    let payload = {
        type: 'MARKET_TICK',
        time: stateObj.time,
        day: stateObj.day,
        ipos: stateObj.upcomingIPOs,
        stocks: stocksArr.map(s => ({
            ticker: s.ticker,
            ltp: s.ltp,
            open: s.open,
            base: s.base,
            volume: s.volume,
            circuitHit: s.circuitHit,
            ask: s.ask,
            bid: s.bid,
            available_liquidity: s.available_liquidity,
            haltUntil: s.haltUntil
        }))
    };

    // Bug 5 fix: flush the whole news array, not just 1 item
    // Bug 1 fix: use splice(0) to atomically drain — avoids dropping items queued
    // between the slice() copy and a reassignment.
    if (_pendingNews.length > 0) {
        payload.news = _pendingNews.splice(0); // atomically drains and returns all items
    }

    let payloadStr = JSON.stringify(payload);

    // Bug 3 fix: check conn.open before sending. Don't prune if false, it might just be connecting.
    // Let the 'close' event or the catch block handle dead connections.
    for (let i = clientConnections.length - 1; i >= 0; i--) {
        let conn = clientConnections[i];
        if (!conn.open) {
            continue;
        }
        try {
            conn.send(payloadStr);
        } catch(e) {
            // Connection dropped mid-send; remove it
            clientConnections.splice(i, 1);
        }
    }
}

// Client receives data from Host
function handleHostData(dataStr) {
    try {
        let msg = JSON.parse(dataStr);
        if (msg.type === 'HOST_PING' && typeof msg.sentAt === 'number') {
            if (hostConnection && hostConnection.open) hostConnection.send(JSON.stringify({ type: 'HOST_PONG', sentAt: msg.sentAt }));
        } else if (msg.type === 'PONG' && typeof msg.sentAt === 'number') {
            const latency = Math.max(0, Date.now() - msg.sentAt);
            _latencySamples.push(latency);
            if (_latencySamples.length > 12) _latencySamples.shift();
            setConnectionHealth("Connection: Stable · Ping: " + latency + " ms");
            renderConnectionDetails();
        } else if (msg.type === 'MARKET_TICK') {
            applyHostTickToClient(msg);
        } else if (msg.type === 'ORDER_FILLED') {
            // Bug B fix: handle order filled
            let stock = stockMap ? stockMap[msg.ticker] : null;
            if (stock) {
                if (msg.id && state && state.pendingOrders) {
                    let pOrder = state.pendingOrders.find(o => o.pendingHostFill === msg.id);
                    if (pOrder) {
                        if (pOrder.lockedMargin) {
                            let proportion = msg.qty / pOrder.qty;
                            let unlockAmt = pOrder.lockedMargin * proportion;
                            state.margin += unlockAmt;
                            pOrder.lockedMargin -= unlockAmt;
                        }
                        pOrder.qty -= msg.qty;
                        pOrder.pendingHostFill = null;
                        if (pOrder.qty <= 0) {
                            // Bug 2 fix: mutate in-place instead of reassigning
                            let _idx = state.pendingOrders.indexOf(pOrder);
                            if (_idx !== -1) state.pendingOrders.splice(_idx, 1);
                        }
                    }
                }
                // Bug 3 fix: verify client can afford the host's execution price
                // before applying the fill — host may have priced it differently.
                const EXCHANGE_RATES_REF = window._EXCHANGE_RATES || {};
                const fxRate = EXCHANGE_RATES_REF[stock.currency] || 1;
                const costINR = msg.price * msg.qty * fxRate;
                const pos = state && state.positions ? (state.positions[stock.ticker] || { qty: 0 }) : { qty: 0 };
                let affordable = true;
                if (msg.side === 'BUY' && pos.qty >= 0) {
                    if (state && state.margin < costINR) affordable = false;
                } else if (msg.side === 'SHORT' || (msg.side === 'SELL' && pos.qty <= 0)) {
                    if (state && state.margin < costINR * 0.2) affordable = false;
                }
                if (!affordable) {
                    toast('Order Cancelled', 'Insufficient margin to settle host-filled order: ' + msg.side + ' ' + msg.ticker, 'error');
                } else {
                    processEquityTrade(stock, msg.side, msg.qty, msg.price, false);
                }
                if (window.renderAllFromClient) window.renderAllFromClient();
            }
        } else if (msg.type === 'SYNC_STATE') {
            _marketSynced = true;
            msg.stocks.forEach(hs => {
                let localStock = stockMap ? stockMap[hs.ticker] : marketStocks.find(s => s.ticker === hs.ticker);
                if (localStock) {
                    // Bug 2 fix: apply all price fields from the sync snapshot so
                    // the client shows correct prices before the first MARKET_TICK
                    if (hs.ltp !== undefined)               localStock.ltp               = hs.ltp;
                    if (hs.open !== undefined)              localStock.open              = hs.open;
                    if (hs.base !== undefined)              localStock.base              = hs.base;
                    if (hs.volume !== undefined)            localStock.volume            = hs.volume;
                    if (hs.circuitHit !== undefined)        localStock.circuitHit        = hs.circuitHit;
                    if (hs.ask !== undefined)               localStock.ask               = hs.ask;
                    if (hs.bid !== undefined)               localStock.bid               = hs.bid;
                    if (hs.available_liquidity !== undefined) localStock.available_liquidity = hs.available_liquidity;
                    if (hs.haltUntil !== undefined)         localStock.haltUntil         = hs.haltUntil;
                    localStock.history = hs.history || [];
                    localStock.volumeHistory = hs.volumeHistory || [];
                }
            });
            // Bug 1 fix: flag so the next MARKET_TICK skips the history push
            _syncJustApplied = true;
            if (window.renderAllFromClient) window.renderAllFromClient();
        } else if (msg.type === 'PARTIAL_FILL') {
            // Partial fill: apply the filled portion, then auto-retry the remainder
            let stock = stockMap ? stockMap[msg.ticker] : null;
            if (stock) {
                // Clear the pending lock on the original order and reduce its qty
                if (msg.id && state && state.pendingOrders) {
                    let pOrder = state.pendingOrders.find(o => o.pendingHostFill === msg.id);
                    if (pOrder) {
                        if (pOrder.lockedMargin) {
                            let proportion = msg.qty / pOrder.qty;
                            let unlockAmt = pOrder.lockedMargin * proportion;
                            state.margin += unlockAmt;
                            pOrder.lockedMargin -= unlockAmt;
                        }
                        pOrder.qty -= msg.qty;
                        // Keep pendingHostFill = msg.id to link the upcoming retry
                    }
                }
                // Apply the partial trade to the client's portfolio
                const EXCHANGE_RATES_REF = window._EXCHANGE_RATES || {};
                const fxRate = EXCHANGE_RATES_REF[stock.currency] || 1;
                const costINR = msg.price * msg.qty * fxRate;
                const pos = state && state.positions ? (state.positions[stock.ticker] || { qty: 0 }) : { qty: 0 };
                let affordable = true;
                if (msg.side === 'BUY' && pos.qty >= 0) {
                    if (state && state.margin < costINR) affordable = false;
                } else if (msg.side === 'SHORT' || (msg.side === 'SELL' && pos.qty <= 0)) {
                    if (state && state.margin < costINR * 0.2) affordable = false;
                }
                if (!affordable) {
                    toast('Partial Fill Cancelled', 'Insufficient margin for partial fill: ' + msg.side + ' ' + msg.ticker, 'error');
                    if (msg.id && state && state.pendingOrders) {
                        let pOrder = state.pendingOrders.find(o => o.pendingHostFill === msg.id);
                        if (pOrder) {
                            if (pOrder.lockedMargin) state.margin += pOrder.lockedMargin;
                            // Bug 2 fix: mutate in-place instead of reassigning
                            let _idx = state.pendingOrders.indexOf(pOrder);
                            if (_idx !== -1) state.pendingOrders.splice(_idx, 1);
                        }
                    }
                } else {
                    processEquityTrade(stock, msg.side, msg.qty, msg.price, false);
                    // Bug 4 fix: use originalQty from host if available so the denominator
                    // is always the true original order size, even in multi-step partials
                    let _origQty = msg.originalQty != null ? msg.originalQty : (msg.qty + msg.remainingQty);
                    toast('Partial Fill', msg.qty + ' of ' + _origQty + ' ' + msg.ticker + ' filled. Retrying ' + msg.remainingQty + ' remaining...', 'info');
                }
                if (window.renderAllFromClient) window.renderAllFromClient();

                // Auto-retry the unfilled remainder after a short delay
                if (msg.remainingQty > 0 && affordable) {
                    let tif = msg.tif;
                    if (!tif && msg.id && state && state.pendingOrders) {
                        let p = state.pendingOrders.find(o => o.pendingHostFill === msg.id);
                        if (p) tif = p.tif;
                    }
                    if (tif === "IOC" || tif === "FOK") {
                        toast('Order Cancelled', tif + ': Remaining ' + msg.remainingQty + ' cancelled.', 'info');
                        if (msg.id && state && state.pendingOrders) {
                            let pOrder = state.pendingOrders.find(o => o.pendingHostFill === msg.id);
                            if (pOrder) {
                                if (pOrder.lockedMargin) state.margin += pOrder.lockedMargin;
                                // Bug 2 fix: mutate in-place instead of reassigning
                                let _idx = state.pendingOrders.indexOf(pOrder);
                                if (_idx !== -1) state.pendingOrders.splice(_idx, 1);
                            }
                        }
                    } else {
                        // Pre-generate the retry ID and set it as pendingHostFill BEFORE
                        // the setTimeout fires. This closes the race window where
                        // _evaluateClientPendingOrders (fired every market tick) sees
                        // pendingHostFill===null and double-sends the same remainder.
                        let retryId = "req_" + Math.random().toString(36).substring(2, 11);
                        if (msg.id && state && state.pendingOrders) {
                            let pOrder = state.pendingOrders.find(o => o.pendingHostFill === msg.id);
                            if (pOrder) pOrder.pendingHostFill = retryId;
                        }
                        setTimeout(() => {
                            sendOrderToHost(msg.ticker, msg.side, msg.remainingQty, retryId, tif);
                        }, 500);
                    }
                }
            }
        } else if (msg.type === 'ORDER_REJECTED') {
            // Bug B fix: handle order rejected
            toast("Order Rejected", msg.reason || "Trade invalid", "error");
            if (msg.id && state && state.pendingOrders) {
                let pOrder = state.pendingOrders.find(o => o.pendingHostFill === msg.id);
                if (pOrder) {
                    if (pOrder.tif === "FOK" || pOrder.tif === "IOC") {
                        if (pOrder.lockedMargin) state.margin += pOrder.lockedMargin;
                        // Bug 2 fix: mutate in-place instead of reassigning
                        let _idx = state.pendingOrders.indexOf(pOrder);
                        if (_idx !== -1) state.pendingOrders.splice(_idx, 1);
                    } else {
                        pOrder.pendingHostFill = null;
                    }
                }
            }
        }
    } catch(e) {
        console.error("Error parsing host data", e);
    }
}

// Host receives data from Client and executes the requested trade
function handleClientData(conn, dataStr) {
    // Guard: if the client connection dropped before we process, silently ignore
    if (!conn.open) return;
    try {
        let msg = JSON.parse(dataStr);
        if (msg.type === 'HOST_PONG' && typeof msg.sentAt === 'number') {
            _lastPeerResponseAt.set(conn, Date.now());
            const latency = Math.max(0, Date.now() - msg.sentAt);
            _latencySamples.push(latency);
            if (_latencySamples.length > 12) _latencySamples.shift();
            setConnectionHealth("Connection: Stable · " + clientConnections.length + " client" + (clientConnections.length === 1 ? "" : "s") + " · Ping: " + latency + " ms");
            renderConnectionDetails();
        } else if (msg.type === 'PING' && typeof msg.sentAt === 'number') {
            conn.send(JSON.stringify({ type: 'PONG', sentAt: msg.sentAt }));
        } else if (msg.type === 'PLACE_ORDER') {
            // Host logic: Execute the client's market order against current limits
            if (typeof msg.qty !== 'number' || isNaN(msg.qty) || msg.qty <= 0) {
                if (conn.open) conn.send(JSON.stringify({ type: 'ORDER_REJECTED', reason: 'Invalid quantity', id: msg.id }));
                return;
            }

            let stock = stockMap ? stockMap[msg.ticker] : null;
            if (!stock) {
                // Bug fix: notify client their order failed rather than silently dropping it
                if (conn.open) conn.send(JSON.stringify({ type: 'ORDER_REJECTED', reason: 'Unknown ticker', id: msg.id }));
                return;
            }

            if (stock.haltUntil && state.time < stock.haltUntil) {
                if (conn.open) conn.send(JSON.stringify({ type: 'ORDER_REJECTED', reason: 'Stock is currently halted due to circuit limits', id: msg.id }));
                return;
            }

            if (msg.tif === 'FOK' && stock.available_liquidity !== undefined && stock.available_liquidity < msg.qty) {
                if (conn.open) conn.send(JSON.stringify({ type: 'ORDER_REJECTED', reason: 'FOK: Insufficient liquidity', id: msg.id }));
                return;
            }

            let fillQty = msg.qty;
            let remainingQty = 0;
            if (stock.available_liquidity !== undefined) {
                fillQty = Math.min(msg.qty, stock.available_liquidity);
                if (fillQty <= 0) {
                    if (conn.open) conn.send(JSON.stringify({ type: 'ORDER_REJECTED', reason: 'Insufficient liquidity', id: msg.id }));
                    return;
                }
                remainingQty = msg.qty - fillQty;
                stock.available_liquidity -= fillQty;
            }
            let spread = stock.bidAskSpread || 0;
            let executionPrice = (msg.side === "BUY" || msg.side === "COVER")
                ? stock.ltp + spread
                : Math.max(0.0001, stock.ltp - spread);
            let pDecimals = stock.ltp < 10 ? 4 : 2;
            executionPrice = parseFloat(executionPrice.toFixed(pDecimals));

            if (remainingQty > 0) {
                // Partial fill: tell client what was filled and how much is left to retry
                if (conn.open) conn.send(JSON.stringify({
                    type: 'PARTIAL_FILL',
                    ticker: msg.ticker,
                    side: msg.side,
                    qty: fillQty,
                    remainingQty: remainingQty,
                    // Bug 4 fix: send the original total qty so the client toast
                    // shows the correct denominator even across multi-step partials
                    originalQty: msg.qty,
                    price: executionPrice,
                    id: msg.id,
                    tif: msg.tif
                }));
                // Bug 5 fix: host records partial fills in its own market state
                processEquityTrade(stock, msg.side, fillQty, executionPrice, false);
            } else {
                // Full fill
                if (conn.open) conn.send(JSON.stringify({
                    type: 'ORDER_FILLED',
                    ticker: msg.ticker,
                    side: msg.side,
                    qty: fillQty,
                    price: executionPrice,
                    id: msg.id
                }));
                // Bug 5 fix: host records the full fill in its own market state
                processEquityTrade(stock, msg.side, fillQty, executionPrice, false);
            }
        }
    } catch(e) {
        console.error("Error parsing client data", e);
    }
}

// Apply the received tick data to the client's local marketStocks array
function applyHostTickToClient(msg) {
    if (!marketStocks) return;
    _lastHostTickAt = Date.now();
    
    // Sync state time/day
    if (window._tickClientEngine) {
        window._tickClientEngine(msg.day, msg.time);
    } else if (window.setClientTime) {
        window.setClientTime(msg.day, msg.time);
    }

    // Sync IPO state
    if (msg.ipos) {
        let localBids = {};
        let localStatus = {};
        if (state.upcomingIPOs) {
            state.upcomingIPOs.forEach(ipo => {
                localBids[ipo.id] = ipo.userBids;
                localStatus[ipo.id] = ipo.status;
            });
        }
        
        state.upcomingIPOs = msg.ipos;
        
        // Restore local bids so clients don't lose their IPO margin/bids
        state.upcomingIPOs.forEach(ipo => {
            if (localBids[ipo.id]) {
                ipo.userBids = localBids[ipo.id];
                
                // Bug E fix: Client local IPO resolution
                if (localStatus[ipo.id] === 'OPEN' && ipo.status === 'LISTED') {
                    if (ipo.userBids && ipo.userBids.lots > 0) {
                        let allotmentChance = 1.0;
                        if (ipo.oversubscription > 1) allotmentChance = 1.0 / (ipo.oversubscription * 0.5);
                        
                        if (Math.random() < allotmentChance) {
                            let qty = ipo.userBids.lots * ipo.lotSize;
                            let fxRate = window._EXCHANGE_RATES ? (window._EXCHANGE_RATES[ipo.currency] || 1) : 1;
                            let shareCostINR = qty * ipo.issuePrice * fxRate;
                            
                            state.margin += ipo.userBids.marginBlocked;
                            state.margin -= shareCostINR;
                            
                            if (!state.positions[ipo.ticker]) {
                                state.positions[ipo.ticker] = { qty: 0, avgPrice: 0, type: "EQUITY" };
                            }
                            state.positions[ipo.ticker].qty += qty;
                            state.positions[ipo.ticker].avgPrice = ipo.issuePrice;
                            
                            toast("IPO ALLOTMENT SUCCESS", "You were allotted " + qty + " shares of " + ipo.ticker + "!\nView them in your Terminal Positions.", "success");
                        } else {
                            state.margin += ipo.userBids.marginBlocked;
                            toast("IPO ALLOTMENT FAILED", "You were NOT allotted shares of " + ipo.ticker + ". \u20b9" + ipo.userBids.marginBlocked.toFixed(2) + " refunded.", "error");
                        }
                    }
                    ipo.userBids.lots = 0;
                    ipo.userBids.marginBlocked = 0;
                }
            } else {
                ipo.userBids = { lots: 0, marginBlocked: 0 };
            }
        });
    }

    // Bug 1 fix: if a SYNC_STATE was just applied, skip this tick's history push
    // to avoid duplicating the prices already loaded from sync.
    const skipHistoryPush = _syncJustApplied;
    _syncJustApplied = false;
    
    msg.stocks.forEach(hs => {
        // Bug C fix: use O(1) lookup instead of O(n) find()
        let localStock = stockMap ? stockMap[hs.ticker] : marketStocks.find(s => s.ticker === hs.ticker);
        if (localStock) {
            localStock._prevTick = localStock.ltp;
            localStock.ltp = hs.ltp;
            localStock.open = hs.open;
            localStock.base = hs.base;
            localStock.volume = hs.volume;
            localStock.circuitHit = hs.circuitHit;
            localStock.ask = hs.ask;
            localStock.bid = hs.bid;
            if (hs.available_liquidity !== undefined) {
                localStock.available_liquidity = hs.available_liquidity;
            }
            if (hs.haltUntil !== undefined) {
                localStock.haltUntil = hs.haltUntil;
            }
            
            // Bug 1 & 10 fix: skip push right after sync (avoids duplicate), and
            // skip when price is unchanged (avoids redundant duplicate-tick entries).
            if (!skipHistoryPush && localStock._prevTick !== hs.ltp) {
                localStock.history.push(hs.ltp);
                localStock.volumeHistory.push(hs.volume);
                if (localStock.history.length > 500) localStock.history.shift();
                if (localStock.volumeHistory.length > 500) localStock.volumeHistory.shift();
            }
        }
    });

    // Bug 5 fix: inject all queued news items from this tick
    if (msg.news && Array.isArray(msg.news)) {
        msg.news.forEach(n => _injectNewsOnClient(n));
    }

    _evaluateClientPendingOrders();

    // Trigger UI render
    if (window.renderAllFromClient) {
        window.renderAllFromClient();
    }
}

function _evaluateClientPendingOrders() {
    if (!state || !state.pendingOrders || state.pendingOrders.length === 0) return;

    // Bug 3 fix: collect orders to remove AFTER the loop to avoid mutating the
    // array while iterating over it, which could cause skipped entries or
    // stale-reference issues after disconnect purges the array.
    const toRemove = [];

    state.pendingOrders.forEach(order => {
        if (order.pendingHostFill) return;
        
        let stock = stockMap ? stockMap[order.ticker] : null;
        if (!stock || (stock.haltUntil && state.time < stock.haltUntil)) return;

        let triggered = false;
        if (order.orderType === 'MARKET') {
            triggered = true;
        } else {
            let spread = stock.bidAskSpread || 0;
            let ask = stock.ltp + spread;
            let bid = Math.max(0.0001, stock.ltp - spread);
            if (order.orderType === "STOP") {
                if ((order.side === "BUY" || order.side === "COVER") && ask >= order.limitPrice) triggered = true;
                if ((order.side === "SELL" || order.side === "SHORT") && bid <= order.limitPrice) triggered = true;
            } else {
                if ((order.side === "BUY" || order.side === "COVER") && ask <= order.limitPrice) triggered = true;
                if ((order.side === "SELL" || order.side === "SHORT") && bid >= order.limitPrice) triggered = true;
            }
        }

        if (triggered) {
            if (stock.circuitHit === "UC" && (order.side === "BUY" || order.side === "COVER")) return;
            if (stock.circuitHit === "LC" && (order.side === "SELL" || order.side === "SHORT")) return;

            let avail = stock.available_liquidity || 0;
            if (order.tif === "FOK" && avail < order.qty) {
                toast("Order Cancelled", "FOK: Insufficient liquidity to fill " + order.side + " " + order.ticker + ".", "error");
                if (order.lockedMargin) state.margin += order.lockedMargin;
                toRemove.push(order); // Bug 3 fix: defer removal
                return;
            }
            if (avail > 0) {
                let fillQty = Math.min(order.qty, avail);
                let newId = sendOrderToHost(stock.ticker, order.side, fillQty, null, order.tif);
                if (newId) order.pendingHostFill = newId;
            } else {
                if (order.tif === "IOC") {
                    let oName = order.orderType === "STOP" ? "STOP" : (order.orderType === "LIMIT" ? "Limit" : "Market");
                    toast("Order Cancelled", "IOC: Remaining " + order.qty + " shares of " + oName + " " + order.ticker + " cancelled due to lack of liquidity.", "info");
                    if (order.lockedMargin) state.margin += order.lockedMargin;
                    toRemove.push(order); // Bug 3 fix: defer removal
                }
            }
        }
    });

    // Bug 3 fix: apply all removals in a single pass after iteration is complete
    // Bug 2 fix: splice in-place instead of filter+reassign to preserve external refs
    if (toRemove.length > 0) {
        for (let i = state.pendingOrders.length - 1; i >= 0; i--) {
            if (toRemove.includes(state.pendingOrders[i])) state.pendingOrders.splice(i, 1);
        }
    }
}

function _injectNewsOnClient(newsItem) {
    toast("NEWS", newsItem.text, newsItem.impact >= 0 ? 'success' : 'error');

    let container = document.getElementById('news-container');
    if (!container) return;

    let el = document.createElement('div');
    el.className = 'news-item ' + (newsItem.impact >= 0 ? 'positive' : 'negative');
    el.setAttribute('data-market', newsItem.market);

    // Bug 4 fix: respect the client's active news market filter
    let nf = state && state.newsMarketFilter;
    if (nf && nf !== 'ALL' && newsItem.market !== nf) el.style.display = 'none';

    let badgeCls = 'news-mkt-badge nmb-' + (newsItem.market || 'nse').toLowerCase();

    // Bug 9 fix: build DOM nodes with textContent instead of innerHTML to
    // prevent XSS if newsItem.text or market contains HTML characters.
    let timeSpan = document.createElement('span');
    timeSpan.className = 'news-time';
    timeSpan.textContent = newsItem.timeStr || '';

    let badgeSpan = document.createElement('span');
    badgeSpan.className = badgeCls;
    badgeSpan.textContent = newsItem.market || '';

    let textSpan = document.createElement('span');
    textSpan.className = 'news-text';
    textSpan.textContent = newsItem.text;

    el.appendChild(timeSpan);
    el.appendChild(badgeSpan);
    el.appendChild(textSpan);

    container.prepend(el);
    if (container.children.length > 100)
        container.removeChild(container.lastChild);

    // Update news badge counter
    let countEl = document.getElementById('news-count');
    if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
}

// Bug A fix: Send order to host
export function sendOrderToHost(ticker, side, qty, orderId = null, tif = null) {
    // Guard: hostConnection must exist AND still be open
    if (isMultiplayerClient && hostConnection && hostConnection.open) {
        // Bug 7 fix: substr() is deprecated; use substring() instead
        if (!orderId) orderId = "req_" + Math.random().toString(36).substring(2, 11);
        hostConnection.send(JSON.stringify({
            type: 'PLACE_ORDER',
            ticker: ticker,
            side: side,
            qty: qty,
            id: orderId,
            tif: tif
        }));
        return orderId;
    }
    return null;
}
