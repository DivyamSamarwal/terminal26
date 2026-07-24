import { state, toggleCustomizeView } from './app.js';
import { renderChart, setChartLayout, renderSubChart, chartInstance, subChartInstance, clearSubChartInstance } from './charts.js';

// customization.js

const tcData = {
    themes: [
        { id: 'carbon', name: 'Carbon', icon: 'fa-chart-simple' },
        { id: 'midnight', name: 'Midnight', icon: 'fa-chart-simple' },
        { id: 'slate', name: 'Slate', icon: 'fa-chart-simple' },
        { id: 'apex', name: 'Apex', icon: 'fa-chart-simple' },
        { id: 'arctic', name: 'Arctic', icon: 'fa-chart-simple' },
        { id: 'deepsea', name: 'Deep Sea', icon: 'fa-chart-simple' },
        { id: 'eclipse', name: 'Eclipse', icon: 'fa-chart-simple' },
        { id: 'ember', name: 'Ember', icon: 'fa-chart-simple' },
        { id: 'forest', name: 'Forest', icon: 'fa-chart-simple' },
        { id: 'indigo', name: 'Indigo', icon: 'fa-chart-simple' },
        { id: 'mono', name: 'Mono', icon: 'fa-chart-simple' },
        { id: 'nova', name: 'Nova', icon: 'fa-chart-simple' },
        { id: 'plum', name: 'Plum', icon: 'fa-chart-simple' },
        { id: 'rose', name: 'Rose', icon: 'fa-chart-simple' },
        { id: 'sand', name: 'Sand', icon: 'fa-chart-simple' },
        { id: 'singularity', name: 'Singularity', icon: 'fa-chart-simple' },
        { id: 'vaporwave', name: 'Vaporwave', icon: 'fa-chart-simple' }
    ],
    accents: [
        '#00E5FF', '#FFB74D', '#00E676', '#FF9900', '#CC7A00', '#00CCFF', '#0099CC', '#FF3333',
        '#CC0000', '#00FF9D', '#00CC7E', '#FF00E6', '#CC00B8', '#FF2A2A', '#CC2222', '#FFD500'
    ],
    chartColors: [
        { id: 'classic', name: 'Classic', up: '#00E676', down: '#FF3D71' },
        { id: 'mono', name: 'Mono', up: '#FFFFFF', down: '#888888' },
        { id: 'ocean', name: 'Ocean', up: '#00E5FF', down: '#FFB74D' },
        { id: 'candy', name: 'Candy', up: '#FF00E6', down: '#00FF9D' },
        { id: 'emerald', name: 'Emerald', up: '#00FF00', down: '#FF3333' },
        { id: 'fresh', name: 'Fresh', up: '#2B6636', down: '#B53636' },
        { id: 'ice', name: 'Ice', up: '#00CCFF', down: '#FF9900' },
        { id: 'neon', name: 'Neon', up: '#00FF9D', down: '#FF00E6' },
        { id: 'sunset', name: 'Sunset', up: '#FFB347', down: '#FF4D79' },
        { id: 'violet', name: 'Violet', up: '#9D74D2', down: '#FF3366' }
    ],
    fonts: [
        { id: 'mono', name: 'Mono', family: "'JetBrains Mono', 'Roboto Mono', monospace" },
        { id: 'terminal', name: 'Terminal', family: "'Roboto Mono', monospace" },
        { id: 'editorial', name: 'Editorial', family: "'Playfair Display', serif" },
        { id: 'classic', name: 'Classic', family: "sans-serif" },
        { id: 'outfit', name: 'Outfit', family: "'Outfit', sans-serif" },
        { id: 'inter', name: 'Inter', family: "'Inter', sans-serif" },
        { id: 'poppins', name: 'Poppins', family: "'Poppins', sans-serif" },
        { id: 'plex', name: 'Plex', family: "'IBM Plex Sans', sans-serif" },
        { id: 'rounded', name: 'Rounded', family: "system-ui" },
        { id: 'grotesk', name: 'Grotesk', family: "'Space Grotesk', sans-serif" },
        { id: 'tech', name: 'Tech', family: "ui-monospace, 'Courier New', monospace" },
        { id: 'ubuntu', name: 'Ubuntu', family: "'Ubuntu', sans-serif" }
    ]
};

let tcState = {
    theme: 'carbon',
    accent: '#00E5FF',
    chartColor: 'ocean',
    chartFill: true,
    font: 'terminal',
    tickerAccent: '#FFB74D',
    usernameColor: '#00E676'
};


function initTerminalCustomization() {
    renderGrid('tc-theme-grid', tcData.themes, (item) => `
        <div class="tc-option-card ${tcState.theme === item.id ? 'active' : ''}" onclick="tcSelect('theme', '${item.id}')">
            <i class="fa-solid ${item.icon} tc-card-icon"></i>
            <div class="tc-card-label">${item.name}</div>
        </div>
    `);

    renderGrid('tc-accent-grid', tcData.accents, (color) => `
        <div class="tc-color-circle ${tcState.accent === color ? 'active' : ''}" style="background:${color}" onclick="tcSelect('accent', '${color}')"></div>
    `);

    renderGrid('tc-chart-colors-grid', tcData.chartColors, (item) => `
        <div class="tc-chart-color-card ${tcState.chartColor === item.id ? 'active' : ''}" onclick="tcSelect('chartColor', '${item.id}')">
            <div class="tc-cc-dots">
                <div class="tc-cc-dot" style="background:${item.up}"></div>
                <div class="tc-cc-dot" style="background:${item.down}"></div>
            </div>
            <div class="tc-card-label">${item.name}</div>
        </div>
    `);

    renderGrid('tc-font-grid', tcData.fonts, (item) => `
        <div class="tc-font-card ${tcState.font === item.id ? 'active' : ''}" onclick="tcSelect('font', '${item.id}')">
            <div class="tc-font-aa" style="font-family:${item.family}">Aa</div>
            <div class="tc-font-label">${item.name}</div>
        </div>
    `);

    renderGrid('tc-ticker-accent-grid', tcData.accents, (color) => `
        <div class="tc-color-circle ${tcState.tickerAccent === color ? 'active' : ''}" style="background:${color}; width:24px; height:24px;" onclick="tcSelect('tickerAccent', '${color}')"></div>
    `);

    renderGrid('tc-username-color-grid', tcData.accents, (color) => `
        <div class="tc-color-circle ${tcState.usernameColor === color ? 'active' : ''}" style="background:${color}; width:24px; height:24px;" onclick="tcSelect('usernameColor', '${color}')"></div>
    `);
}

function renderGrid(id, data, templateFn) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = data.map(templateFn).join('');
}

function tcUpdateLivePreviewBody() {
    // Theme
    const classes = Array.from(document.body.classList);
    for (let c of classes) {
        if (c.startsWith('theme-') || c.startsWith('bg-')) {
            document.body.classList.remove(c);
        }
    }
    if (tcState.theme) document.body.classList.add('theme-' + tcState.theme);
    
    // Font
    const fontObj = tcData.fonts.find(f => f.id === tcState.font);
    if (fontObj) {
        document.body.style.setProperty('--font', fontObj.family);
        document.body.style.setProperty('--mono', fontObj.family);
    }
    
    // Helper for generating RGBA for live preview
    const hexToRgba = (hex, alpha) => {
        hex = hex.replace('#', '');
        if(hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        const r = parseInt(hex.substring(0,2), 16);
        const g = parseInt(hex.substring(2,4), 16);
        const b = parseInt(hex.substring(4,6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Helper for adjusting brightness
    const adjustBrightness = (hex, percent) => {
        hex = hex.replace('#', '');
        if(hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        let r = parseInt(hex.substring(0,2), 16);
        let g = parseInt(hex.substring(2,4), 16);
        let b = parseInt(hex.substring(4,6), 16);
        r = Math.max(0, Math.min(255, r + percent));
        g = Math.max(0, Math.min(255, g + percent));
        b = Math.max(0, Math.min(255, b + percent));
        return '#' + (r.toString(16).padStart(2,'0')) + (g.toString(16).padStart(2,'0')) + (b.toString(16).padStart(2,'0'));
    };

    // Colors
    document.body.style.setProperty('--accent', tcState.accent);
    document.body.style.setProperty('--accent-hover', adjustBrightness(tcState.accent, 20));
    document.body.style.setProperty('--ticker-accent', tcState.tickerAccent);
    document.body.style.setProperty('--username-color', tcState.usernameColor);
    
    const chartColorObj = tcData.chartColors.find(c => c.id === tcState.chartColor) || tcData.chartColors[0];
    document.body.style.setProperty('--green', chartColorObj.up);
    document.body.style.setProperty('--green-dim', hexToRgba(chartColorObj.up, 0.15));
    document.body.style.setProperty('--green-hover', adjustBrightness(chartColorObj.up, 20));
    document.body.style.setProperty('--red', chartColorObj.down);
    document.body.style.setProperty('--red-dim', hexToRgba(chartColorObj.down, 0.15));
    document.body.style.setProperty('--red-hover', adjustBrightness(chartColorObj.down, 20));
}

function tcSelect(type, value) {
    tcState[type] = value;
    tcUpdateLivePreviewBody();
    initTerminalCustomization(); // Re-render to update active states
}


let originalTcState = null;

function openTerminalCustomization() {
    originalTcState = JSON.stringify(tcState); // Snapshot state
    initTerminalCustomization();
};

function closeTerminalCustomization(applyClicked = false) {
    if (!applyClicked && originalTcState) {
        tcState = JSON.parse(originalTcState);
        tcUpdateLivePreviewBody();
        if (typeof renderChart === 'function' && state.activeStock) renderChart(state.activeStock); // Refresh main chart back to normal
    }
    
    if (applyClicked) {
        // If apply was clicked, save to local storage
        localStorage.setItem('terminal_customization', JSON.stringify(tcState));
        
        // Prevent the revert from triggering when toggleCustomizeView hides the tab
        originalTcState = null; 
        
        // Return to main terminal view automatically
        if (typeof toggleCustomizeView === 'function') toggleCustomizeView(false);
    }
    
    // Always clear snapshot when closing is done
    originalTcState = null;
};

function tcShuffle() {
    tcState.theme = tcData.themes[Math.floor(Math.random() * tcData.themes.length)].id;
    tcState.accent = tcData.accents[Math.floor(Math.random() * tcData.accents.length)];
    tcState.chartColor = tcData.chartColors[Math.floor(Math.random() * tcData.chartColors.length)].id;
    tcState.font = tcData.fonts[Math.floor(Math.random() * tcData.fonts.length)].id;
    tcState.tickerAccent = tcData.accents[Math.floor(Math.random() * tcData.accents.length)];
    tcState.usernameColor = tcData.accents[Math.floor(Math.random() * tcData.accents.length)];
    tcUpdateLivePreviewBody();
    initTerminalCustomization();
}

function tcReset() {
    tcState = {
        theme: 'carbon',
        accent: '#00E5FF',
        chartColor: 'ocean',
        font: 'terminal',
        tickerAccent: '#FFB74D',
        usernameColor: '#00E676'
    };
    tcUpdateLivePreviewBody();
    initTerminalCustomization();
}

function tcApply() {
    // Apply all styles to the body
    tcUpdateLivePreviewBody();
    
    // Close modal (pass true so it doesn't revert)
    if (!window.isReverting) {
        closeTerminalCustomization(true);
    }
    
    // Redraw charts if the main app logic is available
    if (typeof state !== 'undefined') {
        if (state.chartLayout === "1x") {
            if (state.activeStock && typeof renderChart === 'function') {
                renderChart(state.activeStock);
            }
        } else if (typeof setChartLayout === 'function') {
            setChartLayout(state.chartLayout);
        }
        
        if (state.showRSI || state.showMACD) {
            if (typeof subChartInstance !== 'undefined' && subChartInstance) {
                clearSubChartInstance();
            }
            if (state.activeStock && typeof renderSubChart === 'function') {
                var prices = (state.chartType === 'candle')
                    ? ((chartInstance && chartInstance._ohlc) ? chartInstance._ohlc.map(c => c.c) : [])
                    : ((chartInstance && chartInstance._lineData) ? chartInstance._lineData : []);
                renderSubChart(state.activeStock, prices);
            }
        }
    }
    
    // Save to localStorage
    try {
        localStorage.setItem('terminal_customization', JSON.stringify(tcState));
    } catch(e) { console.error(e); }
}

// Load on start
window.addEventListener('DOMContentLoaded', () => {
    try {
        const saved = localStorage.getItem('terminal_customization');
        if (saved) {
            tcState = { ...tcState, ...JSON.parse(saved) };
            
            // Migrate legacy theme IDs to new dedicated theme IDs
            const legacyMap = {
                'default': 'carbon',
                'bloomberg': 'midnight',
                'solarized': 'slate',
                'retro': 'apex',
                'neon': 'arctic',
                'ocean': 'deepsea',
                'terminal': 'eclipse',
                'sepia': 'ember'
            };
            if (legacyMap[tcState.theme]) {
                tcState.theme = legacyMap[tcState.theme];
            }
            
            tcApply(); 
        }
    } catch(e) { console.error(e); }
});


export { closeTerminalCustomization, tcShuffle, tcReset, tcApply, openTerminalCustomization, tcSelect, tcState };
