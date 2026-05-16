import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BriefcaseBusiness, Clock, Plus, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { accountData } from '@/api/accountDataClient';
import { buildCalendarTaskPayload, invalidateTaskViews } from '@/lib/task-workflows';
import { getAntiChaosMessage } from '@/lib/day-by-day';

export default function CreateTaskModal({ date, existingTasksForDate = [], onClose, onRefetch }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [taskType, setTaskType] = useState('task');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!date) return;
    setTitle('');
    setDescription('');
    setPriority('medium');
    setStartTime('09:00');
    setEndTime('17:00');
    setTaskType('task');
    setSaving(false);
    setError('');
  }, [date]);

  if (!date) return null;

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError('');

    const warning = getAntiChaosMessage(existingTasksForDate, {
      title,
      description,
      priority,
      status: 'today',
      task_type: taskType,
    });

    if (warning) {
      setError(warning);
      setSaving(false);
      return;
    }

    try {
      await accountData.tasks.create(buildCalendarTaskPayload({
        title: title.trim(),
        description: description.trim() || (taskType === 'work' ? 'Turno di lavoro' : 'Nessuna descrizione'),
        priority,
        date,
        start_time: startTime,
        end_time: endTime,
        task_type: taskType,
      }));
      invalidateTaskViews(queryClient);
      await onRefetch?.();
      onClose();
    } catch (err) {
      setError(err?.message || 'Non riesco a creare la task. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative z-10 w-full max-w-md glass-panel p-6 space-y-5"
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white">
            <X className="w-5 h-5" />
          </button>

          <div className="pr-8">
            <p className="font-mono text-[10px] text-emerald-400/60 uppercase tracking-widest mb-1">Nuova Task</p>
            <p className="font-mono text-xs text-white/40">{date}</p>
          </div>

          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome della task..."
            className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl p-4 font-grotesk text-sm text-white outline-none transition-all placeholder:text-white/25"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/35 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Inizio
              </span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3 py-3 font-mono text-sm text-white outline-none transition-all"
              />
            </label>
            <label className="space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/35 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Fine
              </span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3 py-3 font-mono text-sm text-white outline-none transition-all"
              />
            </label>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrizione (se vuota la compilo io)..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl p-4 font-grotesk text-sm text-white outline-none transition-all placeholder:text-white/25 resize-none"
          />

          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.03] border border-white/10">
            {[
              { value: 'task', label: 'Task' },
              { value: 'work', label: 'Lavoro' },
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setTaskType(type.value)}
                className={`h-10 rounded-xl font-mono text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  taskType === type.value
                    ? 'bg-emerald-500/20 border border-emerald-500/45 text-emerald-300'
                    : 'text-white/40 hover:text-white/75'
                }`}
              >
                {type.value === 'work' && <BriefcaseBusiness className="w-3.5 h-3.5" />}
                {type.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {['low', 'medium', 'high', 'critical'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex-1 py-2 rounded-xl font-mono text-[10px] uppercase tracking-wider transition-all ${
                  priority === p
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                    : 'border border-white/10 text-white/40 hover:text-white/70'
                }`}
              >
                {p === 'low' ? 'Bassa' : p === 'medium' ? 'Media' : p === 'high' ? 'Alta' : 'Critica'}
              </button>
            ))}
          </div>

          {error && (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 font-mono text-[11px] text-red-200">
              {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="btn-cyber w-full py-3 rounded-2xl font-mono text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'SALVATAGGIO...' : 'CREA TASK'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
