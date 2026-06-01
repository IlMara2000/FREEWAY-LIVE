export const DAY_BY_DAY_SECTIONS = [
  'Mattina',
  'Corpo',
  'Focus principale',
  'Lavoro/progetto',
  'Pausa mentale',
  'Relazioni/socialita',
  'Sera',
  'Reset mentale',
];

export const ENERGY_MODES = [
  {
    value: 'low',
    label: 'Bassa',
    shortLabel: 'Bassa',
    description: 'Minimo stabile. Poche cose, fatte bene.',
  },
  {
    value: 'medium',
    label: 'Media',
    shortLabel: 'Media',
    description: 'Giornata normale, senza caricarti troppo.',
  },
  {
    value: 'high',
    label: 'Alta',
    shortLabel: 'Alta',
    description: 'Spingi, ma resta dentro una giornata reale.',
  },
  {
    value: 'chaos',
    label: 'Caos mentale',
    shortLabel: 'Caos',
    description: 'Prima abbassi il rumore, poi lavori.',
  },
];

export const DAY_BY_DAY_DEFAULTS = {
  configured: false,
  sleepTime: '00:30',
  wakeTime: '08:30',
  phoneHours: '3-5',
  baselineEnergy: 'picchi',
  training: 'caso',
  focusSpan: '30',
  project: '',
  obstacles: ['overthinking', 'social'],
  mentalState: 'confuso',
  twoYearGoal: '',
  avoidFuture: '',
  routinePreference: 'via-di-mezzo',
  transformation: 'sostenibile',
  currentEnergy: 'medium',
  history: {},
  updatedAt: null,
};

export const DAY_BY_DAY_OPTIONS = {
  phoneHours: [
    ['0-2', '0-2 ore'],
    ['3-5', '3-5 ore'],
    ['6+', '6+ ore'],
  ],
  baselineEnergy: [
    ['bassa', 'Bassa'],
    ['media', 'Media'],
    ['alta', 'Alta'],
    ['picchi', 'A picchi'],
  ],
  training: [
    ['si', 'Si'],
    ['no', 'No'],
    ['caso', 'A caso'],
  ],
  focusSpan: [
    ['10', '10 min'],
    ['30', '30 min'],
    ['60', '1h+'],
  ],
  mentalState: [
    ['stressato', 'Stressato'],
    ['stanco', 'Stanco'],
    ['motivato', 'Motivato'],
    ['confuso', 'Confuso'],
    ['frustrato', 'Frustrato'],
  ],
  routinePreference: [
    ['rigida', 'Rigida'],
    ['libera', 'Libera'],
    ['via-di-mezzo', 'Via di mezzo'],
  ],
  transformation: [
    ['sostenibile', 'Sostenibile'],
    ['intensa', 'Intensa'],
    ['estrema', 'Estrema'],
  ],
  obstacles: [
    ['overthinking', 'Overthinking'],
    ['procrastinazione', 'Procrastinazione'],
    ['videogiochi', 'Videogiochi'],
    ['social', 'Social'],
    ['stanchezza', 'Stanchezza'],
    ['persone', 'Persone'],
    ['caos', 'Caos'],
  ],
};

export const getTodayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeDayByDayProfile = (value = {}) => ({
  ...DAY_BY_DAY_DEFAULTS,
  ...(value || {}),
  obstacles: Array.isArray(value?.obstacles) && value.obstacles.length
    ? value.obstacles
    : DAY_BY_DAY_DEFAULTS.obstacles,
  history: value?.history && typeof value.history === 'object' ? value.history : {},
});

const hasObstacle = (profile, obstacle) => profile.obstacles?.includes(obstacle);

const getFocusMinutes = (focusSpan, energy) => {
  if (energy === 'low' || energy === 'chaos') return focusSpan === '10' ? 10 : 25;
  if (energy === 'high') return focusSpan === '60' ? 75 : focusSpan === '30' ? 50 : 25;
  return focusSpan === '60' ? 60 : focusSpan === '30' ? 35 : 15;
};

const createTask = ({
  section,
  title,
  description,
  area,
  priority = 'medium',
  weight = 'light',
}) => ({
  section,
  title,
  description,
  area,
  priority,
  weight,
});

const capRoutine = (tasks, energy) => {
  const maxTotal = {
    low: 5,
    medium: 8,
    high: 10,
    chaos: 6,
  }[energy] || 8;

  const bySection = new Map();
  const important = [];

  const sectionLimited = tasks.filter((task) => {
    const current = bySection.get(task.section) || 0;
    if (current >= 3) return false;
    bySection.set(task.section, current + 1);
    return true;
  });

  return sectionLimited.filter((task) => {
    const isImportant = task.priority === 'high' || task.priority === 'critical' || task.weight === 'heavy';
    if (isImportant) {
      if (important.length >= 3) return false;
      important.push(task);
    }
    return true;
  }).slice(0, maxTotal);
};

export const generateDayByDayRoutine = (rawProfile = {}, energy = 'medium') => {
  const profile = normalizeDayByDayProfile(rawProfile);
  const project = profile.project?.trim() || 'progetto principale';
  const focusMinutes = getFocusMinutes(profile.focusSpan, energy);
  const tasks = [];

  tasks.push(createTask({
    section: 'Mattina',
    title: 'Bevi acqua e apri la giornata senza telefono per 10 minuti',
    description: 'Non serve partire forte. Serve non partire gia disperso.',
    area: 'mente',
    priority: energy === 'low' ? 'low' : 'medium',
  }));

  if (hasObstacle(profile, 'overthinking') || energy === 'chaos' || profile.mentalState === 'confuso') {
    tasks.push(createTask({
      section: 'Mattina',
      title: 'Scrivi 3 pensieri che ti stanno occupando la testa',
      description: 'Tirali fuori. La mente non deve tenerli tutti aperti.',
      area: 'mente',
      priority: 'medium',
    }));
  }

  if (energy !== 'low') {
    tasks.push(createTask({
      section: 'Corpo',
      title: energy === 'high'
        ? 'Allenamento o camminata veloce per 25 minuti'
        : 'Camminata 20 minuti o corpo libero 15 minuti',
      description: 'Il corpo decide meta della lucidita mentale.',
      area: 'corpo',
      priority: 'medium',
    }));
  } else {
    tasks.push(createTask({
      section: 'Corpo',
      title: 'Esci 8 minuti o fai mobilita leggera',
      description: 'Routine minima. Non trattarla come una sconfitta.',
      area: 'corpo',
      priority: 'low',
    }));
  }

  tasks.push(createTask({
    section: 'Focus principale',
    title: `1 blocco da ${focusMinutes} minuti su ${project}`,
    description: 'Una cosa vera. Non dieci mezze partenze.',
    area: 'focus',
    priority: energy === 'low' ? 'medium' : 'high',
    weight: 'heavy',
  }));

  if (hasObstacle(profile, 'procrastinazione')) {
    tasks.push(createTask({
      section: 'Lavoro/progetto',
      title: 'Apri il progetto e fai solo il primo micro-passo',
      description: 'Non devi sentirtela. Devi aprire il file, la pagina o la lista.',
      area: 'focus',
      priority: 'medium',
    }));
  }

  if (hasObstacle(profile, 'social')) {
    tasks.push(createTask({
      section: 'Pausa mentale',
      title: 'Metti il telefono lontano durante il blocco principale',
      description: 'Il caos non si combatte con altra dopamina.',
      area: 'mente',
      priority: 'medium',
    }));
  }

  if (hasObstacle(profile, 'videogiochi')) {
    tasks.push(createTask({
      section: 'Pausa mentale',
      title: 'Videogiochi solo dopo il blocco focus principale',
      description: 'Prima stabilita, poi ricompensa.',
      area: 'mente',
      priority: 'medium',
    }));
  }

  if (energy === 'chaos') {
    tasks.push(createTask({
      section: 'Reset mentale',
      title: 'Riordina un punto visibile per 7 minuti',
      description: 'Piccolo spazio pulito, piccolo cervello piu pulito.',
      area: 'mente',
      priority: 'low',
    }));
  }

  tasks.push(createTask({
    section: 'Relazioni/socialita',
    title: hasObstacle(profile, 'persone')
      ? 'Rispondi a una persona senza aprire mille conversazioni'
      : 'Manda un messaggio semplice a una persona giusta',
    description: 'Una connessione reale basta. Niente performance sociale.',
    area: 'relazioni',
    priority: 'low',
  }));

  tasks.push(createTask({
    section: 'Sera',
    title: 'Spegni schermi 30 minuti prima di dormire',
    description: `Proteggi il sonno. Target attuale: ${profile.sleepTime}.`,
    area: 'sonno',
    priority: profile.phoneHours === '6+' ? 'medium' : 'low',
  }));

  tasks.push(createTask({
    section: 'Reset mentale',
    title: 'Scrivi cosa hai fatto oggi, anche se poco',
    description: 'Non hai fallito, hai raccolto dati.',
    area: 'mente',
    priority: 'low',
  }));

  const routine = capRoutine(tasks, energy);

  return {
    tasks: routine,
    message: {
      low: 'Oggi non devi vincere la vita. Devi solo non sparire.',
      medium: 'Routine normale. Taglia il superfluo e fai il blocco vero.',
      high: 'Energia alta non significa strafare. Usala bene.',
      chaos: 'Prima abbassi il rumore. Poi scegli una cosa sola.',
    }[energy] || 'Prima stabilita, poi grandezza.',
  };
};

export const isImportantTask = (task = {}) =>
  ['high', 'critical'].includes(task.priority) || task.day_by_day_weight === 'heavy' || task.weight === 'heavy';

export const inferTaskArea = (task = {}) => {
  if (task.day_by_day_area || task.area) return task.day_by_day_area || task.area;
  if (task.task_type === 'work') return 'lavoro';
  if (task.task_type === 'study') return 'studio';

  const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
  if (text.includes('sonno') || text.includes('dormi') || text.includes('schermi')) return 'sonno';
  if (text.includes('cammin') || text.includes('allen') || text.includes('corpo')) return 'corpo';
  if (text.includes('messaggio') || text.includes('persona')) return 'relazioni';
  if (text.includes('focus') || text.includes('progetto') || text.includes('lavor')) return 'focus';
  return 'mente';
};

export const getAntiChaosMessage = (tasks = [], nextTask = {}) => {
  const activeTasks = tasks.filter((task) => task?.status !== 'done');
  const importantTasks = activeTasks.filter(isImportantTask);
  const nextIsImportant = isImportantTask(nextTask);

  if (nextIsImportant && importantTasks.length >= 3) {
    return 'Stai caricando troppo. Scegli cosa conta davvero oggi.';
  }

  const nextArea = inferTaskArea(nextTask);
  if (
    nextIsImportant &&
    nextArea &&
    importantTasks.some((task) => inferTaskArea(task) === nextArea)
  ) {
    return `Hai gia una cosa pesante su ${nextArea}. Taglia, non accumulare.`;
  }

  return '';
};

const getLastSevenKeys = (today = new Date()) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    return getTodayKey(date);
  });

const isTaskDone = (task = {}) => task.status === 'done';

export const scoreDayByDay = ({ tasks = [], history = {}, today = new Date() } = {}) => {
  const dayKeys = getLastSevenKeys(today);
  const dayTasks = tasks.filter((task) => task.day_by_day);
  const tasksByDay = dayTasks.reduce((acc, task) => {
    const key = task.due_date || task.day_by_day_date || getTodayKey(new Date(task.created_date || Date.now()));
    acc[key] = acc[key] || [];
    acc[key].push(task);
    return acc;
  }, {});

  const weightedDays = dayKeys.map((key) => {
    const status = history[key]?.status;
    const tasksForDay = tasksByDay[key] || [];
    if (status === 'completed') return 1;
    if (status === 'partial') return 0.5;
    if (status === 'skipped') return 0;
    if (tasksForDay.length > 0 && tasksForDay.every(isTaskDone)) return 1;
    if (tasksForDay.some(isTaskDone)) return 0.5;
    return 0;
  });

  let streak = 0;
  for (const key of dayKeys) {
    const status = history[key]?.status;
    const tasksForDay = tasksByDay[key] || [];
    const completed = status === 'completed' || (tasksForDay.length > 0 && tasksForDay.every(isTaskDone));
    if (!completed) break;
    streak += 1;
  }

  const skippedByTitle = new Map();
  const skippedByArea = new Map();
  dayTasks
    .filter((task) => !isTaskDone(task))
    .forEach((task) => {
      skippedByTitle.set(task.title, (skippedByTitle.get(task.title) || 0) + 1);
      const area = inferTaskArea(task);
      skippedByArea.set(area, (skippedByArea.get(area) || 0) + 1);
    });

  const mostSkipped = [...skippedByTitle.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nessun pattern ancora';
  const weakArea = [...skippedByArea.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'stabile';
  const weeklyPercentage = Math.round((weightedDays.reduce((sum, value) => sum + value, 0) / 7) * 100);

  const suggestion = weakArea === 'stabile'
    ? 'Tieni il sistema leggero. Ripetibile batte perfetto.'
    : `Area fragile: ${weakArea}. Questa settimana riduci il carico li, non aumentarlo.`;

  return {
    streak,
    weeklyPercentage,
    mostSkipped,
    weakArea,
    suggestion,
  };
};

export const getReflectionMessage = (status) => ({
  completed: 'Giornata chiusa. Bene. Ora non trasformarla in pressione per domani.',
  partial: 'Non hai fallito, hai raccolto dati. Domani si riparte piu semplice.',
  skipped: 'Giornata saltata. Non drammatizzare: recuperi con una versione minima.',
}[status] || 'Non serve perfetto, serve ripetibile.');
