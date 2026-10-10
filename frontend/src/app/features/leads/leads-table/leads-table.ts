import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { JobLead } from '../lead';

/**
 * Table des pistes d'un onglet. Pistes à évaluer : promouvoir et écarter ; pistes écartées : leur motif et
 * réévaluer. Modifier et supprimer valent pour les deux.
 */
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
          @if (discarded()) {
            <button
              mat-button
              type="button"
              [attr.aria-label]="'Réévaluer la piste ' + lead.company + ', ' + lead.jobTitle"
              (click)="restore.emit(lead)"
            >
              Réévaluer
            </button>
          } @else {
            <button
              mat-button
              type="button"
              [attr.aria-label]="'Promouvoir la piste ' + lead.company + ', ' + lead.jobTitle"
              (click)="promote.emit(lead)"
            >
              Promouvoir
            </button>
            <button
              mat-button
              type="button"
              [attr.aria-label]="'Écarter la piste ' + lead.company + ', ' + lead.jobTitle"
              (click)="discard.emit(lead)"
            >
              Écarter
            </button>
          }
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
  /** Pistes à évaluer : en faire une candidature. */
  readonly promote = output<JobLead>();
  /** Pistes à évaluer : les écarter avec un motif. */
  readonly discard = output<JobLead>();
  /** Pistes écartées : les remettre à évaluer. */
  readonly restore = output<JobLead>();
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
