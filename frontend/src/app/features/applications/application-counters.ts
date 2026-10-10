import { Status, StatusCategory, StatusCategoryCode } from '../../shared/status';
import { JobApplication } from './application';

/** Compteur de la ligne 2 du classeur : « Total » (`category` nulle) ou une catégorie de statut. */
export interface ApplicationCounter {
  category: StatusCategoryCode | null;
  label: string;
  count: number;
}

/**
 * « Total » puis un compteur par catégorie non vide, dans l'ordre des catégories, avec le libellé de l'API.
 */
export function countApplications(
  applications: readonly JobApplication[],
  statuses: readonly Status[],
): ApplicationCounter[] {
  const categoryByStatus = new Map(statuses.map((status) => [status.code, status.category]));
  const counts = new Map<StatusCategoryCode, { category: StatusCategory; count: number }>();
  for (const application of applications) {
    const category = categoryByStatus.get(application.status);
    if (category) {
      const entry = counts.get(category.code) ?? { category, count: 0 };
      entry.count++;
      counts.set(category.code, entry);
    }
  }
  const byCategory = [...counts.values()]
    .sort((a, b) => a.category.order - b.category.order)
    .map(({ category, count }) => ({ category: category.code, label: category.label, count }));
  return [{ category: null, label: 'Total', count: applications.length }, ...byCategory];
}
