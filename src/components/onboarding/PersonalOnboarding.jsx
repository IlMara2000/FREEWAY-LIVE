import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const ONBOARDING_VERSION = 1;

const fieldClass = 'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-emerald-400/60';
const labelClass = 'space-y-1.5';
const labelTextClass = 'font-mono text-[10px] uppercase tracking-widest text-white/38';

const OPTION_GROUPS = {
  mentalState: [
    ['stressato', 'Stressato'],
    ['stanco', 'Stanco'],
    ['confuso', 'Confuso'],
    ['motivato', 'Motivato'],
    ['frustrato', 'Frustrato'],
  ],
  mentalNoise: [
    ['low', 'Rumore basso'],
    ['medium', 'Rumore medio'],
    ['high', 'Rumore alto'],
    ['chaos', 'Caos mentale'],
  ],
  emotionalPattern: [
    ['stable', 'Abbastanza stabile'],
    ['peaks', 'Picchi forti'],
    ['shutdown', 'Mi spengo'],
    ['impulsive', 'Parto impulsivo'],
  ],
  energyPattern: [
    ['low', 'Bassa'],
    ['medium', 'Media'],
    ['high', 'Alta'],
    ['peaks', 'A picchi'],
  ],
  consistencyPattern: [
    ['too_many_projects', 'Troppi progetti'],
    ['start_stop', 'Parto forte, poi mollo'],
    ['avoidance', 'Rimando anche cose importanti'],
    ['no_clarity', 'Mi manca chiarezza'],
  ],
  workStatus: [
    ['student', 'Studio'],
    ['employee', 'Lavoro'],
    ['freelance', 'Freelance'],
    ['creator', 'Creator/progetti'],
    ['mixed', 'Misto'],
  ],
  focusSpan: [
    ['10', '10 min'],
    ['30', '30 min'],
    ['60', '1h+'],
  ],
  routinePreference: [
    ['libera', 'Libera'],
    ['via-di-mezzo', 'Via di mezzo'],
    ['rigida', 'Rigida'],
  ],
  supportTone: [
    ['calm', 'Calmo'],
    ['direct', 'Diretto'],
    ['hard', 'Duro quando serve'],
  ],
  obstacles: [
    ['overthinking', 'Overthinking'],
    ['procrastinazione', 'Procrastinazione'],
    ['social', 'Social'],
    ['videogiochi', 'Videogiochi'],
    ['stanchezza', 'Stanchezza'],
    ['persone', 'Persone'],
    ['caos', 'Caos'],
  ],
};

const DEFAULT_FORM = {
  mentalState: 'confuso',
  mentalNoise: 'medium',
  emotionalPattern: 'peaks',
  energyPattern: 'peaks',
  consistencyPattern: 'too_many_projects',
  workStatus: 'mixed',
  focusSpan: '30',
  routinePreference: 'via-di-mezzo',
  supportTone: 'direct',
  obstacles: ['overthinking', 'procrastinazione'],
  mainProject: '',
  twoYearGoal: '',
  avoidFuture: '',
  sleepTime: '00:30',
  wakeTime: '08:30',
  privacyAccepted: false,
};

const PRIVACY_NOTICE = [
  'Ti chiediamo queste cose solo per rendere l app piu adatta a te: routine, task, tono e suggerimenti meno generici.',
  'Non e un questionario medico e non serve a farti diagnosi, profilarti o raccogliere dettagli personali inutili.',
  'Freeway non nasce per rivendere informazioni a terzi: le risposte servono dentro l app, per aiutarti a usarla meglio.',
  'Resta leggero: se qualcosa ti sembra troppo personale, non scriverlo. Puoi rifare questa calibrazione quando vuoi.',
].join(' ');

function OptionGrid({ value, options, onChange, columns = 'grid-cols-2' }) {
  return (
    <div className={`grid ${columns} gap-2`}>
      {options.map(([optionValue, label]) => {
        const active = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`min-h-10 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all ${
              active
                ? 'border-emerald-400/55 bg-emerald-400/15 text-emerald-50'
                : 'border-white/10 bg-black/25 text-white/48 hover:border-emerald-400/25 hover:text-white'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function MultiOptionGrid({ value, options, onChange }) {
  const selected = new Set(value || []);

  const toggle = (optionValue) => {
    const next = new Set(selected);
    if (next.has(optionValue)) {
      next.delete(optionValue);
    } else {
      next.add(optionValue);
    }
    onChange([...next]);
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map(([optionValue, label]) => {
        const active = selected.has(optionValue);

        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => toggle(optionValue)}
            className={`min-h-10 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all ${
              active
                ? 'border-orange-300/55 bg-orange-400/16 text-orange-50'
                : 'border-white/10 bg-black/25 text-white/48 hover:border-orange-300/25 hover:text-white'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className={labelClass}>
      <span className={labelTextClass}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

export const isInitialOnboardingComplete = (profile) =>
  Boolean(
    profile?.initial_onboarding?.version >= ONBOARDING_VERSION &&
    profile?.initial_onboarding?.privacy?.accepted
  );

export const buildInitialOnboardingProfilePatch = (form) => {
  const completedAt = new Date().toISOString();
  const obstacles = form.obstacles?.length ? form.obstacles : ['overthinking'];
  const dayByDayEnergy = form.energyPattern === 'low'
    ? 'low'
    : form.mentalNoise === 'chaos'
      ? 'chaos'
      : form.energyPattern === 'high'
        ? 'high'
        : 'medium';

  return {
    initial_onboarding: {
      version: ONBOARDING_VERSION,
      completedAt,
      answers: {
        mentalState: form.mentalState,
        mentalNoise: form.mentalNoise,
        emotionalPattern: form.emotionalPattern,
        energyPattern: form.energyPattern,
        consistencyPattern: form.consistencyPattern,
        workStatus: form.workStatus,
        focusSpan: form.focusSpan,
        routinePreference: form.routinePreference,
        supportTone: form.supportTone,
        obstacles,
        mainProject: form.mainProject.trim(),
        twoYearGoal: form.twoYearGoal.trim(),
        avoidFuture: form.avoidFuture.trim(),
        sleepTime: form.sleepTime,
        wakeTime: form.wakeTime,
      },
      privacy: {
        accepted: true,
        consentMethod: 'checkbox',
        notice: PRIVACY_NOTICE,
        acceptedAt: completedAt,
      },
    },
    day_by_day: {
      configured: true,
      sleepTime: form.sleepTime,
      wakeTime: form.wakeTime,
      phoneHours: '3-5',
      baselineEnergy: form.energyPattern === 'peaks' ? 'picchi' : form.energyPattern,
      training: 'caso',
      focusSpan: form.focusSpan,
      project: form.mainProject.trim(),
      obstacles,
      mentalState: form.mentalState,
      twoYearGoal: form.twoYearGoal.trim(),
      avoidFuture: form.avoidFuture.trim(),
      routinePreference: form.routinePreference,
      transformation: 'sostenibile',
      currentEnergy: dayByDayEnergy,
      updatedAt: completedAt,
    },
  };
};

export default function PersonalOnboarding({ onComplete, saving = false }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState('');

  const steps = useMemo(() => ([
    {
      icon: HeartPulse,
      label: 'Mente',
      title: 'Partiamo da come stai davvero.',
      text: 'Non serve raccontare tutto. Serve capire il carico mentale con cui entri nell app.',
    },
    {
      icon: Sparkles,
      label: 'Carattere',
      title: 'Capisco il tuo modo di funzionare.',
      text: 'La routine deve adattarsi alla tua energia, non diventare un altra pressione.',
    },
    {
      icon: BriefcaseBusiness,
      label: 'Lavoro',
      title: 'Se vuoi, diciamo cosa conta nel mondo reale.',
      text: 'Questa parte e facoltativa. Se oggi non hai chiarezza, puoi lasciarla vuota e andare avanti.',
    },
    {
      icon: ShieldCheck,
      label: 'Privacy',
      title: 'Prima di salvare, consenso chiaro.',
      text: 'Queste risposte sono personali. Devi sapere cosa viene salvato e perche.',
    },
  ]), []);

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const canSubmit = form.privacyAccepted;

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const next = () => {
    setError('');
    setStep((value) => Math.min(value + 1, steps.length - 1));
  };

  const back = () => {
    setError('');
    setStep((value) => Math.max(value - 1, 0));
  };

  const handleSubmit = () => {
    if (!canSubmit || saving) {
      setError('Per continuare devi accettare la privacy.');
      return;
    }

    onComplete?.(buildInitialOnboardingProfilePatch(form));
  };

  return (
    <motion.div
      className="fixed inset-0 z-[95] flex items-end justify-center p-3 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/88 backdrop-blur-xl" />

      <motion.div
        className="relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.35rem] border border-emerald-400/20 bg-[#02050c]/96 shadow-[0_30px_110px_rgba(0,0,0,0.85)] sm:max-h-[calc(100dvh-3rem)]"
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        <div className="border-b border-white/10 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-400/70">
                Prima calibrazione
              </p>
              <h2 className="font-grotesk text-2xl font-black leading-tight text-white sm:text-3xl">
                {currentStep.title}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-white/52">
                {currentStep.text}
              </p>
            </div>

            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10">
              <Icon className="h-5 w-5 text-emerald-300" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {steps.map((item, index) => (
              <div
                key={item.label}
                className={`h-1.5 rounded-full transition-colors ${
                  index <= step ? 'bg-emerald-400' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.22 }}
              className="space-y-5"
            >
              {step === 0 && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className={labelClass}>
                      <span className={labelTextClass}>Stato mentale ora</span>
                      <OptionGrid
                        value={form.mentalState}
                        options={OPTION_GROUPS.mentalState}
                        onChange={(value) => update('mentalState', value)}
                      />
                    </div>

                    <div className={labelClass}>
                      <span className={labelTextClass}>Rumore mentale</span>
                      <OptionGrid
                        value={form.mentalNoise}
                        options={OPTION_GROUPS.mentalNoise}
                        onChange={(value) => update('mentalNoise', value)}
                      />
                    </div>
                  </div>

                  <div className={labelClass}>
                    <span className={labelTextClass}>Gestione emotiva tipica</span>
                    <OptionGrid
                      value={form.emotionalPattern}
                      options={OPTION_GROUPS.emotionalPattern}
                      onChange={(value) => update('emotionalPattern', value)}
                      columns="grid-cols-2 sm:grid-cols-4"
                    />
                  </div>

                  <div className={labelClass}>
                    <span className={labelTextClass}>Ostacoli principali</span>
                    <MultiOptionGrid
                      value={form.obstacles}
                      options={OPTION_GROUPS.obstacles}
                      onChange={(value) => update('obstacles', value)}
                    />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className={labelClass}>
                      <span className={labelTextClass}>Energia</span>
                      <OptionGrid
                        value={form.energyPattern}
                        options={OPTION_GROUPS.energyPattern}
                        onChange={(value) => update('energyPattern', value)}
                      />
                    </div>

                    <div className={labelClass}>
                      <span className={labelTextClass}>Problema di costanza</span>
                      <OptionGrid
                        value={form.consistencyPattern}
                        options={OPTION_GROUPS.consistencyPattern}
                        onChange={(value) => update('consistencyPattern', value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <SelectField
                      label="Focus medio"
                      value={form.focusSpan}
                      options={OPTION_GROUPS.focusSpan}
                      onChange={(value) => update('focusSpan', value)}
                    />
                    <SelectField
                      label="Routine"
                      value={form.routinePreference}
                      options={OPTION_GROUPS.routinePreference}
                      onChange={(value) => update('routinePreference', value)}
                    />
                    <SelectField
                      label="Tono app"
                      value={form.supportTone}
                      options={OPTION_GROUPS.supportTone}
                      onChange={(value) => update('supportTone', value)}
                    />
                  </div>

                  <div className="rounded-2xl border border-orange-300/20 bg-orange-400/10 p-4 text-sm leading-relaxed text-orange-50/72">
                    Se provi a fare tutto, l app ti deve fermare. Non per limitarti: per non farti sparire nel caos.
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Situazione lavoro/studio"
                      value={form.workStatus}
                      options={OPTION_GROUPS.workStatus}
                      onChange={(value) => update('workStatus', value)}
                    />
                    <label className={labelClass}>
                      <span className={labelTextClass}>Progetto principale facoltativo</span>
                      <input
                        value={form.mainProject}
                        onChange={(event) => update('mainProject', event.target.value)}
                        placeholder="Puoi lasciarlo vuoto."
                        className={fieldClass}
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className={labelClass}>
                      <span className={labelTextClass}>Dormo alle</span>
                      <input
                        type="time"
                        value={form.sleepTime}
                        onChange={(event) => update('sleepTime', event.target.value)}
                        className={fieldClass}
                      />
                    </label>
                    <label className={labelClass}>
                      <span className={labelTextClass}>Mi sveglio alle</span>
                      <input
                        type="time"
                        value={form.wakeTime}
                        onChange={(event) => update('wakeTime', event.target.value)}
                        className={fieldClass}
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className={labelClass}>
                      <span className={labelTextClass}>Obiettivo a 2 anni</span>
                      <textarea
                        value={form.twoYearGoal}
                        onChange={(event) => update('twoYearGoal', event.target.value)}
                        rows={4}
                        placeholder="Che vita stai cercando di costruire?"
                        className={`${fieldClass} resize-none`}
                      />
                    </label>
                    <label className={labelClass}>
                      <span className={labelTextClass}>Cosa non vuoi piu</span>
                      <textarea
                        value={form.avoidFuture}
                        onChange={(event) => update('avoidFuture', event.target.value)}
                        rows={4}
                        placeholder="La vita futura da evitare."
                        className={`${fieldClass} resize-none`}
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.07] p-4 text-sm leading-relaxed text-emerald-50/68">
                    Se non vuoi definire lavoro, studio o progetto adesso, continua pure. La chat potra aiutarti a farlo piu avanti.
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="rounded-2xl border border-emerald-400/22 bg-emerald-400/[0.07] p-4">
                    <div className="flex items-start gap-3">
                      <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                      <div className="space-y-2">
                        <h3 className="font-grotesk text-lg font-bold text-white">
                          Privacy e consenso
                        </h3>
                        <p className="text-sm leading-relaxed text-white/62">
                          {PRIVACY_NOTICE}
                        </p>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
                    <input
                      type="checkbox"
                      checked={form.privacyAccepted}
                      onChange={(event) => update('privacyAccepted', event.target.checked)}
                      className="mt-1 h-4 w-4 accent-emerald-400"
                    />
                    <span className="text-sm leading-relaxed text-white/62">
                      Ho capito e accetto: queste risposte servono solo per personalizzare l app. Non devo inserire
                      informazioni mediche o dati personali inutili.
                    </span>
                  </label>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="border-t border-white/10 p-4 sm:p-5">
          {error && (
            <div className="mb-3 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-[auto_1fr] gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 0 || saving}
              className="glass inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white/62 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
              Indietro
            </button>

            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={next}
                disabled={saving}
                className="btn-cyber inline-flex h-12 items-center justify-center gap-2 rounded-xl text-xs"
              >
                Avanti
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || saving}
                className="btn-cyber inline-flex h-12 items-center justify-center gap-2 rounded-xl text-xs disabled:opacity-45"
              >
                <Check className="h-4 w-4" />
                {saving ? 'Salvataggio...' : 'Accetta e inizia'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
