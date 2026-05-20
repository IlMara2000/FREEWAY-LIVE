import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Smartphone } from 'lucide-react';

const DISPLAY_MS = 3500;

export default function MobileDesktopPrompt({ onDone }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      onDone?.();
    }, DISPLAY_MS);

    return () => window.clearTimeout(timeout);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[98] grid place-items-center bg-black/82 p-5 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      role="status"
      aria-live="polite"
    >
      <motion.div
        className="relative w-full max-w-sm overflow-hidden rounded-[1.35rem] border border-emerald-300/24 bg-[#02050c]/96 p-5 text-center shadow-[0_28px_90px_rgba(0,0,0,0.72)]"
        initial={{ y: 22, scale: 0.96, rotateX: -8 }}
        animate={{ y: 0, scale: 1, rotateX: 0 }}
        exit={{ y: 20, scale: 0.97, rotateX: 8 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_0%,rgba(16,185,129,0.2),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.12),transparent_30%)]" />

        <div className="relative z-10">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-emerald-300/25 bg-emerald-400/10 text-emerald-100 shadow-[0_0_44px_rgba(16,185,129,0.2)]">
            <div className="relative">
              <Monitor className="h-9 w-9" />
              <Smartphone className="absolute -bottom-2 -right-3 h-5 w-5 rounded-md bg-[#02050c] text-cyan-200" />
            </div>
          </div>

          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-300/62">
            Esperienza consigliata
          </p>
          <h2 className="mt-2 font-grotesk text-2xl font-black leading-tight text-white">
            Da PC rende meglio.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/58">
            Da telefono puoi entrare comunque, ma per lavorare con calendario, task e chat l app e piu comoda da browser desktop.
          </p>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-emerald-300"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: DISPLAY_MS / 1000, ease: 'linear' }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
