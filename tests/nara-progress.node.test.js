import assert from 'node:assert/strict'
import test from 'node:test'
import {
  completeNaraLevel,
  getCompletedLevelCount,
  getVisibleNaraLevels,
  isNaraLevelUnlocked,
  loadNaraProgress,
  NARA_COURSE_VERSION,
  NARA_PROGRESS_SCHEMA,
  normalizeNaraProgress,
  saveNaraProgress,
} from '../src/features/nara/naraProgress.js'

const levels = [{ id: 'one' }, { id: 'two' }, { id: 'three' }]
const levelIds = levels.map(({ id }) => id)
const empty = () => normalizeNaraProgress(null, levelIds)

test('mostra solo il primo livello e sblocca il successivo in sequenza', () => {
  const initial = empty()
  assert.deepEqual(getVisibleNaraLevels(initial, levels).map(({ id }) => id), ['one'])
  assert.equal(isNaraLevelUnlocked(initial, 'one', levelIds), true)
  assert.equal(isNaraLevelUnlocked(initial, 'two', levelIds), false)

  const { progress } = completeNaraLevel(initial, 'one', levelIds, 100, '2026-08-24T10:00:00.000Z')
  assert.equal(getCompletedLevelCount(progress, levelIds), 1)
  assert.deepEqual(getVisibleNaraLevels(progress, levels).map(({ id }) => id), ['one', 'two'])
})

test('non permette salti e mantiene rigiocabili i livelli completati', () => {
  const initial = empty()
  assert.equal(completeNaraLevel(initial, 'three', levelIds, 100, '').awardedXp, 0)

  const first = completeNaraLevel(initial, 'one', levelIds, 75, 'first')
  const replay = completeNaraLevel(first.progress, 'one', levelIds, 90, 'replay')
  assert.equal(first.awardedXp, 20)
  assert.equal(replay.awardedXp, 5)
  assert.equal(replay.progress.completed.one.completions, 2)
  assert.equal(replay.progress.completed.one.bestScore, 90)
  assert.equal(isNaraLevelUnlocked(replay.progress, 'two', levelIds), true)
})

test('ripulisce progressi corrotti, estranei o fuori ordine', () => {
  const restored = normalizeNaraProgress({
    schemaVersion: NARA_PROGRESS_SCHEMA,
    courseVersion: NARA_COURSE_VERSION,
    totalXp: -10,
    completed: {
      two: { completions: 1, bestScore: 80 },
      unknown: { completions: 99, bestScore: 100 },
    },
  }, levelIds)

  assert.equal(restored.totalXp, 0)
  assert.deepEqual(restored.completed, {})
})

test('storage bloccato o JSON non valido non interrompono il gioco', () => {
  const brokenStorage = {
    length: 0,
    clear: () => {},
    getItem: () => '{oops',
    key: () => null,
    removeItem: () => {},
    setItem: () => { throw new Error('quota') },
  }
  assert.deepEqual(loadNaraProgress(levelIds, brokenStorage), empty())
  assert.equal(saveNaraProgress(empty(), brokenStorage), false)
})

test('anche un browser che nega l’accesso a localStorage viene gestito', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => { throw new Error('SecurityError') },
  })

  try {
    assert.deepEqual(loadNaraProgress(levelIds), empty())
    assert.equal(saveNaraProgress(empty()), false)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else delete globalThis.localStorage
  }
})
