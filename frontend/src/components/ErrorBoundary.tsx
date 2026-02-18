import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fadeIn">
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-3">
            <span className="text-2xl">⚠</span>
          </div>
          <h2 className="text-base font-semibold text-chispa-text-primary mb-1">Something went wrong</h2>
          <p className="text-[12px] text-chispa-text-muted mb-3 max-w-sm">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })} className="px-3 py-1.5 bg-chispa-orange text-white rounded-lg text-[12px] font-medium hover:bg-chispa-orange/80 transition-colors">Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
