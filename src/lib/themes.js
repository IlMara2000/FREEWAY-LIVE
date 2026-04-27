export const THEMES = {
  emerald: {
    id: 'emerald',
    name: 'Smeraldo',
    description: 'Verde neon su nero profondo. Il default operativo.',
    minLevel: 1,
    accent: '#00FF88',
    accentHSL: '155 100% 50%',
    bgGlow: 'rgba(0, 255, 136, 0.15)',
    icon: '◆',
  },
  ruby: {
    id: 'ruby',
    name: 'Rubino',
    description: 'Rosso acceso, aggressivo, perfetto per sprint intensi.',
    minLevel: 2,
    accent: '#FF3366',
    accentHSL: '345 100% 60%',
    bgGlow: 'rgba(255, 51, 102, 0.15)',
    icon: '●',
  },
  arctic: {
    id: 'arctic',
    name: 'Artico',
    description: 'Blu ghiaccio, pulito e calmo per lavoro profondo.',
    minLevel: 3,
    accent: '#38BDF8',
    accentHSL: '198 93% 60%',
    bgGlow: 'rgba(56, 189, 248, 0.15)',
    icon: '✦',
  },
  amethyst: {
    id: 'amethyst',
    name: 'Ametista',
    description: 'Viola elettrico, più creativo e notturno.',
    minLevel: 4,
    accent: '#A855F7',
    accentHSL: '270 95% 65%',
    bgGlow: 'rgba(168, 85, 247, 0.15)',
    icon: '✧',
  },
  solar: {
    id: 'solar',
    name: 'Solare',
    description: 'Oro e ambra, caldo ma ancora leggibile.',
    minLevel: 5,
    accent: '#FBBF24',
    accentHSL: '45 96% 56%',
    bgGlow: 'rgba(251, 191, 36, 0.15)',
    icon: '☼',
  },
  mint: {
    id: 'mint',
    name: 'Menta',
    description: 'Fresco, chiaro e meno cyber.',
    minLevel: 6,
    accent: '#5EEAD4',
    accentHSL: '174 72% 62%',
    bgGlow: 'rgba(94, 234, 212, 0.14)',
    icon: '◇',
  },
  coral: {
    id: 'coral',
    name: 'Corallo',
    description: 'Energia soft, utile per giornate leggere.',
    minLevel: 7,
    accent: '#FB7185',
    accentHSL: '351 95% 71%',
    bgGlow: 'rgba(251, 113, 133, 0.14)',
    icon: '◈',
  },
  cobalt: {
    id: 'cobalt',
    name: 'Cobalto',
    description: 'Blu tecnico, preciso e molto dashboard.',
    minLevel: 8,
    accent: '#2563EB',
    accentHSL: '221 83% 53%',
    bgGlow: 'rgba(37, 99, 235, 0.14)',
    icon: '▣',
  },
  lime: {
    id: 'lime',
    name: 'Lime',
    description: 'Acido, veloce, da task list aggressiva.',
    minLevel: 9,
    accent: '#A3E635',
    accentHSL: '84 81% 55%',
    bgGlow: 'rgba(163, 230, 53, 0.14)',
    icon: '▲',
  },
  rose: {
    id: 'rose',
    name: 'Rosa',
    description: 'Più personale, morbido, ma ancora contrastato.',
    minLevel: 10,
    accent: '#F472B6',
    accentHSL: '330 81% 70%',
    bgGlow: 'rgba(244, 114, 182, 0.14)',
    icon: '✺',
  },
  amber: {
    id: 'amber',
    name: 'Ambra',
    description: 'Un tema caldo da sera, meno abbagliante del Solare.',
    minLevel: 12,
    accent: '#F59E0B',
    accentHSL: '38 92% 50%',
    bgGlow: 'rgba(245, 158, 11, 0.14)',
    icon: '◆',
  },
  violet: {
    id: 'violet',
    name: 'Violetto',
    description: 'Viola saturo per un look più premium.',
    minLevel: 14,
    accent: '#7C3AED',
    accentHSL: '262 83% 58%',
    bgGlow: 'rgba(124, 58, 237, 0.14)',
    icon: '⬢',
  },
  cyan: {
    id: 'cyan',
    name: 'Ciano',
    description: 'Alta leggibilità e sensazione da console futuristica.',
    minLevel: 16,
    accent: '#06B6D4',
    accentHSL: '188 95% 42%',
    bgGlow: 'rgba(6, 182, 212, 0.14)',
    icon: '⬡',
  },
  graphite: {
    id: 'graphite',
    name: 'Grafite',
    description: 'Minimale, quasi monocromo, con accento pulito.',
    minLevel: 18,
    accent: '#D4D4D8',
    accentHSL: '240 5% 84%',
    bgGlow: 'rgba(212, 212, 216, 0.1)',
    icon: '▰',
  },
  magma: {
    id: 'magma',
    name: 'Magma',
    description: 'Arancio rosso, forte e motivazionale.',
    minLevel: 20,
    accent: '#F97316',
    accentHSL: '25 95% 53%',
    bgGlow: 'rgba(249, 115, 22, 0.14)',
    icon: '◒',
  },
  prism: {
    id: 'prism',
    name: 'Prisma',
    description: 'Sblocco avanzato: accento brillante e molto visibile.',
    minLevel: 25,
    accent: '#22D3EE',
    accentHSL: '187 86% 53%',
    bgGlow: 'rgba(34, 211, 238, 0.16)',
    icon: '✹',
  },
};

export const getThemeList = () =>
  Object.values(THEMES).sort((a, b) => a.minLevel - b.minLevel);

export const getThemeIdsForLevel = (level = 1) =>
  getThemeList()
    .filter((theme) => theme.minLevel <= level)
    .map((theme) => theme.id);

export function hexToHslValue(hex) {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    if (max === g) h = (b - r) / d + 2;
    if (max === b) h = (r - g) / d + 4;
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyThemeToDocument(theme, custom = {}) {
  if (typeof document === 'undefined' || !theme) return;

  const accent = custom.accent || theme.accent;
  const accentHSL = hexToHslValue(accent);
  const root = document.documentElement;

  root.style.setProperty('--primary', accentHSL);
  root.style.setProperty('--accent', accentHSL);
  root.style.setProperty('--ring', accentHSL);
  root.style.setProperty('--chart-1', accentHSL);

  if (custom.radius) {
    root.style.setProperty('--radius', `${custom.radius}px`);
  }

  document.body.style.backgroundImage = `
    linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px),
    radial-gradient(circle at 15% 50%, ${theme.bgGlow}, transparent 45%),
    radial-gradient(circle at 85% 30%, ${accent}20, transparent 45%),
    radial-gradient(circle at 50% 120%, ${accent}18, transparent 50%)
  `;
}
