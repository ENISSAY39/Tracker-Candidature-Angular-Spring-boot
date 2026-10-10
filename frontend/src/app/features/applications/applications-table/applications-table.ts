import { DatePipe } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { today } from '../../../shared/dates';
import { DeadlineCell } from '../../../shared/deadline-cell/deadline-cell';
import { isClosed, Status } from '../../../shared/status';
import { JobApplication } from '../application';
import { sortApplications } from '../application-sort';
import { StatusMenu } from '../status-menu/status-menu';

/**
 * Table des candidatures reçues en entrée, triable par colonne ; sans tri choisi, ordre par défaut du classeur.
 */
@Component({
  imports: [
    DatePipe,
    DeadlineCell,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    RouterLink,
    StatusMenu,
  ],
  selector: 'app-applications-table',
  styleUrl: './applications-table.scss',
  templateUrl: './applications-table.html',
})
export class ApplicationsTable {
  readonly applications = input.required<JobApplication[]>();
  readonly statuses = input.required<Status[]>();
  /** Candidature dont le statut vient d'être changé, telle que renvoyée par le serveur. */
  readonly statusChanged = output<JobApplication>();

  protected readonly columns: readonly (keyof JobApplication)[] = [
    'number',
    'groupName',
    'company',
    'jobTitle',
    'status',
    'sentOn',
    'deadlineLabel',
    'deadlineDate',
    'notes',
  ];

  /** Jour de référence des alertes d'échéance, lu une fois à l'affichage. */
  protected readonly today = today();

  protected readonly sort = signal<Sort>({ active: '', direction: '' });

  protected readonly rows = computed(() =>
    sortApplications(this.applications(), this.statuses(), this.sort()),
  );

  private readonly statusByCode = computed(
    () => new Map(this.statuses().map((status) => [status.code, status])),
  );

  protected statusOf(application: JobApplication): Status | undefined {
    return this.statusByCode().get(application.status);
  }

  protected isClosed(application: JobApplication): boolean {
    const status = this.statusOf(application);
    return status !== undefined && isClosed(status);
  }
}
