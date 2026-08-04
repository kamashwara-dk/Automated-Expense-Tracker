'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/**
 * Toast notification component.
 * Usage: import { useToast, ToastContainer } from '@/components/Toast';
 */

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const COLORS = {
  success: 'bg-[#74FFAC]/10 text-[#74FFAC] border-[#74FFAC]/30',
  error: 'bg-[#FF4885]/10 text-[#FF4885] border-[#FF4885]/30',
  info: 'bg-slate-800 text-slate-200 border-slate-700',
};

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(true);
  const Icon = ICONS[toast.type] || Info;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration ?? 3000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <div
      className={`toast flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border shadow-xl text-xs font-semibold backdrop-blur-md transition-all duration-300 ${
        COLORS[toast.type] || COLORS.info
      } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      style={{ maxWidth: '90vw' }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          setTimeout(() => onRemove(toast.id), 300);
        }}
        className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

/**
 * Hook to manage toasts. Call in the top-level component (page.js).
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  };

  return { toasts, removeToast, toast };
}
