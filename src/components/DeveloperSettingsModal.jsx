'use client';

import { useState } from 'react';
import { X, Code2, Copy, Check, Database, Terminal, Send, CheckCircle2 } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

export default function DeveloperSettingsModal({ isOpen, onClose, onTestWebhook, userId }) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const webhookUrl = `${origin}/api/sync`;

  const sampleCurl = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 18.50, "merchant": "Subway", "category": "Food & Dining", "date": "${new Date().toISOString()}"}'`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(sampleCurl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleTriggerTestPayload = async () => {
    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat((Math.random() * 25 + 5).toFixed(2)),
          merchant: 'Test Webhook Merchant',
          category: 'Shopping',
          date: new Date().toISOString(),
          ...(userId ? { user_id: userId } : {}),
        }),
      });

      const data = await res.json();
      setTestResult({ success: res.ok, message: data.message || 'Webhook processed successfully' });
      if (onTestWebhook && data.data) {
        onTestWebhook(data.data);
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Failed to trigger test' });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl glass-modal rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-800 animate-slide-up space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-[#74FFAC]/30 flex items-center justify-center text-[#74FFAC]">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Developer & Webhook Settings</h2>
              <p className="text-xs text-slate-400">Sync endpoint for mobile automation (Tasker / iOS Shortcuts)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Status */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${isSupabaseConfigured ? 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-200">Supabase Connection</h3>
              <p className="text-[11px] text-slate-400">
                {isSupabaseConfigured ? 'Connected to live database' : 'Local fallback mode active (.env.local missing values)'}
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${isSupabaseConfigured ? 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
            {isSupabaseConfigured ? 'Active' : 'Demo Mode'}
          </span>
        </div>

        {/* Webhook Endpoint URL */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">Webhook Target Endpoint</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-[#74FFAC] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
            >
              {copiedUrl ? <Check className="w-4 h-4 text-[#74FFAC]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
            </button>
          </div>
        </div>

        {/* Sample cURL Command */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#74FFAC]" />
              <span>Sample cURL (Tasker / Terminal)</span>
            </label>
            <button
              type="button"
              onClick={handleCopyCurl}
              className="text-[11px] text-[#74FFAC] hover:underline font-medium flex items-center gap-1"
            >
              {copiedCurl ? <Check className="w-3 h-3 text-[#74FFAC]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
            </button>
          </div>
          <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {sampleCurl}
          </pre>
          <p className="text-[11px] text-slate-500">
            📱 <strong className="text-slate-400">iOS Shortcuts:</strong> Use a &quot;Get Contents of URL&quot; action with method POST, JSON body with the fields above.
          </p>
        </div>

        {/* Test Payload Trigger */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <div>
            {testResult && (
              <span className={`text-xs flex items-center gap-1.5 font-medium ${testResult.success ? 'text-[#74FFAC]' : 'text-[#FF4885]'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{testResult.message}</span>
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={isSendingTest}
            onClick={handleTriggerTestPayload}
            className="px-5 py-2.5 rounded-xl bg-[#74FFAC] hover:bg-[#74FFAC]/90 text-slate-950 text-xs font-extrabold flex items-center gap-2 transition-all shadow-md shadow-[#74FFAC]/20 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5 stroke-[3]" />
            <span>{isSendingTest ? 'Sending...' : 'Test Webhook'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
