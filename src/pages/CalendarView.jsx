// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { accountData } from '@/api/accountDataClient';
import useUserProfile from '@/hooks/useUserProfile';
import useAccountPreference from '@/hooks/useAccountPreference';
import { normalizeList } from '@/lib/normalize-list';
import {
  buildTaskPastePayload,
  clearTaskClipboard,
  getCalendarDateString,
  getTaskClipboard,
  invalidateTaskViews,
  isTaskForCalendarDate,
  setTaskClipboard,
  TASK_CLIPBOARD_EVENT,
} from '@/lib/task-workflows';
import { BriefcaseBusiness, BookOpen, CalendarPlus, ChevronLeft, ChevronRight, Clock, Layers3, MessageCircle, StickyNote, Copy, ClipboardX, Settings2, Globe2, PanelsTopLeft } from 'lucide-react';
import TaskModal from '@/components/calendar/TaskModal';
import CreateTaskModal from '@/components/calendar/CreateTaskModal';
import AppAssistantChat from '@/components/assistant/AppAssistantChat';
import { formatDuration, getTaskDurationHours, getWorkColor } from '@/lib/work-utils';
import PageShell from '@/components/shared/PageShell';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DEFAULT_CALENDAR_SETTINGS,
  readLegacyCalendarSettings,
  writeLegacyCalendarSettings,
} from '@/lib/app-preferences';

const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const WEEKDAY_FULL = ['Domenica', 'Lunedi', 'Martedi', 'Mercoledi', 'Giovedi', 'Venerdi', 'Sabato'];

const CALENDAR_PRESETS = {
  european: {
    id: 'european',
    label: 'Europeo',
    note: 'Settimana da lunedi',
    weekStartsOn: 1,
    dayLabels: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
  },
  us: {
    id: 'us',
    label: 'English US',
    note: 'Settimana da domenica',
    weekStartsOn: 0,
    dayLabels: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  },
  gulf: {
    id: 'gulf',
    label: 'Internazionale Gulf',
    note: 'Settimana da sabato',
    weekStartsOn: 6,
    dayLabels: ['S', 'D', 'L', 'M', 'M', 'G', 'V'],
  },
};

const CALENDAR_VIEWS = [
  { id: 'year', label: 'Anno' },
  { id: 'month', label: 'Mese' },
  { id: 'week', label: 'Settimana' },
  { id: 'day', label: 'Giorno' },
];

const shiftDate = (date, amount, unit = 'day') => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (unit === 'day') next.setDate(next.getDate() + amount);
  if (unit === 'week') next.setDate(next.getDate() + (amount * 7));
  if (unit === 'month') next.setMonth(next.getMonth() + amount, 1);
  if (unit === 'year') next.setFullYear(next.getFullYear() + amount, 0, 1);
  return next;
};

const getWeekStart = (date, weekStartsOn) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (start.getDay() - weekStartsOn + 7) % 7;
  start.setDate(start.getDate() - diff);
  return start;
};

const getWeekDates = (date, weekStartsOn) => {
  const start = getWeekStart(date, weekStartsOn);
  return Array.from({ length: 7 }, (_, index) => shiftDate(start, index, 'day'));
};

const formatDayNumber = (date) => String(date.getDate()).padStart(2, '0');
const isSameDate = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();
const isSameMonth = (left, right) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
const getDateTitle = (date) => `${date.getDate()} ${MONTHS[date.getMonth()]}`;
const getCalendarPreset = (presetId) => CALENDAR_PRESETS[presetId] || CALENDAR_PRESETS.european;

export default function CalendarView({ onStartTomato }) {
  const today = new Date();
  const { profile, saveProfile } = useUserProfile();
  const [calendarSettings, setCalendarSettings] = useAccountPreference({
    profile,
    saveProfile,
    preferenceKey: 'calendarSettings',
    defaultValue: DEFAULT_CALENDAR_SETTINGS,
    readLocal: readLegacyCalendarSettings,
    writeLocal: writeLegacyCalendarSettings,
    persistDelay: 200,
  });
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [selectedTask, setSelectedTask] = useState(null);
  const [createDate, setCreateDate] = useState(null);
  const [assistantMemo, setAssistantMemo] = useState(null);
  const [taskClipboard, setTaskClipboardState] = useState(() => getTaskClipboard());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pressTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  const { data: taskResponse = [], refetch } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => accountData.tasks.list('-due_date', 200),
  });
  const tasks = normalizeList(taskResponse);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const preset = getCalendarPreset(calendarSettings.preset);
  const view = calendarSettings.view;
  const selectedDay = selectedDate.getDate();
  const firstDow = (new Date(year, month, 1).getDay() - preset.weekStartsOn + 7) % 7;

  const clampDay = (day) => Math.min(Math.max(Number(day) || 1, 1), daysInMonth);
  const getDateString = (day) => getCalendarDateString({ year, month, day: clampDay(day) });
  const selectedDateKey = getCalendarDateString({
    year: selectedDate.getFullYear(),
    month: selectedDate.getMonth(),
    day: selectedDate.getDate(),
  });

  const getTasksForDay = (day) => {
    const safeDay = clampDay(day);
    const dateString = getDateString(safeDay);

    return tasks
      .filter((task) => isTaskForCalendarDate(task, {
        dateString,
        day: safeDay,
        month,
        year,
        today,
      }))
      .sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'));
  };

  const openCreateForDay = (day) => {
    const safeDay = clampDay(day || today.getDate());
    const nextDate = new Date(year, month, safeDay);
    setSelectedDate(nextDate);
    setCreateDate(getDateString(safeDay));
  };

  const openCreateForDate = (date) => {
    const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    setSelectedDate(nextDate);
    setCreateDate(getCalendarDateString({
      year: nextDate.getFullYear(),
      month: nextDate.getMonth(),
      day: nextDate.getDate(),
    }));
  };

  useEffect(() => {
    const syncClipboard = (event) => {
      if (event?.detail !== undefined) {
        setTaskClipboardState(event.detail || null);
        return;
      }

      setTaskClipboardState(getTaskClipboard());
    };

    window.addEventListener(TASK_CLIPBOARD_EVENT, syncClipboard);
    window.addEventListener('storage', syncClipboard);

    return () => {
      window.removeEventListener(TASK_CLIPBOARD_EVENT, syncClipboard);
      window.removeEventListener('storage', syncClipboard);
    };
  }, []);

  const handleDateSelection = (date) => {
    const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDate(nextDate);
    setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  };

  const handleDayClick = (day) => handleDateSelection(new Date(year, month, clampDay(day)));

  const handleDuplicateTask = (task) => {
    if (!task) return;
    setTaskClipboardState(setTaskClipboard(task));
  };

  const openLinkedNote = (task) => {
    const noteId = task?.linked_note_ids?.[0];
    if (!noteId) return;
    navigate(`/braindump?note=${encodeURIComponent(noteId)}`);
  };

  const clearCalendarPress = () => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const pasteTaskOnDay = async (day) => {
    if (!taskClipboard) {
      handleDayClick(day);
      return;
    }

    const safeDay = clampDay(day);
    const date = getDateString(safeDay);
    const createdTask = await accountData.tasks.create(buildTaskPastePayload(taskClipboard, date));
    invalidateTaskViews(queryClient);
    await refetch();
    setSelectedDate(new Date(year, month, safeDay));
    setSelectedTask(createdTask);
  };

  const pasteTaskOnDate = async (date) => {
    if (!taskClipboard) {
      handleDateSelection(date);
      return;
    }

    const createdTask = await accountData.tasks.create(buildTaskPastePayload(
      taskClipboard,
      getCalendarDateString({
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
      }),
    ));
    invalidateTaskViews(queryClient);
    await refetch();
    handleDateSelection(date);
    setSelectedTask(createdTask);
  };

  const startDayPress = (day, event) => {
    if (!taskClipboard || (event?.button !== undefined && event.button !== 0)) return;

    clearCalendarPress();
    longPressTriggeredRef.current = false;
    pressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      pasteTaskOnDay(day);
    }, 420);
  };

  const endDayPress = () => {
    clearCalendarPress();
  };

  const activateDay = (day) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    if (taskClipboard) {
      pasteTaskOnDay(day);
      return;
    }

    handleDayClick(day);
  };

  const isToday = (day) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const navigateCalendar = (direction) => {
    const baseSelected = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

    if (view === 'year') {
      const nextDate = shiftDate(baseSelected, direction, 'year');
      setSelectedDate(nextDate);
      setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
      return;
    }

    if (view === 'month') {
      const nextDate = new Date(baseSelected.getFullYear(), baseSelected.getMonth() + direction, 1);
      setCurrentDate(nextDate);
      setSelectedDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
      return;
    }

    if (view === 'week') {
      const nextDate = shiftDate(baseSelected, direction, 'week');
      setSelectedDate(nextDate);
      setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
      return;
    }

    const nextDate = shiftDate(baseSelected, direction, 'day');
    setSelectedDate(nextDate);
    setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  };

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTasks = tasks.filter((task) => task.due_date?.startsWith(monthKey));
  const workTasks = monthTasks.filter((task) => task.task_type === 'work');
  const workHours = workTasks.reduce((sum, task) => sum + getTaskDurationHours(task), 0);
  const selectedTasks = useMemo(() => {
    const key = selectedDateKey;
    return tasks
      .filter((task) => {
        if (task?.due_date) return task.due_date === key;
        return task?.status === 'today' && isSameDate(selectedDate, today);
      })
      .sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'));
  }, [selectedDateKey, selectedDate, tasks, today]);
  const memoTasks = useMemo(() => (
    tasks
      .filter((task) => task.is_brain_dump || task.task_type === 'memo')
      .slice(0, 8)
  ), [tasks]);
  const weekDates = useMemo(() => getWeekDates(selectedDate, preset.weekStartsOn), [selectedDate, preset.weekStartsOn]);
  const yearMonths = useMemo(
    () => Array.from({ length: 12 }, (_, index) => new Date(year, index, 1)),
    [year],
  );
  const title = (() => {
    if (view === 'year') return String(year);
    if (view === 'day') {
      return `${WEEKDAY_FULL[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    }
    if (view === 'week') {
      const weekStart = weekDates[0];
      const weekEnd = weekDates[6];
      const sameMonth = weekStart.getMonth() === weekEnd.getMonth() && weekStart.getFullYear() === weekEnd.getFullYear();
      if (sameMonth) {
        return `${weekStart.getDate()}-${weekEnd.getDate()} ${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
      }
      return `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()]} - ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
    }
    return `${MONTHS[month]} ${year}`;
  })();

  const renderMonthGrid = () => (
    <div className="glass-panel min-w-0 overflow-hidden p-2.5 sm:p-3 md:p-4">
      <div className="grid grid-cols-7 mb-1 sm:mb-2">
        {preset.dayLabels.map((d, i) => (
          <div key={i} className="text-center font-mono text-[9px] text-emerald-400/50 uppercase tracking-wider py-1.5 sm:py-2 sm:text-[10px]">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[54px] sm:min-h-[92px] md:min-h-[118px]" />;
          const dayTasks = getTasksForDay(day);
          const dayDate = new Date(year, month, day);
          const active = isToday(day);
          const selected = isSameDate(selectedDate, dayDate);

          return (
            <motion.div
              key={i}
              role="button"
              tabIndex={0}
              whileTap={{ scale: 0.98 }}
              onClick={() => activateDay(day)}
              onPointerDown={(event) => startDayPress(day, event)}
              onPointerUp={endDayPress}
              onPointerLeave={endDayPress}
              onPointerCancel={endDayPress}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  activateDay(day);
                }
              }}
              className={`group relative min-h-[52px] rounded-xl p-1.5 sm:min-h-[92px] sm:rounded-2xl sm:p-2.5 md:min-h-[118px] flex min-w-0 flex-col items-stretch transition-all text-left overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 ${
                active
                  ? 'bg-emerald-500/12 border border-emerald-500/50 shadow-[0_0_28px_rgba(16,185,129,0.13)]'
                  : selected
                  ? 'bg-white/10 border border-white/20'
                  : 'bg-white/[0.025] border border-white/[0.055] hover:bg-white/[0.055]'
              }`}
            >
              <span className={`font-mono text-[10px] font-semibold sm:text-[11px] ${active ? 'text-emerald-300' : 'text-white/70'}`}>
                {formatDayNumber(dayDate)}
              </span>

              <div className="mt-1 space-y-1 overflow-hidden sm:mt-2">
                {dayTasks.length > 0 ? dayTasks.slice(0, 3).map((task) => {
                  const colors = getWorkColor(task.priority);
                  return (
                    <div key={task.id} className={`rounded-md border px-1.5 py-1 ${colors.chip}`}>
                      <div className="flex items-center gap-1 min-w-0">
                        {task.task_type === 'work' && <BriefcaseBusiness className="w-3 h-3 shrink-0" />}
                        {task.task_type === 'study' && <BookOpen className="w-3 h-3 shrink-0" />}
                        <span className="hidden text-[10px] font-semibold truncate sm:inline">{task.title}</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-current sm:hidden" />
                      </div>
                      {(task.start_time || task.end_time) && (
                        <span className="hidden font-mono text-[9px] opacity-70 truncate sm:block">
                          {task.start_time || '--:--'}-{task.end_time || '--:--'}
                        </span>
                      )}
                    </div>
                  );
                }) : (
                  <span className="mt-auto hidden text-[10px] text-white/20 opacity-0 transition-opacity group-hover:opacity-100 sm:block sm:opacity-100">
                    {taskClipboard ? 'incolla' : '+ task'}
                  </span>
                )}
                {dayTasks.length > 3 && (
                  <span className="block text-[10px] font-mono text-white/35 px-1">+{dayTasks.length - 3}</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderWeekView = () => (
    <div className="glass-panel min-w-0 overflow-hidden p-3 sm:p-4">
      <div className="grid grid-cols-7 gap-2 border-b border-white/8 pb-3">
        {weekDates.map((date, index) => {
          const active = isSameDate(date, today);
          const selected = isSameDate(date, selectedDate);
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => taskClipboard ? pasteTaskOnDate(date) : handleDateSelection(date)}
              className={`rounded-2xl border px-2 py-3 text-center transition-colors ${
                active ? 'border-emerald-400/45 bg-emerald-500/12 text-emerald-200'
                  : selected ? 'border-white/18 bg-white/8 text-white'
                  : 'border-white/8 bg-white/[0.03] text-white/58 hover:bg-white/[0.05]'
              }`}
            >
              <p className="font-mono text-[10px] uppercase tracking-widest">{preset.dayLabels[index]}</p>
              <p className="mt-1 font-grotesk text-lg font-bold">{formatDayNumber(date)}</p>
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-7">
        {weekDates.map((date, index) => {
          const dateKey = getCalendarDateString({
            year: date.getFullYear(),
            month: date.getMonth(),
            day: date.getDate(),
          });
          const dayTasks = tasks
            .filter((task) => task.due_date === dateKey)
            .sort((a, b) => (a.start_time || '99:99').localeCompare(b.start_time || '99:99'));

          return (
            <div key={`week-column-${dateKey}`} className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate font-grotesk text-sm font-semibold text-white/82">{getDateTitle(date)}</p>
                <button
                  type="button"
                  onClick={() => taskClipboard ? pasteTaskOnDate(date) : openCreateForDate(date)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/20 text-white/55 hover:text-emerald-200"
                  aria-label={taskClipboard ? 'Incolla task qui' : 'Aggiungi task qui'}
                >
                  {taskClipboard ? <Copy className="h-3.5 w-3.5" /> : <CalendarPlus className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-white/32">{taskClipboard ? 'Pronto per incolla' : 'Vuoto'}</p>
                ) : dayTasks.map((task) => {
                  const colors = getWorkColor(task.priority);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTask(task)}
                      className={`w-full rounded-xl border p-2 text-left ${colors.chip}`}
                    >
                      <p className="truncate text-xs font-semibold">{task.title}</p>
                      <p className="mt-1 font-mono text-[10px] opacity-70">{task.start_time || '--:--'}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDayView = () => (
    <div className="glass-panel min-w-0 overflow-hidden p-4">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Vista giorno</p>
          <h2 className="mt-1 font-grotesk text-2xl font-bold text-white">{getDateTitle(selectedDate)}</h2>
        </div>
        <button
          type="button"
          onClick={() => taskClipboard ? pasteTaskOnDate(selectedDate) : openCreateForDate(selectedDate)}
          className="btn-cyber h-11 rounded-xl px-4 text-xs tracking-widest"
        >
          {taskClipboard ? 'INCOLLA TASK' : 'NUOVA TASK'}
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {selectedTasks.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/42">
            {taskClipboard ? 'Nessuna task. Puoi incollare qui la task copiata.' : 'Nessuna task in questo giorno.'}
          </div>
        ) : selectedTasks.map((task) => {
          const colors = getWorkColor(task.priority);
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => setSelectedTask(task)}
              className={`w-full rounded-2xl border p-4 text-left bg-gradient-to-r ${colors.rail}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-grotesk text-base font-semibold text-white">{task.title}</p>
                  <p className="mt-1 font-mono text-[11px] text-white/45">
                    {task.start_time || '--:--'} - {task.end_time || '--:--'}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-white/40">{task.priority}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-white/58">
                {task.description || 'Nessun dettaglio.'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderMiniMonth = (monthDate) => {
    const miniYear = monthDate.getFullYear();
    const miniMonth = monthDate.getMonth();
    const miniDays = new Date(miniYear, miniMonth + 1, 0).getDate();
    const miniFirstDow = (new Date(miniYear, miniMonth, 1).getDay() - preset.weekStartsOn + 7) % 7;
    const miniCells = [];
    for (let i = 0; i < miniFirstDow; i++) miniCells.push(null);
    for (let i = 1; i <= miniDays; i++) miniCells.push(i);
    const monthTaskCount = tasks.filter((task) => task.due_date?.startsWith(`${miniYear}-${String(miniMonth + 1).padStart(2, '0')}`)).length;
    const activeMonth = month === miniMonth;

    return (
      <button
        key={`${miniYear}-${miniMonth}`}
        type="button"
        onClick={() => {
          const nextDate = new Date(miniYear, miniMonth, 1);
          setCurrentDate(nextDate);
          setSelectedDate(nextDate);
          setCalendarSettings((current) => ({ ...current, view: 'month' }));
        }}
        className={`rounded-[1.4rem] border p-3 text-left transition-colors ${
          activeMonth ? 'border-emerald-400/35 bg-emerald-500/10' : 'border-white/8 bg-white/[0.025] hover:bg-white/[0.04]'
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="font-grotesk text-base font-bold text-white">{MONTHS[miniMonth]}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/38">{monthTaskCount} task</p>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {preset.dayLabels.map((label, index) => (
            <span key={`${label}-${index}`} className="text-center font-mono text-[8px] text-emerald-300/45">{label}</span>
          ))}
          {miniCells.map((day, index) => (
            <span
              key={`${miniMonth}-day-${index}`}
              className={`grid h-7 place-items-center rounded-lg text-[10px] ${
                day ? 'text-white/68' : 'text-transparent'
              } ${
                day && isSameDate(selectedDate, new Date(miniYear, miniMonth, day)) ? 'bg-white/12 text-white' : ''
              }`}
            >
              {day || '.'}
            </span>
          ))}
        </div>
      </button>
    );
  };

  const renderYearView = () => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {yearMonths.map((monthDate) => renderMiniMonth(monthDate))}
    </div>
  );

  return (
    <PageShell maxWidth="max-w-6xl" contentClassName="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 pt-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] text-emerald-400/60 tracking-widest uppercase mb-1">Calendario</p>
          <h1 className="font-grotesk font-black text-[clamp(2.35rem,10vw,4.4rem)] text-white text-glow leading-none">
            {view === 'year'
              ? <>{title}</>
              : view === 'month'
                ? <>{MONTHS[month]} <span className="text-white/35">{year}</span></>
                : <>{title}</>}
          </h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="glass h-10 rounded-xl px-3 text-white/60 transition-colors hover:text-emerald-400"
                aria-label="Impostazioni calendario"
              >
                <span className="inline-flex items-center gap-2 text-xs font-semibold">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Impostazioni</span>
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 rounded-3xl border-emerald-300/15 bg-[#02050c]/96 p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Globe2 className="h-4 w-4 text-emerald-300/70" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-300/60">Settimana</p>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {Object.values(CALENDAR_PRESETS).map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setCalendarSettings((current) => ({ ...current, preset: option.id }))}
                        className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                          calendarSettings.preset === option.id
                            ? 'border-emerald-400/40 bg-emerald-500/12'
                            : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.05]'
                        }`}
                      >
                        <p className="text-sm font-semibold text-white/82">{option.label}</p>
                        <p className="mt-1 text-xs text-white/42">{option.note}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <PanelsTopLeft className="h-4 w-4 text-cyan-200/70" />
                    <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-200/55">Vista</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {CALENDAR_VIEWS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setCalendarSettings((current) => ({ ...current, view: option.id }))}
                        className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-colors ${
                          view === option.id
                            ? 'border-cyan-300/35 bg-cyan-300/10 text-cyan-50'
                            : 'border-white/8 bg-white/[0.03] text-white/62 hover:bg-white/[0.05]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <button onClick={() => navigateCalendar(-1)} className="glass w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-emerald-400 transition-colors" aria-label="Periodo precedente">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigateCalendar(1)} className="glass w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-emerald-400 transition-colors" aria-label="Periodo successivo">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div className="min-w-0">
          {view === 'month' && renderMonthGrid()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
          {view === 'year' && renderYearView()}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-8">
          <div className="glass-panel p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] text-emerald-400/60 uppercase tracking-widest">Report mese</p>
              <Layers3 className="w-4 h-4 text-emerald-400/70" />
            </div>
            {taskClipboard && (
              <div className="rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.05] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-200/55">
                      Task copiata
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-white/82">{taskClipboard.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/42">
                      Clicca o tieni premuto un giorno del calendario per incollarla.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearTaskClipboard();
                      setTaskClipboardState(null);
                    }}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/20 text-white/45 transition-colors hover:border-red-300/30 hover:text-red-200"
                    aria-label="Svuota task copiata"
                    title="Svuota task copiata"
                  >
                    <ClipboardX className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="glass rounded-xl p-3">
                <p className="font-mono text-[10px] text-white/35 uppercase tracking-widest">Turni</p>
                <p className="font-grotesk text-2xl font-bold text-white mt-1">{workTasks.length}</p>
              </div>
              <div className="glass rounded-xl p-3">
                <p className="font-mono text-[10px] text-white/35 uppercase tracking-widest">Ore</p>
                <p className="font-grotesk text-2xl font-bold text-white mt-1">{formatDuration(workHours)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openCreateForDay(selectedDay || today.getDate())}
              className="btn-cyber w-full h-11 rounded-xl font-mono text-xs tracking-widest flex items-center justify-center gap-2"
            >
              <CalendarPlus className="w-4 h-4" />
              Aggiungi task
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDay || 'empty'}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="glass-panel p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] text-emerald-400/60 uppercase tracking-widest">Giornata</p>
                  <h2 className="font-grotesk text-xl font-bold text-white mt-1">
                    {selectedDate ? `${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]}` : 'Seleziona un giorno'}
                  </h2>
                </div>
                {selectedDate && (
                  taskClipboard ? (
                    <button
                      type="button"
                      onClick={() => pasteTaskOnDate(selectedDate)}
                      className="glass w-10 h-10 rounded-xl flex items-center justify-center text-cyan-200 hover:bg-cyan-300/10"
                      aria-label="Incolla task nel giorno selezionato"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openCreateForDate(selectedDate)}
                      className="glass w-10 h-10 rounded-xl flex items-center justify-center text-emerald-300 hover:bg-emerald-500/10"
                      aria-label="Aggiungi task al giorno selezionato"
                    >
                      <CalendarPlus className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>

              {selectedTasks.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.035] border border-white/[0.06] p-4 text-sm text-white/42">
                  {taskClipboard ? 'Seleziona un giorno e incolla la task copiata.' : 'Nessuna task in calendario. Seleziona un giorno e usa Aggiungi task.'}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTasks.map((task) => {
                    const colors = getWorkColor(task.priority);
                    return (
                      <button
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`w-full rounded-2xl border border-white/10 bg-gradient-to-r ${colors.rail} p-3 text-left hover:border-emerald-400/35 transition-colors`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1.5 w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                          <div className="min-w-0 flex-1">
                            <p className="font-grotesk text-sm font-semibold text-white truncate">{task.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-white/45">
                              {(task.start_time || task.end_time) && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {task.start_time || '--:--'} - {task.end_time || '--:--'}
                                </span>
                              )}
                              {task.task_type === 'work' && (
                                <span className="inline-flex items-center gap-1 text-emerald-300/70">
                                  <BriefcaseBusiness className="w-3 h-3" />
                                  {formatDuration(getTaskDurationHours(task))}
                                </span>
                              )}
                              {task.task_type === 'study' && (
                                <span className="inline-flex items-center gap-1 text-cyan-200/75">
                                  <BookOpen className="w-3 h-3" />
                                  {formatDuration(getTaskDurationHours(task))}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedTasks.length > 0 && (
                <div className="rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.045] p-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-200/55">
                    Timeline
                  </p>
                  <div className="mt-3 space-y-2">
                    {selectedTasks.map((task) => (
                      <div key={`timeline-${task.id}`} className="grid grid-cols-[54px_1fr] gap-3">
                        <span className="pt-0.5 font-mono text-[10px] text-white/42">
                          {task.start_time || '--:--'}
                        </span>
                        <div className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2">
                          <p className="truncate text-sm font-semibold text-white/[0.82]">{task.title}</p>
                          <p className="mt-1 truncate text-[11px] text-white/38">
                            {task.description || 'Nessun dettaglio. Apri la task se vuoi completarla.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </aside>
      </section>

      <section className="glass-panel p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Memo</p>
            <h2 className="font-grotesk text-xl font-bold text-white">Pensieri dal Brain Dump</h2>
          </div>
          <StickyNote className="h-5 w-5 text-emerald-300/70" />
        </div>
        {memoTasks.length === 0 ? (
          <p className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-sm text-white/42">
            Nessun memo. Scrivine uno nel Brain Dump e poi mandalo alla chat.
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {memoTasks.map((memo) => (
              <article key={memo.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <p className="text-sm font-semibold text-white/82">{memo.title}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-300/55">MEMO</span>
                  <button
                    type="button"
                    onClick={() => setAssistantMemo(memo)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-cyan-200/15 bg-cyan-300/8 px-3 text-xs font-semibold text-cyan-100"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Chat
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <TaskModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onStartTomato={onStartTomato}
        onDuplicate={handleDuplicateTask}
        onOpenLinkedNote={openLinkedNote}
      />
      <CreateTaskModal
        date={createDate}
        existingTasksForDate={createDate ? tasks.filter((task) => (
          task.due_date === createDate ||
          (
            task.status === 'today' &&
            !task.due_date &&
            createDate === getCalendarDateString({
              year: today.getFullYear(),
              month: today.getMonth(),
              day: today.getDate(),
            })
          )
        )) : []}
        onClose={() => setCreateDate(null)}
        onRefetch={refetch}
      />
      <AppAssistantChat
        open={Boolean(assistantMemo)}
        onClose={() => setAssistantMemo(null)}
        sourceMemo={assistantMemo}
      />
    </PageShell>
  );
}
