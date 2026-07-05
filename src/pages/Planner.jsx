import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { accountData } from '@/api/accountDataClient';
import { normalizeList } from '@/lib/normalize-list';
import {
  buildPlannerTaskPayload,
  buildTaskSeriesPayloads,
  getTodayDateKey,
  invalidateTaskViews,
  setTaskClipboard,
  TASK_STATUS,
} from '@/lib/task-workflows';
import { getAntiChaosMessage } from '@/lib/day-by-day';
import { getTaskLoadSummary, parseQuickTaskInput } from '@/lib/task-planning';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useUserProfile from '@/hooks/useUserProfile';
import XPReward from '@/components/shared/XPReward';
import TaskDescriptionAssistant from '@/components/tasks/TaskDescriptionAssistant';
import TaskModal from '@/components/calendar/TaskModal';
import PageShell from '@/components/shared/PageShell';
import { AlertTriangle, Plus, Check, Trash2, BriefcaseBusiness, Clock, Copy, Repeat2, StickyNote, BookOpen, CalendarDays, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PRIORITY_COLORS = {
  low: 'bg-muted-foreground',
  medium: 'bg-primary',
  high: 'bg-chart-5',
  critical: 'bg-destructive',
};

const STATUS_TABS = [
  { value: 'today', label: 'Oggi' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'scheduled', label: 'Pianificati' },
  { value: 'done', label: 'Fatti' },
];

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'No' },
  { value: 'daily', label: 'Giornaliera' },
  { value: 'weekly', label: 'Settimanale' },
  { value: 'monthly', label: 'Mensile' },
];

const parseDateKey = (dateKey) => {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDateLabel = (dateKey) => {
  const date = parseDateKey(dateKey);
  if (!date) return '';
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date);
};

const getTaskDateLabel = (task) => {
  if (task?.due_date) return formatDateLabel(task.due_date);
  if (task?.status === TASK_STATUS.today) return 'oggi';
  return '';
};

const timeToMinutes = (time) => {
  const [hours, minutes] = String(time || '').split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
};

const getShiftMinutes = (task) => {
  const start = timeToMinutes(task?.start_time);
  const end = timeToMinutes(task?.end_time);
  if (start === null || end === null) return 0;
  return Math.max(0, end >= start ? end - start : (24 * 60) - start + end);
};

const formatShiftDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${String(rest).padStart(2, '0')}m` : `${hours}h`;
};

const getWeekStart = (date) => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = next.getDay() || 7;
  next.setDate(next.getDate() - day + 1);
  return next;
};

const formatDateKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

const formatWeekRange = (weekStart) => {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const formatter = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' });
  return `${formatter.format(weekStart)} - ${formatter.format(end)}`;
};

const getWorkWeekGroups = (workTasks = []) => {
  const groups = new Map();

  workTasks.forEach((task) => {
    const date = parseDateKey(task.due_date) || new Date(task.created_date || Date.now());
    const weekStart = getWeekStart(date);
    const weekKey = formatDateKey(weekStart);
    const current = groups.get(weekKey) || {
      weekKey,
      label: formatWeekRange(weekStart),
      totalMinutes: 0,
      shifts: [],
    };

    current.totalMinutes += getShiftMinutes(task);
    current.shifts.push(task);
    groups.set(weekKey, current);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      shifts: group.shifts.sort((left, right) => (
        (left.due_date || '').localeCompare(right.due_date || '') ||
        (left.start_time || '').localeCompare(right.start_time || '')
      )),
    }))
    .sort((left, right) => right.weekKey.localeCompare(left.weekKey));
};

export default function Planner() {
  const [activeTab, setActiveTab] = useState('today');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState(getTodayDateKey());
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newTaskType, setNewTaskType] = useState('task');
  const [newCopies, setNewCopies] = useState(1);
  const [newRecurrence, setNewRecurrence] = useState('none');
  const [newRecurrenceCount, setNewRecurrenceCount] = useState(4);
  const [antiChaosMessage, setAntiChaosMessage] = useState('');
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState({ amount: 0, levelUp: false, newLevel: 1 });
  const [pendingCompleteTask, setPendingCompleteTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [openWorkWeeks, setOpenWorkWeeks] = useState(() => new Set());
  const { profile, addXP, incrementTasksCompleted } = useUserProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: taskResponse = [], isLoading } = useQuery({
    queryKey: ['tasks', activeTab],
    queryFn: () => accountData.tasks.filter({ status: activeTab }, '-created_date', 50),
  });
  const { data: workTaskResponse = [], isLoading: isLoadingWorkTasks } = useQuery({
    queryKey: ['planner-work-shifts'],
    queryFn: () => accountData.tasks.list('-due_date', 300),
  });
  const tasks = normalizeList(taskResponse);
  const plannerTasks = useMemo(() => tasks.filter((task) => task.task_type !== 'work'), [tasks]);
  const workShifts = useMemo(() => (
    normalizeList(workTaskResponse)
      .filter((task) => task.task_type === 'work')
      .sort((left, right) => (
        (right.due_date || '').localeCompare(left.due_date || '') ||
        (left.start_time || '').localeCompare(right.start_time || '')
      ))
  ), [workTaskResponse]);
  const workWeekGroups = useMemo(() => getWorkWeekGroups(workShifts), [workShifts]);
  const quickAdd = useMemo(() => parseQuickTaskInput(newTitle), [newTitle]);
  const quickAddCandidate = useMemo(() => (
    quickAdd.title
      ? {
          title: quickAdd.title,
          description: newDescription,
          priority: quickAdd.priority || newPriority,
          task_type: quickAdd.task_type || newTaskType,
          status: activeTab,
        }
      : null
  ), [quickAdd, newDescription, newPriority, newTaskType, activeTab]);
  const loadCandidate = quickAddCandidate?.task_type === 'work' ? null : quickAddCandidate;
  const dailyLoad = useMemo(
    () => getTaskLoadSummary(plannerTasks, activeTab === TASK_STATUS.today ? loadCandidate : null),
    [plannerTasks, activeTab, loadCandidate],
  );

  useEffect(() => {
    if (!workWeekGroups.length || openWorkWeeks.size > 0) return;
    setOpenWorkWeeks(new Set([workWeekGroups[0].weekKey]));
  }, [openWorkWeeks.size, workWeekGroups]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payloads = Array.isArray(data) ? data : [data];
      return Promise.all(payloads.map((payload) => accountData.tasks.create(payload)));
    },
    onSuccess: () => {
      invalidateTaskViews(queryClient);
      setNewTitle('');
      setNewDescription('');
      setNewCopies(1);
      setNewRecurrence('none');
      setNewRecurrenceCount(4);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (task) => {
      await accountData.tasks.update(task.id, { status: TASK_STATUS.done });
      const xp = task.xp_value || 25;
      const result = await addXP(xp);
      await incrementTasksCompleted();
      setRewardData({
        amount: xp,
        levelUp: result?.leveledUp || false,
        newLevel: result?.newLevel || (profile?.level || 1),
      });
      setShowReward(true);
    },
    onSuccess: () => {
      invalidateTaskViews(queryClient);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => accountData.tasks.delete(id),
    onSuccess: () => {
      invalidateTaskViews(queryClient);
    },
  });

  const updateDescriptionMutation = useMutation({
    mutationFn: ({ id, description }) => accountData.tasks.update(id, { description }),
    onSuccess: () => {
      invalidateTaskViews(queryClient);
    },
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const parsed = parseQuickTaskInput(newTitle);
    const resolvedPriority = parsed.priority || newPriority;
    const resolvedTaskType = parsed.task_type || newTaskType;
    const resolvedStartTime = parsed.start_time || newStartTime;
    const resolvedEndTime = parsed.end_time || newEndTime;
    const resolvedRecurrence = parsed.recurrence !== 'none' ? parsed.recurrence : newRecurrence;
    const resolvedCopies = parsed.copies > 1 ? parsed.copies : newCopies;
    const resolvedRecurrenceCount = parsed.recurrence !== 'none' ? parsed.recurrenceCount : newRecurrenceCount;
    const resolvedDueDate = parsed.due_date || newDueDate || (resolvedRecurrence !== 'none' ? getTodayDateKey() : undefined);
    const resolvedStatus = resolvedDueDate && resolvedDueDate !== getTodayDateKey()
      ? TASK_STATUS.scheduled
      : activeTab;

    const warning = activeTab === TASK_STATUS.today && resolvedTaskType !== 'work'
      ? getAntiChaosMessage(plannerTasks, {
        title: parsed.title || newTitle,
        description: newDescription,
        priority: resolvedPriority,
        status: resolvedStatus,
        task_type: resolvedTaskType,
      })
      : '';

    if (warning) {
      setAntiChaosMessage(warning);
      return;
    }

    setAntiChaosMessage('');
    const basePayload = buildPlannerTaskPayload({
      title: parsed.title || newTitle.trim(),
      description: newDescription.trim() || (
        resolvedTaskType === 'work'
          ? 'Turno di lavoro'
          : resolvedTaskType === 'study'
            ? 'Sessione di studio'
            : 'Nessuna descrizione'
      ),
      priority: resolvedPriority,
      status: resolvedStatus,
      due_date: resolvedDueDate,
      start_time: resolvedStartTime,
      end_time: resolvedEndTime,
      task_type: resolvedTaskType,
    });

    createMutation.mutate(buildTaskSeriesPayloads(basePayload, {
      copies: resolvedCopies,
      recurrence: resolvedRecurrence,
      recurrenceCount: resolvedRecurrenceCount,
    }));
  };

  const confirmCompleteTask = () => {
    if (!pendingCompleteTask || completeMutation.isPending) return;

    completeMutation.mutate(pendingCompleteTask, {
      onSettled: () => setPendingCompleteTask(null),
    });
  };

  const mutationError = [
    createMutation.error,
    completeMutation.error,
    deleteMutation.error,
    updateDescriptionMutation.error,
  ].find(Boolean);

  const openLinkedNote = (task) => {
    const noteId = task?.linked_note_ids?.[0];
    if (!noteId) return;
    navigate(`/braindump?note=${encodeURIComponent(noteId)}`);
  };

  const toggleWorkWeek = (weekKey) => {
    setOpenWorkWeeks((current) => {
      const next = new Set(current);
      if (next.has(weekKey)) {
        next.delete(weekKey);
      } else {
        next.add(weekKey);
      }
      return next;
    });
  };

  return (
    <PageShell maxWidth="max-w-4xl" contentClassName="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-grotesk font-bold text-foreground">
          Piano
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Organizza le tue missioni</p>
      </motion.div>

      <div className="glass grid grid-cols-4 gap-1 rounded-2xl p-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`min-h-11 rounded-xl px-2 text-xs font-semibold transition-all sm:text-sm ${
              activeTab === tab.value
                ? 'bg-emerald-300 text-black shadow-[0_0_24px_rgba(52,211,153,0.28)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== 'done' && (
        <motion.form
          onSubmit={handleAdd}
          className="glass-panel p-4 md:p-5 space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={(e) => {
                setNewTitle(e.target.value);
                setAntiChaosMessage('');
              }}
              placeholder="Nuovo task..."
              className="h-11 flex-1 rounded-xl border-white/10 bg-black/25"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!newTitle.trim() || createMutation.isPending}
              className="h-11 w-11 shrink-0"
              aria-label="Aggiungi task"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="font-mono uppercase tracking-widest text-muted-foreground">
              Quick add
            </span>
            <span className="text-muted-foreground/80">
              `Report domani 09:00-10:00 p2 ogni settimana #lavoro`
            </span>
          </div>

          {quickAdd.chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickAdd.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-semibold text-primary/90"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}

          <Input
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Descrizione (se vuota la compilo io)..."
            className="h-11 rounded-xl border-white/10 bg-black/25"
          />

          {activeTab === TASK_STATUS.today && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-primary/60">
                    Carico reale
                  </p>
                  <p className="mt-1 text-sm text-white/80">
                    {dailyLoad.weightedLoad}/{dailyLoad.maxLoad} punti, {dailyLoad.importantCount}/3 task pesanti
                  </p>
                  <p className="mt-1 text-xs text-white/42">
                    I turni di lavoro non entrano nel carico: sono ore lavorate, non task mentali.
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${
                    dailyLoad.tone === 'overload'
                      ? 'bg-destructive/15 text-destructive'
                      : dailyLoad.tone === 'limit'
                        ? 'bg-chart-5/15 text-chart-5'
                        : 'bg-primary/10 text-primary'
                  }`}
                >
                  {dailyLoad.tone === 'overload' ? 'Taglia' : dailyLoad.tone === 'limit' ? 'Quasi pieno' : 'Gestibile'}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className={`h-full rounded-full transition-all ${
                    dailyLoad.tone === 'overload'
                      ? 'bg-destructive'
                      : dailyLoad.tone === 'limit'
                        ? 'bg-chart-5'
                        : 'bg-primary'
                  }`}
                  style={{ width: `${dailyLoad.percentage}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-white/48">
                {dailyLoad.message}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span className="sr-only">Data task o turno</span>
              <div className="min-w-0 flex-1">
                <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70">
                  Data
                </span>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(event) => setNewDueDate(event.target.value)}
                  className="min-w-0 w-full bg-transparent font-mono text-sm text-foreground outline-none"
                  aria-label="Data task o turno"
                />
              </div>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <input
                type="time"
                value={newStartTime}
                onChange={(event) => setNewStartTime(event.target.value)}
                className="min-w-0 w-full bg-transparent font-mono text-sm text-foreground outline-none"
                aria-label="Ora inizio"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <input
                type="time"
                value={newEndTime}
                onChange={(event) => setNewEndTime(event.target.value)}
                className="min-w-0 w-full bg-transparent font-mono text-sm text-foreground outline-none"
                aria-label="Ora fine"
              />
            </label>
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger className="h-11 rounded-xl border-white/10 bg-black/25">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Bassa</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Critica</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newTaskType} onValueChange={setNewTaskType}>
              <SelectTrigger className="h-11 rounded-xl border-white/10 bg-black/25">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="study">
                  <span className="inline-flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    Studio
                  </span>
                </SelectItem>
                <SelectItem value="work">
                  <span className="inline-flex items-center gap-2">
                    <BriefcaseBusiness className="w-3.5 h-3.5" />
                    Lavoro
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_1fr_1fr]">
            <label className="space-y-1">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <Copy className="h-3 w-3" /> Copie
              </span>
              <Input
                type="number"
                min="1"
                max="8"
                value={newCopies}
                disabled={newRecurrence !== 'none'}
                onChange={(event) => setNewCopies(event.target.value)}
                className="h-10 rounded-xl border-white/10 bg-black/25 disabled:opacity-40"
                aria-label="Numero copie task"
              />
            </label>

            <label className="space-y-1">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <Repeat2 className="h-3 w-3" /> Ricorrenza
              </span>
              <Select value={newRecurrence} onValueChange={setNewRecurrence}>
                <SelectTrigger className="h-10 rounded-xl border-white/10 bg-black/25">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Ripeti
              </span>
              <Input
                type="number"
                min="2"
                max="24"
                value={newRecurrenceCount}
                disabled={newRecurrence === 'none'}
                onChange={(event) => setNewRecurrenceCount(event.target.value)}
                className="h-10 rounded-xl border-white/10 bg-black/25 disabled:opacity-40"
                aria-label="Numero ripetizioni task"
              />
            </label>
          </div>
        </motion.form>
      )}

      {antiChaosMessage && (
        <div className="rounded-xl border border-orange-300/30 bg-orange-400/10 p-3 text-sm text-orange-50/80">
          {antiChaosMessage}
        </div>
      )}

      {mutationError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {mutationError.message || 'Operazione non riuscita. Riprova.'}
        </div>
      )}

      <section className="glass-panel space-y-3 p-4 md:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">
              Turni di lavoro
            </p>
            <h2 className="mt-1 font-grotesk text-xl font-bold text-white">
              Settimane compatte
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-white/48">
              I turni sono separati dai task: non pesano sul carico e qui li vedi per settimana, con data e orari.
            </p>
          </div>
          <span className="rounded-full border border-emerald-300/16 bg-emerald-400/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-emerald-200/70">
            {workShifts.length} turni
          </span>
        </div>

        {isLoadingWorkTasks ? (
          <div className="h-16 rounded-2xl bg-white/[0.035] animate-pulse" />
        ) : workWeekGroups.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-white/45">
            Nessun turno registrato. Aggiungine uno come tipo “Lavoro” usando data, ora inizio e ora fine.
          </div>
        ) : (
          <div className="space-y-2">
            {workWeekGroups.map((group) => {
              const isOpen = openWorkWeeks.has(group.weekKey);

              return (
                <div key={group.weekKey} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <button
                    type="button"
                    onClick={() => toggleWorkWeek(group.weekKey)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-white/[0.035]"
                  >
                    <span className="min-w-0">
                      <span className="block font-grotesk text-sm font-bold text-white">
                        Settimana {group.label}
                      </span>
                      <span className="mt-1 block text-xs text-white/42">
                        {group.shifts.length} turni · {formatShiftDuration(group.totalMinutes)}
                      </span>
                    </span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-white/45 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/8"
                      >
                        <div className="space-y-2 p-3">
                          {group.shifts.map((shift) => (
                            <button
                              key={shift.id}
                              type="button"
                              onClick={() => setSelectedTask(shift)}
                              className="grid w-full gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-left transition-colors hover:border-emerald-300/20 hover:bg-emerald-400/[0.045] sm:grid-cols-[120px_1fr_auto] sm:items-center"
                            >
                              <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-300/65">
                                {formatDateLabel(shift.due_date) || 'Senza data'}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-white/82">{shift.title}</span>
                                {shift.description && (
                                  <span className="mt-1 block truncate text-xs text-white/38">{shift.description}</span>
                                )}
                              </span>
                              <span className="font-mono text-xs text-white/58">
                                {shift.start_time || '--:--'} - {shift.end_time || '--:--'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : plannerTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {activeTab === 'done' ? 'Nessun task completato ancora' : 'Nessun task qui. Aggiungine uno!'}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {plannerTasks.map((task) => {
              const dateLabel = getTaskDateLabel(task);
              const timeLabel = task.start_time || task.end_time
                ? `${task.start_time || '--:--'} - ${task.end_time || '--:--'}`
                : '';

              return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="glass rounded-2xl p-4 group cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-2 w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority]}`} />

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'
                    }`}>
                      {task.title}
                    </p>
                    {(dateLabel || timeLabel || task.task_type === 'study') && (
                      <p className="text-[10px] font-mono text-muted-foreground truncate mt-1">
                        {[dateLabel, timeLabel, task.task_type === 'study' ? 'Studio' : ''].filter(Boolean).join(' - ')}
                      </p>
                    )}
                    <TaskDescriptionAssistant
                      task={task}
                      sourceLabel="planner"
                      isSaving={updateDescriptionMutation.isPending && updateDescriptionMutation.variables?.id === task.id}
                      onSaveDescription={(currentTask, description) =>
                        updateDescriptionMutation.mutateAsync({ id: currentTask.id, description })}
                    />
                  </div>

                  <span className="pt-1 text-xs font-mono text-primary/60 shrink-0">
                    +{task.xp_value || 25}
                  </span>

                  <div className="flex items-center gap-1 opacity-100">
                    {task.status !== 'done' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingCompleteTask(task);
                        }}
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        disabled={completeMutation.isPending}
                        title="Completa task"
                        aria-label={`Completa ${task.title}`}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          event.stopPropagation();
                          setTaskClipboard(task);
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-cyan-200 hover:bg-cyan-300/10"
                        disabled={createMutation.isPending}
                        title="Copia task"
                        aria-label={`Copia ${task.title}`}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {Array.isArray(task.linked_note_ids) && task.linked_note_ids.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            openLinkedNote(task);
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-amber-100 hover:bg-amber-300/10"
                          title="Apri nota collegata"
                          aria-label={`Apri nota collegata per ${task.title}`}
                        >
                          <StickyNote className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteMutation.mutate(task.id);
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        disabled={deleteMutation.isPending}
                        title="Elimina task"
                        aria-label={`Elimina ${task.title}`}
                      >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {pendingCompleteTask && (
            <motion.div
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/68 backdrop-blur-sm"
                onClick={() => setPendingCompleteTask(null)}
                aria-label="Annulla completamento"
              />
              <motion.div
                className="relative z-10 w-full max-w-sm rounded-3xl border border-emerald-300/18 bg-[#02050c]/95 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.58)]"
                initial={{ y: 24, opacity: 0, scale: 0.94, rotateX: -8 }}
                animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
                exit={{ y: 18, opacity: 0, scale: 0.94, rotateX: -8 }}
                transition={{ type: 'spring', stiffness: 310, damping: 26 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/22 bg-emerald-400/10 text-emerald-200">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-grotesk text-xl font-bold text-white">
                      Completo davvero?
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/52">
                      Stai per segnare come fatta "{pendingCompleteTask.title}". Puoi confermare o annullare.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl border-white/10 bg-white/[0.035] text-white/65 hover:bg-white/10 hover:text-white"
                    onClick={() => setPendingCompleteTask(null)}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="button"
                    className="btn-cyber h-11 rounded-xl"
                    disabled={completeMutation.isPending}
                    onClick={confirmCompleteTask}
                  >
                    {completeMutation.isPending ? 'Completo...' : 'Conferma'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <XPReward
        amount={rewardData.amount}
        show={showReward}
        onComplete={() => setShowReward(false)}
        levelUp={rewardData.levelUp}
        newLevel={rewardData.newLevel}
      />
      <TaskModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onDuplicate={(task) => setTaskClipboard(task)}
        onOpenLinkedNote={openLinkedNote}
      />
    </PageShell>
  );
}
