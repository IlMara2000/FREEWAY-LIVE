import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ icon: Icon, label, value, unit, delay = 0 }) {
  return (
    <motion.div
      className="holo-surface kinetic-card glass group flex min-h-[92px] flex-col gap-2 rounded-xl p-3 sm:min-h-0 sm:p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.025 }}
      whileTap={{ scale: 0.985 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="holo-content flex items-center gap-2 text-muted-foreground">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-black">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider sm:text-xs">{label}</span>
      </div>
      <div className="holo-content flex items-baseline gap-1">
        <motion.span
          className="font-grotesk text-xl font-bold text-foreground text-glow sm:text-2xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.12, duration: 0.34 }}
        >
          {value}
        </motion.span>
        {unit && <span className="font-mono text-xs text-muted-foreground sm:text-sm">{unit}</span>}
      </div>
    </motion.div>
  );
}
