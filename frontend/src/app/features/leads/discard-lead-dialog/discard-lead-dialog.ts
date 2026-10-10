import { Component, inject, signal } from '@angular/core';
import { form, FormField, required, submit, TreeValidationResult } from '@angular/forms/signals';
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
import { JobLead } from '../lead';
import { LeadsApi } from '../leads-api';

/** Écarte une piste à évaluer avec un motif obligatoire ; se ferme avec la piste écartée. */
@Component({
  imports: [FormField, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  selector: 'app-discard-lead-dialog',
  template: `
    <h2 mat-dialog-title>Écarter la piste</h2>
    <form novalidate (submit)="save($event)">
      <mat-dialog-content>
        <p>{{ lead.company }} – {{ lead.jobTitle }} passe dans les pistes écartées.</p>
        <mat-form-field>
          <mat-label>Motif</mat-label>
          <textarea matInput aria-label="Motif" rows="3" [formField]="form.reason"></textarea>
          @for (error of form.reason().errors(); track $index) {
            <mat-error>{{ error.message }}</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="undefined">Annuler</button>
        <button mat-flat-button type="submit" [disabled]="form().submitting()">Écarter</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-form-field {
      width: min(28rem, 70vw);
    }
  `,
})
export class DiscardLeadDialog {
  protected readonly lead = inject<JobLead>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<DiscardLeadDialog, JobLead>>(MatDialogRef);
  private readonly api = inject(LeadsApi);

  private readonly model = signal({ reason: '' });

  protected readonly form = form(this.model, (path) => {
    required(path.reason, { message: 'Le motif est obligatoire.' });
  });

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, () => this.send());
  }

  private async send(): Promise<TreeValidationResult> {
    try {
      const discarded = await firstValueFrom(
        this.api.discard(this.lead.id, this.model().reason.trim()),
      );
      this.dialogRef.close(discarded);
      return undefined;
    } catch (error) {
      return serverFieldErrors(error, this.form);
    }
  }
}

/** Ouvre le dialogue ; émet la piste écartée, ou `undefined` si l'utilisateur annule. */
export function openDiscardLeadDialog(
  dialog: MatDialog,
  lead: JobLead,
): Observable<JobLead | undefined> {
  return dialog
    .open<DiscardLeadDialog, JobLead, JobLead>(DiscardLeadDialog, { data: lead })
    .afterClosed();
}
