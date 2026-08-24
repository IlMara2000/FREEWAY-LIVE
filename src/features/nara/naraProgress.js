export const NARA_PROGRESS_KEY = 'tradulimba:nara-progress:v1'
export const NARA_PROGRESS_SCHEMA = 1
export const NARA_COURSE_VERSION = 'lsc-basic-1'

const EMPTY_PROGRESS = Object.freeze({
  schemaVersion: NARA_PROGRESS_SCHEMA,
  courseVersion: NARA_COURSE_VERSION,
  totalXp: 0,
  completed: {},
})

const asSafeInteger = (value, fallback = 0, maximum = Number.MAX_SAFE_INTEGER) => (
  Number.isSafeInteger(value) && value >= 0 ? Math.min(value, maximum) : fallback
)

const makeEmptyProgress = () => ({ ...EMPTY_PROGRESS, completed: {} })

export function normalizeNaraProgress(value, levelIds) {
  if (
    !value
    || typeof value !== 'object'
    || value.schemaVersion !== NARA_PROGRESS_SCHEMA
    || value.courseVersion !== NARA_COURSE_VERSION
  ) {
    return makeEmptyProgress()
  }

  const sourceCompleted = value.completed && typeof value.completed === 'object'
    ? value.completed
    : {}
  const completed = {}

  for (const levelId of levelIds) {
    const saved = sourceCompleted[levelId]
    if (!saved || typeof saved !== 'object') break

    completed[levelId] = {
      completions: Math.max(1, asSafeInteger(saved.completions, 1, 999)),
      bestScore: asSafeInteger(saved.bestScore, 0, 100),
      lastCompletedAt: typeof saved.lastCompletedAt === 'string' ? saved.lastCompletedAt : '',
    }
  }

  return {
    schemaVersion: NARA_PROGRESS_SCHEMA,
    courseVersion: NARA_COURSE_VERSION,
    totalXp: asSafeInteger(value.totalXp, 0, 999999),
    completed,
  }
}

export function loadNaraProgress(levelIds, storage) {
  try {
    const progressStorage = storage === undefined ? globalThis.localStorage : storage
    const stored = progressStorage?.getItem(NARA_PROGRESS_KEY)
    return normalizeNaraProgress(stored ? JSON.parse(stored) : null, levelIds)
  } catch {
    return makeEmptyProgress()
  }
}

export function saveNaraProgress(progress, storage) {
  try {
    const progressStorage = storage === undefined ? globalThis.localStorage : storage
    progressStorage?.setItem(NARA_PROGRESS_KEY, JSON.stringify(progress))
    return true
  } catch {
    return false
  }
}

export function getCompletedLevelCount(progress, levelIds) {
  let count = 0
  for (const levelId of levelIds) {
    if (!progress.completed[levelId]) break
    count += 1
  }
  return count
}

export function isNaraLevelUnlocked(progress, levelId, levelIds) {
  const index = levelIds.indexOf(levelId)
  return index >= 0 && index <= getCompletedLevelCount(progress, levelIds)
}

export function getVisibleNaraLevels(progress, levels) {
  const completedCount = getCompletedLevelCount(progress, levels.map(({ id }) => id))
  return levels.slice(0, Math.min(levels.length, completedCount + 1))
}

export function completeNaraLevel(progress, levelId, levelIds, score, completedAt) {
  if (!isNaraLevelUnlocked(progress, levelId, levelIds)) {
    return { progress, awardedXp: 0 }
  }

  const previous = progress.completed[levelId]
  const awardedXp = previous ? 5 : 20
  const next = normalizeNaraProgress({
    ...progress,
    totalXp: progress.totalXp + awardedXp,
    completed: {
      ...progress.completed,
      [levelId]: {
        completions: (previous?.completions || 0) + 1,
        bestScore: Math.max(previous?.bestScore || 0, Math.max(0, Math.min(100, Math.round(score)))),
        lastCompletedAt: completedAt,
      },
    },
  }, levelIds)

  return { progress: next, awardedXp }
}
