import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Timer, Sparkles, Brain, BriefcaseBusiness, Clock, Copy, StickyNote, BookOpen } from 'lucide-react';
import { requestTaskBreakdown } from '@/api/assistantClient';
import { formatDuration, getTaskDurationHours } from '@/lib/work-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TaskModal({ task, onClose, onStartTomato, onDuplicate, onOpenLinkedNote }) {
  const [slicedContent, setSlicedContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmAiOpen, setConfirmAiOpen] = useState(false);

  if (!task) return null;

  const handleAiSlicer = async () => {
    setConfirmAiOpen(false);
    setLoading(true);
    setSlicedContent(null);

    try {
      const data = await requestTaskBreakdown(task);
      setSlicedContent(data.breakdown || 'Errore nella risposta.');
    } catch (e) {
      setSlicedContent(e?.message || 'Errore di connessione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const priorityColor = {
    critical: 'text-red-400 border-red-500/30',
    high: 'text-orange-400 border-orange-500/30',
    medium: 'text-emerald-400 border-emerald-500/30',
    low: 'text-white/50 border-white/10',
  }[task.priority] || 'text-emerald-400 border-emerald-500/30';

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(4.25rem+env(safe-area-inset-top))] md:items-center md:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative z-10 w-full max-w-md overflow-y-auto rounded-[1.6rem] glass-panel px-4 pb-4 pt-5 space-y-4 max-h-[min(76dvh,42rem)] sm:max-h-[min(88dvh,48rem)] sm:p-6 sm:space-y-5"
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <button onClick={onClose} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/30 text-white/35 transition-colors hover:text-white sm:right-4 sm:top-4">
            <X className="h-5 w-5" />
          </button>

          <div>
            <p className={`font-mono text-[10px] uppercase tracking-widest mb-2 ${priorityColor}`}>
              {task.priority} priority
            </p>
            <h2 className="max-w-[calc(100%-3rem)] text-balance font-grotesk font-black text-xl text-white leading-tight sm:text-2xl">{task.title}</h2>
            {task.due_date && (
              <p className="font-mono text-xs text-white/40 mt-1">{task.due_date}</p>
            )}
            {task.recurrence_rule && (
              <p className="mt-2 inline-flex rounded-full border border-emerald-300/18 bg-emerald-300/8 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-200/70">
                Ricorrente {task.recurrence_index || 1}/{task.recurrence_total || '?'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(task.start_time || task.end_time) && (
              <div className="glass rounded-xl p-3">
                <p className="font-mono text-[10px] text-white/35 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Orario
                </p>
                <p className="font-mono text-sm text-white mt-1">
                  {task.start_time || '--:--'} - {task.end_time || '--:--'}
                </p>
              </div>
            )}
            {task.task_type === 'work' && (
              <div className="glass rounded-xl p-3 border-emerald-500/25">
                <p className="font-mono text-[10px] text-emerald-400/65 uppercase tracking-widest flex items-center gap-1.5">
                  <BriefcaseBusiness className="w-3 h-3" /> Lavoro
                </p>
                <p className="font-mono text-sm text-white mt-1">
                  {formatDuration(getTaskDurationHours(task))}
                </p>
              </div>
            )}
            {task.task_type === 'study' && (
              <div className="glass rounded-xl p-3 border-cyan-300/20">
                <p className="font-mono text-[10px] text-cyan-200/70 uppercase tracking-widest flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3" /> Studio
                </p>
                <p className="font-mono text-sm text-white mt-1">
                  {formatDuration(getTaskDurationHours(task))}
                </p>
              </div>
            )}
          </div>

          {task.description && (
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-white/70 leading-relaxed break-words">{task.description}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setConfirmAiOpen(true)}
              disabled={loading}
              className="btn-cyber w-full py-3 rounded-2xl font-mono text-xs tracking-widest flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'ANALISI IN CORSO...' : 'SPACCHETTA CON AI'}
            </button>

            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 py-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </motion.div>
              )}
              {slicedContent && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-4 border-t border-emerald-500/25"
                >
                  <p className="font-mono text-[10px] text-emerald-400/70 uppercase tracking-widest mb-3 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> Piano ADHD-Friendly
                  </p>
                  <div className="text-sm text-white/80 leading-relaxed whitespace-pre-line break-words font-lexend">
                    {slicedContent}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AlertDialog open={confirmAiOpen} onOpenChange={setConfirmAiOpen}>
            <AlertDialogContent className="border-emerald-500/25 bg-background">
              <AlertDialogHeader>
                <AlertDialogTitle>Analizzare questa task?</AlertDialogTitle>
                <AlertDialogDescription>
                  Verranno usati titolo e descrizione della task per generare micro-passi.
                  Il risultato resta solo come suggerimento finche non decidi di usarlo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={handleAiSlicer}>
                  Analizza
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <button
            onClick={() => { onStartTomato?.(task); onClose(); }}
            className="w-full py-3 rounded-2xl glass border border-emerald-500/40 font-grotesk font-semibold text-emerald-400 text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/10 transition-colors"
          >
            <Timer className="w-4 h-4" />
            Avvia Tomato Timer
          </button>

          {onOpenLinkedNote && Array.isArray(task.linked_note_ids) && task.linked_note_ids.length > 0 && (
            <button
              onClick={() => {
                onOpenLinkedNote(task);
                onClose();
              }}
              className="w-full py-3 rounded-2xl glass border border-amber-300/20 font-grotesk font-semibold text-amber-100/85 text-sm flex items-center justify-center gap-2 hover:bg-amber-300/10 transition-colors"
            >
              <StickyNote className="w-4 h-4" />
              Note collegate ({task.linked_note_ids.length})
            </button>
          )}

          {onDuplicate && (
            <button
              onClick={() => {
                onDuplicate(task);
                onClose();
              }}
              className="w-full py-3 rounded-2xl glass border border-cyan-300/25 font-grotesk font-semibold text-cyan-100/85 text-sm flex items-center justify-center gap-2 hover:bg-cyan-300/10 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copia task
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
