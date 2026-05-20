import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowUp } from 'lucide-react';

const REWARD_DISPLAY_MS = 1800;

export default function XPReward({ amount, show, onComplete, levelUp, newLevel }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, REWARD_DISPLAY_MS);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none fixed right-4 top-[calc(1rem+env(safe-area-inset-top))] z-[85] sm:right-6"
          initial={{ opacity: 0, y: -18, scale: 0.9, rotateX: -18, rotateY: 8 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0, rotateY: 0 }}
          exit={{ opacity: 0, y: -18, scale: 0.92, rotateX: -12 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <motion.div
            className="flex min-w-[170px] flex-col gap-2 rounded-2xl border border-emerald-300/24 bg-[#02050c]/92 px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.5),0_0_28px_rgba(16,185,129,0.14)] backdrop-blur-xl"
            animate={{ y: [0, -3, 0], rotateY: [0, 4, 0] }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          >
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-300/18 bg-emerald-400/10">
                <Zap className="h-4 w-4 text-primary" />
              </span>
              <span className="font-grotesk text-xl font-bold text-primary text-glow">
                +{amount} XP
              </span>
            </div>

            {levelUp && (
              <motion.div
                className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/15 px-3 py-2"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.18 }}
              >
                <ArrowUp className="h-4 w-4 text-primary" />
                <span className="font-grotesk text-sm font-bold text-primary">
                  LIVELLO {newLevel}!
                </span>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
