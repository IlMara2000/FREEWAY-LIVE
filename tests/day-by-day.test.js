/**
 * Freeway Life - Unit Tests: day-by-day
 * Test per le utility pure di generazione routine giornaliera
 */

import {
  getTodayKey,
  normalizeDayByDayProfile,
  generateDayByDayRoutine,
  scoreDayByDay,
  isImportantTask,
  inferTaskArea,
  getReflectionMessage,
  ENERGY_MODES,
  DAY_BY_DAY_SECTIONS,
} from '@/lib/day-by-day';

describe('getTodayKey', () => {
  it('returns valid date string for given date', () => {
    const date = new Date(2026, 5, 10); // June 10, 2026
    expect(getTodayKey(date)).toBe('2026-06-10');
  });

  it('pads month and day with zeros', () => {
    const date = new Date(2026, 0, 1); // January 1, 2026
    expect(getTodayKey(date)).toBe('2026-01-01');
  });
});

describe('normalizeDayByDayProfile', () => {
  it('returns defaults for empty input', () => {
    const result = normalizeDayByDayProfile();
    expect(result.configured).toBe(false);
    expect(result.obstacles).toEqual(['overthinking', 'social']);
  });

  it('preserves valid fields', () => {
    const result = normalizeDayByDayProfile({ configured: true, sleepTime: '23:00' });
    expect(result.configured).toBe(true);
    expect(result.sleepTime).toBe('23:00');
  });

  it('maintains default obstacles if invalid provided', () => {
    const result = normalizeDayByDayProfile({ obstacles: [] });
    expect(result.obstacles).toEqual(['overthinking', 'social']);
  });
});

describe('generateDayByDayRoutine', () => {
  it('generates tasks for medium energy', () => {
    const profile = normalizeDayByDayProfile({ configured: true, project: 'Studio React' });
    const routine = generateDayByDayRoutine(profile, 'medium');
    expect(routine.tasks.length).toBeGreaterThan(0);
    expect(routine.tasks[0].section).toBe('Mattina');
    expect(routine.message).toBeTruthy();
  });

  it('returns fewer tasks for low energy', () => {
    const profile = normalizeDayByDayProfile({ configured: true });
    const lowRoutine = generateDayByDayRoutine(profile, 'low');
    const highRoutine = generateDayByDayRoutine(profile, 'high');
    expect(lowRoutine.tasks.length).toBeLessThanOrEqual(highRoutine.tasks.length);
  });

  it('includes focus block for medium+ energy', () => {
    const profile = normalizeDayByDayProfile({ configured: true, project: 'Test' });
    const routine = generateDayByDayRoutine(profile, 'high');
    const focusTasks = routine.tasks.filter((t) => t.section === 'Focus principale');
    expect(focusTasks.length).toBeGreaterThan(0);
    expect(focusTasks[0].title).toContain('Test');
  });
});

describe('isImportantTask', () => {
  it('returns true for high and critical priority', () => {
    expect(isImportantTask({ priority: 'high' })).toBe(true);
    expect(isImportantTask({ priority: 'critical' })).toBe(true);
  });

  it('returns false for low and medium priority', () => {
    expect(isImportantTask({ priority: 'low' })).toBe(false);
    expect(isImportantTask({ priority: 'medium' })).toBe(false);
  });

  it('returns true for heavy weight', () => {
    expect(isImportantTask({ priority: 'low', weight: 'heavy' })).toBe(true);
    expect(isImportantTask({ day_by_day_weight: 'heavy' })).toBe(true);
  });
});

describe('inferTaskArea', () => {
  it('returns area from task field', () => {
    expect(inferTaskArea({ day_by_day_area: 'corpo' })).toBe('corpo');
    expect(inferTaskArea({ area: 'mente' })).toBe('mente');
  });

  it('infers from task_type', () => {
    expect(inferTaskArea({ task_type: 'work' })).toBe('lavoro');
    expect(inferTaskArea({ task_type: 'study' })).toBe('studio');
  });

  it('infers from text keywords', () => {
    expect(inferTaskArea({ title: 'Camminata mattutina' })).toBe('corpo');
    expect(inferTaskArea({ title: 'Progetto importante' })).toBe('focus');
  });

  it('returns mente for unknown', () => {
    expect(inferTaskArea({ title: 'Something random' })).toBe('mente');
  });
});

describe('getReflectionMessage', () => {
  it('returns messages for each status', () => {
    expect(getReflectionMessage('completed')).toContain('Bene');
    expect(getReflectionMessage('partial')).toContain('dati');
    expect(getReflectionMessage('skipped')).toContain('saltata');
  });

  it('returns fallback for unknown status', () => {
    expect(getReflectionMessage('unknown')).toContain('ripetibile');
  });
});

describe('scoreDayByDay', () => {
  it('returns default score with no data', () => {
    const result = scoreDayByDay({});
    expect(result.streak).toBe(0);
    expect(result.weeklyPercentage).toBe(0);
    expect(result.mostSkipped).toBeTruthy();
    expect(result.suggestion).toBeTruthy();
  });
});