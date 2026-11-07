import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[RetailOS] React render failure:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <main role="alert" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
          <section>
            <h1>RetailOS gặp sự cố</h1>
            <p>Giao diện không thể tải đầy đủ. Hãy tải lại ứng dụng để tiếp tục.</p>
            <button type="button" onClick={() => window.location.reload()}>Tải lại ứng dụng</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
