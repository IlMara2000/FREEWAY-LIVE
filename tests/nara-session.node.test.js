import assert from 'node:assert/strict'
import test from 'node:test'
import {
  continueNaraSession,
  createNaraSession,
  getNaraScore,
  selectNaraAnswer,
  submitNaraAnswer,
} from '../src/features/nara/naraSession.js'

const level = {
  questions: [
    { id: 'q1', answer: 1 },
    { id: 'q2', answer: 0 },
  ],
}

const answer = (session, optionIndex) => submitNaraAnswer(selectNaraAnswer(session, optionIndex), level)

test('una risposta errata consuma un cuore e ripropone la domanda', () => {
  let session = createNaraSession(level)
  session = answer(session, 0)
  assert.equal(session.hearts, 2)
  assert.equal(session.feedback.isCorrect, false)
  session = continueNaraSession(session)
  assert.deepEqual(session.queue, ['q2', 'q1'])
})

test('tre errori terminano la sessione senza completarla', () => {
  let session = createNaraSession(level)
  for (let index = 0; index < 3; index += 1) {
    const currentQuestion = level.questions.find(({ id }) => id === session.queue[0])
    const wrongIndex = currentQuestion.answer === 0 ? 1 : 0
    session = answer(session, wrongIndex)
    session = continueNaraSession(session)
  }
  assert.equal(session.hearts, 0)
  assert.equal(session.status, 'failed')
})

test('tutte le risposte corrette completano il livello', () => {
  let session = createNaraSession(level)
  session = continueNaraSession(answer(session, 1))
  session = continueNaraSession(answer(session, 0))
  assert.equal(session.status, 'complete')
  assert.deepEqual(session.mastered, ['q1', 'q2'])
  assert.equal(getNaraScore(session), 100)
})
