'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
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
import ConfirmDialog from '@/components/ConfirmDialog';
import { ToastContainer, useToast } from '@/components/Toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useLocalStorage } from '@/lib/useLocalStorage';

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCurrency, setSelectedCurrency, currencyHydrated] = useLocalStorage('autospend-currency', 'USD');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDevSettingsOpen, setIsDevSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

        if (!error && data) {
          setTransactions(data);
        } else if (error) {
          console.error('Error loading transactions:', error.message);
          toast.error('Failed to load transactions from cloud.');
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
      .channel('transactions-realtime')
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
            // Avoid duplicates (may already be added optimistically)
            if (prev.some((t) => t.id === newTx.id)) return prev;
            return [newTx, ...prev];
          });
          toast.info(`New transaction synced: ${newTx.merchant}`);
        }
      )
      .subscribe();

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
      <div className="min-h-screen bg-[#070b12] flex flex-col items-center justify-center gap-3">
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#74FFAC] via-emerald-400 to-[#FF4885] flex items-center justify-center text-slate-950 shadow-xl shadow-[#74FFAC]/20 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#74FFAC] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#74FFAC] animate-bounce" style={{ animationDelay: '120ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#74FFAC] animate-bounce" style={{ animationDelay: '240ms' }} />
        </div>
        <p className="text-slate-500 text-xs">Loading AutoSpend...</p>
      </div>
    );
  }

  // ─── Auth Gate ────────────────────────────────────────────────────────────
  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // ─── Main Authenticated Dashboard ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 selection:bg-[#74FFAC] selection:text-slate-950">
      <Header
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenDevSettings={() => setIsDevSettingsOpen(true)}
      />

      {/* Desktop layout: centered narrow column with ambient background */}
      <div className="min-h-screen flex flex-col lg:flex-row lg:justify-center lg:items-start lg:gap-8 lg:px-8 pt-16 pb-24">

        {/* Desktop left sidebar — only on lg+ */}
        <aside className="hidden lg:flex flex-col gap-4 w-64 xl:w-72 pt-8 shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
          <div className="glass-card rounded-3xl p-5 border border-slate-800 space-y-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#74FFAC] to-emerald-400 flex items-center justify-center text-slate-950">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-extrabold text-white">Auto<span className="text-[#74FFAC]">Spend</span></p>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px]">{currentUser?.email}</p>
              </div>
            </div>
            {[
              { id: 'home', label: 'Dashboard', icon: '⬡' },
              { id: 'insights', label: 'Insights', icon: '◈' },
              { id: 'transactions', label: 'History', icon: '≡' },
            ].map((item) => (
              <button key={item.id} type="button" onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === item.id
                    ? 'bg-[#74FFAC]/10 text-[#74FFAC] border border-[#74FFAC]/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}>
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <div className="pt-3 mt-2 border-t border-slate-800">
              <button type="button" onClick={() => setIsModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-[#74FFAC] hover:bg-[#74FFAC]/90 text-slate-950 text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-md shadow-[#74FFAC]/20">
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
            ) : (
              <TransactionsView
                transactions={transactions}
                selectedCurrency={selectedCurrency}
                isDataLoading={isDataLoading}
                onOpenManualEntry={() => setIsModalOpen(true)}
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
