/**
 * Presentation-only split of an already formatted value into numeral and unit, so heroes and tiles can
 * draw the unit as a superscript (02 section 2.5).
 *
 * Decision SPEC.md C7: every number becomes text once, in section 01's lib/lab/view/format.ts. This file
 * never turns a number into text.
 */
import { t } from '@/lib/i18n';

export type ValueFormat = 'ratio' | 'count' | 'percent' | 'money' | 'hours';

const NUMERAL = /^[+−-]?[0-9][0-9.,  ]*$/;

/** '1.4x' -> { '1.4', 'x' }; '$8.20' -> { '8.20', '$' }; '62%' -> { '62', '%' }; '9h' -> { '9', 'h' }; '12,034' -> { '12,034', null }. Text that is not a number comes back whole with no unit. */
export function splitUnit(text: string, f: ValueFormat): { text: string; unit: string | null } {
  const s = text.trim();
  const split = (num: string, unit: string | null) => (NUMERAL.test(num) ? { text: num, unit } : { text: s, unit: null });
  switch (f) {
    case 'ratio':
      return s.endsWith('x') ? split(s.slice(0, -1), 'x') : { text: s, unit: null };
    case 'percent':
      return s.endsWith('%') ? split(s.slice(0, -1), '%') : { text: s, unit: null };
    case 'money': {
      const m = /^([+−-]?)\$(.+)$/.exec(s);
      return m ? split(m[1] + m[2], '$') : { text: s, unit: null };
    }
    case 'hours': {
      const m = /^(.+?)([hd])$/.exec(s);
      return m ? split(m[1], m[2]) : { text: s, unit: null };
    }
    case 'count':
    default:
      return { text: s, unit: null };
  }
}

export const N_MIN = 5;
/** Aliases of LAB_COPY strings (01 section 23). */
export const NOT_ENOUGH = t('not enough yet');
export const TOO_NEW = t('too new');
