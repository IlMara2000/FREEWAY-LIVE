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

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

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
  };
};

export const buildPlannerTaskPayload = ({
  title,
  description,
  priority,
  status,
  start_time,
  end_time,
  task_type,
}) =>
  buildTaskPayload({
    title,
    description,
    priority,
    status: status === TASK_STATUS.done ? TASK_STATUS.today : status,
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

export const buildBrainDumpPayload = (text, description = '') =>
  buildTaskPayload({
    title: text,
    description,
    priority: TASK_PRIORITY.low,
    status: TASK_STATUS.inbox,
    is_brain_dump: true,
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
