import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MERIDIANO 3D ERROR BOUNDARY CAUGHT ERROR:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090d16] text-white p-6">
          <div className="max-w-xl w-full bg-slate-900 border border-red-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <AlertTriangle className="w-7 h-7 flex-shrink-0" />
              <h2 className="text-xl font-bold font-montserrat">
                {this.props.fallbackTitle || '3D Experience Runtime Error'}
              </h2>
            </div>

            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              An unexpected error occurred during rendering. Detailed diagnostic logs have been recorded to the console.
            </p>

            {this.state.error && (
              <div className="mb-6 p-4 rounded-lg bg-black/60 border border-slate-800 font-mono text-xs text-red-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack && (
                  <div className="mt-2 text-slate-500 border-t border-slate-800 pt-2">
                    {this.state.errorInfo.componentStack}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-medium text-sm transition-colors"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-2 font-medium text-sm transition-colors border border-slate-700"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
