import { inject, Service } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, map, Observable, of, switchMap, tap } from 'rxjs';
import { Status } from '../../shared/status';
import { JobApplication, StatusChangeRequest } from './application';
import { ApplicationsApi } from './applications-api';
import {
  SentOnDialog,
  SentOnDialogData,
  SentOnDialogResult,
} from './sent-on-dialog/sent-on-dialog';
import { needsSentOnDialog } from './status-change';

/**
 * Changement rapide de statut, depuis la liste ou la fiche : demande la date d'envoi si elle manque, envoie le
 * `PATCH`, confirme par un snackbar. Émet la candidature renvoyée par le serveur ; rien si le dialogue est annulé.
 */
@Service()
export class StatusChanger {
  private readonly api = inject(ApplicationsApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  change(application: JobApplication, status: Status): Observable<JobApplication> {
    const request$: Observable<StatusChangeRequest> = needsSentOnDialog(application, status)
      ? this.askSentOn(application, status)
      : of({ status: status.code });
    return request$.pipe(
      switchMap((request) => this.api.changeStatus(application.id, request)),
      tap((updated) =>
        this.snackBar.open(`Candidature n° ${updated.number} : ${status.label}.`, 'Fermer', {
          duration: 5000,
        }),
      ),
    );
  }

  // Une échéance effacée part absente du PATCH : le serveur garde alors l'échéance existante
  private askSentOn(application: JobApplication, status: Status): Observable<StatusChangeRequest> {
    return this.dialog
      .open<SentOnDialog, SentOnDialogData, SentOnDialogResult>(SentOnDialog, {
        data: { status, deadlineDate: application.deadlineDate },
      })
      .afterClosed()
      .pipe(
        filter((result): result is SentOnDialogResult => result !== undefined),
        map(({ sentOn, deadlineDate }) =>
          deadlineDate === null
            ? { status: status.code, sentOn }
            : { status: status.code, sentOn, deadlineDate },
        ),
      );
  }
}
