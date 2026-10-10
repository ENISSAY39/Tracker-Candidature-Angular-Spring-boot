import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { JobLead } from '../lead';

/** Table des pistes d'un onglet ; le motif n'apparaît que pour les pistes écartées. */
@Component({
  imports: [MatButtonModule, MatTableModule],
  selector: 'app-leads-table',
  styles: `
    .multiline {
      white-space: pre-line;
    }

    .actions {
      white-space: nowrap;
      text-align: end;
    }
  `,
  template: `
    <table mat-table [dataSource]="leads()">
      <ng-container matColumnDef="company">
        <th mat-header-cell *matHeaderCellDef>Entreprise</th>
        <td mat-cell *matCellDef="let lead">{{ lead.company }}</td>
      </ng-container>

      <ng-container matColumnDef="jobTitle">
        <th mat-header-cell *matHeaderCellDef>Poste</th>
        <td mat-cell *matCellDef="let lead">{{ lead.jobTitle }}</td>
      </ng-container>

      <ng-container matColumnDef="plannedCv">
        <th mat-header-cell *matHeaderCellDef>CV prévu</th>
        <td mat-cell *matCellDef="let lead">{{ lead.plannedCv }}</td>
      </ng-container>

      <ng-container matColumnDef="remark">
        <th mat-header-cell *matHeaderCellDef>Remarque</th>
        <td mat-cell *matCellDef="let lead" class="multiline">{{ lead.remark }}</td>
      </ng-container>

      <ng-container matColumnDef="discardReason">
        <th mat-header-cell *matHeaderCellDef>Motif</th>
        <td mat-cell *matCellDef="let lead" class="multiline">{{ lead.discardReason }}</td>
      </ng-container>

      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef><span class="cdk-visually-hidden">Actions</span></th>
        <td mat-cell *matCellDef="let lead" class="actions">
          <button
            mat-button
            type="button"
            [attr.aria-label]="'Modifier la piste ' + lead.company + ', ' + lead.jobTitle"
            (click)="edit.emit(lead)"
          >
            Modifier
          </button>
          <button
            mat-button
            type="button"
            [attr.aria-label]="'Supprimer la piste ' + lead.company + ', ' + lead.jobTitle"
            (click)="remove.emit(lead)"
          >
            Supprimer
          </button>
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="columns()"></tr>
      <tr mat-row *matRowDef="let row; columns: columns()"></tr>
    </table>
  `,
})
export class LeadsTable {
  readonly leads = input.required<JobLead[]>();
  /** Onglet des pistes écartées : ajoute la colonne du motif. */
  readonly discarded = input(false);
  readonly edit = output<JobLead>();
  readonly remove = output<JobLead>();

  protected readonly columns = computed(() => [
    'company',
    'jobTitle',
    'plannedCv',
    'remark',
    ...(this.discarded() ? ['discardReason'] : []),
    'actions',
  ]);
}
