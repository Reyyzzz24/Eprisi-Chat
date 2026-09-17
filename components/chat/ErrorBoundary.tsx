"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm font-medium text-foreground">Something went wrong.</p>
          <p className="max-w-sm text-xs text-muted-foreground">{this.state.error.message}</p>
          <Button size="sm" variant="outline" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
