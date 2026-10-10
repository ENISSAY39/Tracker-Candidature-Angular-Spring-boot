import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { JobApplication } from '../application';
import { ApplicationsApi } from '../applications-api';
import { ApplicationsList } from '../applications-list/applications-list';
import { replaceApplication } from '../replace-application';

@Component({
  imports: [ApplicationsList, MatButtonModule, MatProgressBarModule, RouterLink],
  selector: 'app-applications-page',
  styles: `
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
  `,
  template: `
    <header>
      <h1>Candidatures</h1>
      <a mat-flat-button routerLink="/applications/new">Nouvelle candidature</a>
    </header>
    @if (data.isLoading()) {
      <mat-progress-bar mode="indeterminate" aria-label="Chargement des candidatures" />
    } @else if (data.error()) {
      <p>La liste des candidatures n’a pas pu être chargée.</p>
    } @else if (data.hasValue()) {
      @let loaded = data.value();
      @if (loaded.applications.length === 0) {
        <p>Aucune candidature pour l’instant.</p>
      } @else {
        <app-applications-list
          [applications]="loaded.applications"
          [statuses]="loaded.statuses"
          (statusChanged)="applyStatusChange($event)"
        />
      }
    }
  `,
})
export class ApplicationsPage {
  private readonly api = inject(ApplicationsApi);

  protected readonly data = rxResource({
    stream: () => forkJoin({ statuses: this.api.statuses(), applications: this.api.list() }),
  });

  /** Remplace la candidature par la réponse du serveur : tri, compteurs et alertes se recalculent. */
  protected applyStatusChange(updated: JobApplication): void {
    this.data.update(
      (loaded) =>
        loaded && {
          ...loaded,
          applications: replaceApplication(loaded.applications, updated),
        },
    );
  }
}
