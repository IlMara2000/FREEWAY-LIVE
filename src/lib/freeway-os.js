import { getTodayKey, inferTaskArea } from '@/lib/day-by-day';

export const FREEWAY_OS_HABITS = [
  {
    id: 'no-phone-morning',
    title: 'Mattina senza telefono',
    area: 'mente',
    xp: 8,
    cue: '10 minuti prima di scrollare.',
  },
  {
    id: 'move-body',
    title: 'Muovi il corpo',
    area: 'corpo',
    xp: 10,
    cue: 'Cammina, allena o sciogli tensione.',
  },
  {
    id: 'one-focus-block',
    title: 'Un blocco focus',
    area: 'focus',
    xp: 12,
    cue: 'Una sessione vera sul progetto.',
  },
  {
    id: 'evening-reset',
    title: 'Reset serale',
    area: 'sonno',
    xp: 8,
    cue: 'Chiudi schermi e scarica la testa.',
  },
];

export const FREEWAY_OS_AREAS = [
  { id: 'sonno', label: 'Sonno', target: 'Proteggi energia e orari.' },
  { id: 'corpo', label: 'Corpo', target: 'Movimento minimo ripetibile.' },
  { id: 'focus', label: 'Focus', target: 'Progetto principale, non dieci fronti.' },
  { id: 'mente', label: 'Mente', target: 'Scarico, ordine, meno rumore.' },
  { id: 'relazioni', label: 'Relazioni', target: 'Presenza reale, zero performance.' },
  { id: 'lavoro', label: 'Lavoro', target: 'Ore, turni e consegne sotto controllo.' },
];

export const FREEWAY_OS_ROUTINES = [
  {
    id: 'start-clean',
    title: 'Partenza pulita',
    description: 'Routine mattina corta: attivi il corpo e scegli una cosa.',
    xp: 20,
    steps: [
      { title: 'Acqua + niente telefono', minutes: 3, area: 'mente' },
      { title: 'Scrivi il pensiero dominante', minutes: 4, area: 'mente' },
      { title: 'Scegli il primo task vero', minutes: 3, area: 'focus' },
    ],
  },
  {
    id: 'deep-work',
    title: 'Entrata focus',
    description: 'Routine pre-lavoro per non partire disperso.',
    xp: 24,
    steps: [
      { title: 'Chiudi distrazioni visibili', minutes: 2, area: 'mente' },
      { title: 'Apri solo il progetto principale', minutes: 3, area: 'focus' },
      { title: 'Avvia un timer e fai il primo passo', minutes: 5, area: 'focus' },
    ],
  },
  {
    id: 'chaos-reset',
    title: 'Reset caos',
    description: 'Quando hai troppe schede aperte in testa.',
    xp: 18,
    steps: [
      { title: 'Svuota 5 pensieri in Sfogo', minutes: 5, area: 'mente' },
      { title: 'Riordina un punto visibile', minutes: 4, area: 'mente' },
      { title: 'Scegli una sola prossima azione', minutes: 2, area: 'focus' },
    ],
  },
];

export const FREEWAY_OS_SOUNDS = [
  { value: 'off', label: 'Off', description: 'Silenzio.' },
  { value: 'white', label: 'White', description: 'Rumore chiaro per coprire distrazioni.' },
  { value: 'deep', label: 'Deep', description: 'Tono basso, stabile.' },
  { value: 'rain', label: 'Rain', description: 'Rumore morbido tipo pioggia.' },
];

export const FREEWAY_OS_DEFAULTS = {
  version: 1,
  focusShield: {
    enabled: false,
    phoneAway: false,
    rewardAfterFocus: true,
  },
  soundscape: 'off',
  tomatoTimer: null,
  habits: {},
  routineRuns: {},
  updatedAt: null,
};

export const normalizeFreewayOS = (value = {}) => ({
  ...FREEWAY_OS_DEFAULTS,
  ...(value || {}),
  focusShield: {
    ...FREEWAY_OS_DEFAULTS.focusShield,
    ...(value?.focusShield || {}),
  },
  tomatoTimer: value?.tomatoTimer && typeof value.tomatoTimer === 'object'
    ? value.tomatoTimer
    : null,
  habits: value?.habits && typeof value.habits === 'object' ? value.habits : {},
  routineRuns: value?.routineRuns && typeof value.routineRuns === 'object' ? value.routineRuns : {},
});

export const isHabitDoneToday = (freewayOS, habitId, todayKey = getTodayKey()) =>
  Boolean(normalizeFreewayOS(freewayOS).habits?.[habitId]?.history?.[todayKey]);

const getPreviousDateKey = (dateKey) => {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return getTodayKey(date);
};

export const getHabitStreak = (habitState = {}, todayKey = getTodayKey()) => {
  let cursor = todayKey;
  let streak = 0;
  const history = habitState.history || {};

  while (history[cursor]) {
    streak += 1;
    cursor = getPreviousDateKey(cursor);
  }

  return streak;
};

export const toggleHabitForToday = (freewayOS, habitId, todayKey = getTodayKey()) => {
  const normalized = normalizeFreewayOS(freewayOS);
  const currentHabit = normalized.habits[habitId] || { history: {} };
  const history = { ...(currentHabit.history || {}) };
  const wasDone = Boolean(history[todayKey]);

  if (wasDone) {
    delete history[todayKey];
  } else {
    history[todayKey] = new Date().toISOString();
  }

  return {
    completed: !wasDone,
    next: {
      ...normalized,
      habits: {
        ...normalized.habits,
        [habitId]: {
          ...currentHabit,
          history,
          updatedAt: new Date().toISOString(),
        },
      },
      updatedAt: new Date().toISOString(),
    },
  };
};

export const addRoutineRun = (freewayOS, routineId, todayKey = getTodayKey()) => {
  const normalized = normalizeFreewayOS(freewayOS);
  const currentRuns = Array.isArray(normalized.routineRuns[todayKey])
    ? normalized.routineRuns[todayKey]
    : [];

  return {
    ...normalized,
    routineRuns: {
      ...normalized.routineRuns,
      [todayKey]: [...new Set([...currentRuns, routineId])],
    },
    updatedAt: new Date().toISOString(),
  };
};

export const patchFocusShield = (freewayOS, patch = {}) => {
  const normalized = normalizeFreewayOS(freewayOS);

  return {
    ...normalized,
    focusShield: {
      ...normalized.focusShield,
      ...patch,
    },
    updatedAt: new Date().toISOString(),
  };
};

export const patchSoundscape = (freewayOS, soundscape) => ({
  ...normalizeFreewayOS(freewayOS),
  soundscape,
  updatedAt: new Date().toISOString(),
});

export const patchTomatoTimer = (freewayOS, tomatoTimer) => ({
  ...normalizeFreewayOS(freewayOS),
  tomatoTimer: tomatoTimer && typeof tomatoTimer === 'object'
    ? tomatoTimer
    : null,
  updatedAt: new Date().toISOString(),
});

export const getAreaSignals = ({ freewayOS, tasks = [], todayKey = getTodayKey() } = {}) => {
  const normalized = normalizeFreewayOS(freewayOS);
  const activeTasks = tasks.filter((task) => task.status !== 'done');

  return FREEWAY_OS_AREAS.map((area) => {
    const relatedTasks = activeTasks.filter((task) => inferTaskArea(task) === area.id);
    const habits = FREEWAY_OS_HABITS.filter((habit) => habit.area === area.id);
    const doneHabits = habits.filter((habit) => isHabitDoneToday(normalized, habit.id, todayKey)).length;
    const pressure = Math.min(relatedTasks.length * 13, 42);
    const habitLift = Math.min(doneHabits * 12, 24);
    const score = Math.max(8, Math.min(100, 72 - pressure + habitLift));
    const state = score < 38 ? 'urgente' : score < 62 ? 'attenzione' : 'stabile';

    return {
      ...area,
      score,
      state,
      openCount: relatedTasks.length,
      doneHabits,
    };
  });
};

export const getTodayTimelineTasks = (tasks = [], todayKey = getTodayKey()) =>
  tasks
    .filter((task) => (
      task.status !== 'done' &&
      (task.due_date === todayKey || (!task.due_date && task.status === 'today'))
    ))
    .sort((left, right) => (left.start_time || '99:99').localeCompare(right.start_time || '99:99'));

export const getFreewayOSSummary = ({ freewayOS, tasks = [], todayKey = getTodayKey() } = {}) => {
  const normalized = normalizeFreewayOS(freewayOS);
  const doneHabits = FREEWAY_OS_HABITS.filter((habit) => isHabitDoneToday(normalized, habit.id, todayKey));
  const areas = getAreaSignals({ freewayOS: normalized, tasks, todayKey });
  const weakestArea = [...areas].sort((left, right) => left.score - right.score)[0];
  const timeline = getTodayTimelineTasks(tasks, todayKey);

  return {
    habitProgress: Math.round((doneHabits.length / FREEWAY_OS_HABITS.length) * 100),
    doneHabits: doneHabits.length,
    weakestArea,
    timeline,
    nextMove: timeline[0]?.title || `Sistema ${weakestArea?.label || 'mente'} con un passo piccolo`,
  };
};
