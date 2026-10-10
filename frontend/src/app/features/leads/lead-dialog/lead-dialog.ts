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
import { trimToNull } from '../../../shared/text';
import { JobLead, JobLeadRequest } from '../lead';
import { LeadsApi } from '../leads-api';

/** Longueur des colonnes `varchar` du schéma (comme les `@Size` de `JobLeadRequest`). */
const MAX_TEXT_LENGTH = 255;

interface LeadFormModel {
  company: string;
  jobTitle: string;
  plannedCv: string;
  remark: string;
}

/**
 * Ajout ou modification d'une piste : envoie la requête et se ferme avec la piste enregistrée ; une erreur de
 * validation du serveur s'affiche sous son champ, le dialogue restant ouvert.
 */
@Component({
  imports: [FormField, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  selector: 'app-lead-dialog',
  template: `
    <h2 mat-dialog-title>{{ lead ? 'Modifier la piste' : 'Nouvelle piste' }}</h2>
    <form novalidate (submit)="save($event)">
      <mat-dialog-content>
        <mat-form-field>
          <mat-label>Entreprise</mat-label>
          <input matInput aria-label="Entreprise" [formField]="form.company" />
          @for (error of form.company().errors(); track $index) {
            <mat-error>{{ error.message }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Poste</mat-label>
          <input matInput aria-label="Poste" [formField]="form.jobTitle" />
          @for (error of form.jobTitle().errors(); track $index) {
            <mat-error>{{ error.message }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>CV prévu</mat-label>
          <input matInput aria-label="CV prévu" [formField]="form.plannedCv" />
          @for (error of form.plannedCv().errors(); track $index) {
            <mat-error>{{ error.message }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Remarque</mat-label>
          <textarea matInput aria-label="Remarque" rows="4" [formField]="form.remark"></textarea>
          @for (error of form.remark().errors(); track $index) {
            <mat-error>{{ error.message }}</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="undefined">Annuler</button>
        <button mat-flat-button type="submit" [disabled]="form().submitting()">Enregistrer</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      min-width: min(32rem, 80vw);
    }
  `,
})
export class LeadDialog {
  /** Piste à modifier ; `null` pour en ajouter une. */
  protected readonly lead = inject<JobLead | null>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<LeadDialog, JobLead>>(MatDialogRef);
  private readonly api = inject(LeadsApi);

  private readonly model = signal<LeadFormModel>({
    company: this.lead?.company ?? '',
    jobTitle: this.lead?.jobTitle ?? '',
    plannedCv: this.lead?.plannedCv ?? '',
    remark: this.lead?.remark ?? '',
  });

  protected readonly form = form(this.model, (path) => {
    required(path.company, { message: 'L’entreprise est obligatoire.' });
    maxLength(path.company, MAX_TEXT_LENGTH, { message: `${MAX_TEXT_LENGTH} caractères au plus.` });
    required(path.jobTitle, { message: 'Le poste est obligatoire.' });
    maxLength(path.jobTitle, MAX_TEXT_LENGTH, {
      message: `${MAX_TEXT_LENGTH} caractères au plus.`,
    });
    maxLength(path.plannedCv, MAX_TEXT_LENGTH, {
      message: `${MAX_TEXT_LENGTH} caractères au plus.`,
    });
  });

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, () => this.send());
  }

  private async send(): Promise<TreeValidationResult> {
    const request = toRequest(this.model());
    try {
      const saved = await firstValueFrom(
        this.lead ? this.api.update(this.lead.id, request) : this.api.create(request),
      );
      this.dialogRef.close(saved);
      return undefined;
    } catch (error) {
      return serverFieldErrors(error, this.form);
    }
  }
}

function toRequest(model: LeadFormModel): JobLeadRequest {
  return {
    company: model.company.trim(),
    jobTitle: model.jobTitle.trim(),
    plannedCv: trimToNull(model.plannedCv),
    remark: trimToNull(model.remark),
  };
}

/** Ouvre le dialogue ; émet la piste enregistrée, ou `undefined` si l'utilisateur annule. */
export function openLeadDialog(
  dialog: MatDialog,
  lead: JobLead | null,
): Observable<JobLead | undefined> {
  return dialog.open<LeadDialog, JobLead | null, JobLead>(LeadDialog, { data: lead }).afterClosed();
}
