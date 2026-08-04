'use client';

import { useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';

const CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Healthcare',
  'Personal Care',
  'Subscriptions',
  'Other',
];

export default function ManualEntryModal({ isOpen, onClose, onTransactionAdded, userId, selectedCurrency = 'USD' }) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const payload = {
        amount: parseFloat(amount),
        merchant: merchant.trim(),
        category,
        date: new Date(date).toISOString(),
        ...(userId ? { user_id: userId } : {}),
      };

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to submit transaction');
      }

      setStatusMessage({ type: 'success', text: 'Transaction added successfully!' });
      if (onTransactionAdded) {
        onTransactionAdded(result.data);
      }

      setTimeout(() => {
        setAmount('');
        setMerchant('');
        setStatusMessage(null);
        onClose();
      }, 1200);
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Error creating transaction' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg glass-modal rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border-t sm:border border-slate-800 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Add Transaction</h2>
            <p className="text-xs text-slate-400">Record a new manual expense</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
              statusMessage.type === 'success'
                ? 'bg-[#74FFAC]/10 text-[#74FFAC] border border-[#74FFAC]/20'
                : 'bg-[#FF4885]/10 text-[#FF4885] border border-[#FF4885]/20'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-[#74FFAC]" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-[#FF4885]" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="amount-input" className="block text-xs font-medium text-slate-300 mb-1.5">
              Amount ({SUPPORTED_CURRENCIES.find((c) => c.code === selectedCurrency)?.symbol ?? '$'})
            </label>
            <input
              id="amount-input"
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[#FF4885] placeholder-slate-500 focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC] text-lg font-bold num-tabular"
            />
          </div>

          <div>
            <label htmlFor="merchant-input" className="block text-xs font-medium text-slate-300 mb-1.5">
              Merchant / Store
            </label>
            <input
              id="merchant-input"
              type="text"
              required
              placeholder="e.g. Starbucks, Amazon, Target"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC] text-sm"
            />
          </div>

          <div>
            <label htmlFor="category-select" className="block text-xs font-medium text-slate-300 mb-1.5">
              Category
            </label>
            <select
              id="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC] text-sm"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date-input" className="block text-xs font-medium text-slate-300 mb-1.5">
              Date
            </label>
            <input
              id="date-input"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC] text-sm"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#74FFAC] hover:bg-[#74FFAC]/90 text-slate-950 text-xs font-extrabold shadow-lg shadow-[#74FFAC]/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Expense</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
