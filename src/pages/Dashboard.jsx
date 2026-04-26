import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import useUserProfile from '@/hooks/useUserProfile';
import XPBar from '@/components/shared/XPBar';
import StatCard from '@/components/shared/StatCard';
import { Timer, ListTodo, Brain, Zap, Flame, Target, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const { profile, loading } = useUserProfile();
  const [todayTasks, setTodayTasks] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);

  useEffect(() => {
    async function loadData() {
      const tasks = await base44.entities.Task.filter({ status: 'today' }, '-created_date', 5);
      setTodayTasks(tasks);
      const sessions = await base44.entities.FocusSession.list('-created_date', 5);
      setRecentSessions(sessions);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-3xl md:text-4xl font-grotesk font-bold text-foreground">
          Focus <span className="text-primary text-glow">Hub</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Il tuo quartier generale operativo
        </p>
      </motion.div>

      {/* XP Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-5"
      >
        <XPBar totalXP={profile?.total_xp} level={profile?.level} />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Timer} label="Focus totale" value={profile?.total_focus_minutes || 0} unit="min" delay={0.15} />
        <StatCard icon={Target} label="Task completati" value={profile?.total_tasks_completed || 0} delay={0.2} />
        <StatCard icon={Flame} label="Streak" value={profile?.streak_days || 0} unit="giorni" delay={0.25} />
        <StatCard icon={Zap} label="XP totali" value={profile?.total_xp || 0} delay={0.3} />
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="grid grid-cols-2 gap-3"
      >
        <Link to="/tomato">
          <div className="glass rounded-2xl p-5 hover:bg-primary/5 transition-colors group cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:glow-emerald transition-all">
                <Timer className="w-5 h-5 text-primary" />
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <h3 className="font-grotesk font-semibold text-foreground">Tomato Timer</h3>
            <p className="text-xs text-muted-foreground mt-1">Attiva Hyper Focus</p>
          </div>
        </Link>

        <Link to="/braindump">
          <div className="glass rounded-2xl p-5 hover:bg-primary/5 transition-colors group cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:glow-emerald transition-all">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <h3 className="font-grotesk font-semibold text-foreground">Brain Dump</h3>
            <p className="text-xs text-muted-foreground mt-1">Scarica i pensieri</p>
          </div>
        </Link>
      </motion.div>

      {/* Today's Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-2xl p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-grotesk font-semibold text-foreground flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-primary" />
            Task di Oggi
          </h2>
          <Link to="/planner" className="text-xs text-primary hover:underline font-medium">
            Vedi tutti
          </Link>
        </div>
        {todayTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nessun task per oggi. Aggiungine dal Planner!
          </p>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${
                  task.priority === 'critical' ? 'bg-destructive' :
                  task.priority === 'high' ? 'bg-chart-5' :
                  task.priority === 'medium' ? 'bg-primary' : 'bg-muted-foreground'
                }`} />
                <span className="text-sm font-medium text-foreground flex-1 truncate">{task.title}</span>
                <span className="text-xs font-mono text-primary">+{task.xp_value || 25} XP</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass rounded-2xl p-5 space-y-3"
        >
          <h2 className="font-grotesk font-semibold text-foreground flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            Sessioni Recenti
          </h2>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {session.task_title || 'Sessione Focus'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">{session.duration_minutes} min</span>
                  {session.completed && (
                    <span className="text-xs font-mono text-primary">+{session.xp_earned || 0} XP</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
