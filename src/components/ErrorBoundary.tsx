import { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  title?: string;
  message?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught a runtime error:", error, errorInfo);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
        <section className="w-full max-w-md space-y-5 rounded-lg border border-border bg-card p-6 text-center shadow-lg">
          <div className="space-y-2">
            <h1 className="font-display text-3xl text-primary">
              {this.props.title ?? "Something went wrong"}
            </h1>
            <p className="font-body text-sm text-muted-foreground">
              {this.props.message ?? "The app hit an unexpected error. Reloading will give it a fresh start."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 font-body text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Reload page
          </button>

          {import.meta.env.DEV && (
            <details className="rounded-md border border-border bg-background p-3 text-left font-mono text-xs text-muted-foreground">
              <summary className="cursor-pointer font-body text-sm text-foreground">Error details</summary>
              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </section>
      </main>
    );
  }
}
