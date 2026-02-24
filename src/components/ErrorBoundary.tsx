import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render errors so the whole app doesn't white-screen.
 * Must be a class component — React has no hook equivalent for getDerivedStateFromError.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="min-h-screen themed-bg flex items-center justify-center p-6">
        <div className="xanga-box max-w-md w-full text-center space-y-4">
          <h1 className="xanga-title text-3xl">Oops! 😵</h1>
          <p className="xanga-subtitle">Something went wrong rendering this page.</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={this.handleReset}
              className="xanga-button text-sm"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border-2 border-dotted rounded-lg text-sm transition"
              style={{
                borderColor: 'var(--border-primary)',
                color: 'var(--accent-primary)',
                backgroundColor: 'var(--card-bg)',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
