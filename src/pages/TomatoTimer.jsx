import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useUserProfile from '@/hooks/useUserProfile';
import { base44 } from '@/api/base44Client';
import TimerRing from '@/components/tomato/TimerRing';
import XPReward from '@/components/shared/XPReward';
import BrainDumpSheet from '@/components/tomato/BrainDumpSheet';
import { Play, Pause, RotateCcw, Brain } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 16, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -10, scale: 0.992, transition: { duration: 0.24, ease: [0.4, 0, 0.6, 1] } },
};

const PRESETS = [
  { label: '15', minutes: 15, xp: 30 },
  { label: '25', minutes: 25, xp: 50 },
  { label: '45', minutes: 45, xp: 90 },
  { label: '60', minutes: 60, xp: 120 },
];

export default function TomatoTimer({ taskContext, onBack }) {
  const { profile, addXP, addFocusMinutes } = useUserProfile();
  const [selectedPreset, setSelectedPreset] = useState(1);
  const [timeLeft, setTimeLeft] = useState(PRESETS[1].minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState({ amount: 0, levelUp: false, newLevel: 1 });
  const [showBrainDump, setShowBrainDump] = useState(false);
  const intervalRef = useRef(null);

  const totalSeconds = PRESETS[selectedPreset].minutes * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  const formatTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const completeSession = useCallback(async () => {
    setIsRunning(false);
    setIsCompleted(true);
    const preset = PRESETS[selectedPreset];
    await base44.entities.FocusSession.create({
      duration_minutes: preset.minutes,
      completed: true,
      xp_earned: preset.xp,
      task_title: taskContext?.title || `Sessione ${preset.label} min`,
    });
    const result = await addXP(preset.xp);
    await addFocusMinutes(preset.minutes);
    setRewardData({ amount: preset.xp, levelUp: result?.leveledUp || false, newLevel: result?.newLevel || 1 });
    setShowReward(true);
  }, [selectedPreset, addXP, addFocusMinutes, taskContext]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(intervalRef.current); completeSession(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, completeSession]);

  const selectPreset = (i) => {
    if (isRunning) return;
    setSelectedPreset(i);
    setTimeLeft(PRESETS[i].minutes * 60);
    setIsCompleted(false);
  };

  const reset = () => { setIsRunning(false); setIsCompleted(false); setTimeLeft(PRESETS[selectedPreset].minutes * 60); };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen relative overflow-hidden flex flex-col"
    >
      {/* Hyper focus vignette */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            className="fixed inset-0 z-10 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ background: 'radial-gradient(circle at center, transparent 35%, rgba(1,3,11,0.88) 100%)' }}
          />
        )}
      </AnimatePresence>

      {/* Top nav */}
      <motion.div
        className="relative z-20 flex items-center justify-between p-4 pt-8"
        animate={{ opacity: isRunning ? 0.2 : 1 }}
      >
        <button onClick={onBack} className="font-mono text-xs text-white/40 hover:text-white transition-colors uppercase tracking-widest">
          ← Calendario
        </button>
        {taskContext && (
          <span className="font-grotesk text-xs text-white/50 truncate max-w-[180px]">{taskContext.title}</span>
        )}
        {/* Brain Dump button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowBrainDump(true)}
          className="glass w-10 h-10 rounded-xl flex items-center justify-center text-emerald-400 hover:bg-emerald-500/15 transition-colors"
        >
          <Brain className="w-5 h-5" />
        </motion.button>
      </motion.div>

      {/* Timer center */}
      <div className="relative z-20 flex flex-col items-center justify-center flex-1 gap-8 px-4">
        {/* Ring */}
        <div className="relative flex items-center justify-center">
          <TimerRing progress={progress} isRunning={isRunning} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-5xl md:text-6xl font-mono font-bold text-white tracking-wider"
              animate={{ textShadow: isRunning ? '0 0 25px rgba(16,185,129,0.6)' : '0 0 0px transparent' }}
            >
              {formatTime(timeLeft)}
            </motion.span>
            <span className="font-mono text-[10px] text-emerald-400/60 tracking-widest uppercase mt-1">
              {isRunning ? 'HYPER FOCUS' : isCompleted ? '✓ COMPLETATA' : 'PRONTA'}
            </span>
          </div>
        </div>

        {/* Presets */}
        <motion.div className="flex gap-2" animate={{ opacity: isRunning ? 0.15 : 1 }}>
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => selectPreset(i)}
              disabled={isRunning}
              className={`px-4 py-2 rounded-xl font-mono text-xs transition-all disabled:opacity-20 ${
                i === selectedPreset
                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                  : 'glass text-white/50 hover:text-white'
              }`}
            >
              {p.label}'
            </button>
          ))}
        </motion.div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          <motion.button whileTap={{ scale: 0.9 }} onClick={reset}
            className="glass w-12 h-12 rounded-xl flex items-center justify-center text-white/50 hover:text-white transition-colors">
            <RotateCcw className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => isRunning ? setIsRunning(false) : setIsRunning(true)}
            disabled={isCompleted}
            className="w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-40 transition-all btn-cyber"
            style={{ borderRadius: '9999px', fontSize: 0 }}
            animate={{
              boxShadow: isRunning
                ? ['0 0 25px rgba(16,185,129,0.4)', '0 0 50px rgba(16,185,129,0.7)', '0 0 25px rgba(16,185,129,0.4)']
                : '0 0 15px rgba(16,185,129,0.25)',
            }}
            transition={isRunning ? { duration: 1.5, repeat: Infinity } : {}}
          >
            {isRunning
              ? <Pause className="w-8 h-8 text-white" />
              : <Play className="w-8 h-8 text-white ml-1" />}
          </motion.button>

          <div className="w-12 h-12" />
        </div>
      </div>

      {/* Brain Dump Sheet */}
      <BrainDumpSheet open={showBrainDump} onClose={() => setShowBrainDump(false)} />

      {/* XP Reward */}
      <XPReward
        amount={rewardData.amount}
        show={showReward}
        onComplete={() => setShowReward(false)}
        levelUp={rewardData.levelUp}
        newLevel={rewardData.newLevel}
      />
    </motion.div>
  );
}
