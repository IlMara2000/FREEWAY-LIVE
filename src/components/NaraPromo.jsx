import { useState } from 'react'
import { Play } from 'lucide-react'
import { NARA_LEVEL_COUNT, NARA_LEVEL_IDS } from '../features/nara/naraCatalog'
import { getCompletedLevelCount, loadNaraProgress } from '../features/nara/naraProgress'
import NaraMark from './NaraMark'

export default function NaraPromo({ onPlay, onWarmup }) {
  const [progress] = useState(() => loadNaraProgress(NARA_LEVEL_IDS))
  const completedCount = getCompletedLevelCount(progress, NARA_LEVEL_IDS)
  const hasStarted = completedCount > 0

  return (
    <section id="gioca" className="nara-promo" aria-labelledby="nara-promo-title">
      <div className="nara-promo__identity">
        <NaraMark />
        <div>
          <span className="eyebrow">Impara giocando</span>
          <strong>NARA!</strong>
        </div>
      </div>
      <div className="nara-promo__copy">
        <h2 id="nara-promo-title">Dieci passi per iniziare a parlare sardo.</h2>
        <p>Lezioni brevi, tre vite e un percorso base in Limba Sarda Comuna.</p>
        <div
          className="nara-promo__levels"
          role="progressbar"
          aria-label="Progresso NARA"
          aria-valuemin={0}
          aria-valuemax={NARA_LEVEL_COUNT}
          aria-valuenow={completedCount}
        >
          {NARA_LEVEL_IDS.map((levelId, index) => (
            <span key={levelId} className={index < completedCount ? 'is-complete' : ''} />
          ))}
        </div>
        <small>{hasStarted ? `${completedCount} livelli su ${NARA_LEVEL_COUNT} completati` : 'Il progresso resta su questo dispositivo'}</small>
      </div>
      <button
        type="button"
        className="nara-play-button"
        data-nara-launcher
        onClick={onPlay}
        onFocus={onWarmup}
        onMouseEnter={onWarmup}
        onTouchStart={onWarmup}
      >
        <Play size={19} fill="currentColor" />
        {hasStarted ? 'Riprendi' : 'Gioca ora'}
      </button>
    </section>
  )
}
