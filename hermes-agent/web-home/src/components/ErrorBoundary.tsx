import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "#fee2e2" }}
          >
            <span style={{ color: "var(--danger)", fontSize: 24 }}>!</span>
          </div>
          <div>
            <p className="text-base font-semibold text-[var(--fg)]">
              Something went wrong
            </p>
            <p className="mt-1 max-w-md break-words text-sm text-[var(--fg-muted)]">
              {this.state.error.message}
            </p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-md px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--primary)" }}
          >
            Reload view
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
