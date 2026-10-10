import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { map, Observable } from 'rxjs';

export interface ConfirmDialogData {
  title: string;
  message: string;
  /** Libellé du bouton qui confirme, par exemple « Supprimer ». */
  confirmLabel: string;
}

/** Dialogue de confirmation partagé ; le focus part sur « Annuler », l'action la moins risquée. */
@Component({
  imports: [MatButtonModule, MatDialogModule],
  selector: 'app-confirm-dialog',
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false" cdkFocusInitial>Annuler</button>
      <button mat-flat-button type="button" [mat-dialog-close]="true">
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}

/** Ouvre le dialogue ; émet `true` si l'utilisateur confirme, `false` sinon (annulation, Échap, clic dehors). */
export function openConfirmDialog(dialog: MatDialog, data: ConfirmDialogData): Observable<boolean> {
  return (
    dialog
      // Ouvert parfois par un garde de route : la navigation en attente ne doit pas le refermer
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data,
        closeOnNavigation: false,
      })
      .afterClosed()
      .pipe(map((confirmed) => confirmed === true))
  );
}
