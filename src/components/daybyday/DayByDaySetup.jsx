import React, { useEffect, useMemo, useState } from 'react';
import {
  DAY_BY_DAY_OPTIONS,
  normalizeDayByDayProfile,
} from '@/lib/day-by-day';
import { Save } from 'lucide-react';

const fieldClass = 'min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none transition-colors [color-scheme:dark] focus:border-emerald-400/55';
const labelClass = 'min-w-0 space-y-1.5';
const labelTextClass = 'font-mono text-[10px] uppercase tracking-widest text-white/35';

function SelectField({ label, value, options, onChange }) {
  return (
    <label className={labelClass}>
      <span className={labelTextClass}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass}>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function DayByDaySetup({ value, onSave, saving = false }) {
  const initialValue = useMemo(() => normalizeDayByDayProfile(value), [value]);
  const [form, setForm] = useState(initialValue);

  useEffect(() => {
    setForm(initialValue);
  }, [initialValue]);

  const updateField = (key, nextValue) => {
    setForm((current) => ({ ...current, [key]: nextValue }));
  };

  const toggleObstacle = (obstacle) => {
    setForm((current) => {
      const obstacles = new Set(current.obstacles || []);
      if (obstacles.has(obstacle)) {
        obstacles.delete(obstacle);
      } else {
        obstacles.add(obstacle);
      }

      return { ...current, obstacles: [...obstacles] };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave?.({
      ...form,
      configured: true,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel min-w-0 space-y-4 p-4 md:p-5">
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400/65">
          Calibrazione Day by Day
        </p>
        <h3 className="font-grotesk text-xl font-bold text-white">
          Routine personale, non gabbia.
        </h3>
        <p className="text-sm text-white/50">
          Servono pochi dati. L'app li usa per generare giornate leggere, concrete e sostenibili.
        </p>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <label className={labelClass}>
          <span className={labelTextClass}>Dormo alle</span>
          <input
            type="time"
            value={form.sleepTime}
            onChange={(event) => updateField('sleepTime', event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Mi sveglio alle</span>
          <input
            type="time"
            value={form.wakeTime}
            onChange={(event) => updateField('wakeTime', event.target.value)}
            className={fieldClass}
          />
        </label>

        <SelectField
          label="Telefono/social"
          value={form.phoneHours}
          options={DAY_BY_DAY_OPTIONS.phoneHours}
          onChange={(value) => updateField('phoneHours', value)}
        />
        <SelectField
          label="Energia base"
          value={form.baselineEnergy}
          options={DAY_BY_DAY_OPTIONS.baselineEnergy}
          onChange={(value) => updateField('baselineEnergy', value)}
        />
        <SelectField
          label="Allenamento"
          value={form.training}
          options={DAY_BY_DAY_OPTIONS.training}
          onChange={(value) => updateField('training', value)}
        />
        <SelectField
          label="Focus medio"
          value={form.focusSpan}
          options={DAY_BY_DAY_OPTIONS.focusSpan}
          onChange={(value) => updateField('focusSpan', value)}
        />
        <SelectField
          label="Stato mentale"
          value={form.mentalState}
          options={DAY_BY_DAY_OPTIONS.mentalState}
          onChange={(value) => updateField('mentalState', value)}
        />
        <SelectField
          label="Routine"
          value={form.routinePreference}
          options={DAY_BY_DAY_OPTIONS.routinePreference}
          onChange={(value) => updateField('routinePreference', value)}
        />
      </div>

      <label className={labelClass}>
        <span className={labelTextClass}>Progetto principale del mese</span>
        <input
          value={form.project}
          onChange={(event) => updateField('project', event.target.value)}
          placeholder="Es. Under The Tower Factory"
          className={fieldClass}
        />
      </label>

      <div className="space-y-2">
        <span className={labelTextClass}>Ostacoli principali</span>
        <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DAY_BY_DAY_OPTIONS.obstacles.map(([obstacle, label]) => {
            const active = form.obstacles?.includes(obstacle);

            return (
              <button
                key={obstacle}
                type="button"
                onClick={() => toggleObstacle(obstacle)}
                className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-all ${
                  active
                    ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-100'
                    : 'border-white/10 bg-black/20 text-white/45 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <label className={labelClass}>
          <span className={labelTextClass}>Obiettivo a 2 anni</span>
          <textarea
            value={form.twoYearGoal}
            onChange={(event) => updateField('twoYearGoal', event.target.value)}
            rows={3}
            placeholder="Cosa stai costruendo davvero?"
            className={`${fieldClass} resize-none`}
          />
        </label>
        <label className={labelClass}>
          <span className={labelTextClass}>Cosa non voglio</span>
          <textarea
            value={form.avoidFuture}
            onChange={(event) => updateField('avoidFuture', event.target.value)}
            rows={3}
            placeholder="La vita futura da evitare."
            className={`${fieldClass} resize-none`}
          />
        </label>
      </div>

      <SelectField
        label="Trasformazione"
        value={form.transformation}
        options={DAY_BY_DAY_OPTIONS.transformation}
        onChange={(value) => updateField('transformation', value)}
      />

      <button
        type="submit"
        disabled={saving}
        className="btn-cyber flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Salvataggio...' : 'Salva calibrazione'}
      </button>
    </form>
  );
}
