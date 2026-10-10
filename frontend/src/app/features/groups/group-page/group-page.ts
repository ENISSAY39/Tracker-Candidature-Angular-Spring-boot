import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { JobApplication } from '../../applications/application';
import { ApplicationsApi } from '../../applications/applications-api';
import { ApplicationsList } from '../../applications/applications-list/applications-list';
import { GroupsApi } from '../groups-api';

/**
 * Page d'un groupe, équivalent de sa feuille dans le classeur : la liste des candidatures, réduite à celles du
 * groupe, avec ses compteurs, sans le filtre de groupe.
 */
@Component({
  imports: [ApplicationsList, MatProgressBarModule, RouterLink],
  selector: 'app-group-page',
  template: `
    @if (data.isLoading()) {
      <mat-progress-bar mode="indeterminate" aria-label="Chargement du groupe" />
    } @else if (data.error()) {
      <p>Le groupe n’a pas pu être chargé.</p>
    } @else if (data.hasValue()) {
      @let current = group();
      @if (current === undefined) {
        <h1>Groupe introuvable</h1>
        <p>Ce groupe n’existe pas.</p>
        <a routerLink="/groups">Voir la liste des groupes</a>
      } @else {
        <p><a routerLink="/groups">Tous les groupes</a></p>
        <h1>{{ current.name }}</h1>
        @if (applications().length === 0) {
          <p>Aucune candidature dans ce groupe.</p>
        } @else {
          <app-applications-list
            [applications]="applications()"
            [statuses]="data.value().statuses"
            [showGroupFilter]="false"
            (statusChanged)="applyStatusChange($event)"
          />
        }
      }
    }
  `,
})
export class GroupPage {
  /** Identifiant lu dans l'URL `/groups/:id`. */
  readonly id = input.required({ transform: numberAttribute });

  private readonly groupsApi = inject(GroupsApi);
  private readonly applicationsApi = inject(ApplicationsApi);

  // Pas de lecture d'un seul groupe dans l'API : la liste des groupes est courte
  protected readonly data = rxResource({
    params: () => this.id(),
    stream: () =>
      forkJoin({
        groups: this.groupsApi.list(),
        statuses: this.applicationsApi.statuses(),
        applications: this.applicationsApi.list(),
      }),
  });

  protected readonly group = computed(() =>
    this.data.hasValue()
      ? this.data.value().groups.find((group) => group.id === this.id())
      : undefined,
  );

  protected readonly applications = computed(() =>
    this.data.hasValue()
      ? this.data.value().applications.filter((application) => application.groupId === this.id())
      : [],
  );

  /** Remplace la candidature par la réponse du serveur : tri, compteurs et alertes se recalculent. */
  protected applyStatusChange(updated: JobApplication): void {
    this.data.update(
      (loaded) =>
        loaded && {
          ...loaded,
          applications: loaded.applications.map((application) =>
            application.id === updated.id ? updated : application,
          ),
        },
    );
  }
}
