import { accountData } from '@/api/accountDataClient';
import { buildCalendarTaskPayload, buildTaskPayload, invalidateTaskViews, TASK_STATUS } from '@/lib/task-workflows';

const cleanText = (value, fallback = '') => String(value || fallback).trim();
const clampActions = (actions) => (Array.isArray(actions) ? actions.slice(0, 8) : []);
const normalizeTaskType = (value, fallback = 'task') => {
  const clean = cleanText(value || fallback).toLowerCase();
  if (['work', 'lavoro', 'turno'].includes(clean)) return 'work';
  if (['event', 'evento', 'appuntamento'].includes(clean)) return 'event';
  if (['memo', 'nota'].includes(clean)) return 'memo';
  return 'task';
};

export const normalizeAssistantActions = (actions = []) =>
  clampActions(actions)
    .map((action) => {
      const type = cleanText(action?.type).toLowerCase();
      const title = cleanText(action?.title, type === 'create_alarm' ? 'Sveglia' : 'Nuova task');
      const date = cleanText(action?.date);
      const time = cleanText(action?.time || action?.start_time);
      const endTime = cleanText(action?.end_time);
      const description = cleanText(action?.description || action?.notes);
      const priority = cleanText(action?.priority, 'medium');

      if (!['create_task', 'create_event', 'create_memo', 'create_alarm'].includes(type)) return null;

      return {
        type,
        title: title.slice(0, 140),
        description: description.slice(0, 600),
        date,
        time,
        end_time: endTime,
        priority,
        task_type: normalizeTaskType(action?.task_type, type === 'create_event' ? 'event' : 'task'),
        reminder_text: cleanText(action?.reminder_text || description || title).slice(0, 240),
      };
    })
    .filter(Boolean);

export const getActionLabel = (action) => {
  const labels = {
    create_task: 'Task',
    create_event: 'Evento',
    create_memo: 'Memo',
    create_alarm: 'Sveglia',
  };

  const when = [action.date, action.time].filter(Boolean).join(' ');
  return `${labels[action.type] || 'Azione'}: ${action.title}${when ? ` - ${when}` : ''}`;
};

export const applyAssistantAction = async (action) => {
  if (action.type === 'create_alarm') {
    return accountData.alarms.create({
      title: action.title || 'Sveglia',
      time: action.time || '09:00',
      date: action.date || '',
      repeat: action.date ? 'none' : 'daily',
      enabled: true,
      reminder_text: action.reminder_text || action.description || action.title,
    });
  }

  if (action.type === 'create_memo') {
    return accountData.tasks.create(buildTaskPayload({
      title: action.title,
      description: action.description || 'Memo creato dalla chat.',
      priority: 'low',
      status: TASK_STATUS.inbox,
      due_date: action.date,
      start_time: action.time,
      end_time: action.end_time,
      task_type: 'memo',
      is_brain_dump: true,
      source: 'chat_memo',
      xp_value: 10,
    }));
  }

  return accountData.tasks.create(buildCalendarTaskPayload({
    title: action.title,
    description: action.description || 'Creato dalla chat Groq.',
    priority: action.priority || 'medium',
    date: action.date,
    start_time: action.time,
    end_time: action.end_time,
    task_type: action.type === 'create_event' ? 'event' : action.task_type || 'task',
  }));
};

export const applyAssistantActions = async (actions, queryClient) => {
  const normalized = normalizeAssistantActions(actions);
  const results = [];

  for (const action of normalized) {
    results.push(await applyAssistantAction(action));
  }

  invalidateTaskViews(queryClient);
  queryClient?.invalidateQueries?.({ queryKey: ['alarms'] });
  return results;
};
