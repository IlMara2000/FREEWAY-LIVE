import { useEffect } from 'react';
import { accountData } from '@/api/accountDataClient';
import { normalizeList } from '@/lib/normalize-list';
import { showLocalNotification } from '@/lib/notifications';

const getLocalDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const getMinuteKey = (date = new Date()) =>
  `${getLocalDateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const isAlarmDue = (alarm, now = new Date()) => {
  if (!alarm?.enabled || !alarm?.time) return false;
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (alarm.time !== currentTime) return false;
  if (alarm.date && alarm.date !== getLocalDateKey(now)) return false;
  return true;
};

export default function useAlarmNotifications(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;

    let cancelled = false;

    const checkAlarms = async () => {
      if (cancelled || !('Notification' in window) || Notification.permission !== 'granted') return;

      const minuteKey = getMinuteKey();
      const alarms = normalizeList(await accountData.alarms.list('time', 100));
      await Promise.all(
        alarms
          .filter((alarm) => isAlarmDue(alarm) && alarm.last_notified_key !== minuteKey)
          .map(async (alarm) => {
            await showLocalNotification({
              title: alarm.title || 'Sveglia Freeway',
              body: alarm.reminder_text || 'Promemoria attivo.',
              tag: `freeway-alarm-${alarm.id}-${minuteKey}`,
            });
            await accountData.alarms.update(alarm.id, { last_notified_key: minuteKey });
          })
      );
    };

    checkAlarms();
    const interval = window.setInterval(checkAlarms, 30 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [enabled]);
}
