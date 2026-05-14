import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness, Calculator, Clock, Euro, TrendingUp } from 'lucide-react';
import { accountData } from '@/api/accountDataClient';
import { normalizeList } from '@/lib/normalize-list';
import {
  formatCurrency,
  formatDuration,
  formatMonthLabel,
  getMonthKey,
  getTaskDurationHours,
  getWorkColor,
} from '@/lib/work-utils';

const RATE_KEY = 'fw_work_hourly_rate';

export default function Work() {
  const [hourlyRate, setHourlyRate] = useState(() => localStorage.getItem(RATE_KEY) || '10');

  const { data: taskResponse = [], isLoading } = useQuery({
    queryKey: ['work-tasks'],
    queryFn: () => accountData.tasks.list('-due_date', 300),
  });

  const workTasks = normalizeList(taskResponse)
    .filter((task) => task.task_type === 'work')
    .sort((a, b) => (b.due_date || '').localeCompare(a.due_date || '') || (a.start_time || '').localeCompare(b.start_time || ''));

  const monthlyRows = useMemo(() => {
    const map = new Map();
    workTasks.forEach((task) => {
      const key = getMonthKey(task.due_date);
      const current = map.get(key) || { monthKey: key, tasks: [], hours: 0 };
      current.tasks.push(task);
      current.hours += getTaskDurationHours(task);
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [workTasks]);

  const rate = Number(hourlyRate) || 0;
  const totalHours = monthlyRows.reduce((sum, row) => sum + row.hours, 0);
  const totalEarnings = totalHours * rate;

  const updateRate = (value) => {
    setHourlyRate(value);
    localStorage.setItem(RATE_KEY, value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto space-y-5"
    >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] text-emerald-400/60 uppercase tracking-widest mb-1">Report lavoro</p>
          <h1 className="font-grotesk text-3xl md:text-5xl font-black text-white text-glow leading-none">
            Lavoro
          </h1>
          <p className="text-sm text-white/45 mt-2">
            Ore mensili collegate alle task segnate come lavoro.
          </p>
        </div>

        <label className="glass rounded-2xl p-3 flex items-center gap-3 w-full lg:w-auto">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-300">
            <Euro className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="block font-mono text-[10px] text-white/35 uppercase tracking-widest">Euro / ora</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={hourlyRate}
              onChange={(event) => updateRate(event.target.value)}
              className="w-full lg:w-36 bg-transparent font-grotesk text-2xl font-bold text-white outline-none"
            />
          </div>
        </label>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: BriefcaseBusiness, label: 'Turni', value: workTasks.length },
          { icon: Clock, label: 'Ore totali', value: formatDuration(totalHours) },
          { icon: Euro, label: 'Stima', value: formatCurrency(totalEarnings) },
          { icon: TrendingUp, label: 'Media mese', value: formatDuration(monthlyRows.length ? totalHours / monthlyRows.length : 0) },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + index * 0.04 }}
            className="glass-panel p-4"
          >
            <item.icon className="w-4 h-4 text-emerald-300 mb-4" />
            <p className="font-mono text-[10px] text-white/35 uppercase tracking-widest">{item.label}</p>
            <p className="font-grotesk text-xl md:text-2xl font-bold text-white mt-1 truncate">{item.value}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr] items-start">
        <div className="glass-panel p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-grotesk text-xl font-bold text-white">Mesi</h2>
            <Calculator className="w-4 h-4 text-emerald-300/70" />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => <div key={item} className="h-16 rounded-2xl bg-white/5 animate-pulse" />)}
            </div>
          ) : monthlyRows.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.035] border border-white/[0.06] p-4 text-sm text-white/42">
              Nessuna task collegata a lavoro. Creane una dal Calendario selezionando "Lavoro".
            </div>
          ) : (
            <div className="space-y-2">
              {monthlyRows.map((row) => (
                <div key={row.monthKey} className="rounded-2xl bg-white/[0.035] border border-white/[0.07] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-grotesk text-base font-semibold text-white capitalize">{formatMonthLabel(row.monthKey)}</p>
                      <p className="font-mono text-[10px] text-white/35 uppercase tracking-widest mt-1">{row.tasks.length} turni</p>
                    </div>
                    <div className="text-right">
                      <p className="font-grotesk text-lg font-bold text-emerald-200">{formatDuration(row.hours)}</p>
                      <p className="font-mono text-[10px] text-white/45">{formatCurrency(row.hours * rate)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-panel p-4 md:p-5 space-y-3">
          <h2 className="font-grotesk text-xl font-bold text-white">Turni collegati</h2>
          {workTasks.length === 0 ? (
            <div className="rounded-2xl bg-white/[0.035] border border-white/[0.06] p-4 text-sm text-white/42">
              I turni appariranno qui appena li colleghi a lavoro.
            </div>
          ) : (
            <div className="space-y-2 max-h-[620px] overflow-auto pr-1">
              {workTasks.map((task) => {
                const colors = getWorkColor(task.priority);
                const hours = getTaskDurationHours(task);
                return (
                  <div key={task.id} className={`rounded-2xl border border-white/10 bg-gradient-to-r ${colors.rail} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-grotesk text-sm font-semibold text-white truncate">{task.title}</p>
                        <p className="font-mono text-[10px] text-white/45 mt-1">
                          {task.due_date || 'Senza data'} - {task.start_time || '--:--'} / {task.end_time || '--:--'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-xs text-emerald-200">{formatDuration(hours)}</p>
                        <p className="font-mono text-[10px] text-white/45">{formatCurrency(hours * rate)}</p>
                      </div>
                    </div>
                    {task.description && <p className="text-xs text-white/45 mt-2 line-clamp-2">{task.description}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
