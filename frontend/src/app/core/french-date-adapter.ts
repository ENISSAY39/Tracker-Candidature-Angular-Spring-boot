import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

const FRENCH_DATE = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/;

/**
 * Adaptateur natif de Material qui lit aussi les dates saisies en `jj/mm/aaaa` : l'adaptateur natif passe par
 * `Date.parse`, qui lirait « 04/10/2026 » comme le 10 avril.
 */
@Injectable()
export class FrenchDateAdapter extends NativeDateAdapter {
  override parse(value: unknown, parseFormat?: unknown): Date | null {
    const match = typeof value === 'string' ? FRENCH_DATE.exec(value) : null;
    if (!match) {
      return super.parse(value, parseFormat);
    }
    const [day, month, year] = match.slice(1).map(Number);
    const date = new Date(year, month - 1, day);
    // Une date inexistante (31/02) déborde sur le mois suivant : elle est refusée
    const exists =
      date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return exists ? date : this.invalid();
  }
}
