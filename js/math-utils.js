/**
 * math-utils.js — Pure, side-effect-free math utilities shared by the
 * simulation engine (app.js) and the test suite (tests/indicators.test.js).
 *
 * All functions here are zero-dependency and have no DOM references, making
 * them safely importable in Node.js test runners.
 */

// ── HTML Sanitisation ─────────────────────────────────────────────────────────

/**
 * Escapes the five HTML-dangerous characters so user-supplied strings can be
 * safely rendered as text content in dynamically-built innerHTML strings.
 * @param {*} str
 * @returns {string}
 */
export function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function(m) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
}

// ── Black-Scholes / Options Math ─────────────────────────────────────────────

/**
 * Standard Normal Probability Density Function.
 * @param {number} x
 * @returns {number}
 */
export function stdNormPDF(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Standard Normal Cumulative Distribution Function (Abramowitz & Stegun approx).
 * @param {number} x
 * @returns {number}
 */
export function stdNormCDF(x) {
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

// ── Technical Indicators ──────────────────────────────────────────────────────

/**
 * Simple Moving Average — O(n) sliding window.
 * Returns an array of the same length as prices.
 * Values for the first (period - 1) indices are null (incomplete window).
 * @param {number[]} prices
 * @param {number} period
 * @returns {(number|null)[]}
 */
export function calcSMA(prices, period) {
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

// ── Price Formatting ─────────────────────────────────────────────────────────

/**
 * Formats a raw numeric value as a currency string.
 * When stock is null/undefined, defaults to INR (₹) with 2 decimal places.
 * @param {object|null} stock  - Stock object with .currency and .ltp fields.
 * @param {number} value
 * @returns {string}
 */
export function fmtPrice(stock, value) {
    if (value === undefined || value === null || isNaN(value)) return stock ? '' : '₹0.00';
    var fraction = stock && stock.ltp < 10 ? 4 : 2;
    if (!stock || stock.currency === 'INR')
        return '₹' + value.toLocaleString('en-IN', { minimumFractionDigits: fraction, maximumFractionDigits: fraction });
    if (stock.currency === 'USD')
        return '$' + value.toLocaleString('en-US', { minimumFractionDigits: fraction, maximumFractionDigits: fraction });
    if (stock.currency === 'CNY') return '¥' + value.toFixed(fraction);
    if (stock.currency === 'JPY') return '¥' + value.toFixed(fraction);
    if (stock.currency === 'HKD') return 'HK$' + value.toFixed(fraction);
    if (stock.currency === 'GBP') return '£' + value.toFixed(fraction);
    if (stock.currency === 'EUR') return '€' + value.toFixed(fraction);
    return value.toFixed(fraction);
}
