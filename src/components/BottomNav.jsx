'use client';

import { Home, ArrowLeftRight, Plus, BarChart2, Globe, UserCircle } from 'lucide-react';

function NavTab({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition-all duration-200 min-w-[48px] touch-target ${
        active ? 'text-[#74FFAC]' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-[#74FFAC]' : 'text-slate-400'}`} />
      <span className={`text-[10px] tracking-wide font-medium ${active ? 'font-bold' : ''}`}>{label}</span>
      {active && <span className="w-1.5 h-1.5 bg-[#74FFAC] rounded-full shadow-[0_0_6px_#74FFAC]" />}
    </button>
  );
}

export default function BottomNav({ activeTab, onTabChange, onFabClick }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav border-t border-slate-800/60 shadow-2xl">
      <div className="max-w-lg mx-auto px-1 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-around h-16">

          <NavTab icon={Home}          label="Home"     active={activeTab === 'home'}         onClick={() => onTabChange('home')} />
          <NavTab icon={BarChart2}     label="Insights" active={activeTab === 'insights'}     onClick={() => onTabChange('insights')} />

          {/* FAB */}
          <div className="flex flex-col items-center justify-center -mt-5">
            <button type="button" onClick={onFabClick} aria-label="Add transaction"
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#74FFAC] via-emerald-400 to-[#FF4885] flex items-center justify-center fab-shadow active:scale-95 transition-all duration-200 border-4 border-[#070b12]">
              <Plus className="w-6 h-6 stroke-[3] text-slate-950" />
            </button>
            <span className="text-[10px] text-slate-500 mt-0.5">Add</span>
          </div>

          <NavTab icon={Globe}         label="Convert"  active={activeTab === 'converter'}    onClick={() => onTabChange('converter')} />
          <NavTab icon={UserCircle}    label="Profile"  active={activeTab === 'profile'}      onClick={() => onTabChange('profile')} />

        </div>
      </div>
    </nav>
  );
}
