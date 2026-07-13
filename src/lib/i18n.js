/**
 * Freeway Life - i18n Utility
 * 
 * Sistema di localizzazione leggero senza dipendenze esterne.
 * Supporta traduzioni semplici con interpolazione variabili.
 * 
 * Esempio:
 *   t('dashboard.welcome') // "Benvenuto su Freeway"
 *   t('common.xp_earned', { amount: 25 }) // "25 XP guadagnati"
 */

const translations = {
  it: {
    common: {
      loading: 'Caricamento...',
      saving: 'Salvataggio...',
      error: 'Errore',
      retry: 'Riprova',
      close: 'Chiudi',
      save: 'Salva',
      cancel: 'Annulla',
      delete: 'Elimina',
      confirm: 'Conferma',
      search: 'Cerca...',
      xp_earned: '{amount} XP guadagnati',
      level_up: 'Livello {level} raggiunto!',
      no_data: 'Nessun dato disponibile',
      offline: 'Modalità offline - i cambiamenti verranno salvati quando sarai online',
    },
    nav: {
      hub: 'Home',
      chat: 'FreeW.A.I.',
      calendar: 'Calendario',
      planner: 'Planner',
      timer: 'Timer',
      dump: 'Note',
      school: 'Scuola',
      work: 'Lavoro',
      alarms: 'Sveglie',
      themes: 'Temi',
      account: 'Account',
    },
    dashboard: {
      title: 'Home',
      subtitle: 'Il punto di partenza: chiedi, pianifica, lavora, scarica la testa.',
      next_move: 'Prossima mossa',
      today_tasks: 'Task di oggi',
      recent_sessions: 'Sessioni recenti',
      no_tasks: 'Nessun task per oggi. Il Planner è pronto quando vuoi.',
      no_sessions: 'Nessuna sessione registrata. Una da 15 minuti basta per partire.',
    },
    calendar: {
      title: 'Calendario',
      today: 'Oggi',
      month: 'Mese',
      week: 'Settimana',
      day: 'Giorno',
      year: 'Anno',
      add_task: 'Aggiungi task',
      paste_task: 'Incolla task',
      no_tasks: 'Nessuna task in questo giorno.',
    },
    planner: {
      title: 'Planner',
      subtitle: 'Organizza le tue missioni',
      new_task: 'Nuovo task...',
      today: 'Oggi',
      inbox: 'Inbox',
      scheduled: 'Pianificati',
      done: 'Fatti',
      complete_confirm: 'Completo davvero?',
      chaos_warning: 'Stai caricando troppo. Scegli cosa conta davvero oggi.',
    },
    tomato: {
      title: 'Focus Drive',
      status_ready: 'Pronta',
      status_running: 'Hyper Focus',
      status_completed: 'Completata',
      reset: 'Reset',
      pause: 'Pausa',
      start: 'Avvia',
      focus_lock: 'Focus Lock',
      soundscape: 'Ambiente Focus',
      brain_dump: 'Note',
    },
    account: {
      title: 'Account',
      profile: 'Profilo',
      save: 'Salva',
      logout: 'Esci',
      upload_photo: 'Carica foto profilo',
      username: 'Username',
      reset_onboarding: 'Rifai onboarding e privacy',
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      saving: 'Saving...',
      error: 'Error',
      retry: 'Retry',
      close: 'Close',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      confirm: 'Confirm',
      search: 'Search...',
      xp_earned: '{amount} XP earned',
      level_up: 'Level {level} reached!',
      no_data: 'No data available',
      offline: 'Offline mode - changes will be saved when you are back online',
    },
    nav: {
      hub: 'Home',
      chat: 'FreeW.A.I.',
      calendar: 'Calendario',
      planner: 'Planner',
      timer: 'Timer',
      dump: 'Note',
      school: 'School',
      work: 'Work',
      alarms: 'Alarms',
      themes: 'Themes',
      account: 'Account',
    },
    dashboard: {
      title: 'Home',
      subtitle: 'The starting point: ask, plan, work, clear your mind.',
      next_move: 'Next move',
      today_tasks: "Today's tasks",
      recent_sessions: 'Recent sessions',
      no_tasks: 'No tasks for today. Il Planner è pronto quando vuoi.',
      no_sessions: 'No sessions recorded. A 15-minute one is enough to start.',
    },
    calendar: {
      title: 'Calendario',
      today: 'Today',
      month: 'Month',
      week: 'Week',
      day: 'Day',
      year: 'Year',
      add_task: 'Add task',
      paste_task: 'Paste task',
      no_tasks: 'No tasks on this day.',
    },
  },
};

export const DEFAULT_LANG = 'it';
export const LANGUAGE_STORAGE_KEY = 'fw_language';

let currentLang = DEFAULT_LANG;

try {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;
  if (stored && translations[stored]) currentLang = stored;
} catch {
  // Browser storage unavailable
}

export function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // persistenza opzionale
  }
  // Dispatch event per aggiornamento reattivo
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fw:language-changed', { detail: { lang } }));
  }
}

export function getLanguage() {
  return currentLang;
}

export function getAvailableLanguages() {
  return Object.keys(translations);
}

/**
 * Traduce una chiave dot-notation con interpolazione
 * @param {string} key - Chiave tipo "common.loading"
 * @param {object} vars - Variabili di interpolazione es. { amount: 25 }
 * @returns {string}
 */
export function t(key, vars = {}) {
  const parts = key.split('.');
  let value = translations[currentLang];

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return key; // fallback: restituisce la chiave
    }
  }

  if (typeof value !== 'string') return key;

  // Interpolazione variabili
  return value.replace(/\{(\w+)\}/g, (_, varName) => {
    return varName in vars ? String(vars[varName]) : `{${varName}}`;
  });
}

/**
 * Hook per reattività al cambio lingua
 */
export function useLanguage() {
  const [lang, setLang] = React.useState(currentLang);

  React.useEffect(() => {
    const handler = (event) => setLang(event.detail?.lang || currentLang);
    window.addEventListener('fw:language-changed', handler);
    return () => window.removeEventListener('fw:language-changed', handler);
  }, []);

  return {
    language: lang,
    setLanguage,
    t: (key, vars) => t(key, vars),
  };
}
