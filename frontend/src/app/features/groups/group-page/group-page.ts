import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CompanyGroup, JobApplication } from '../../applications/application';
import { ApplicationsApi } from '../../applications/applications-api';
import { ApplicationsList } from '../../applications/applications-list/applications-list';
import { replaceApplication } from '../../applications/replace-application';
import { GroupActions } from '../group-actions';
import { renameGroupOf, replaceGroup } from '../group-summary';
import { GroupsApi } from '../groups-api';

/**
 * Page d'un groupe, équivalent de sa feuille dans le classeur : la liste des candidatures, réduite à celles du
 * groupe, avec ses compteurs, sans le filtre de groupe.
 */
@Component({
  imports: [ApplicationsList, MatButtonModule, MatProgressBarModule, RouterLink],
  selector: 'app-group-page',
  styles: `
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }
  `,
  template: `
    @if (data.isLoading()) {
      <mat-progress-bar mode="indeterminate" aria-label="Chargement du groupe" />
    } @else if (data.error()) {
      <h1>Groupe indisponible</h1>
      <p>Le groupe n’a pas pu être chargé.</p>
      <a mat-button routerLink="/groups">Retour aux groupes</a>
    } @else if (data.hasValue()) {
      <a mat-button routerLink="/groups">Retour aux groupes</a>
      @let current = group();
      @if (current === undefined) {
        <h1>Groupe introuvable</h1>
        <p>Ce groupe n’existe pas.</p>
      } @else {
        <header>
          <h1>{{ current.name }}</h1>
          <div class="actions">
            <button mat-stroked-button type="button" (click)="rename(current)">Renommer</button>
            <button mat-stroked-button type="button" (click)="delete(current)">Supprimer</button>
          </div>
        </header>
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
  private readonly actions = inject(GroupActions);
  private readonly router = inject(Router);

  // Pas de lecture d'un seul groupe dans l'API : la liste des groupes est courte. Chargé une fois ; passer d'un
  // groupe à l'autre ne fait que refiltrer.
  protected readonly data = rxResource({
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
          applications: replaceApplication(loaded.applications, updated),
        },
    );
  }

  /** Le nouveau nom remplace l'ancien dans le titre et dans la colonne « Groupe » des candidatures. */
  protected rename(group: CompanyGroup): void {
    this.actions.rename(group).subscribe((renamed) =>
      this.data.update(
        (loaded) =>
          loaded && {
            ...loaded,
            groups: replaceGroup(loaded.groups, renamed),
            applications: renameGroupOf(loaded.applications, renamed),
          },
      ),
    );
  }

  protected delete(group: CompanyGroup): void {
    this.actions.delete(group).subscribe(() => void this.router.navigate(['/groups']));
  }
}
