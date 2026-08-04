'use client';

import { useState } from 'react';
import { X, LogIn, UserPlus, Mail, Lock, CheckCircle2, AlertCircle, Loader2, UserCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

export default function AuthModal({ isOpen, onClose, currentUser, onUserChange }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    if (!isSupabaseConfigured) {
      setTimeout(() => {
        const demoUser = { id: 'demo-user-1', email, name: email.split('@')[0] };
        onUserChange(demoUser);
        setStatusMessage({ type: 'success', text: `Signed in as ${email} (Demo Session)` });
        setIsLoading(false);
        setTimeout(() => {
          onClose();
        }, 1000);
      }, 600);
      return;
    }

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setStatusMessage({ type: 'success', text: 'Account created! Check your email to confirm registration.' });
        if (data.user) {
          onUserChange(data.user);
          setTimeout(() => onClose(), 1200);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setStatusMessage({ type: 'success', text: 'Signed in successfully!' });
        if (data.user) {
          onUserChange(data.user);
          setTimeout(() => onClose(), 1000);
        }
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Authentication failed' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    onUserChange(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md glass-modal rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-800 animate-slide-up space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              {currentUser ? 'User Profile & Account' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
            <p className="text-xs text-slate-400">
              {currentUser ? 'Manage your personal login session' : 'Sync your expense history across devices'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentUser ? (
          /* Signed In View */
          <div className="space-y-4 py-2">
            <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-[#74FFAC]/30 flex items-center justify-center text-[#74FFAC] shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">{currentUser.email || 'Authenticated User'}</h3>
                <span className="text-[11px] text-[#74FFAC] flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#74FFAC] animate-pulse" />
                  Active Session
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-xl bg-[#FF4885]/10 hover:bg-[#FF4885]/20 text-[#FF4885] border border-[#FF4885]/20 text-xs font-bold transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          /* Auth Form */
          <>
            {statusMessage && (
              <div
                className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium ${
                  statusMessage.type === 'success'
                    ? 'bg-[#74FFAC]/10 text-[#74FFAC] border border-[#74FFAC]/20'
                    : 'bg-[#FF4885]/10 text-[#FF4885] border border-[#FF4885]/20'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#74FFAC]" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#FF4885]" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC]"
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-[#74FFAC] focus:ring-1 focus:ring-[#74FFAC]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-[#74FFAC] hover:bg-[#74FFAC]/90 text-slate-950 text-xs font-extrabold shadow-md shadow-[#74FFAC]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setStatusMessage(null);
                }}
                className="text-xs font-bold text-[#74FFAC] hover:underline"
              >
                {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
