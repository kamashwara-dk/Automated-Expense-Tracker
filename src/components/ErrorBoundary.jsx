'use client';

import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * React error boundary — prevents white-screen crashes on runtime errors.
 * Wrap top-level views or modals with this.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FF4885]/10 border border-[#FF4885]/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-[#FF4885]" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200">Something went wrong</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {this.props.fallbackMessage || 'An unexpected error occurred. Please refresh the page.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
