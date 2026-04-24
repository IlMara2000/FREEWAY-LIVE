import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Timer, CalendarDays, Brain, Sparkles } from 'lucide-react';

const STEPS = [
  {
    icon: CalendarDays,
    title: 'Il tuo Calendario',
    text: 'Qui trovi tutte le tue task organizzate per giorno. Tocca un giorno per creare una nuova task.',
    color: 'emerald',
  },
  {
    icon: Sparkles,
    title: 'AI Slicer',
    text: 'Apri una task e premi "Spacchetta con AI" — Groq la divide in micro-passi facili da seguire. Perfetto per l\'ADHD.',
    color: 'emerald',
  },
  {
    icon: Timer,
    title: 'Tomato Timer',
    text: 'Dalla task, avvia il Tomato Timer. Lavora in blocchi da 15-60 minuti e guadagna XP.',
    color: 'emerald',
  },
  {
    icon: Brain,
    title: 'Brain Dump',
    text: 'Nel timer trovi il Brain Dump. Ogni volta che ti viene un pensiero, scaricalo lì — poi torna al focus.',
    color: 'emerald',
  },
];

export default function Tutorial({ onComplete }) {
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onComplete();
  };

  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

      <motion.div
        key={step}
        className="relative z-10 w-full max-w-sm glass-panel p-8 text-center space-y-6"
        initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0.5, opacity: 0, rotate: 15 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        {/* Step dots */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step ? 'w-6 h-2 bg-emerald-400' : 'w-2 h-2 bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <motion.div
          className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto"
          animate={{ boxShadow: ['0 0 15px rgba(16,185,129,0.2)', '0 0 35px rgba(16,185,129,0.45)', '0 0 15px rgba(16,185,129,0.2)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon className="w-9 h-9 text-emerald-400" />
        </motion.div>

        {/* Text */}
        <div className="space-y-3">
          <h2 className="font-grotesk font-black text-2xl text-white">{s.title}</h2>
          <p className="font-lexend text-sm text-white/65 leading-relaxed">{s.text}</p>
        </div>

        {/* Button */}
        <button
          onClick={next}
          className="btn-cyber w-full py-3.5 rounded-2xl font-mono text-xs tracking-widest flex items-center justify-center gap-2"
        >
          {step < STEPS.length - 1 ? (
            <>Avanti <ChevronRight className="w-4 h-4" /></>
          ) : (
            'INIZIA →'
          )}
        </button>

        {step < STEPS.length - 1 && (
          <button onClick={onComplete} className="font-mono text-[10px] text-white/25 hover:text-white/50 transition-colors uppercase tracking-widest">
            salta
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}