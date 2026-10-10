import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { filter, forkJoin, switchMap } from 'rxjs';
import { openConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { today } from '../../../shared/dates';
import { DeadlineCell } from '../../../shared/deadline-cell/deadline-cell';
import { isClosed } from '../../../shared/status';
import { JobApplication } from '../application';
import { ApplicationsApi } from '../applications-api';
import { StatusMenu } from '../status-menu/status-menu';

/** Fiche d'une candidature : tous ses champs, notes complètes, suppression après confirmation. */
@Component({
  imports: [DatePipe, DeadlineCell, MatButtonModule, MatProgressBarModule, RouterLink, StatusMenu],
  selector: 'app-application-detail',
  styleUrl: './application-detail.scss',
  templateUrl: './application-detail.html',
})
export class ApplicationDetail {
  /** Identifiant lu dans l'URL `/applications/:id`. */
  readonly id = input.required({ transform: numberAttribute });

  private readonly api = inject(ApplicationsApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly today = today();

  protected readonly data = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) =>
      forkJoin({ application: this.api.get(id), statuses: this.api.statuses() }),
  });

  protected readonly notFound = computed(() => {
    const error = this.data.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });

  protected readonly status = computed(() => {
    if (!this.data.hasValue()) {
      return undefined;
    }
    const { application, statuses } = this.data.value();
    return statuses.find((status) => status.code === application.status);
  });

  protected readonly closed = computed(() => {
    const status = this.status();
    return status !== undefined && isClosed(status);
  });

  /** Candidature renvoyée par le serveur après un changement de statut. */
  protected replace(updated: JobApplication): void {
    this.data.update((loaded) => loaded && { ...loaded, application: updated });
  }

  protected delete(application: JobApplication): void {
    openConfirmDialog(this.dialog, {
      title: 'Supprimer la candidature',
      message: `La candidature n° ${application.number} (${application.company}) sera supprimée définitivement.`,
      confirmLabel: 'Supprimer',
    })
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.delete(application.id)),
      )
      .subscribe({
        next: () => {
          this.snackBar.open(`Candidature n° ${application.number} supprimée.`, 'Fermer', {
            duration: 5000,
          });
          void this.router.navigate(['/applications']);
        },
        // Échec déjà affiché par l'intercepteur : la fiche reste ouverte
        error: () => undefined,
      });
  }
}
