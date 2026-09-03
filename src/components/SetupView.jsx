'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Copy, Check, RefreshCw, Smartphone, Link2,
  ChevronRight, AlertCircle, Loader2, ShieldCheck, TabletSmartphone,
} from 'lucide-react';
import { supabase, isSupabaseConfigured, isRealUserId } from '@/lib/supabaseClient';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `val_${hex}`;
}

// ─── Step Item ────────────────────────────────────────────────────────────────

function SetupStep({ number, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-[#74FFAC]/10 border border-[#74FFAC]/30 text-[#74FFAC] text-[11px] font-extrabold flex items-center justify-center mt-0.5">
        {number}
      </span>
      <p className="text-sm text-slate-300 leading-relaxed">{children}</p>
    </div>
  );
}

// ─── Platform Tab Button ──────────────────────────────────────────────────────

function PlatformTab({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
        active
          ? 'bg-[#74FFAC]/10 text-[#74FFAC] border border-[#74FFAC]/30'
          : 'text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SetupView({ currentUser }) {
  const [syncToken, setSyncToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [platform, setPlatform] = useState('ios'); // 'ios' | 'android'

  // ── Fetch or create sync token ────────────────────────────────────────────
  const loadToken = useCallback(async () => {
    if (!isSupabaseConfigured || !currentUser?.id || !isRealUserId(currentUser.id)) {
      setSyncToken('val_demo_notpersisted');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('sync_token')
        .eq('id', currentUser.id)
        .single();

      if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;

      if (data?.sync_token) {
        setSyncToken(data.sync_token);
      } else {
        const newToken = generateToken();
        const { error: insertErr } = await supabase
          .from('profiles')
          .insert({ id: currentUser.id, sync_token: newToken });
        if (insertErr) throw insertErr;
        setSyncToken(newToken);
      }
    } catch (err) {
      console.error('Failed to load sync token:', err);
      setError('Could not load your Sync Token. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadToken(); }, [loadToken]);

  // ── Regenerate token ──────────────────────────────────────────────────────
  const handleRegenerate = async () => {
    if (!isSupabaseConfigured || !currentUser?.id || !isRealUserId(currentUser.id)) return;
    setIsRegenerating(true);
    setError(null);
    try {
      const newToken = generateToken();
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert(
          { id: currentUser.id, sync_token: newToken, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );
      if (upsertErr) throw upsertErr;
      setSyncToken(newToken);
    } catch (err) {
      console.error('Failed to regenerate sync token:', err);
      setError('Could not regenerate token. Please try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!syncToken) return;
    navigator.clipboard.writeText(syncToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/sync`
      : 'https://my-valuta.vercel.app/api/sync';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in pb-4">

      {/* Page title */}
      <div className="pt-1">
        <h2 className="text-lg font-extrabold text-slate-100 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#74FFAC]" />
          Automation Setup
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Connect your phone to automatically log expenses from bank SMS — no manual entry.
        </p>
      </div>

      {/* ── Sync Token Card ── */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#74FFAC]/10 border border-[#74FFAC]/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#74FFAC]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Your Personal Sync Token</h3>
            <p className="text-[11px] text-slate-400">Keep this secret — it authenticates your bank SMS automations.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <Loader2 className="w-4 h-4 text-[#74FFAC] animate-spin" />
            <span className="text-xs text-slate-400">Loading your token…</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#FF4885]/10 border border-[#FF4885]/20 text-[#FF4885] text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            <button type="button" onClick={loadToken} className="ml-auto text-xs font-bold underline">Retry</button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-950 border border-[#74FFAC]/20 shadow-inner">
              <code className="flex-1 text-[#74FFAC] font-mono text-sm tracking-widest break-all selectable">
                {syncToken}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#74FFAC] hover:bg-[#74FFAC]/90 text-slate-950 text-xs font-extrabold transition-all shadow-md shadow-[#74FFAC]/20 active:scale-95"
              >
                {copied
                  ? <><Check className="w-4 h-4 stroke-[3]" /><span>Copied!</span></>
                  : <><Copy className="w-4 h-4 stroke-[2.5]" /><span>Copy Token</span></>
                }
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating || !isSupabaseConfigured}
                title="Generate a new token (invalidates the old one)"
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {!isSupabaseConfigured && (
              <p className="text-[11px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                ⚠️ Demo mode — token is not persisted. Connect Supabase to save your token.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Platform Tabs ── */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">

        {/* Tab bar */}
        <div className="flex gap-1.5 p-2 bg-slate-900/60 border-b border-slate-800">
          <PlatformTab
            active={platform === 'ios'}
            onClick={() => setPlatform('ios')}
            icon={<Smartphone className="w-4 h-4" />}
            label="iOS / iPhone"
          />
          <PlatformTab
            active={platform === 'android'}
            onClick={() => setPlatform('android')}
            icon={<TabletSmartphone className="w-4 h-4" />}
            label="Android"
          />
        </div>

        {/* Tab content */}
        <div className="p-5 space-y-3.5">

          {platform === 'ios' ? (
            <>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pb-1">
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                Automate via Apple Shortcuts — runs in the background.
              </p>

              <SetupStep number="1">
                <strong className="text-slate-100">Copy your Sync Token</strong> above using the Copy button.
              </SetupStep>

              <SetupStep number="2">
                Download the official Valuta Apple Shortcut from iCloud:{' '}
                <a
                  href="https://www.icloud.com/shortcuts/b6a3722dc9f34c5c97424608e48c5bae"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-3.5 py-2 rounded-xl bg-[#74FFAC]/10 hover:bg-[#74FFAC]/20 border border-[#74FFAC]/30 text-[#74FFAC] text-xs font-bold transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Get Valuta Shortcut
                </a>
              </SetupStep>

              <SetupStep number="3">
                When the Shortcut setup screen appears,{' '}
                <strong className="text-slate-100">paste your Sync Token</strong> into the token field and tap Done.
              </SetupStep>

              <SetupStep number="4">
                In iOS <strong className="text-slate-100">Settings → Automation</strong>, create a new automation
                triggered by <strong className="text-slate-100">Messages from your bank</strong> and run the
                Valuta shortcut. Your expenses will sync automatically.
              </SetupStep>
            </>
          ) : (
            <>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pb-1">
                <TabletSmartphone className="w-3.5 h-3.5 shrink-0" />
                Automate via MacroDroid — runs silently in the background.
              </p>

              <SetupStep number="1">
                <strong className="text-slate-100">Copy your Sync Token</strong> above using the Copy button.
              </SetupStep>

              <SetupStep number="2">
                Download <strong className="text-slate-100">MacroDroid</strong> from the Google Play Store:{' '}
                <a
                  href="https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  {/* Play Store icon */}
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M3.18 23.76a2 2 0 0 0 2.73.74l9.58-5.54-2.45-2.46-9.86 7.26zM20.5 9.19l-3.07-1.77L14.97 12l2.46 2.46 3.07-1.77a2 2 0 0 0 0-3.5zM1.19.53A2 2 0 0 0 .96 1.5v21a2 2 0 0 0 .23.97l.13.12 11.77-11.76v-.28L1.32.41l-.13.12zm14.28 13.65-9.58 5.54a2 2 0 0 0-2.73-.74L1.19 23.23l.01-.01 11.9-6.87 2.37-2.17z"/>
                  </svg>
                  Get MacroDroid
                </a>
              </SetupStep>

              <SetupStep number="3">
                Download the official Valuta Android Macro and open it in MacroDroid:{' '}
                <a
                  href="https://drive.google.com/file/d/1qmF6dONRTW2XZcun8REKZxqxTI7iX4Pv/view?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-3.5 py-2 rounded-xl bg-[#74FFAC]/10 hover:bg-[#74FFAC]/20 border border-[#74FFAC]/30 text-[#74FFAC] text-xs font-bold transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Download Valuta Macro
                </a>
              </SetupStep>

              <SetupStep number="4">
                When prompted, <strong className="text-slate-100">paste your Sync Token</strong>. Your expenses
                will now sync silently in the background every time your bank sends an SMS.
              </SetupStep>
            </>
          )}

        </div>
      </div>

      {/* ── Webhook Reference ── */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Webhook Reference</h3>
        <div className="space-y-2">
          <label className="text-[11px] text-slate-400 font-medium">Endpoint URL</label>
          <input
            type="text"
            readOnly
            value={webhookUrl}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-[#74FFAC] focus:outline-none selectable"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] text-slate-400 font-medium">Required JSON fields</label>
          <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
{`{
  "sync_token": "<your token>",
  "raw_sms":    "<full SMS text>"
}`}
          </pre>
        </div>
        <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
          <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-[#74FFAC]" />
          Also accepts{' '}
          <code className="bg-slate-800 px-1 rounded text-slate-300">Authorization: Bearer &lt;token&gt;</code>
          {' '}as an alternative to the JSON field.
        </p>
      </div>

    </div>
  );
}
