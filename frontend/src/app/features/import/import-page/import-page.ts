import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { filter, Observable, of, switchMap, tap } from 'rxjs';
import { openConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { ImportApi } from '../import-api';
import { ImportResult } from '../import-result';

/** Issue du dernier envoi. */
type Outcome =
  | { kind: 'imported'; result: ImportResult }
  | { kind: 'rejected'; message: string }
  | { kind: 'conflict' };

const FAILURE_MESSAGE = 'L’import a échoué.';
const TOO_LARGE_MESSAGE = 'Le fichier dépasse la taille maximale autorisée (10 Mo).';

/**
 * Envoi du classeur : choix du fichier, remplacement éventuel des données (confirmé), puis nombre de lignes créées,
 * ou motif du rejet tel que le serveur le donne (feuille et ligne).
 */
@Component({
  imports: [MatButtonModule, MatCheckboxModule, MatProgressBarModule, RouterLink],
  selector: 'app-import-page',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
      max-width: 48rem;
    }

    .file {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
    }

    mat-progress-bar {
      width: 100%;
    }

    .outcome:focus {
      outline: none;
    }

    .rejected {
      color: var(--mat-sys-error);
    }
  `,
  template: `
    <h1>Import du classeur</h1>
    <p>
      Le classeur est importé en entier ou pas du tout : à la moindre anomalie, rien n’est écrit et
      le motif cite la feuille et la ligne à corriger.
    </p>

    <div class="file">
      <input #fileInput type="file" accept=".xlsx" hidden (change)="onFileChange($event)" />
      <button mat-stroked-button type="button" [disabled]="sending()" (click)="fileInput.click()">
        Choisir le classeur
      </button>
      <span aria-live="polite">{{ file()?.name ?? 'Aucun fichier choisi (.xlsx)' }}</span>
    </div>

    <mat-checkbox
      [checked]="replace()"
      [disabled]="sending()"
      (change)="replace.set($event.checked)"
    >
      Remplacer les données existantes
    </mat-checkbox>

    <button
      mat-flat-button
      type="button"
      [disabled]="file() === null || sending()"
      (click)="send()"
    >
      Importer
    </button>

    @if (sending()) {
      <mat-progress-bar mode="indeterminate" aria-label="Import en cours" />
    }

    <!-- Région annoncée en permanence : le résultat qui s'y affiche est lu, et reçoit le focus -->
    <div #outcomeRegion class="outcome" tabindex="-1" aria-live="polite">
      @if (imported(); as result) {
        <div class="result">
          <p>
            Import terminé : {{ count(result.companyGroups, 'groupe', 'groupes') }},
            {{ count(result.jobApplications, 'candidature', 'candidatures') }} et
            {{ count(result.jobLeads, 'piste', 'pistes') }} créés.
          </p>
          <a mat-button routerLink="/applications">Voir les candidatures</a>
        </div>
      } @else if (rejection(); as message) {
        <p class="rejected" role="alert">{{ message }}</p>
      } @else if (outcome()?.kind === 'conflict') {
        <p role="alert">
          La base contient déjà des candidatures : l’import est refusé pour ne rien écraser par
          mégarde. Pour recharger le classeur, remplacez les données existantes.
        </p>
        <button
          mat-stroked-button
          type="button"
          [disabled]="sending()"
          (click)="replaceAfterConflict()"
        >
          Remplacer les données
        </button>
      }
    </div>
  `,
})
export class ImportPage {
  private readonly api = inject(ImportApi);
  private readonly dialog = inject(MatDialog);
  private readonly injector = inject(Injector);
  private readonly outcomeRegion = viewChild<ElementRef<HTMLElement>>('outcomeRegion');

  protected readonly file = signal<File | null>(null);
  protected readonly replace = signal(false);
  protected readonly sending = signal(false);
  protected readonly outcome = signal<Outcome | null>(null);

  protected onFileChange(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    this.file.set(files?.[0] ?? null);
    this.outcome.set(null);
  }

  protected send(replace = this.replace()): void {
    const file = this.file();
    if (file === null) {
      return;
    }
    this.confirmed(replace)
      .pipe(
        filter(Boolean),
        tap(() => this.sending.set(true)),
        switchMap(() => this.api.importWorkbook(file, replace)),
      )
      .subscribe({
        next: (result) => this.finish({ kind: 'imported', result }),
        error: (error: unknown) => this.finish(outcomeOf(error)),
      });
  }

  /** Après un refus pour base déjà remplie : le même envoi, en remplacement, toujours confirmé. */
  protected replaceAfterConflict(): void {
    this.send(true);
  }

  protected readonly imported = computed(() => {
    const outcome = this.outcome();
    return outcome?.kind === 'imported' ? outcome.result : undefined;
  });

  protected readonly rejection = computed(() => {
    const outcome = this.outcome();
    return outcome?.kind === 'rejected' ? outcome.message : undefined;
  });

  protected count(value: number, singular: string, plural: string): string {
    return `${value} ${value > 1 ? plural : singular}`;
  }

  private confirmed(replace: boolean): Observable<boolean> {
    return replace
      ? openConfirmDialog(this.dialog, {
          title: 'Remplacer les données',
          message:
            'Toutes les candidatures, pistes et groupes actuels seront supprimés puis remplacés par ceux du ' +
            'classeur. Rien n’est effacé si le classeur est refusé. Lancez d’abord une sauvegarde : ' +
            'docker compose exec backup backup-now',
          confirmLabel: 'Remplacer',
        })
      : of(true);
  }

  /** Le bouton qui avait le focus peut avoir disparu : le focus passe au résultat. */
  private finish(outcome: Outcome): void {
    this.sending.set(false);
    this.outcome.set(outcome);
    afterNextRender(() => this.outcomeRegion()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }
}

/**
 * 409 : base déjà remplie. 413 : fichier trop gros, refusé par nginx en conteneurs (réponse sans `ProblemDetail`).
 * Sinon le `detail` du serveur (feuille et ligne pour un rejet), ou un message générique.
 */
function outcomeOf(error: unknown): Outcome {
  if (error instanceof HttpErrorResponse && error.status === 409) {
    return { kind: 'conflict' };
  }
  if (error instanceof HttpErrorResponse && error.status === 413) {
    return { kind: 'rejected', message: TOO_LARGE_MESSAGE };
  }
  const detail: unknown =
    error instanceof HttpErrorResponse
      ? (error.error as { detail?: unknown } | null)?.detail
      : null;
  return {
    kind: 'rejected',
    message: typeof detail === 'string' && detail !== '' ? detail : FAILURE_MESSAGE,
  };
}
