import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ icon: Icon, label, value, unit, delay = 0 }) {
  return (
    <motion.div
      className="glass flex min-h-[92px] flex-col gap-2 rounded-xl p-3 sm:min-h-0 sm:p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
        <span className="text-[10px] font-medium uppercase tracking-wider sm:text-xs">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-grotesk text-xl font-bold text-foreground sm:text-2xl">{value}</span>
        {unit && <span className="font-mono text-xs text-muted-foreground sm:text-sm">{unit}</span>}
      </div>
    </motion.div>
  );
}
