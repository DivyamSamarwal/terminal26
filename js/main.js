import { initApp } from './app.js';
import './analytics.js';
import './bot.js';
import './investments.js';
import './news.js';
import './studio.js';
import './customization.js';
import { initUIEvents } from './ui_events.js';
import { initMultiplayer } from './multiplayer.js';

const components = [
    { id: 'mount-terminal', path: 'components/view-terminal.html' },
    { id: 'mount-options', path: 'components/modal-options.html' },
    { id: 'mount-bank', path: 'components/view-bank.html' },
    { id: 'mount-mf', path: 'components/view-mf.html' },
    { id: 'mount-ipo', path: 'components/view-ipo.html' },
    { id: 'mount-realestate', path: 'components/view-realestate.html' },
    { id: 'mount-settings', path: 'components/view-settings.html' },
    { id: 'mount-syndicate', path: 'components/view-syndicate.html' },
    { id: 'mount-customize', path: 'components/view-customize.html' },
    { id: 'mount-multiplayer', path: 'components/view-multiplayer.html' }
];

async function loadComponents() {
    const fetchPromises = components.map(async (comp) => {
        const mountPoint = document.getElementById(comp.id);
        if (!mountPoint) return;
        try {
            const res = await fetch(comp.path);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const html = await res.text();
            mountPoint.innerHTML = html;
        } catch (e) {
            console.error(`Failed to load component ${comp.path}:`, e);
        }
    });
    await Promise.all(fetchPromises);
}

async function boot() {
    await loadComponents();
    initApp();
    initUIEvents();
    initMultiplayer();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

// Expose functions to window for inline HTML onclick handlers
import { subscribeIPO } from './app.js';
import { executeChainTrade } from './app.js';
import { previewOption } from './app.js';
import { clearOptionPreview } from './app.js';
import { selectStock } from './app.js';
import { setLimitPrice } from './app.js';
import { closeEquityPosition } from './app.js';
import { closeOptionPosition } from './app.js';
import { cancelPendingOrder } from './app.js';
import { forecloseLoan } from './app.js';
import { breakFixedDeposit } from './app.js';
import { buyProperty } from './app.js';
import { payOffMortgage } from './app.js';
import { sellProperty } from './app.js';
import { tcSelect } from './customization.js';
import { cancelSIP } from './investments.js';
import { sellMF } from './investments.js';
import { BotManager } from './bot.js';
import { setChartLayout } from './charts.js';

window.subscribeIPO = subscribeIPO;
window.executeChainTrade = executeChainTrade;
window.previewOption = previewOption;
window.clearOptionPreview = clearOptionPreview;
window.selectStock = selectStock;
window.setLimitPrice = setLimitPrice;
window.closeEquityPosition = closeEquityPosition;
window.closeOptionPosition = closeOptionPosition;
window.cancelPendingOrder = cancelPendingOrder;
window.forecloseLoan = forecloseLoan;
window.breakFixedDeposit = breakFixedDeposit;
window.buyProperty = buyProperty;
window.payOffMortgage = payOffMortgage;
window.sellProperty = sellProperty;
window.tcSelect = tcSelect;
window.cancelSIP = cancelSIP;
window.sellMF = sellMF;
window.BotManager = BotManager;
window.setChartLayout = setChartLayout;
