import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import useUserProfile from '@/hooks/useUserProfile';
import {
  applyThemeToDocument,
  getThemeIdsForLevel,
  getThemeList,
  THEMES,
} from '@/lib/themes';
import { Check, Lock, Palette, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import XPBar from '@/components/shared/XPBar';

const CUSTOM_THEME_KEY = 'fw_theme_customizer';
const themeList = getThemeList();

const readCustomTheme = () => {
  if (typeof window === 'undefined') return { accent: '', radius: 12 };
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_THEME_KEY)) || { accent: '', radius: 12 };
  } catch {
    return { accent: '', radius: 12 };
  }
};

export default function ThemeStore() {
  const { profile, loading, setActiveTheme } = useUserProfile();
  const [pendingTheme, setPendingTheme] = useState(null);
  const [customTheme, setCustomTheme] = useState(readCustomTheme);

  const level = profile?.level || 1;
  const totalXP = profile?.total_xp || 0;
  const activeTheme = profile?.active_theme || 'emerald';
  const activeThemeData = THEMES[activeTheme] || THEMES.emerald;
  const unlockedThemes = useMemo(() => {
    const saved = profile?.unlocked_themes || [];
    return Array.from(new Set([...saved, ...getThemeIdsForLevel(level), 'emerald']));
  }, [level, profile?.unlocked_themes]);
  const nextTheme = themeList.find((theme) => !unlockedThemes.includes(theme.id));

  useEffect(() => {
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(customTheme));
    applyThemeToDocument(activeThemeData, customTheme);
  }, [activeThemeData, customTheme]);

  const handleActivate = async (themeId) => {
    if (!profile || themeId === activeTheme) return;
    setPendingTheme(themeId);
    try {
      await setActiveTheme(themeId);
    } finally {
      setPendingTheme(null);
    }
  };

  const updateCustomTheme = (key, value) => {
    setCustomTheme((current) => ({ ...current, [key]: value }));
  };

  const resetCustomTheme = () => {
    setCustomTheme({ accent: '', radius: 12 });
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
          Scegli il look dell'app. I temi ora scalano su molti più livelli.
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

        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{unlockedThemes.length} / {themeList.length} estetiche sbloccate</span>
          <span>{nextTheme ? `Prossima: Lv.${nextTheme.minLevel}` : 'Tutte sbloccate'}</span>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.09 }}
        className="glass rounded-2xl p-4 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-grotesk font-semibold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              Custom Lab
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modifiche live, salvate su questo dispositivo.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetCustomTheme}
            className="h-8 text-xs text-muted-foreground hover:text-primary"
          >
            Reset
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="glass rounded-xl p-3 flex items-center justify-between gap-3">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              Accento
            </span>
            <input
              type="color"
              value={customTheme.accent || activeThemeData.accent}
              onChange={(event) => updateCustomTheme('accent', event.target.value)}
              className="h-8 w-12 rounded-lg bg-transparent cursor-pointer"
              aria-label="Colore accento"
            />
          </label>

          <label className="glass rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                Radius
              </span>
              <span className="text-xs font-mono text-primary">{customTheme.radius}px</span>
            </div>
            <input
              type="range"
              min="4"
              max="28"
              value={customTheme.radius}
              onChange={(event) => updateCustomTheme('radius', Number(event.target.value))}
              className="w-full accent-primary"
              aria-label="Raggio bordi"
            />
          </label>
        </div>
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
