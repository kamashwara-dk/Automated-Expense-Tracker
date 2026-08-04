'use client';

import { Sparkles, Code2, User } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';

export default function Header({
  selectedCurrency = 'USD',
  onCurrencyChange,
  currentUser,
  onOpenAuthModal,
  onOpenDevSettings,
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass-header px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-[#74FFAC]/30 flex items-center justify-center text-[#74FFAC] shadow-sm">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight text-white">
              Auto<span className="text-[#74FFAC]">Spend</span>
            </h1>
            <span className="px-1.5 py-0.5 rounded bg-[#74FFAC]/10 text-[#74FFAC] border border-[#74FFAC]/20 text-[10px] font-mono font-bold">
              v1.0
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#74FFAC] animate-pulse" />
            <span>{currentUser ? currentUser.email : 'Guest Session'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Currency Selector */}
        <select
          value={selectedCurrency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[#74FFAC] text-xs font-bold focus:outline-none focus:border-[#74FFAC] transition-colors cursor-pointer"
        >
          {SUPPORTED_CURRENCIES.map((curr) => (
            <option key={curr.code} value={curr.code}>
              {curr.code} ({curr.symbol})
            </option>
          ))}
        </select>

        {/* User Account / Auth Trigger */}
        <button
          type="button"
          onClick={onOpenAuthModal}
          title="Account Login / Sign Up"
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800/80 text-[#74FFAC] transition-colors border border-slate-800 shadow-sm"
        >
          <User className="w-4 h-4" />
        </button>

        {/* Developer Webhook Button */}
        <button
          type="button"
          onClick={onOpenDevSettings}
          title="Developer & Webhook Settings"
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-colors border border-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
        >
          <Code2 className="w-4 h-4 text-[#74FFAC]" />
          <span className="hidden sm:inline">API</span>
        </button>
      </div>
    </header>
  );
}
