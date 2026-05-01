const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_FIELD_LENGTH = 1600;

const cleanText = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FIELD_LENGTH);

export async function createTaskBreakdown({
  input,
  apiKey,
  fetchImpl = fetch,
  model = process.env.GROQ_TASK_MODEL || DEFAULT_MODEL,
}) {
  if (!apiKey) {
    const error = new Error('Configura GROQ_API_KEY per usare Groq.');
    error.statusCode = 503;
    throw error;
  }

  const title = cleanText(input?.title);
  const description = cleanText(input?.description);

  if (!title && !description) {
    const error = new Error('Serve almeno un titolo o una descrizione da analizzare.');
    error.statusCode = 400;
    throw error;
  }

  let response;
  try {
    response = await fetchImpl(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Sei un assistente per persone con ADHD. Spacchetta task in micro-passi chiari, numerati, brevi, senza fronzoli. Rispondi solo in italiano.',
          },
          {
            role: 'user',
            content: `Task: "${title || '(vuota)'}"\nDescrizione: "${description || 'nessuna'}"\n\nSpacchetta in micro-passi. Ogni passo massimo 10 parole.`,
          },
        ],
        max_completion_tokens: 400,
        temperature: 0.45,
      }),
    });
  } catch {
    const error = new Error('Connessione a Groq non riuscita. Riprova tra poco.');
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Groq non ha risposto correttamente (${response.status}).`);
    error.statusCode = response.status;
    throw error;
  }

  const breakdown = cleanText(payload?.choices?.[0]?.message?.content);

  if (!breakdown) {
    const error = new Error('Groq non ha generato un piano utilizzabile.');
    error.statusCode = 502;
    throw error;
  }

  return {
    breakdown,
    model: payload?.model || model,
  };
}
