'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Utensils,
  ShoppingBag,
  CreditCard,
  Zap,
  Tv,
  HeartPulse,
  Tag,
  Calendar,
  XCircle,
  Trash2,
  Edit3,
  Download,
} from 'lucide-react';
import { formatShortDate, formatTime } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/currency';
import { exportTransactionsToCsv } from '@/lib/exportCsv';

const CATEGORY_CONFIGS = {
  'Food & Dining': { icon: Utensils, badge: 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/20' },
  'Shopping': { icon: ShoppingBag, badge: 'bg-[#FF4885]/10 text-[#FF4885] border-[#FF4885]/20' },
  'Transportation': { icon: CreditCard, badge: 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/20' },
  'Bills & Utilities': { icon: Zap, badge: 'bg-[#FF4885]/10 text-[#FF4885] border-[#FF4885]/20' },
  'Subscriptions': { icon: Tv, badge: 'bg-[#FF4885]/10 text-[#FF4885] border-[#FF4885]/20' },
  'Healthcare': { icon: HeartPulse, badge: 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/20' },
  'Other': { icon: Tag, badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  'Auto-Captured': { icon: Zap, badge: 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/20' },
};

const CATEGORY_FILTERS = [
  'All',
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Subscriptions',
  'Healthcare',
];

/** Get local date string YYYY-MM-DD without UTC conversion */
function localDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

export default function TransactionsView({
  transactions = [],
  selectedCurrency = 'USD',
  isDataLoading = false,
  onOpenManualEntry,
  onOpenExport,
  onEditTransaction,
  onDeleteTransaction,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [exportStatus, setExportStatus] = useState(null);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        (tx.merchant || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.category || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All' || tx.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchQuery, selectedCategory]);

  // Group transactions by Date — use local date to avoid UTC grouping bug
  const groupedTransactions = useMemo(() => {
    const todayStr = localDateStr(new Date());
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yesterdayStr = localDateStr(yDate);

    const groups = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };

    filteredTransactions.forEach((tx) => {
      const txDateStr = localDateStr(new Date(tx.date));
      if (txDateStr === todayStr) {
        groups.Today.push(tx);
      } else if (txDateStr === yesterdayStr) {
        groups.Yesterday.push(tx);
      } else {
        groups.Earlier.push(tx);
      }
    });

    return groups;
  }, [filteredTransactions]);

  const filteredTotal = filteredTransactions.reduce(
    (sum, tx) => sum + Number(tx.amount || 0),
    0
  );

  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) {
      setExportStatus('No transactions to export.');
      setTimeout(() => setExportStatus(null), 3000);
      return;
    }
    exportTransactionsToCsv(filteredTransactions, selectedCurrency);
    setExportStatus(`Exported ${filteredTransactions.length} transaction${filteredTransactions.length !== 1 ? 's' : ''}.`);
    setTimeout(() => setExportStatus(null), 3000);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Transaction History</h2>
          <p className="text-xs text-slate-400">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} logged
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onOpenExport?.()} title="Export transactions"
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

      {/* Export status message */}
      {exportStatus && (
        <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 text-center animate-slide-down">
          {exportStatus}
        </div>
      )}

      {/* Search Input Bar */}
      {isDataLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : (
        <>
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter by merchant or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC] transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = selectedCategory === cat;
          const count =
            cat === 'All'
              ? transactions.length
              : transactions.filter((t) => t.category === cat).length;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#74FFAC] text-slate-950 border-[#74FFAC] shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>{cat}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${isActive ? 'bg-slate-950 text-[#74FFAC]' : 'bg-slate-800 text-slate-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Total Filter Summary */}
      <div className="glass-card rounded-xl px-4 py-2.5 flex items-center justify-between border border-slate-800 text-xs">
        <span className="text-slate-400 font-medium">Subtotal Filtered:</span>
        <span className="font-extrabold text-[#FF4885] text-sm num-tabular" suppressHydrationWarning>
          {formatCurrency(filteredTotal, selectedCurrency)}
        </span>
      </div>

      {/* Grouped Feed */}
      <div className="space-y-5">
        {Object.entries(groupedTransactions).map(([groupName, items]) => {
          if (items.length === 0) return null;
          return (
            <div key={groupName} className="space-y-2">
              <div className="flex items-center justify-between px-1 text-xs font-semibold text-slate-400 border-b border-slate-800/60 pb-1">
                <span>{groupName}</span>
                <span className="text-[11px] text-slate-500">{items.length} items</span>
              </div>

              <div className="space-y-2">
                {items.map((tx) => {
                  const catConfig = CATEGORY_CONFIGS[tx.category] || CATEGORY_CONFIGS['Other'];
                  const IconComp = catConfig.icon;

                  return (
                    <div
                      key={tx.id}
                      className="glass-card glass-card-hover rounded-2xl p-4 flex items-center justify-between border border-slate-800/80 group"
                    >
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
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {formatShortDate(tx.date)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-base font-extrabold text-[#FF4885] num-tabular" suppressHydrationWarning>
                            -{formatCurrency(tx.amount, selectedCurrency)}
                          </span>
                          <p className="text-[10px] text-slate-500" suppressHydrationWarning>
                            {formatTime(tx.date)}
                          </p>
                        </div>
                      <div className="flex items-center gap-1">
                          {onEditTransaction && (
                            <button type="button" onClick={() => onEditTransaction(tx)}
                              title="Edit transaction"
                              className="p-2 rounded-xl hover:bg-[#74FFAC]/10 text-slate-500 hover:text-[#74FFAC] transition-all touch-target"
                              aria-label={`Edit ${tx.merchant}`}>
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {onDeleteTransaction && (
                            <button type="button" onClick={() => onDeleteTransaction(tx.id)}
                              title="Delete transaction"
                              className="p-2 rounded-xl hover:bg-[#FF4885]/10 text-slate-500 hover:text-[#FF4885] transition-all touch-target"
                              aria-label={`Delete ${tx.merchant}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center border border-slate-800 space-y-2">
            <h3 className="text-sm font-bold text-slate-200">No transactions found</h3>
            <p className="text-xs text-slate-400">
              Try resetting your search query or selecting &quot;All&quot; categories.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="text-xs font-bold text-[#74FFAC] hover:underline pt-1"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
