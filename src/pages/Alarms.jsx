// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlarmClock, Bell, Plus, Trash2 } from 'lucide-react';
import { accountData } from '@/api/accountDataClient';
import { normalizeList } from '@/lib/normalize-list';
import PageShell from '@/components/shared/PageShell';

export default function Alarms() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('Sveglia');
  const [time, setTime] = useState('09:00');
  const [date, setDate] = useState('');
  const [reminder, setReminder] = useState('');
  const [error, setError] = useState('');

  const { data = [] } = useQuery({
    queryKey: ['alarms'],
    queryFn: () => accountData.alarms.list('time', 100),
  });
  const alarms = normalizeList(data);

  useEffect(() => {
    setError('');
  }, [title, time, date, reminder]);

  const createMutation = useMutation({
    mutationFn: () => accountData.alarms.create({
      title: title.trim() || 'Sveglia',
      time,
      date,
      repeat: date ? 'none' : 'daily',
      reminder_text: reminder.trim(),
      enabled: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alarms'] });
      setTitle('Sveglia');
      setReminder('');
    },
    onError: (err) => setError(err?.message || 'Non riesco a salvare la sveglia.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }) => accountData.alarms.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alarms'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => accountData.alarms.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alarms'] }),
  });

  const handleCreate = (event) => {
    event.preventDefault();
    if (!time) {
      setError('Metti un orario valido.');
      return;
    }
    createMutation.mutate();
  };

  return (
    <PageShell maxWidth="max-w-4xl" contentClassName="space-y-5">
      <header className="pt-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-300/60">Promemoria</p>
        <h1 className="mt-1 font-grotesk text-4xl font-black text-white text-glow">Sveglie</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/48">
          Imposta allarmi locali legati o meno ai promemoria. Le notifiche partono solo se hai dato consenso al browser.
        </p>
      </header>

      <motion.form
        onSubmit={handleCreate}
        className="glass-panel grid gap-3 p-4 md:grid-cols-[1fr_140px_160px_auto] md:items-end"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">Titolo</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-emerald-300/45"
          />
        </label>
        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">Ora</span>
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 font-mono text-sm text-white outline-none focus:border-emerald-300/45"
          />
        </label>
        <label className="space-y-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">Data opzionale</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 font-mono text-sm text-white outline-none focus:border-emerald-300/45"
          />
        </label>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="btn-cyber h-12 rounded-xl px-4 text-xs disabled:opacity-45"
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Aggiungi
          </span>
        </button>
        <label className="space-y-1.5 md:col-span-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">Promemoria opzionale</span>
          <input
            value={reminder}
            onChange={(event) => setReminder(event.target.value)}
            placeholder="Es: apri il calendario e guarda i task di oggi"
            className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-emerald-300/45"
          />
        </label>
      </motion.form>

      {error && (
        <p className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>
      )}

      <section className="space-y-3">
        {alarms.map((alarm, index) => (
          <motion.div
            key={alarm.id}
            className="glass-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.035 }}
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-300/18 bg-emerald-400/10 text-emerald-200">
              <AlarmClock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-grotesk text-lg font-bold text-white">{alarm.title}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-white/42">
                <span>{alarm.time}</span>
                <span>{alarm.date || 'Ogni giorno'}</span>
                {alarm.reminder_text && <span>{alarm.reminder_text}</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateMutation.mutate({ id: alarm.id, patch: { enabled: !alarm.enabled } })}
                className={`h-10 rounded-xl border px-3 text-xs font-bold ${alarm.enabled ? 'border-emerald-300/30 bg-emerald-400/12 text-emerald-200' : 'border-white/10 bg-white/[0.035] text-white/35'}`}
              >
                <span className="inline-flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5" />
                  {alarm.enabled ? 'On' : 'Off'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(alarm.id)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-white/42 hover:border-red-300/30 hover:text-red-200"
                aria-label={`Elimina ${alarm.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}

        {alarms.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-sm text-white/42">
            Nessuna sveglia. Creane una o chiedi alla chat di prepararla.
          </div>
        )}
      </section>
    </PageShell>
  );
}
