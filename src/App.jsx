import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRightLeft,
  AudioLines,
  BookOpenText,
  Check,
  Clipboard,
  Clock3,
  Copy,
  ExternalLink,
  Info,
  Languages,
  LoaderCircle,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
  X,
} from 'lucide-react'
import NaraGame, { NaraPromo } from './components/NaraGame'

const MAX_CHARACTERS = 4000
const HISTORY_KEY = 'tradulimba:history:v1'

const LANGUAGE_LABELS = {
  ita: 'Italiano',
  srd: 'Sardu',
}

const VARIANTS = [
  { id: 'lsc', short: 'Sardu comune', label: 'Limba Sarda Comuna', note: 'Standard scritto' },
  { id: 'campidanese', short: 'Campidanesu', label: 'Campidanesu', note: 'Beta · sud' },
  { id: 'logudorese', short: 'Logudoresu', label: 'Logudoresu', note: 'Beta · centro-nord' },
]

const EXAMPLES = [
  'Buongiorno, come stai?',
  'La lingua custodisce la memoria di un popolo.',
  'Dove si trova la fermata dell’autobus?',
]

const readHistory = () => {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(value) ? value.slice(0, 8) : []
  } catch {
    return []
  }
}

const saveHistory = (items) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
  } catch {
    // La traduzione continua a funzionare anche se il browser blocca lo storage.
  }
}

const getVariant = (variantId) => (
  VARIANTS.find((variant) => variant.id === variantId) || VARIANTS[0]
)

const browserSpeech = (text, language, variant) => {
  if (!('speechSynthesis' in window)) return false

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = language === 'srd' ? 'it-IT' : 'it-IT'
  utterance.rate = language === 'srd' ? 0.86 : 0.94
  utterance.pitch = variant === 'campidanese' ? 1.03 : 0.98

  const italianVoice = window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang?.toLowerCase().startsWith('it'))
  if (italianVoice) utterance.voice = italianVoice

  window.speechSynthesis.speak(utterance)
  return true
}

function BrandMark({ compact = false }) {
  return (
    <span className={`brand-mark${compact ? ' brand-mark--compact' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <path className="brand-mark__bubble" d="M9 8.5h30a4.5 4.5 0 0 1 4.5 4.5v19A4.5 4.5 0 0 1 39 36.5H23l-8.5 6v-6H9A4.5 4.5 0 0 1 4.5 32V13A4.5 4.5 0 0 1 9 8.5Z" />
        <path className="brand-mark__wave brand-mark__wave--green" d="M12 26v-7" />
        <path className="brand-mark__wave brand-mark__wave--yellow" d="M20 30V15" />
        <path className="brand-mark__wave brand-mark__wave--orange" d="M28 27V18" />
        <path className="brand-mark__wave brand-mark__wave--blue" d="M36 30V15" />
      </svg>
    </span>
  )
}

function LanguageSwitch({ source, target, onSwap }) {
  return (
    <div className="language-switch" aria-label="Lingue della traduzione">
      <div className="language-switch__side">
        <span className="eyebrow">Da</span>
        <strong>{LANGUAGE_LABELS[source]}</strong>
      </div>
      <button
        type="button"
        className="swap-button"
        onClick={onSwap}
        aria-label="Scambia italiano e sardo"
        title="Scambia lingue"
      >
        <ArrowRightLeft size={20} strokeWidth={2.1} />
      </button>
      <div className="language-switch__side language-switch__side--right">
        <span className="eyebrow">A</span>
        <strong>{LANGUAGE_LABELS[target]}</strong>
      </div>
    </div>
  )
}

function App() {
  const [source, setSource] = useState('ita')
  const [target, setTarget] = useState('srd')
  const [variant, setVariant] = useState('lsc')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState('idle')
  const [audioStatus, setAudioStatus] = useState('idle')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState(readHistory)
  const [showInfo, setShowInfo] = useState(false)
  const [showGame, setShowGame] = useState(false)
  const requestRef = useRef(null)
  const textAreaRef = useRef(null)
  const infoButtonRef = useRef(null)
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)

  const selectedVariant = useMemo(() => getVariant(variant), [variant])
  const isLoading = status === 'loading'

  useEffect(() => () => requestRef.current?.abort(), [])

  useEffect(() => {
    if (!showInfo) return undefined

    const previouslyFocused = document.activeElement
    const pageRegions = document.querySelectorAll('.site-header, main, .site-footer')
    pageRegions.forEach((region) => region.setAttribute('inert', ''))
    closeButtonRef.current?.focus()

    const handleModalKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowInfo(false)
        return
      }

      if (event.key !== 'Tab' || !modalRef.current) return
      const focusable = [...modalRef.current.querySelectorAll(
        'button:not(:disabled), a[href], textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )]
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleModalKeyDown)
    return () => {
      document.removeEventListener('keydown', handleModalKeyDown)
      pageRegions.forEach((region) => region.removeAttribute('inert'))
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [showInfo])

  const addToHistory = (entry) => {
    const next = [
      entry,
      ...history.filter((item) => (
        item.input !== entry.input ||
        item.source !== entry.source ||
        item.variant !== entry.variant
      )),
    ].slice(0, 8)

    setHistory(next)
    saveHistory(next)
  }

  const translate = async (textOverride, directionOverride = {}) => {
    const text = (typeof textOverride === 'string' ? textOverride : input).trim()
    const activeSource = directionOverride.source || source
    const activeTarget = directionOverride.target || target
    const activeVariant = directionOverride.variant || variant
    if (!text || isLoading) return

    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setStatus('loading')
    setError('')
    setNotice('')
    setCopied(false)

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          source: activeSource,
          target: activeTarget,
          variant: activeVariant,
        }),
        signal: controller.signal,
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'La traduzione non è disponibile in questo momento.')
      }

      setOutput(data.translation)
      setStatus('success')
      setNotice(data.warning || '')
      addToHistory({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        input: text,
        output: data.translation,
        source: activeSource,
        target: activeTarget,
        variant: activeVariant,
        createdAt: new Date().toISOString(),
        engine: data.engine,
      })
    } catch (translationError) {
      if (translationError.name === 'AbortError') return
      setStatus('error')
      setError(translationError.message || 'Non sono riuscito a tradurre il testo.')
    }
  }

  const swapLanguages = () => {
    requestRef.current?.abort()
    setSource(target)
    setTarget(source)
    setInput(output || input)
    setOutput(output ? input : '')
    setStatus('idle')
    setError('')
    setNotice('')
    window.setTimeout(() => textAreaRef.current?.focus(), 0)
  }

  const pasteText = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      if (clipboardText) {
        setInput(clipboardText.slice(0, MAX_CHARACTERS))
        setOutput('')
        setStatus('idle')
      }
    } catch {
      setError('Il browser non consente di leggere gli appunti. Incolla il testo manualmente.')
    }
  }

  const copyTranslation = async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Non riesco a copiare automaticamente. Seleziona il testo e copialo manualmente.')
    }
  }

  const playTranslation = async () => {
    if (!output || audioStatus === 'loading') return
    setAudioStatus('loading')
    setError('')

    try {
      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: output, language: target, variant }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.audio) throw new Error(data.error || 'Voce AI non disponibile')

      const audio = new Audio(`data:${data.mediaType || 'audio/mpeg'};base64,${data.audio}`)
      await audio.play()
      setAudioStatus('playing')
      audio.addEventListener('ended', () => setAudioStatus('idle'), { once: true })
    } catch {
      const played = browserSpeech(output, target, variant)
      setAudioStatus(played ? 'playing' : 'idle')
      if (played) {
        setNotice(target === 'srd'
          ? 'Voce del dispositivo attiva: la pronuncia sarda è solo indicativa.'
          : 'Voce italiana del dispositivo attiva.')
        window.setTimeout(() => setAudioStatus('idle'), Math.min(12000, output.length * 75))
      } else {
        setError('La voce non è disponibile su questo dispositivo.')
      }
    }
  }

  const clearAll = () => {
    requestRef.current?.abort()
    setInput('')
    setOutput('')
    setStatus('idle')
    setError('')
    setNotice('')
    textAreaRef.current?.focus()
  }

  const handleExample = (example) => {
    setSource('ita')
    setTarget('srd')
    setInput(example)
    setOutput('')
    setStatus('idle')
    window.setTimeout(() => translate(example, { source: 'ita', target: 'srd', variant }), 0)
  }

  const restoreHistory = (item) => {
    setSource(item.source)
    setTarget(item.target)
    setVariant(item.variant)
    setInput(item.input)
    setOutput(item.output)
    setStatus('success')
    setError('')
    setNotice('')
    document.querySelector('.translator-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const clearHistory = () => {
    setHistory([])
    saveHistory([])
  }

  const selectVariant = (variantId) => {
    setVariant(variantId)
    setOutput('')
    setStatus('idle')
    setNotice('')
  }

  const handleVariantKeyDown = (event, currentIndex) => {
    const direction = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    }[event.key]
    let nextIndex = direction === undefined
      ? currentIndex
      : (currentIndex + direction + VARIANTS.length) % VARIANTS.length

    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = VARIANTS.length - 1
    if (nextIndex === currentIndex && !['Home', 'End'].includes(event.key)) return

    event.preventDefault()
    selectVariant(VARIANTS[nextIndex].id)
    event.currentTarget.parentElement
      ?.querySelectorAll('[role="radio"]')
      ?.[nextIndex]
      ?.focus()
  }

  if (showGame) {
    return (
      <NaraGame
        onExit={() => {
          setShowGame(false)
          window.setTimeout(() => {
            const launcher = document.querySelector('[data-nara-launcher]')
            if (launcher instanceof HTMLElement) launcher.focus()
          }, 0)
        }}
      />
    )
  }

  return (
    <div className="app-shell">
      <div className="page-texture" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href="#top" aria-label="TraduLimba, torna all’inizio">
          <BrandMark compact />
          <span className="brand__name">Tradu<span>Limba</span></span>
        </a>
        <nav className="site-nav" aria-label="Navigazione principale">
          <a href="#come-funziona">Come funziona</a>
          <button ref={infoButtonRef} type="button" className="nav-info" aria-label="Il progetto" onClick={() => setShowInfo(true)}>
            <Info size={17} />
            <span className="nav-info__label">Il progetto</span>
          </button>
        </nav>
        <span className="beta-badge">Beta · Sardu</span>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__kicker"><Sparkles size={15} /> Italiano ↔ Sardu</div>
          <h1 id="hero-title">Ogni parola<br /><em>trova casa.</em></h1>
          <p>
            Traduci tra italiano e sardo rispettando la varietà che senti più vicina.
            Semplice, aperto, fatto per migliorare insieme.
          </p>
        </section>

        <section className="translator-wrap" aria-label="Traduttore italiano sardo">
          <div className="translator-card">
            <LanguageSwitch source={source} target={target} onSwap={swapLanguages} />

            <div className="variant-bar">
              <div className="variant-bar__label">
                <MapPinned size={18} />
                <span>Quale sardo vuoi usare?</span>
              </div>
              <div className="variant-options" role="radiogroup" aria-label="Variante sarda">
                {VARIANTS.map((item, index) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={variant === item.id}
                    tabIndex={variant === item.id ? 0 : -1}
                    key={item.id}
                    className={`variant-option variant-option--${item.id}${variant === item.id ? ' is-active' : ''}`}
                    onClick={() => selectVariant(item.id)}
                    onKeyDown={(event) => handleVariantKeyDown(event, index)}
                  >
                    <span className="variant-option__name">
                      {variant === item.id && <Check size={14} strokeWidth={3} />}
                      {item.short}
                    </span>
                    <small>{item.note}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="translation-panels">
              <section className="text-panel text-panel--source">
                <div className="text-panel__heading">
                  <span>{LANGUAGE_LABELS[source]}</span>
                  <div className="text-panel__tools">
                    <button type="button" onClick={pasteText} title="Incolla dagli appunti">
                      <Clipboard size={17} />
                      <span>Incolla</span>
                    </button>
                    {input && (
                      <button type="button" onClick={clearAll} title="Cancella tutto" aria-label="Cancella tutto">
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  ref={textAreaRef}
                  value={input}
                  maxLength={MAX_CHARACTERS}
                  onChange={(event) => {
                    setInput(event.target.value)
                    setOutput('')
                    setStatus('idle')
                    setError('')
                    setNotice('')
                  }}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                      event.preventDefault()
                      translate()
                    }
                  }}
                  placeholder="Scrivi o incolla un testo…"
                  aria-label={`Testo in ${LANGUAGE_LABELS[source]}`}
                />
                <div className="text-panel__footer">
                  <span className="character-count">{input.length.toLocaleString('it-IT')} / {MAX_CHARACTERS.toLocaleString('it-IT')}</span>
                  <span className="keyboard-hint">⌘ Invio per tradurre</span>
                </div>
              </section>

              <section className="text-panel text-panel--result" aria-live="polite" aria-busy={isLoading}>
                <div className="text-panel__heading">
                  <span>{LANGUAGE_LABELS[target]}</span>
                  <span className="result-variant">{selectedVariant.short}</span>
                </div>
                <div className={`translation-output${!output ? ' is-empty' : ''}`}>
                  {isLoading ? (
                    <div className="loading-copy">
                      <LoaderCircle className="spin" size={25} />
                      <span>Stiamo cercando le parole giuste…</span>
                    </div>
                  ) : output || 'La traduzione apparirà qui.'}
                </div>
                <div className="text-panel__footer result-actions">
                  <button type="button" onClick={copyTranslation} disabled={!output}>
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? 'Copiata' : 'Copia'}
                  </button>
                  <button type="button" onClick={playTranslation} disabled={!output || audioStatus === 'loading'}>
                    {audioStatus === 'loading' ? <LoaderCircle className="spin" size={18} /> : <Volume2 size={18} />}
                    Ascolta <span className="experimental-tag">beta</span>
                  </button>
                </div>
              </section>
            </div>

            {(error || notice) && (
              <div className={`inline-message${error ? ' inline-message--error' : ''}`} role={error ? 'alert' : 'status'}>
                <Info size={17} />
                <span>{error || notice}</span>
              </div>
            )}

            <div className="translate-row">
              <div className="engine-note">
                <ShieldCheck size={17} />
                <span>Nessun account. La cronologia resta su questo dispositivo.</span>
              </div>
              <button
                type="button"
                className="translate-button"
                onClick={() => translate()}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? <LoaderCircle className="spin" size={20} /> : <Languages size={20} />}
                {isLoading ? 'Traduzione…' : 'Traduci'}
              </button>
            </div>
          </div>

          <div className="examples" aria-label="Frasi di esempio">
            <span>Prova con</span>
            {EXAMPLES.map((example) => (
              <button key={example} type="button" onClick={() => handleExample(example)}>
                “{example}”
              </button>
            ))}
          </div>
        </section>

        {history.length > 0 && (
          <section className="history-section" aria-labelledby="history-title">
            <div className="section-heading">
              <div>
                <span className="eyebrow"><Clock3 size={15} /> Sul tuo dispositivo</span>
                <h2 id="history-title">Traduzioni recenti</h2>
              </div>
              <button type="button" className="clear-history" onClick={clearHistory}>
                <Trash2 size={16} /> Cancella
              </button>
            </div>
            <div className="history-grid">
              {history.slice(0, 4).map((item) => (
                <button type="button" className="history-card" key={item.id} onClick={() => restoreHistory(item)}>
                  <span className="history-card__route">
                    {LANGUAGE_LABELS[item.source]} <ArrowRightLeft size={13} /> {LANGUAGE_LABELS[item.target]}
                  </span>
                  <strong>{item.input}</strong>
                  <p>{item.output}</p>
                  <small>{getVariant(item.variant).short}</small>
                </button>
              ))}
            </div>
          </section>
        )}

        <section id="come-funziona" className="how-section" aria-labelledby="how-title">
          <div className="how-intro">
            <span className="eyebrow">Un traduttore, più voci</span>
            <h2 id="how-title">Il sardo cambia<br />da zona a zona.</h2>
            <p>
              Per questo TraduLimba mostra sempre la varietà scelta. La LSC è il riferimento
              scritto; campidanese e logudorese sono esperimenti da affinare con parlanti e linguisti.
            </p>
          </div>
          <div className="principles-grid">
            <article>
              <span className="principle-number">01</span>
              <BookOpenText size={24} />
              <h3>Base linguistica aperta</h3>
              <p>La traduzione standard parte dalla coppia italiano–sardo di Apertium, con regole verificabili.</p>
              <a href="https://github.com/apertium/apertium-srd-ita" target="_blank" rel="noreferrer">
                Scopri Apertium <ExternalLink size={14} />
              </a>
            </article>
            <article>
              <span className="principle-number">02</span>
              <MapPinned size={24} />
              <h3>Varietà dichiarate</h3>
              <p>Niente “sardo unico”: scegli LSC, campidanese o logudorese prima di tradurre.</p>
            </article>
            <article>
              <span className="principle-number">03</span>
              <AudioLines size={24} />
              <h3>Voce sperimentale</h3>
              <p>L’audio AI prova a rendere la cadenza, ma non sostituisce la pronuncia di un parlante nativo.</p>
            </article>
          </div>
        </section>

        <NaraPromo onPlay={() => setShowGame(true)} />
      </main>

      <footer className="site-footer">
        <div className="brand brand--footer">
          <BrandMark compact />
          <span className="brand__name">Tradu<span>Limba</span></span>
        </div>
        <p className="site-footer__tagline">Il sardo, in tutte le sue voci.</p>
        <span>Prototipo pubblico · 2026</span>
        <p className="footer-declaration">SARDINIA NO EST ITALIA</p>
      </footer>

      {showInfo && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowInfo(false)}>
          <section
            ref={modalRef}
            className="info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button ref={closeButtonRef} type="button" className="modal-close" onClick={() => setShowInfo(false)} aria-label="Chiudi">
              <X size={20} />
            </button>
            <BrandMark />
            <span className="eyebrow">Perché TraduLimba</span>
            <h2 id="info-title">Tecnologia al servizio di una lingua viva.</h2>
            <p>
              Questo è un primo passo: una traduzione automatica utile, trasparente sui propri limiti
              e costruita per accogliere più varietà del sardo.
            </p>
            <div className="modal-note">
              <Info size={19} />
              <span>Non usare senza revisione per testi medici, legali o amministrativi. Modi di dire, nomi propri e forme locali possono essere tradotti male.</span>
            </div>
            <button type="button" className="translate-button" onClick={() => setShowInfo(false)}>Inizia a tradurre</button>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
