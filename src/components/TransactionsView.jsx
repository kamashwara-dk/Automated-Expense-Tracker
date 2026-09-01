'use client';

import { useState, useMemo } from 'react';
import {
  Search, Plus, Utensils, ShoppingBag, CreditCard, Zap, Tv,
  HeartPulse, Tag, Calendar, XCircle, Trash2, Edit3, Download,
  ChevronDown, ChevronRight, Archive, TrendingDown,
} from 'lucide-react';
import { formatShortDate, formatTime } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/currency';

const CATEGORY_CONFIGS = {
  'Food & Dining':   { icon: Utensils,    badge: 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/20' },
  'Shopping':        { icon: ShoppingBag, badge: 'bg-[#FF4885]/10 text-[#FF4885] border-[#FF4885]/20' },
  'Transportation':  { icon: CreditCard,  badge: 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/20' },
  'Bills & Utilities':{ icon: Zap,        badge: 'bg-[#FF4885]/10 text-[#FF4885] border-[#FF4885]/20' },
  'Subscriptions':   { icon: Tv,          badge: 'bg-[#FF4885]/10 text-[#FF4885] border-[#FF4885]/20' },
  'Healthcare':      { icon: HeartPulse,  badge: 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/20' },
  'Other':           { icon: Tag,         badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  'Auto-Captured':   { icon: Zap,         badge: 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/20' },
  'General':         { icon: Tag,         badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

const CATEGORY_FILTERS = [
  'All', 'Food & Dining', 'Shopping', 'Transportation',
  'Bills & Utilities', 'Subscriptions', 'Healthcare',
];

function localDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Returns YYYY-MM key for a date */
function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** e.g. "2026-08" → "August 2026" */
function formatMonthLabel(key) {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function SkeletonRow() {
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-slate-800/80">
      <div className="w-10 h-10 rounded-xl skeleton shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-36 rounded" />
        <div className="skeleton h-2.5 w-24 rounded" />
      </div>
      <div className="skeleton h-5 w-16 rounded" />
    </div>
  );
}

// ── Single transaction row ────────────────────────────────────────────────────
function TxRow({ tx, selectedCurrency, onEditTransaction, onDeleteTransaction }) {
  const catConfig = CATEGORY_CONFIGS[tx.category] || CATEGORY_CONFIGS['Other'];
  const IconComp  = catConfig.icon;
  return (
    <div className="glass-card glass-card-hover rounded-2xl p-4 flex items-center justify-between border border-slate-800/80">
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[#74FFAC] shrink-0">
          <IconComp className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-100">{tx.merchant}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${catConfig.badge}`}>
              {tx.category}
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-1" suppressHydrationWarning>
              <Calendar className="w-3 h-3" />
              {formatShortDate(tx.date)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <span className="text-base font-extrabold text-[#FF4885] num-tabular" suppressHydrationWarning>
            -{formatCurrency(tx.amount, selectedCurrency)}
          </span>
          <p className="text-[10px] text-slate-500" suppressHydrationWarning>{formatTime(tx.date)}</p>
        </div>
        <div className="flex items-center gap-1">
          {onEditTransaction && (
            <button type="button" onClick={() => onEditTransaction(tx)}
              className="p-2 rounded-xl hover:bg-[#74FFAC]/10 text-slate-500 hover:text-[#74FFAC] transition-all touch-target"
              aria-label={`Edit ${tx.merchant}`}>
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {onDeleteTransaction && (
            <button type="button" onClick={() => onDeleteTransaction(tx.id)}
              className="p-2 rounded-xl hover:bg-[#FF4885]/10 text-slate-500 hover:text-[#FF4885] transition-all touch-target"
              aria-label={`Delete ${tx.merchant}`}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Archived month accordion ──────────────────────────────────────────────────
function MonthAccordion({ monthKey: key, transactions, selectedCurrency, onEditTransaction, onDeleteTransaction }) {
  const [open, setOpen] = useState(false);
  const total = transactions.reduce((s, tx) => s + Number(tx.amount || 0), 0);
  const label = formatMonthLabel(key);

  return (
    <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header — clickable */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
            <Archive className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-200">{label}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-sm font-extrabold text-[#FF4885] num-tabular" suppressHydrationWarning>
              -{formatCurrency(total, selectedCurrency)}
            </p>
            <p className="text-[10px] text-slate-500">total spent</p>
          </div>
          {open
            ? <ChevronDown className="w-4 h-4 text-slate-400 transition-transform" />
            : <ChevronRight className="w-4 h-4 text-slate-400 transition-transform" />}
        </div>
      </button>

      {/* Expandable transaction list */}
      {open && (
        <div className="border-t border-slate-800 px-3 py-3 space-y-2 animate-fade-in">
          {transactions.map((tx) => (
            <TxRow
              key={tx.id}
              tx={tx}
              selectedCurrency={selectedCurrency}
              onEditTransaction={onEditTransaction}
              onDeleteTransaction={onDeleteTransaction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TransactionsView({
  transactions = [],
  selectedCurrency = 'USD',
  isDataLoading = false,
  onOpenManualEntry,
  onOpenExport,
  onEditTransaction,
  onDeleteTransaction,
}) {
  const [searchQuery,       setSearchQuery]       = useState('');
  const [selectedCategory,  setSelectedCategory]  = useState('All');

  // ── Split transactions into current month vs archived months ─────────────
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const { currentMonthTxs, archivedMonths } = useMemo(() => {
    const current = [];
    const archived = {}; // { 'YYYY-MM': [tx, ...] }

    transactions.forEach((tx) => {
      const key = monthKey(tx.date);
      if (key === currentMonthKey) {
        current.push(tx);
      } else {
        if (!archived[key]) archived[key] = [];
        archived[key].push(tx);
      }
    });

    // Sort archived months newest first
    const sortedArchived = Object.entries(archived)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, txs]) => ({
        key,
        // Sort transactions within each month newest first
        transactions: [...txs].sort((a, b) => new Date(b.date) - new Date(a.date)),
      }));

    return { currentMonthTxs: current, archivedMonths: sortedArchived };
  }, [transactions, currentMonthKey]);

  // ── Filter current month transactions ─────────────────────────────────────
  const filteredCurrentTxs = useMemo(() => {
    return currentMonthTxs.filter((tx) => {
      const matchesSearch =
        (tx.merchant || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || tx.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [currentMonthTxs, searchQuery, selectedCategory]);

  // ── Group current month by Today / Yesterday / Earlier ───────────────────
  const groupedCurrentTxs = useMemo(() => {
    const todayStr     = localDateStr(new Date());
    const yDate        = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yesterdayStr = localDateStr(yDate);

    const groups = { Today: [], Yesterday: [], Earlier: [] };
    filteredCurrentTxs.forEach((tx) => {
      const s = localDateStr(new Date(tx.date));
      if (s === todayStr)     groups.Today.push(tx);
      else if (s === yesterdayStr) groups.Yesterday.push(tx);
      else                    groups.Earlier.push(tx);
    });
    return groups;
  }, [filteredCurrentTxs]);

  const currentTotal = filteredCurrentTxs.reduce((s, tx) => s + Number(tx.amount || 0), 0);
  const currentMonthLabel = formatMonthLabel(currentMonthKey);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Transaction History</h2>
          <p className="text-xs text-slate-400">
            {currentMonthTxs.length} this month · {transactions.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onOpenExport?.()}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-800 touch-target">
            <Download className="w-4 h-4 text-[#74FFAC]" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button type="button" onClick={onOpenManualEntry}
            className="px-3.5 py-2 rounded-xl bg-[#74FFAC] hover:bg-[#74FFAC]/90 text-slate-950 text-xs font-extrabold shadow-md shadow-[#74FFAC]/20 flex items-center gap-1.5 transition-all touch-target">
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {isDataLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Filter by merchant or category..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC] transition-colors" />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            {CATEGORY_FILTERS.map((cat) => {
              const isActive = selectedCategory === cat;
              const count = cat === 'All' ? currentMonthTxs.length : currentMonthTxs.filter((t) => t.category === cat).length;
              return (
                <button key={cat} type="button" onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#74FFAC] text-slate-950 border-[#74FFAC] shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}>
                  <span>{cat}</span>
                  <span className={`px-1.5 rounded-md text-[10px] ${isActive ? 'bg-slate-950 text-[#74FFAC]' : 'bg-slate-800 text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Current month section ── */}
          <div className="space-y-3">
            {/* Current month header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#74FFAC] animate-pulse" />
                <span className="text-xs font-bold text-slate-200">{currentMonthLabel}</span>
                <span className="text-[10px] text-slate-500 bg-[#74FFAC]/10 border border-[#74FFAC]/20 text-[#74FFAC] px-2 py-0.5 rounded-full font-bold">
                  Active
                </span>
              </div>
              <span className="text-xs font-extrabold text-[#FF4885] num-tabular" suppressHydrationWarning>
                -{formatCurrency(currentTotal, selectedCurrency)}
              </span>
            </div>

            {/* Current month transactions */}
            {filteredCurrentTxs.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center border border-slate-800 space-y-2">
                {searchQuery || selectedCategory !== 'All' ? (
                  <>
                    <p className="text-sm font-bold text-slate-300">No matches found</p>
                    <p className="text-xs text-slate-500">Try resetting your filters.</p>
                    <button type="button" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                      className="text-xs font-bold text-[#74FFAC] hover:underline pt-1">
                      Reset Filters
                    </button>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-300">No expenses this month yet</p>
                    <p className="text-xs text-slate-500">A fresh start — add your first expense for {currentMonthLabel}.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(groupedCurrentTxs).map(([groupName, items]) => {
                  if (items.length === 0) return null;
                  return (
                    <div key={groupName} className="space-y-2">
                      <div className="flex items-center justify-between px-1 text-xs font-semibold text-slate-400 border-b border-slate-800/60 pb-1">
                        <span>{groupName}</span>
                        <span className="text-[11px] text-slate-500">{items.length} items</span>
                      </div>
                      <div className="space-y-2">
                        {items.map((tx) => (
                          <TxRow key={tx.id} tx={tx} selectedCurrency={selectedCurrency}
                            onEditTransaction={onEditTransaction} onDeleteTransaction={onDeleteTransaction} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Archived months accordion ── */}
          {archivedMonths.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 px-1">
                <Archive className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">History</span>
                <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
                  {archivedMonths.length} month{archivedMonths.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2">
                {archivedMonths.map(({ key, transactions: txs }) => (
                  <MonthAccordion
                    key={key}
                    monthKey={key}
                    transactions={txs}
                    selectedCurrency={selectedCurrency}
                    onEditTransaction={onEditTransaction}
                    onDeleteTransaction={onDeleteTransaction}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
