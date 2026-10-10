/** Type calqué sur `JobApplicationResponse` de l'API. Dates en `yyyy-MM-dd`. */

export interface JobApplication {
  id: number;
  number: number;
  groupId: number;
  groupName: string;
  company: string;
  jobTitle: string;
  /** Code du statut (`Status.code`). */
  status: string;
  sentOn: string | null;
  deadlineLabel: string | null;
  deadlineDate: string | null;
  notes: string | null;
  startPeriod: string | null;
  channel: string | null;
  cvSent: string | null;
  createdAt: string;
  updatedAt: string;
}
