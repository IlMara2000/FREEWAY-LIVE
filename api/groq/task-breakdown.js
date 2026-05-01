import { createTaskBreakdown } from '../_groqTaskBreakdown.js';

const resolveGroqApiKey = () =>
  process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

const readJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(body || '{}');
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non supportato.' });
  }

  try {
    const input = await readJsonBody(req);
    const result = await createTaskBreakdown({
      input,
      apiKey: resolveGroqApiKey(),
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Errore durante la richiesta a Groq.',
    });
  }
}
