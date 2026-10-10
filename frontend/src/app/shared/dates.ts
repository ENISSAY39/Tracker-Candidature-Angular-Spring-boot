/**
 * Dates sans heure, en chaînes `yyyy-MM-dd` de bout en bout (comme l'API). Jamais de `toISOString()` :
 * le passage par UTC décale d'un jour selon le fuseau.
 */

/** Jour local de `now` au format `yyyy-MM-dd`. */
export function today(now: Date = new Date()): string {
  return toDay(now);
}

/** Jour local d'une date (par exemple choisie au datepicker), par ses composantes année, mois, jour. */
export function toDay(date: Date): string {
  return format(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Date locale à minuit pour un jour `yyyy-MM-dd`, telle que l'attend le datepicker. */
export function fromDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

/** `date` décalée de `days` jours (négatif pour reculer). */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  // Calcul en UTC pur : aucun changement d'heure ne peut décaler le jour
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return format(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** Négatif si `a` est avant `b`, positif s'il est après, 0 le même jour. */
export function compareDates(a: string, b: string): number {
  // Le format yyyy-MM-dd se compare dans l'ordre chronologique
  return a < b ? -1 : a > b ? 1 : 0;
}

function format(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
