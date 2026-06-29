# Freeway Life Push Notifications

## Runtime pieces

- Browser/PWA registers a Web Push subscription.
- Supabase stores one row per user/device in `public.push_subscriptions`.
- Vercel function `/api/notifications/test` sends a test push for the active device.
- Vercel function `/api/notifications/send-due-alarms` checks due alarms and sends push notifications.

## Required Supabase migration

Apply:

```text
supabase/migrations/20260625120000_add_push_subscriptions.sql
```

The table has RLS enabled. Users can only manage their own subscriptions; server functions use `SUPABASE_SERVICE_ROLE_KEY`.

## Required environment variables

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Set these on Vercel:

```bash
VITE_WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
WEB_PUSH_SUBJECT=https://freewaylife.space
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

`VITE_WEB_PUSH_PUBLIC_KEY` and `WEB_PUSH_PUBLIC_KEY` should be the same public VAPID key.

## Scheduling

For reliable alarm notifications, call:

```text
GET https://freewaylife.space/api/notifications/send-due-alarms
Authorization: Bearer <CRON_SECRET>
```

Recommended frequency: every minute.

Vercel Hobby does not support every-minute Cron Jobs. Use one of these:

- upgrade the Vercel project to Pro and add a Vercel Cron for `* * * * *`;
- use an external cron service that calls the endpoint every minute;
- use Supabase scheduled jobs if enabled on the project.

Do not add a one-minute `crons` entry to `vercel.json` while the project is on Hobby, because production deployment can fail.
