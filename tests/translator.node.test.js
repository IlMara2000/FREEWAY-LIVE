import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_TRANSLATION_CHARACTERS,
  normalizeTranslationInput,
  TranslatorError,
} from '../api/_translator.js'
import {
  MAX_SPEECH_CHARACTERS,
  normalizeSpeechInput,
  SpeechError,
} from '../api/_speech.js'

test('normalizza una richiesta italiano-sardo valida', () => {
  assert.deepEqual(
    normalizeTranslationInput({
      text: '  Buongiorno  ',
      source: 'ita',
      target: 'srd',
      variant: 'campidanese',
    }),
    {
      text: 'Buongiorno',
      source: 'ita',
      target: 'srd',
      variant: 'campidanese',
    },
  )
})

test('rifiuta testi vuoti, coppie uguali e varianti sconosciute', () => {
  assert.throws(() => normalizeTranslationInput({ text: ' ' }), TranslatorError)
  assert.throws(
    () => normalizeTranslationInput({ text: 'ciao', source: 'ita', target: 'ita' }),
    /direzione di traduzione/i,
  )
  assert.throws(
    () => normalizeTranslationInput({ text: 'ciao', source: 'ita', target: 'srd', variant: 'inventata' }),
    /varietà sarda/i,
  )
})

test('applica il limite massimo alla traduzione', () => {
  assert.throws(
    () => normalizeTranslationInput({
      text: 'a'.repeat(MAX_TRANSLATION_CHARACTERS + 1),
      source: 'ita',
      target: 'srd',
    }),
    (error) => error instanceof TranslatorError && error.statusCode === 413,
  )
})

test('normalizza la richiesta vocale e ne limita la lunghezza', () => {
  assert.deepEqual(
    normalizeSpeechInput({ text: '  Bonas dies  ', language: 'srd', variant: 'logudorese' }),
    { text: 'Bonas dies', language: 'srd', variant: 'logudorese' },
  )
  assert.throws(
    () => normalizeSpeechInput({ text: 'a'.repeat(MAX_SPEECH_CHARACTERS + 1) }),
    (error) => error instanceof SpeechError && error.statusCode === 413,
  )
})
