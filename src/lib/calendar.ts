
export function generateICS({
  title,
  startDate,
  endDate,
  description,
  location,
}: {
  title: string;
  startDate: string;
  endDate: string | null;
  description: string;
  location: string;
}) {
  const formatDate = (d: string) => d.replace(/-/g, '');
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const start = formatDate(startDate);
  const end = endDate ? formatDate(endDate) : formatDate(startDate);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NazVik Farmhouse//EN',
    'BEGIN:VEVENT',
    `UID:${start}-${Math.random().toString(36).slice(2)}@nazvik.farmhouse`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nazvik-stay-${startDate}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
