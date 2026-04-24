import React from 'react';
import { motion } from 'framer-motion';

export default function Splash({ onEnter }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: '#01030b' }}>

      {/* Radial glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)' }} />
      </div>

      <motion.button
        onClick={onEnter}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.175, 0.885, 0.32, 1.275] }}
        whileTap={{ scale: 0.93 }}
        className="relative flex flex-col items-center gap-6 cursor-pointer group"
      >
        {/* Logo ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute w-48 h-48 rounded-full border border-emerald-500/10"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          className="absolute w-36 h-36 rounded-full border border-emerald-500/20"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
        />

        {/* Logo circle */}
        <motion.div
          className="w-28 h-28 rounded-full flex items-center justify-center glass-strong relative z-10"
          animate={{ boxShadow: ['0 0 20px rgba(16,185,129,0.25)', '0 0 45px rgba(16,185,129,0.5)', '0 0 20px rgba(16,185,129,0.25)'] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <span className="font-grotesk font-black text-3xl text-emerald-400 text-glow">FL</span>
        </motion.div>

        {/* Title */}
        <div className="relative z-10 text-center mt-4">
          <h1 className="font-grotesk font-black text-4xl text-white tracking-widest text-glow">
            FREEWAY
          </h1>
          <p className="font-mono text-xs text-emerald-400/70 tracking-[0.3em] uppercase mt-1">
            life
          </p>
        </div>

        {/* Tap hint */}
        <motion.p
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="font-mono text-[11px] text-emerald-500/60 tracking-widest uppercase mt-2 relative z-10"
        >
          — tocca per entrare —
        </motion.p>
      </motion.button>
    </div>
  );
}