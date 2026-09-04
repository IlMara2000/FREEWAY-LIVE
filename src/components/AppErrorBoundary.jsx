import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error(JSON.stringify({
      event: 'app_render_failed',
      error: error?.name || 'UnknownError',
    }))
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="app-fallback">
        <p className="eyebrow">TraduLimba</p>
        <h1>Qualcosa non ha caricato bene.</h1>
        <p>Il testo non è stato inviato. Ricarica la pagina per ripartire.</p>
        <button type="button" className="translate-button" onClick={() => window.location.reload()}>
          Ricarica TraduLimba
        </button>
      </main>
    )
  }
}
