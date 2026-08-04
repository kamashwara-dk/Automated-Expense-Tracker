'use client';

import { Code2, User } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import ValutaLogo from '@/components/ValutaLogo';

export default function Header({
  selectedCurrency = 'USD',
  onCurrencyChange,
  currentUser,
  onOpenAuthModal,
  onOpenDevSettings,
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass-header shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <ValutaLogo size={38} className="shrink-0 drop-shadow-[0_0_8px_rgba(116,255,172,0.4)]" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-extrabold tracking-tight text-white">
                My <span className="text-[#74FFAC]">Valuta</span>
              </h1>
              <span className="px-1.5 py-0.5 rounded bg-[#74FFAC]/10 text-[#74FFAC] border border-[#74FFAC]/20 text-[10px] font-mono font-bold hidden sm:inline">
                v1.0
              </span>
            </div>
            {/* Email — hidden on desktop since sidebar shows it */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 lg:hidden">
              <span className="w-1.5 h-1.5 rounded-full bg-[#74FFAC] animate-pulse" />
              <span className="truncate max-w-[160px]">{currentUser ? currentUser.email : 'Guest Session'}</span>
            </div>
          </div>
        </div>

        {/* Right controls */}
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

          {/* User Account */}
          <button
            type="button"
            onClick={onOpenAuthModal}
            title="Account"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800/80 text-[#74FFAC] transition-colors border border-slate-800 shadow-sm"
          >
            <User className="w-4 h-4" />
          </button>

          {/* API / Webhook */}
          <button
            type="button"
            onClick={onOpenDevSettings}
            title="Webhook Settings"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-colors border border-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Code2 className="w-4 h-4 text-[#74FFAC]" />
            <span className="hidden sm:inline">API</span>
          </button>
        </div>
      </div>
    </header>
  );
}
