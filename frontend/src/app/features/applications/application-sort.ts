import { Sort } from '@angular/material/sort';
import { compareDates } from '../../shared/dates';
import { JobApplication, Status } from './application';

type SortableColumn = keyof JobApplication;

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

/**
 * Candidatures dans l'ordre d'affichage, sans modifier la liste reçue. Sans tri choisi (`direction` vide) :
 * rang de la catégorie, puis date d'échéance croissante (absentes à la fin), puis numéro. Avec une colonne :
 * tri sur cette colonne, valeurs vides à la fin, ordre par défaut entre valeurs égales.
 */
export function sortApplications(
  applications: readonly JobApplication[],
  statuses: readonly Status[],
  sort: Sort,
): JobApplication[] {
  const statusByCode = new Map(statuses.map((status) => [status.code, status]));
  const byDefault = [...applications].sort((a, b) => compareByDefault(a, b, statusByCode));
  if (sort.direction === '') {
    return byDefault;
  }
  const column = sort.active as SortableColumn;
  const sign = sort.direction === 'asc' ? 1 : -1;
  // Tri stable : l'ordre par défaut départage les valeurs égales
  return byDefault.sort((a, b) => {
    const left = sortValue(a, column, statusByCode);
    const right = sortValue(b, column, statusByCode);
    if (left === null || right === null) {
      return left === right ? 0 : left === null ? 1 : -1;
    }
    return sign * compareValues(left, right);
  });
}

function compareByDefault(
  a: JobApplication,
  b: JobApplication,
  statusByCode: Map<string, Status>,
): number {
  const byCategory = categoryRank(a, statusByCode) - categoryRank(b, statusByCode);
  if (byCategory !== 0) {
    return byCategory;
  }
  if (a.deadlineDate !== b.deadlineDate) {
    if (a.deadlineDate === null) return 1;
    if (b.deadlineDate === null) return -1;
    return compareDates(a.deadlineDate, b.deadlineDate);
  }
  return a.number - b.number;
}

function categoryRank(application: JobApplication, statusByCode: Map<string, Status>): number {
  return statusByCode.get(application.status)?.category.order ?? Number.MAX_SAFE_INTEGER;
}

function sortValue(
  application: JobApplication,
  column: SortableColumn,
  statusByCode: Map<string, Status>,
): string | number | null {
  if (column === 'status') {
    return statusByCode.get(application.status)?.order ?? null;
  }
  return application[column];
}

function compareValues(left: string | number, right: string | number): number {
  return typeof left === 'number' && typeof right === 'number'
    ? left - right
    : collator.compare(String(left), String(right));
}
