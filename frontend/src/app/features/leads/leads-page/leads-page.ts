import { Component, computed, ElementRef, inject, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { openConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { JobLead } from '../lead';
import { openDiscardLeadDialog } from '../discard-lead-dialog/discard-lead-dialog';
import { openLeadDialog } from '../lead-dialog/lead-dialog';
import { LeadsApi } from '../leads-api';
import { LeadsTable } from '../leads-table/leads-table';
import { openPromoteLeadDialog } from '../promote-lead-dialog/promote-lead-dialog';

/**
 * Pistes en deux onglets, à évaluer et écartées : ajout, modification, suppression, et les gestes promouvoir, écarter
 * et réévaluer.
 */
@Component({
  imports: [LeadsTable, MatButtonModule, MatProgressBarModule, MatTabsModule],
  selector: 'app-leads-page',
  styles: `
    h1:focus {
      outline: none;
    }

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
      <h1 #heading tabindex="-1">Pistes</h1>
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
              (promote)="promote($event)"
              (discard)="discard($event)"
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
              (restore)="restore($event)"
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
  private readonly router = inject(Router);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

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

  /** Après la promotion, la fiche de la candidature créée s'ouvre pour la compléter. */
  protected promote(lead: JobLead): void {
    openPromoteLeadDialog(this.dialog, lead)
      .pipe(filter((created) => created !== undefined))
      .subscribe((created) => {
        this.notify(`Piste promue : candidature n° ${created.number} créée.`);
        void this.router.navigate(['/applications', created.id]);
      });
  }

  protected discard(lead: JobLead): void {
    openDiscardLeadDialog(this.dialog, lead)
      .pipe(filter((discarded) => discarded !== undefined))
      .subscribe((discarded) => {
        this.replace(discarded);
        this.moveFocusToHeading();
        this.notify('Piste écartée.');
      });
  }

  protected restore(lead: JobLead): void {
    this.api.restore(lead.id).subscribe({
      next: (restored) => {
        this.replace(restored);
        this.moveFocusToHeading();
        this.notify('Piste remise à évaluer.');
      },
      // Échec déjà affiché par l'intercepteur : la piste reste où elle est
      error: () => undefined,
    });
  }

  protected edit(lead: JobLead): void {
    openLeadDialog(this.dialog, lead)
      .pipe(filter((saved) => saved !== undefined))
      .subscribe((saved) => {
        this.replace(saved);
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
      .subscribe({
        next: () => {
          this.leads.update((leads) => leads?.filter((each) => each.id !== lead.id));
          this.notify('Piste supprimée.');
        },
        // Échec déjà affiché par l'intercepteur : la piste reste dans la liste
        error: () => undefined,
      });
  }

  /** La piste renvoyée par le serveur remplace l'ancienne ; un changement d'état la fait changer d'onglet. */
  private replace(updated: JobLead): void {
    this.leads.update((leads) => leads?.map((each) => (each.id === updated.id ? updated : each)));
  }

  /** La ligne a quitté l'onglet avec le bouton qui avait le focus : il repart du titre de la page. */
  private moveFocusToHeading(): void {
    this.heading()?.nativeElement.focus();
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Fermer', { duration: 5000 });
  }
}
