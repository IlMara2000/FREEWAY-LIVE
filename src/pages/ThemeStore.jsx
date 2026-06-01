import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import useUserProfile from '@/hooks/useUserProfile';
import {
  applyThemeToDocument,
  DEFAULT_THEME_CUSTOMIZATION,
  getThemeIdsForLevel,
  getThemeList,
  MAX_THEME_LEVEL,
  readCustomTheme,
  sanitizeCustomTheme,
  THEMES,
  writeStoredActiveThemeId,
  writeCustomTheme,
} from '@/lib/themes';
import { Check, Eye, Layers3, Lock, Palette, Sparkles, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import XPBar from '@/components/shared/XPBar';
import PageShell from '@/components/shared/PageShell';

const themeList = getThemeList();

export default function ThemeStore() {
  const { profile, loading, setActiveTheme, grantMaxLevel } = useUserProfile();
  const [pendingTheme, setPendingTheme] = useState(null);
  const [customTheme, setCustomTheme] = useState(readCustomTheme);
  const maxLevelGrantedRef = useRef(false);

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
    const sanitized = sanitizeCustomTheme(customTheme);
    writeCustomTheme(sanitized);
    applyThemeToDocument(activeThemeData, sanitized);
  }, [activeThemeData, customTheme]);

  useEffect(() => {
    if (!profile || loading || maxLevelGrantedRef.current || (profile.level || 1) >= MAX_THEME_LEVEL) return;

    maxLevelGrantedRef.current = true;
    grantMaxLevel().catch((error) => {
      console.warn('Unable to grant max theme level:', error);
      maxLevelGrantedRef.current = false;
    });
  }, [grantMaxLevel, loading, profile]);

  const handleActivate = async (themeId) => {
    if (!profile || themeId === activeTheme) return;
    setPendingTheme(themeId);
    writeStoredActiveThemeId(themeId);
    applyThemeToDocument(THEMES[themeId] || THEMES.emerald, customTheme);
    try {
      await setActiveTheme(themeId);
    } finally {
      setPendingTheme(null);
    }
  };

  const updateCustomTheme = (key, value) => {
    setCustomTheme((current) => sanitizeCustomTheme({ ...current, [key]: value }));
  };

  const resetCustomTheme = () => {
    setCustomTheme(DEFAULT_THEME_CUSTOMIZATION);
  };

  return (
    <PageShell maxWidth="max-w-3xl" contentClassName="space-y-5">
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
          Scegli il look dell'app e sblocca nuove estetiche salendo di livello.
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
                  Salvataggio
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
        className="glass-panel p-4 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-grotesk font-semibold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              Motore CSS globale
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Questa pagina pilota variabili CSS globali: accento, raggi, vetro, glow e griglia.
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

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { key: 'surface', label: 'Glass', min: 52, max: 92, suffix: '%' },
            { key: 'blur', label: 'Blur', min: 8, max: 36, suffix: 'px' },
            { key: 'glow', label: 'Glow', min: 4, max: 40, suffix: '' },
            { key: 'grid', label: 'Griglia', min: 0, max: 16, suffix: '%' },
          ].map((control) => (
            <label key={control.key} className="glass rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  {control.label}
                </span>
                <span className="text-xs font-mono text-primary">
                  {customTheme[control.key]}{control.suffix}
                </span>
              </div>
              <input
                type="range"
                min={control.min}
                max={control.max}
                value={customTheme[control.key]}
                onChange={(event) => updateCustomTheme(control.key, Number(event.target.value))}
                className="w-full accent-primary"
                aria-label={control.label}
              />
            </label>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="glass-panel p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary/60">Preview</p>
                <h3 className="font-grotesk text-lg font-semibold text-foreground">Controllo reale del look</h3>
              </div>
              <Eye className="w-4 h-4 text-primary/70" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="glass rounded-xl p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Card</p>
                <p className="mt-2 text-sm text-foreground">Qui leggi subito vetro, bordi, contrasto e luce.</p>
                <Button className="btn-cyber mt-4 h-10 rounded-xl px-4 text-xs">Azione primaria</Button>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Accent</p>
                <div className="mt-3 h-3 rounded-full bg-white/10">
                  <div
                    className="h-3 rounded-full"
                    style={{ width: '72%', background: `linear-gradient(90deg, ${customTheme.accent || activeThemeData.accent}, ${(customTheme.accent || activeThemeData.accent)}66)` }}
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">La modifica qui e nel resto dell'app e la stessa.</p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-grotesk font-semibold text-foreground">Cosa stai controllando</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Accento: bottoni, glow, slider, focus ring, badge attivi.</li>
              <li>Radius: bordi globali e pannelli vetro.</li>
              <li>Glass: densita delle superfici e profondita visiva.</li>
              <li>Blur: sfocatura reale dei pannelli.</li>
              <li>Glow: intensita luci e riflessi.</li>
              <li>Griglia: presenza del pattern di sfondo.</li>
            </ul>
          </div>
        </div>
      </motion.section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-grotesk font-semibold text-foreground flex items-center gap-2">
              <Layers3 className="w-4 h-4 text-primary" />
              Libreria temi
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Il preset scelto definisce la base. I controlli sopra rifiniscono il CSS globale.
            </p>
          </div>
        </div>
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
    </PageShell>
  );
}
