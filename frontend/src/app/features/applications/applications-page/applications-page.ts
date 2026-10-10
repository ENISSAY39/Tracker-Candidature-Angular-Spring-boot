import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { forkJoin } from 'rxjs';
import { ApplicationsApi } from '../applications-api';
import { ApplicationsTable } from '../applications-table/applications-table';

@Component({
  imports: [ApplicationsTable, MatProgressBarModule],
  selector: 'app-applications-page',
  template: `
    <h1>Candidatures</h1>
    @if (data.isLoading()) {
      <mat-progress-bar mode="indeterminate" aria-label="Chargement des candidatures" />
    } @else if (data.error()) {
      <p>La liste des candidatures n’a pas pu être chargée.</p>
    } @else if (data.hasValue()) {
      @let loaded = data.value();
      @if (loaded.applications.length === 0) {
        <p>Aucune candidature pour l’instant.</p>
      } @else {
        <app-applications-table [applications]="loaded.applications" [statuses]="loaded.statuses" />
      }
    }
  `,
})
export class ApplicationsPage {
  private readonly api = inject(ApplicationsApi);

  protected readonly data = rxResource({
    stream: () => forkJoin({ statuses: this.api.statuses(), applications: this.api.list() }),
  });
}
