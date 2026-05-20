// @ts-nocheck
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { accountData } from '@/api/accountDataClient';
import { normalizeList } from '@/lib/normalize-list';
import { getCalendarDateString, isTaskForCalendarDate } from '@/lib/task-workflows';
import { BriefcaseBusiness, CalendarPlus, ChevronLeft, ChevronRight, Clock, Layers3, MessageCircle, StickyNote } from 'lucide-react';
import TaskModal from '@/components/calendar/TaskModal';
import CreateTaskModal from '@/components/calendar/CreateTaskModal';
import AppAssistantChat from '@/components/assistant/AppAssistantChat';
import { formatDuration, getTaskDurationHours, getWorkColor } from '@/lib/work-utils';
import PageShell from '@/components/shared/PageShell';

const DAYS = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

export default function CalendarView({ onStartTomato }) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [selectedTask, setSelectedTask] = useState(null);
  const [createDate, setCreateDate] = useState(null);
  const [assistantMemo, setAssistantMemo] = useState(null);

  const { data: taskResponse = [], refetch } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => accountData.tasks.list('-due_date', 200),
  });
  const tasks = normalizeList(taskResponse);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const clampDay = (day) => Math.min(Math.max(Number(day) || 1, 1), daysInMonth);
  const getDateString = (day) => getCalendarDateString({ year, month, day: clampDay(day) });

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
    setSelectedDay(safeDay);
    setCreateDate(getDateString(safeDay));
  };

  const handleDayClick = (day) => setSelectedDay(day);

  const isToday = (day) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTasks = tasks.filter((task) => task.due_date?.startsWith(monthKey));
  const workTasks = monthTasks.filter((task) => task.task_type === 'work');
  const workHours = workTasks.reduce((sum, task) => sum + getTaskDurationHours(task), 0);
  const selectedTasks = selectedDay ? getTasksForDay(selectedDay) : [];
  const memoTasks = useMemo(() => (
    tasks
      .filter((task) => task.is_brain_dump || task.task_type === 'memo')
      .slice(0, 8)
  ), [tasks]);

  return (
    <PageShell maxWidth="max-w-6xl" contentClassName="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 pt-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] text-emerald-400/60 tracking-widest uppercase mb-1">Calendario</p>
          <h1 className="font-grotesk font-black text-[clamp(2.35rem,10vw,4.4rem)] text-white text-glow leading-none">
            {MONTHS[month]} <span className="text-white/35">{year}</span>
          </h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={prevMonth} className="glass w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-emerald-400 transition-colors" aria-label="Mese precedente">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="glass w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-emerald-400 transition-colors" aria-label="Mese successivo">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        <div className="glass-panel min-w-0 overflow-hidden p-2.5 sm:p-3 md:p-4">
          <div className="grid grid-cols-7 mb-1 sm:mb-2">
            {DAYS.map((d, i) => (
              <div key={i} className="text-center font-mono text-[9px] text-emerald-400/50 uppercase tracking-wider py-1.5 sm:py-2 sm:text-[10px]">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="min-h-[54px] sm:min-h-[92px] md:min-h-[118px]" />;
              const dayTasks = getTasksForDay(day);
              const active = isToday(day);
              const selected = selectedDay === day;

              return (
                <motion.div
                  key={i}
                  role="button"
                  tabIndex={0}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDayClick(day)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleDayClick(day);
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
                    {String(day).padStart(2, '0')}
                  </span>

                  <div className="mt-1 space-y-1 overflow-hidden sm:mt-2">
                    {dayTasks.length > 0 ? dayTasks.slice(0, 3).map((task) => {
                      const colors = getWorkColor(task.priority);
                      return (
                        <div key={task.id} className={`rounded-md border px-1.5 py-1 ${colors.chip}`}>
                          <div className="flex items-center gap-1 min-w-0">
                            {task.task_type === 'work' && <BriefcaseBusiness className="w-3 h-3 shrink-0" />}
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
                      <span className="mt-auto hidden text-[10px] text-white/20 opacity-0 transition-opacity group-hover:opacity-100 sm:block sm:opacity-100">+ task</span>
                    )}
                    {dayTasks.length > 3 && (
                      <span className="block text-[10px] font-mono text-white/35 px-1">+{dayTasks.length - 3}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openCreateForDay(day);
                    }}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-md border border-white/10 bg-black/35 text-white/45 opacity-100 transition-opacity sm:right-1.5 sm:top-1.5 sm:h-6 sm:w-6 sm:rounded-lg sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                    aria-label={`Aggiungi task al ${day} ${MONTHS[month]}`}
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-8">
          <div className="glass-panel p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] text-emerald-400/60 uppercase tracking-widest">Report mese</p>
              <Layers3 className="w-4 h-4 text-emerald-400/70" />
            </div>
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
                    {selectedDay ? `${selectedDay} ${MONTHS[month]}` : 'Seleziona un giorno'}
                  </h2>
                </div>
                {selectedDay && (
                  <button
                    type="button"
                    onClick={() => openCreateForDay(selectedDay)}
                    className="glass w-10 h-10 rounded-xl flex items-center justify-center text-emerald-300 hover:bg-emerald-500/10"
                    aria-label="Aggiungi task al giorno selezionato"
                  >
                    <CalendarPlus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {selectedTasks.length === 0 ? (
                <div className="rounded-2xl bg-white/[0.035] border border-white/[0.06] p-4 text-sm text-white/42">
                  Nessuna task in calendario. Tocca un giorno per crearne una.
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
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
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
