import {
  DEFAULT_THEME_CUSTOMIZATION,
  readCustomTheme,
  sanitizeCustomTheme,
  writeCustomTheme,
} from '@/lib/themes';
import { DEFAULT_LANG, LANGUAGE_STORAGE_KEY, getLanguage, setLanguage } from '@/lib/i18n';
import {
  NOTIFICATION_STATE_KEY,
  getNotificationConsentState,
  markNotificationConsentSeen,
} from '@/lib/notifications';

export const APP_PREFERENCES_KEY = 'app_preferences';
export const CALENDAR_SETTINGS_STORAGE_KEY = 'fw_calendar_settings';
export const WORK_PROFILE_STORAGE_KEY = 'fw_work_profile_v2';
export const SCHOOL_PROFILE_STORAGE_KEY = 'fw_school_profile_v1';

export const DEFAULT_CALENDAR_SETTINGS = {
  preset: 'european',
  view: 'month',
};

export const DEFAULT_WORK_PROFILE = {
  workerType: 'employee',
  payMode: 'hourly',
  label: '',
  hourlyRate: '10',
  monthlySalary: '1600',
  dailyRate: '80',
  weeklyHours: '40',
  workDaysPerWeek: '5',
  paidMonths: '12',
  overtimeMultiplier: '1.25',
  taxReservePct: '0',
  monthlyTarget: '0',
};

export const DEFAULT_SCHOOL_PROFILE = {
  studentType: 'middle',
  studyMode: 'mixed',
  classLabel: '',
  weeklyStudyHours: '8',
  studyDaysPerWeek: '5',
  sessionMinutes: '50',
  revisionMultiplier: '2',
  targetGrade: '8',
  monthlyTargetHours: '0',
  testLeadDays: '3',
};

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

const clone = (value) => JSON.parse(JSON.stringify(value));

const deepMerge = (base, patch) => {
  if (!isPlainObject(base) || !isPlainObject(patch)) return clone(patch);

  const next = { ...base };
  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined) return;
    next[key] = isPlainObject(value) && isPlainObject(base[key])
      ? deepMerge(base[key], value)
      : clone(value);
  });
  return next;
};

const readJsonStorage = (key, fallback) => {
  if (typeof window === 'undefined') return clone(fallback);

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return clone(fallback);
    return { ...fallback, ...JSON.parse(stored) };
  } catch {
    return clone(fallback);
  }
};

const writeJsonStorage = (key, value) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is optional.
  }
};

const readRawPreferences = (profile) => {
  const onboarding = profile?.initial_onboarding;
  if (!isPlainObject(onboarding)) return {};
  const raw = onboarding[APP_PREFERENCES_KEY];
  return isPlainObject(raw) ? raw : {};
};

export const hasStoredAppPreference = (profile, key) =>
  Object.prototype.hasOwnProperty.call(readRawPreferences(profile), key);

export const getAvatarStorageKey = (userId) => `fw_account_avatar_${userId || 'guest'}`;

export const readLegacyAvatar = (userId) => {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(getAvatarStorageKey(userId)) || '';
  } catch {
    return '';
  }
};

export const writeLegacyAvatar = (userId, value) => {
  if (typeof window === 'undefined' || !userId) return;

  try {
    if (value) {
      window.localStorage.setItem(getAvatarStorageKey(userId), value);
    } else {
      window.localStorage.removeItem(getAvatarStorageKey(userId));
    }
  } catch {
    // Optional mirror for local rendering.
  }
};

export const readLegacyWorkProfile = () => readJsonStorage(WORK_PROFILE_STORAGE_KEY, DEFAULT_WORK_PROFILE);
export const writeLegacyWorkProfile = (value) => writeJsonStorage(WORK_PROFILE_STORAGE_KEY, value);

export const readLegacySchoolProfile = () => readJsonStorage(SCHOOL_PROFILE_STORAGE_KEY, DEFAULT_SCHOOL_PROFILE);
export const writeLegacySchoolProfile = (value) => writeJsonStorage(SCHOOL_PROFILE_STORAGE_KEY, value);

export const sanitizeCalendarSettings = (value = {}) => {
  const preset = typeof value?.preset === 'string' ? value.preset : DEFAULT_CALENDAR_SETTINGS.preset;
  const view = typeof value?.view === 'string' ? value.view : DEFAULT_CALENDAR_SETTINGS.view;

  return {
    preset,
    view,
  };
};

export const readLegacyCalendarSettings = () =>
  sanitizeCalendarSettings(readJsonStorage(CALENDAR_SETTINGS_STORAGE_KEY, DEFAULT_CALENDAR_SETTINGS));

export const writeLegacyCalendarSettings = (value) =>
  writeJsonStorage(CALENDAR_SETTINGS_STORAGE_KEY, sanitizeCalendarSettings(value));

export const sanitizeNotificationConsentState = (value) =>
  ['new', 'asked', 'denied', 'granted', 'unsupported', 'default'].includes(value)
    ? value
    : 'new';

export const readLegacyNotificationState = () => getNotificationConsentState();

export const writeLegacyNotificationState = (value) => {
  const nextState = sanitizeNotificationConsentState(value);
  if (!['asked', 'denied', 'granted'].includes(nextState)) return;
  markNotificationConsentSeen(nextState);
};

export const sanitizeLanguagePreference = (value) =>
  typeof value === 'string' && value.trim() ? value : DEFAULT_LANG;

export const readLegacyLanguage = () => {
  if (typeof window === 'undefined') return DEFAULT_LANG;

  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || getLanguage() || DEFAULT_LANG;
  } catch {
    return getLanguage() || DEFAULT_LANG;
  }
};

export const writeLegacyLanguage = (value) => {
  const nextLanguage = sanitizeLanguagePreference(value);
  if (getLanguage() !== nextLanguage) {
    setLanguage(nextLanguage);
    return;
  }

  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  } catch {
    // Ignore local storage failures.
  }
};

export const sanitizeAppPreferenceValue = (key, value) => {
  switch (key) {
    case 'themeCustomization':
      return sanitizeCustomTheme(value);
    case 'calendarSettings':
      return sanitizeCalendarSettings(value);
    case 'workProfile':
      return { ...DEFAULT_WORK_PROFILE, ...(value || {}) };
    case 'schoolProfile':
      return { ...DEFAULT_SCHOOL_PROFILE, ...(value || {}) };
    case 'notificationConsentState':
      return sanitizeNotificationConsentState(value);
    case 'language':
      return sanitizeLanguagePreference(value);
    case 'avatarDataUrl':
      return typeof value === 'string' ? value : '';
    default:
      return clone(value ?? null);
  }
};

export const getAppPreferences = (profile) => {
  const raw = readRawPreferences(profile);

  return {
    themeCustomization: sanitizeAppPreferenceValue('themeCustomization', raw.themeCustomization ?? readCustomTheme()),
    calendarSettings: sanitizeAppPreferenceValue('calendarSettings', raw.calendarSettings ?? DEFAULT_CALENDAR_SETTINGS),
    workProfile: sanitizeAppPreferenceValue('workProfile', raw.workProfile ?? DEFAULT_WORK_PROFILE),
    schoolProfile: sanitizeAppPreferenceValue('schoolProfile', raw.schoolProfile ?? DEFAULT_SCHOOL_PROFILE),
    notificationConsentState: sanitizeAppPreferenceValue('notificationConsentState', raw.notificationConsentState ?? readLegacyNotificationState()),
    language: sanitizeAppPreferenceValue('language', raw.language ?? readLegacyLanguage()),
    avatarDataUrl: sanitizeAppPreferenceValue('avatarDataUrl', raw.avatarDataUrl ?? ''),
  };
};

export const buildProfileWithAppPreferences = (profile, patch = {}) => {
  const currentOnboarding = isPlainObject(profile?.initial_onboarding) ? profile.initial_onboarding : {};
  const currentPreferences = readRawPreferences(profile);
  const sanitizedPatch = Object.entries(patch).reduce((acc, [key, value]) => {
    acc[key] = sanitizeAppPreferenceValue(key, value);
    return acc;
  }, {});

  return {
    ...(profile || {}),
    initial_onboarding: {
      ...currentOnboarding,
      [APP_PREFERENCES_KEY]: deepMerge(currentPreferences, sanitizedPatch),
    },
  };
};

const isDefaultValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export const collectLegacyPreferencePatch = (profile, userId) => {
  const patch = {};

  if (!hasStoredAppPreference(profile, 'themeCustomization')) {
    const themeCustomization = sanitizeCustomTheme(readCustomTheme());
    if (!isDefaultValue(themeCustomization, DEFAULT_THEME_CUSTOMIZATION)) {
      patch.themeCustomization = themeCustomization;
    }
  }

  if (!hasStoredAppPreference(profile, 'calendarSettings')) {
    const calendarSettings = readLegacyCalendarSettings();
    if (!isDefaultValue(calendarSettings, DEFAULT_CALENDAR_SETTINGS)) {
      patch.calendarSettings = calendarSettings;
    }
  }

  if (!hasStoredAppPreference(profile, 'workProfile')) {
    const workProfile = readLegacyWorkProfile();
    if (!isDefaultValue(workProfile, DEFAULT_WORK_PROFILE)) {
      patch.workProfile = workProfile;
    }
  }

  if (!hasStoredAppPreference(profile, 'schoolProfile')) {
    const schoolProfile = readLegacySchoolProfile();
    if (!isDefaultValue(schoolProfile, DEFAULT_SCHOOL_PROFILE)) {
      patch.schoolProfile = schoolProfile;
    }
  }

  if (!hasStoredAppPreference(profile, 'language')) {
    const language = readLegacyLanguage();
    if (language !== DEFAULT_LANG) {
      patch.language = language;
    }
  }

  if (!hasStoredAppPreference(profile, 'notificationConsentState')) {
    const notificationConsentState = readLegacyNotificationState();
    if (notificationConsentState !== 'new') {
      patch.notificationConsentState = notificationConsentState;
    }
  }

  if (!hasStoredAppPreference(profile, 'avatarDataUrl')) {
    const avatarDataUrl = readLegacyAvatar(userId);
    if (avatarDataUrl) {
      patch.avatarDataUrl = avatarDataUrl;
    }
  }

  return patch;
};

export const applyProfilePreferencesToClient = (profile, userId) => {
  const preferences = getAppPreferences(profile);

  writeCustomTheme(preferences.themeCustomization);
  writeLegacyCalendarSettings(preferences.calendarSettings);
  writeLegacyWorkProfile(preferences.workProfile);
  writeLegacySchoolProfile(preferences.schoolProfile);
  writeLegacyNotificationState(preferences.notificationConsentState);
  writeLegacyLanguage(preferences.language);

  if (preferences.avatarDataUrl) {
    writeLegacyAvatar(userId, preferences.avatarDataUrl);
  }

  return preferences;
};
