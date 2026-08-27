'use client';

import { useState, useMemo } from 'react';
import {
  X, Download, FileText, FileSpreadsheet,
  ArrowUpDown, Calendar, Tag, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { exportTransactions } from '@/lib/exportCsv';
import { formatCurrency } from '@/lib/currency';

const SORT_OPTIONS = [
  { value: 'date-desc',   label: 'Date — Newest first' },
  { value: 'date-asc',    label: 'Date — Oldest first' },
  { value: 'amount-desc', label: 'Amount — Highest first' },
  { value: 'amount-asc',  label: 'Amount — Lowest first' },
];

const CATEGORIES = [
  'All',
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Subscriptions',
  'Healthcare',
  'Auto-Captured',
  'General',
  'Other',
];

export default function ExportModal({ isOpen, onClose, transactions = [], selectedCurrency = 'USD' }) {
  const [sortBy,    setSortBy]    = useState('date-desc');
  const [category,  setCategory]  = useState('All');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [format,    setFormat]    = useState('csv');
  const [status,    setStatus]    = useState(null);

  // All hooks MUST be called before any early return
  const previewCount = useMemo(() => {
    if (!isOpen) return [];
    let f = [...transactions];
    if (dateFrom) { const d = new Date(dateFrom); d.setHours(0,0,0,0); f = f.filter(tx => new Date(tx.date) >= d); }
    if (dateTo)   { const d = new Date(dateTo);   d.setHours(23,59,59,999); f = f.filter(tx => new Date(tx.date) <= d); }
    if (category !== 'All') f = f.filter(tx => tx.category === category);
    return f;
  }, [isOpen, transactions, dateFrom, dateTo, category]);

  const previewTotal = useMemo(
    () => previewCount.reduce((s, tx) => s + Number(tx.amount || 0), 0),
    [previewCount]
  );

  // Early return AFTER all hooks
  if (!isOpen) return null;

  const handleExport = () => {
    const count = exportTransactions(transactions, selectedCurrency, {
      sortBy, category, dateFrom: dateFrom || null, dateTo: dateTo || null, format,
    });
    if (count === false || count === 0) {
      setStatus({ type: 'error', text: 'No transactions match the selected filters.' });
    } else {
      setStatus({ type: 'success', text: `${count} transaction${count !== 1 ? 's' : ''} exported successfully.` });
      setTimeout(() => { setStatus(null); onClose(); }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg glass-modal rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-800 animate-slide-up space-y-5"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#74FFAC]/10 border border-[#74FFAC]/20 flex items-center justify-center">
              <Download className="w-5 h-5 text-[#74FFAC]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Export Transactions</h2>
              <p className="text-xs text-slate-400">Customise before downloading</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status banner */}
        {status && (
          <div className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-medium border ${
            status.type === 'success'
              ? 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/20'
              : 'bg-[#FF4885]/10 text-[#FF4885] border-[#FF4885]/20'
          }`}>
            {status.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            {status.text}
          </div>
        )}

        {/* Format toggle */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#74FFAC]" />
            File Format
          </label>
          <div className="flex gap-2">
            {[
              { value: 'csv', label: 'CSV', icon: FileSpreadsheet, desc: 'For Excel / Sheets' },
              { value: 'txt', label: 'Report', icon: FileText, desc: 'Plain-text report' },
            ].map(({ value, label, icon: Icon, desc }) => (
              <button key={value} type="button" onClick={() => setFormat(value)}
                className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  format === value
                    ? 'bg-[#74FFAC]/10 border-[#74FFAC]/30 text-[#74FFAC]'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                <div className="text-left">
                  <div>{label}</div>
                  <div className="text-[10px] opacity-70 font-normal">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#74FFAC]" />
            Sort Order
          </label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-[#74FFAC] transition-colors">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#74FFAC]" />
            Date Range <span className="text-slate-500 font-normal">(optional)</span>
          </label>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <span className="text-[10px] text-slate-500">From</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-[#74FFAC] transition-colors" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[10px] text-slate-500">To</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-[#74FFAC] transition-colors" />
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#74FFAC]" />
            Category Filter
          </label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-[#74FFAC] transition-colors">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Preview summary */}
        <div className="glass-card rounded-xl px-4 py-3 border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            <strong className="text-slate-200">{previewCount.length}</strong> transaction{previewCount.length !== 1 ? 's' : ''} will be exported
          </span>
          <span className="font-extrabold text-[#FF4885] num-tabular" suppressHydrationWarning>
            {formatCurrency(previewTotal, selectedCurrency)}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleExport} disabled={previewCount.length === 0}
            className="flex-1 py-2.5 rounded-xl bg-[#74FFAC] hover:bg-[#74FFAC]/90 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md shadow-[#74FFAC]/20 disabled:opacity-40">
            <Download className="w-4 h-4 stroke-[2.5]" />
            Download {format.toUpperCase()}
          </button>
        </div>

      </div>
    </div>
  );
}
