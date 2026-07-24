/**
 * Unit tests for core math utilities.
 *
 * Imports directly from js/math-utils.js — the single source of truth shared
 * by app.js — so tests always validate production code, never a duplicate.
 *
 * Run with: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcSMA, stdNormPDF, stdNormCDF, escapeHTML, fmtPrice } from '../js/math-utils.js';

// ── SMA ──────────────────────────────────────────────────────────────────────

test('calcSMA: basic 3-period average (sliding window)', () => {
    // Production impl pads initial (period-1) entries with null
    const prices = [10, 20, 30, 40, 50];
    const result = calcSMA(prices, 3);
    assert.deepEqual(result, [null, null, 20, 30, 40]);
});

test('calcSMA: returns all-null array when prices fewer than period', () => {
    // Array is same length as prices; all null since window never completes
    assert.deepEqual(calcSMA([10, 20], 3), [null, null]);
});

test('calcSMA: period-1 yields each value itself (no null prefix)', () => {
    assert.deepEqual(calcSMA([5, 10, 15], 1), [5, 10, 15]);
});

// ── Black-Scholes Math ────────────────────────────────────────────────────────

test('stdNormCDF: Φ(0) ≈ 0.5', () => {
    const cdf0 = stdNormCDF(0);
    assert.ok(Math.abs(cdf0 - 0.5) < 0.001, `Expected ~0.5 at x=0, got ${cdf0}`);
});

test('stdNormCDF: Φ(-x) + Φ(x) = 1 (symmetry)', () => {
    const x = 1.5;
    assert.ok(Math.abs(stdNormCDF(x) + stdNormCDF(-x) - 1) < 0.0001);
});

test('stdNormPDF: peak at x=0 equals 1/√(2π)', () => {
    const expected = 1 / Math.sqrt(2 * Math.PI);
    assert.ok(Math.abs(stdNormPDF(0) - expected) < 0.0001);
});

// ── Price Formatting ──────────────────────────────────────────────────────────

test('fmtPrice: null stock defaults to INR with Indian locale separators', () => {
    // fmtPrice(stock, value) — null stock → INR
    const formatted = fmtPrice(null, 1234.56);
    assert.ok(formatted.includes('1,234.56'), `Got: ${formatted}`);
    assert.ok(formatted.startsWith('₹'), `Expected ₹ prefix, got: ${formatted}`);
});

test('fmtPrice: USD stock uses $ prefix', () => {
    const formatted = fmtPrice({ currency: 'USD', ltp: 150 }, 1234.56);
    assert.ok(formatted.startsWith('$'), `Expected $ prefix, got: ${formatted}`);
});

// ── HTML Sanitisation ─────────────────────────────────────────────────────────

test('escapeHTML: escapes full XSS payload', () => {
    const dirty = '<script>alert("xss")</script>';
    const clean = escapeHTML(dirty);
    assert.strictEqual(clean, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
});

test('escapeHTML: escapes all five dangerous characters', () => {
    assert.ok(escapeHTML('&').includes('&amp;'));
    assert.ok(escapeHTML('<').includes('&lt;'));
    assert.ok(escapeHTML('>').includes('&gt;'));
    assert.ok(escapeHTML('"').includes('&quot;'));
    assert.ok(escapeHTML("'").includes('&#39;'));
});

test('escapeHTML: leaves safe strings unchanged', () => {
    assert.strictEqual(escapeHTML('Hello World 123'), 'Hello World 123');
});

