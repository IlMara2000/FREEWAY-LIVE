import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Timer, Sparkles, Brain } from 'lucide-react';
import { requestTaskBreakdown } from '@/api/groqTaskAssistant';
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

export default function TaskModal({ task, onClose, onStartTomato }) {
  const [slicedContent, setSlicedContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmGroqOpen, setConfirmGroqOpen] = useState(false);

  if (!task) return null;

  const handleGroqSlicer = async () => {
    setLoading(true);
    setSlicedContent(null);

    try {
      const data = await requestTaskBreakdown(task);
      setSlicedContent(data.breakdown || 'Errore nella risposta.');
    } catch (e) {
      setSlicedContent(e?.message || 'Errore di connessione. Riprova.');
    }
    setLoading(false);
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
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative z-10 w-full max-w-md glass-panel p-6 space-y-5"
          initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          {/* Close */}
          <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>

          {/* Title */}
          <div>
            <p className={`font-mono text-[10px] uppercase tracking-widest mb-2 ${priorityColor}`}>
              {task.priority} priority
            </p>
            <h2 className="font-grotesk font-black text-xl text-white leading-tight">{task.title}</h2>
            {task.due_date && (
              <p className="font-mono text-xs text-white/40 mt-1">{task.due_date}</p>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-white/70 leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Groq Slicer */}
          <div className="space-y-3">
            <button
              onClick={() => setConfirmGroqOpen(true)}
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
                  <div className="text-sm text-white/80 leading-relaxed whitespace-pre-line font-lexend">
                    {slicedContent}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AlertDialog open={confirmGroqOpen} onOpenChange={setConfirmGroqOpen}>
            <AlertDialogContent className="border-emerald-500/25 bg-background">
              <AlertDialogHeader>
                <AlertDialogTitle>Inviare questa task a Groq?</AlertDialogTitle>
                <AlertDialogDescription>
                  Verranno inviati a Groq titolo e descrizione della task per generare micro-passi.
                  Il risultato resta solo come suggerimento finche non decidi di usarlo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={handleGroqSlicer}>
                  Invia a Groq
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Start Tomato */}
          <button
            onClick={() => { onStartTomato && onStartTomato(task); onClose(); }}
            className="w-full py-3 rounded-2xl glass border border-emerald-500/40 font-grotesk font-semibold text-emerald-400 text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/10 transition-colors"
          >
            <Timer className="w-4 h-4" />
            Avvia Tomato Timer
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
