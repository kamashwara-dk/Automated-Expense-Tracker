'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, Share } from 'lucide-react';

export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    ) {
      setIsStandalone(true);
      return;
    }

    // Check if dismissed before
    const dismissed = sessionStorage.getItem('autospend-pwa-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Detect iOS Safari (no beforeinstallprompt support)
    const isIosSafari =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      /safari/i.test(navigator.userAgent) &&
      !/crios|fxios|chrome/i.test(navigator.userAgent);
    setIsIOS(isIosSafari);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsStandalone(true);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('autospend-pwa-dismissed', '1');
  };

  if (isStandalone || isDismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      <div className="glass-card rounded-2xl p-3.5 border border-[#74FFAC]/25 bg-[#74FFAC]/5 shadow-md relative animate-slide-down">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-[#74FFAC]/30 flex items-center justify-center text-[#74FFAC] shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                <span>Install AutoSpend</span>
                <Sparkles className="w-3 h-3 text-[#74FFAC]" />
              </div>
              <p className="text-[11px] text-slate-400">
                {isIOS ? 'Add to Home Screen for the best experience' : 'Install for offline access & home screen'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-[#74FFAC] hover:bg-[#74FFAC]/90 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-[#74FFAC]/20">
              {isIOS ? <Share className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isIOS ? 'How' : 'Install'}</span>
            </button>
            <button type="button" onClick={handleDismiss} aria-label="Dismiss install banner"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS step-by-step instructions modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowIOSInstructions(false)}>
          <div className="w-full max-w-sm glass-modal rounded-3xl p-6 border border-slate-700 shadow-2xl animate-slide-up space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100">Add to Home Screen</h3>
              <button type="button" onClick={() => setShowIOSInstructions(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#74FFAC]/10 border border-[#74FFAC]/20 text-[#74FFAC] flex items-center justify-center font-bold shrink-0 text-[10px]">1</span>
                <span>Tap the <strong className="text-slate-100">Share</strong> button (<Share className="w-3.5 h-3.5 inline" />) in the Safari toolbar at the bottom of the screen.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#74FFAC]/10 border border-[#74FFAC]/20 text-[#74FFAC] flex items-center justify-center font-bold shrink-0 text-[10px]">2</span>
                <span>Scroll down and tap <strong className="text-slate-100">&quot;Add to Home Screen&quot;</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#74FFAC]/10 border border-[#74FFAC]/20 text-[#74FFAC] flex items-center justify-center font-bold shrink-0 text-[10px]">3</span>
                <span>Tap <strong className="text-slate-100">Add</strong> to confirm. AutoSpend will appear on your home screen.</span>
              </li>
            </ol>
            <button type="button" onClick={() => setShowIOSInstructions(false)}
              className="w-full py-2.5 rounded-xl bg-[#74FFAC] text-slate-950 text-xs font-extrabold">
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
