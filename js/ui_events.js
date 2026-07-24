import { calcBollingerBands, calcEMA, calcMACD, calcPremium, calcRSI, calcSMA, EXCHANGE_RATES, fmtCur, fmtPrice, generateIPO, generateStrikes, getDayFraction, getExpiryDays, isMarketOpen, LOT_SIZES, marketStocks, processEquityTrade, renderAll, renderIPOs, renderTopBar, showCrateReveal, state, stockMap, toggleCustomizeView, openOptionChain, openSyndicateCrate, executeOptionStrategy, closeOptionChain, updateOrderMargin } from './app.js';
import { BotManager, updateStrategyDropdown } from './bot.js';
import { btChartInstance, closeCustomStudio, createNewCustomBot, loadCustomBot, populateBotStrategyDropdown, renderCustomBotList, saveCustomBot, switchStudioTab, openCustomStudio, loadCustomBotTemplate, testCustomBotSyntax, deleteCustomBot, runBacktest } from './studio.js';

import { generateTemplatedNews, newsEvents } from './news.js';
import { renderMFChart, updateMfQuote, setMFTimeframe, buyLumpsumMF, startSIP } from './investments.js';
import { closeTerminalCustomization, tcShuffle, tcReset, tcApply } from './customization.js';

// Auto-generated UI event bindings

export function initUIEvents() {
    var el_evt_bind_31 = document.getElementById('evt-bind-31');
    if (el_evt_bind_31) {
        el_evt_bind_31.addEventListener('click', function() { openOptionChain() });
    }

    var el_evt_bind_32 = document.getElementById('evt-bind-32');
    if (el_evt_bind_32) {
        el_evt_bind_32.addEventListener('click', function() { openCustomStudio(); return false; });
    }

    var el_evt_bind_33 = document.getElementById('evt-bind-33');
    if (el_evt_bind_33) {
        el_evt_bind_33.addEventListener('click', function() { document.getElementById('btn-bank').click() });
    }

    var el_evt_bind_34 = document.getElementById('evt-bind-34');
    if (el_evt_bind_34) {
        el_evt_bind_34.addEventListener('click', function() { document.getElementById('btn-mf').click() });
    }

    var el_mf_select = document.getElementById('mf-select');
    if (el_mf_select) {
        el_mf_select.addEventListener('change', function() { updateMfQuote() });
    }

    var el_evt_bind_35 = document.getElementById('evt-bind-35');
    if (el_evt_bind_35) {
        el_evt_bind_35.addEventListener('click', function() { setMFTimeframe('1W') });
    }

    var el_evt_bind_36 = document.getElementById('evt-bind-36');
    if (el_evt_bind_36) {
        el_evt_bind_36.addEventListener('click', function() { setMFTimeframe('1M') });
    }

    var el_evt_bind_37 = document.getElementById('evt-bind-37');
    if (el_evt_bind_37) {
        el_evt_bind_37.addEventListener('click', function() { setMFTimeframe('ALL') });
    }

    var el_evt_bind_38 = document.getElementById('evt-bind-38');
    if (el_evt_bind_38) {
        el_evt_bind_38.addEventListener('click', function() { buyLumpsumMF() });
    }

    var el_evt_bind_39 = document.getElementById('evt-bind-39');
    if (el_evt_bind_39) {
        el_evt_bind_39.addEventListener('click', function() { startSIP() });
    }

    var el_evt_bind_40 = document.getElementById('evt-bind-40');
    if (el_evt_bind_40) {
        el_evt_bind_40.addEventListener('click', function() { document.getElementById('btn-ipo').click() });
    }

    var el_evt_bind_41 = document.getElementById('evt-bind-41');
    if (el_evt_bind_41) {
        el_evt_bind_41.addEventListener('click', function() { document.getElementById('btn-realestate').click() });
    }

    var el_evt_bind_42 = document.getElementById('evt-bind-42');
    if (el_evt_bind_42) {
        el_evt_bind_42.addEventListener('click', function() { document.getElementById('btn-settings').click() });
    }

    var el_evt_bind_43 = document.getElementById('evt-bind-43');
    if (el_evt_bind_43) {
        el_evt_bind_43.addEventListener('click', function() { document.getElementById('btn-syndicate').click() });
    }

    var el_evt_bind_44 = document.getElementById('evt-bind-44');
    if (el_evt_bind_44) {
        el_evt_bind_44.addEventListener('click', function() { openSyndicateCrate('bronze') });
    }

    var el_evt_bind_45 = document.getElementById('evt-bind-45');
    if (el_evt_bind_45) {
        el_evt_bind_45.addEventListener('click', function() { openSyndicateCrate('silver') });
    }

    var el_evt_bind_46 = document.getElementById('evt-bind-46');
    if (el_evt_bind_46) {
        el_evt_bind_46.addEventListener('click', function() { openSyndicateCrate('gold') });
    }

    var el_opt_strategy = document.getElementById('opt-strategy');
    if (el_opt_strategy) {
        el_opt_strategy.addEventListener('change', function() { executeOptionStrategy() });
    }

    var el_evt_bind_47 = document.getElementById('evt-bind-47');
    if (el_evt_bind_47) {
        el_evt_bind_47.addEventListener('click', function() { closeOptionChain() });
    }

    var el_custom_studio_overlay = document.getElementById('custom-studio-overlay');
    if (el_custom_studio_overlay) {
        el_custom_studio_overlay.addEventListener('click', function(event) { if(event.target===el_custom_studio_overlay) closeCustomStudio(); });
    }

    var el_studio_tab_editor = document.getElementById('studio-tab-editor');
    if (el_studio_tab_editor) {
        el_studio_tab_editor.addEventListener('click', function() { switchStudioTab('editor') });
    }

    var el_studio_tab_backtest = document.getElementById('studio-tab-backtest');
    if (el_studio_tab_backtest) {
        el_studio_tab_backtest.addEventListener('click', function() { switchStudioTab('backtest') });
    }

    var el_evt_bind_48 = document.getElementById('evt-bind-48');
    if (el_evt_bind_48) {
        el_evt_bind_48.addEventListener('click', function() { closeCustomStudio() });
    }

    var el_evt_bind_49 = document.getElementById('evt-bind-49');
    if (el_evt_bind_49) {
        el_evt_bind_49.addEventListener('click', function() { createNewCustomBot() });
    }

    var el_custom_bot_template = document.getElementById('custom-bot-template');
    if (el_custom_bot_template) {
        el_custom_bot_template.addEventListener('change', function() { loadCustomBotTemplate() });
    }

    var el_evt_bind_50 = document.getElementById('evt-bind-50');
    if (el_evt_bind_50) {
        el_evt_bind_50.addEventListener('click', function() { saveCustomBot() });
    }

    var el_evt_bind_51 = document.getElementById('evt-bind-51');
    if (el_evt_bind_51) {
        el_evt_bind_51.addEventListener('click', function() { testCustomBotSyntax() });
    }

    var el_custom_bot_delete_btn = document.getElementById('custom-bot-delete-btn');
    if (el_custom_bot_delete_btn) {
        el_custom_bot_delete_btn.addEventListener('click', function() { deleteCustomBot() });
        el_custom_bot_delete_btn.addEventListener('mouseover', function() { el_custom_bot_delete_btn.style.background='rgba(255,23,68,0.1)' });
        el_custom_bot_delete_btn.addEventListener('mouseout', function() { el_custom_bot_delete_btn.style.background='transparent' });
    }

    var el_evt_bind_52 = document.getElementById('evt-bind-52');
    if (el_evt_bind_52) {
        el_evt_bind_52.addEventListener('click', function() { runBacktest() });
    }

    var el_evt_bind_53 = document.getElementById('evt-bind-53');
    if (el_evt_bind_53) {
        el_evt_bind_53.addEventListener('click', function() { tcShuffle() });
        el_evt_bind_53.addEventListener('mouseover', function() { el_evt_bind_53.style.color='var(--text-bright)' });
        el_evt_bind_53.addEventListener('mouseout', function() { el_evt_bind_53.style.color='var(--text-dim)' });
    }

    var el_evt_bind_54 = document.getElementById('evt-bind-54');
    if (el_evt_bind_54) {
        el_evt_bind_54.addEventListener('click', function() { tcReset() });
        el_evt_bind_54.addEventListener('mouseover', function() { el_evt_bind_54.style.color='var(--text-bright)' });
        el_evt_bind_54.addEventListener('mouseout', function() { el_evt_bind_54.style.color='var(--text-dim)' });
    }

    var el_evt_bind_55 = document.getElementById('evt-bind-55');
    if (el_evt_bind_55) {
        el_evt_bind_55.addEventListener('click', function() { if(typeof toggleCustomizeView === 'function') toggleCustomizeView(false) });
    }

    var el_evt_bind_56 = document.getElementById('evt-bind-56');
    if (el_evt_bind_56) {
        el_evt_bind_56.addEventListener('click', function() { tcApply() });
    }

    var el_evt_bind_60 = document.getElementById('evt-bind-60');
    if (el_evt_bind_60) {
        el_evt_bind_60.addEventListener('click', function() { createNewCustomBot() });
        el_evt_bind_60.addEventListener('mouseover', function() { el_evt_bind_60.style.background='var(--bg-2)' });
        el_evt_bind_60.addEventListener('mouseout', function() { el_evt_bind_60.style.background='transparent' });
    }


    var el_evt_bind_61 = document.getElementById('evt-bind-61');
    if (el_evt_bind_61) {
        el_evt_bind_61.addEventListener('click', function() { testCustomBotSyntax() });
        el_evt_bind_61.addEventListener('mouseover', function() { el_evt_bind_61.style.background='rgba(255,255,255,0.1)' });
        el_evt_bind_61.addEventListener('mouseout', function() { el_evt_bind_61.style.background='transparent' });
    }

    var el_evt_bind_62 = document.getElementById('evt-bind-62');
    if (el_evt_bind_62) {
        el_evt_bind_62.addEventListener('click', function() { saveCustomBot() });
        el_evt_bind_62.addEventListener('mouseover', function() { el_evt_bind_62.style.filter='brightness(1.1)' });
        el_evt_bind_62.addEventListener('mouseout', function() { el_evt_bind_62.style.filter='none' });
    }

}
