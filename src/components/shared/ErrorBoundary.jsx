/**
 * Freeway Life - Error Boundary
 * 
 * Cattura errori di rendering in componenti figli senza crashare l'intera app.
 * Mostra un messaggio utente e un pulsante per riprovare.
 */

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn(`[ErrorBoundary] ${this.props.fallbackName || 'Section'}:`, error.message);
    if (typeof window.__freewayErrorLog === 'function') {
      window.__freewayErrorLog(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, onRetry: this.handleRetry })
          : this.props.fallback;
      }

      return (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-grotesk text-lg font-bold text-foreground">
                {this.props.title || 'Qualcosa non ha funzionato'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {this.props.message || 'Questa sezione ha avuto un errore. Puoi riprovare o ricaricare la pagina.'}
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <pre className="mt-3 rounded-xl bg-black/40 p-3 text-xs font-mono text-destructive overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="btn-cyber h-10 rounded-xl px-4 text-xs"
          >
            Riprova
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}