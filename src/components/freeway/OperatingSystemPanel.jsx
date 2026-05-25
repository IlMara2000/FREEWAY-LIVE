import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Clock3,
  Footprints,
  Gamepad2,
  ListChecks,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
} from 'lucide-react';
import { accountData } from '@/api/accountDataClient';
import { normalizeList } from '@/lib/normalize-list';
import {
  FREEWAY_OS_HABITS,
  FREEWAY_OS_ROUTINES,
  addRoutineRun,
  getAreaSignals,
  getFreewayOSSummary,
  getHabitStreak,
  isHabitDoneToday,
  normalizeFreewayOS,
  patchFocusShield,
  toggleHabitForToday,
} from '@/lib/freeway-os';
import { getTodayKey } from '@/lib/day-by-day';
import useUserProfile from '@/hooks/useUserProfile';

const formatSeconds = (seconds) => {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const rest = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${rest}`;
};

const getAreaColor = (state) => ({
  urgente: 'from-red-400/75 to-orange-300/60 text-red-100',
  attenzione: 'from-amber-300/75 to-emerald-300/55 text-amber-100',
  stabile: 'from-emerald-300/80 to-cyan-200/55 text-emerald-100',
}[state] || 'from-white/40 to-white/20 text-white/70');

export default function OperatingSystemPanel() {
  const { profile, loading, saveProfile, addXP } = useUserProfile();
  const [busy, setBusy] = useState(false);
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [runnerActive, setRunnerActive] = useState(false);
  const [message, setMessage] = useState('');
  const todayKey = getTodayKey();

  const freewayOS = useMemo(() => normalizeFreewayOS(profile?.freeway_os), [profile?.freeway_os]);

  const { data: taskResponse = [] } = useQuery({
    queryKey: ['freeway-os-tasks'],
    queryFn: () => accountData.tasks.list('-created_date', 250),
  });
  const tasks = normalizeList(taskResponse);
  const summary = getFreewayOSSummary({ freewayOS, tasks, todayKey });
  const areaSignals = getAreaSignals({ freewayOS, tasks, todayKey });

  const persistOS = async (nextOS) => {
    if (!profile || !saveProfile) return;
    await saveProfile({
      ...profile,
      freeway_os: nextOS,
    });
  };

  const toggleHabit = async (habit) => {
    if (busy || !profile) return;
    setBusy(true);
    setMessage('');

    try {
      const { next, completed } = toggleHabitForToday(freewayOS, habit.id, todayKey);
      await persistOS(next);
      if (completed) {
        await addXP(habit.xp);
        setMessage(`+${habit.xp} XP. ${habit.title} segnato.`);
      } else {
        setMessage(`${habit.title} tolto da oggi.`);
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleShield = async (patch) => {
    if (busy || !profile) return;
    setBusy(true);
    try {
      await persistOS(patchFocusShield(freewayOS, patch));
    } finally {
      setBusy(false);
    }
  };

  const startRoutine = (routine) => {
    setActiveRoutine(routine);
    setActiveStep(0);
    setRemaining(routine.steps[0].minutes * 60);
    setRunnerActive(true);
    setMessage('');
  };

  const stopRoutine = () => {
    setRunnerActive(false);
    setActiveRoutine(null);
    setActiveStep(0);
    setRemaining(0);
  };

  const finishRoutine = async () => {
    if (!activeRoutine || !profile) {
      stopRoutine();
      return;
    }

    setBusy(true);
    try {
      await persistOS(addRoutineRun(freewayOS, activeRoutine.id, todayKey));
      await addXP(activeRoutine.xp);
      setMessage(`Routine chiusa. +${activeRoutine.xp} XP, senza fare teatro.`);
    } finally {
      setBusy(false);
      stopRoutine();
    }
  };

  const nextStep = () => {
    if (!activeRoutine) return;
    const nextIndex = activeStep + 1;

    if (nextIndex >= activeRoutine.steps.length) {
      finishRoutine();
      return;
    }

    setActiveStep(nextIndex);
    setRemaining(activeRoutine.steps[nextIndex].minutes * 60);
  };

  useEffect(() => {
    if (!runnerActive || !activeRoutine) return undefined;

    const interval = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(interval);
          window.setTimeout(nextStep, 0);
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [runnerActive, activeRoutine, activeStep]);

  if (loading || !profile) {
    return (
      <section className="glass-panel p-5">
        <div className="h-5 w-36 rounded-full bg-white/10 animate-pulse" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="glass-panel overflow-hidden p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/65">
            Freeway OS
          </p>
          <h2 className="font-grotesk text-2xl font-bold text-white">
            Tutto insieme, ma senza casino.
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-white/50">
            Routine, abitudini, focus e aree vita nello stesso posto. Se il sistema pesa, non e' il sistema giusto.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="glass rounded-xl p-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-white/35">Habits</p>
            <p className="mt-1 font-grotesk text-xl font-bold text-white">{summary.habitProgress}%</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-white/35">Area</p>
            <p className="mt-1 truncate font-grotesk text-xl font-bold text-white">{summary.weakestArea?.label}</p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-white/35">Oggi</p>
            <p className="mt-1 font-grotesk text-xl font-bold text-white">{summary.timeline.length}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {FREEWAY_OS_HABITS.map((habit) => {
              const done = isHabitDoneToday(freewayOS, habit.id, todayKey);
              const streak = getHabitStreak(freewayOS.habits[habit.id], todayKey);

              return (
                <button
                  key={habit.id}
                  type="button"
                  disabled={busy}
                  onClick={() => toggleHabit(habit)}
                  className={`group min-h-[96px] rounded-2xl border p-3 text-left transition-all disabled:opacity-60 ${
                    done
                      ? 'border-emerald-300/32 bg-emerald-400/12 shadow-[0_18px_45px_rgba(16,185,129,0.08)]'
                      : 'border-white/10 bg-black/20 hover:border-emerald-300/24 hover:bg-white/[0.045]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {done ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-white/25 group-hover:text-emerald-200" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-grotesk text-sm font-bold text-white">{habit.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-white/45">{habit.cue}</span>
                      <span className="mt-2 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-emerald-300/65">
                        <Trophy className="h-3.5 w-3.5" />
                        {streak}g streak / +{habit.xp} XP
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">
                  Focus shield
                </p>
                <p className="mt-1 text-sm text-white/48">
                  Blocco morbido stile focus app: non puo chiuderti i social da PWA, ma ti mette attrito.
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-300/70" />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                ['enabled', 'Shield', Lock],
                ['phoneAway', 'Telefono lontano', Footprints],
                ['rewardAfterFocus', 'Reward dopo', Gamepad2],
              ].map(([key, label, Icon]) => {
                const active = Boolean(freewayOS.focusShield[key]);

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleShield({ [key]: !active })}
                    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-emerald-300/35 bg-emerald-400/12 text-emerald-100'
                        : 'border-white/10 bg-white/[0.035] text-white/45 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">
                  Routine runner
                </p>
                <h3 className="font-grotesk text-lg font-bold text-white">
                  {activeRoutine ? activeRoutine.title : 'Scegli una sequenza'}
                </h3>
              </div>
              <Timer className="h-5 w-5 text-emerald-300/70" />
            </div>

            {activeRoutine ? (
              <div className="mt-3 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.055] p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-300/70">
                  Step {activeStep + 1}/{activeRoutine.steps.length}
                </p>
                <p className="mt-1 font-grotesk text-lg font-bold text-white">
                  {activeRoutine.steps[activeStep]?.title}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-3xl font-bold text-white">{formatSeconds(remaining)}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={nextStep}
                      className="glass h-10 rounded-xl px-3 text-xs font-semibold text-white/70 hover:text-emerald-300"
                    >
                      Salta
                    </button>
                    <button
                      type="button"
                      onClick={stopRoutine}
                      className="glass h-10 rounded-xl px-3 text-xs font-semibold text-white/48 hover:text-red-200"
                    >
                      Stop
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {FREEWAY_OS_ROUTINES.map((routine) => (
                  <button
                    key={routine.id}
                    type="button"
                    onClick={() => startRoutine(routine)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition-colors hover:border-emerald-300/24 hover:bg-emerald-400/[0.055]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-300/18 bg-emerald-400/10 text-emerald-200">
                      <Play className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-grotesk text-sm font-bold text-white">{routine.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-white/42">{routine.description}</span>
                    </span>
                    <span className="font-mono text-[10px] text-emerald-300/60">+{routine.xp}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">
                Aree vita
              </p>
              <ListChecks className="h-4 w-4 text-emerald-300/70" />
            </div>
            <div className="grid gap-2">
              {areaSignals.slice(0, 4).map((area) => (
                <div key={area.id} className="rounded-xl border border-white/[0.08] bg-white/[0.028] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-grotesk text-sm font-bold text-white">{area.label}</p>
                      <p className="truncate text-xs text-white/38">{area.openCount} aperte - {area.state}</p>
                    </div>
                    <span className={`font-mono text-xs font-bold ${getAreaColor(area.state).split(' ').at(-1)}`}>
                      {area.score}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${getAreaColor(area.state).replace(/ text-\S+$/, '')}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${area.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="rounded-2xl border border-cyan-200/12 bg-cyan-300/[0.045] p-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-200/55">Prossima mossa</p>
          <p className="mt-1 text-sm font-semibold text-white/78">{summary.nextMove}</p>
        </div>
        <Link
          to="/calendar"
          className="glass inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white/70 hover:text-emerald-300"
        >
          <Clock3 className="h-4 w-4" />
          Apri timeline
        </Link>
      </div>

      {message && (
        <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.06] p-3 text-sm text-emerald-50/75">
          <span className="inline-flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            {message}
          </span>
        </div>
      )}
    </section>
  );
}
