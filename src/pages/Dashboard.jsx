import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import useUserProfile from '@/hooks/useUserProfile';
import XPBar from '@/components/shared/XPBar';
import StatCard from '@/components/shared/StatCard';
import {
  Brain,
  CalendarDays,
  ChevronRight,
  Flame,
  ListTodo,
  Palette,
  Target,
  Timer,
  Zap,
} from 'lucide-react';

const actionCards = [
  {
    to: '/tomato',
    icon: Timer,
    title: 'Tomato',
    description: 'Avvia una sessione focus',
  },
  {
    to: '/planner',
    icon: ListTodo,
    title: 'Planner',
    description: 'Svuota e ordina i task',
  },
  {
    to: '/calendar',
    icon: CalendarDays,
    title: 'Calendario',
    description: 'Guarda la settimana',
  },
  {
    to: '/braindump',
    icon: Brain,
    title: 'Dump',
    description: 'Libera la testa',
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
  const [todayTasks, setTodayTasks] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setDataLoading(true);
      try {
        const [tasks, sessions] = await Promise.all([
          base44.entities.Task.filter({ status: 'today' }, '-created_date', 5),
          base44.entities.FocusSession.list('-created_date', 5),
        ]);

        if (!ignore) {
          setTodayTasks(tasks || []);
          setRecentSessions(sessions || []);
        }
      } catch (error) {
        console.warn('Dashboard data unavailable:', error);
        if (!ignore) {
          setTodayTasks([]);
          setRecentSessions([]);
        }
      } finally {
        if (!ignore) setDataLoading(false);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const stats = useMemo(() => ([
    { icon: Timer, label: 'Focus totale', value: profile?.total_focus_minutes || 0, unit: 'min' },
    { icon: Target, label: 'Task completati', value: profile?.total_tasks_completed || 0 },
    { icon: Flame, label: 'Streak', value: profile?.streak_days || 0, unit: 'giorni' },
    { icon: Zap, label: 'XP totali', value: profile?.total_xp || 0 },
  ]), [profile]);

  const nextTask = todayTasks[0];

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-5">
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
              Focus <span className="text-primary text-glow">Hub</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tutto quello che ti serve oggi, senza casino.
            </p>
          </div>
        </div>

        <Link
          to="/themes"
          className="glass h-11 px-4 rounded-xl inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
        >
          <Palette className="w-4 h-4" />
          Temi
        </Link>
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
                Sync...
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
              {nextTask?.description || 'Apri il Planner o usa il Tomato per iniziare subito.'}
            </p>
          </div>
          <Link
            to={nextTask ? '/tomato' : '/planner'}
            className="btn-cyber h-11 rounded-xl inline-flex items-center justify-center gap-2 text-xs"
          >
            {nextTask ? 'Avvia focus' : 'Apri planner'}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <StatCard key={stat.label} {...stat} delay={0.14 + index * 0.04} />
        ))}
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {actionCards.map((action, index) => (
          <motion.div
            key={action.to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 + index * 0.04 }}
          >
            <Link
              to={action.to}
              className="glass rounded-2xl p-4 min-h-[132px] flex flex-col justify-between hover:bg-primary/5 hover:border-primary/20 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:glow-emerald transition-all">
                  <action.icon className="w-5 h-5 text-primary" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <h3 className="font-grotesk font-semibold text-foreground">{action.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </section>

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
    </div>
  );
}
