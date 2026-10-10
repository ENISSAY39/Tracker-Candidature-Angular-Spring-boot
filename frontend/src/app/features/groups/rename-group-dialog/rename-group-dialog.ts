import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  form,
  FormField,
  maxLength,
  required,
  submit,
  TreeValidationResult,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom, Observable } from 'rxjs';
import { serverFieldErrors } from '../../../shared/server-errors';
import { CompanyGroup } from '../../applications/application';
import { GroupsApi } from '../groups-api';

/** Longueur de `company_group.name` (comme le `@Size` de `CompanyGroupRequest`). */
const MAX_NAME_LENGTH = 100;

/**
 * Renomme un groupe : envoie le nouveau nom et se ferme avec le groupe renommé. Un nom déjà pris (409) ou refusé par
 * la validation du serveur (400) s'affiche sous le champ, le dialogue restant ouvert.
 */
@Component({
  imports: [FormField, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  selector: 'app-rename-group-dialog',
  template: `
    <h2 mat-dialog-title>Renommer le groupe</h2>
    <form novalidate (submit)="save($event)">
      <mat-dialog-content>
        <mat-form-field>
          <mat-label>Nom du groupe</mat-label>
          <input matInput aria-label="Nom du groupe" [formField]="form.name" />
          @for (error of form.name().errors(); track $index) {
            <mat-error>{{ error.message }}</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="undefined">Annuler</button>
        <button mat-flat-button type="submit" [disabled]="form().submitting()">Renommer</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-form-field {
      width: min(24rem, 70vw);
    }
  `,
})
export class RenameGroupDialog {
  private readonly group = inject<CompanyGroup>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<RenameGroupDialog, CompanyGroup>>(MatDialogRef);
  private readonly api = inject(GroupsApi);

  private readonly model = signal({ name: this.group.name });

  protected readonly form = form(this.model, (path) => {
    required(path.name, { message: 'Le nom est obligatoire.' });
    maxLength(path.name, MAX_NAME_LENGTH, { message: `${MAX_NAME_LENGTH} caractères au plus.` });
  });

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, () => this.send());
  }

  private async send(): Promise<TreeValidationResult> {
    try {
      const renamed = await firstValueFrom(
        this.api.rename(this.group.id, this.model().name.trim()),
      );
      this.dialogRef.close(renamed);
      return undefined;
    } catch (error) {
      // Pas de fusion : un nom déjà porté par un autre groupe est refusé
      if (error instanceof HttpErrorResponse && error.status === 409) {
        return { fieldTree: this.form.name, kind: 'server', message: 'Ce nom est déjà pris.' };
      }
      return serverFieldErrors(error, this.form);
    }
  }
}

/** Ouvre le dialogue ; émet le groupe renommé, ou `undefined` si l'utilisateur annule. */
export function openRenameGroupDialog(
  dialog: MatDialog,
  group: CompanyGroup,
): Observable<CompanyGroup | undefined> {
  return dialog
    .open<RenameGroupDialog, CompanyGroup, CompanyGroup>(RenameGroupDialog, { data: group })
    .afterClosed();
}
