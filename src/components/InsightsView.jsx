'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Award, Flame, Calendar, Zap,
  ShoppingBag, Utensils, CreditCard, Tv, HeartPulse, Tag,
  BarChart2, ArrowUp, ArrowDown,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatShortDate } from '@/lib/dateUtils';

const CATEGORY_ICONS = {
  'Food & Dining': Utensils,
  'Shopping': ShoppingBag,
  'Transportation': CreditCard,
  'Bills & Utilities': Zap,
  'Subscriptions': Tv,
  'Healthcare': HeartPulse,
  'Other': Tag,
};

const CATEGORY_COLORS = [
  '#74FFAC', '#FF4885', '#60a5fa', '#fbbf24', '#a78bfa', '#34d399', '#f87171',
];

/** Get local YYYY-MM string for month grouping */
function localMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function localDateStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function CustomBarTooltip({ active, payload, selectedCurrency }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-[#74FFAC]/30 rounded-xl p-3 shadow-xl text-xs">
        <p className="text-slate-400 mb-1">{payload[0].payload.label}</p>
        <p className="font-bold text-[#74FFAC] num-tabular">{formatCurrency(payload[0].value, selectedCurrency)}</p>
      </div>
    );
  }
  return null;
}

export default function InsightsView({ transactions = [], selectedCurrency = 'USD' }) {
  const now = new Date();

  // Monthly spending trend — last 6 months
  const monthlyData = useMemo(() => {
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = localMonthKey(d);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[key] = { key, label, amount: 0 };
    }
    transactions.forEach((tx) => {
      const key = localMonthKey(tx.date);
      if (months[key]) months[key].amount += Number(tx.amount || 0);
    });
    return Object.values(months);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  // Top merchants by total spend
  const topMerchants = useMemo(() => {
    const m = {};
    transactions.forEach((tx) => {
      m[tx.merchant] = (m[tx.merchant] || 0) + Number(tx.amount || 0);
    });
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));
  }, [transactions]);

  // Category breakdown for donut-style bar
  const categoryData = useMemo(() => {
    const c = {};
    transactions.forEach((tx) => {
      const cat = tx.category || 'Other';
      c[cat] = (c[cat] || 0) + Number(tx.amount || 0);
    });
    return Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount], i) => ({ name, amount, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
  }, [transactions]);

  // Stats: current month vs previous month
  const currentMonthKey = localMonthKey(now);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = localMonthKey(prevDate);
  const currentMonth = monthlyData.find((m) => m.key === currentMonthKey);
  const prevMonth = monthlyData.find((m) => m.key === prevMonthKey);
  const monthChange = prevMonth?.amount > 0
    ? ((currentMonth?.amount ?? 0) - prevMonth.amount) / prevMonth.amount * 100
    : null;

  // Streak: consecutive days with at least one transaction
  const streak = useMemo(() => {
    const daySet = new Set(transactions.map((tx) => localDateStr(new Date(tx.date))));
    let count = 0;
    let d = new Date();
    while (daySet.has(localDateStr(d))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [transactions]);

  // Biggest single expense
  const biggestTx = useMemo(() => {
    if (!transactions.length) return null;
    return transactions.reduce((max, tx) => Number(tx.amount) > Number(max.amount) ? tx : max, transactions[0]);
  }, [transactions]);

  // Average transaction size
  const avgTx = transactions.length
    ? transactions.reduce((s, tx) => s + Number(tx.amount || 0), 0) / transactions.length
    : 0;

  const isEmpty = transactions.length === 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="px-1">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-[#74FFAC]" />
          Spending Insights
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Trends, patterns, and smart summaries</p>
      </div>

      {isEmpty ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-slate-800 space-y-2">
          <BarChart2 className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">No data yet</p>
          <p className="text-xs text-slate-500">Add expenses to unlock spending insights.</p>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-[#74FFAC]" />
                This Month
              </div>
              <div className="text-xl font-extrabold text-white num-tabular" suppressHydrationWarning>
                {formatCurrency(currentMonth?.amount ?? 0, selectedCurrency)}
              </div>
              {monthChange !== null && (
                <div className={`text-[11px] font-bold flex items-center gap-1 ${monthChange > 0 ? 'text-[#FF4885]' : 'text-[#74FFAC]'}`}>
                  {monthChange > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {Math.abs(monthChange).toFixed(1)}% vs last month
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                <Award className="w-3.5 h-3.5 text-[#74FFAC]" />
                Avg Transaction
              </div>
              <div className="text-xl font-extrabold text-white num-tabular" suppressHydrationWarning>
                {formatCurrency(avgTx, selectedCurrency)}
              </div>
              <div className="text-[11px] text-slate-500">{transactions.length} total entries</div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Tracking Streak
              </div>
              <div className="text-xl font-extrabold text-white">
                {streak} {streak === 1 ? 'day' : 'days'}
              </div>
              <div className="text-[11px] text-slate-500">consecutive days logged</div>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                <TrendingUp className="w-3.5 h-3.5 text-[#FF4885]" />
                Biggest Spend
              </div>
              {biggestTx ? (
                <>
                  <div className="text-xl font-extrabold text-[#FF4885] num-tabular" suppressHydrationWarning>
                    {formatCurrency(biggestTx.amount, selectedCurrency)}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{biggestTx.merchant}</div>
                </>
              ) : (
                <div className="text-xl font-extrabold text-slate-600">—</div>
              )}
            </div>
          </div>

          {/* 6-Month Bar Chart */}
          <div className="glass-card rounded-3xl p-5 border border-slate-800 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200">6-Month Trend</h3>
              <p className="text-[11px] text-slate-400">Monthly spending over the last 6 months</p>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<CustomBarTooltip selectedCurrency={selectedCurrency} />} />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {monthlyData.map((entry, index) => (
                      <Cell
                        key={entry.key}
                        fill={entry.key === currentMonthKey ? '#74FFAC' : 'rgba(116,255,172,0.25)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Merchants */}
          {topMerchants.length > 0 && (
            <div className="glass-card rounded-3xl p-5 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-200">Top Merchants</h3>
              <div className="space-y-2.5">
                {topMerchants.map((m, i) => {
                  const maxAmt = topMerchants[0].amount;
                  const pct = (m.amount / maxAmt) * 100;
                  return (
                    <div key={m.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                            {i + 1}
                          </span>
                          <span className="font-semibold text-slate-200">{m.name}</span>
                        </div>
                        <span className="font-bold text-slate-100 num-tabular" suppressHydrationWarning>
                          {formatCurrency(m.amount, selectedCurrency)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#74FFAC] transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Spending Bar */}
          {categoryData.length > 0 && (
            <div className="glass-card rounded-3xl p-5 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-200">Category Breakdown</h3>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} width={90} />
                    <Tooltip content={<CustomBarTooltip selectedCurrency={selectedCurrency} />} />
                    <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                      {categoryData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Smart Pattern Cards */}
          <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#74FFAC]" />
              Smart Patterns
            </h3>
            <div className="space-y-2.5 text-xs text-slate-300">
              {monthChange !== null && (
                <div className={`flex items-start gap-2 p-2.5 rounded-xl border ${monthChange > 10 ? 'bg-[#FF4885]/8 border-[#FF4885]/20' : 'bg-[#74FFAC]/8 border-[#74FFAC]/20'}`}>
                  {monthChange > 10
                    ? <TrendingUp className="w-4 h-4 text-[#FF4885] shrink-0 mt-0.5" />
                    : <TrendingDown className="w-4 h-4 text-[#74FFAC] shrink-0 mt-0.5" />}
                  <span>
                    {monthChange > 10
                      ? `Spending is up ${monthChange.toFixed(1)}% from last month. Consider reviewing discretionary spend.`
                      : `Spending is ${Math.abs(monthChange).toFixed(1)}% ${monthChange > 0 ? 'higher' : 'lower'} than last month — ${monthChange <= 0 ? 'great progress!' : 'keep an eye on it.'}`}
                  </span>
                </div>
              )}
              {categoryData[0] && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl border bg-slate-800/50 border-slate-700">
                  {(() => { const Icon = CATEGORY_ICONS[categoryData[0].name] || Tag; return <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />; })()}
                  <span>
                    <strong className="text-slate-100">{categoryData[0].name}</strong> is your top spending category
                    {' '}(<span className="num-tabular" suppressHydrationWarning>{formatCurrency(categoryData[0].amount, selectedCurrency)}</span>).
                  </span>
                </div>
              )}
              {topMerchants[0] && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl border bg-slate-800/50 border-slate-700">
                  <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-100">{topMerchants[0].name}</strong> is your most-visited merchant
                    {' '}(<span className="num-tabular" suppressHydrationWarning>{formatCurrency(topMerchants[0].amount, selectedCurrency)}</span> total).
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
