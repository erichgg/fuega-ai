"use client";

import * as React from "react";
import { Flame, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isDev = process.env.NODE_ENV === "development";

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="relative">
            <div className="absolute inset-0 blur-xl bg-lava-hot/20 rounded-full" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-ember/40 bg-ember/10">
              <Flame className="h-8 w-8 text-ember" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-foreground font-mono mt-2">
            <span className="text-lava-hot">$ </span>
            Something went wrong
          </h2>

          <p className="max-w-md text-sm text-ash">
            An unexpected error occurred while rendering this page.
          </p>

          {isDev && this.state.error && (
            <div className="w-full max-w-lg mt-2">
              <div className="terminal-card p-4 text-left">
                <p className="font-mono text-xs text-ember break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="mt-2 font-mono text-[10px] text-smoke overflow-x-auto max-h-40 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 inline-flex items-center gap-2 border border-lava-hot/30 bg-lava-hot/10 px-5 py-2.5 text-sm font-medium text-foreground hover:bg-lava-hot/20 hover:border-lava-hot/50 transition-all"
          >
            <RefreshCw className="h-4 w-4 text-lava-hot" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
