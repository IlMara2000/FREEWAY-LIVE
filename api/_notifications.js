import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

const DEFAULT_PUSH_SUBJECT = 'https://freewaylife.space';
const SENDABLE_ERROR_CODES = new Set([404, 410]);

export const json = (res, status, payload) => res.status(status).json(payload);

export const readJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(body || '{}');
};

export const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error('Supabase server non configurato.');
    error.statusCode = 503;
    error.code = 'supabase_server_env_missing';
    throw error;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const configureWebPush = () => {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY || process.env.VITE_WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT || DEFAULT_PUSH_SUBJECT;

  if (!publicKey || !privateKey) {
    const error = new Error('Web Push non configurato.');
    error.statusCode = 503;
    error.code = 'web_push_env_missing';
    throw error;
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  return webPush;
};

export const verifyUserFromAuthorization = async (supabase, req) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';

  if (!token) {
    const error = new Error('Access token mancante.');
    error.statusCode = 401;
    error.code = 'missing_auth_token';
    throw error;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    const authError = new Error('Sessione non valida.');
    authError.statusCode = 401;
    authError.code = 'invalid_auth_token';
    throw authError;
  }

  return data.user;
};

export const asWebPushSubscription = (record) => {
  if (record?.subscription?.endpoint && record?.subscription?.keys) {
    return record.subscription;
  }

  return {
    endpoint: record.endpoint,
    keys: {
      p256dh: record.p256dh,
      auth: record.auth,
    },
  };
};

export const disableFailedSubscription = async (supabase, record, error) => {
  const statusCode = Number(error?.statusCode || error?.status || 0);
  const failureCount = Number(record?.failure_count || 0) + 1;
  const shouldDisable = SENDABLE_ERROR_CODES.has(statusCode) || failureCount >= 3;

  await supabase
    .from('push_subscriptions')
    .update({
      enabled: !shouldDisable,
      failure_count: failureCount,
      last_error: String(error?.message || `Push error ${statusCode || 'unknown'}`).slice(0, 500),
      updated_date: new Date().toISOString(),
    })
    .eq('id', record.id);
};

export const markSubscriptionTested = async (supabase, record) => {
  await supabase
    .from('push_subscriptions')
    .update({
      enabled: true,
      last_tested_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      failure_count: 0,
      last_error: null,
      updated_date: new Date().toISOString(),
    })
    .eq('id', record.id);
};

export const getLocalMinute = (timeZone, date = new Date()) => {
  const safeTimeZone = timeZone || 'UTC';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  const timeKey = `${parts.hour}:${parts.minute}`;

  return {
    dateKey,
    timeKey,
    minuteKey: `${dateKey}T${timeKey}`,
  };
};

export const isCronAuthorized = (req) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret && process.env.NODE_ENV !== 'production') return true;
  return Boolean(cronSecret && req.headers.authorization === `Bearer ${cronSecret}`);
};
