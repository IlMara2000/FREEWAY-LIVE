import React from 'react';
import { motion } from 'framer-motion';
import { getXPForCurrentLevel } from '@/hooks/useUserProfile';
import { Zap } from 'lucide-react';

export default function XPBar({ totalXP, level, compact = false }) {
  const { current, needed, percentage } = getXPForCurrentLevel(totalXP || 0);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-xs font-mono text-primary font-semibold">{totalXP || 0}</span>
        </div>
        <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center glow-emerald">
            <span className="font-grotesk font-bold text-primary text-sm">{level || 1}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">LIVELLO</p>
            <p className="text-sm font-grotesk font-semibold text-foreground">Operatore Lv.{level || 1}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground font-mono">{current} / {needed} XP</p>
          <p className="text-xs text-primary font-mono font-semibold flex items-center gap-1 justify-end">
            <Zap className="w-3 h-3" />
            {totalXP || 0} XP totali
          </p>
        </div>
      </div>
      <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ boxShadow: '0 0 12px rgba(0, 255, 136, 0.4)' }}
        />
      </div>
    </div>
  );
}