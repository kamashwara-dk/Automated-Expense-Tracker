'use client';

import { AlertTriangle, X } from 'lucide-react';

/**
 * Reusable confirmation dialog for destructive actions.
 * 
 * Props:
 *   isOpen: boolean
 *   title: string
 *   message: string
 *   confirmLabel: string (default: "Delete")
 *   cancelLabel: string (default: "Cancel")
 *   onConfirm: () => void
 *   onCancel: () => void
 *   danger: boolean (default: true — red confirm button)
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = true,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="confirm-overlay fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="confirm-dialog w-full max-w-sm glass-modal rounded-3xl p-6 border border-slate-700 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + Title */}
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-2xl shrink-0 ${danger ? 'bg-[#FF4885]/10 border border-[#FF4885]/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? 'text-[#FF4885]' : 'text-amber-400'}`} />
          </div>
          <div className="flex-1 pt-0.5">
            <h3 className="text-sm font-bold text-slate-100">{title}</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-lg ${
              danger
                ? 'bg-[#FF4885] hover:bg-[#FF4885]/90 text-white shadow-[#FF4885]/20'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
