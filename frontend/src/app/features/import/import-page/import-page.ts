import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
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
      <input
        #fileInput
        type="file"
        accept=".xlsx"
        hidden
        aria-label="Classeur Excel"
        (change)="onFileChange($event)"
      />
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

    @switch (outcome()?.kind) {
      @case ('imported') {
        @let result = imported()!;
        <div class="result" role="status">
          <p>
            Import terminé : {{ count(result.companyGroups, 'groupe', 'groupes') }},
            {{ count(result.jobApplications, 'candidature', 'candidatures') }} et
            {{ count(result.jobLeads, 'piste', 'pistes') }} créés.
          </p>
          <a mat-button routerLink="/applications">Voir les candidatures</a>
        </div>
      }
      @case ('rejected') {
        <p class="rejected" role="alert">{{ rejection() }}</p>
      }
      @case ('conflict') {
        <div role="alert">
          <p>
            La base contient déjà des candidatures : l’import est refusé pour ne rien écraser par
            mégarde. Pour recharger le classeur, remplacez les données existantes.
          </p>
        </div>
        <button mat-stroked-button type="button" (click)="replaceAfterConflict()">
          Remplacer les données
        </button>
      }
    }
  `,
})
export class ImportPage {
  private readonly api = inject(ImportApi);
  private readonly dialog = inject(MatDialog);

  protected readonly file = signal<File | null>(null);
  protected readonly replace = signal(false);
  protected readonly sending = signal(false);
  protected readonly outcome = signal<Outcome | null>(null);

  protected onFileChange(event: Event): void {
    const files = (event.target as HTMLInputElement).files;
    this.file.set(files?.[0] ?? null);
    this.outcome.set(null);
  }

  protected send(): void {
    const file = this.file();
    if (file === null) {
      return;
    }
    const replace = this.replace();
    this.confirmed(replace)
      .pipe(
        filter(Boolean),
        tap(() => {
          this.sending.set(true);
          this.outcome.set(null);
        }),
        switchMap(() => this.api.importWorkbook(file, replace)),
      )
      .subscribe({
        next: (result) => this.finish({ kind: 'imported', result }),
        error: (error: unknown) => this.finish(failure(error)),
      });
  }

  /** Après un refus pour base déjà remplie : la même demande, en remplacement (toujours confirmé). */
  protected replaceAfterConflict(): void {
    this.replace.set(true);
    this.send();
  }

  protected imported(): ImportResult | undefined {
    const outcome = this.outcome();
    return outcome?.kind === 'imported' ? outcome.result : undefined;
  }

  protected rejection(): string {
    const outcome = this.outcome();
    return outcome?.kind === 'rejected' ? outcome.message : '';
  }

  protected count(value: number, singular: string, plural: string): string {
    return `${value} ${value > 1 ? plural : singular}`;
  }

  private confirmed(replace: boolean): Observable<boolean> {
    return replace
      ? openConfirmDialog(this.dialog, {
          title: 'Remplacer les données',
          message:
            'Toutes les candidatures, pistes et groupes actuels seront supprimés puis remplacés par ceux du ' +
            'classeur. Rien n’est effacé si le classeur est refusé.',
          confirmLabel: 'Remplacer',
        })
      : of(true);
  }

  private finish(outcome: Outcome): void {
    this.sending.set(false);
    this.outcome.set(outcome);
  }
}

/** 409 : base déjà remplie ; sinon le `detail` du serveur (feuille et ligne pour un rejet), ou un message générique. */
function failure(error: unknown): Outcome {
  if (error instanceof HttpErrorResponse && error.status === 409) {
    return { kind: 'conflict' };
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
