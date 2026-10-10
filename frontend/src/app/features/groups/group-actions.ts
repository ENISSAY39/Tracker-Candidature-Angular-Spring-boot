import { HttpErrorResponse } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, EMPTY, filter, map, Observable, switchMap, tap } from 'rxjs';
import { openConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { CompanyGroup } from '../applications/application';
import { GroupsApi } from './groups-api';
import { openRenameGroupDialog } from './rename-group-dialog/rename-group-dialog';

/**
 * Renommage et suppression d'un groupe, depuis la liste des groupes ou la page d'un groupe, confirmés par un
 * snackbar. Chaque action n'émet qu'en cas de succès ; annuler ou échouer n'émet rien.
 */
@Service()
export class GroupActions {
  private readonly api = inject(GroupsApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** Émet le groupe renommé. */
  rename(group: CompanyGroup): Observable<CompanyGroup> {
    return openRenameGroupDialog(this.dialog, group).pipe(
      filter((renamed) => renamed !== undefined),
      tap((renamed) => this.notify(`Groupe renommé en « ${renamed.name} ».`)),
    );
  }

  /** Après confirmation ; émet une fois le groupe supprimé. */
  delete(group: CompanyGroup): Observable<void> {
    return openConfirmDialog(this.dialog, {
      title: 'Supprimer le groupe',
      message: `Le groupe « ${group.name} » sera supprimé définitivement.`,
      confirmLabel: 'Supprimer',
    }).pipe(
      filter(Boolean),
      switchMap(() =>
        this.api.delete(group.id).pipe(
          catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 409) {
              this.notify(
                `Le groupe « ${group.name} » a encore des candidatures : il ne peut pas être supprimé.`,
              );
            }
            // Toute autre erreur est déjà affichée par l'intercepteur
            return EMPTY;
          }),
        ),
      ),
      map(() => undefined),
      tap(() => this.notify(`Groupe « ${group.name} » supprimé.`)),
    );
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Fermer', { duration: 5000 });
  }
}
