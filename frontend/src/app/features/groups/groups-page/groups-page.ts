import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CompanyGroup } from '../../applications/application';
import { ApplicationsApi } from '../../applications/applications-api';
import { GroupActions } from '../group-actions';
import { replaceGroup, summarizeGroups } from '../group-summary';
import { GroupsApi } from '../groups-api';

/**
 * Liste des groupes, triés par nom, avec leur nombre de candidatures ; chaque groupe mène à sa page et peut être
 * renommé ou supprimé.
 */
@Component({
  imports: [MatButtonModule, MatProgressBarModule, MatTableModule, RouterLink],
  selector: 'app-groups-page',
  styles: `
    /* Largeur du contenu : un max-width serait ignoré par une table */
    table {
      width: auto;
      min-width: 24rem;
    }

    .count {
      text-align: end;
    }

    .actions {
      white-space: nowrap;
      text-align: end;
    }
  `,
  template: `
    <h1>Groupes</h1>
    @if (data.isLoading()) {
      <mat-progress-bar mode="indeterminate" aria-label="Chargement des groupes" />
    } @else if (data.error()) {
      <p>La liste des groupes n’a pas pu être chargée.</p>
    } @else if (summaries().length === 0) {
      <p>Aucun groupe pour l’instant.</p>
    } @else {
      <table mat-table [dataSource]="summaries()">
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Groupe</th>
          <td mat-cell *matCellDef="let group">
            <a [routerLink]="['/groups', group.id]">{{ group.name }}</a>
          </td>
        </ng-container>

        <ng-container matColumnDef="applicationCount">
          <th mat-header-cell *matHeaderCellDef class="count">Candidatures</th>
          <td mat-cell *matCellDef="let group" class="count">{{ group.applicationCount }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>
            <span class="cdk-visually-hidden">Actions</span>
          </th>
          <td mat-cell *matCellDef="let group" class="actions">
            <button
              mat-button
              type="button"
              [attr.aria-label]="'Renommer le groupe ' + group.name"
              (click)="rename(group)"
            >
              Renommer
            </button>
            <button
              mat-button
              type="button"
              [attr.aria-label]="'Supprimer le groupe ' + group.name"
              (click)="delete(group)"
            >
              Supprimer
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    }
  `,
})
export class GroupsPage {
  private readonly groupsApi = inject(GroupsApi);
  private readonly applicationsApi = inject(ApplicationsApi);

  private readonly actions = inject(GroupActions);

  protected readonly columns = ['name', 'applicationCount', 'actions'];

  protected readonly data = rxResource({
    stream: () =>
      forkJoin({ groups: this.groupsApi.list(), applications: this.applicationsApi.list() }),
  });

  protected readonly summaries = computed(() => {
    if (!this.data.hasValue()) {
      return [];
    }
    const { groups, applications } = this.data.value();
    return summarizeGroups(groups, applications);
  });

  protected rename(group: CompanyGroup): void {
    this.actions
      .rename(group)
      .subscribe((renamed) =>
        this.data.update(
          (loaded) => loaded && { ...loaded, groups: replaceGroup(loaded.groups, renamed) },
        ),
      );
  }

  protected delete(group: CompanyGroup): void {
    this.actions
      .delete(group)
      .subscribe(() =>
        this.data.update(
          (loaded) =>
            loaded && { ...loaded, groups: loaded.groups.filter((each) => each.id !== group.id) },
        ),
      );
  }
}
