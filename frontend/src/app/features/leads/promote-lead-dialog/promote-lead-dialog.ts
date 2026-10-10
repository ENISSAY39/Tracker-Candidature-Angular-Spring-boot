import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  form,
  FormField,
  maxLength,
  required,
  submit,
  TreeValidationResult,
} from '@angular/forms/signals';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
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
import { containsText } from '../../../shared/text';
import { JobApplication } from '../../applications/application';
import { ApplicationsApi } from '../../applications/applications-api';
import { JobLead } from '../lead';
import { LeadsApi } from '../leads-api';

/** Longueur de `company_group.name` (comme le `@Size` de `PromoteLeadRequest`). */
const MAX_GROUP_NAME_LENGTH = 100;

/**
 * Promeut une piste à évaluer en candidature « À envoyer » : demande le groupe, avec autocomplétion sur les groupes
 * existants, et se ferme avec la candidature créée.
 */
@Component({
  imports: [
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  selector: 'app-promote-lead-dialog',
  template: `
    <h2 mat-dialog-title>Promouvoir la piste</h2>
    <form novalidate (submit)="save($event)">
      <mat-dialog-content>
        <p>
          {{ lead.company }} – {{ lead.jobTitle }} devient une candidature « À envoyer » ; la piste
          disparaît.
        </p>
        <mat-form-field>
          <mat-label>Groupe</mat-label>
          <input
            matInput
            aria-label="Groupe"
            [formField]="form.groupName"
            [matAutocomplete]="groupAutocomplete"
          />
          <mat-autocomplete #groupAutocomplete="matAutocomplete">
            @for (name of groupSuggestions(); track name) {
              <mat-option [value]="name">{{ name }}</mat-option>
            }
          </mat-autocomplete>
          <mat-hint>Un nom nouveau crée le groupe.</mat-hint>
          @for (error of form.groupName().errors(); track $index) {
            <mat-error>{{ error.message }}</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="undefined">Annuler</button>
        <button mat-flat-button type="submit" [disabled]="form().submitting()">Promouvoir</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-form-field {
      width: min(28rem, 70vw);
    }
  `,
})
export class PromoteLeadDialog {
  protected readonly lead = inject<JobLead>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<PromoteLeadDialog, JobApplication>>(MatDialogRef);
  private readonly api = inject(LeadsApi);
  private readonly applicationsApi = inject(ApplicationsApi);

  private readonly groups = rxResource({ stream: () => this.applicationsApi.groups() });

  private readonly model = signal({ groupName: '' });

  protected readonly form = form(this.model, (path) => {
    required(path.groupName, { message: 'Le groupe est obligatoire.' });
    maxLength(path.groupName, MAX_GROUP_NAME_LENGTH, {
      message: `${MAX_GROUP_NAME_LENGTH} caractères au plus.`,
    });
  });

  protected readonly groupSuggestions = computed(() => {
    const typed = this.model().groupName;
    return (this.groups.value() ?? [])
      .map((group) => group.name)
      .filter((name) => containsText(name, typed));
  });

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, () => this.send());
  }

  private async send(): Promise<TreeValidationResult> {
    try {
      const created = await firstValueFrom(
        this.api.promote(this.lead.id, this.model().groupName.trim()),
      );
      this.dialogRef.close(created);
      return undefined;
    } catch (error) {
      return serverFieldErrors(error, this.form);
    }
  }
}

/** Ouvre le dialogue ; émet la candidature créée, ou `undefined` si l'utilisateur annule. */
export function openPromoteLeadDialog(
  dialog: MatDialog,
  lead: JobLead,
): Observable<JobApplication | undefined> {
  return dialog
    .open<PromoteLeadDialog, JobLead, JobApplication>(PromoteLeadDialog, { data: lead })
    .afterClosed();
}
