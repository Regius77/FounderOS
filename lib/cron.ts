/**
 * Cron schedule helpers for agent jobs. Definitions are stored in SQLite and
 * displayed here; the actual runner lands with the dedicated host deployment — the
 * OS is honest about that in the UI.
 */
import { locale, t, tc } from '@/lib/i18n';

const FIELD_RE = /^(\*|[0-9*/,-]+)$/;

export function isValidCron(expr: string): boolean {
  const fields = expr.trim().split(/\s+/);
  return fields.length === 5 && fields.every((f) => FIELD_RE.test(f) && !/[a-z]/i.test(f));
}

const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_IT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const DOW = locale() === 'it' ? DOW_IT : DOW_EN;

function dowLabel(field: string): string | null {
  if (field === '*') return tc('cron', 'daily');
  const range = field.match(/^(\d)-(\d)$/);
  if (range) {
    const [a, b] = [Number(range[1]), Number(range[2])];
    if (a <= 6 && b <= 6) return `${DOW[a]}–${DOW[b]}`;
  }
  if (/^\d$/.test(field) && Number(field) <= 6) return DOW[Number(field)];
  return field; // comma lists etc. shown raw
}

/** Human-readable summary, or null if the expression is not 5 valid fields. */
export function describeCron(expr: string): string | null {
  if (!isValidCron(expr)) return null;
  const [min, hour, , , dow] = expr.trim().split(/\s+/);

  const every = min.match(/^\*\/(\d+)$/);
  if (every && hour === '*') return t('every {n} min', { n: every[1] });

  if (/^\d+$/.test(min) && hour === '*') return t('hourly at :{mm}', { mm: min.padStart(2, '0') });

  if (/^\d+$/.test(min) && /^\d+$/.test(hour)) {
    const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
    return t('at {time}, {days}', { time, days: dowLabel(dow) ?? '' });
  }

  return `cron ${expr}`;
}
