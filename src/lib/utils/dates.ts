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
