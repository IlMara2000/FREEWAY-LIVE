import {
  asWebPushSubscription,
  configureWebPush,
  disableFailedSubscription,
  getLocalMinute,
  getSupabaseAdmin,
  isCronAuthorized,
  json,
} from '../_notifications.js';

const MAX_SUBSCRIPTIONS = 2000;
const MAX_ALARMS = 5000;

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const isAlarmDue = (alarm, localMinute) => {
  if (!alarm?.enabled || !alarm?.time) return false;
  if (alarm.time !== localMinute.timeKey) return false;
  if (alarm.date && alarm.date !== localMinute.dateKey) return false;
  if (alarm.last_push_notified_key === localMinute.minuteKey) return false;
  return true;
};

const groupByOwner = (items) => items.reduce((acc, item) => {
  if (!acc.has(item.owner_id)) acc.set(item.owner_id, []);
  acc.get(item.owner_id).push(item);
  return acc;
}, new Map());

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Metodo non supportato.' });
  }

  if (!isCronAuthorized(req)) {
    return json(res, 401, { error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const push = configureWebPush();
    const now = new Date();

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('enabled', true)
      .limit(MAX_SUBSCRIPTIONS);

    if (subscriptionsError) throw subscriptionsError;
    if (!subscriptions?.length) {
      return json(res, 200, { ok: true, checked: 0, sent: 0, failed: 0, dueAlarms: 0 });
    }

    const ownerIds = unique(subscriptions.map((subscription) => subscription.owner_id));
    const subscriptionsByOwner = groupByOwner(subscriptions);

    const { data: alarms, error: alarmsError } = await supabase
      .from('alarms')
      .select('id, owner_id, title, time, date, repeat, reminder_text, last_push_notified_key, timezone, enabled')
      .in('owner_id', ownerIds)
      .eq('enabled', true)
      .limit(MAX_ALARMS);

    if (alarmsError) throw alarmsError;

    let sent = 0;
    let failed = 0;
    let dueAlarms = 0;
    const notifiedAlarmIds = [];

    for (const alarm of alarms || []) {
      const ownerSubscriptions = subscriptionsByOwner.get(alarm.owner_id) || [];
      if (ownerSubscriptions.length === 0) continue;

      const fallbackTimeZone = ownerSubscriptions[0]?.timezone || 'UTC';
      const localMinute = getLocalMinute(alarm.timezone || fallbackTimeZone, now);
      if (!isAlarmDue(alarm, localMinute)) continue;

      dueAlarms += 1;
      const payload = JSON.stringify({
        title: alarm.title || 'Sveglia Freeway',
        body: alarm.reminder_text || 'Promemoria attivo.',
        tag: `freeway-alarm-${alarm.id}-${localMinute.minuteKey}`,
        url: '/alarms',
        alarmId: alarm.id,
        minuteKey: localMinute.minuteKey,
      });
      let alarmSent = 0;

      await Promise.all(ownerSubscriptions.map(async (subscription) => {
        try {
          await push.sendNotification(asWebPushSubscription(subscription), payload, { TTL: 1800 });
          sent += 1;
          alarmSent += 1;
        } catch (pushError) {
          failed += 1;
          await disableFailedSubscription(supabase, subscription, pushError);
        }
      }));

      if (alarmSent > 0) {
        await supabase
          .from('alarms')
          .update({
            last_push_notified_key: localMinute.minuteKey,
            updated_date: now.toISOString(),
          })
          .eq('id', alarm.id)
          .eq('owner_id', alarm.owner_id);

        notifiedAlarmIds.push(alarm.id);
      }
    }

    return json(res, 200, {
      ok: true,
      checked: alarms?.length || 0,
      dueAlarms,
      sent,
      failed,
      notifiedAlarmIds,
    });
  } catch (error) {
    return json(res, error.statusCode || 500, {
      error: error.message || 'Invio notifiche non riuscito.',
      code: error.code || 'alarm_push_failed',
    });
  }
}
