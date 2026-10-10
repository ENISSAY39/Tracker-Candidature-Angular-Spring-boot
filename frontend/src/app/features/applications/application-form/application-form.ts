import { Component, computed, inject, input, linkedSignal, numberAttribute } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  disabled,
  form,
  FormField,
  maxLength,
  required,
  submit,
  TreeValidationResult,
} from '@angular/forms/signals';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin, Observable } from 'rxjs';
import { openConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { fromDay, toDay } from '../../../shared/dates';
import { serverFieldErrors } from '../../../shared/server-errors';
import { groupByCategory, Status } from '../../../shared/status';
import { containsText, trimToNull } from '../../../shared/text';
import { JobApplication, JobApplicationRequest } from '../application';
import { ApplicationsApi } from '../applications-api';
import { FOLLOW_UP_DAYS, proposeDeadline } from '../deadline-proposal';

/** Valeurs du formulaire : textes en chaînes (vides si absents), dates en objets `Date` pour le datepicker. */
interface ApplicationFormModel {
  groupName: string;
  company: string;
  jobTitle: string;
  status: string;
  sentOn: Date | null;
  deadlineLabel: string;
  deadlineDate: Date | null;
  notes: string;
  startPeriod: string;
  channel: string;
  cvSent: string;
}

// Longueurs maximales des colonnes, comme les @Size du backend
const MAX_SHORT_TEXT_LENGTH = 100;
const MAX_TEXT_LENGTH = 255;

/**
 * Création (`/applications/new`) et modification (`/applications/:id/edit`) d'une candidature. Le numéro n'est jamais
 * saisi ; le serveur reste l'arbitre des règles, le formulaire les applique pour le confort.
 */
@Component({
  imports: [
    FormField,
    MatAutocompleteModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    RouterLink,
  ],
  selector: 'app-application-form',
  styleUrl: './application-form.scss',
  templateUrl: './application-form.html',
})
export class ApplicationForm {
  /** Identifiant lu dans l'URL en modification ; absent en création. */
  readonly id = input(undefined, {
    transform: (value: unknown) => (value === undefined ? undefined : numberAttribute(value)),
  });

  private readonly api = inject(ApplicationsApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly followUpDays = FOLLOW_UP_DAYS;

  /** Posé après un enregistrement réussi : quitter le formulaire ne demande alors plus de confirmation. */
  private saved = false;

  protected readonly options = rxResource({
    stream: () =>
      forkJoin({
        statuses: this.api.statuses(),
        groups: this.api.groups(),
        applications: this.api.list(),
      }),
  });

  protected readonly existing = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.api.get(id),
  });

  protected readonly model = linkedSignal<ApplicationFormModel>(() => {
    const application = this.existing.value();
    return application ? toModel(application) : EMPTY_MODEL;
  });

  protected readonly form = form(this.model, (path) => {
    required(path.groupName, { message: 'Le groupe est obligatoire.' });
    maxLength(path.groupName, MAX_SHORT_TEXT_LENGTH, {
      message: `${MAX_SHORT_TEXT_LENGTH} caractères au plus.`,
    });
    required(path.company, { message: 'L’entreprise est obligatoire.' });
    maxLength(path.company, MAX_TEXT_LENGTH, { message: `${MAX_TEXT_LENGTH} caractères au plus.` });
    required(path.jobTitle, { message: 'Le poste est obligatoire.' });
    maxLength(path.jobTitle, MAX_TEXT_LENGTH, {
      message: `${MAX_TEXT_LENGTH} caractères au plus.`,
    });
    required(path.status, { message: 'Le statut est obligatoire.' });
    required(path.sentOn, {
      message: 'La date d’envoi est obligatoire pour ce statut.',
      when: ({ valueOf }) => this.statusOf(valueOf(path.status))?.requiresSentOn ?? false,
    });
    // Statut clos : plus de prochaine étape, l'échéance ne serait pas conservée
    disabled(path.deadlineDate, ({ valueOf }) => this.isClosed(valueOf(path.status)));
    maxLength(path.deadlineLabel, MAX_TEXT_LENGTH, {
      message: `${MAX_TEXT_LENGTH} caractères au plus.`,
    });
    maxLength(path.startPeriod, MAX_SHORT_TEXT_LENGTH, {
      message: `${MAX_SHORT_TEXT_LENGTH} caractères au plus.`,
    });
    maxLength(path.channel, MAX_TEXT_LENGTH, { message: `${MAX_TEXT_LENGTH} caractères au plus.` });
    maxLength(path.cvSent, MAX_TEXT_LENGTH, { message: `${MAX_TEXT_LENGTH} caractères au plus.` });
  });

  protected readonly loading = computed(
    () => this.options.isLoading() || (this.id() !== undefined && this.existing.isLoading()),
  );

  protected readonly failed = computed(() => !!this.options.error() || !!this.existing.error());

  /** Statuts groupés par catégorie, dans l'ordre du classeur. */
  protected readonly statusGroups = computed(() =>
    groupByCategory(this.options.value()?.statuses ?? []),
  );

  protected readonly groupSuggestions = computed(() => {
    const typed = this.model().groupName;
    return (this.options.value()?.groups ?? [])
      .map((group) => group.name)
      .filter((name) => containsText(name, typed));
  });

  /** Canaux déjà utilisés, sans doublon, triés. */
  protected readonly channelSuggestions = computed(() => {
    const typed = this.model().channel;
    const channels = new Set(
      (this.options.value()?.applications ?? [])
        .map((application) => application.channel)
        .filter((channel): channel is string => channel !== null),
    );
    return [...channels]
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .filter((channel) => containsText(channel, typed));
  });

  /** Après la saisie de la date d'envoi, l'échéance vide est proposée à + 14 jours. */
  protected onSentOnChange(): void {
    const { sentOn, deadlineDate, status } = this.model();
    const proposed = proposeDeadline(
      sentOn ? toDay(sentOn) : null,
      deadlineDate ? toDay(deadlineDate) : null,
      this.isClosed(status),
    );
    this.form.deadlineDate().value.set(proposed ? fromDay(proposed) : null);
  }

  protected onStatusChange(): void {
    if (this.isClosed(this.model().status)) {
      this.form.deadlineDate().value.set(null);
    }
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, () => this.send());
  }

  /** Quitter sans enregistrer des modifications demande confirmation. */
  canLeave(): Observable<boolean> | boolean {
    if (this.saved || !this.form().dirty()) {
      return true;
    }
    return openConfirmDialog(this.dialog, {
      title: 'Quitter le formulaire',
      message: 'Les modifications non enregistrées seront perdues.',
      confirmLabel: 'Quitter',
    });
  }

  private async send(): Promise<TreeValidationResult> {
    const id = this.id();
    const request = toRequest(this.model());
    try {
      const saved = await firstValueFrom(
        id === undefined ? this.api.create(request) : this.api.update(id, request),
      );
      this.saved = true;
      const action = id === undefined ? 'créée' : 'modifiée';
      this.snackBar.open(`Candidature n° ${saved.number} ${action}.`, 'Fermer', { duration: 5000 });
      await this.router.navigate(['/applications', saved.id]);
      return undefined;
    } catch (error) {
      return serverFieldErrors(error, this.form);
    }
  }

  private statusOf(code: string): Status | undefined {
    return this.options.value()?.statuses.find((status) => status.code === code);
  }

  private isClosed(code: string): boolean {
    return this.statusOf(code)?.closed ?? false;
  }
}

const EMPTY_MODEL: ApplicationFormModel = {
  groupName: '',
  company: '',
  jobTitle: '',
  status: 'TO_SEND',
  sentOn: null,
  deadlineLabel: '',
  deadlineDate: null,
  notes: '',
  startPeriod: '',
  channel: '',
  cvSent: '',
};

function toModel(application: JobApplication): ApplicationFormModel {
  return {
    groupName: application.groupName,
    company: application.company,
    jobTitle: application.jobTitle,
    status: application.status,
    sentOn: application.sentOn ? fromDay(application.sentOn) : null,
    deadlineLabel: application.deadlineLabel ?? '',
    deadlineDate: application.deadlineDate ? fromDay(application.deadlineDate) : null,
    notes: application.notes ?? '',
    startPeriod: application.startPeriod ?? '',
    channel: application.channel ?? '',
    cvSent: application.cvSent ?? '',
  };
}

function toRequest(model: ApplicationFormModel): JobApplicationRequest {
  return {
    groupName: model.groupName.trim(),
    company: model.company.trim(),
    jobTitle: model.jobTitle.trim(),
    status: model.status,
    sentOn: model.sentOn ? toDay(model.sentOn) : null,
    deadlineLabel: trimToNull(model.deadlineLabel),
    deadlineDate: model.deadlineDate ? toDay(model.deadlineDate) : null,
    notes: trimToNull(model.notes),
    startPeriod: trimToNull(model.startPeriod),
    channel: trimToNull(model.channel),
    cvSent: trimToNull(model.cvSent),
  };
}
