import { createSpeech, SpeechError } from './_speech.js'

const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 12
const requestsByClient = new Map()

const getClientId = (request) => {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return request.socket?.remoteAddress || 'anonymous'
}

const isRateLimited = (clientId) => {
  const now = Date.now()
  const recent = (requestsByClient.get(clientId) || []).filter((time) => now - time < RATE_WINDOW_MS)
  recent.push(now)
  requestsByClient.set(clientId, recent)
  return recent.length > RATE_LIMIT
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('X-Content-Type-Options', 'nosniff')

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Metodo non supportato.' })
  }

  if (isRateLimited(getClientId(request))) {
    return response.status(429).json({ error: 'Troppe richieste vocali ravvicinate. Riprova tra un minuto.' })
  }

  try {
    const result = await createSpeech(request.body || {})
    return response.status(200).json(result)
  } catch (error) {
    const statusCode = error instanceof SpeechError ? error.statusCode : 500
    return response.status(statusCode).json({
      error: error instanceof SpeechError
        ? error.message
        : 'Si è verificato un errore durante la generazione della voce.',
      code: error instanceof SpeechError ? error.code : 'INTERNAL_ERROR',
    })
  }
}
