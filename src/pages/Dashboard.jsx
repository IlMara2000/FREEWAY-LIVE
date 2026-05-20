import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { accountData } from '@/api/accountDataClient';
import { normalizeList } from '@/lib/normalize-list';
import useUserProfile from '@/hooks/useUserProfile';
import XPBar from '@/components/shared/XPBar';
import StatCard from '@/components/shared/StatCard';
import PageShell from '@/components/shared/PageShell';
import DayByDayPanel from '@/components/daybyday/DayByDayPanel';
import AppAssistantChat from '@/components/assistant/AppAssistantChat';
import {
  AlarmClock,
  Brain,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  Flame,
  LayoutDashboard,
  ListTodo,
  MessageCircle,
  Palette,
  Target,
  Timer,
  Zap,
} from 'lucide-react';

const actionCards = [
  {
    action: 'assistant',
    icon: MessageCircle,
    title: 'Chat Bot',
    description: 'Scrivi cosa ti serve. Prepara task, eventi, memo o sveglie.',
  },
  {
    to: '/calendar',
    icon: CalendarDays,
    title: 'Calendar',
    description: 'Giorni, appuntamenti e memo.',
  },
  {
    to: '/planner',
    icon: ListTodo,
    title: 'Planner',
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
    title: 'Brain Dump',
    description: 'Svuota la testa e crea memo.',
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

export default function Dashboard() {
  const { profile, loading } = useUserProfile();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const {
    data: dashboardData = { todayTasks: [], recentSessions: [] },
    isLoading: dataLoading,
    error: dashboardError,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [tasks, sessions] = await Promise.all([
        accountData.tasks.filter({ status: 'today' }, '-created_date', 5),
        accountData.focusSessions.list('-created_date', 5),
      ]);

      return {
        todayTasks: normalizeList(tasks),
        recentSessions: normalizeList(sessions),
      };
    },
  });
  const { todayTasks, recentSessions } = dashboardData;

  const stats = useMemo(() => ([
    { icon: Timer, label: 'Focus totale', value: profile?.total_focus_minutes || 0, unit: 'min' },
    { icon: Target, label: 'Task completati', value: profile?.total_tasks_completed || 0 },
    { icon: Flame, label: 'Streak', value: profile?.streak_days || 0, unit: 'giorni' },
    { icon: Zap, label: 'XP totali', value: profile?.total_xp || 0 },
  ]), [profile]);

  const nextTask = todayTasks[0];

  return (
    <PageShell maxWidth="max-w-5xl" contentClassName="space-y-5">
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
      >
        <div className="space-y-2">
          <p className="font-mono text-[11px] text-primary/70 uppercase tracking-widest">
            {formatToday()}
          </p>
          <div>
            <h1 className="text-3xl md:text-5xl font-grotesk font-bold text-foreground">
              Space <span className="text-primary text-glow">Hub</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Il punto di partenza: chiedi, pianifica, lavora, scarica la testa.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="btn-cyber h-11 rounded-xl px-4 inline-flex items-center justify-center gap-2 text-xs"
          >
            <MessageCircle className="w-4 h-4" />
            Chat Bot
          </button>
          <Link
            to="/themes"
            className="glass h-11 rounded-xl px-4 inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
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
          className="glass-panel p-5 md:p-6 space-y-5"
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="glass-panel p-5 md:p-6 flex flex-col justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="font-mono text-[10px] text-primary/60 uppercase tracking-widest">
              Prossima mossa
            </p>
            <h2 className="font-grotesk font-semibold text-xl text-foreground">
              {nextTask?.title || 'Scegli un task e parti leggero'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {nextTask?.description || 'Apri il Planner o chiedi al Chat Bot di prepararti una partenza semplice.'}
            </p>
          </div>
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

      <DayByDayPanel />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actionCards.map((action, index) => {
            const CardIcon = action.icon;
            const cardContent = (
              <>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:glow-emerald transition-all">
                    <CardIcon className="w-5 h-5 text-primary" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="font-grotesk font-semibold text-foreground">{action.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{action.description}</p>
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
                    className="glass w-full rounded-2xl p-4 min-h-[132px] flex flex-col justify-between text-left hover:bg-primary/5 hover:border-primary/20 transition-colors group"
                  >
                    {cardContent}
                  </button>
                ) : (
                  <Link
                    to={action.to}
                    className="glass rounded-2xl p-4 min-h-[132px] flex flex-col justify-between hover:bg-primary/5 hover:border-primary/20 transition-colors group"
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
              <ListTodo className="w-4 h-4 text-primary" />
              Task di oggi
            </h2>
            <Link to="/planner" className="text-xs text-primary hover:underline font-medium">
              Vedi tutti
            </Link>
          </div>

          {dataLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-12 rounded-xl bg-secondary/45 animate-pulse" />
              ))}
            </div>
          ) : todayTasks.length === 0 ? (
            <div className="rounded-xl bg-secondary/35 p-4 text-sm text-muted-foreground">
              Nessun task per oggi. Il Planner e' pronto quando vuoi.
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${priorityClass[task.priority] || priorityClass.low}`} />
                  <span className="text-sm font-medium text-foreground flex-1 truncate">{task.title}</span>
                  <span className="text-xs font-mono text-primary">+{task.xp_value || 25} XP</span>
                </div>
              ))}
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
