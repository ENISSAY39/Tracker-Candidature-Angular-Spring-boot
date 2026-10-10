import { Component, inject, signal } from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { fromDay, toDay, today } from '../../../shared/dates';
import { Status } from '../../../shared/status';
import { FOLLOW_UP_DAYS, proposeDeadline } from '../deadline-proposal';

export interface SentOnDialogData {
  /** Nouveau statut, qui exige une date d'envoi. */
  status: Status;
  /** Échéance actuelle de la candidature (`yyyy-MM-dd`), gardée plutôt que remplacée par la proposition. */
  deadlineDate: string | null;
}

/** Dates choisies, au format `yyyy-MM-dd`. */
export interface SentOnDialogResult {
  sentOn: string;
  deadlineDate: string | null;
}

/**
 * Demande la date d'envoi qui manque pour le nouveau statut : aujourd'hui par défaut, avec l'échéance actuelle ou, si
 * elle est vide, proposée à + 14 jours (sauf statut clos), modifiable et effaçable.
 */
@Component({
  imports: [
    FormField,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  selector: 'app-sent-on-dialog',
  template: `
    <h2 mat-dialog-title>Date d’envoi</h2>
    <form novalidate (submit)="confirm($event)">
      <mat-dialog-content>
        <p>Le statut « {{ data.status.label }} » exige une date d’envoi.</p>
        <mat-form-field>
          <mat-label>Envoyée le</mat-label>
          <input
            matInput
            aria-label="Envoyée le"
            [matDatepicker]="sentOnPicker"
            [formField]="form.sentOn"
            (dateChange)="onSentOnChange()"
          />
          <mat-datepicker-toggle matIconSuffix [for]="sentOnPicker" />
          <mat-datepicker #sentOnPicker />
          @for (error of form.sentOn().errors(); track $index) {
            <mat-error>{{ error.message }}</mat-error>
          }
        </mat-form-field>
        @if (!data.status.closed) {
          <mat-form-field>
            <mat-label>Date échéance</mat-label>
            <input
              matInput
              aria-label="Date échéance"
              [matDatepicker]="deadlinePicker"
              [formField]="form.deadlineDate"
            />
            <mat-datepicker-toggle matIconSuffix [for]="deadlinePicker" />
            <mat-datepicker #deadlinePicker />
            <mat-hint>Proposée à l’envoi + {{ followUpDays }} jours.</mat-hint>
          </mat-form-field>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Annuler</button>
        <button mat-flat-button type="submit">Valider</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  `,
})
export class SentOnDialog {
  protected readonly data = inject<SentOnDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<SentOnDialog, SentOnDialogResult>>(MatDialogRef);

  protected readonly followUpDays = FOLLOW_UP_DAYS;

  private readonly model = signal(this.initialDates());

  protected readonly form = form(this.model, (path) => {
    required(path.sentOn, { message: 'La date d’envoi est obligatoire pour ce statut.' });
  });

  protected onSentOnChange(): void {
    const { sentOn, deadlineDate } = this.model();
    const proposed = proposeDeadline(
      sentOn ? toDay(sentOn) : null,
      deadlineDate ? toDay(deadlineDate) : null,
      this.data.status.closed,
    );
    this.form.deadlineDate().value.set(proposed ? fromDay(proposed) : null);
  }

  protected async confirm(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, async () => {
      const { sentOn, deadlineDate } = this.model();
      if (sentOn) {
        this.dialogRef.close({
          sentOn: toDay(sentOn),
          deadlineDate: deadlineDate ? toDay(deadlineDate) : null,
        });
      }
      return undefined;
    });
  }

  private initialDates(): { sentOn: Date | null; deadlineDate: Date | null } {
    const sentOn = today();
    const deadline = proposeDeadline(sentOn, this.data.deadlineDate, this.data.status.closed);
    return { sentOn: fromDay(sentOn), deadlineDate: deadline ? fromDay(deadline) : null };
  }
}
