'use client';

import { useState } from 'react';
import { Sparkles, Mail, Lock, LogIn, UserPlus, ArrowRight, CheckCircle2, AlertCircle, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function LoginPage({ onLoginSuccess }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    if (mode === 'signup' && password !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Passwords do not match.' });
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setTimeout(() => {
        const demoUser = {
          id: 'demo-user-' + Date.now(),
          email: email || 'demo@autospend.io',
          name: (email || 'demo').split('@')[0],
        };
        setStatusMessage({ type: 'success', text: 'Signed in successfully! Loading dashboard...' });
        setTimeout(() => {
          onLoginSuccess(demoUser);
        }, 800);
      }, 600);
      return;
    }

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        setStatusMessage({ type: 'success', text: 'Account created! Loading your dashboard...' });
        if (data.user) {
          setTimeout(() => onLoginSuccess(data.user), 1000);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        setStatusMessage({ type: 'success', text: 'Welcome back! Loading dashboard...' });
        if (data.user) {
          setTimeout(() => onLoginSuccess(data.user), 800);
        }
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Authentication failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      onLoginSuccess({
        id: 'guest-user',
        email: 'guest@autospend.io',
        name: 'Guest User',
      });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-[#74FFAC] selection:text-slate-950">
      {/* Background Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#74FFAC]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#FF4885]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#74FFAC] via-emerald-400 to-[#FF4885] flex items-center justify-center text-slate-950 mx-auto shadow-xl shadow-[#74FFAC]/20 border border-[#74FFAC]/30 font-bold">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Auto<span className="text-[#74FFAC]">Spend</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Automated Mobile Expense Tracking & Real-Time Financial Intelligence
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="glass-modal rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setStatusMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-[#74FFAC] text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setStatusMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-[#74FFAC] text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Alert Status Banner */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-[#74FFAC]/10 text-[#74FFAC] border border-[#74FFAC]/20'
                  : 'bg-[#FF4885]/10 text-[#FF4885] border border-[#FF4885]/20'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC] transition-colors"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC] transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#74FFAC] to-emerald-400 hover:from-[#74FFAC] hover:to-emerald-300 text-slate-950 text-xs font-extrabold shadow-lg shadow-[#74FFAC]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading Session...</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Dashboard</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account & Get Started</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Mode Login */}
          <div className="pt-3 border-t border-slate-800/80 text-center space-y-2">
            <p className="text-[11px] text-slate-400">Want to test the interface right away?</p>
            <button
              type="button"
              onClick={handleGuestLogin}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-[#74FFAC]" />
              <span>Continue as Guest User</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#74FFAC]" />
          <span>Encrypted Session • Supabase Authentication Protected</span>
        </div>
      </div>
    </div>
  );
}
