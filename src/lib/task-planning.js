import { TASK_PRIORITY } from '@/lib/task-workflows';
import { getAntiChaosMessage, isImportantTask } from '@/lib/day-by-day';

const WEEKDAY_MATCHERS = [
  { day: 1, tokens: ['lun', 'lunedi', 'lunedì', 'monday', 'mon'] },
  { day: 2, tokens: ['mar', 'martedi', 'martedì', 'tuesday', 'tue'] },
  { day: 3, tokens: ['mer', 'mercoledi', 'mercoledì', 'wednesday', 'wed'] },
  { day: 4, tokens: ['gio', 'giovedi', 'giovedì', 'thursday', 'thu'] },
  { day: 5, tokens: ['ven', 'venerdi', 'venerdì', 'friday', 'fri'] },
  { day: 6, tokens: ['sab', 'sabato', 'saturday', 'sat'] },
  { day: 0, tokens: ['dom', 'domenica', 'sunday', 'sun'] },
];

const RECURRENCE_PATTERNS = [
  { value: 'daily', label: 'Ogni giorno', regex: /\b(?:ogni\s+giorno|giornalier[ao])\b/gi },
  { value: 'weekly', label: 'Ogni settimana', regex: /\b(?:ogni\s+settimana|settimanal[ea])\b/gi },
  { value: 'monthly', label: 'Ogni mese', regex: /\b(?:ogni\s+mese|mensil[ea])\b/gi },
];

const PRIORITY_PATTERNS = [
  { value: TASK_PRIORITY.critical, label: 'Critica', regex: /\b(?:p1|prio1|critica|urgent[ea])\b/gi },
  { value: TASK_PRIORITY.high, label: 'Alta', regex: /\b(?:p2|prio2|alta|importante)\b/gi },
  { value: TASK_PRIORITY.medium, label: 'Media', regex: /\b(?:p3|prio3|media)\b/gi },
  { value: TASK_PRIORITY.low, label: 'Bassa', regex: /\b(?:p4|prio4|bassa|leggera)\b/gi },
];

const TYPE_PATTERNS = [
  { value: 'work', label: 'Lavoro', regex: /\b(?:#lavoro|#work|lavoro:)\b/gi },
  { value: 'study', label: 'Studio', regex: /\b(?:#studio|#study|studio:)\b/gi },
  { value: 'task', label: 'Task', regex: /\b(?:#task|task:)\b/gi },
];

const LOAD_WEIGHTS = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const pad = (value) => String(value).padStart(2, '0');

const formatDateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const normalizeTime = (value) => {
  const clean = String(value || '').trim().replace('.', ':');
  if (!clean) return '';

  if (/^\d{1,2}$/.test(clean)) {
    const hours = Number(clean);
    if (hours >= 0 && hours <= 23) return `${pad(hours)}:00`;
    return '';
  }

  if (/^\d{1,2}:\d{2}$/.test(clean)) {
    const [hours, minutes] = clean.split(':').map(Number);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${pad(hours)}:${pad(minutes)}`;
    }
  }

  return '';
};

const addMinutesToTime = (time, minutes = 60) => {
  const normalized = normalizeTime(time);
  if (!normalized) return '';
  const [hours, mins] = normalized.split(':').map(Number);
  const total = (hours * 60) + mins + minutes;
  const nextHours = Math.floor((total % (24 * 60)) / 60);
  const nextMinutes = total % 60;
  return `${pad(nextHours)}:${pad(nextMinutes)}`;
};

const getNextWeekday = (baseDate, targetDay) => {
  const next = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const diff = (targetDay - next.getDay() + 7) % 7 || 7;
  next.setDate(next.getDate() + diff);
  return next;
};

const replaceAndRemember = (text, pattern, onMatch) => {
  let matched = false;
  const next = text.replace(pattern, (value) => {
    matched = true;
    onMatch(value);
    return ' ';
  });
  return { matched, text: next };
};

const toCleanTitle = (value) =>
  String(value || '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[,.;:!?-]+/, '')
    .replace(/[,.;:!?-]+$/, '')
    .trim();

export const parseQuickTaskInput = (rawInput, { baseDate = new Date() } = {}) => {
  const source = String(rawInput || '').trim();
  if (!source) {
    return {
      title: '',
      due_date: '',
      start_time: '',
      end_time: '',
      priority: '',
      task_type: '',
      copies: 1,
      recurrence: 'none',
      recurrenceCount: 4,
      chips: [],
      isQuickAdd: false,
    };
  }

  let text = source;
  let priority = '';
  let taskType = '';
  let recurrence = 'none';
  let recurrenceLabel = '';
  let copies = 1;
  let recurrenceCount = 4;
  let dueDate = '';
  let dueLabel = '';
  let startTime = '';
  let endTime = '';

  RECURRENCE_PATTERNS.forEach((pattern) => {
    const result = replaceAndRemember(text, pattern.regex, () => {
      recurrence = pattern.value;
      recurrenceLabel = pattern.label;
    });
    text = result.text;
  });

  PRIORITY_PATTERNS.forEach((pattern) => {
    const result = replaceAndRemember(text, pattern.regex, () => {
      priority = pattern.value;
    });
    text = result.text;
  });

  TYPE_PATTERNS.forEach((pattern) => {
    const result = replaceAndRemember(text, pattern.regex, () => {
      taskType = pattern.value;
    });
    text = result.text;
  });

  text = text.replace(/\bx(\d{1,2})\b/gi, (_, rawCount) => {
    const safeCount = Math.min(Math.max(Number(rawCount) || 1, 1), recurrence === 'none' ? 8 : 24);
    if (recurrence === 'none') {
      copies = safeCount;
    } else {
      recurrenceCount = Math.max(safeCount, 2);
    }
    return ' ';
  });

  const timeRangeMatch = text.match(/\b(?:alle\s*)?(\d{1,2}(?::\d{2})?)\s*(?:-|–|—|to|a)\s*(\d{1,2}(?::\d{2})?)\b/i);
  if (timeRangeMatch) {
    startTime = normalizeTime(timeRangeMatch[1]);
    endTime = normalizeTime(timeRangeMatch[2]);
    text = text.replace(timeRangeMatch[0], ' ');
  } else {
    const singleTimeMatch = text.match(/\b(?:alle|ore|@)\s*(\d{1,2}(?::\d{2})?)\b/i);
    if (singleTimeMatch) {
      startTime = normalizeTime(singleTimeMatch[1]);
      endTime = addMinutesToTime(startTime, 60);
      text = text.replace(singleTimeMatch[0], ' ');
    }
  }

  text = text.replace(/\bdomani\b/gi, () => {
    const next = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1);
    dueDate = formatDateKey(next);
    dueLabel = 'Domani';
    return ' ';
  });

  text = text.replace(/\boggi\b/gi, () => {
    dueDate = formatDateKey(baseDate);
    dueLabel = 'Oggi';
    return ' ';
  });

  for (const matcher of WEEKDAY_MATCHERS) {
    const regex = new RegExp(`\\b(?:${matcher.tokens.join('|')})\\b`, 'i');
    const match = text.match(regex);
    if (match) {
      const next = getNextWeekday(baseDate, matcher.day);
      dueDate = formatDateKey(next);
      dueLabel = `${match[0][0].toUpperCase()}${match[0].slice(1)}`;
      text = text.replace(regex, ' ');
      break;
    }
  }

  const title = toCleanTitle(text) || source;
  const chips = [
    priority ? PRIORITY_PATTERNS.find((pattern) => pattern.value === priority)?.label : '',
    taskType ? TYPE_PATTERNS.find((pattern) => pattern.value === taskType)?.label : '',
    dueLabel,
    startTime && endTime ? `${startTime}-${endTime}` : startTime ? `${startTime}` : '',
    recurrenceLabel,
    recurrence === 'none' && copies > 1 ? `x${copies}` : '',
    recurrence !== 'none' && recurrenceCount > 1 ? `${recurrenceCount} volte` : '',
  ].filter(Boolean);

  return {
    title,
    due_date: dueDate,
    start_time: startTime,
    end_time: endTime,
    priority,
    task_type: taskType,
    copies,
    recurrence,
    recurrenceCount,
    chips,
    isQuickAdd: chips.length > 0 && title !== source,
  };
};

const getTaskLoadValue = (task = {}) => LOAD_WEIGHTS[task.priority] || LOAD_WEIGHTS.medium;

export const getTaskLoadSummary = (tasks = [], candidate = null) => {
  const activeTasks = tasks.filter((task) => task?.status !== 'done');
  const nextTask = candidate?.title ? candidate : null;
  const combined = nextTask ? [...activeTasks, nextTask] : activeTasks;
  const weightedLoad = combined.reduce((sum, task) => sum + getTaskLoadValue(task), 0);
  const maxLoad = 10;
  const importantCount = combined.filter(isImportantTask).length;
  const percentage = Math.min(100, Math.round((weightedLoad / maxLoad) * 100));

  let tone = 'stable';
  let message = 'Hai spazio reale. Mantieni il giorno leggibile.';

  if (importantCount >= 3 || weightedLoad >= 9) {
    tone = 'limit';
    message = 'Se aggiungi ancora peso, la giornata smette di essere reale.';
  }

  if (importantCount > 3 || weightedLoad > maxLoad) {
    tone = 'overload';
    message = 'Stai caricando troppo. Taglia prima di aggiungere.';
  }

  const antiChaos = nextTask ? getAntiChaosMessage(activeTasks, nextTask) : '';
  if (antiChaos) {
    tone = 'overload';
    message = antiChaos;
  }

  return {
    weightedLoad,
    maxLoad,
    percentage,
    tone,
    message,
    importantCount,
    remainingImportantSlots: Math.max(0, 3 - importantCount),
    activeCount: activeTasks.length,
  };
};
