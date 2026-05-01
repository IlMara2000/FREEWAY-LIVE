import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

const LOCAL_ID_PREFIX = 'local_';
export const ACCOUNT_DATA_CHANGED_EVENT = 'fw:account-data-changed';

const ENTITY_CONFIG = {
  Task: { collection: 'tasks', defaultSort: '-created_date' },
  FocusSession: { collection: 'focusSessions', defaultSort: '-created_date' },
  UserProfile: { collection: 'userProfiles', defaultSort: '-updated_date' },
};

const ENTITY_DEFAULTS = {
  Task: () => ({
    status: 'inbox',
    priority: 'medium',
    xp_value: 25,
    is_brain_dump: false,
  }),
  FocusSession: () => ({
    completed: false,
    xp_earned: 0,
  }),
  UserProfile: () => ({
    total_xp: 0,
    level: 1,
    active_theme: 'emerald',
    unlocked_themes: ['emerald'],
    total_focus_minutes: 0,
    total_tasks_completed: 0,
    streak_days: 0,
    last_active_date: new Date().toISOString().split('T')[0],
  }),
};

const canUseStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const getCurrentAccountId = async () => {
  if (!isSupabaseConfigured || !supabase) return 'guest';

  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id || data?.session?.user?.email || 'guest';
  } catch {
    return 'guest';
  }
};

const readProfileFromAuthMetadata = async (accountId) => {
  if (!isSupabaseConfigured || !supabase || accountId === 'guest') return null;

  try {
    const { data } = await supabase.auth.getSession();
    const profile = data?.session?.user?.user_metadata?.freeway_profile;
    if (!profile || typeof profile !== 'object') return null;

    return {
      ...profile,
      id: profile.id || `${LOCAL_ID_PREFIX}UserProfile_auth`,
      owner_id: accountId,
    };
  } catch {
    return null;
  }
};

const syncProfileToAuthMetadata = async (profile) => {
  if (!isSupabaseConfigured || !supabase || !profile || profile.owner_id === 'guest') return;

  try {
    const { data } = await supabase.auth.getSession();
    const metadata = data?.session?.user?.user_metadata || {};
    await supabase.auth.updateUser({
      data: {
        ...metadata,
        freeway_profile: profile,
      },
    });
  } catch (error) {
    console.warn('Supabase profile metadata sync unavailable:', error);
  }
};

const getStorageKey = (accountId) => `fw_account_data_${accountId || 'guest'}`;

const createEmptyStore = () => ({
  version: 1,
  tasks: [],
  focusSessions: [],
  userProfiles: [],
});

const readStore = (accountId) => {
  if (!canUseStorage()) return createEmptyStore();

  try {
    const stored = window.localStorage.getItem(getStorageKey(accountId));
    if (!stored) return createEmptyStore();
    return { ...createEmptyStore(), ...JSON.parse(stored) };
  } catch {
    return createEmptyStore();
  }
};

const writeStore = (accountId, store) => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(getStorageKey(accountId), JSON.stringify({
      ...createEmptyStore(),
      ...store,
      version: 1,
    }));
  } catch (error) {
    console.warn('Local account storage unavailable:', error);
  }
};

const emitAccountDataChanged = (entityName, accountId) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ACCOUNT_DATA_CHANGED_EVENT, {
    detail: { entityName, accountId },
  }));
};

const createLocalId = (entityName) =>
  `${LOCAL_ID_PREFIX}${entityName}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const matchesFilter = (record, filters = {}) =>
  Object.entries(filters).every(([key, value]) => record?.[key] === value);

const compareValues = (left, right) => {
  if (left === right) return 0;
  if (left === undefined || left === null) return 1;
  if (right === undefined || right === null) return -1;
  return left > right ? 1 : -1;
};

const sortAndLimit = (records, sort, limit) => {
  const sortKey = typeof sort === 'string' && sort.trim() ? sort.trim() : null;
  const sorted = [...records];

  if (sortKey) {
    const descending = sortKey.startsWith('-');
    const key = descending ? sortKey.slice(1) : sortKey;
    sorted.sort((left, right) => {
      const result = compareValues(left?.[key], right?.[key]);
      return descending ? -result : result;
    });
  }

  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
};

const readLocalRecords = (accountId, entityName) => {
  const { collection } = ENTITY_CONFIG[entityName];
  return readStore(accountId)[collection] || [];
};

const saveLocalRecords = (accountId, entityName, records, { emit = true } = {}) => {
  const { collection } = ENTITY_CONFIG[entityName];
  const store = readStore(accountId);
  writeStore(accountId, { ...store, [collection]: records });
  if (emit) emitAccountDataChanged(entityName, accountId);
};

const buildRecord = (entityName, data, accountId, id = createLocalId(entityName)) => {
  const now = new Date().toISOString();
  const defaults = ENTITY_DEFAULTS[entityName]?.() || {};
  return {
    ...defaults,
    ...data,
    id,
    owner_id: data?.owner_id || accountId,
    created_date: data?.created_date || now,
    updated_date: now,
  };
};

const upsertLocalRecord = (accountId, entityName, record, replaceId = null) => {
  const records = readLocalRecords(accountId, entityName);
  const withoutOldRecord = records.filter((item) => item.id !== record.id && item.id !== replaceId);
  saveLocalRecords(accountId, entityName, [...withoutOldRecord, record]);
  return record;
};

const removeLocalRecord = (accountId, entityName, id) => {
  const records = readLocalRecords(accountId, entityName);
  saveLocalRecords(accountId, entityName, records.filter((item) => item.id !== id));
};

const createEntityClient = (entityName) => {
  const config = ENTITY_CONFIG[entityName];

  const listLocalFirst = async (filters = {}, sort = config.defaultSort, limit) => {
    const accountId = await getCurrentAccountId();
    let localRecords = readLocalRecords(accountId, entityName);

    if (entityName === 'UserProfile' && localRecords.length === 0) {
      const authProfile = await readProfileFromAuthMetadata(accountId);
      if (authProfile) {
        localRecords = [authProfile];
        saveLocalRecords(accountId, entityName, localRecords, { emit: false });
      }
    }

    const filteredRecords = localRecords.filter((record) => matchesFilter(record, filters));
    return sortAndLimit(filteredRecords, sort, limit);
  };

  return {
    list: (sort = config.defaultSort, limit) => listLocalFirst({}, sort, limit),

    filter: (filters = {}, sort = config.defaultSort, limit) =>
      listLocalFirst(filters, sort, limit),

    create: async (data) => {
      const accountId = await getCurrentAccountId();
      const localRecord = upsertLocalRecord(accountId, entityName, buildRecord(entityName, data, accountId));

      if (entityName === 'UserProfile') {
        syncProfileToAuthMetadata(localRecord);
      }

      return localRecord;
    },

    update: async (id, data) => {
      const accountId = await getCurrentAccountId();
      const records = readLocalRecords(accountId, entityName);
      const current = records.find((record) => record.id === id) || {};
      const localRecord = upsertLocalRecord(accountId, entityName, {
        ...current,
        ...data,
        id,
        owner_id: current.owner_id || accountId,
        updated_date: new Date().toISOString(),
      });

      if (entityName === 'UserProfile') {
        syncProfileToAuthMetadata(localRecord);
      }

      return localRecord;
    },

    delete: async (id) => {
      const accountId = await getCurrentAccountId();
      removeLocalRecord(accountId, entityName, id);
      return { success: true };
    },
  };
};

export const accountData = {
  tasks: createEntityClient('Task'),
  focusSessions: createEntityClient('FocusSession'),
  userProfiles: createEntityClient('UserProfile'),
};
