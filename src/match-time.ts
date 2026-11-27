export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';
const argentinaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: ARGENTINA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});

export function argentinaCalendarDate(date: Date): string {
  const parts = Object.fromEntries(argentinaDay.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function shiftCalendarDate(date: string, days: number): string {
  return new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);
}

// D1 timestamps without an offset represent UTC, never the browser's timezone.
export function utcDate(value: string): Date {
  const normalized = value.trim().replace(' ', 'T');
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`);
}
export function argentinaDateTime(value: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    ...options, timeZone: ARGENTINA_TIME_ZONE, hourCycle: 'h23',
  }).format(utcDate(value));
}
