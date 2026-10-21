import { TIMEZONE, TZ_LABEL } from '../config';

const make = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, ...opts });

const dateTimeFmt = make({ day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const timeFmt = make({ hour: '2-digit', minute: '2-digit', hour12: false });
const dayTickFmt = make({ weekday: 'short', day: 'numeric' });
const weekdayFmt = make({ weekday: 'short' });
const dayNumFmt = make({ day: 'numeric' });
const monthFmt = make({ month: 'short' });
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE });

export const formatDateTime = (ms: number) => `${dateTimeFmt.format(ms)} ${TZ_LABEL}`;
export const formatTime = (ms: number) => `${timeFmt.format(ms)} ${TZ_LABEL}`;
export const formatTimeShort = (ms: number) => timeFmt.format(ms);
export const formatDayTick = (ms: number) => dayTickFmt.format(ms);
export const dayKey = (ms: number) => dayKeyFmt.format(ms);

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** e.g. "Tue 20th" */
export const formatDayLabel = (ms: number) => `${weekdayFmt.format(ms)} ${ordinal(Number(dayNumFmt.format(ms)))}`;
export const formatDayMonth = (ms: number) => `${weekdayFmt.format(ms)} ${ordinal(Number(dayNumFmt.format(ms)))} ${monthFmt.format(ms)}`;

export function timeAgo(ms: number, now: number) {
  const mins = Math.max(0, Math.round((now - ms) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs} h ${mins % 60 ? `${mins % 60} min ` : ''}ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

export const toIso = (ms: number) => new Date(ms).toISOString();
