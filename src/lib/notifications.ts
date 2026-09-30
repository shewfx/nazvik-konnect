
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function sendLocalNotification(title: string, body: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  new Notification(title, {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
  });
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      return reg;
    } catch {
      return null;
    }
  }
  return null;
}

export function scheduleCheckInReminder(checkInDate: string, familyName: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const checkIn = new Date(checkInDate);
  const now = new Date();
  const diff = checkIn.getTime() - now.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  // Remind 24 hours before if future
  if (diff > oneDay) {
    const remindTime = diff - oneDay;
    setTimeout(() => {
      sendLocalNotification(
        'NazVik Check-In Tomorrow',
        `Your stay at NazVik Farmhouse starts tomorrow (${checkInDate}). Get ready!`
      );
    }, remindTime);
  }

  // Remind on the day (morning)
  if (diff > 0) {
    const morning = new Date(checkInDate);
    morning.setHours(8, 0, 0, 0);
    const morningDiff = morning.getTime() - now.getTime();
    if (morningDiff > 0) {
      setTimeout(() => {
        sendLocalNotification(
          "It's Check-In Day!",
          `Welcome to NazVik Farmhouse, ${familyName}! Don't forget your check-in inspection.`
        );
      }, morningDiff);
    }
  }
}
