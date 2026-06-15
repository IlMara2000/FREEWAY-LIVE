import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  BriefcaseBusiness,
  Calculator,
  Clock,
  Euro,
  ReceiptText,
  Shield,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { accountData } from '@/api/accountDataClient';
import useUserProfile from '@/hooks/useUserProfile';
import useAccountPreference from '@/hooks/useAccountPreference';
import { normalizeList } from '@/lib/normalize-list';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  formatCurrency,
  formatDuration,
  formatMonthLabel,
  getMonthKey,
  getTaskDurationHours,
  getWorkColor,
} from '@/lib/work-utils';
import {
  DEFAULT_WORK_PROFILE,
  readLegacyWorkProfile,
  writeLegacyWorkProfile,
} from '@/lib/app-preferences';

const WORKER_TYPES = [
  { value: 'employee', label: 'Dipendente' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'professional', label: 'Professionista' },
  { value: 'independent', label: 'Autonomo' },
];

const PAY_MODES = [
  { value: 'hourly', label: 'Paga oraria' },
  { value: 'monthly', label: 'Mensile' },
  { value: 'daily', label: 'Giornaliera' },
];

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getEffectiveHourlyRate = (profile) => {
  const weeklyHours = clamp(toNumber(profile.weeklyHours, 40), 1, 120);
  const workDaysPerWeek = clamp(toNumber(profile.workDaysPerWeek, 5), 1, 7);
  const monthlyHours = (weeklyHours * 52) / 12;

  if (profile.payMode === 'monthly') {
    const monthlySalary = toNumber(profile.monthlySalary, 0);
    const paidMonths = clamp(toNumber(profile.paidMonths, 12), 1, 14);
    return monthlyHours ? ((monthlySalary * paidMonths) / 12) / monthlyHours : 0;
  }

  if (profile.payMode === 'daily') {
    const dailyRate = toNumber(profile.dailyRate, 0);
    const hoursPerDay = weeklyHours / workDaysPerWeek;
    return hoursPerDay ? dailyRate / hoursPerDay : 0;
  }

  return toNumber(profile.hourlyRate, 0);
};

const getMonthlyProjection = (profile, baseHours) => {
  const effectiveHourlyRate = getEffectiveHourlyRate(profile);
  const monthlyHours = baseHours || (toNumber(profile.weeklyHours, 40) * 52) / 12;
  const gross = effectiveHourlyRate * monthlyHours;
  const reservePct = clamp(toNumber(profile.taxReservePct, 0), 0, 90);
  const net = gross * (1 - reservePct / 100);
  return { gross, net };
};

const buildWorkerCopy = (profile) => {
  if (profile.workerType === 'employee') {
    return 'Imposta contratto, mensilita e straordinari. La pagina traduce i turni in stima semplice.';
  }
  if (profile.workerType === 'freelance') {
    return 'Lavora per tariffa e buffer tasse. Vedi subito quante ore hai fatturato davvero.';
  }
  if (profile.workerType === 'professional') {
    return 'Pensata per parcelle orarie o giornaliere con target mensile chiaro.';
  }
  return 'Usala come cruscotto leggero per attivita autonoma, collaborazioni o lavori misti.';
};

export default function Work() {
  const { profile: userProfile, saveProfile } = useUserProfile();
  const [profile, setProfile] = useAccountPreference({
    profile: userProfile,
    saveProfile,
    preferenceKey: 'workProfile',
    defaultValue: DEFAULT_WORK_PROFILE,
    readLocal: readLegacyWorkProfile,
    writeLocal: writeLegacyWorkProfile,
    persistDelay: 280,
  });

  const { data: taskResponse = [], isLoading } = useQuery({
    queryKey: ['work-tasks'],
    queryFn: () => accountData.tasks.list('-due_date', 300),
  });

  const workTasks = normalizeList(taskResponse)
    .filter((task) => task.task_type === 'work')
    .sort((a, b) => (b.due_date || '').localeCompare(a.due_date || '') || (a.start_time || '').localeCompare(b.start_time || ''));

  const monthlyRows = useMemo(() => {
    const map = new Map();
    workTasks.forEach((task) => {
      const key = getMonthKey(task.due_date);
      const current = map.get(key) || { monthKey: key, tasks: [], hours: 0 };
      current.tasks.push(task);
      current.hours += getTaskDurationHours(task);
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [workTasks]);

  const effectiveHourlyRate = getEffectiveHourlyRate(profile);
  const configuredMonthlyHours = (clamp(toNumber(profile.weeklyHours, 40), 1, 120) * 52) / 12;
  const totalHours = monthlyRows.reduce((sum, row) => sum + row.hours, 0);
  const totalGross = totalHours * effectiveHourlyRate;
  const taxReservePct = clamp(toNumber(profile.taxReservePct, 0), 0, 90);
  const totalNet = totalGross * (1 - taxReservePct / 100);
  const monthlyProjection = getMonthlyProjection(profile, configuredMonthlyHours);
  const monthlyAverageHours = monthlyRows.length ? totalHours / monthlyRows.length : 0;
  const overtimeMultiplier = Math.max(toNumber(profile.overtimeMultiplier, 1.25), 1);
  const workDaysPerWeek = clamp(toNumber(profile.workDaysPerWeek, 5), 1, 7);
  const hoursPerDay = configuredMonthlyHours ? (toNumber(profile.weeklyHours, 40) / workDaysPerWeek) : 0;
  const monthlyTarget = toNumber(profile.monthlyTarget, 0);
  const gapToTarget = monthlyTarget > 0 ? monthlyProjection.net - monthlyTarget : 0;

  const updateProfile = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const resetProfile = () => setProfile(DEFAULT_WORK_PROFILE);

  const statCards = [
    { icon: BriefcaseBusiness, label: 'Turni', value: workTasks.length },
    { icon: Clock, label: 'Ore registrate', value: formatDuration(totalHours) },
    { icon: Euro, label: 'Lordo stimato', value: formatCurrency(totalGross) },
    { icon: TrendingUp, label: 'Netto stimato', value: formatCurrency(totalNet) },
  ];

  return (
    <PageShell maxWidth="max-w-7xl" contentClassName="space-y-5">
      <header className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <div className="glass-panel p-5 md:p-6">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Report lavoro</p>
          <h1 className="font-grotesk text-3xl font-black leading-none text-white md:text-5xl text-glow">
            Lavoro
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/48">
            Imposti una volta il tuo contratto o la tua attivita. Poi i turni segnati come lavoro diventano ore, stime e margine reale senza dover rifare i conti ogni volta.
          </p>
        </div>

        <div className="glass-panel space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Profilo attivo</p>
              <h2 className="mt-1 font-grotesk text-xl font-bold text-white">
                {WORKER_TYPES.find((item) => item.value === profile.workerType)?.label}
              </h2>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/16 bg-emerald-400/10 text-emerald-200">
              <WalletCards className="h-5 w-5" />
            </div>
          </div>
          <p className="text-sm leading-relaxed text-white/46">
            {buildWorkerCopy(profile)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/38">Tariffa effettiva</p>
              <p className="mt-1 font-grotesk text-2xl font-bold text-white">{formatCurrency(effectiveHourlyRate)}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/38">Ore mese attese</p>
              <p className="mt-1 font-grotesk text-2xl font-bold text-white">{formatDuration(configuredMonthlyHours)}</p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <div className="glass-panel space-y-4 p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Setup guidato</p>
              <h2 className="mt-1 font-grotesk text-2xl font-bold text-white">Contratto o attivita</h2>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/10 hover:text-white"
              onClick={resetProfile}
            >
              Reset
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Tipo lavoratore</span>
              <Select value={profile.workerType} onValueChange={(value) => updateProfile('workerType', value)}>
                <SelectTrigger className="h-11 rounded-xl border-white/10 bg-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKER_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Come vieni pagato</span>
              <Select value={profile.payMode} onValueChange={(value) => updateProfile('payMode', value)}>
                <SelectTrigger className="h-11 rounded-xl border-white/10 bg-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAY_MODES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Etichetta interna</span>
              <Input
                value={profile.label}
                onChange={(event) => updateProfile('label', event.target.value)}
                placeholder="Es. CCNL Commercio, Studio tecnico, P.IVA marketing..."
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>

            {profile.payMode === 'hourly' && (
              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Euro / ora</span>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={profile.hourlyRate}
                  onChange={(event) => updateProfile('hourlyRate', event.target.value)}
                  className="h-11 rounded-xl border-white/10 bg-black/20"
                />
              </label>
            )}

            {profile.payMode === 'monthly' && (
              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Mensile lorda/netta</span>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={profile.monthlySalary}
                  onChange={(event) => updateProfile('monthlySalary', event.target.value)}
                  className="h-11 rounded-xl border-white/10 bg-black/20"
                />
              </label>
            )}

            {profile.payMode === 'daily' && (
              <label className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Euro / giorno</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={profile.dailyRate}
                  onChange={(event) => updateProfile('dailyRate', event.target.value)}
                  className="h-11 rounded-xl border-white/10 bg-black/20"
                />
              </label>
            )}

            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Ore settimanali</span>
              <Input
                type="number"
                min="1"
                max="120"
                step="0.5"
                value={profile.weeklyHours}
                onChange={(event) => updateProfile('weeklyHours', event.target.value)}
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Giorni / settimana</span>
              <Input
                type="number"
                min="1"
                max="7"
                step="1"
                value={profile.workDaysPerWeek}
                onChange={(event) => updateProfile('workDaysPerWeek', event.target.value)}
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>

            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Mensilita</span>
              <Input
                type="number"
                min="1"
                max="14"
                step="1"
                value={profile.paidMonths}
                onChange={(event) => updateProfile('paidMonths', event.target.value)}
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>

            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Straordinari x</span>
              <Input
                type="number"
                min="1"
                max="3"
                step="0.05"
                value={profile.overtimeMultiplier}
                onChange={(event) => updateProfile('overtimeMultiplier', event.target.value)}
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>

            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Buffer tasse %</span>
              <Input
                type="number"
                min="0"
                max="90"
                step="1"
                value={profile.taxReservePct}
                onChange={(event) => updateProfile('taxReservePct', event.target.value)}
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Target netto mensile</span>
              <Input
                type="number"
                min="0"
                step="10"
                value={profile.monthlyTarget}
                onChange={(event) => updateProfile('monthlyTarget', event.target.value)}
                placeholder="Se vuoi monitorare un obiettivo"
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>

            <div className="rounded-2xl border border-emerald-300/14 bg-emerald-400/[0.045] p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-300/58">Lettura rapida</p>
              <ul className="mt-3 space-y-2 text-sm text-white/62">
                <li>Tariffa effettiva: <span className="font-semibold text-white">{formatCurrency(effectiveHourlyRate)}/h</span></li>
                <li>Ore medie al giorno: <span className="font-semibold text-white">{hoursPerDay ? formatDuration(hoursPerDay) : '0m'}</span></li>
                <li>Straordinario stimato: <span className="font-semibold text-white">{formatCurrency(effectiveHourlyRate * overtimeMultiplier)}/h</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-panel space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Proiezione</p>
                <h2 className="mt-1 font-grotesk text-2xl font-bold text-white">Mese tipo</h2>
              </div>
              <Calculator className="h-5 w-5 text-emerald-300/70" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/38">Lordo mese</p>
                <p className="mt-1 font-grotesk text-2xl font-bold text-white">{formatCurrency(monthlyProjection.gross)}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/38">Netto mese</p>
                <p className="mt-1 font-grotesk text-2xl font-bold text-white">{formatCurrency(monthlyProjection.net)}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-white/56">
                  <Shield className="h-4 w-4 text-cyan-200/70" />
                  <span className="text-sm">Buffer tasse / contributi</span>
                </div>
                <span className="font-mono text-sm text-white">{taxReservePct}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/8">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-cyan-300/70 to-emerald-300/70"
                  style={{ width: `${taxReservePct}%` }}
                />
              </div>
            </div>
            {monthlyTarget > 0 && (
              <div className={`rounded-2xl border p-4 ${
                gapToTarget >= 0
                  ? 'border-emerald-300/18 bg-emerald-400/[0.05]'
                  : 'border-amber-300/18 bg-amber-400/[0.05]'
              }`}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">Target mensile</p>
                <p className="mt-1 text-sm text-white/65">
                  {gapToTarget >= 0
                    ? `Sei sopra target di ${formatCurrency(gapToTarget)}`
                    : `Ti mancano ${formatCurrency(Math.abs(gapToTarget))} per arrivare al target`}
                </p>
              </div>
            )}
          </div>

          <section className="grid grid-cols-2 gap-3">
            {statCards.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.04 }}
                className="glass-panel p-4"
              >
                <item.icon className="mb-4 h-4 w-4 text-emerald-300" />
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">{item.label}</p>
                <p className="mt-1 truncate font-grotesk text-xl font-bold text-white md:text-2xl">{item.value}</p>
              </motion.div>
            ))}
          </section>
        </div>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel space-y-3 p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Lettura mensile</p>
              <h2 className="mt-1 font-grotesk text-xl font-bold text-white">Mesi</h2>
            </div>
            <ReceiptText className="h-4 w-4 text-emerald-300/70" />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-white/5" />)}
            </div>
          ) : monthlyRows.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4 text-sm text-white/42">
              Nessuna task collegata a lavoro. Dal calendario crea o modifica una task e mettila come "Lavoro".
            </div>
          ) : (
            <div className="space-y-2">
              {monthlyRows.map((row) => {
                const rowGross = row.hours * effectiveHourlyRate;
                const rowNet = rowGross * (1 - taxReservePct / 100);
                return (
                  <div key={row.monthKey} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-grotesk text-base font-semibold capitalize text-white">{formatMonthLabel(row.monthKey)}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/35">{row.tasks.length} turni</p>
                      </div>
                      <div className="text-right">
                        <p className="font-grotesk text-lg font-bold text-emerald-200">{formatDuration(row.hours)}</p>
                        <p className="font-mono text-[10px] text-white/45">{formatCurrency(rowGross)} lordo</p>
                        {taxReservePct > 0 && <p className="font-mono text-[10px] text-cyan-100/60">{formatCurrency(rowNet)} netto</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-panel space-y-3 p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Turni</p>
              <h2 className="mt-1 font-grotesk text-xl font-bold text-white">Turni collegati</h2>
            </div>
            <Clock className="h-4 w-4 text-emerald-300/70" />
          </div>

          {workTasks.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4 text-sm text-white/42">
              Qui arrivano i turni gia marcati come lavoro. Ogni riga usa la configurazione sopra per tradurre ore in soldi.
            </div>
          ) : (
            <div className="max-h-[720px] space-y-2 overflow-auto pr-1">
              {workTasks.map((task) => {
                const colors = getWorkColor(task.priority);
                const hours = getTaskDurationHours(task);
                const gross = hours * effectiveHourlyRate;
                const net = gross * (1 - taxReservePct / 100);
                return (
                  <div key={task.id} className={`rounded-2xl border border-white/10 bg-gradient-to-r ${colors.rail} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-grotesk text-sm font-semibold text-white">{task.title}</p>
                        <p className="mt-1 font-mono text-[10px] text-white/45">
                          {task.due_date || 'Senza data'} - {task.start_time || '--:--'} / {task.end_time || '--:--'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-xs text-emerald-200">{formatDuration(hours)}</p>
                        <p className="font-mono text-[10px] text-white/45">{formatCurrency(gross)} lordo</p>
                        {taxReservePct > 0 && <p className="font-mono text-[10px] text-cyan-100/60">{formatCurrency(net)} netto</p>}
                      </div>
                    </div>
                    {task.description && <p className="mt-2 line-clamp-2 text-xs text-white/45">{task.description}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="glass-panel grid gap-3 p-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">Media ore mese</p>
          <p className="mt-1 font-grotesk text-2xl font-bold text-white">{formatDuration(monthlyAverageHours)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">Extra / ora</p>
          <p className="mt-1 font-grotesk text-2xl font-bold text-white">{formatCurrency(effectiveHourlyRate * overtimeMultiplier)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">Cartellino tipo</p>
          <p className="mt-1 font-grotesk text-2xl font-bold text-white">{formatDuration(hoursPerDay)}</p>
        </div>
      </section>
    </PageShell>
  );
}
