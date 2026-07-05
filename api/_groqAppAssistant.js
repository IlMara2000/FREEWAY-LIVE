const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_TEXT_LENGTH = 1800;
const MAX_HISTORY_ITEMS = 10;

const APP_KNOWLEDGE = [
  'Freeway Life e una PWA per focus, routine, calendario, task, tomato timer, brain dump, lavoro, temi, profilo e Day by Day.',
  'Day by Day crea routine giornaliere leggere in base a energia, ostacoli, progetto principale, stato mentale e preferenze.',
  'Piano gestisce task oggi, inbox, pianificati e fatti. Le task hanno descrizione, priorita, orari, tipo task/lavoro e AI per migliorarle.',
  'Calendario crea task per giorno e puo collegare task lavoro con orari.',
  'La Home e una chat operativa: quando l utente chiede task, eventi, memo o sveglie, puoi proporre azioni strutturate applicabili dall app.',
  'Tomato aiuta a lavorare in blocchi focus e registra XP/sessioni.',
  'Sfogo serve a scaricare pensieri: ogni pensiero diventa un MEMO che resta sotto il calendario e puo essere inviato alla chat.',
  'Sveglie gestisce allarmi locali, legati o meno a promemoria e task.',
  'Dashboard/Home e stata sostituita dalla chat operativa.',
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
  today: cleanText(context.today, 40),
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
    const error = new Error('Assistente non configurato.');
    error.statusCode = 503;
    throw error;
  }

  const userMessage = cleanText(input?.message);
  const history = normalizeMessages(input?.history);
  const context = normalizeContext(input?.context);
  const wantsActions = Boolean(input?.allowActions);

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
              'Sei anche un LLM generale leggero: puoi rispondere a piccoli quesiti, spiegare concetti, ragionare con l utente, sintetizzare, proporre opzioni e fare domande di chiarimento.',
              'Aiuti l utente a usare l app: Day by Day, Piano, Calendario, Tomato, Sfogo, Lavoro, Scuola/Universita, Temi, Account.',
              'Prima interpreta l intento. Se e una domanda generale, rispondi direttamente senza creare azioni. Se e ambiguo, fai 1-3 domande pratiche per capire la necessita.',
              'Quando l utente chiede chiaramente di creare, programmare, ricordare, pianificare, fissare eventi, task, memo o sveglie, proponi azioni strutturate.',
              'Non creare piu di 5 azioni per risposta. Se la richiesta e confusa, non inventare: chiedi conferma o fai una domanda mirata.',
              'Puoi spiegare passaggi concreti, suggerire cosa fare nella pagina corrente e aiutare a ridurre caos/overthinking.',
              'L app applichera le azioni solo dopo click dell utente, quindi non dire che hai gia creato qualcosa: di che hai preparato una proposta.',
              'Non fornire diagnosi, terapia o consigli medici. Se l utente parla di rischio o crisi seria, invitalo a contattare aiuto umano/professionale.',
              'Risposte brevi: massimo 180 parole salvo richiesta esplicita.',
              wantsActions
                ? 'IMPORTANTE: rispondi SOLO con JSON valido, senza markdown, nel formato {"reply":"testo breve","actions":[...]}'
                : 'Rispondi come testo normale.',
              wantsActions
                ? 'Azioni supportate: create_task, create_event, create_memo, create_alarm. Campi: type,title,description,date YYYY-MM-DD,time HH:MM,end_time HH:MM,priority low|medium|high|critical,task_type,reminder_text.'
                : '',
              wantsActions
                ? 'Se non servono azioni, usa actions:[]. Se devi chiarire, metti la domanda in reply e actions:[].'
                : '',
              'Per date relative come oggi/domani usa sempre la data corrente fornita nel contesto sintetico. Non inventare date passate.',
              'Conosci queste funzioni dell app:',
              APP_KNOWLEDGE,
            ].join('\n'),
          },
          {
            role: 'system',
            content: [
              'Contesto sintetico utente/app:',
              `Pagina corrente: ${context.page || 'non nota'}`,
              `Data corrente: ${context.today || new Date().toISOString().split('T')[0]}`,
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
        max_completion_tokens: 900,
        temperature: 0.55,
      }),
    });
  } catch {
    const error = new Error('Connessione all assistente non riuscita. Riprova tra poco.');
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Assistente non ha risposto correttamente (${response.status}).`);
    error.statusCode = response.status;
    throw error;
  }

  const rawReply = cleanText(payload?.choices?.[0]?.message?.content, 3200);
  let reply = rawReply;
  let actions = [];

  if (wantsActions) {
    try {
      const parsed = JSON.parse(rawReply);
      reply = cleanText(parsed?.reply, 1800);
      actions = Array.isArray(parsed?.actions) ? parsed.actions.slice(0, 8) : [];
    } catch {
      actions = [];
    }
  }

  if (!reply) {
    const error = new Error('Assistente non ha generato una risposta utilizzabile.');
    error.statusCode = 502;
    throw error;
  }

  return {
    reply,
    actions,
    model: payload?.model || model,
  };
}
