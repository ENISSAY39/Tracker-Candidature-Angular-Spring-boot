import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { filter, switchMap } from 'rxjs';
import { openConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { JobLead } from '../lead';
import { openLeadDialog } from '../lead-dialog/lead-dialog';
import { LeadsApi } from '../leads-api';
import { LeadsTable } from '../leads-table/leads-table';

/** Pistes en deux onglets, à évaluer et écartées, avec ajout, modification et suppression. */
@Component({
  imports: [LeadsTable, MatButtonModule, MatProgressBarModule, MatTabsModule],
  selector: 'app-leads-page',
  styles: `
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .empty {
      padding: 1rem 0;
    }
  `,
  template: `
    <header>
      <h1>Pistes</h1>
      <button mat-flat-button type="button" (click)="add()">Nouvelle piste</button>
    </header>
    @if (leads.isLoading()) {
      <mat-progress-bar mode="indeterminate" aria-label="Chargement des pistes" />
    } @else if (leads.error()) {
      <p>La liste des pistes n’a pas pu être chargée.</p>
    } @else {
      <mat-tab-group>
        <mat-tab [label]="'À évaluer (' + toEvaluate().length + ')'">
          @if (toEvaluate().length === 0) {
            <p class="empty">Aucune piste à évaluer.</p>
          } @else {
            <app-leads-table
              [leads]="toEvaluate()"
              (edit)="edit($event)"
              (remove)="remove($event)"
            />
          }
        </mat-tab>
        <mat-tab [label]="'Écartées (' + discarded().length + ')'">
          @if (discarded().length === 0) {
            <p class="empty">Aucune piste écartée.</p>
          } @else {
            <app-leads-table
              [leads]="discarded()"
              [discarded]="true"
              (edit)="edit($event)"
              (remove)="remove($event)"
            />
          }
        </mat-tab>
      </mat-tab-group>
    }
  `,
})
export class LeadsPage {
  private readonly api = inject(LeadsApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly leads = rxResource({ stream: () => this.api.list() });

  protected readonly toEvaluate = computed(() =>
    (this.leads.value() ?? []).filter((lead) => lead.state === 'TO_EVALUATE'),
  );

  protected readonly discarded = computed(() =>
    (this.leads.value() ?? []).filter((lead) => lead.state === 'DISCARDED'),
  );

  protected add(): void {
    openLeadDialog(this.dialog, null)
      .pipe(filter((saved) => saved !== undefined))
      .subscribe((saved) => {
        this.leads.update((leads) => [...(leads ?? []), saved]);
        this.notify('Piste ajoutée.');
      });
  }

  protected edit(lead: JobLead): void {
    openLeadDialog(this.dialog, lead)
      .pipe(filter((saved) => saved !== undefined))
      .subscribe((saved) => {
        this.leads.update((leads) => leads?.map((each) => (each.id === saved.id ? saved : each)));
        this.notify('Piste modifiée.');
      });
  }

  protected remove(lead: JobLead): void {
    openConfirmDialog(this.dialog, {
      title: 'Supprimer la piste',
      message: `La piste ${lead.company} (${lead.jobTitle}) sera supprimée définitivement.`,
      confirmLabel: 'Supprimer',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.delete(lead.id)),
      )
      .subscribe(() => {
        this.leads.update((leads) => leads?.filter((each) => each.id !== lead.id));
        this.notify('Piste supprimée.');
      });
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Fermer', { duration: 5000 });
  }
}
