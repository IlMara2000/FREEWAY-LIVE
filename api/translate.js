import { translateText, TranslatorError } from './_translator.js'

const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 40
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

const setHeaders = (response) => {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('X-Content-Type-Options', 'nosniff')
}

export default async function handler(request, response) {
  setHeaders(response)

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Metodo non supportato.' })
  }

  if (isRateLimited(getClientId(request))) {
    return response.status(429).json({ error: 'Troppe traduzioni ravvicinate. Riprova tra un minuto.' })
  }

  try {
    const result = await translateText(request.body || {})
    return response.status(200).json(result)
  } catch (error) {
    const statusCode = error instanceof TranslatorError ? error.statusCode : 500
    return response.status(statusCode).json({
      error: error instanceof TranslatorError
        ? error.message
        : 'Si è verificato un errore durante la traduzione.',
      code: error instanceof TranslatorError ? error.code : 'INTERNAL_ERROR',
    })
  }
}
