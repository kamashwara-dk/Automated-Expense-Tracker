'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Copy, Check, RefreshCw, Smartphone, Link2,
  ChevronRight, AlertCircle, Loader2, ShieldCheck,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a crypto-random token like val_xxxxxxxxxxxxxxxx */
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SetupView({ currentUser }) {
  const [syncToken, setSyncToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  // ── Fetch or create sync token ────────────────────────────────────────────
  const loadToken = useCallback(async () => {
    if (!isSupabaseConfigured || !currentUser?.id) {
      setSyncToken('val_demo_notpersisted');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Try to read the existing profile row
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('sync_token')
        .eq('id', currentUser.id)
        .single();

      if (fetchErr && fetchErr.code !== 'PGRST116') {
        // PGRST116 = "no rows returned" — handled below
        throw fetchErr;
      }

      if (data?.sync_token) {
        // Happy path — profile + token already exist
        setSyncToken(data.sync_token);
      } else {
        // Profile row is missing (user created before the trigger was added).
        // INSERT a new profile with a freshly generated token.
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

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  // ── Regenerate token ──────────────────────────────────────────────────────
  const handleRegenerate = async () => {
    if (!isSupabaseConfigured || !currentUser?.id) return;
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
          Connect Apple Shortcuts or Tasker to automatically log expenses from your bank SMS.
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
            <button type="button" onClick={loadToken} className="ml-auto text-xs font-bold underline">
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Token display */}
            <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-950 border border-[#74FFAC]/20 shadow-inner">
              <code className="flex-1 text-[#74FFAC] font-mono text-sm tracking-widest break-all selectable">
                {syncToken}
              </code>
            </div>

            <div className="flex items-center gap-2">
              {/* Copy */}
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#74FFAC] hover:bg-[#74FFAC]/90 text-slate-950 text-xs font-extrabold transition-all shadow-md shadow-[#74FFAC]/20 active:scale-95"
              >
                {copied ? (
                  <><Check className="w-4 h-4 stroke-[3]" /><span>Copied!</span></>
                ) : (
                  <><Copy className="w-4 h-4 stroke-[2.5]" /><span>Copy Token</span></>
                )}
              </button>

              {/* Regenerate */}
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

      {/* ── iOS Shortcut Guide ── */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">iOS Apple Shortcuts Setup</h3>
            <p className="text-[11px] text-slate-400">Automatically log expenses from bank SMS — no manual entry.</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <SetupStep number="1">
            <strong className="text-slate-100">Copy your Sync Token</strong> above using the Copy button.
          </SetupStep>

          <SetupStep number="2">
            Download the official{' '}
            <span className="inline-flex items-center gap-1.5 flex-wrap">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                title="Shortcut link coming soon"
                className="text-[#74FFAC] font-semibold underline underline-offset-2 inline-flex items-center gap-1"
              >
                Valuta Apple Shortcut
                <Link2 className="w-3 h-3" />
              </a>
              <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                link coming soon
              </span>
            </span>
            {' '}from iCloud Shortcuts.
          </SetupStep>

          <SetupStep number="3">
            When the Shortcut setup screen appears,{' '}
            <strong className="text-slate-100">paste your Sync Token</strong> into the token field and tap Done.
          </SetupStep>

          <SetupStep number="4">
            In iOS <strong className="text-slate-100">Settings → Automation</strong>, create a new automation
            triggered by <strong className="text-slate-100">Messages from your bank</strong> and run the Valuta
            shortcut. Your expenses will sync automatically.
          </SetupStep>
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
          The API also accepts{' '}
          <code className="bg-slate-800 px-1 rounded text-slate-300">
            Authorization: Bearer &lt;token&gt;
          </code>{' '}
          as an alternative to the JSON field.
        </p>
      </div>

    </div>
  );
}
