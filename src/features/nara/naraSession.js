export const NARA_STARTING_HEARTS = 3

export function createNaraSession(level) {
  return {
    status: 'playing',
    queue: level.questions.map(({ id }) => id),
    mastered: [],
    selectedIndex: null,
    feedback: null,
    hearts: NARA_STARTING_HEARTS,
    attempts: 0,
    mistakes: 0,
  }
}

export function selectNaraAnswer(session, optionIndex) {
  if (session.status !== 'playing' || session.feedback) return session
  return { ...session, selectedIndex: optionIndex }
}

export function submitNaraAnswer(session, level) {
  if (session.status !== 'playing' || session.feedback || session.selectedIndex === null) return session

  const question = level.questions.find(({ id }) => id === session.queue[0])
  if (!question) return { ...session, status: 'failed' }

  const isCorrect = session.selectedIndex === question.answer
  const hearts = isCorrect ? session.hearts : Math.max(0, session.hearts - 1)

  return {
    ...session,
    hearts,
    attempts: session.attempts + 1,
    mistakes: session.mistakes + (isCorrect ? 0 : 1),
    feedback: {
      isCorrect,
      selectedIndex: session.selectedIndex,
      correctIndex: question.answer,
    },
  }
}

export function continueNaraSession(session) {
  if (session.status !== 'playing' || !session.feedback) return session

  if (!session.feedback.isCorrect && session.hearts === 0) {
    return { ...session, status: 'failed', feedback: null, selectedIndex: null }
  }

  const [current, ...remaining] = session.queue
  const queue = session.feedback.isCorrect ? remaining : [...remaining, current]
  const mastered = session.feedback.isCorrect
    ? [...session.mastered, current]
    : session.mastered

  return {
    ...session,
    status: queue.length === 0 ? 'complete' : 'playing',
    queue,
    mastered,
    selectedIndex: null,
    feedback: null,
  }
}

export function getNaraScore(session) {
  if (session.attempts === 0) return 100
  return Math.max(0, Math.round((session.mastered.length / session.attempts) * 100))
}
