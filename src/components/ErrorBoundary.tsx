import { Component, type ReactNode } from 'react'

/**
 * If anything inside crashes (e.g. WebGL is unavailable on an old phone),
 * render `fallback` instead of taking down the whole page.
 */
export class ErrorBoundary extends Component<{ fallback?: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children
  }
}
