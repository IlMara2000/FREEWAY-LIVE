import React from 'react';
import { motion } from 'framer-motion';
import useUserProfile from '@/hooks/useUserProfile';
import { THEMES } from '@/lib/themes';
import { Lock, Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import XPBar from '@/components/shared/XPBar';

export default function ThemeStore() {
  const { profile, loading, setActiveTheme } = useUserProfile();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const unlockedThemes = profile?.unlocked_themes || ['emerald'];
  const activeTheme = profile?.active_theme || 'emerald';

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-grotesk font-bold text-foreground flex items-center gap-3">
          <Palette className="w-8 h-8 text-primary" />
          Theme Store
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personalizza il tuo Hub. Sblocca temi salendo di livello.
        </p>
      </motion.div>

      {/* XP Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-5"
      >
        <XPBar totalXP={profile?.total_xp} level={profile?.level} />
      </motion.div>

      {/* Themes Grid */}
      <div className="grid gap-4">
        {Object.values(THEMES).map((theme, index) => {
          const isUnlocked = unlockedThemes.includes(theme.id);
          const isActive = activeTheme === theme.id;

          return (
            <motion.div
              key={theme.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className={`relative rounded-2xl p-5 transition-all ${
                isActive
                  ? 'glass-strong glow-emerald-strong'
                  : isUnlocked
                  ? 'glass hover:bg-white/5'
                  : 'glass opacity-60'
              }`}
              style={isActive ? { boxShadow: `0 0 30px ${theme.bgGlow}` } : {}}
            >
              <div className="flex items-start gap-4">
                {/* Theme preview circle */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${theme.accent}22, ${theme.accent}08)`,
                    border: `1px solid ${theme.accent}33`,
                  }}
                >
                  {theme.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-grotesk font-semibold text-foreground">{theme.name}</h3>
                    {!isUnlocked && (
                      <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Lv.{theme.minLevel}
                      </span>
                    )}
                    {isActive && (
                      <span className="text-xs font-mono font-semibold flex items-center gap-1" style={{ color: theme.accent }}>
                        <Check className="w-3 h-3" /> ATTIVO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{theme.description}</p>

                  {/* Color preview bar */}
                  <div
                    className="w-full h-1 rounded-full mt-3"
                    style={{
                      background: isUnlocked
                        ? `linear-gradient(90deg, ${theme.accent}, ${theme.accent}44)`
                        : 'hsl(var(--secondary))',
                    }}
                  />
                </div>

                {/* Action */}
                {isUnlocked && !isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => setActiveTheme(theme.id)}
                  >
                    Attiva
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}