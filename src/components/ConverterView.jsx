'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeftRight, RefreshCw, TrendingDown, TrendingUp,
  Loader2, AlertCircle, Wallet, Globe, ChevronRight,
} from 'lucide-react';
import { SUPPORTED_CURRENCIES, formatCurrency } from '@/lib/currency';

// ── Fallback static rates relative to USD (used if API is unavailable) ────────
const FALLBACK_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, JPY: 149.5,
  CAD: 1.36, AUD: 1.53, AED: 3.67, SGD: 1.34, CHF: 0.89,
};

// ── Fetch live rates from open.er-api.com (free, no key required) ─────────────
async function fetchRates(base = 'USD') {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Rate fetch failed');
  const json = await res.json();
  if (json.result !== 'success') throw new Error('Bad response');
  return json.rates;
}

// ── Currency selector ─────────────────────────────────────────────────────────
function CurrencySelect({ value, onChange, label }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] text-slate-400 font-semibold">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm font-bold focus:outline-none focus:border-[#74FFAC] transition-colors cursor-pointer">
        {SUPPORTED_CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
        ))}
      </select>
    </div>
  );
}

export default function ConverterView({ transactions = [], selectedCurrency = 'USD' }) {
  // ── Converter state ────────────────────────────────────────────────────────
  const [fromCurrency, setFromCurrency] = useState('INR');
  const [toCurrency,   setToCurrency]   = useState(selectedCurrency);
  const [inputAmount,  setInputAmount]  = useState('100');
  const [rates,        setRates]        = useState(null);
  const [ratesBase,    setRatesBase]    = useState(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [rateError,    setRateError]    = useState(null);
  const [lastUpdated,  setLastUpdated]  = useState(null);

  // ── Load rates ─────────────────────────────────────────────────────────────
  const loadRates = useCallback(async (base = 'USD') => {
    setIsLoading(true);
    setRateError(null);
    try {
      const r = await fetchRates(base);
      setRates(r);
      setRatesBase(base);
      setLastUpdated(new Date());
    } catch {
      setRates(FALLBACK_RATES);
      setRatesBase('USD');
      setRateError('Live rates unavailable — showing estimated rates.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadRates('USD'); }, [loadRates]);

  // ── Conversion calc ────────────────────────────────────────────────────────
  const convertedAmount = useMemo(() => {
    if (!rates) return null;
    const amt = parseFloat(inputAmount);
    if (isNaN(amt) || amt < 0) return null;
    // Convert from→USD→to
    const inUsd = ratesBase === fromCurrency
      ? amt
      : amt / (rates[fromCurrency] || 1);
    return inUsd * (rates[toCurrency] || 1);
  }, [rates, ratesBase, fromCurrency, toCurrency, inputAmount]);

  const exchangeRate = useMemo(() => {
    if (!rates) return null;
    const oneInUsd = 1 / (rates[fromCurrency] || 1);
    return oneInUsd * (rates[toCurrency] || 1);
  }, [rates, fromCurrency, toCurrency]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const fromSymbol = SUPPORTED_CURRENCIES.find((c) => c.code === fromCurrency)?.symbol ?? fromCurrency;
  const toSymbol   = SUPPORTED_CURRENCIES.find((c) => c.code === toCurrency)?.symbol ?? toCurrency;

  // ── Expense comparison ─────────────────────────────────────────────────────
  const comparisonCurrency = toCurrency;

  const expenseComparisons = useMemo(() => {
    if (!rates || !transactions.length) return [];

    // Convert each transaction from selectedCurrency → comparisonCurrency
    const rateFromSelected = rates[selectedCurrency] || 1;
    const rateToComparison = rates[comparisonCurrency] || 1;
    const factor = rateToComparison / rateFromSelected;

    // Group by category
    const byCategory = {};
    transactions.forEach((tx) => {
      const cat = tx.category || 'Other';
      byCategory[cat] = (byCategory[cat] || 0) + Number(tx.amount || 0);
    });

    return Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({
        category:   cat,
        original:   amt,
        converted:  amt * factor,
      }));
  }, [transactions, rates, selectedCurrency, comparisonCurrency]);

  const totalOriginal  = expenseComparisons.reduce((s, r) => s + r.original, 0);
  const totalConverted = expenseComparisons.reduce((s, r) => s + r.converted, 0);

  // ── All-currencies rate table ──────────────────────────────────────────────
  const rateTable = useMemo(() => {
    if (!rates) return [];
    const baseRate = rates[fromCurrency] || 1;
    return SUPPORTED_CURRENCIES.filter((c) => c.code !== fromCurrency).map((c) => ({
      ...c,
      rate: (rates[c.code] || 1) / baseRate,
    }));
  }, [rates, fromCurrency]);

  return (
    <div className="space-y-5 animate-fade-in pb-4">

      {/* Title */}
      <div className="pt-1">
        <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#74FFAC]" />
          Currency Converter
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Live exchange rates · compare your expenses in any currency
        </p>
      </div>

      {/* ── Converter card ── */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">

        {/* From / To row */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <CurrencySelect value={fromCurrency} onChange={setFromCurrency} label="From" />
          </div>
          <button type="button" onClick={handleSwap}
            className="mb-0.5 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[#74FFAC] transition-colors shrink-0">
            <ArrowLeftRight className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <CurrencySelect value={toCurrency} onChange={setToCurrency} label="To" />
          </div>
        </div>

        {/* Amount input */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-400 font-semibold">Amount</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
              {fromSymbol}
            </span>
            <input
              type="number"
              min="0"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-lg font-extrabold num-tabular focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC] transition-colors"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Result */}
        <div className="p-4 rounded-xl bg-slate-950 border border-[#74FFAC]/20 space-y-1">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-[#74FFAC]" />
              Fetching live rates…
            </div>
          ) : convertedAmount !== null ? (
            <>
              <div className="text-2xl font-extrabold text-[#74FFAC] num-tabular" suppressHydrationWarning>
                {toSymbol}{convertedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </div>
              <div className="text-[11px] text-slate-400" suppressHydrationWarning>
                1 {fromCurrency} = {exchangeRate?.toFixed(4)} {toCurrency}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500">Enter an amount above</div>
          )}
        </div>

        {/* Rate info row */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            {rateError
              ? <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              : <span className="w-2 h-2 rounded-full bg-[#74FFAC] animate-pulse" />}
            <span className={rateError ? 'text-amber-400' : 'text-slate-400'}>
              {rateError ?? (lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Live rates')}
            </span>
          </div>
          <button type="button" onClick={() => loadRates('USD')} disabled={isLoading}
            className="flex items-center gap-1 text-[#74FFAC] hover:underline disabled:opacity-40">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── All-currencies rate table ── */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-slate-200">
          1 {fromCurrency} in other currencies
        </h3>
        <div className="space-y-2">
          {rateTable.map((c) => (
            <div key={c.code} className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200 w-10">{c.code}</span>
                <span className="text-[11px] text-slate-500">{c.name.split(' (')[0]}</span>
              </div>
              <span className="text-xs font-bold text-[#74FFAC] num-tabular" suppressHydrationWarning>
                {c.symbol}{c.rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Expense comparison ── */}
      {transactions.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#74FFAC]" />
              Your Expenses in {comparisonCurrency}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              All-time totals converted from {selectedCurrency} → {comparisonCurrency}
            </p>
          </div>

          {/* Total row */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-[#74FFAC]/20">
            <div className="text-xs text-slate-400 font-semibold">Total Spend</div>
            <div className="text-right">
              <div className="text-sm font-extrabold text-[#FF4885] num-tabular" suppressHydrationWarning>
                {formatCurrency(totalOriginal, selectedCurrency)}
              </div>
              <div className="text-[11px] text-[#74FFAC] num-tabular" suppressHydrationWarning>
                ≈ {toSymbol}{totalConverted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {comparisonCurrency}
              </div>
            </div>
          </div>

          {/* Per-category breakdown */}
          <div className="space-y-2.5">
            {expenseComparisons.map((row) => (
              <div key={row.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">{row.category}</span>
                  <div className="text-right">
                    <span className="text-slate-400 num-tabular" suppressHydrationWarning>
                      {formatCurrency(row.original, selectedCurrency)}
                    </span>
                    <span className="text-slate-500 mx-1.5">→</span>
                    <span className="font-bold text-[#74FFAC] num-tabular" suppressHydrationWarning>
                      {toSymbol}{row.converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {comparisonCurrency}
                    </span>
                  </div>
                </div>
                {/* Proportional bar */}
                <div className="w-full h-1 rounded-full bg-slate-900 overflow-hidden">
                  <div className="h-full rounded-full bg-[#74FFAC]/60 transition-all duration-700"
                    style={{ width: `${totalOriginal > 0 ? (row.original / totalOriginal) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Context note */}
          <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
            <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-[#74FFAC]" />
            Rates are indicative. Change the "To" currency above to compare in any currency.
          </p>
        </div>
      )}

    </div>
  );
}
