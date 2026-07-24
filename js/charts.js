import { 
    state, marketStocks, stockMap, toast,
    calcSMA, calcEMA, calcRSI, calcMACD, calcBollingerBands, fmtCur, getDayFraction,
    selectStock, fmtPrice, calcVWAP, VIEW_LENGTHS, _applyChartData, calcPortfolioValue,
    candlestickPlugin, drawingPlugin, customTooltipHandler
} from './app.js';

import { btChartInstance } from './studio.js';

var chartInstance = null;

var subChartInstance = null;

var multiChartInstances = []; // For 2x/4x multi-chart panels

function renderSubChart(stock, prices) {
	if (!prices || prices.length < 2) return;
	var container = document.getElementById('sub-chart-container');
	var canvas = document.getElementById('sub-chart');
	if (!canvas) return;
	var isLight = state.theme === 'light' || state.theme === 'sepia';
	var gridColor = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)';
	var tickColor = isLight ? '#666' : '#707888';
	var label = document.getElementById('sub-chart-label');
	var refEl = document.querySelector('.sub-chart-ref');

	if (state.showRSI) {
		if (label) label.textContent = 'RSI (14)';
		if (refEl) refEl.textContent = '— 70 Overbought   — 30 Oversold';
		var rsiData = calcRSI(prices, 14);
		var rsiLabels = rsiData.map(function(_, i) { return i; });

		if (subChartInstance && subChartInstance._mode !== 'rsi') {
			subChartInstance.destroy(); subChartInstance = null;
		}
		if (!subChartInstance) {
			subChartInstance = new Chart(canvas.getContext('2d'), {
				type: 'line',
				data: {
					labels: rsiLabels,
					datasets: [
						{
							label: 'RSI',
							data: rsiData,
							borderColor: 'rgba(100, 181, 246, 0.9)',
							backgroundColor: 'transparent',
							borderWidth: 1.5,
							pointRadius: 0,
							tension: 0.1,
							fill: false,
						},
						{
							label: 'OB',
							data: Array(rsiData.length).fill(70),
							borderColor: 'rgba(239, 68, 68, 0.5)',
							backgroundColor: 'transparent',
							borderWidth: 1,
							borderDash: [4, 3],
							pointRadius: 0,
							fill: false,
							tension: 0,
						},
						{
							label: 'OS',
							data: Array(rsiData.length).fill(30),
							borderColor: 'rgba(16, 185, 129, 0.5)',
							backgroundColor: 'transparent',
							borderWidth: 1,
							borderDash: [4, 3],
							pointRadius: 0,
							fill: false,
							tension: 0,
						}
					]
				},
				options: {
					responsive: true, maintainAspectRatio: false, animation: false,
					plugins: { legend: { display: false }, tooltip: { enabled: false } },
					scales: {
						x: { display: false, grid: { display: false } },
						y: {
							min: 0, max: 100,
							grid: { color: gridColor, drawBorder: false },
							ticks: { color: tickColor, font: { size: 9 }, maxTicksLimit: 5,
								callback: function(v) { return v.toFixed(0); }
							},
							position: 'right'
						}
					}
				}
			});
			subChartInstance._mode = 'rsi';
		} else {
			subChartInstance.data.labels = rsiLabels;
			subChartInstance.data.datasets[0].data = rsiData;
			subChartInstance.data.datasets[1].data = Array(rsiData.length).fill(70);
			subChartInstance.data.datasets[2].data = Array(rsiData.length).fill(30);
			subChartInstance.update('none');
		}
	} else if (state.showMACD) {
		if (label) label.textContent = 'MACD (12, 26, 9)';
		if (refEl) refEl.textContent = '— MACD   — Signal   ■ Histogram';
		var macdResult = calcMACD(prices, 12, 26, 9);
		var mLine = macdResult.macdLine;
		var sLine = macdResult.signalLine;
		var hist = macdResult.histogram;
		var mLabels = mLine.map(function(_, i) { return i; });

		var histColors = hist.map(function(v) {
			if (v === null) return 'transparent';
			return v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)';
		});

		if (subChartInstance && subChartInstance._mode !== 'macd') {
			subChartInstance.destroy(); subChartInstance = null;
		}
		if (!subChartInstance) {
			subChartInstance = new Chart(canvas.getContext('2d'), {
				type: 'bar',
				data: {
					labels: mLabels,
					datasets: [
						{
							type: 'bar',
							label: 'Histogram',
							data: hist,
							backgroundColor: histColors,
							borderWidth: 0,
							barPercentage: 0.8,
						},
						{
							type: 'line',
							label: 'MACD',
							data: mLine,
							borderColor: 'rgba(100, 181, 246, 0.9)',
							backgroundColor: 'transparent',
							borderWidth: 1.5,
							pointRadius: 0,
							tension: 0.1,
							fill: false,
						},
						{
							type: 'line',
							label: 'Signal',
							data: sLine,
							borderColor: 'rgba(255, 152, 0, 0.9)',
							backgroundColor: 'transparent',
							borderWidth: 1.2,
							pointRadius: 0,
							tension: 0.1,
							fill: false,
						}
					]
				},
				options: {
					responsive: true, maintainAspectRatio: false, animation: false,
					plugins: { legend: { display: false }, tooltip: { enabled: false } },
					scales: {
						x: { display: false, grid: { display: false } },
						y: {
							grid: { color: gridColor, drawBorder: false },
							ticks: { color: tickColor, font: { size: 9 }, maxTicksLimit: 5,
								callback: function(v) { return v.toFixed(2); }
							},
							position: 'right'
						}
					}
				}
			});
			subChartInstance._mode = 'macd';
		} else {
			subChartInstance.data.labels = mLabels;
			subChartInstance.data.datasets[0].data = hist;
			subChartInstance.data.datasets[0].backgroundColor = histColors;
			subChartInstance.data.datasets[1].data = mLine;
			subChartInstance.data.datasets[2].data = sLine;
			subChartInstance.update('none');
		}
	}
}

function setupDrawingListenersForCanvas(canvas, getChartFn, getTickerFn) {
	canvas.addEventListener('mousedown', function(e) {
		var chartRef = getChartFn();
		if (!chartRef) return;
		var rect = canvas.getBoundingClientRect();
		var px = e.clientX - rect.left;
		var py = e.clientY - rect.top;
		var xScale = chartRef.scales.x;
		var yScale = chartRef.scales.y;
		if (!xScale || !yScale) return;

		// Handle Edit Mode Drag Start
		if (state.drawingMode === 'cursor') {
			if (state.hoveredAnchor) {
				state.drawingInProgress = {
					type: 'edit',
					anchor: state.hoveredAnchor,
					targetChart: chartRef
				};
				e.preventDefault();
			}
			return;
		}

		// Handle Drawing Mode Start
		state.drawingInProgress = {
			type: state.drawingMode,
			startPx: px, startPy: py,
			curPx: px, curPy: py,
			startX: xScale.getValueForPixel(px),
			startY: yScale.getValueForPixel(py),
			targetChart: chartRef
		};
		e.preventDefault();
	});

	canvas.addEventListener('mousemove', function(e) {
		var chartRef = getChartFn();
		if (!chartRef) return;
		var rect = canvas.getBoundingClientRect();
		var px = e.clientX - rect.left;
		var py = e.clientY - rect.top;
		var xScale = chartRef.scales.x;
		var yScale = chartRef.scales.y;

		// Handle Edit Mode Hit Testing
		if (state.drawingMode === 'cursor' && !state.drawingInProgress) {
			var ticker = getTickerFn();
			var drawings = (ticker && state.activeDrawings[ticker]) ? state.activeDrawings[ticker] : [];
			var foundAnchor = null;
			for (var i = 0; i < drawings.length; i++) {
				var d = drawings[i];
				if (d.type === 'trendline' || d.type === 'fib') {
					var p1 = { x: xScale.getPixelForValue(d.x1), y: yScale.getPixelForValue(d.y1) };
					var p2 = { x: xScale.getPixelForValue(d.x2), y: yScale.getPixelForValue(d.y2) };
					if (Math.hypot(p1.x - px, p1.y - py) < 8) { foundAnchor = { id: i + '_1', idx: i, point: 1 }; break; }
					if (Math.hypot(p2.x - px, p2.y - py) < 8) { foundAnchor = { id: i + '_2', idx: i, point: 2 }; break; }
				} else if (d.type === 'hline') {
					var pY = yScale.getPixelForValue(d.price);
					var pX = chartRef.chartArea.right - 40;
					if (Math.hypot(pX - px, pY - py) < 8) { foundAnchor = { id: i + '_line', idx: i, point: 'line' }; break; }
				}
			}
			var changed = (state.hoveredAnchor ? state.hoveredAnchor.id : null) !== (foundAnchor ? foundAnchor.id : null);
			state.hoveredAnchor = foundAnchor;
			canvas.style.cursor = foundAnchor ? 'grab' : 'default';
			if (changed) chartRef.draw();
			return;
		}

		if (!state.drawingInProgress || state.drawingInProgress.targetChart !== chartRef) return;

		// Handle Edit Mode Drag
		if (state.drawingInProgress.type === 'edit') {
			ticker = getTickerFn();
			drawings = (ticker && state.activeDrawings[ticker]) ? state.activeDrawings[ticker] : [];
			var anchor = state.drawingInProgress.anchor;
			d = drawings[anchor.idx];
			if (d) {
				if (anchor.point === 1) { d.x1 = xScale.getValueForPixel(px); d.y1 = yScale.getValueForPixel(py); }
				else if (anchor.point === 2) { d.x2 = xScale.getValueForPixel(px); d.y2 = yScale.getValueForPixel(py); }
				else if (anchor.point === 'line') { d.price = yScale.getValueForPixel(py); }
				canvas.style.cursor = 'grabbing';
				chartRef.draw();
			}
			return;
		}

		// Handle Drawing Mode Drag
		state.drawingInProgress.curPx = px;
		state.drawingInProgress.curPy = py;
		chartRef.draw(); // Force redraw for live preview
	});

	canvas.addEventListener('mouseup', function(e) {
		var chartRef = getChartFn();
		if (!state.drawingInProgress || state.drawingInProgress.targetChart !== chartRef || !chartRef) return;

		if (state.drawingInProgress.type === 'edit') {
			state.drawingInProgress = null;
			canvas.style.cursor = 'default';
			chartRef.draw();
			return;
		}

		var ip = state.drawingInProgress;
		var rect = canvas.getBoundingClientRect();
		var px = e.clientX - rect.left;
		var py = e.clientY - rect.top;
		var xScale = chartRef.scales.x;
		var yScale = chartRef.scales.y;
		if (!xScale || !yScale) { state.drawingInProgress = null; return; }
		var endX = xScale.getValueForPixel(px);
		var endY = yScale.getValueForPixel(py);
		var ticker = getTickerFn();
		if (!ticker) { state.drawingInProgress = null; return; }
		if (!state.activeDrawings[ticker]) state.activeDrawings[ticker] = [];

		// Only commit if there's meaningful movement
		var dx = Math.abs(ip.startPx - px);
		var dy = Math.abs(ip.startPy - py);
		if (dx > 3 || dy > 3 || ip.type === 'hline') {
			if (ip.type === 'trendline') {
				state.activeDrawings[ticker].push({ type: 'trendline', x1: ip.startX, y1: ip.startY, x2: endX, y2: endY });
			} else if (ip.type === 'hline') {
				state.activeDrawings[ticker].push({ type: 'hline', price: ip.startY });
			} else if (ip.type === 'fib') {
				state.activeDrawings[ticker].push({ type: 'fib', x1: ip.startX, y1: ip.startY, x2: endX, y2: endY });
			}
		}
		state.drawingInProgress = null;
		chartRef.draw();
	});

	canvas.addEventListener('mouseleave', function() {
		var chartRef = getChartFn();
		if (state.drawingInProgress && state.drawingInProgress.targetChart === chartRef && chartRef) {
			if (state.drawingInProgress.type === 'edit') canvas.style.cursor = 'default';
			state.drawingInProgress = null;
			chartRef.draw();
		}
		if (state.hoveredAnchor) {
			state.hoveredAnchor = null;
			canvas.style.cursor = 'default';
			if (chartRef) chartRef.draw();
		}
	});
}

function setupDrawingTools() {
	if (!window._drawingButtonsBound) {
		document.querySelectorAll('.draw-btn[data-tool]').forEach(function(btn) {
			btn.addEventListener('click', function() {
				state.drawingMode = btn.getAttribute('data-tool');
				document.querySelectorAll('.draw-btn[data-tool]').forEach(function(b) { b.classList.remove('active'); });
				btn.classList.add('active');
				document.querySelectorAll('canvas').forEach(function(c) {
					if(c.id.indexOf('chart') !== -1 || c.id.indexOf('panel') !== -1) {
						c.style.cursor = (state.drawingMode === 'cursor') ? 'default' : 'crosshair';
					}
				});
			});
		});

		var clearBtn = document.getElementById('draw-clear');
		if (clearBtn) {
			clearBtn.addEventListener('click', function() {
				if (state.chartLayout !== '1x') {
					state.panelStates.forEach(function(ps) {
						if (ps.ticker) state.activeDrawings[ps.ticker] = [];
					});
					multiChartInstances.forEach(function(c) { if (c) c.draw(); });
				} else {
					var ticker = state.activeStock ? state.activeStock.ticker : null;
					if (ticker) state.activeDrawings[ticker] = [];
					if (chartInstance) chartInstance.draw();
				}
			});
		}
		window._drawingButtonsBound = true;
	}

	var canvas = document.getElementById('main-chart');
	if (canvas && !canvas._drawingListenersAttached) {
		setupDrawingListenersForCanvas(canvas, function() { return chartInstance; }, function() {
			return state.activeStock ? state.activeStock.ticker : null;
		});
		canvas._drawingListenersAttached = true;
	}
}

function setChartLayout(layout) {
	state.chartLayout = layout;

	// Update layout selector buttons
	['1x', '2x', '4x'].forEach(function(l) {
		var btn = document.getElementById('btn-layout-' + l);
		if (btn) btn.classList.toggle('active', l === layout);
	});

	// Destroy all multi-panel instances
	multiChartInstances.forEach(function(inst) {
		if (inst && typeof inst.destroy === 'function') inst.destroy();
	});
	multiChartInstances = [];

	// If going back to 1x, restore single chart panel
	var container = document.getElementById('chart-grid-container');
	if (!container) return;

	if (layout === '1x') {
		container.className = 'chart-grid-1x';
		container.innerHTML = '<div class="chart-panel" id="panel-0"><canvas id="main-chart" role="img" aria-label="Price chart"></canvas></div>';
		// Destroy old main chart instance so it gets recreated on the new canvas
		if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
		// Re-attach drawing tools to new canvas
		setupDrawingTools();
		if (state.activeStock) renderChart(state.activeStock);
		return;
	}

	// Destroy main chart too — it references the old canvas
	if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

	var panelCount = layout === '2x' ? 2 : 4;
	container.className = 'chart-grid-' + layout;
	container.innerHTML = '';

	var allTickers = marketStocks.map(function(s) { return s.ticker; });
	var optionsHTML = allTickers.map(function(tk) {
		return '<option value="' + tk + '">' + tk + '</option>';
	}).join('');

	for (var pi = 0; pi < panelCount; pi++) {
		var ps = state.panelStates[pi] || { ticker: marketStocks[pi] ? marketStocks[pi].ticker : 'RELIANCE', viewLen: 375, candlePeriod: 5, chartType: 'line' };
		if (!state.panelStates[pi]) state.panelStates[pi] = ps;

		var panelDiv = document.createElement('div');
		panelDiv.className = 'chart-panel';
		panelDiv.id = 'panel-' + pi;
		panelDiv.innerHTML =
			'<div class="panel-header">' +
			'<select class="panel-ticker-select" data-panel="' + pi + '">' + optionsHTML + '</select>' +
			'<span class="panel-price-ind" id="panel-price-' + pi + '">---</span>' +
			'<button class="panel-trade-btn" data-panel="' + pi + '">Trade</button>' +
			'<div style="flex:1;"></div>' +
			'<button class="panel-tf-btn active" data-panel="' + pi + '" data-vl="375">1D</button>' +
			'<button class="panel-tf-btn" data-panel="' + pi + '" data-vl="1875">1W</button>' +
			'<button class="panel-tf-btn" data-panel="' + pi + '" data-vl="8250">1M</button>' +
			'</div>' +
			'<canvas id="panel-canvas-' + pi + '"></canvas>';
		container.appendChild(panelDiv);

		(function(panelIndex, panelState, pDiv) {
			var panelCanvas = document.getElementById('panel-canvas-' + panelIndex);
			var panelChart = buildPanelChart(panelCanvas, panelState);
			multiChartInstances[panelIndex] = panelChart;

			// Ticker select
			var sel = pDiv.querySelector('.panel-ticker-select');
			if (sel) {
				sel.value = panelState.ticker;
				sel.addEventListener('change', function() {
					panelState.ticker = sel.value;
					updatePanelChart(panelChart, panelState, false);
				});
			}

			// Timeframe buttons
			pDiv.querySelectorAll('.panel-tf-btn').forEach(function(tfBtn) {
				tfBtn.addEventListener('click', function() {
					pDiv.querySelectorAll('.panel-tf-btn').forEach(function(b) { b.classList.remove('active'); });
					tfBtn.classList.add('active');
					panelState.viewLen = parseInt(tfBtn.dataset.vl, 10) || 375;
					updatePanelChart(panelChart, panelState, false);
				});
			});

			// Trade Button
			var tradeBtn = pDiv.querySelector('.panel-trade-btn');
			if (tradeBtn) {
				tradeBtn.addEventListener('click', function() {
					selectStock(stockMap[panelState.ticker]);
					var orderPanel = document.querySelector('.order-panel');
					if (orderPanel) {
						orderPanel.classList.add('pulse-anim');
						setTimeout(function() { orderPanel.classList.remove('pulse-anim'); }, 500);
					}
				});
			}

			// Add drawing mouse listeners to this panel canvas
			setupDrawingListenersForCanvas(panelCanvas, function() { return panelChart; }, function() { return panelState.ticker; });
		})(pi, ps, panelDiv);
	}
}

function buildPanelChart(canvas, panelState) {
	var ctx = canvas.getContext('2d');
	var isLight = state.theme === 'light' || state.theme === 'sepia';
	var chart = new Chart(ctx, {
		type: 'line',
		plugins: [drawingPlugin],
		data: { labels: [], datasets: [
			{ data: [], borderWidth: 1.5, pointRadius: 0, fill: true, tension: 0.15 },
			{ label: "SMA 20", data: [], borderWidth: 1.5, borderColor: "rgba(255, 152, 0, 0.85)", backgroundColor: "transparent", pointRadius: 0, fill: false, tension: 0.1, hidden: true },
			{ label: "EMA 20", data: [], borderWidth: 1.5, borderColor: "rgba(156, 39, 176, 0.85)", backgroundColor: "transparent", pointRadius: 0, fill: false, tension: 0.1, hidden: true },
			{ label: "BB Upper", data: [], borderWidth: 1, borderColor: "rgba(0, 188, 212, 0.7)", backgroundColor: "rgba(0, 188, 212, 0.06)", pointRadius: 0, fill: '+1', tension: 0.1, borderDash: [3, 3], hidden: true },
			{ label: "BB Lower", data: [], borderWidth: 1, borderColor: "rgba(0, 188, 212, 0.7)", backgroundColor: "rgba(0, 188, 212, 0.06)", pointRadius: 0, fill: false, tension: 0.1, borderDash: [3, 3], hidden: true },
			{ label: "VWAP", data: [], borderWidth: 1.5, borderColor: "rgba(255, 214, 0, 0.9)", backgroundColor: "transparent", pointRadius: 0, fill: false, tension: 0.1, borderDash: [4, 4], hidden: true },
			{ label: "Pos Avg", data: [], borderWidth: 1.5, borderDash: [4, 4], borderColor: "rgba(33, 150, 243, 0.9)", backgroundColor: "transparent", pointRadius: 0, fill: false, tension: 0, hidden: true },
			{ label: "Pos SL", data: [], borderWidth: 1.5, borderDash: [4, 4], borderColor: "rgba(244, 67, 54, 0.8)", backgroundColor: "transparent", pointRadius: 0, fill: false, tension: 0, hidden: true },
			{ label: "Pos Tgt", data: [], borderWidth: 1.5, borderDash: [4, 4], borderColor: "rgba(76, 175, 80, 0.8)", backgroundColor: "transparent", pointRadius: 0, fill: false, tension: 0, hidden: true }
		] },
		options: {
			responsive: true, maintainAspectRatio: false, animation: false,
			plugins: { legend: { display: false }, tooltip: { enabled: false } },
			scales: {
				x: { display: false, grid: { display: false } },
				y: {
					display: true, position: 'right',
					grid: { color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)', drawBorder: false },
					ticks: { color: isLight ? '#666' : '#707888', font: { size: 9 }, maxTicksLimit: 6,
						callback: function(v) { return v >= 1000 ? (v/1000).toFixed(1) + 'k' : v.toFixed(0); }
					}
				}
			}
		}
	});
	updatePanelChart(chart, panelState, true);
	return chart;
}

function updatePanelChart(chart, panelState, skipUpdate) {
	var stock = stockMap[panelState.ticker];
	if (!stock || !chart) return;
	
	// Tag chart with ticker for drawingPlugin
	chart._panelTicker = panelState.ticker;

	var isLight = state.theme === 'light' || state.theme === 'sepia';
	var fullHistory = stock.preHistory && stock.preHistory.length
		? stock.preHistory.concat(stock.history)
		: stock.history;

	// Update panel header price indicator
	var panelId = chart.canvas.id.replace('panel-canvas-', '');
	var panelPriceEl = document.getElementById('panel-price-' + panelId);
	if (panelPriceEl) {
		panelPriceEl.textContent = fmtPrice(stock, stock.ltp);
		var basePrice = stock.prevClose || stock.open;
		var dayChg = stock.ltp - basePrice;
		panelPriceEl.className = 'panel-price-ind ' + (dayChg >= 0 ? 'up' : 'dn');
	}
	var slice = fullHistory.slice(-(panelState.viewLen || 375));
	
	// Extract values correctly. stock.history is an array of objects `{o,h,l,c,v}`
	var prices = slice.map(function(d) { return d.c !== undefined ? d.c : d; });
	var vols = slice.map(function(d) { return d.v !== undefined ? d.v : 1; });

	var firstP = prices[0] || 1;
	var lastP = prices[prices.length - 1] || 0;
	var lineColor = lastP >= firstP
		? (isLight ? '#00a846' : '#00c853')
		: (isLight ? '#d50032' : '#ff1744');

	chart.data.labels = prices.map(function(_, i) { return i; });
	var ds = chart.data.datasets[0];
	ds.data = prices;
	ds.borderColor = lineColor;
	ds.backgroundColor = lineColor + '12';

	// ── Update SMA & EMA ──
	var dsSMA = chart.data.datasets[1];
	if (state.showSMA && prices.length) {
		dsSMA.data = calcSMA(prices, 20);
		dsSMA.hidden = false;
	} else {
		dsSMA.data = [];
		dsSMA.hidden = true;
	}

	var dsEMA = chart.data.datasets[2];
	if (state.showEMA && prices.length) {
		dsEMA.data = calcEMA(prices, 20);
		dsEMA.hidden = false;
	} else {
		dsEMA.data = [];
		dsEMA.hidden = true;
	}

	// ── Update BB ──
	var dsBBUpper = chart.data.datasets[3];
	var dsBBLower = chart.data.datasets[4];
	if (state.showBB && prices.length) {
		var bb = calcBollingerBands(prices, 20, 2);
		dsBBUpper.data = bb.upper;
		dsBBLower.data = bb.lower;
		dsBBUpper.hidden = false;
		dsBBLower.hidden = false;
	} else {
		dsBBUpper.data = []; dsBBLower.data = [];
		dsBBUpper.hidden = true; dsBBLower.hidden = true;
	}

	// ── Update VWAP ──
	var dsVWAP = chart.data.datasets[5];
	if (state.showVWAP && prices.length) {
		dsVWAP.data = calcVWAP(prices, vols);
		dsVWAP.hidden = false;
	} else {
		dsVWAP.data = [];
		dsVWAP.hidden = true;
	}

	// ── Position Lines ──
	var dsAvg = chart.data.datasets[6];
	var dsSL = chart.data.datasets[7];
	var dsTgt = chart.data.datasets[8];
	
	var pos = state.positions[stock.ticker];
	var dataLen = prices.length;
	if (dsAvg) {
		if (pos && dataLen) {
			dsAvg.data = Array(dataLen).fill(pos.avgPrice);
			dsAvg.hidden = false;
		} else {
			dsAvg.data = []; dsAvg.hidden = true;
		}
	}

	var st = state.slTargets[stock.ticker];
	if (dsSL) {
		if (st && st.sl && dataLen) {
			dsSL.data = Array(dataLen).fill(st.sl);
			dsSL.hidden = false;
		} else {
			dsSL.data = []; dsSL.hidden = true;
		}
	}
	
	if (dsTgt) {
		if (st && st.target && dataLen) {
			dsTgt.data = Array(dataLen).fill(st.target);
			dsTgt.hidden = false;
		} else {
			dsTgt.data = []; dsTgt.hidden = true;
		}
	}

	if (!skipUpdate) chart.update('none');
}

function updateAllPanels() {
	// Called from the market tick loop to refresh multi-chart panels
	if (state.chartLayout === '1x') return;
	multiChartInstances.forEach(function(chart, pi) {
		if (!chart) return;
		var ps = state.panelStates[pi];
		if (!ps) return;
		updatePanelChart(chart, ps, false);
	});
}

function setChartType(type) {
	state.chartType = type;
	document
		.getElementById("btn-chart-line")
		.classList.toggle("active", type === "line");
	document
		.getElementById("btn-chart-candle")
		.classList.toggle("active", type === "candle");
	if (state.activeStock) renderChart(state.activeStock);
}

function setChartScale(scale) {
	var wasLog = state.chartScale === "log";
	var willLog = scale === "log";
	state.chartScale = scale;
	document.querySelectorAll(".scale-btn").forEach(function (b) {
		b.classList.remove("active");
	});
	var btn = document.getElementById("btn-scale-" + scale);
	if (btn) btn.classList.add("active");
	// Log ↔ Linear axis type switch requires chart rebuild
	if (wasLog !== willLog && chartInstance) {
		chartInstance.destroy();
		chartInstance = null;
	}
	if (state.activeStock) renderChart(state.activeStock);
}

function setViewLength(label) {
	var tf = VIEW_LENGTHS.find(function (t) {
		return t.label === label;
	});
	if (!tf) return;
	state.viewLen = tf.viewLen;
	document.querySelectorAll(".chart-view-lengths .tf-btn").forEach(function (b) {
		b.classList.remove("active");
	});
	var activeBtn = document.getElementById("tf-" + label);
	if (activeBtn) activeBtn.classList.add("active");
	
	// Auto-adjust interval based on view length to prevent too many candles
	var autoInterval = state.candlePeriod;
	if (label === "1D") autoInterval = 5;      // 5m
	else if (label === "1W") autoInterval = 15; // 15m
	else if (label === "1M") autoInterval = 60; // 1h
	
	var customDropdown = document.getElementById("custom-interval-dropdown");
	if (customDropdown) {
		var maxInterval = 1875;
		var minInterval = 0;
		if (label === "1D") {
			maxInterval = 60; // max 1H
			minInterval = 0;
		} else if (label === "1W") {
			maxInterval = 375; // max 1D
			minInterval = 30; // disable 5m, 15m
		} else if (label === "1M") {
			maxInterval = 1875; // max 1W
			minInterval = 60; // disable 5m, 15m, 30m
		}

		document.querySelectorAll(".dropdown-option").forEach(function(opt) {
			var val = parseInt(opt.dataset.value, 10);
			if (val > maxInterval || val < minInterval) {
				opt.classList.add("disabled");
				// If currently selected interval is now disabled, fallback to autoInterval
				if (state.candlePeriod === val) state.candlePeriod = autoInterval;
			} else {
				opt.classList.remove("disabled");
			}
		});

		// Ensure we don't automatically override a valid user interval
		if (state.candlePeriod > maxInterval || state.candlePeriod < minInterval || state.candlePeriod === autoInterval) {
			state.candlePeriod = autoInterval;
		}
		
		// Update UI
		document.querySelectorAll(".dropdown-option").forEach(function(opt) {
			if (parseInt(opt.dataset.value, 10) === state.candlePeriod) {
				opt.classList.add("active");
				document.getElementById("interval-display").textContent = opt.textContent;
			} else {
				opt.classList.remove("active");
			}
		});
	}

	if (state.activeStock) renderChart(state.activeStock);
}

function setIntervalDropdown(val, text) {
	state.candlePeriod = parseInt(val, 10);
	
	// Clear cached live candles to force accurate dynamic rebuild at new interval
	marketStocks.forEach(function(s) {
		s.ohlcHistory = [];
		s.currentCandle = null;
	});
	
	if (text) document.getElementById("interval-display").textContent = text;
	if (state.activeStock) renderChart(state.activeStock);
}

function renderChart(stock) {
	var canvas = document.getElementById("main-chart");
	var ctx = canvas.getContext("2d");
	var isLight = state.theme === "light" || state.theme === "sepia";
	var fontMap = { outfit: "Outfit", inter: "Inter", "roboto-mono": "Roboto Mono", "space-grotesk": "Space Grotesk", playfair: "Playfair Display", poppins: "Poppins", "ibm-plex": "IBM Plex Sans", jetbrains: "JetBrains Mono" };
	var currentFont = fontMap[state.font] || "Outfit";
	var needsLog = state.chartScale === "log";

	// Destroy chart if Y-axis type needs to change (log ↔ linear) or chart type changes or theme changes
	if (chartInstance) {
		var curLog = chartInstance._isLogAxis || false;
		var curType = chartInstance._chartType || "line";
		var curTheme = chartInstance._theme || "dark";
		if (curLog !== needsLog || curType !== state.chartType || curTheme !== state.theme) {
			chartInstance.destroy();
			chartInstance = null;
		}
	}

	// Fast path - chart already exists, just mutate data in-place
	if (chartInstance) {
		_applyChartData(stock, isLight);
		return;
	}

	// Create the single chart instance
	chartInstance = new Chart(ctx, {
		type: "line",
		plugins: [candlestickPlugin, drawingPlugin],
		data: {
			labels: [],
			datasets: [
				{
					// 0: Main price line
					data: [],
					borderWidth: 2,
					pointRadius: 0,
					pointHoverRadius: 4,
					pointHoverBorderColor: "#fff",
					pointHoverBorderWidth: 2,
				},
				{
					// 1: Prev close reference line
					data: [],
					borderWidth: 1.5,
					borderDash: [6, 4],
					borderColor: "rgba(255, 165, 0, 0.7)",
					backgroundColor: "transparent",
					pointRadius: 0,
					pointHoverRadius: 0,
					fill: false,
					tension: 0,
				},
				{
					// 2: Avg Buy Price Line (blue dotted)
					label: "Avg Cost",
					data: [],
					borderWidth: 1.5,
					borderDash: [5, 5],
					borderColor: "rgba(41, 98, 255, 0.8)",
					backgroundColor: "transparent",
					pointRadius: 0,
					pointHoverRadius: 0,
					fill: false,
					tension: 0,
					hidden: true,
				},
				{
					// 3: Stop Loss Line (red dotted)
					label: "Stop Loss",
					data: [],
					borderWidth: 1.5,
					borderDash: [5, 5],
					borderColor: "rgba(255, 23, 68, 0.8)",
					backgroundColor: "transparent",
					pointRadius: 0,
					pointHoverRadius: 0,
					fill: false,
					tension: 0,
					hidden: true,
				},
				{
					// 4: Target Line (green dotted)
					label: "Target",
					data: [],
					borderWidth: 1.5,
					borderDash: [5, 5],
					borderColor: "rgba(0, 200, 83, 0.8)",
					backgroundColor: "transparent",
					pointRadius: 0,
					pointHoverRadius: 0,
					fill: false,
					tension: 0,
					hidden: true,
				},
				{
					// 5: SMA 20 (orange solid line)
					label: "SMA 20",
					data: [],
					borderWidth: 1.5,
					borderColor: "rgba(255, 152, 0, 0.85)",
					backgroundColor: "transparent",
					pointRadius: 0,
					pointHoverRadius: 0,
					fill: false,
					tension: 0.1,
					hidden: true,
				},
					{
					// 6: EMA 20 (purple solid line)
					label: "EMA 20",
					data: [],
					borderWidth: 1.5,
					borderColor: "rgba(156, 39, 176, 0.85)",
					backgroundColor: "transparent",
					pointRadius: 0,
					pointHoverRadius: 0,
					fill: false,
					tension: 0.1,
					hidden: true,
				},
				{
					// 7: BB Upper (teal)
					label: "BB Upper",
					data: [],
					borderWidth: 1,
					borderColor: "rgba(0, 188, 212, 0.7)",
					backgroundColor: "rgba(0, 188, 212, 0.06)",
					pointRadius: 0,
					pointHoverRadius: 0,
					fill: '+1',
					tension: 0.1,
					borderDash: [3, 3],
					hidden: true,
				},
				{
					// 8: BB Lower (teal)
					label: "BB Lower",
					data: [],
					borderWidth: 1,
					borderColor: "rgba(0, 188, 212, 0.7)",
					backgroundColor: "rgba(0, 188, 212, 0.06)",
					pointRadius: 0,
					pointHoverRadius: 0,
					fill: false,
					tension: 0.1,
					borderDash: [3, 3],
					hidden: true,
				},
				{
					// 9: VWAP (gold dashed)
					label: "VWAP",
					data: [],
					borderWidth: 1.5,
					borderColor: "rgba(255, 214, 0, 0.9)",
					backgroundColor: "transparent",
					pointRadius: 0,
					pointHoverRadius: 0,
					fill: false,
					tension: 0.1,
					borderDash: [4, 4],
					hidden: true,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			animation: false,
			plugins: {
				legend: { display: false },
				tooltip: {
					enabled: false,
					mode: "index",
					intersect: false,
					external: customTooltipHandler
				},
			},
			scales: {
				x: {
					display: true,
					grid: {
						drawBorder: false,
						color: "rgba(255,255,255,0.03)",
						drawTicks: false,
					},
					ticks: { display: false },
				},
				y: {
					type: needsLog ? "logarithmic" : "linear",
					display: true,
					position: "right",
					grid: {
						drawBorder: false,
						color: "rgba(255,255,255,0.015)",
						lineWidth: 1,
					},
					ticks: {
						font: { family: currentFont, size: 10 },
						padding: 10,
						maxTicksLimit: needsLog ? 8 : 12,
						callback: function (v) {
							if (state.chartScale === "pct") {
								return (v > 0 ? "+" : "") + v.toFixed(2) + "%";
							}
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
								v.toFixed(
									state.activeStock && state.activeStock.ltp < 10 ? 4 : 2,
								)
							);
						},
					},
				},
			},
			interaction: { mode: "index", axis: "x", intersect: false },
			hover: { mode: "index", intersect: false },
			onHover: function (event, elements, chart) {
				var canvas = chart.canvas;
				canvas.style.cursor = elements.length ? "crosshair" : "default";
			},
		},
	});

	chartInstance._isLogAxis = needsLog;
	chartInstance._chartType = state.chartType;
	chartInstance._theme = state.theme;
	_applyChartData(stock, isLight);
	
	// Ensure drawing listeners are bound to the current canvas/chart instance
	setupDrawingTools();
}


export { renderSubChart, setupDrawingListenersForCanvas, setupDrawingTools, setChartLayout, buildPanelChart, updatePanelChart, updateAllPanels, setChartType, setChartScale, setViewLength, setIntervalDropdown, renderChart, chartInstance, subChartInstance, multiChartInstances };

export function clearChartInstance() {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
}
export function clearSubChartInstance() {
    if (subChartInstance) { subChartInstance.destroy(); subChartInstance = null; }
}
