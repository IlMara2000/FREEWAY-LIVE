import React from 'react';
import { motion } from 'framer-motion';

export default function StatCard({ icon: Icon, label, value, unit, delay = 0 }) {
  return (
    <motion.div
      className="glass rounded-xl p-4 flex flex-col gap-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-grotesk font-bold text-foreground">{value}</span>
        {unit && <span className="text-sm text-muted-foreground font-mono">{unit}</span>}
      </div>
    </motion.div>
  );
}