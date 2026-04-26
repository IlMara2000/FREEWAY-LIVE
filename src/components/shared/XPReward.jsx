import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowUp } from 'lucide-react';

export default function XPReward({ amount, show, onComplete, levelUp, newLevel }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* XP amount */}
          <motion.div
            className="flex flex-col items-center gap-3"
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: -40 }}
            exit={{ scale: 0, opacity: 0, y: -80 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <motion.div
              className="flex items-center gap-2 px-6 py-3 rounded-2xl glass-strong"
              animate={{ boxShadow: ['0 0 20px rgba(0,255,136,0.3)', '0 0 40px rgba(0,255,136,0.6)', '0 0 20px rgba(0,255,136,0.3)'] }}
              transition={{ duration: 0.8, repeat: 2 }}
            >
              <Zap className="w-6 h-6 text-primary" />
              <span className="text-2xl font-grotesk font-bold text-primary text-glow">
                +{amount} XP
              </span>
            </motion.div>

            {levelUp && (
              <motion.div
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 border border-primary/30"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <ArrowUp className="w-5 h-5 text-primary" />
                <span className="text-lg font-grotesk font-bold text-primary">
                  LIVELLO {newLevel}!
                </span>
              </motion.div>
            )}
          </motion.div>

          {/* Background flash */}
          <motion.div
            className="absolute inset-0 bg-primary/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.6 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
