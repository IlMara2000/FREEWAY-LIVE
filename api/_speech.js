import { createGateway } from '@ai-sdk/gateway'
import { generateSpeech } from 'ai'

export const MAX_SPEECH_CHARACTERS = 1000

const VARIANT_INSTRUCTIONS = {
  lsc: 'Leggi con ritmo naturale e articolazione chiara. La lingua del testo è sarda.',
  campidanese: 'Leggi con ritmo naturale e una cadenza campidanese prudente, senza caricature.',
  logudorese: 'Leggi con ritmo naturale e una cadenza logudorese prudente, senza caricature.',
}

export class SpeechError extends Error {
  constructor(message, statusCode = 500, code = 'SPEECH_ERROR') {
    super(message)
    this.name = 'SpeechError'
    this.statusCode = statusCode
    this.code = code
  }
}

export const normalizeSpeechInput = (input = {}) => {
  const text = typeof input.text === 'string' ? input.text.trim() : ''
  const language = input.language === 'ita' ? 'ita' : 'srd'
  const variant = ['lsc', 'campidanese', 'logudorese'].includes(input.variant) ? input.variant : 'lsc'

  if (!text) throw new SpeechError('Non c’è ancora una traduzione da ascoltare.', 400, 'EMPTY_TEXT')
  if (text.length > MAX_SPEECH_CHARACTERS) {
    throw new SpeechError(
      `L’ascolto AI è disponibile fino a ${MAX_SPEECH_CHARACTERS} caratteri.`,
      413,
      'TEXT_TOO_LONG',
    )
  }

  return { text, language, variant }
}

export const createSpeech = async (rawInput, env = process.env) => {
  const input = normalizeSpeechInput(rawInput)
  const token = env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN
  if (!token) {
    throw new SpeechError('La voce AI non è configurata.', 503, 'SPEECH_NOT_CONFIGURED')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 22000)

  try {
    const gateway = createGateway({ apiKey: token })
    const result = await generateSpeech({
      model: gateway.speechModel(env.SPEECH_AI_MODEL || 'openai/tts-1'),
      text: input.text,
      voice: env.SPEECH_AI_VOICE || 'nova',
      outputFormat: 'mp3',
      speed: input.language === 'srd' ? 0.9 : 1,
      language: 'it',
      instructions: input.language === 'srd'
        ? VARIANT_INSTRUCTIONS[input.variant]
        : 'Leggi in italiano con tono naturale e chiaro.',
      maxRetries: 1,
      abortSignal: controller.signal,
    })
    return {
      audio: result.audio.base64,
      mediaType: result.audio.mediaType || 'audio/mpeg',
      warnings: result.warnings || [],
    }
  } catch (error) {
    if (error instanceof SpeechError) throw error
    if (error.name === 'AbortError') {
      throw new SpeechError('La generazione della voce sta impiegando troppo tempo.', 504, 'SPEECH_TIMEOUT')
    }
    throw new SpeechError('Il servizio vocale non è raggiungibile.', 502, 'SPEECH_UNAVAILABLE')
  } finally {
    clearTimeout(timeout)
  }
}
