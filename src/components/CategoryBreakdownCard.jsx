'use client';

import { PieChart, Utensils, ShoppingBag, CreditCard, Zap, Tv, HeartPulse, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';

const CATEGORY_COLORS = {
  'Food & Dining': { icon: Utensils, bar: 'bg-[#74FFAC]', text: 'text-[#74FFAC]' },
  'Shopping': { icon: ShoppingBag, bar: 'bg-[#FF4885]', text: 'text-[#FF4885]' },
  'Transportation': { icon: CreditCard, bar: 'bg-[#74FFAC]', text: 'text-[#74FFAC]' },
  'Bills & Utilities': { icon: Zap, bar: 'bg-[#FF4885]', text: 'text-[#FF4885]' },
  'Subscriptions': { icon: Tv, bar: 'bg-[#FF4885]', text: 'text-[#FF4885]' },
  'Healthcare': { icon: HeartPulse, bar: 'bg-[#74FFAC]', text: 'text-[#74FFAC]' },
  'Other': { icon: Tag, bar: 'bg-slate-400', text: 'text-slate-400' },
};

export default function CategoryBreakdownCard({ transactions = [], selectedCurrency = 'USD' }) {
  const total = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  // Group amounts by category
  const categoryTotals = {};
  transactions.forEach((tx) => {
    const cat = tx.category || 'Other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(tx.amount || 0);
  });

  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="glass-card rounded-3xl p-5 border border-slate-800 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[#74FFAC]">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Category Allocation</h3>
            <p className="text-[11px] text-slate-400">Spending distribution across categories</p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-slate-300 num-tabular">
          {formatCurrency(total, selectedCurrency)}
        </span>
      </div>

      <div className="space-y-3 pt-1">
        {sortedCategories.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-2">No transactions to display.</p>
        ) : (
          sortedCategories.map(([cat, amount]) => {
          const pct = total > 0 ? (amount / total) * 100 : 0;
          const conf = CATEGORY_COLORS[cat] || CATEGORY_COLORS['Other'];
          const IconComp = conf.icon;

          return (
            <div key={cat} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <IconComp className={`w-3.5 h-3.5 ${conf.text}`} />
                  <span className="font-semibold text-slate-200">{cat}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-400 text-[11px]">{pct.toFixed(1)}%</span>
                  <span className="font-bold text-slate-100 num-tabular">{formatCurrency(amount, selectedCurrency)}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${conf.bar}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })
        )}
      </div>
    </div>
  );
}
