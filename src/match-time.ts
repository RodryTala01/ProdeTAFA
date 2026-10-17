export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';
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
