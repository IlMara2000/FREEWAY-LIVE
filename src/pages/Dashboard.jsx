import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { accountData } from '@/api/accountDataClient';
import { normalizeList } from '@/lib/normalize-list';
import useUserProfile, { getXPForCurrentLevel } from '@/hooks/useUserProfile';
import XPBar from '@/components/shared/XPBar';
import StatCard from '@/components/shared/StatCard';
import PageShell from '@/components/shared/PageShell';
import DayByDayPanel from '@/components/daybyday/DayByDayPanel';
import AppAssistantChat from '@/components/assistant/AppAssistantChat';
import OperatingSystemPanel from '@/components/freeway/OperatingSystemPanel';
import { getThemeIdsForLevel } from '@/lib/themes';
import { normalizeFreewayOS } from '@/lib/freeway-os';
import { getTaskLoadSummary } from '@/lib/task-planning';
import {
  AlarmClock,
  Brain,
  BriefcaseBusiness,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Flame,
  LayoutDashboard,
  ListTodo,
  MessageCircle,
  Palette,
  PlayCircle,
  Target,
  Timer,
  Zap,
} from 'lucide-react';

const actionCards = [
  {
    action: 'assistant',
    icon: MessageCircle,
    title: 'FreeW.A.I.',
    description: 'Domande libere, chiarimenti e azioni app quando servono.',
  },
  {
    to: '/calendar',
    icon: CalendarDays,
    title: 'Calendario',
    description: 'Giorni, appuntamenti e memo.',
  },
  {
    to: '/planner',
    icon: ListTodo,
    title: 'Piano',
    description: 'Task, priorita e giornata.',
  },
  {
    to: '/tomato',
    icon: Timer,
    title: 'Timer',
    description: 'Timer focus senza casino.',
  },
  {
    to: '/braindump',
    icon: Brain,
    title: 'Sfogo',
    description: 'Svuota la testa e crea memo.',
  },
  {
    to: '/school',
    icon: BookOpen,
    title: 'Scuola',
    description: 'Compiti, verifiche ed esami.',
  },
  {
    to: '/work',
    icon: BriefcaseBusiness,
    title: 'Lavoro',
    description: 'Ore, turni e report.',
  },
  {
    to: '/alarms',
    icon: AlarmClock,
    title: 'Sveglie',
    description: 'Promemoria e allarmi.',
  },
  {
    to: '/themes',
    icon: Palette,
    title: 'Temi',
    description: 'Colori e stile app.',
  },
];

const priorityClass = {
  critical: 'bg-destructive',
  high: 'bg-chart-5',
  medium: 'bg-primary',
  low: 'bg-muted-foreground',
};

const formatToday = () =>
  new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

const getTodayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const timeToValue = (time) => {
  const [hours, minutes] = String(time || '').split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 9999;
  return (hours * 60) + minutes;
};

const isTaskForTodayTimeline = (task, todayKey) => {
  if (!task) return false;
  if (task.due_date) return task.due_date === todayKey;
  return task.status === 'today' && task.task_type !== 'work';
};

const getTimerRemainingLabel = (timer) => {
  if (!timer) return '';
  if (timer.isRunning && timer.endsAt) {
    const remaining = Math.max(0, Math.ceil((Number(timer.endsAt) - Date.now()) / 60000));
    return `${remaining} min rimasti`;
  }
  if (timer.timeLeft) {
    const remaining = Math.max(0, Math.ceil(Number(timer.timeLeft) / 60));
    return `${remaining} min pronti`;
  }
  return 'Timer pronto';
};

export default function Dashboard() {
  const { profile, loading } = useUserProfile();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [showSystemPanels, setShowSystemPanels] = useState(false);
  const {
    data: dashboardData = { todayTasks: [], recentSessions: [], alarms: [] },
    isLoading: dataLoading,
    error: dashboardError,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [tasks, sessions, alarms] = await Promise.all([
        accountData.tasks.filter({ status: 'today' }, '-created_date', 80),
        accountData.focusSessions.list('-created_date', 5),
        accountData.alarms.list('time', 20),
      ]);

      return {
        todayTasks: normalizeList(tasks),
        recentSessions: normalizeList(sessions),
        alarms: normalizeList(alarms),
      };
    },
  });
  const { todayTasks, recentSessions, alarms } = dashboardData;
  const todayKey = getTodayKey();
  const freewayOS = useMemo(() => normalizeFreewayOS(profile?.freeway_os), [profile?.freeway_os]);
  const xpState = useMemo(() => getXPForCurrentLevel(profile?.total_xp || 0), [profile?.total_xp]);
  const unlockedThemes = useMemo(() => getThemeIdsForLevel(profile?.level || 1).length, [profile?.level]);
  const todayOnlyTasks = useMemo(
    () => todayTasks.filter((task) => isTaskForTodayTimeline(task, todayKey)),
    [todayKey, todayTasks],
  );
  const loadSummary = useMemo(() => getTaskLoadSummary(todayOnlyTasks), [todayOnlyTasks]);

  const stats = useMemo(() => ([
    { icon: Timer, label: 'Focus totale', value: profile?.total_focus_minutes || 0, unit: 'min' },
    { icon: Target, label: 'Task completati', value: profile?.total_tasks_completed || 0 },
    { icon: Flame, label: 'Streak', value: profile?.streak_days || 0, unit: 'giorni' },
    { icon: Zap, label: 'XP totali', value: profile?.total_xp || 0 },
  ]), [profile]);

  const openTutorial = () => {
    window.dispatchEvent(new Event('fw:open-app-tutorial'));
  };

  const nextTask = todayOnlyTasks[0];
  const todayTimeline = useMemo(() => {
    const taskItems = todayOnlyTasks.map((task) => ({
      id: `task-${task.id}`,
      label: task.title,
      detail: task.description || 'Task pronta.',
      when: task.start_time || 'Senza ora',
      timeValue: timeToValue(task.start_time),
      icon: ListTodo,
      accent: 'text-primary',
    }));
    const alarmItems = alarms
      .filter((alarm) => !alarm.date || alarm.date === todayKey)
      .map((alarm) => ({
        id: `alarm-${alarm.id}`,
        label: alarm.title || 'Sveglia',
        detail: alarm.reminder_text || 'Promemoria attivo.',
        when: alarm.time || 'Senza ora',
        timeValue: timeToValue(alarm.time),
        icon: AlarmClock,
        accent: 'text-cyan-200',
      }));
    const tomatoTimer = freewayOS.tomatoTimer;
    const focusItems = tomatoTimer && (tomatoTimer.isRunning || tomatoTimer.timeLeft || tomatoTimer.taskContext?.title)
      ? [{
          id: 'focus-timer',
          label: tomatoTimer.taskContext?.title || 'Sessione focus',
          detail: getTimerRemainingLabel(tomatoTimer),
          when: tomatoTimer.isRunning ? 'In corso' : 'Pronto',
          timeValue: tomatoTimer.isRunning ? -1 : 9998,
          icon: Timer,
          accent: 'text-amber-200',
        }]
      : [];

    return [...focusItems, ...alarmItems, ...taskItems]
      .sort((left, right) => left.timeValue - right.timeValue)
      .slice(0, 8);
  }, [alarms, freewayOS.tomatoTimer, todayKey, todayOnlyTasks]);

  return (
    <PageShell maxWidth="max-w-5xl" contentClassName="space-y-4 sm:space-y-5">
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between"
      >
        <div className="space-y-2">
          <p className="font-mono text-[11px] text-primary/70 uppercase tracking-widest">
            {formatToday()}
          </p>
          <div>
            <h1 className="font-grotesk text-[2rem] font-bold leading-none text-foreground sm:text-4xl md:text-5xl">
              Home
            </h1>
            <p className="mt-1 max-w-[32rem] text-sm leading-relaxed text-muted-foreground">
              Il punto di partenza: chiedi, pianifica, lavora, scarica la testa.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="btn-cyber inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-xs sm:w-auto"
          >
            <MessageCircle className="w-4 h-4" />
            FreeW.A.I.
          </button>
          <button
            type="button"
            onClick={openTutorial}
            className="glass inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary sm:w-auto sm:px-4"
          >
            <PlayCircle className="w-4 h-4" />
            Tutorial
          </button>
          <Link
            to="/themes"
            className="glass inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary sm:w-auto sm:px-4"
          >
            <Palette className="w-4 h-4" />
            Temi
          </Link>
        </div>
      </motion.header>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass-panel space-y-4 p-4 md:space-y-5 md:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] text-primary/60 uppercase tracking-widest">
                Stato operatore
              </p>
              <h2 className="font-grotesk font-semibold text-xl text-foreground mt-1">
                Livello {profile?.level || 1}
              </h2>
            </div>
            {loading && (
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Salvataggio
              </span>
            )}
          </div>
          <XPBar totalXP={profile?.total_xp || 0} level={profile?.level || 1} />
          <div className="grid grid-cols-3 gap-2">
            <div className="glass rounded-xl p-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/35 sm:text-[10px]">Prossimo livello</p>
              <p className="mt-1 font-grotesk text-base font-bold text-white sm:text-lg">
                {Math.max(0, xpState.needed - xpState.current)} XP
              </p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/35 sm:text-[10px]">Temi sbloccati</p>
              <p className="mt-1 font-grotesk text-base font-bold text-white sm:text-lg">{unlockedThemes}</p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/35 sm:text-[10px]">Streak attuale</p>
              <p className="mt-1 font-grotesk text-base font-bold text-white sm:text-lg">{profile?.streak_days || 0}g</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="glass-panel flex flex-col justify-between gap-4 p-4 md:p-6"
        >
          <div className="space-y-1">
            <p className="font-mono text-[10px] text-primary/60 uppercase tracking-widest">
              Prossima mossa
            </p>
            <h2 className="font-grotesk font-semibold text-xl text-foreground">
              {nextTask?.title || 'Scegli un task e parti leggero'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {nextTask?.description || 'Apri il Piano o chiedi a FreeW.A.I. di prepararti una partenza semplice.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="glass rounded-xl p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">Carico reale</p>
              <p className="mt-1 font-grotesk text-lg font-bold text-white">
                {loadSummary.weightedLoad}/{loadSummary.maxLoad}
              </p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">Slot pesanti</p>
              <p className="mt-1 font-grotesk text-lg font-bold text-white">
                {loadSummary.remainingImportantSlots} liberi
              </p>
            </div>
          </div>
          <p className="text-xs text-white/42">
            {loadSummary.message}
          </p>
          {nextTask ? (
            <Link
              to="/tomato"
              className="btn-cyber h-11 rounded-xl inline-flex items-center justify-center gap-2 text-xs"
            >
              Avvia focus
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setAssistantOpen(true)}
              className="btn-cyber h-11 rounded-xl inline-flex items-center justify-center gap-2 text-xs"
            >
              Chiedi aiuto
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      </section>

      <section className="glass-panel p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary/60">
              Strumenti avanzati
            </p>
            <h2 className="mt-1 font-grotesk text-xl font-bold text-white">
              Routine e Freeway OS
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-white/48">
              Se vuoi solo partire, usa i pulsanti sotto. Apri questa sezione quando vuoi calibrare routine, abitudini e focus shield.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSystemPanels((value) => !value)}
            className="glass inline-flex h-11 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white/65 transition-colors hover:text-primary"
          >
            {showSystemPanels ? 'Nascondi' : 'Apri strumenti'}
          </button>
        </div>
      </section>

      <AnimatePresence initial={false}>
        {showSystemPanels && (
          <motion.div
            className="space-y-4 sm:space-y-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <DayByDayPanel />
            <OperatingSystemPanel />
          </motion.div>
        )}
      </AnimatePresence>

      <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.label} {...stat} delay={0.14 + index * 0.04} />
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-grotesk font-semibold text-foreground flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-primary" />
            Cosa vuoi aprire?
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary/45">
            Ordine pratico
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {actionCards.map((action, index) => {
            const CardIcon = action.icon;
            const cardContent = (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 transition-all group-hover:glow-emerald sm:h-10 sm:w-10">
                    <CardIcon className="h-[1.125rem] w-[1.125rem] text-primary sm:h-5 sm:w-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="font-grotesk text-sm font-semibold text-foreground sm:text-base">{action.title}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground sm:text-xs sm:leading-relaxed">{action.description}</p>
                </div>
              </>
            );

            return (
              <motion.div
                key={action.to || action.action}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 + index * 0.035 }}
              >
                {action.action === 'assistant' ? (
                  <button
                    type="button"
                    onClick={() => setAssistantOpen(true)}
                    className="glass flex min-h-[112px] w-full flex-col justify-between rounded-2xl p-3 text-left transition-colors hover:border-primary/20 hover:bg-primary/5 sm:min-h-[132px] sm:p-4 group"
                  >
                    {cardContent}
                  </button>
                ) : (
                  <Link
                    to={action.to}
                    className="glass flex min-h-[112px] flex-col justify-between rounded-2xl p-3 transition-colors hover:border-primary/20 hover:bg-primary/5 sm:min-h-[132px] sm:p-4 group"
                  >
                    {cardContent}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {dashboardError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {dashboardError.message || 'Non riesco ad aggiornare la dashboard.'}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="glass rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-grotesk font-semibold text-foreground flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-primary" />
              Timeline di oggi
            </h2>
            <Link to="/calendar" className="text-xs text-primary hover:underline font-medium">
                  Apri calendario
            </Link>
          </div>

          {dataLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-12 rounded-xl bg-secondary/45 animate-pulse" />
              ))}
            </div>
          ) : todayTimeline.length === 0 ? (
            <div className="rounded-xl bg-secondary/35 p-4 text-sm text-muted-foreground">
              Nessun evento utile in timeline. Piano, sveglie e timer sono pronti.
            </div>
          ) : (
            <div className="space-y-2">
              {todayTimeline.map((item) => {
                const ItemIcon = item.icon;
                return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black/20 ${item.accent}`}>
                    <ItemIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <span className="text-xs font-mono text-primary/80">{item.when}</span>
                </div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="glass rounded-2xl p-5 space-y-3"
        >
          <h2 className="font-grotesk font-semibold text-foreground flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            Sessioni recenti
          </h2>

          {dataLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-12 rounded-xl bg-secondary/45 animate-pulse" />
              ))}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="rounded-xl bg-secondary/35 p-4 text-sm text-muted-foreground">
              Nessuna sessione registrata. Una da 15 minuti basta per partire.
            </div>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/50"
                >
                  <span className="text-sm font-medium text-foreground truncate">
                    {session.task_title || 'Sessione Focus'}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-muted-foreground">{session.duration_minutes} min</span>
                    {session.completed && (
                      <span className="text-xs font-mono text-primary">+{session.xp_earned || 0}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      <AppAssistantChat
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        profile={profile}
      />
    </PageShell>
  );
}
