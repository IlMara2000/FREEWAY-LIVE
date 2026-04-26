import React, { useState } from 'react';
import { motion } from 'framer-motion';
import useUserProfile from '@/hooks/useUserProfile';
import { THEMES } from '@/lib/themes';
import { Check, Lock, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import XPBar from '@/components/shared/XPBar';

const themeList = Object.values(THEMES);

export default function ThemeStore() {
  const { profile, loading, setActiveTheme } = useUserProfile();
  const [pendingTheme, setPendingTheme] = useState(null);

  const unlockedThemes = profile?.unlocked_themes || ['emerald'];
  const activeTheme = profile?.active_theme || 'emerald';
  const activeThemeData = THEMES[activeTheme] || THEMES.emerald;
  const level = profile?.level || 1;
  const totalXP = profile?.total_xp || 0;

  const handleActivate = async (themeId) => {
    if (!profile || themeId === activeTheme) return;
    setPendingTheme(themeId);
    try {
      await setActiveTheme(themeId);
    } finally {
      setPendingTheme(null);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <p className="font-mono text-[11px] text-primary/70 uppercase tracking-widest">
          Personalizzazione
        </p>
        <h1 className="text-3xl md:text-4xl font-grotesk font-bold text-foreground flex items-center gap-3">
          <Palette className="w-8 h-8 text-primary" />
          Temi
        </h1>
        <p className="text-sm text-muted-foreground">
          Scegli il look dell'app. I temi si sbloccano salendo di livello.
        </p>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="glass-panel p-5 space-y-5"
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{
              background: `linear-gradient(135deg, ${activeThemeData.accent}24, ${activeThemeData.accent}08)`,
              border: `1px solid ${activeThemeData.accent}33`,
            }}
          >
            {activeThemeData.icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] text-primary/60 uppercase tracking-widest">
                  Tema attivo
                </p>
                <h2 className="font-grotesk font-semibold text-xl text-foreground">
                  {activeThemeData.name}
                </h2>
              </div>
              {loading && (
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  Sync...
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {activeThemeData.description}
            </p>
          </div>
        </div>

        <XPBar totalXP={totalXP} level={level} />
      </motion.section>

      <section className="space-y-3">
        {themeList.map((theme, index) => {
          const isUnlocked = unlockedThemes.includes(theme.id);
          const isActive = activeTheme === theme.id;
          const isPending = pendingTheme === theme.id;

          return (
            <motion.article
              key={theme.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.035, duration: 0.28 }}
              className={`glass rounded-2xl p-4 transition-colors ${
                isActive ? 'border-primary/35 bg-primary/5' : 'hover:bg-white/5'
              } ${isUnlocked ? '' : 'opacity-65'}`}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${theme.accent}22, ${theme.accent}08)`,
                    border: `1px solid ${theme.accent}30`,
                    filter: isUnlocked ? 'none' : 'grayscale(1)',
                  }}
                >
                  {theme.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-grotesk font-semibold text-foreground">
                      {theme.name}
                    </h3>
                    {isActive && (
                      <span className="text-[10px] font-mono text-primary uppercase tracking-widest flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Attivo
                      </span>
                    )}
                    {!isUnlocked && (
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Lv.{theme.minLevel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {theme.description}
                  </p>
                </div>

                <div
                  className="hidden sm:block w-10 h-3 rounded-full shrink-0"
                  style={{
                    background: isUnlocked
                      ? `linear-gradient(90deg, ${theme.accent}, ${theme.accent}55)`
                      : 'hsl(var(--secondary))',
                  }}
                />

                {isActive ? (
                  <div className="h-9 px-3 rounded-xl bg-primary/10 text-primary inline-flex items-center text-xs font-mono font-semibold shrink-0">
                    In uso
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!isUnlocked || loading || isPending}
                    className="shrink-0 border-primary/30 text-primary hover:bg-primary/10 disabled:text-muted-foreground disabled:border-border"
                    onClick={() => handleActivate(theme.id)}
                  >
                    {isPending ? '...' : isUnlocked ? 'Attiva' : 'Lock'}
                  </Button>
                )}
              </div>
            </motion.article>
          );
        })}
      </section>
    </div>
  );
}
