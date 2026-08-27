'use client';

import { Home, ArrowLeftRight, Plus, BarChart2, Zap, UserCircle } from 'lucide-react';

function NavTab({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all duration-200 min-w-[44px] touch-target ${
        active ? 'text-[#74FFAC]' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      <Icon className={`w-[18px] h-[18px] ${active ? 'text-[#74FFAC]' : 'text-slate-400'}`} />
      <span className={`text-[9px] tracking-wide font-medium ${active ? 'font-bold' : ''}`}>{label}</span>
      {active && <span className="w-1 h-1 bg-[#74FFAC] rounded-full shadow-[0_0_6px_#74FFAC]" />}
    </button>
  );
}

export default function BottomNav({ activeTab, onTabChange, onFabClick }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-slate-800/60 shadow-2xl">
      <div className="max-w-lg mx-auto px-1 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around h-16">

          <NavTab icon={Home}         label="Home"     active={activeTab === 'home'}         onClick={() => onTabChange('home')} />
          <NavTab icon={BarChart2}    label="Insights" active={activeTab === 'insights'}     onClick={() => onTabChange('insights')} />

          {/* FAB */}
          <div className="flex flex-col items-center justify-center -mt-5">
            <button type="button" onClick={onFabClick} aria-label="Add transaction"
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#74FFAC] via-emerald-400 to-[#FF4885] flex items-center justify-center fab-shadow active:scale-95 transition-all duration-200 border-4 border-[#070b12]">
              <Plus className="w-5 h-5 stroke-[3] text-slate-950" />
            </button>
            <span className="text-[9px] text-slate-500 mt-0.5">Add</span>
          </div>

          <NavTab icon={ArrowLeftRight} label="History"  active={activeTab === 'transactions'} onClick={() => onTabChange('transactions')} />
          <NavTab icon={Zap}           label="Setup"    active={activeTab === 'setup'}        onClick={() => onTabChange('setup')} />
          <NavTab icon={UserCircle}    label="Profile"  active={activeTab === 'profile'}      onClick={() => onTabChange('profile')} />

        </div>
      </div>
    </nav>
  );
}
