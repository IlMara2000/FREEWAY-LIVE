import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { accountData } from '@/api/accountDataClient';
import { buildCalendarTaskPayload, invalidateTaskViews } from '@/lib/task-workflows';
import { useQueryClient } from '@tanstack/react-query';

export default function CreateTaskModal({ date, onClose, onRefetch }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!date) return;
    setTitle('');
    setDescription('');
    setPriority('medium');
    setSaving(false);
    setError('');
  }, [date]);

  if (!date) return null;

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError('');

    try {
      await accountData.tasks.create(buildCalendarTaskPayload({
        title: title.trim(),
        description: description.trim(),
        priority,
        date,
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

          <div>
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

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrizione (opzionale)..."
            rows={3}
            className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl p-4 font-grotesk text-sm text-white outline-none transition-all placeholder:text-white/25 resize-none"
          />

          {/* Priority */}
          <div className="flex gap-2">
            {['low', 'medium', 'high', 'critical'].map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`flex-1 py-2 rounded-xl font-mono text-[10px] uppercase tracking-wider transition-all ${
                  priority === p
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                    : 'border border-white/10 text-white/40 hover:text-white/70'
                }`}
              >
                {p === 'low' ? 'Bassa' : p === 'medium' ? 'Media' : p === 'high' ? 'Alta' : '🔥'}
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
