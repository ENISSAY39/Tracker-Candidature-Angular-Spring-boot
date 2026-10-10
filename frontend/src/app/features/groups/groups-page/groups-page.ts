import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApplicationsApi } from '../../applications/applications-api';
import { summarizeGroups } from '../group-summary';
import { GroupsApi } from '../groups-api';

/** Liste des groupes, triés par nom, avec leur nombre de candidatures ; chaque groupe mène à sa page. */
@Component({
  imports: [MatProgressBarModule, MatTableModule, RouterLink],
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

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    }
  `,
})
export class GroupsPage {
  private readonly groupsApi = inject(GroupsApi);
  private readonly applicationsApi = inject(ApplicationsApi);

  protected readonly columns = ['name', 'applicationCount'];

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
}
