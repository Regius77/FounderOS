import { locale } from '@/lib/i18n';

/**
 * Short month and weekday names for labels built in lib/ (chart buckets,
 * "3 Sep" captions). English stays the exact three-letter forms the tests
 * assert; Italian uses the lowercase abbreviations the UI speaks.
 */
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_IT = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
const MONTHS_LONG_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_LONG_IT = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

/** 'Jan'..'Dec' (English) or 'gen'..'dic' (Italian), index 0 = January. */
export const MONTHS_SHORT: readonly string[] = locale() === 'it' ? MONTHS_IT : MONTHS_EN;
/** 'Sun'..'Sat' (English) or 'dom'..'sab' (Italian), index 0 = Sunday like Date#getDay. */
export const WEEKDAYS_SHORT: readonly string[] = locale() === 'it' ? WEEKDAYS_IT : WEEKDAYS_EN;
/** 'January'..'December' (English) or 'gennaio'..'dicembre' (Italian). */
export const MONTHS_LONG: readonly string[] = locale() === 'it' ? MONTHS_LONG_IT : MONTHS_LONG_EN;
