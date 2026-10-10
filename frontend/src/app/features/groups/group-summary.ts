import { CompanyGroup, JobApplication } from '../applications/application';

/** Ligne de la liste des groupes. */
export interface GroupSummary extends CompanyGroup {
  applicationCount: number;
}

/** Nombre de candidatures de chaque groupe, groupes vides compris, dans l'ordre reçu (celui de l'API, par nom). */
export function summarizeGroups(
  groups: readonly CompanyGroup[],
  applications: readonly Pick<JobApplication, 'groupId'>[],
): GroupSummary[] {
  const counts = new Map<number, number>();
  for (const application of applications) {
    counts.set(application.groupId, (counts.get(application.groupId) ?? 0) + 1);
  }
  return groups.map((group) => ({ ...group, applicationCount: counts.get(group.id) ?? 0 }));
}
