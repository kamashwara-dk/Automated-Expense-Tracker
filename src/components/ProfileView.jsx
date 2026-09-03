'use client';

import { useState } from 'react';
import {
  User, Lock, Bell, Palette, LogOut, KeyRound,
  CheckCircle2, AlertCircle, Loader2, ChevronRight,
  Moon, Sparkles, ShieldCheck, Trash2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured, isRealUserId } from '@/lib/supabaseClient';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { applyTheme } from '@/lib/useTheme';

// ── Available themes (Light removed) ─────────────────────────────────────────
const THEMES = [
  { id: 'dark',     label: 'Dark',     icon: Moon,     desc: 'Default look' },
  { id: 'midnight', label: 'Midnight', icon: Sparkles, desc: 'Deep blue tones' },
];

const ACCENT_COLORS = [
  { id: 'mint',   color: '#74FFAC', label: 'Mint'   },
  { id: 'violet', color: '#a78bfa', label: 'Violet' },
  { id: 'sky',    color: '#38bdf8', label: 'Sky'    },
  { id: 'amber',  color: '#fbbf24', label: 'Amber'  },
  { id: 'rose',   color: '#fb7185', label: 'Rose'   },
];

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  return (
    <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-800 bg-slate-900/40">
        <Icon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ── Toggle row ────────────────────────────────────────────────────────────────
function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-200">{label}</p>
        {description && <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className="relative w-11 h-6 rounded-full transition-colors shrink-0"
        style={{ backgroundColor: checked ? 'var(--accent)' : '#334155' }}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProfileView({ currentUser, selectedCurrency, onCurrencyChange, onSignOut }) {

  const [theme,       setThemeStored]       = useLocalStorage('myvaluta-theme',        'dark');
  const [accentColor, setAccentColorStored] = useLocalStorage('myvaluta-accent',       'mint');
  const [notifDaily,  setNotifDaily]        = useLocalStorage('myvaluta-notif-daily',  true);
  const [notifWeekly, setNotifWeekly]       = useLocalStorage('myvaluta-notif-weekly', true);
  const [notifBudget, setNotifBudget]       = useLocalStorage('myvaluta-notif-budget', true);
  const [notifSync,   setNotifSync]         = useLocalStorage('myvaluta-notif-sync',   true);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwStatus,  setPwStatus]  = useState(null);

  // Apply theme immediately (DOM) AND persist to localStorage
  const handleThemeChange = (id) => {
    setThemeStored(id);
    applyTheme(id, accentColor);
  };

  const handleAccentChange = (id) => {
    setAccentColorStored(id);
    applyTheme(theme, id);
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    onSignOut();
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwStatus({ type: 'error', text: 'New passwords do not match.' }); return; }
    if (newPw.length < 6)    { setPwStatus({ type: 'error', text: 'Password must be at least 6 characters.' }); return; }
    setPwLoading(true);
    setPwStatus(null);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: currentPw });
      if (signInErr) throw new Error('Current password is incorrect.');
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw updateErr;
      setPwStatus({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwStatus({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setPwLoading(false);
    }
  };

  const isGuest = !isRealUserId(currentUser?.id);

  return (
    <div className="space-y-5 animate-fade-in pb-4">

      <div className="pt-1">
        <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
          <User className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          Profile &amp; Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">Manage your account, appearance and notifications.</p>
      </div>

      {/* ── Account ── */}
      <Section title="Account" icon={User}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border"
            style={{ background: 'var(--accent-dim)', borderColor: 'rgba(var(--accent-rgb),0.2)' }}>
            <span className="text-lg font-extrabold" style={{ color: 'var(--accent)' }}>
              {(currentUser?.email?.[0] ?? 'G').toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-100 truncate">{currentUser?.email || 'Guest User'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                {isGuest ? 'Guest Session' : 'Authenticated'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400">Display Currency</label>
          <select value={selectedCurrency} onChange={(e) => onCurrencyChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs font-bold focus:outline-none transition-colors"
            style={{ '--tw-ring-color': 'var(--accent)' }}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
            ))}
          </select>
        </div>

        <button type="button" onClick={handleSignOut}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[#FF4885]/20 text-[#FF4885] text-xs font-bold transition-colors hover:bg-[#FF4885]/10">
          <div className="flex items-center gap-2"><LogOut className="w-4 h-4" /><span>Sign Out</span></div>
          <ChevronRight className="w-4 h-4 opacity-60" />
        </button>
      </Section>

      {/* ── Appearance ── */}
      <Section title="Appearance" icon={Palette}>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400">Theme</label>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map(({ id, label, icon: Icon }) => {
              const active = theme === id;
              return (
                <button key={id} type="button" onClick={() => handleThemeChange(id)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all"
                  style={active ? {
                    background: 'var(--accent-dim)',
                    borderColor: 'rgba(var(--accent-rgb),0.3)',
                    color: 'var(--accent)',
                  } : {
                    background: 'rgba(15,23,42,0.5)',
                    borderColor: 'rgba(255,255,255,0.07)',
                    color: '#94a3b8',
                  }}>
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400">Accent Color</label>
          <div className="flex items-center gap-2.5 flex-wrap">
            {ACCENT_COLORS.map(({ id, color, label }) => (
              <button key={id} type="button" onClick={() => handleAccentChange(id)} title={label}
                className={`w-9 h-9 rounded-full transition-all ${accentColor === id ? 'scale-110' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                style={{
                  backgroundColor: color,
                  boxShadow: accentColor === id ? `0 0 0 2px #0f172a, 0 0 0 4px ${color}` : 'none',
                }} />
            ))}
          </div>
          <p className="text-[11px] text-slate-500">Changes apply instantly across the whole app.</p>
        </div>
      </Section>

      {/* ── Notifications ── */}
      <Section title="Notifications" icon={Bell}>
        <ToggleRow label="Daily spending alert"    description="Notify when you exceed your daily limit"        checked={notifDaily}  onChange={setNotifDaily} />
        <ToggleRow label="Weekly summary"          description="Week-over-week spending comparison"             checked={notifWeekly} onChange={setNotifWeekly} />
        <ToggleRow label="Budget warnings"         description="Alert at 70% and 90% of monthly budget"        checked={notifBudget} onChange={setNotifBudget} />
        <ToggleRow label="SMS sync confirmations"  description="Show toast when a new transaction is synced"   checked={notifSync}   onChange={setNotifSync} />
        <p className="text-[11px] text-slate-500 pt-1">In-app only. Push notifications require PWA installation.</p>
      </Section>

      {/* ── Change Password ── */}
      {!isGuest && (
        <Section title="Change Password" icon={Lock}>
          {pwStatus && (
            <div className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-medium border ${
              pwStatus.type === 'success'
                ? 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/20'
                : 'bg-[#FF4885]/10 text-[#FF4885] border-[#FF4885]/20'
            }`}>
              {pwStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{pwStatus.text}</span>
            </div>
          )}
          <form onSubmit={handlePasswordChange} className="space-y-3">
            {[
              { label: 'Current Password', value: currentPw, setter: setCurrentPw, placeholder: 'Enter current password' },
              { label: 'New Password',     value: newPw,     setter: setNewPw,     placeholder: 'Min. 6 characters' },
              { label: 'Confirm New',      value: confirmPw, setter: setConfirmPw, placeholder: 'Repeat new password' },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="password" required minLength={6} placeholder={placeholder} value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none transition-colors"
                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={(e)  => e.target.style.borderColor = ''} />
                </div>
              </div>
            ))}
            <button type="submit" disabled={pwLoading}
              className="w-full py-2.5 rounded-xl text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)' }}>
              {pwLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Updating...</span></>
                : <><KeyRound className="w-4 h-4" /><span>Update Password</span></>}
            </button>
          </form>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
            Your password is encrypted and never stored in plain text.
          </div>
        </Section>
      )}

      {/* ── Danger Zone ── */}
      {!isGuest && (
        <div className="glass-card rounded-2xl border border-[#FF4885]/20 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#FF4885]/20 bg-[#FF4885]/5">
            <Trash2 className="w-4 h-4 text-[#FF4885]" />
            <h3 className="text-xs font-bold text-[#FF4885] uppercase tracking-wider">Danger Zone</h3>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              Deleting your account is permanent and cannot be undone. All transactions and settings will be lost.
            </p>
            <button type="button"
              onClick={() => alert('To delete your account, please contact support or use the Supabase dashboard.')}
              className="w-full py-2.5 rounded-xl bg-transparent hover:bg-[#FF4885]/10 border border-[#FF4885]/30 text-[#FF4885] text-xs font-bold transition-colors flex items-center justify-center gap-2">
              <Trash2 className="w-4 h-4" />Delete Account
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
