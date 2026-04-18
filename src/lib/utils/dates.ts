export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}

export function isOverdue(dateEnd: string | undefined, done: number): boolean {
  if (!dateEnd) return false;
  if (done >= 100) return false;
  return dateEnd < todayISO();
}

/** ISO week [year, weekNumber] of a date */
export function getISOWeek(d: Date): [number, number] {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const y = dt.getUTCFullYear();
  const w1 = new Date(Date.UTC(y, 0, 4));
  return [y, Math.ceil(((dt.getTime() - w1.getTime()) / 86400000 + 1) / 7)];
}

export function weekKey(y: number, w: number): string {
  return y + '-W' + (w < 10 ? '0' : '') + w;
}

/** Monday (ISO) of a given week, as a Date (UTC) */
export function weekStartDate(y: number, w: number): Date {
  const simple = new Date(Date.UTC(y, 0, 1 + (w - 1) * 7));
  const dow = simple.getUTCDay() || 7;
  const mon = new Date(simple);
  mon.setUTCDate(simple.getUTCDate() - (dow - 1));
  return mon;
}

/** Returns "DD.MM.YYYY" for a Date (UTC fields) */
export function fmtDateShort(d: Date): string {
  return d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.' + d.getUTCFullYear();
}

/** Week range (Mon..Sun) as 7 ISO dates for a given ISO week */
export function weekDates(y: number, w: number): string[] {
  const mon = weekStartDate(y, w);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon);
    d.setUTCDate(mon.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Weeks in year (52 or 53 — quick approximation) */
export function weeksInYear(y: number): number {
  const dec28 = new Date(Date.UTC(y, 11, 28));
  return getISOWeek(dec28)[1];
}
