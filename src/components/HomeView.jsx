'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Sparkles, Calendar, ShoppingBag, Utensils,
  Zap, CreditCard, ArrowRight, Plus, Code2, CheckCircle2, AlertTriangle,
  Target, Edit2, Check, BellRing, Trash2, Edit3, Wallet, RefreshCw,
} from 'lucide-react';
import { calculateWeeklyStats } from '@/lib/mockData';
import { formatShortDate } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/currency';
import InstallPwaBanner from '@/components/InstallPwaBanner';
import CategoryBreakdownCard from '@/components/CategoryBreakdownCard';
import { useLocalStorage } from '@/lib/useLocalStorage';

const CATEGORY_ICONS = {
  'Food & Dining': Utensils,
  'Shopping': ShoppingBag,
  'Transportation': CreditCard,
  'Bills & Utilities': Zap,
};

function CustomTooltip({ active, payload, selectedCurrency }) {
  if (active && payload && payload.length) {
    const dp = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-[#74FFAC]/30 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1">
        <p className="text-slate-400 font-medium">{dp.day} ({dp.date})</p>
        <p className="text-sm font-bold text-[#74FFAC] num-tabular">
          {formatCurrency(payload[0].value, selectedCurrency)}
        </p>
      </div>
    );
  }
  return null;
}

function SkeletonCard({ lines = 2 }) {
  return (
    <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3">
      <div className="skeleton h-3 w-32 rounded" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-2.5 rounded" style={{ width: `${65 + i * 15}%` }} />
      ))}
    </div>
  );
}

/** Get local date string YYYY-MM-DD without UTC conversion */
function localDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function HomeView({
  transactions = [],
  selectedCurrency = 'USD',
  isDataLoading = false,
  onNavigateToTransactions,
  onOpenManualEntry,
  onOpenDevSettings,
  onEditTransaction,
  onDeleteTransaction,
}) {
  // Persisted settings
  const [budgetCap, setBudgetCap] = useLocalStorage('myvaluta-budget-cap', 500);
  const [dailyAlertLimit, setDailyAlertLimit] = useLocalStorage('myvaluta-daily-limit', 50);

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudgetInput, setTempBudgetInput] = useState('');
  const [isEditingDailyLimit, setIsEditingDailyLimit] = useState(false);
  const [tempDailyInput, setTempDailyInput] = useState('');

  const stats = calculateWeeklyStats(transactions);

  // Use local date to avoid UTC grouping mismatch
  const todayStr = localDateStr();

  const todayTotal = useMemo(() => {
    return transactions.reduce((sum, tx) => {
      const txStr = localDateStr(new Date(tx.date));
      return txStr === todayStr ? sum + Number(tx.amount || 0) : sum;
    }, 0);
  }, [transactions, todayStr]);

  // Monthly total (current calendar month)
  const monthlyTotal = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return transactions.reduce((sum, tx) => {
      const d = new Date(tx.date);
      return d.getFullYear() === year && d.getMonth() === month
        ? sum + Number(tx.amount || 0)
        : sum;
    }, 0);
  }, [transactions]);

  const isDailyLimitExceeded = todayTotal > dailyAlertLimit;
  // Use monthly total for Monthly Budget Cap (fixes logic mismatch)
  const budgetSpentPct = budgetCap > 0 ? (monthlyTotal / budgetCap) * 100 : 0;
  const budgetRemaining = budgetCap - monthlyTotal;

  let insightState = 'optimal';
  if (isDailyLimitExceeded || stats.pctChange > 15 || budgetSpentPct > 90) {
    insightState = 'critical';
  } else if (stats.current7Total > 220 || budgetSpentPct > 70) {
    insightState = 'warning';
  }

  const handleSaveBudget = () => {
    const val = parseFloat(tempBudgetInput);
    if (!isNaN(val) && val > 0) setBudgetCap(val);
    setIsEditingBudget(false);
  };

  const handleSaveDailyLimit = () => {
    const val = parseFloat(tempDailyInput);
    if (!isNaN(val) && val > 0) setDailyAlertLimit(val);
    setIsEditingDailyLimit(false);
  };

  const isEmpty = transactions.length === 0;

  if (isDataLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <InstallPwaBanner />

      {/* 1. HERO BALANCE CARD */}
      <div className="glass-card rounded-3xl p-6 relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-emerald-950/30 border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Calendar className="w-4 h-4 text-[#74FFAC]" />
            <span>7-Day Spending Velocity</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border num-tabular ${stats.isIncrease ? 'bg-[#FF4885]/10 text-[#FF4885] border-[#FF4885]/20' : 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/20'}`}>
            {stats.isIncrease ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span suppressHydrationWarning>{Math.abs(stats.pctChange).toFixed(1)}% vs last week</span>
          </div>
        </div>
        <div>
          <div className="text-4xl font-extrabold text-white tracking-tight num-tabular selectable" suppressHydrationWarning>
            {formatCurrency(stats.current7Total, selectedCurrency)}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
            <span>Daily Avg: <strong className="text-slate-200 num-tabular selectable" suppressHydrationWarning>{formatCurrency(stats.dailyAvg, selectedCurrency)}</strong></span>
            <span>•</span>
            <span>This Month: <strong className="text-slate-200 num-tabular selectable" suppressHydrationWarning>{formatCurrency(monthlyTotal, selectedCurrency)}</strong></span>
          </div>
        </div>
        <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
          <button type="button" onClick={onOpenManualEntry}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#74FFAC] hover:bg-[#74FFAC]/90 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#74FFAC]/20 touch-target">
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Record Expense</span>
          </button>
          <button type="button" onClick={onOpenDevSettings}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60 touch-target">
            <Code2 className="w-4 h-4 text-[#74FFAC]" />
            <span>API</span>
          </button>
        </div>
      </div>

      {/* ONBOARDING EMPTY STATE */}
      {isEmpty && (
        <div className="glass-card rounded-2xl p-6 border border-[#74FFAC]/20 bg-[#74FFAC]/5 space-y-3 text-center animate-slide-down">
          <div className="w-12 h-12 rounded-2xl bg-[#74FFAC]/10 border border-[#74FFAC]/20 flex items-center justify-center mx-auto">
            <Wallet className="w-6 h-6 text-[#74FFAC]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">No expenses yet</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Add your first expense manually, or set up the webhook to auto-sync from your phone.
            </p>
          </div>
          <div className="flex items-center gap-2 justify-center pt-1">
            <button type="button" onClick={onOpenManualEntry}
              className="px-4 py-2 rounded-xl bg-[#74FFAC] text-slate-950 text-xs font-extrabold shadow-sm flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Expense</span>
            </button>
            <button type="button" onClick={onOpenDevSettings}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-[#74FFAC]" />
              <span>Setup Webhook</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. DAILY TRANSACTION ALERT LIMIT */}
      <div className={`glass-card rounded-2xl p-4 border transition-all ${isDailyLimitExceeded ? 'border-[#FF4885]/40 bg-[#FF4885]/10 shadow-lg shadow-[#FF4885]/10' : 'border-slate-800 bg-slate-900/60'} space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <BellRing className={`w-4 h-4 ${isDailyLimitExceeded ? 'text-[#FF4885] animate-bounce' : 'text-[#74FFAC]'}`} />
            <span>Daily Alert Limit</span>
          </div>
          <div className="flex items-center gap-2">
            {isEditingDailyLimit ? (
              <div className="flex items-center gap-1">
                <input type="number" value={tempDailyInput} onChange={(e) => setTempDailyInput(e.target.value)}
                  className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-[#74FFAC] text-xs text-white num-tabular focus:outline-none"
                  autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveDailyLimit()} />
                <button type="button" onClick={handleSaveDailyLimit}
                  className="p-1.5 rounded-lg bg-[#74FFAC] text-slate-950 font-bold touch-target">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => { setTempDailyInput(String(dailyAlertLimit)); setIsEditingDailyLimit(true); }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
                <span className="font-bold text-white num-tabular selectable" suppressHydrationWarning>{formatCurrency(dailyAlertLimit, selectedCurrency)}/day</span>
                <Edit2 className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${isDailyLimitExceeded ? 'bg-[#FF4885]' : 'bg-[#74FFAC]'}`}
              style={{ width: `${Math.min((todayTotal / dailyAlertLimit) * 100, 100)}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Today: <strong className="text-white num-tabular selectable" suppressHydrationWarning>{formatCurrency(todayTotal, selectedCurrency)}</strong></span>
            <span className={isDailyLimitExceeded ? 'text-[#FF4885] font-bold' : 'text-[#74FFAC]'}>
              {isDailyLimitExceeded
                ? `⚠️ Over by ${formatCurrency(todayTotal - dailyAlertLimit, selectedCurrency)}`
                : `${formatCurrency(dailyAlertLimit - todayTotal, selectedCurrency)} left today`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. MONTHLY BUDGET CAP — now uses actual monthly total */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 bg-slate-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Target className="w-4 h-4 text-[#74FFAC]" />
            <span>Monthly Budget Cap</span>
          </div>
          <div className="flex items-center gap-2">
            {isEditingBudget ? (
              <div className="flex items-center gap-1">
                <input type="number" value={tempBudgetInput} onChange={(e) => setTempBudgetInput(e.target.value)}
                  className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-[#74FFAC] text-xs text-white num-tabular focus:outline-none"
                  autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveBudget()} />
                <button type="button" onClick={handleSaveBudget}
                  className="p-1.5 rounded-lg bg-[#74FFAC] text-slate-950 font-bold touch-target">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => { setTempBudgetInput(String(budgetCap)); setIsEditingBudget(true); }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
                <span className="font-bold text-white num-tabular selectable" suppressHydrationWarning>{formatCurrency(budgetCap, selectedCurrency)}</span>
                <Edit2 className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${budgetSpentPct > 90 ? 'bg-[#FF4885]' : budgetSpentPct > 70 ? 'bg-amber-400' : 'bg-[#74FFAC]'}`}
              style={{ width: `${Math.min(budgetSpentPct, 100)}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span suppressHydrationWarning>{budgetSpentPct.toFixed(1)}% used this month</span>
            <span suppressHydrationWarning>
              {budgetRemaining >= 0
                ? `${formatCurrency(budgetRemaining, selectedCurrency)} remaining`
                : `${formatCurrency(Math.abs(budgetRemaining), selectedCurrency)} over budget`}
            </span>
          </div>
        </div>
      </div>

      {/* 4. FINANCIAL INTELLIGENCE CARD */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 bg-slate-900/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Sparkles className="w-4 h-4 text-[#74FFAC]" />
            <span>Financial Intelligence</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Auto Insight</span>
        </div>
        {isEmpty ? (
          <div className="flex items-start gap-3 pt-1">
            <div className="p-2 rounded-xl bg-[#74FFAC]/10 border border-[#74FFAC]/20 text-[#74FFAC] shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Start tracking to unlock spending insights and personalized financial intelligence.
            </p>
          </div>
        ) : isDailyLimitExceeded ? (
          <div className="flex items-start gap-3 pt-1">
            <div className="p-2 rounded-xl bg-[#FF4885]/10 border border-[#FF4885]/20 text-[#FF4885] shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed" suppressHydrationWarning>
              <strong className="text-[#FF4885]">Daily limit exceeded!</strong> You&apos;ve spent {formatCurrency(todayTotal, selectedCurrency)} today, {formatCurrency(todayTotal - dailyAlertLimit, selectedCurrency)} over your limit.
            </p>
          </div>
        ) : insightState === 'critical' ? (
          <div className="flex items-start gap-3 pt-1">
            <div className="p-2 rounded-xl bg-[#FF4885]/10 border border-[#FF4885]/20 text-[#FF4885] shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed" suppressHydrationWarning>
              Spending pace is <strong className="text-[#FF4885]">high</strong> — {formatCurrency(stats.current7Total, selectedCurrency)} over 7 days. Monthly budget at {budgetSpentPct.toFixed(0)}%.
            </p>
          </div>
        ) : insightState === 'warning' ? (
          <div className="flex items-start gap-3 pt-1">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed" suppressHydrationWarning>
              Velocity elevated — <strong className="text-amber-400">{formatCurrency(stats.current7Total, selectedCurrency)}</strong> over 7 days. Consider slowing discretionary spending.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 pt-1">
            <div className="p-2 rounded-xl bg-[#74FFAC]/10 border border-[#74FFAC]/20 text-[#74FFAC] shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Spending is <strong className="text-[#74FFAC]">on track</strong> — within daily and monthly budget limits.
            </p>
          </div>
        )}
      </div>

      {/* 5. CATEGORY BREAKDOWN */}
      {!isEmpty && <CategoryBreakdownCard transactions={transactions} selectedCurrency={selectedCurrency} />}

      {/* 6. VELOCITY CHART */}
      {!isEmpty && (
        <div className="glass-card rounded-3xl p-5 border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Spending Velocity Curve</h3>
              <p className="text-[11px] text-slate-400">Daily breakdown — last 7 days</p>
            </div>
            <span className="text-[11px] font-mono text-[#74FFAC] bg-[#74FFAC]/10 px-2.5 py-1 rounded-md border border-[#74FFAC]/20">
              Live
            </span>
          </div>
          <div className="h-44 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="mintGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#74FFAC" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#74FFAC" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${v}`} />
                <Tooltip content={<CustomTooltip selectedCurrency={selectedCurrency} />} />
                <Area type="monotone" dataKey="amount" stroke="#74FFAC" strokeWidth={2.5} fillOpacity={1} fill="url(#mintGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 7. RECENT ACTIVITY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-200">Recent Activity</h3>
          {transactions.length > 0 && (
            <button type="button" onClick={onNavigateToTransactions}
              className="text-xs text-[#74FFAC] hover:underline font-semibold flex items-center gap-1">
              <span>View All ({transactions.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center border border-slate-800 space-y-2">
            <p className="text-xs text-slate-400">Transactions you add will appear here.</p>
            <button type="button" onClick={onOpenManualEntry}
              className="text-xs font-bold text-[#74FFAC] hover:underline flex items-center gap-1 mx-auto">
              <Plus className="w-3.5 h-3.5" />
              <span>Add your first expense</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx) => {
              const IconComp = CATEGORY_ICONS[tx.category] || ShoppingBag;
              return (
                <div key={tx.id}
                  className="glass-card rounded-2xl p-3.5 flex items-center justify-between hover:border-[#74FFAC]/30 transition-all border border-slate-800/80 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[#74FFAC] shrink-0">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100 selectable">{tx.merchant}</h4>
                      <span className="text-[11px] text-slate-400">{tx.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-right mr-1">
                      <span className="text-sm font-bold text-[#FF4885] num-tabular selectable" suppressHydrationWarning>
                        -{formatCurrency(tx.amount, selectedCurrency)}
                      </span>
                      <p className="text-[10px] text-slate-500" suppressHydrationWarning>
                        {formatShortDate(tx.date)}
                      </p>
                    </div>
                    {/* Always visible on touch — not opacity-0 hidden */}
                    {onEditTransaction && (
                      <button type="button" onClick={() => onEditTransaction(tx)}
                        className="p-2 rounded-xl hover:bg-[#74FFAC]/10 text-slate-500 hover:text-[#74FFAC] transition-colors touch-target"
                        aria-label={`Edit ${tx.merchant}`}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteTransaction && (
                      <button type="button" onClick={() => onDeleteTransaction(tx.id)}
                        className="p-2 rounded-xl hover:bg-[#FF4885]/10 text-slate-500 hover:text-[#FF4885] transition-colors touch-target"
                        aria-label={`Delete ${tx.merchant}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
