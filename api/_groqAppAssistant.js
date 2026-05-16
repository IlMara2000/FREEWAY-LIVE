const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_TEXT_LENGTH = 1800;
const MAX_HISTORY_ITEMS = 10;

const APP_KNOWLEDGE = [
  'Freeway Life e una PWA per focus, routine, calendario, task, tomato timer, brain dump, lavoro, temi, profilo e Day by Day.',
  'Day by Day crea routine giornaliere leggere in base a energia, ostacoli, progetto principale, stato mentale e preferenze.',
  'Planner gestisce task oggi, inbox, pianificati e fatti. Le task hanno descrizione, priorita, orari, tipo task/lavoro e AI per migliorarle.',
  'Calendario crea task per giorno e puo collegare task lavoro con orari.',
  'Tomato aiuta a lavorare in blocchi focus e registra XP/sessioni.',
  'Brain Dump serve a scaricare pensieri e promuoverli a task quando serve.',
  'Dashboard mostra stato, XP, prossima mossa, routine Day by Day e statistiche base.',
  'Sistema anti-caos: massimo 3 task importanti al giorno e messaggi quando l utente carica troppo.',
  'Account contiene profilo, foto, reset onboarding/privacy e logout.',
].join('\n');

const cleanText = (value, maxLength = MAX_TEXT_LENGTH) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const normalizeMessages = (messages = []) =>
  (Array.isArray(messages) ? messages : [])
    .slice(-MAX_HISTORY_ITEMS)
    .map((message) => ({
      role: message?.role === 'assistant' ? 'assistant' : 'user',
      content: cleanText(message?.content, 1200),
    }))
    .filter((message) => message.content);

const normalizeContext = (context = {}) => ({
  page: cleanText(context.page, 120),
  dayByDayConfigured: Boolean(context.dayByDayConfigured),
  currentEnergy: cleanText(context.currentEnergy, 80),
  project: cleanText(context.project, 240),
  obstacles: Array.isArray(context.obstacles)
    ? context.obstacles.map((item) => cleanText(item, 60)).filter(Boolean).slice(0, 8)
    : [],
  mentalState: cleanText(context.mentalState, 120),
  routinePreference: cleanText(context.routinePreference, 120),
  onboardingDone: Boolean(context.onboardingDone),
});

export async function createAppAssistantReply({
  input,
  apiKey,
  fetchImpl = fetch,
  model = process.env.GROQ_APP_ASSISTANT_MODEL || process.env.GROQ_TASK_MODEL || DEFAULT_MODEL,
}) {
  if (!apiKey) {
    const error = new Error('Configura GROQ_API_KEY per usare l assistente Groq.');
    error.statusCode = 503;
    throw error;
  }

  const userMessage = cleanText(input?.message);
  const history = normalizeMessages(input?.history);
  const context = normalizeContext(input?.context);

  if (!userMessage) {
    const error = new Error('Scrivi una domanda per l assistente.');
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
              'Sei l assistente interno di Freeway Life.',
              'Rispondi in italiano, tono umano, pratico, diretto, zero guru, zero corporate.',
              'Aiuti l utente a usare l app: Day by Day, Planner, Calendario, Tomato, Brain Dump, Lavoro, Temi, Account.',
              'Puoi spiegare passaggi concreti, suggerire cosa fare nella pagina corrente e aiutare a ridurre caos/overthinking.',
              'Non promettere azioni che non puoi fare direttamente. Se serve cliccare o aprire una sezione, diglielo in passi brevi.',
              'Non fornire diagnosi, terapia o consigli medici. Se l utente parla di rischio o crisi seria, invitalo a contattare aiuto umano/professionale.',
              'Risposte brevi: massimo 140 parole salvo richiesta esplicita.',
              'Conosci queste funzioni dell app:',
              APP_KNOWLEDGE,
            ].join('\n'),
          },
          {
            role: 'system',
            content: [
              'Contesto sintetico utente/app:',
              `Pagina corrente: ${context.page || 'non nota'}`,
              `Onboarding completato: ${context.onboardingDone ? 'si' : 'no'}`,
              `Day by Day configurato: ${context.dayByDayConfigured ? 'si' : 'no'}`,
              `Energia attuale: ${context.currentEnergy || 'non indicata'}`,
              `Progetto principale: ${context.project || 'non indicato'}`,
              `Ostacoli: ${context.obstacles.join(', ') || 'non indicati'}`,
              `Stato mentale: ${context.mentalState || 'non indicato'}`,
              `Routine preferita: ${context.routinePreference || 'non indicata'}`,
            ].join('\n'),
          },
          ...history,
          {
            role: 'user',
            content: userMessage,
          },
        ],
        max_completion_tokens: 520,
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

  const reply = cleanText(payload?.choices?.[0]?.message?.content, 2200);

  if (!reply) {
    const error = new Error('Groq non ha generato una risposta utilizzabile.');
    error.statusCode = 502;
    throw error;
  }

  return {
    reply,
    model: payload?.model || model,
  };
}
