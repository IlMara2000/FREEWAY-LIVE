import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import { createSpeech, SpeechError } from './api/_speech.js'
import { translateText, TranslatorError } from './api/_translator.js'

const BODY_LIMIT_BYTES = 48 * 1024

const readRequestBody = (request) => new Promise((resolve, reject) => {
  const chunks = []
  let total = 0

  request.on('data', (chunk) => {
    total += chunk.length
    if (total > BODY_LIMIT_BYTES) {
      reject(Object.assign(new Error('Richiesta troppo grande.'), { statusCode: 413 }))
      request.destroy()
      return
    }
    chunks.push(chunk)
  })
  request.on('end', () => {
    try {
      resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
    } catch {
      reject(Object.assign(new Error('Richiesta non valida.'), { statusCode: 400 }))
    }
  })
  request.on('error', reject)
})

const sendJson = (response, statusCode, payload) => {
  response.statusCode = statusCode
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.end(JSON.stringify(payload))
}

const methodGuard = (request, response) => {
  if (request.method === 'POST') return false
  response.setHeader('Allow', 'POST')
  sendJson(response, 405, { error: 'Metodo non supportato.' })
  return true
}

const translatorDevApi = (env) => ({
  name: 'tradulimba-local-api',
  configureServer(server) {
    server.middlewares.use('/api/translate', async (request, response) => {
      if (methodGuard(request, response)) return

      try {
        const input = await readRequestBody(request)
        sendJson(response, 200, await translateText(input, env))
      } catch (error) {
        sendJson(response, error instanceof TranslatorError ? error.statusCode : error.statusCode || 500, {
          error: error.message || 'Errore durante la traduzione.',
          code: error.code || 'INTERNAL_ERROR',
        })
      }
    })

    server.middlewares.use('/api/speech', async (request, response) => {
      if (methodGuard(request, response)) return

      try {
        const input = await readRequestBody(request)
        sendJson(response, 200, await createSpeech(input, env))
      } catch (error) {
        sendJson(response, error instanceof SpeechError ? error.statusCode : error.statusCode || 500, {
          error: error.message || 'Errore durante la generazione della voce.',
          code: error.code || 'INTERNAL_ERROR',
        })
      }
    })
  },
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    logLevel: 'info',
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    plugins: [react(), translatorDevApi(env)],
  }
})
