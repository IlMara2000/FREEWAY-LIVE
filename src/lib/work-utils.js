export const WORK_COLORS = {
  low: {
    dot: 'bg-sky-400',
    text: 'text-sky-200',
    chip: 'bg-sky-500/[0.18] border-sky-400/35 text-sky-100',
    rail: 'from-sky-500/25 to-sky-500/5',
  },
  medium: {
    dot: 'bg-emerald-400',
    text: 'text-emerald-200',
    chip: 'bg-emerald-500/[0.18] border-emerald-400/40 text-emerald-100',
    rail: 'from-emerald-500/25 to-emerald-500/5',
  },
  high: {
    dot: 'bg-amber-400',
    text: 'text-amber-200',
    chip: 'bg-amber-500/[0.18] border-amber-400/40 text-amber-100',
    rail: 'from-amber-500/25 to-amber-500/5',
  },
  critical: {
    dot: 'bg-rose-400',
    text: 'text-rose-200',
    chip: 'bg-rose-500/[0.18] border-rose-400/40 text-rose-100',
    rail: 'from-rose-500/25 to-rose-500/5',
  },
};

export const getWorkColor = (priority = 'medium') => WORK_COLORS[priority] || WORK_COLORS.medium;

export const timeToMinutes = (value) => {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export const getTaskDurationHours = (task) => {
  const start = timeToMinutes(task?.start_time);
  const end = timeToMinutes(task?.end_time);
  if (start === null || end === null) return 0;
  const duration = end >= start ? end - start : end + 24 * 60 - start;
  return Math.max(0, duration / 60);
};

export const formatDuration = (hours) => {
  const totalMinutes = Math.round((Number(hours) || 0) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const getMonthKey = (dateValue) => {
  if (!dateValue) return 'Senza data';
  return dateValue.slice(0, 7);
};

export const formatMonthLabel = (monthKey) => {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('it-IT', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
};
