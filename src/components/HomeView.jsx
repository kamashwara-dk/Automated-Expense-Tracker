'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Sparkles, Calendar, ShoppingBag, Utensils,
  Zap, CreditCard, ArrowRight, Plus, Code2, CheckCircle2, AlertTriangle,
  Target, Edit2, Check, X, Trash2, Edit3, Wallet, RefreshCw,
  Sun, CalendarDays,
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

// ── Chart tooltip ─────────────────────────────────────────────────────────────
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

// ── Loading skeleton ───────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────────
/** YYYY-MM-DD from a Date using local time (avoids UTC-offset grouping bugs) */
function localDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Monday–Sunday bounds of the current week (local time) */
function getWeekBounds() {
  const now = new Date();
  const dow = now.getDay(); // 0=Sun … 6=Sat
  const fromMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - fromMon, 0, 0, 0, 0);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
  return { weekStart: monday, weekEnd: sunday };
}

function getDailyResetLabel() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const ms = midnight - now;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `Resets at midnight · in ${h}h ${m}m`;
}

function getWeeklyResetLabel() {
  const dow = new Date().getDay();
  const days = dow === 0 ? 1 : 8 - dow; // days until next Monday
  if (days === 1) return 'Resets tomorrow (Mon)';
  return `Resets Monday · in ${days} days`;
}

function getMonthlyResetLabel() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const days = Math.ceil((next - now) / 86400000);
  return `Resets ${next.toLocaleDateString('en-US', { month: 'short' })} 1 · in ${days} day${days !== 1 ? 's' : ''}`;
}

// ── Budget Period Card ─────────────────────────────────────────────────────────
function BudgetPeriodCard({ label, Icon, spent, budget, onSave, resetLabel, selectedCurrency }) {
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp]         = useState('');

  const pct       = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const remaining = budget - spent;
  const isOver    = spent > budget && budget > 0;
  const isWarn    = pct >= 80 && !isOver;
  const notSet    = budget === 0;

  const barColor  = isOver ? '#FF4885' : isWarn ? '#fbbf24' : '#74FFAC';
  const textColor = isOver ? 'text-[#FF4885]' : isWarn ? 'text-amber-400' : 'text-[#74FFAC]';
  const iconColor = isOver ? '#FF4885'  : isWarn ? '#fbbf24'  : '#74FFAC';

  const save = () => {
    const v = parseFloat(tmp);
    if (!isNaN(v) && v >= 0) onSave(v);
    setEditing(false);
  };

  return (
    <div className={`glass-card rounded-2xl p-4 border transition-all space-y-2.5 ${
      isOver ? 'border-[#FF4885]/35 bg-[#FF4885]/5'
             : isWarn ? 'border-amber-500/30 bg-amber-500/5'
             : 'border-slate-800 bg-slate-900/40'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
          <span className="text-xs font-bold text-slate-200">{label}</span>
        </div>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number" min="0" value={tmp}
              onChange={(e) => setTmp(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              autoFocus
              className="w-24 px-2 py-1 rounded-lg bg-slate-950 border border-[#74FFAC] text-xs text-white num-tabular focus:outline-none"
            />
            <button type="button" onClick={save}
              className="p-1.5 rounded-lg bg-[#74FFAC] text-slate-950 touch-target">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 touch-target">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button type="button"
            onClick={() => { setTmp(budget > 0 ? String(budget) : ''); setEditing(true); }}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors">
            <span className="text-xs font-bold text-white num-tabular" suppressHydrationWarning>
              {notSet ? '+ Set limit' : formatCurrency(budget, selectedCurrency)}
            </span>
            <Edit2 className="w-3 h-3 text-slate-500" />
          </button>
        )}
      </div>

      {notSet ? (
        <p className="text-[11px] text-slate-500 pb-1">
          Tap <strong className="text-slate-400">+ Set limit</strong> to configure your {label.toLowerCase()} budget.
        </p>
      ) : (
        <>
          {/* Big spent number */}
          <div>
            <div className="text-2xl font-extrabold text-white num-tabular" suppressHydrationWarning>
              {formatCurrency(spent, selectedCurrency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              of{' '}
              <span className="text-slate-200 font-semibold" suppressHydrationWarning>
                {formatCurrency(budget, selectedCurrency)}
              </span>{' '}budget
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-950/80 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: barColor, boxShadow: `0 0 6px ${barColor}60` }}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">{pct.toFixed(0)}% used</span>
            <span className={`font-bold ${textColor}`} suppressHydrationWarning>
              {isOver
                ? `⚠ Over by ${formatCurrency(-remaining, selectedCurrency)}`
                : `${formatCurrency(remaining, selectedCurrency)} left`}
            </span>
          </div>

          {/* Reset countdown */}
          <p className="text-[10px] text-slate-600 leading-tight">{resetLabel}</p>
        </>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
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
  // ── 3-Period budget state ──────────────────────────────────────────────────
  // Use new keys for the unified tracker
  const [dailyBudget,   setDailyBudget]   = useLocalStorage('myvaluta-budget-daily',   0);
  const [weeklyBudget,  setWeeklyBudget]  = useLocalStorage('myvaluta-budget-weekly',  0);
  
  // Try to migrate from legacy 'myvaluta-budget-cap' if monthly is not set yet
  // We can't easily do complex migrations inside useLocalStorage directly in this simple component,
  // but we can just provide a default. Let's just stick to the new keys and default to 0.
  const [monthlyBudget, setMonthlyBudget] = useLocalStorage('myvaluta-budget-monthly', 0);

  const stats = calculateWeeklyStats(transactions);
  const todayStr = localDateStr();

  // ── Date bounds (computed once per mount) ──────────────────────────────────
  const { weekStart, weekEnd } = useMemo(() => getWeekBounds(), []);
  const { monthStart, monthEnd } = useMemo(() => {
    const n = new Date();
    return {
      monthStart: new Date(n.getFullYear(), n.getMonth(), 1, 0, 0, 0, 0),
      monthEnd:   new Date(n.getFullYear(), n.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }, []);

  // ── Per-period spent amounts ───────────────────────────────────────────────
  const dailySpent = useMemo(() =>
    transactions.reduce((s, tx) =>
      localDateStr(new Date(tx.date)) === todayStr ? s + Number(tx.amount || 0) : s
    , 0),
  [transactions, todayStr]);

  const weeklySpent = useMemo(() =>
    transactions.reduce((s, tx) => {
      const d = new Date(tx.date);
      return d >= weekStart && d <= weekEnd ? s + Number(tx.amount || 0) : s;
    }, 0),
  [transactions, weekStart, weekEnd]);

  const monthlySpent = useMemo(() =>
    transactions.reduce((s, tx) => {
      const d = new Date(tx.date);
      return d >= monthStart && d <= monthEnd ? s + Number(tx.amount || 0) : s;
    }, 0),
  [transactions, monthStart, monthEnd]);

  // ── Intelligence data ──────────────────────────────────────────────────────
  // All-time daily average
  const allTimeDailyAvg = useMemo(() => {
    if (!transactions.length) return 0;
    const days = new Set(transactions.map(tx => localDateStr(new Date(tx.date))));
    const total = transactions.reduce((s, tx) => s + Number(tx.amount || 0), 0);
    return days.size > 0 ? total / days.size : 0;
  }, [transactions]);

  const todayVsAvg = allTimeDailyAvg > 0 ? dailySpent / allTimeDailyAvg : 0;

  // Monthly forecast (project daily rate to end of month)
  const monthForecast = useMemo(() => {
    const n = new Date();
    const dayOfMonth = n.getDate();
    const daysInMonth = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
    if (dayOfMonth < 3 || monthlySpent === 0) return null;
    const dailyRate = monthlySpent / dayOfMonth;
    return { projected: dailyRate * daysInMonth, dailyRate, daysLeft: daysInMonth - dayOfMonth };
  }, [monthlySpent]);

  // Top spending category (all-time)
  const topCategory = useMemo(() => {
    const totals = {};
    transactions.forEach(tx => {
      const cat = tx.category || 'Other';
      totals[cat] = (totals[cat] || 0) + Number(tx.amount || 0);
    });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return null;
    const total = transactions.reduce((s, tx) => s + Number(tx.amount || 0), 0);
    return { name: sorted[0][0], amount: sorted[0][1], pct: total > 0 ? (sorted[0][1] / total) * 100 : 0 };
  }, [transactions]);

  // Top merchant by visit count (not amount)
  const topMerchantByCount = useMemo(() => {
    const counts = {};
    transactions.forEach(tx => { counts[tx.merchant] = (counts[tx.merchant] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length ? { name: sorted[0][0], count: sorted[0][1] } : null;
  }, [transactions]);

  const isEmpty = transactions.length === 0;

  // ── Loading state ──────────────────────────────────────────────────────────
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

      {/* ── 1. HERO BALANCE CARD ─────────────────────────────────────────── */}
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
            <span>Daily Avg: <strong className="text-slate-200 num-tabular" suppressHydrationWarning>{formatCurrency(stats.dailyAvg, selectedCurrency)}</strong></span>
            <span>·</span>
            <span>This Month: <strong className="text-slate-200 num-tabular" suppressHydrationWarning>{formatCurrency(monthlySpent, selectedCurrency)}</strong></span>
          </div>
        </div>

      </div>

      {/* ── ONBOARDING EMPTY STATE ─────────────────────────────────────────── */}
      {isEmpty && (
        <div className="glass-card rounded-2xl p-6 border border-[#74FFAC]/20 bg-[#74FFAC]/5 space-y-3 text-center animate-slide-down">
          <div className="w-12 h-12 rounded-2xl bg-[#74FFAC]/10 border border-[#74FFAC]/20 flex items-center justify-center mx-auto">
            <Wallet className="w-6 h-6 text-[#74FFAC]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">No expenses yet</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Add your first expense to get started.
            </p>
          </div>
        </div>
      )}

      {/* ── 2. BUDGET TRACKER ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Budget Tracker</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Daily · Weekly · Monthly with auto-reset</p>
          </div>
          <Target className="w-4 h-4 text-[#74FFAC]" />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <BudgetPeriodCard
            label="Today"
            Icon={Sun}
            spent={dailySpent}
            budget={dailyBudget}
            onSave={setDailyBudget}
            resetLabel={getDailyResetLabel()}
            selectedCurrency={selectedCurrency}
          />
          <BudgetPeriodCard
            label="This Week"
            Icon={Calendar}
            spent={weeklySpent}
            budget={weeklyBudget}
            onSave={setWeeklyBudget}
            resetLabel={getWeeklyResetLabel()}
            selectedCurrency={selectedCurrency}
          />
          <BudgetPeriodCard
            label="This Month"
            Icon={CalendarDays}
            spent={monthlySpent}
            budget={monthlyBudget}
            onSave={setMonthlyBudget}
            resetLabel={getMonthlyResetLabel()}
            selectedCurrency={selectedCurrency}
          />
        </div>
      </div>

      {/* ── 3. FINANCIAL INTELLIGENCE ─────────────────────────────────────── */}
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
              Start tracking expenses to unlock personalised spending insights and financial intelligence.
            </p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">

            {/* Daily budget status */}
            {dailyBudget > 0 && (
              dailySpent > dailyBudget ? (
                <InsightRow icon={AlertTriangle} color="red">
                  <strong className="text-[#FF4885]">Daily budget exceeded!</strong> You spent{' '}
                  <span className="num-tabular" suppressHydrationWarning>{formatCurrency(dailySpent, selectedCurrency)}</span> —{' '}
                  <span className="num-tabular" suppressHydrationWarning>{formatCurrency(dailySpent - dailyBudget, selectedCurrency)}</span> over your limit.
                </InsightRow>
              ) : (
                <InsightRow icon={CheckCircle2} color="green">
                  Today&apos;s spend is{' '}
                  <strong className="text-[#74FFAC] num-tabular" suppressHydrationWarning>{formatCurrency(dailySpent, selectedCurrency)}</strong> —{' '}
                  <span className="num-tabular" suppressHydrationWarning>{formatCurrency(dailyBudget - dailySpent, selectedCurrency)}</span> under your daily limit. ✓
                </InsightRow>
              )
            )}

            {/* Weekly budget status */}
            {weeklyBudget > 0 && (() => {
              const pct = (weeklySpent / weeklyBudget) * 100;
              const left = weeklyBudget - weeklySpent;
              if (weeklySpent > weeklyBudget) return (
                <InsightRow icon={AlertTriangle} color="red">
                  <strong className="text-[#FF4885]">Weekly limit exceeded</strong> by{' '}
                  <span className="num-tabular" suppressHydrationWarning>{formatCurrency(-left, selectedCurrency)}</span>.
                  Consider pausing non-essential spending until Monday.
                </InsightRow>
              );
              if (pct > 80) return (
                <InsightRow icon={AlertTriangle} color="amber">
                  Weekly budget is <strong className="text-amber-400">{pct.toFixed(0)}% used</strong>.{' '}
                  Only <span className="num-tabular" suppressHydrationWarning>{formatCurrency(left, selectedCurrency)}</span> remaining this week.
                </InsightRow>
              );
              return (
                <InsightRow icon={CheckCircle2} color="green">
                  Weekly budget on track — <strong className="text-[#74FFAC]">{pct.toFixed(0)}% used</strong>,{' '}
                  <span className="num-tabular" suppressHydrationWarning>{formatCurrency(left, selectedCurrency)}</span> left.
                </InsightRow>
              );
            })()}

            {/* Monthly budget status */}
            {monthlyBudget > 0 && (() => {
              const pct = (monthlySpent / monthlyBudget) * 100;
              const left = monthlyBudget - monthlySpent;
              if (monthlySpent > monthlyBudget) return (
                <InsightRow icon={AlertTriangle} color="red">
                  <strong className="text-[#FF4885]">Monthly budget exceeded!</strong>{' '}
                  Over by <span className="num-tabular" suppressHydrationWarning>{formatCurrency(-left, selectedCurrency)}</span>.
                </InsightRow>
              );
              if (pct > 90) return (
                <InsightRow icon={AlertTriangle} color="red">
                  <strong className="text-[#FF4885]">Monthly budget almost exhausted</strong> — {pct.toFixed(0)}% used.
                  Only <span className="num-tabular" suppressHydrationWarning>{formatCurrency(left, selectedCurrency)}</span> left.
                </InsightRow>
              );
              if (pct > 70) return (
                <InsightRow icon={AlertTriangle} color="amber">
                  Monthly budget is <strong className="text-amber-400">{pct.toFixed(0)}% used</strong>.{' '}
                  <span className="num-tabular" suppressHydrationWarning>{formatCurrency(left, selectedCurrency)}</span> remaining — watch discretionary spend.
                </InsightRow>
              );
              return (
                <InsightRow icon={Target} color="green">
                  Monthly budget on track — <strong className="text-[#74FFAC]">{pct.toFixed(0)}% used</strong>,{' '}
                  <span className="num-tabular" suppressHydrationWarning>{formatCurrency(left, selectedCurrency)}</span> remaining.
                </InsightRow>
              );
            })()}

            {/* Week-over-week trend */}
            {stats.previous7Total > 0 && (
              stats.pctChange > 15 ? (
                <InsightRow icon={TrendingUp} color="red">
                  Spending is <strong className="text-[#FF4885]">up {stats.pctChange.toFixed(1)}%</strong> vs last 7 days
                  (<span className="num-tabular" suppressHydrationWarning>{formatCurrency(stats.current7Total, selectedCurrency)}</span> vs{' '}
                  <span className="num-tabular" suppressHydrationWarning>{formatCurrency(stats.previous7Total, selectedCurrency)}</span>).
                </InsightRow>
              ) : stats.pctChange < -10 ? (
                <InsightRow icon={TrendingDown} color="green">
                  Great work — spending is <strong className="text-[#74FFAC]">down {Math.abs(stats.pctChange).toFixed(1)}%</strong> vs last 7 days.
                </InsightRow>
              ) : (
                <InsightRow icon={TrendingDown} color="neutral">
                  Week-on-week spend is <strong className="text-[#74FFAC]">stable</strong> —{' '}
                  <span className="num-tabular" suppressHydrationWarning>{formatCurrency(stats.current7Total, selectedCurrency)}</span> vs{' '}
                  <span className="num-tabular" suppressHydrationWarning>{formatCurrency(stats.previous7Total, selectedCurrency)}</span> last week.
                </InsightRow>
              )
            )}

            {/* Month-end spending forecast */}
            {monthForecast && (
              <InsightRow icon={Zap} color="amber">
                <strong className="text-slate-100">Forecast:</strong> At your current rate of{' '}
                <span className="num-tabular" suppressHydrationWarning>{formatCurrency(monthForecast.dailyRate, selectedCurrency)}</span>/day,
                you&apos;ll spend ~<strong className="text-amber-400 num-tabular" suppressHydrationWarning>{formatCurrency(monthForecast.projected, selectedCurrency)}</strong> this month
                {monthlyBudget > 0 && monthForecast.projected > monthlyBudget
                  ? <> — <span className="text-[#FF4885] num-tabular" suppressHydrationWarning>{formatCurrency(monthForecast.projected - monthlyBudget, selectedCurrency)}</span> over budget.</>
                  : '.'}
              </InsightRow>
            )}

            {/* Anomaly: today vs daily average */}
            {allTimeDailyAvg > 0 && dailySpent > 0 && todayVsAvg > 1.5 && (
              <InsightRow icon={AlertTriangle} color="amber">
                Today&apos;s spend (<span className="num-tabular" suppressHydrationWarning>{formatCurrency(dailySpent, selectedCurrency)}</span>) is{' '}
                <strong className="text-amber-400">{todayVsAvg.toFixed(1)}× your daily average</strong>{' '}
                (<span className="num-tabular" suppressHydrationWarning>{formatCurrency(allTimeDailyAvg, selectedCurrency)}</span>). High-spend day.
              </InsightRow>
            )}

            {/* Top category dominance */}
            {topCategory && topCategory.pct >= 35 && (
              <InsightRow icon={Zap} color="amber">
                <strong className="text-slate-100">{topCategory.name}</strong> accounts for{' '}
                <strong className="text-amber-400">{topCategory.pct.toFixed(0)}%</strong> of all-time spend
                (<span className="num-tabular" suppressHydrationWarning>{formatCurrency(topCategory.amount, selectedCurrency)}</span>).
                Consider a category-specific budget.
              </InsightRow>
            )}

            {/* Frequent merchant */}
            {topMerchantByCount && topMerchantByCount.count >= 4 && (
              <InsightRow icon={CheckCircle2} color="neutral">
                You&apos;ve visited <strong className="text-slate-100">{topMerchantByCount.name}</strong>{' '}
                <strong className="text-[#74FFAC]">{topMerchantByCount.count} times</strong>.
                Frequent visits — is it intentional?
              </InsightRow>
            )}
          </div>
        )}
      </div>

      {/* ── 4. CATEGORY BREAKDOWN ─────────────────────────────────────────── */}
      {!isEmpty && <CategoryBreakdownCard transactions={transactions} selectedCurrency={selectedCurrency} />}

      {/* ── 5. VELOCITY CHART ─────────────────────────────────────────────── */}
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
                    <stop offset="5%"  stopColor="#74FFAC" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#74FFAC" stopOpacity={0.0}  />
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

      {/* ── 6. RECENT ACTIVITY ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Recent Activity</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">This month only</p>
          </div>
          {transactions.length > 0 && (
            <button type="button" onClick={onNavigateToTransactions}
              className="text-xs text-[#74FFAC] hover:underline font-semibold flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {(() => {
          const now = new Date();
          const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const monthly = transactions.filter((tx) => {
            const d = new Date(tx.date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === curKey;
          });

          if (monthly.length === 0) return (
            <div className="glass-card rounded-2xl p-6 text-center border border-slate-800 space-y-2">
              <p className="text-xs text-slate-400">No expenses this month yet.</p>
            </div>
          );

          return (
            <div className="space-y-2">
              {monthly.slice(0, 5).map((tx) => {
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
          );
        })()}
      </div>
    </div>
  );
}

// ── Insight Row ─────────────────────────────────────────────────────────────
const INSIGHT_STYLES = {
  red:     { wrap: 'bg-[#FF4885]/8 border-[#FF4885]/20', icon: 'text-[#FF4885]' },
  amber:   { wrap: 'bg-amber-500/8 border-amber-500/20', icon: 'text-amber-400' },
  green:   { wrap: 'bg-[#74FFAC]/8 border-[#74FFAC]/15', icon: 'text-[#74FFAC]' },
  neutral: { wrap: 'bg-slate-800/50 border-slate-700/50', icon: 'text-[#74FFAC]' },
};

function InsightRow({ icon: Icon, color = 'neutral', children }) {
  const s = INSIGHT_STYLES[color] || INSIGHT_STYLES.neutral;
  return (
    <div className={`flex items-start gap-3 p-2.5 rounded-xl border ${s.wrap}`}>
      <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${s.icon}`} />
      <p className="text-xs text-slate-300 leading-relaxed">{children}</p>
    </div>
  );
}
