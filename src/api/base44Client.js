import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

const { appId, token, functionsVersion, appBaseUrl } = appParams;
const REMOTE_TIMEOUT_MS = 4500;
const LOCAL_ID_PREFIX = 'local_';
export const ACCOUNT_DATA_CHANGED_EVENT = 'fw:account-data-changed';

const ENTITY_CONFIG = {
  Task: { collection: 'tasks', defaultSort: '-created_date' },
  FocusSession: { collection: 'focusSessions', defaultSort: '-created_date' },
  UserProfile: { collection: 'userProfiles', defaultSort: '-updated_date' },
};

//Create a client with authentication required
const remoteBase44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.records)) return value.records;
  return [];
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

const isLocalId = (id) => typeof id === 'string' && id.startsWith(LOCAL_ID_PREFIX);

const withTimeout = (promise) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      globalThis.setTimeout(() => reject(new Error('Remote request timed out')), REMOTE_TIMEOUT_MS);
    }),
  ]);

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

const mergeRecords = (localRecords, remoteRecords, accountId) => {
  const byId = new Map();

  for (const record of localRecords) {
    if (record?.id) byId.set(record.id, record);
  }

  for (const remoteRecord of remoteRecords) {
    if (!remoteRecord?.id) continue;
    if (remoteRecord.owner_id && remoteRecord.owner_id !== accountId) continue;
    if (!byId.has(remoteRecord.id)) {
      byId.set(remoteRecord.id, { ...remoteRecord, owner_id: accountId });
    }
  }

  return Array.from(byId.values());
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
  return {
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

const tryRemote = async (operation, fallback) => {
  try {
    return await withTimeout(operation());
  } catch (error) {
    console.warn('Remote account sync unavailable:', error);
    return fallback;
  }
};

const syncRemoteInBackground = (operation, onSuccess) => {
  tryRemote(operation, null).then((result) => {
    if (result) onSuccess?.(result);
  });
};

const fetchRemoteRecords = async (remoteEntity, accountId, filters, sort, limit) => {
  if (!remoteEntity) return [];

  const remoteFilters = { ...filters, owner_id: accountId };
  const operation = typeof remoteEntity.filter === 'function'
    ? () => remoteEntity.filter(remoteFilters, sort, limit)
    : () => remoteEntity.list(sort, limit);

  const response = await tryRemote(operation, []);
  return normalizeList(response).filter((record) => matchesFilter(record, remoteFilters));
};

const createEntityClient = (entityName) => {
  const config = ENTITY_CONFIG[entityName];
  const remoteEntity = remoteBase44.entities?.[entityName];

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

    localRecords = localRecords.filter((record) =>
      matchesFilter(record, filters)
    );
    const remoteRecords = await fetchRemoteRecords(remoteEntity, accountId, filters, sort, limit);
    const mergedRecords = mergeRecords(localRecords, remoteRecords, accountId);

    if (remoteRecords.length > 0) {
      const allLocalRecords = readLocalRecords(accountId, entityName);
      saveLocalRecords(accountId, entityName, mergeRecords(allLocalRecords, remoteRecords, accountId), { emit: false });
    }

    return sortAndLimit(mergedRecords, sort, limit);
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

      syncRemoteInBackground(
        () => remoteEntity?.create?.({ ...data, owner_id: accountId }),
        (remoteRecord) => {
          if (!remoteRecord?.id) return;
          const syncedRecord = {
            ...localRecord,
            ...remoteRecord,
            owner_id: accountId,
            updated_date: remoteRecord.updated_date || localRecord.updated_date,
          };
          upsertLocalRecord(accountId, entityName, syncedRecord, localRecord.id);
          if (entityName === 'UserProfile') {
            syncProfileToAuthMetadata(syncedRecord);
          }
        }
      );

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

      if (isLocalId(id)) {
        if (entityName === 'UserProfile') {
          syncProfileToAuthMetadata(localRecord);
        }
        return localRecord;
      }

      if (entityName === 'UserProfile') {
        syncProfileToAuthMetadata(localRecord);
      }

      syncRemoteInBackground(
        () => remoteEntity?.update?.(id, { ...data, owner_id: accountId }),
        (remoteRecord) => {
          if (!remoteRecord?.id) return;
          const syncedRecord = {
            ...localRecord,
            ...remoteRecord,
            owner_id: accountId,
          };
          upsertLocalRecord(accountId, entityName, syncedRecord);
          if (entityName === 'UserProfile') {
            syncProfileToAuthMetadata(syncedRecord);
          }
        }
      );

      return localRecord;
    },

    delete: async (id) => {
      const accountId = await getCurrentAccountId();
      removeLocalRecord(accountId, entityName, id);

      if (!isLocalId(id)) {
        syncRemoteInBackground(() => remoteEntity?.delete?.(id));
      }

      return { success: true };
    },
  };
};

export const base44 = {
  ...remoteBase44,
  entities: {
    ...remoteBase44.entities,
    Task: createEntityClient('Task'),
    FocusSession: createEntityClient('FocusSession'),
    UserProfile: createEntityClient('UserProfile'),
  },
};
