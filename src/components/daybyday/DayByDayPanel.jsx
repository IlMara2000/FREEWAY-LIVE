import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Circle,
  RotateCcw,
  Settings2,
  Sparkles,
  Target,
} from 'lucide-react';
import { accountData } from '@/api/accountDataClient';
import { normalizeList } from '@/lib/normalize-list';
import {
  DAY_BY_DAY_SECTIONS,
  generateDayByDayRoutine,
  getReflectionMessage,
  getTodayKey,
  isImportantTask,
  normalizeDayByDayProfile,
  scoreDayByDay,
} from '@/lib/day-by-day';
import { buildTaskPayload, invalidateTaskViews } from '@/lib/task-workflows';
import useUserProfile from '@/hooks/useUserProfile';
import EnergySelector from '@/components/daybyday/EnergySelector';
import DayByDaySetup from '@/components/daybyday/DayByDaySetup';

const getTodayRoutineTasks = (tasks, todayKey) =>
  tasks
    .filter((task) => task.day_by_day && task.due_date === todayKey)
    .sort((left, right) => {
      const leftIndex = DAY_BY_DAY_SECTIONS.indexOf(left.day_by_day_section);
      const rightIndex = DAY_BY_DAY_SECTIONS.indexOf(right.day_by_day_section);
      return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex);
    });

const groupBySection = (tasks) =>
  tasks.reduce((acc, task) => {
    const section = task.day_by_day_section || 'Routine';
    acc[section] = acc[section] || [];
    acc[section].push(task);
    return acc;
  }, {});

export default function DayByDayPanel() {
  const { profile, loading, saveProfile } = useUserProfile();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [reflection, setReflection] = useState('');

  const settings = useMemo(
    () => normalizeDayByDayProfile(profile?.day_by_day),
    [profile?.day_by_day]
  );
  const todayKey = getTodayKey();
  const [energy, setEnergy] = useState(settings.currentEnergy || 'medium');

  useEffect(() => {
    setEnergy(settings.currentEnergy || 'medium');
  }, [settings.currentEnergy]);

  const { data: taskResponse = [], isLoading: tasksLoading, refetch } = useQuery({
    queryKey: ['day-by-day-tasks'],
    queryFn: () => accountData.tasks.list('-created_date', 300),
  });
  const tasks = normalizeList(taskResponse);
  const todayRoutineTasks = getTodayRoutineTasks(tasks, todayKey);
  const routineBySection = groupBySection(todayRoutineTasks);
  const stats = scoreDayByDay({ tasks, history: settings.history });
  const configured = Boolean(settings.configured);

  const saveDayByDaySettings = async (nextSettings) => {
    if (!profile || !saveProfile) return;
    await saveProfile({
      ...profile,
      day_by_day: {
        ...settings,
        ...nextSettings,
      },
    });
  };

  const handleEnergyChange = async (nextEnergy) => {
    setEnergy(nextEnergy);
    setMessage('');
    await saveDayByDaySettings({
      currentEnergy: nextEnergy,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveSetup = async (nextSettings) => {
    setBusy(true);
    setMessage('');
    try {
      await saveDayByDaySettings({
        ...nextSettings,
        currentEnergy: energy,
      });
      setSetupOpen(false);
      setMessage('Calibrazione salvata. Da qui in poi la giornata si adatta a te.');
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateRoutine = async () => {
    if (todayRoutineTasks.length > 0 || busy) {
      setMessage('La routine di oggi esiste gia. Resetta la giornata se vuoi rigenerarla.');
      return;
    }

    setBusy(true);
    setMessage('');
    setReflection('');

    try {
      const todayActiveTasks = tasks.filter((task) =>
        task.status !== 'done' && (task.due_date === todayKey || (!task.due_date && task.status === 'today'))
      );
      const existingImportant = todayActiveTasks.filter(isImportantTask);
      const routine = generateDayByDayRoutine(settings, energy);
      let routineTasks = routine.tasks;

      if (existingImportant.length >= 3) {
        routineTasks = routineTasks.filter((task) => !isImportantTask(task)).slice(0, 4);
        setMessage('Hai gia 3 task importanti oggi. Creo solo supporto leggero: niente altro peso.');
      } else {
        setMessage(routine.message);
      }

      await Promise.all(routineTasks.map((task) =>
        accountData.tasks.create(buildTaskPayload({
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: 'today',
          due_date: todayKey,
          day_by_day: true,
          day_by_day_date: todayKey,
          day_by_day_section: task.section,
          day_by_day_area: task.area,
          day_by_day_weight: task.weight,
          source: 'day-by-day',
        }))
      ));

      await saveDayByDaySettings({
        currentEnergy: energy,
        lastGeneratedDate: todayKey,
        updatedAt: new Date().toISOString(),
      });

      invalidateTaskViews(queryClient);
      await refetch();
    } catch (error) {
      setMessage(error?.message || 'Non riesco a generare la routine. Riprova.');
    } finally {
      setBusy(false);
    }
  };

  const toggleTask = async (task) => {
    setBusy(true);
    try {
      await accountData.tasks.update(task.id, {
        status: task.status === 'done' ? 'today' : 'done',
      });
      invalidateTaskViews(queryClient);
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  const handleReflection = async (status) => {
    setBusy(true);
    try {
      if (status === 'completed' && todayRoutineTasks.length > 0) {
        await Promise.all(todayRoutineTasks.map((task) =>
          task.status === 'done'
            ? Promise.resolve(task)
            : accountData.tasks.update(task.id, { status: 'done' })
        ));
      }

      await saveDayByDaySettings({
        history: {
          ...settings.history,
          [todayKey]: {
            status,
            energy,
            savedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      });
      setReflection(getReflectionMessage(status));
      invalidateTaskViews(queryClient);
      await refetch();
    } finally {
      setBusy(false);
    }
  };

  const resetToday = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setReflection('');

    try {
      await Promise.all(todayRoutineTasks.map((task) => accountData.tasks.delete(task.id)));
      const nextHistory = { ...settings.history };
      delete nextHistory[todayKey];
      await saveDayByDaySettings({
        history: nextHistory,
        lastGeneratedDate: null,
        updatedAt: new Date().toISOString(),
      });
      invalidateTaskViews(queryClient);
      await refetch();
      setMessage('Giornata resettata. Riparti piu semplice.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="glass-panel min-h-[210px] p-5">
        <div className="h-5 w-36 rounded-full bg-white/10 animate-pulse" />
        <div className="mt-4 h-20 rounded-2xl bg-white/[0.04] animate-pulse" />
      </section>
    );
  }

  return (
    <section className="glass-panel p-4 md:p-5 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/65">
            Day by Day
          </p>
          <h2 className="font-grotesk text-2xl font-bold text-white">
            Routine di oggi
          </h2>
          <p className="max-w-2xl text-sm text-white/50">
            Piccoli blocchi, niente culto della motivazione. Prima stabilita, poi grandezza.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSetupOpen((value) => !value)}
            className="glass inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-white/65 hover:text-emerald-300"
          >
            <Settings2 className="h-4 w-4" />
            Setup
          </button>
          <Link
            to="/planner"
            className="glass inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-white/65 hover:text-emerald-300"
          >
            Piano
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {(!configured || setupOpen) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <DayByDaySetup
              value={settings}
              saving={busy}
              onSave={handleSaveSetup}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {configured && (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
                Energia di oggi
              </p>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">
                {todayKey}
              </span>
            </div>
            <EnergySelector value={energy} onChange={handleEnergyChange} disabled={busy} />
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            {[
              ['Streak', `${stats.streak}g`],
              ['Settimana', `${stats.weeklyPercentage}%`],
              ['Task saltato', stats.mostSkipped],
              ['Area debole', stats.weakArea],
            ].map(([label, value]) => (
              <div key={label} className="glass rounded-xl p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">{label}</p>
                <p className="mt-1 truncate font-grotesk text-lg font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.055] p-3 text-sm text-emerald-50/75">
            {stats.suggestion}
          </div>

          {todayRoutineTasks.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <h3 className="font-grotesk text-lg font-semibold text-white">
                    Nessuna routine generata oggi.
                  </h3>
                  <p className="text-sm text-white/45">
                    Genero massimo 1-3 task per area. Se stai caricando troppo, taglio.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGenerateRoutine}
                  className="btn-cyber inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  Genera oggi
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {DAY_BY_DAY_SECTIONS.filter((section) => routineBySection[section]?.length).map((section) => (
                <div key={section} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">
                    {section}
                  </p>
                  <div className="space-y-2">
                    {routineBySection[section].map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        disabled={busy}
                        onClick={() => toggleTask(task)}
                        className="flex w-full items-start gap-3 rounded-xl bg-white/[0.035] p-3 text-left transition-colors hover:bg-white/[0.06] disabled:opacity-60"
                      >
                        {task.status === 'done' ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-white/30" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-semibold ${task.status === 'done' ? 'text-white/35 line-through' : 'text-white/85'}`}>
                            {task.title}
                          </span>
                          {task.description && (
                            <span className="mt-1 block text-xs leading-relaxed text-white/38">
                              {task.description}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['completed', 'Completata'],
                    ['partial', 'Parziale'],
                    ['skipped', 'Saltata'],
                  ].map(([status, label]) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy}
                      onClick={() => handleReflection(status)}
                      className="glass min-h-10 rounded-xl px-2 text-xs font-semibold text-white/65 hover:text-emerald-300 disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={resetToday}
                  className="glass inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-white/50 hover:text-red-300 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>
          )}

          {(message || reflection) && (
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm text-white/60">
              <span className="inline-flex items-start gap-2">
                <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                {reflection || message}
              </span>
            </div>
          )}
        </>
      )}

      {!configured && (
        <div className="rounded-xl border border-orange-300/25 bg-orange-400/10 p-3 text-sm text-orange-50/75">
          <span className="inline-flex items-start gap-2">
            <Target className="mt-0.5 h-4 w-4 shrink-0" />
            Compila la calibrazione una volta. Poi la routine si genera giorno per giorno.
          </span>
        </div>
      )}

      {tasksLoading && configured && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
          Aggiorno routine...
        </p>
      )}
    </section>
  );
}
