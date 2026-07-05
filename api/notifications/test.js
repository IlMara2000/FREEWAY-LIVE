import {
  asWebPushSubscription,
  configureWebPush,
  disableFailedSubscription,
  getSupabaseForUserRequest,
  json,
  markSubscriptionTested,
  readJsonBody,
  verifyUserFromAuthorization,
} from '../_notifications.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Metodo non supportato.' });
  }

  try {
    const supabase = getSupabaseForUserRequest(req);
    const push = configureWebPush();
    const user = await verifyUserFromAuthorization(supabase, req);
    const body = await readJsonBody(req);
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';

    let query = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('owner_id', user.id)
      .eq('enabled', true)
      .order('updated_date', { ascending: false })
      .limit(1);

    if (endpoint) {
      query = query.eq('endpoint', endpoint);
    }

    const { data, error } = await query;
    if (error) throw error;

    const subscription = data?.[0];
    if (!subscription) {
      return json(res, 404, {
        error: 'Nessun dispositivo notifiche attivo trovato.',
        code: 'subscription_not_found',
      });
    }

    try {
      await push.sendNotification(asWebPushSubscription(subscription), JSON.stringify({
        title: 'Freeway Life',
        body: 'Notifiche attive su questo dispositivo.',
        tag: `freeway-test-${Date.now()}`,
        url: '/account',
      }), { TTL: 300 });
      await markSubscriptionTested(supabase, subscription);
    } catch (pushError) {
      await disableFailedSubscription(supabase, subscription, pushError);
      throw pushError;
    }

    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, error.statusCode || 500, {
      error: error.message || 'Notifica di test non inviata.',
      code: error.code || 'test_notification_failed',
    });
  }
}
