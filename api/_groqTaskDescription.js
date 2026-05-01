const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_FIELD_LENGTH = 1600;

const cleanText = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FIELD_LENGTH);

const parseJsonSuggestion = (content) => {
  try {
    const parsed = JSON.parse(content);
    return cleanText(parsed.description || parsed.suggestion || '');
  } catch {
    return cleanText(content);
  }
};

export async function createTaskDescriptionSuggestion({
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
  const priority = cleanText(input?.priority);
  const status = cleanText(input?.status);
  const source = cleanText(input?.source || 'task');

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
            content: [
              'Sei un assistente operativo per task personali.',
              'Rispondi solo con JSON valido: {"description":"..."}',
              'La description deve essere in italiano, concreta, breve e utile per capire come completare o sviluppare la task.',
              'Non inventare scadenze, persone, budget o vincoli non presenti.',
            ].join(' '),
          },
          {
            role: 'user',
            content: [
              `Origine: ${source}`,
              `Titolo: ${title || '(vuoto)'}`,
              `Descrizione attuale: ${description || '(vuota)'}`,
              `Priorita: ${priority || '(non indicata)'}`,
              `Stato: ${status || '(non indicato)'}`,
              '',
              'Crea una descrizione migliorata di massimo 120 parole.',
              'Includi obiettivo, primo passo pratico e criteri di completamento quando sono deducibili.',
            ].join('\n'),
          },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 360,
        temperature: 0.35,
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

  const content = payload?.choices?.[0]?.message?.content;
  const suggestion = parseJsonSuggestion(content);

  if (!suggestion) {
    const error = new Error('Groq non ha generato una descrizione utilizzabile.');
    error.statusCode = 502;
    throw error;
  }

  return {
    suggestion,
    model: payload?.model || model,
  };
}
