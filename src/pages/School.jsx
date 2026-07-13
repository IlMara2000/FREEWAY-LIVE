import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Brain,
  Clock,
  GraduationCap,
  ReceiptText,
  Save,
  Target,
  TrendingUp,
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
  formatDuration,
  formatMonthLabel,
  getMonthKey,
  getTaskDurationHours,
  getWorkColor,
} from '@/lib/work-utils';
import {
  DEFAULT_SCHOOL_PROFILE,
  buildProfileWithAppPreferences,
  readLegacySchoolProfile,
  writeLegacySchoolProfile,
} from '@/lib/app-preferences';

const STUDENT_TYPES = [
  { value: 'primary', label: 'Elementari' },
  { value: 'middle', label: 'Medie' },
  { value: 'high', label: 'Superiori' },
  { value: 'university', label: 'Università' },
  { value: 'mixed', label: 'Percorso misto' },
];

const STUDY_MODES = [
  { value: 'mixed', label: 'Misto' },
  { value: 'homework', label: 'Compiti' },
  { value: 'tests', label: 'Verifiche' },
  { value: 'exams', label: 'Esami' },
];

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getTargetGradeConfig = (studentType) => {
  if (studentType === 'university') {
    return {
      min: 18,
      max: 31,
      step: 1,
      defaultValue: '18',
      format: (value) => (value >= 31 ? '30 e lode' : `${value}/30`),
    };
  }

  return {
    min: 1,
    max: 10,
    step: 0.5,
    defaultValue: '8',
    format: (value) => `${value}/10`,
  };
};

const inferStudyKind = (task = {}) => {
  const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
  if (text.includes('esame')) return 'Esame';
  if (text.includes('verifica') || text.includes('interrog')) return 'Verifica';
  if (text.includes('compito')) return 'Compito';
  return 'Studio';
};

const buildStudentCopy = (profile) => {
  if (profile.studentType === 'primary') return 'Pensata per compiti, routine semplici e qualche verifica importante.';
  if (profile.studentType === 'middle') return 'Utile per tenere sotto controllo compiti, verifiche e ripassi senza caos.';
  if (profile.studentType === 'high') return 'Tieni insieme studio, verifiche ed esami con un carico leggibile.';
  if (profile.studentType === 'university') return 'Buona per corsi, esami e sessioni di studio piu lunghe.';
  return 'Usala come cruscotto studio per bambini, ragazzi o percorsi misti.';
};

export default function School() {
  const { profile: userProfile, saveProfile } = useUserProfile();
  const [saveStatus, setSaveStatus] = useState('idle');
  const [profile, setProfile] = useAccountPreference({
    profile: userProfile,
    saveProfile,
    preferenceKey: 'schoolProfile',
    defaultValue: DEFAULT_SCHOOL_PROFILE,
    readLocal: readLegacySchoolProfile,
    writeLocal: writeLegacySchoolProfile,
    persistDelay: 280,
  });

  const { data: taskResponse = [], isLoading } = useQuery({
    queryKey: ['school-tasks'],
    queryFn: () => accountData.tasks.list('-due_date', 300),
  });

  const schoolTasks = normalizeList(taskResponse)
    .filter((task) => task.task_type === 'study')
    .sort((a, b) => (b.due_date || '').localeCompare(a.due_date || '') || (a.start_time || '').localeCompare(b.start_time || ''));

  const monthlyRows = useMemo(() => {
    const map = new Map();
    schoolTasks.forEach((task) => {
      const key = getMonthKey(task.due_date);
      const current = map.get(key) || { monthKey: key, tasks: [], hours: 0 };
      current.tasks.push(task);
      current.hours += getTaskDurationHours(task);
      map.set(key, current);
    });

    return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [schoolTasks]);

  const weeklyStudyHours = clamp(toNumber(profile.weeklyStudyHours, 8), 1, 80);
  const studyDaysPerWeek = clamp(toNumber(profile.studyDaysPerWeek, 5), 1, 7);
  const sessionMinutes = clamp(toNumber(profile.sessionMinutes, 50), 15, 240);
  const revisionMultiplier = Math.max(toNumber(profile.revisionMultiplier, 2), 1);
  const monthlyStudyHours = (weeklyStudyHours * 52) / 12;
  const hoursPerDay = weeklyStudyHours / studyDaysPerWeek;
  const totalHours = monthlyRows.reduce((sum, row) => sum + row.hours, 0);
  const totalAssessments = schoolTasks.filter((task) => ['Verifica', 'Esame'].includes(inferStudyKind(task))).length;
  const monthlyAverageHours = monthlyRows.length ? totalHours / monthlyRows.length : 0;
  const targetGradeConfig = getTargetGradeConfig(profile.studentType);
  const targetGrade = clamp(toNumber(profile.targetGrade, Number(targetGradeConfig.defaultValue)), targetGradeConfig.min, targetGradeConfig.max);
  const monthlyTargetHours = toNumber(profile.monthlyTargetHours, 0);
  const targetGapHours = monthlyTargetHours > 0 ? monthlyStudyHours - monthlyTargetHours : 0;
  const revisionHours = (sessionMinutes / 60) * revisionMultiplier;

  const updateProfile = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }));
  };

  const handleStudentTypeChange = (value) => {
    const nextConfig = getTargetGradeConfig(value);
    const currentTarget = toNumber(profile.targetGrade, Number(nextConfig.defaultValue));
    const normalizedTarget = clamp(currentTarget, nextConfig.min, nextConfig.max);

    setProfile((current) => ({
      ...current,
      studentType: value,
      targetGrade: String(normalizedTarget),
    }));
  };

  const resetProfile = () => setProfile(DEFAULT_SCHOOL_PROFILE);

  const handleManualSave = async () => {
    if (!userProfile || !saveProfile) return;

    setSaveStatus('saving');
    writeLegacySchoolProfile(profile);

    try {
      await saveProfile(buildProfileWithAppPreferences(userProfile, { schoolProfile: profile }));
      setSaveStatus('saved');
      window.setTimeout(() => setSaveStatus('idle'), 1800);
    } catch {
      setSaveStatus('error');
    }
  };

  const statCards = [
    { icon: BookOpen, label: 'Sessioni', value: schoolTasks.length },
    { icon: Clock, label: 'Ore studio', value: formatDuration(totalHours) },
    { icon: GraduationCap, label: 'Verifiche/esami', value: totalAssessments },
    { icon: TrendingUp, label: 'Media mese', value: formatDuration(monthlyAverageHours) },
  ];

  return (
    <PageShell maxWidth="max-w-7xl" contentClassName="space-y-5">
      <header className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <div className="glass-panel p-5 md:p-6">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Report studio</p>
          <h1 className="font-grotesk text-3xl font-black leading-none text-white md:text-5xl text-glow">
            Scuola / Università
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/48">
            Una sezione per scuola, università, corsi, esami, appelli, verifiche e compiti. I task segnati come studio diventano tempo, carico e ripasso stimato.
          </p>
          <div className="mt-4 rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.045] p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-300/65">Come funziona nell'app</p>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-white/58">
              Configuri il tuo livello o percorso, poi in Planner o Calendario imposti le attività come “Studio”.
              Freeway raggruppa compiti, esami e sessioni per mese, stima ore, ripasso e distanza dal voto target.
            </p>
          </div>
        </div>

        <div className="glass-panel space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Profilo studio</p>
              <h2 className="mt-1 font-grotesk text-xl font-bold text-white">
                {STUDENT_TYPES.find((item) => item.value === profile.studentType)?.label}
              </h2>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/16 bg-emerald-400/10 text-emerald-200">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
          <p className="text-sm leading-relaxed text-white/46">
            {buildStudentCopy(profile)}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/38">Ore mese attese</p>
              <p className="mt-1 font-grotesk text-2xl font-bold text-white">{formatDuration(monthlyStudyHours)}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/38">Sessione tipo</p>
              <p className="mt-1 font-grotesk text-2xl font-bold text-white">{formatDuration(sessionMinutes / 60)}</p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <div className="glass-panel space-y-4 p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Setup guidato</p>
              <h2 className="mt-1 font-grotesk text-2xl font-bold text-white">Metodo studio</h2>
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
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Livello</span>
              <Select value={profile.studentType} onValueChange={handleStudentTypeChange}>
                <SelectTrigger className="h-11 rounded-xl border-white/10 bg-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Focus principale</span>
              <Select value={profile.studyMode} onValueChange={(value) => updateProfile('studyMode', value)}>
                <SelectTrigger className="h-11 rounded-xl border-white/10 bg-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STUDY_MODES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Classe / materia / corso universitario</span>
              <Input
                value={profile.classLabel}
                onChange={(event) => updateProfile('classLabel', event.target.value)}
                placeholder="Es. Analisi 1, tesi, sessione estiva..."
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>

            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Ore studio / settimana</span>
              <Input
                type="number"
                min="1"
                max="80"
                step="0.5"
                value={profile.weeklyStudyHours}
                onChange={(event) => updateProfile('weeklyStudyHours', event.target.value)}
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>

            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Giorni studio / settimana</span>
              <Input
                type="number"
                min="1"
                max="7"
                step="1"
                value={profile.studyDaysPerWeek}
                onChange={(event) => updateProfile('studyDaysPerWeek', event.target.value)}
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Minuti sessione</span>
              <Input
                type="number"
                min="15"
                max="240"
                step="5"
                value={profile.sessionMinutes}
                onChange={(event) => updateProfile('sessionMinutes', event.target.value)}
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>

            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Ripasso x</span>
              <Input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={profile.revisionMultiplier}
                onChange={(event) => updateProfile('revisionMultiplier', event.target.value)}
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>

            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Voto target</span>
              <Input
                type="number"
                min={String(targetGradeConfig.min)}
                max={String(targetGradeConfig.max)}
                step={String(targetGradeConfig.step)}
                value={profile.targetGrade}
                onChange={(event) => updateProfile('targetGrade', event.target.value)}
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>

            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Giorni anticipo</span>
              <Input
                type="number"
                min="0"
                max="30"
                step="1"
                value={profile.testLeadDays}
                onChange={(event) => updateProfile('testLeadDays', event.target.value)}
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <label className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/42">Target ore mese</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={profile.monthlyTargetHours}
                onChange={(event) => updateProfile('monthlyTargetHours', event.target.value)}
                placeholder="Se vuoi controllare un obiettivo"
                className="h-11 rounded-xl border-white/10 bg-black/20"
              />
            </label>

            <div className="rounded-2xl border border-emerald-300/14 bg-emerald-400/[0.045] p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-300/58">Lettura rapida</p>
              <ul className="mt-3 space-y-2 text-sm text-white/62">
                <li>Ore al giorno: <span className="font-semibold text-white">{formatDuration(hoursPerDay)}</span></li>
                <li>Ripasso per verifica: <span className="font-semibold text-white">{formatDuration(revisionHours)}</span></li>
                <li>Voto target: <span className="font-semibold text-white">{targetGradeConfig.format(targetGrade)}</span></li>
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
              <Brain className="h-5 w-5 text-emerald-300/70" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/38">Ore attese</p>
                <p className="mt-1 font-grotesk text-2xl font-bold text-white">{formatDuration(monthlyStudyHours)}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/38">Sessioni mese</p>
                <p className="mt-1 font-grotesk text-2xl font-bold text-white">{Math.round((monthlyStudyHours * 60) / sessionMinutes)}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-white/56">
                  <Target className="h-4 w-4 text-cyan-200/70" />
                  <span className="text-sm">Finestra ripasso consigliata</span>
                </div>
                <span className="font-mono text-sm text-white">{clamp(toNumber(profile.testLeadDays, 3), 0, 30)} giorni</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/8">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-cyan-300/70 to-emerald-300/70"
                  style={{ width: `${Math.min((clamp(toNumber(profile.testLeadDays, 3), 0, 30) / 30) * 100, 100)}%` }}
                />
              </div>
            </div>
            {monthlyTargetHours > 0 && (
              <div className={`rounded-2xl border p-4 ${
                targetGapHours >= 0
                  ? 'border-emerald-300/18 bg-emerald-400/[0.05]'
                  : 'border-amber-300/18 bg-amber-400/[0.05]'
              }`}>
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">Target ore mese</p>
                <p className="mt-1 text-sm text-white/65">
                  {targetGapHours >= 0
                    ? `Sei sopra target di ${formatDuration(targetGapHours)}`
                    : `Ti mancano ${formatDuration(Math.abs(targetGapHours))} per arrivare al target`}
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
              Nessuna task collegata a studio. Dal Calendario o dal Planner crea una task e mettila come "Studio".
            </div>
          ) : (
            <div className="space-y-2">
              {monthlyRows.map((row) => {
                const assessments = row.tasks.filter((task) => ['Verifica', 'Esame'].includes(inferStudyKind(task))).length;
                return (
                  <div key={row.monthKey} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-grotesk text-base font-semibold capitalize text-white">{formatMonthLabel(row.monthKey)}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/35">
                          {row.tasks.length} sessioni
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-grotesk text-lg font-bold text-emerald-200">{formatDuration(row.hours)}</p>
                        <p className="font-mono text-[10px] text-white/45">{assessments} verifiche/esami</p>
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
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Studio</p>
              <h2 className="mt-1 font-grotesk text-xl font-bold text-white">Task collegate</h2>
            </div>
            <Clock className="h-4 w-4 text-emerald-300/70" />
          </div>

          {schoolTasks.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.035] p-4 text-sm text-white/42">
              Qui arrivano compiti, verifiche ed esami segnati come studio.
            </div>
          ) : (
            <div className="max-h-[720px] space-y-2 overflow-auto pr-1">
              {schoolTasks.map((task) => {
                const colors = getWorkColor(task.priority);
                const hours = getTaskDurationHours(task);
                const kind = inferStudyKind(task);
                return (
                  <div key={task.id} className={`rounded-2xl border border-white/10 bg-gradient-to-r ${colors.rail} p-4`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-grotesk text-sm font-semibold text-white">{task.title}</p>
                          <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cyan-100/75">
                            {kind}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[10px] text-white/45">
                          {task.due_date || 'Senza data'} - {task.start_time || '--:--'} / {task.end_time || '--:--'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-xs text-emerald-200">{formatDuration(hours)}</p>
                        <p className="font-mono text-[10px] text-white/45">{kind}</p>
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

      <section className="glass-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/60">Salvataggio</p>
          <p className="mt-1 text-sm text-white/52">
            Le modifiche vengono sincronizzate automaticamente. Usa questo pulsante se vuoi forzare il salvataggio subito.
          </p>
          {saveStatus === 'error' && (
            <p className="mt-2 text-xs font-semibold text-amber-200">Non sono riuscito a salvare ora. Riprova tra poco.</p>
          )}
        </div>
        <Button
          type="button"
          onClick={handleManualSave}
          disabled={saveStatus === 'saving' || !userProfile || !saveProfile}
          className="btn-cyber h-12 shrink-0 rounded-xl px-6 text-xs"
        >
          <Save className="mr-2 h-4 w-4" />
          {saveStatus === 'saving' ? 'Salvo...' : saveStatus === 'saved' ? 'Salvato' : 'Salva'}
        </Button>
      </section>
    </PageShell>
  );
}
