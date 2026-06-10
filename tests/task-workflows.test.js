/**
 * Freeway Life - Unit Tests: task-workflows
 * Test per le utility pure di gestione task
 */

import {
  buildTaskPayload,
  buildCalendarTaskPayload,
  buildPlannerTaskPayload,
  buildTaskSeriesPayloads,
  buildBrainDumpPayload,
  buildBrainDumpPromotionPayload,
  buildTaskDuplicatePayload,
  buildTaskPastePayload,
  getTaskXP,
  getTodayDateKey,
  sanitizeTaskPriority,
  sanitizeTaskStatus,
  TASK_PRIORITY,
  TASK_STATUS,
} from '@/lib/task-workflows';

describe('sanitizeTaskPriority', () => {
  it('returns priority for valid values', () => {
    expect(sanitizeTaskPriority('high')).toBe('high');
    expect(sanitizeTaskPriority('low')).toBe('low');
    expect(sanitizeTaskPriority('critical')).toBe('critical');
  });

  it('returns medium for invalid values', () => {
    expect(sanitizeTaskPriority('invalid')).toBe('medium');
    expect(sanitizeTaskPriority('')).toBe('medium');
    expect(sanitizeTaskPriority(null)).toBe('medium');
    expect(sanitizeTaskPriority(undefined)).toBe('medium');
  });
});

describe('sanitizeTaskStatus', () => {
  it('returns status for valid values', () => {
    expect(sanitizeTaskStatus('today')).toBe('today');
    expect(sanitizeTaskStatus('done')).toBe('done');
    expect(sanitizeTaskStatus('inbox')).toBe('inbox');
  });

  it('returns inbox for invalid values', () => {
    expect(sanitizeTaskStatus('')).toBe('inbox');
    expect(sanitizeTaskStatus(null)).toBe('inbox');
  });
});

describe('buildTaskPayload', () => {
  it('creates default payload with minimal input', () => {
    const result = buildTaskPayload({ title: 'Test task' });
    expect(result.title).toBe('Test task');
    expect(result.priority).toBe('medium');
    expect(result.status).toBe('inbox');
    expect(result.is_brain_dump).toBe(false);
    expect(result.description).toBe('');
  });

  it('trims whitespace from title and description', () => {
    const result = buildTaskPayload({ title: '  Hello  ', description: '  World  ' });
    expect(result.title).toBe('Hello');
    expect(result.description).toBe('World');
  });

  it('sets correct XP for priority', () => {
    expect(buildTaskPayload({ title: 'T', priority: 'critical' }).xp_value).toBe(75);
    expect(buildTaskPayload({ title: 'T', priority: 'high' }).xp_value).toBe(50);
    expect(buildTaskPayload({ title: 'T', priority: 'medium' }).xp_value).toBe(25);
    expect(buildTaskPayload({ title: 'T', priority: 'low' }).xp_value).toBe(15);
  });
});

describe('getTaskXP', () => {
  it('returns correct XP for each priority', () => {
    expect(getTaskXP('low')).toBe(15);
    expect(getTaskXP('medium')).toBe(25);
    expect(getTaskXP('high')).toBe(50);
    expect(getTaskXP('critical')).toBe(75);
  });

  it('returns XP for invalid priority', () => {
    expect(getTaskXP('invalid')).toBe(25); // default medium
  });
});

describe('buildCalendarTaskPayload', () => {
  it('creates payload with today status and due date', () => {
    const result = buildCalendarTaskPayload({
      title: 'Meeting',
      date: '2026-06-10',
      start_time: '10:00',
      end_time: '11:00',
    });
    expect(result.status).toBe('today');
    expect(result.due_date).toBe('2026-06-10');
    expect(result.start_time).toBe('10:00');
  });
});

describe('buildTaskSeriesPayloads', () => {
  it('returns single payload for no recurrence', () => {
    const base = buildTaskPayload({ title: 'Task' });
    const result = buildTaskSeriesPayloads(base, { copies: 1 });
    expect(result.length).toBe(1);
  });

  it('creates multiple copies with copy suffix', () => {
    const base = buildTaskPayload({ title: 'Task' });
    const result = buildTaskSeriesPayloads(base, { copies: 3 });
    expect(result.length).toBe(3);
    expect(result[1].title).toMatch(/copia/);
  });
});

describe('buildBrainDumpPayload', () => {
  it('creates brain dump task with low priority', () => {
    const result = buildBrainDumpPayload('Pensiero veloce');
    expect(result.is_brain_dump).toBe(true);
    expect(result.priority).toBe('low');
    expect(result.status).toBe('inbox');
    expect(result.xp_value).toBe(10);
  });
});

describe('buildBrainDumpPromotionPayload', () => {
  it('promotes brain dump to today status', () => {
    const result = buildBrainDumpPromotionPayload({ priority: 'high', xp_value: 10 });
    expect(result.status).toBe('today');
    expect(result.is_brain_dump).toBe(false);
    expect(result.priority).toBe('high');
  });
});

describe('buildTaskDuplicatePayload', () => {
  it('creates copy with "copia" suffix', () => {
    const original = { title: 'Originale', priority: 'high', description: 'Desc' };
    const result = buildTaskDuplicatePayload(original);
    expect(result.title).toBe('Originale copia');
    expect(result.copied_from_title).toBe('Originale');
  });
});

describe('buildTaskPastePayload', () => {
  it('creates payload from clipboard data', () => {
    const clipboard = {
      title: 'Copied Task',
      description: 'Desc',
      priority: 'high',
      start_time: '14:00',
    };
    const result = buildTaskPastePayload(clipboard, '2026-06-10');
    expect(result.title).toBe('Copied Task');
    expect(result.due_date).toBe('2026-06-10');
    expect(result.status).toBe('today');
  });
});