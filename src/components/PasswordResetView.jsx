'use client';

import { useState } from 'react';
import { Lock, KeyRound, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import ValutaLogo from '@/components/ValutaLogo';

export default function PasswordResetView({ onComplete }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null); // {type, text}

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setStatus({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (password.length < 6) {
      setStatus({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus({ type: 'success', text: 'Password updated! Redirecting to your dashboard…' });
      setTimeout(() => onComplete(), 1500);
    } catch (err) {
      setStatus({ type: 'error', text: err.message || 'Failed to update password. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-[#74FFAC] selection:text-slate-950">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#74FFAC]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#FF4885]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-fit drop-shadow-[0_0_24px_rgba(116,255,172,0.35)]">
            <ValutaLogo size={64} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            My <span className="text-[#74FFAC]">Valuta</span>
          </h1>
        </div>

        {/* Card */}
        <div className="glass-modal rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-5">
          <div className="flex items-center gap-3 pb-1">
            <div className="w-10 h-10 rounded-2xl bg-[#74FFAC]/10 border border-[#74FFAC]/20 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-[#74FFAC]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Set a new password</h2>
              <p className="text-[11px] text-slate-400">Choose a strong password for your account.</p>
            </div>
          </div>

          {status && (
            <div className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
              status.type === 'success'
                ? 'bg-[#74FFAC]/10 text-[#74FFAC] border border-[#74FFAC]/20'
                : 'bg-[#FF4885]/10 text-[#FF4885] border border-[#FF4885]/20'
            }`}>
              {status.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{status.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="password" required minLength={6} placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC] transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="password" required minLength={6} placeholder="••••••••" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC] transition-colors" />
              </div>
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#74FFAC] to-emerald-400 hover:from-[#74FFAC] hover:to-emerald-300 text-slate-950 text-xs font-extrabold shadow-lg shadow-[#74FFAC]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Updating...</span></>
                : <><KeyRound className="w-4 h-4" /><span>Set New Password</span></>}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#74FFAC]" />
          <span>Secured by Supabase Authentication</span>
        </div>
      </div>
    </div>
  );
}
