'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import ValutaLogo from '@/components/ValutaLogo';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import ManualEntryModal from '@/components/ManualEntryModal';
import EditTransactionModal from '@/components/EditTransactionModal';
import DeveloperSettingsModal from '@/components/DeveloperSettingsModal';
import AuthModal from '@/components/AuthModal';
import LoginPage from '@/components/LoginPage';
import HomeView from '@/components/HomeView';
import TransactionsView from '@/components/TransactionsView';
import InsightsView from '@/components/InsightsView';
import SetupView from '@/components/SetupView';
import ConverterView from '@/components/ConverterView';
import ExportModal from '@/components/ExportModal';
import ProfileView from '@/components/ProfileView';
import PasswordResetView from '@/components/PasswordResetView';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ToastContainer, useToast } from '@/components/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { useTheme } from '@/lib/useTheme';

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCurrency, setSelectedCurrency, currencyHydrated] = useLocalStorage('myvaluta-currency', 'INR');
  const [currentUser, setCurrentUser] = useState(null);

  // ── Theme — read from localStorage and apply CSS variables immediately ──────
  const [theme,       , themeHydrated]  = useLocalStorage('myvaluta-theme',  'dark');
  const [accentColor, , accentHydrated] = useLocalStorage('myvaluta-accent', 'mint');
  useTheme(themeHydrated  ? theme       : 'dark',
           accentHydrated ? accentColor : 'mint');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDevSettingsOpen, setIsDevSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Password reset intercept — detected from URL (?reset=true) + PASSWORD_RECOVERY event
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  // Edit modal state
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Delete confirmation state
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // All transactions for the current user
  const [transactions, setTransactions] = useState([]);

  // Toast notifications
  const { toasts, removeToast, toast } = useToast();

  // ─── Supabase Auth Session Listener ───────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    // onAuthStateChange fires with INITIAL_SESSION on mount, which includes
    // the persisted session from localStorage — no need for a separate getSession call.
    // Using this as the single source of truth avoids a race condition where
    // getSession() and onAuthStateChange both set currentUser and double-trigger
    // the transaction fetch, sometimes before the client session is fully attached.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link in their email — show the new-password form
        setIsPasswordReset(true);
        setIsAuthLoading(false);
        return;
      }
      setCurrentUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Load User Transactions from Supabase ─────────────────────────────────
  useEffect(() => {
    async function loadSupabaseTransactions() {
      if (!isSupabaseConfigured || !currentUser?.id) return;
      setIsDataLoading(true);
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('date', { ascending: false });

        if (error) {
          console.error('Error loading transactions:', error.message, '| code:', error.code);
          toast.error('Failed to load transactions from cloud.');
        } else {
          console.log(`Loaded ${data?.length ?? 0} transactions for user ${currentUser.id}`);
          setTransactions(data ?? []);
        }
      } catch (err) {
        console.error('Failed to load user transactions:', err);
        toast.error('Network error while loading transactions.');
      } finally {
        setIsDataLoading(false);
      }
    }

    loadSupabaseTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ─── Supabase Realtime Subscription ───────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser?.id) return;

    const channel = supabase
      .channel(`transactions-realtime-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const newTx = payload.new;
          setTransactions((prev) => {
            if (prev.some((t) => t.id === newTx.id)) return prev;
            return [newTx, ...prev];
          });
          toast.info(`New transaction synced: ${newTx.merchant}`);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const updated = payload.new;
          setTransactions((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setTransactions((prev) => prev.filter((t) => t.id !== deletedId));
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime: subscribed to transactions for', currentUser.id);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime subscription error:', status, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ─── Add Transaction (called by ManualEntryModal / Webhook) ───────────────
  const handleTransactionAdded = useCallback((newTx) => {
    setTransactions((prev) => {
      if (prev.some((t) => t.id === newTx.id)) return prev;
      return [
        {
          id:       newTx.id || 'tx-' + Date.now(),
          merchant: newTx.merchant,
          category: newTx.category,
          amount:   newTx.amount,
          date:     newTx.date || new Date().toISOString(),
          user_id:  newTx.user_id || currentUser?.id || null,
        },
        ...prev,
      ];
    });
    toast.success(`Expense added: ${newTx.merchant}`);
  }, [currentUser, toast]);

  // ─── Edit Transaction (update local state + Supabase) ─────────────────────
  const handleTransactionUpdated = useCallback(async (updatedTx) => {
    // Optimistic update in UI
    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
    );

    // Persist to Supabase if configured
    if (isSupabaseConfigured && currentUser?.id) {
      try {
        const { error } = await supabase
          .from('transactions')
          .update({
            amount:   Number(updatedTx.amount),
            merchant: updatedTx.merchant,
            category: updatedTx.category,
            date:     new Date(updatedTx.date).toISOString(),
          })
          .eq('id', updatedTx.id)
          .eq('user_id', currentUser.id);

        if (error) {
          // Revert optimistic update on error
          console.warn('Supabase update warning:', error.message);
          toast.error('Failed to save changes to cloud. Please try again.');
        } else {
          toast.success('Transaction updated.');
        }
      } catch (err) {
        console.error('Error updating transaction in Supabase:', err);
        toast.error('Network error while updating transaction.');
      }
    } else {
      toast.success('Transaction updated.');
    }
  }, [currentUser, toast]);

  // ─── Delete Transaction — shows confirm dialog first ─────────────────────
  const requestDeleteTransaction = useCallback((txId) => {
    setPendingDeleteId(txId);
  }, []);

  const confirmDeleteTransaction = useCallback(async () => {
    const txId = pendingDeleteId;
    setPendingDeleteId(null);
    if (!txId) return;

    // Optimistic removal
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    toast.success('Transaction deleted.');

    if (isSupabaseConfigured && currentUser?.id) {
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', txId)
          .eq('user_id', currentUser.id);

        if (error) {
          console.warn('Supabase delete warning:', error.message);
          toast.error('Failed to delete from cloud. Please try again.');
        }
      } catch (err) {
        console.error('Error deleting transaction from Supabase:', err);
        toast.error('Network error while deleting transaction.');
      }
    }
  }, [pendingDeleteId, currentUser, toast]);

  // ─── Loading Screen ───────────────────────────────────────────────────────
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: 'var(--background)' }}>
        <div className="animate-pulse" style={{ filter: 'drop-shadow(0 0 24px rgba(var(--accent-rgb),0.5))' }}>
          <ValutaLogo size={72} />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '120ms' }} />
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '240ms' }} />
        </div>
        <p className="text-slate-500 text-xs">Loading My Valuta...</p>
      </div>
    );
  }

  // ─── Password Reset Gate ──────────────────────────────────────────────────
  if (isPasswordReset) {
    return (
      <PasswordResetView
        onComplete={() => {
          setIsPasswordReset(false);
          // Clear the ?reset=true from the URL cleanly
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', '/');
          }
        }}
      />
    );
  }

  // ─── Auth Gate ────────────────────────────────────────────────────────────
  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // ─── Main Authenticated Dashboard ─────────────────────────────────────────
  return (
    <div className="min-h-screen text-slate-100" style={{ backgroundColor: 'var(--background)', ['--tw-prose-body']: 'var(--foreground)' }}>
      <Header
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenDevSettings={() => setIsDevSettingsOpen(true)}
      />

      {/* Desktop layout */}
      <div className="min-h-screen flex flex-col lg:flex-row lg:justify-center lg:items-start lg:gap-8 lg:px-8 pt-16 pb-24">

        {/* Desktop left sidebar */}
        <aside className="hidden lg:flex flex-col gap-4 w-64 xl:w-72 pt-8 shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
          <div className="glass-card rounded-3xl p-5 border border-slate-800 space-y-1">
            <div className="flex items-center gap-3 mb-4">
              <ValutaLogo size={40} className="shrink-0" />
              <div>
                <p className="text-sm font-extrabold text-white">My <span style={{ color: 'var(--accent)' }}>Valuta</span></p>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{currentUser?.email}</p>
              </div>
            </div>
            {[
              { id: 'home',         label: 'Dashboard',         icon: '⬡' },
              { id: 'insights',     label: 'Insights',           icon: '◈' },
              { id: 'transactions', label: 'History',            icon: '≡' },
              { id: 'converter',    label: 'Converter',          icon: '⇄' },
              { id: 'setup',        label: 'Setup Automation',   icon: '⚡' },
              { id: 'profile',      label: 'Profile & Settings', icon: '◎' },
            ].map((item) => (
              <button key={item.id} type="button" onClick={() => setActiveTab(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={activeTab === item.id ? {
                  background:   'var(--accent-dim)',
                  color:        'var(--accent)',
                  border:       '1px solid rgba(var(--accent-rgb),0.2)',
                } : {
                  color: '#94a3b8',
                  border: '1px solid transparent',
                }}
                onMouseEnter={(e) => { if (activeTab !== item.id) e.currentTarget.style.color = '#e2e8f0'; }}
                onMouseLeave={(e) => { if (activeTab !== item.id) e.currentTarget.style.color = '#94a3b8'; }}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <div className="pt-3 mt-2 border-t border-slate-800">
              <button type="button" onClick={() => setIsModalOpen(true)}
                className="w-full py-2.5 rounded-xl text-slate-950 text-sm font-extrabold flex items-center justify-center gap-2 transition-all"
                style={{ backgroundColor: 'var(--accent)', boxShadow: '0 4px 14px -2px rgba(var(--accent-rgb),0.4)' }}>
                <Plus className="w-4 h-4 stroke-[3]" />
                Add Expense
              </button>
            </div>
          </div>
        </aside>

        {/* Main content column */}
        <main className="flex-1 lg:max-w-lg xl:max-w-xl w-full px-4 lg:px-0 pt-4 lg:pt-8 pb-4 space-y-6">
          <ErrorBoundary>
            {activeTab === 'home' ? (
              <HomeView
                transactions={transactions}
                selectedCurrency={selectedCurrency}
                isDataLoading={isDataLoading}
                onNavigateToTransactions={() => setActiveTab('transactions')}
                onOpenManualEntry={() => setIsModalOpen(true)}
                onOpenDevSettings={() => setIsDevSettingsOpen(true)}
                onEditTransaction={(tx) => setEditingTransaction(tx)}
                onDeleteTransaction={requestDeleteTransaction}
              />
            ) : activeTab === 'insights' ? (
              <InsightsView
                transactions={transactions}
                selectedCurrency={selectedCurrency}
              />
            ) : activeTab === 'setup' ? (
              <SetupView currentUser={currentUser} />
            ) : activeTab === 'converter' ? (
              <ConverterView transactions={transactions} selectedCurrency={selectedCurrency} />
            ) : activeTab === 'profile' ? (
              <ProfileView
                currentUser={currentUser}
                selectedCurrency={selectedCurrency}
                onCurrencyChange={setSelectedCurrency}
                onSignOut={() => setCurrentUser(null)}
              />
            ) : (
              <TransactionsView
                transactions={transactions}
                selectedCurrency={selectedCurrency}
                isDataLoading={isDataLoading}
                onOpenManualEntry={() => setIsModalOpen(true)}
                onOpenExport={() => setIsExportModalOpen(true)}
                onEditTransaction={(tx) => setEditingTransaction(tx)}
                onDeleteTransaction={requestDeleteTransaction}
              />
            )}
          </ErrorBoundary>
        </main>

      </div>

      {/* Bottom nav — mobile/tablet only (hidden on lg+) */}
      <div className="lg:hidden">
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onFabClick={() => setIsModalOpen(true)}
        />
      </div>

      {/* Manual Entry — passes user_id to /api/sync */}
      <ManualEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTransactionAdded={handleTransactionAdded}
        userId={currentUser?.id}
        selectedCurrency={selectedCurrency}
      />

      {/* Edit Transaction — syncs to Supabase */}
      <EditTransactionModal
        isOpen={Boolean(editingTransaction)}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onTransactionUpdated={handleTransactionUpdated}
        selectedCurrency={selectedCurrency}
      />

      {/* Developer Webhook & API Settings */}
      <DeveloperSettingsModal
        isOpen={isDevSettingsOpen}
        onClose={() => setIsDevSettingsOpen(false)}
        onTestWebhook={handleTransactionAdded}
        userId={currentUser?.id}
      />

      {/* User Auth Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteId)}
        title="Delete Transaction"
        message="This transaction will be permanently removed. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeleteTransaction}
        onCancel={() => setPendingDeleteId(null)}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactions={transactions}
        selectedCurrency={selectedCurrency}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
