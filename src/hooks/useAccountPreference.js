import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildProfileWithAppPreferences,
  getAppPreferences,
  hasStoredAppPreference,
  sanitizeAppPreferenceValue,
} from '@/lib/app-preferences';

export default function useAccountPreference({
  profile,
  saveProfile,
  preferenceKey,
  defaultValue,
  readLocal,
  writeLocal,
  persistDelay = 0,
}) {
  const preferences = useMemo(() => getAppPreferences(profile), [profile?.initial_onboarding]);
  const hasStored = hasStoredAppPreference(profile, preferenceKey);
  const profileValue = preferences[preferenceKey];
  const timerRef = useRef(null);

  const sanitize = useCallback(
    (value) => sanitizeAppPreferenceValue(preferenceKey, value ?? defaultValue),
    [defaultValue, preferenceKey],
  );

  const resolveInitialValue = useCallback(() => {
    if (hasStored) return sanitize(profileValue);

    const localValue = readLocal?.();
    if (localValue !== undefined && localValue !== null) {
      return sanitize(localValue);
    }

    return sanitize(defaultValue);
  }, [defaultValue, hasStored, profileValue, readLocal, sanitize]);

  const [value, setValue] = useState(resolveInitialValue);

  useEffect(() => {
    const nextValue = resolveInitialValue();
    const serializedNextValue = JSON.stringify(nextValue);
    const serializedCurrentValue = JSON.stringify(value);

    if (serializedNextValue !== serializedCurrentValue) {
      setValue(nextValue);
    }

    writeLocal?.(nextValue);
  }, [resolveInitialValue, value, writeLocal]);

  useEffect(() => {
    if (!profile || !saveProfile || hasStored) return;

    const localValue = readLocal?.();
    if (localValue === undefined || localValue === null) return;

    const nextValue = sanitize(localValue);
    const defaultSerializedValue = JSON.stringify(sanitize(defaultValue));
    const nextSerializedValue = JSON.stringify(nextValue);

    if (nextSerializedValue === defaultSerializedValue) return;

    saveProfile(buildProfileWithAppPreferences(profile, { [preferenceKey]: nextValue })).catch(() => {
      // Local preference stays usable even if remote sync is temporarily unavailable.
    });
  }, [defaultValue, hasStored, preferenceKey, profile, readLocal, sanitize, saveProfile]);

  useEffect(() => () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const persistRemote = useCallback((nextValue) => {
    if (!profile || !saveProfile) return;

    const run = () => {
      saveProfile(buildProfileWithAppPreferences(profile, {
        [preferenceKey]: sanitize(nextValue),
      })).catch(() => {
        // Best effort remote sync.
      });
    };

    if (persistDelay > 0) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(run, persistDelay);
      return;
    }

    run();
  }, [persistDelay, preferenceKey, profile, sanitize, saveProfile]);

  const updateValue = useCallback((next) => {
    setValue((current) => {
      const resolved = sanitize(typeof next === 'function' ? next(current) : next);
      writeLocal?.(resolved);
      persistRemote(resolved);
      return resolved;
    });
  }, [persistRemote, sanitize, writeLocal]);

  return [value, updateValue];
}
