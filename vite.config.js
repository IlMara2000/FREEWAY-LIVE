import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import { createTaskBreakdown } from './api/_groqTaskBreakdown.js'
import { createTaskDescriptionSuggestion } from './api/_groqTaskDescription.js'

const readRequestBody = (req) => new Promise((resolve, reject) => {
  const chunks = []

  req.on('data', (chunk) => chunks.push(chunk))
  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks).toString('utf8')
      resolve(JSON.parse(body || '{}'))
    } catch (error) {
      reject(error)
    }
  })
  req.on('error', reject)
})

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

const resolveGroqApiKey = (env = process.env) =>
  env.GROQ_API_KEY || env.NEXT_PUBLIC_GROQ_API_KEY || env.VITE_GROQ_API_KEY

const groqDevApiPlugin = (groqApiKey) => ({
  name: 'freeway-groq-dev-api',
  configureServer(server) {
    server.middlewares.use('/api/groq/task-description', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Metodo non supportato.' })
        return
      }

      try {
        const input = await readRequestBody(req)
        const result = await createTaskDescriptionSuggestion({
          input,
          apiKey: groqApiKey,
        })
        sendJson(res, 200, result)
      } catch (error) {
        sendJson(res, error.statusCode || 500, {
          error: error.message || 'Errore durante la richiesta a Groq.',
        })
      }
    })
    server.middlewares.use('/api/groq/task-breakdown', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Metodo non supportato.' })
        return
      }

      try {
        const input = await readRequestBody(req)
        const result = await createTaskBreakdown({
          input,
          apiKey: groqApiKey,
        })
        sendJson(res, 200, result)
      } catch (error) {
        sendJson(res, error.statusCode || 500, {
          error: error.message || 'Errore durante la richiesta a Groq.',
        })
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const groqApiKey = resolveGroqApiKey(env)

  return {
    logLevel: 'error', // Suppress warnings, only show errors
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    plugins: [
      react(),
      groqDevApiPlugin(groqApiKey),
    ],
  }
});
