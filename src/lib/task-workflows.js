export const TASK_STATUS = {
  today: 'today',
  inbox: 'inbox',
  scheduled: 'scheduled',
  done: 'done',
};

export const TASK_PRIORITY = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
};

export const TASK_XP_BY_PRIORITY = {
  [TASK_PRIORITY.low]: 15,
  [TASK_PRIORITY.medium]: 25,
  [TASK_PRIORITY.high]: 50,
  [TASK_PRIORITY.critical]: 75,
};

export const BRAIN_DUMP_XP = 10;

export const TASK_VIEW_QUERY_KEYS = [
  ['tasks'],
  ['all-tasks'],
  ['work-tasks'],
  ['braindumps'],
  ['dashboard'],
];

export const FOCUS_VIEW_QUERY_KEYS = [
  ['dashboard'],
];

export const TASK_CLIPBOARD_STORAGE_KEY = 'fw_task_clipboard';
export const TASK_CLIPBOARD_EVENT = 'fw:task-clipboard-changed';

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');
const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const parseDateKey = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDateKey = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const addDateUnits = (dateKey, recurrence, index) => {
  const date = parseDateKey(dateKey);
  if (!date || !index) return dateKey;

  if (recurrence === 'daily') date.setDate(date.getDate() + index);
  if (recurrence === 'weekly') date.setDate(date.getDate() + (index * 7));
  if (recurrence === 'monthly') date.setMonth(date.getMonth() + index);

  return formatDateKey(date);
};

const clampCount = (value, min = 1, max = 12) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(Math.max(Math.round(parsed), min), max);
};

export const getTodayDateKey = () => formatDateKey(new Date());

export const sanitizeTaskPriority = (priority) =>
  Object.values(TASK_PRIORITY).includes(priority) ? priority : TASK_PRIORITY.medium;

export const sanitizeTaskStatus = (status) =>
  Object.values(TASK_STATUS).includes(status) ? status : TASK_STATUS.inbox;

export const getTaskXP = (priority) => TASK_XP_BY_PRIORITY[sanitizeTaskPriority(priority)];

/**
 * @param {{
 *   title?: string;
 *   description?: string;
 *   priority?: string;
 *   status?: string;
 *   due_date?: string;
 *   start_time?: string;
 *   end_time?: string;
 *   task_type?: string;
 *   is_brain_dump?: boolean;
 *   xp_value?: number | string;
 *   day_by_day?: boolean;
 *   day_by_day_date?: string;
 *   day_by_day_section?: string;
 *   day_by_day_area?: string;
 *   day_by_day_weight?: string;
 *   source?: string;
 *   recurrence_rule?: string;
 *   recurrence_group_id?: string;
 *   recurrence_index?: number;
 *   recurrence_total?: number;
 *   copied_from_title?: string;
 * }} [input]
 */
export const buildTaskPayload = ({
  title,
  description = '',
  priority = TASK_PRIORITY.medium,
  status = TASK_STATUS.inbox,
  due_date,
  start_time,
  end_time,
  task_type,
  is_brain_dump = false,
  xp_value,
  day_by_day = false,
  day_by_day_date,
  day_by_day_section,
  day_by_day_area,
  day_by_day_weight,
  source,
  recurrence_rule,
  recurrence_group_id,
  recurrence_index,
  recurrence_total,
  copied_from_title,
} = {}) => {
  const sanitizedPriority = sanitizeTaskPriority(priority);
  const sanitizedStatus = sanitizeTaskStatus(status);

  return {
    title: cleanText(title),
    description: cleanText(description),
    priority: sanitizedPriority,
    status: sanitizedStatus,
    is_brain_dump: Boolean(is_brain_dump),
    day_by_day: Boolean(day_by_day),
    xp_value: Number.isFinite(Number(xp_value)) ? Number(xp_value) : getTaskXP(sanitizedPriority),
    ...(due_date ? { due_date } : {}),
    ...(start_time ? { start_time } : {}),
    ...(end_time ? { end_time } : {}),
    ...(task_type ? { task_type } : {}),
    ...(day_by_day_date ? { day_by_day_date } : {}),
    ...(day_by_day_section ? { day_by_day_section } : {}),
    ...(day_by_day_area ? { day_by_day_area } : {}),
    ...(day_by_day_weight ? { day_by_day_weight } : {}),
    ...(source ? { source } : {}),
    ...(recurrence_rule ? { recurrence_rule } : {}),
    ...(recurrence_group_id ? { recurrence_group_id } : {}),
    ...(recurrence_index ? { recurrence_index } : {}),
    ...(recurrence_total ? { recurrence_total } : {}),
    ...(copied_from_title ? { copied_from_title } : {}),
  };
};

export const buildPlannerTaskPayload = ({
  title,
  description,
  priority,
  status,
  due_date,
  start_time,
  end_time,
  task_type,
}) =>
  buildTaskPayload({
    title,
    description,
    priority,
    status: status === TASK_STATUS.done ? TASK_STATUS.today : status,
    due_date,
    start_time,
    end_time,
    task_type,
  });

export const buildCalendarTaskPayload = ({
  title,
  description,
  priority,
  date,
  start_time,
  end_time,
  task_type,
}) =>
  buildTaskPayload({
    title,
    description,
    priority,
    status: TASK_STATUS.today,
    due_date: date,
    start_time,
    end_time,
    task_type,
  });

export const buildTaskSeriesPayloads = (basePayload, {
  copies = 1,
  recurrence = 'none',
  recurrenceCount = 1,
} = {}) => {
  const safeRecurrence = ['daily', 'weekly', 'monthly'].includes(recurrence) ? recurrence : 'none';
  const total = safeRecurrence === 'none'
    ? clampCount(copies, 1, 8)
    : clampCount(recurrenceCount, 1, 24);

  if (total <= 1) return [basePayload];

  const groupId = `series_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const originalTitle = cleanText(basePayload.title);

  return Array.from({ length: total }, (_, index) => {
    const isSameDayCopy = safeRecurrence === 'none' && index > 0;
    const dueDate = safeRecurrence === 'none'
      ? basePayload.due_date
      : addDateUnits(basePayload.due_date || getTodayDateKey(), safeRecurrence, index);

    return {
      ...basePayload,
      title: isSameDayCopy ? `${originalTitle} copia ${index + 1}` : originalTitle,
      ...(dueDate ? { due_date: dueDate } : {}),
      ...(safeRecurrence !== 'none' && index > 0 ? { status: TASK_STATUS.scheduled } : {}),
      recurrence_group_id: groupId,
      recurrence_index: index + 1,
      recurrence_total: total,
      copied_from_title: originalTitle,
      ...(safeRecurrence !== 'none' ? { recurrence_rule: safeRecurrence } : {}),
    };
  });
};

export const buildTaskDuplicatePayload = (task = {}, overrides = {}) => {
  const dueDate = overrides.due_date ?? task.due_date;

  return buildTaskPayload({
    title: `${cleanText(task.title) || 'Task'} copia`,
    description: task.description,
    priority: task.priority,
    status: overrides.status || task.status || TASK_STATUS.today,
    due_date: dueDate,
    start_time: task.start_time,
    end_time: task.end_time,
    task_type: task.task_type,
    xp_value: task.xp_value,
    copied_from_title: task.title,
    ...overrides,
  });
};

export const getTaskClipboard = () => {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(TASK_CLIPBOARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.title) return null;

    return {
      title: cleanText(parsed.title),
      description: cleanText(parsed.description),
      priority: sanitizeTaskPriority(parsed.priority),
      task_type: parsed.task_type || 'task',
      start_time: parsed.start_time || '',
      end_time: parsed.end_time || '',
      xp_value: Number.isFinite(Number(parsed.xp_value)) ? Number(parsed.xp_value) : getTaskXP(parsed.priority),
      copied_at: parsed.copied_at || '',
    };
  } catch {
    return null;
  }
};

const emitTaskClipboardChanged = (clipboard) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TASK_CLIPBOARD_EVENT, { detail: clipboard || null }));
};

export const setTaskClipboard = (task = {}) => {
  const clipboard = {
    title: cleanText(task.copied_from_title || task.title || 'Task'),
    description: cleanText(task.description),
    priority: sanitizeTaskPriority(task.priority),
    task_type: task.task_type || 'task',
    start_time: task.start_time || '',
    end_time: task.end_time || '',
    xp_value: Number.isFinite(Number(task.xp_value)) ? Number(task.xp_value) : getTaskXP(task.priority),
    copied_at: new Date().toISOString(),
  };

  if (canUseStorage()) {
    try {
      window.localStorage.setItem(TASK_CLIPBOARD_STORAGE_KEY, JSON.stringify(clipboard));
    } catch {
      // Ignore storage failures; in-memory usage still works through event detail.
    }
  }

  emitTaskClipboardChanged(clipboard);
  return clipboard;
};

export const clearTaskClipboard = () => {
  if (canUseStorage()) {
    try {
      window.localStorage.removeItem(TASK_CLIPBOARD_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  emitTaskClipboardChanged(null);
};

export const buildTaskPastePayload = (clipboard, date) =>
  buildCalendarTaskPayload({
    title: clipboard?.title || 'Task',
    description: clipboard?.description || '',
    priority: clipboard?.priority || TASK_PRIORITY.medium,
    date,
    start_time: clipboard?.start_time || '',
    end_time: clipboard?.end_time || '',
    task_type: clipboard?.task_type || 'task',
  });

export const buildBrainDumpPayload = (text, description = '') =>
  buildTaskPayload({
    title: text,
    description,
    priority: TASK_PRIORITY.low,
    status: TASK_STATUS.inbox,
    is_brain_dump: true,
    source: 'brain_dump_memo',
    xp_value: BRAIN_DUMP_XP,
  });

export const buildBrainDumpPromotionPayload = (task = {}) => {
  const priority = sanitizeTaskPriority(task.priority || TASK_PRIORITY.medium);
  const currentXP = Number(task.xp_value);
  const promotedXP = currentXP > BRAIN_DUMP_XP ? currentXP : getTaskXP(priority);

  return {
    status: TASK_STATUS.today,
    is_brain_dump: false,
    priority,
    xp_value: promotedXP,
  };
};

export const getCalendarDateString = ({ year, month, day }) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const isTaskForCalendarDate = (task, { dateString, day, month, year, today }) =>
  task?.due_date === dateString ||
  (
    task?.status === TASK_STATUS.today &&
    !task?.due_date &&
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear()
  );

export const invalidateTaskViews = (queryClient) => {
  TASK_VIEW_QUERY_KEYS.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
};

export const invalidateFocusViews = (queryClient) => {
  FOCUS_VIEW_QUERY_KEYS.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
};
