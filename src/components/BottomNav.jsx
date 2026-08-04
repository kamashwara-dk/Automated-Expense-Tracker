'use client';

import { Home, ArrowLeftRight, Plus, BarChart2 } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange, onFabClick }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav px-4 pt-2.5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl border-t border-slate-800/60">
      <div className="max-w-md mx-auto flex items-center justify-between relative">
        {/* Home Tab */}
        <button type="button" onClick={() => onTabChange('home')}
          className={`flex flex-col items-center gap-0.5 transition-all duration-200 py-1 px-3 rounded-xl touch-target ${activeTab === 'home' ? 'text-[#74FFAC] font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'text-[#74FFAC]' : 'text-slate-400'}`} />
          <span className="text-[10px] tracking-wide">Home</span>
          {activeTab === 'home' && <span className="w-1.5 h-1.5 bg-[#74FFAC] rounded-full shadow-[0_0_8px_#74FFAC]" />}
        </button>

        {/* Center Floating Action Button (FAB) */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2">
          <button type="button" onClick={onFabClick} aria-label="Add transaction manually"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#74FFAC] via-emerald-400 to-[#FF4885] flex items-center justify-center text-slate-950 fab-shadow transform active:scale-95 transition-all duration-200 border-4 border-[#070b12] shadow-xl">
            <Plus className="w-7 h-7 stroke-[3] text-slate-950" />
          </button>
        </div>

        {/* Insights Tab */}
        <button type="button" onClick={() => onTabChange('insights')}
          className={`flex flex-col items-center gap-0.5 transition-all duration-200 py-1 px-3 rounded-xl touch-target ${activeTab === 'insights' ? 'text-[#74FFAC] font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
          <BarChart2 className={`w-5 h-5 ${activeTab === 'insights' ? 'text-[#74FFAC]' : 'text-slate-400'}`} />
          <span className="text-[10px] tracking-wide">Insights</span>
          {activeTab === 'insights' && <span className="w-1.5 h-1.5 bg-[#74FFAC] rounded-full shadow-[0_0_8px_#74FFAC]" />}
        </button>

        {/* Transactions Tab */}
        <button type="button" onClick={() => onTabChange('transactions')}
          className={`flex flex-col items-center gap-0.5 transition-all duration-200 py-1 px-3 rounded-xl touch-target ${activeTab === 'transactions' ? 'text-[#74FFAC] font-bold' : 'text-slate-400 hover:text-slate-200'}`}>
          <ArrowLeftRight className={`w-5 h-5 ${activeTab === 'transactions' ? 'text-[#74FFAC]' : 'text-slate-400'}`} />
          <span className="text-[10px] tracking-wide">History</span>
          {activeTab === 'transactions' && <span className="w-1.5 h-1.5 bg-[#74FFAC] rounded-full shadow-[0_0_8px_#74FFAC]" />}
        </button>
      </div>
    </nav>
  );
}
