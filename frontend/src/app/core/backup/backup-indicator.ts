import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  filter,
  fromEvent,
  interval,
  map,
  merge,
  of,
  scan,
  shareReplay,
  startWith,
  switchMap,
  timer,
} from 'rxjs';
import { BackupApi } from './backup-api';
import { AlertTracking, backupAlert, backupLabel, trackAlert } from './backup-status';

// L'appli peut rester ouverte plusieurs jours : l'état est relu, et l'ancienneté recalculée, toutes les heures
const REFRESH_MS = 60 * 60 * 1000;

// Le temps de laisser les lecteurs d'écran lire l'annonce : vidée ensuite, elle ne s'ajoute pas au libellé en navigation
const ANNOUNCEMENT_MS = 5000;

/** Ce que l'indicateur affiche après une lecture, avec le suivi de l'alerte qui décide de l'annonce. */
interface View extends AlertTracking {
  label: string;
  alert: boolean;
}

const BEFORE_FIRST_READING: View = { label: '', alert: false, knownAlert: null, announcement: '' };

/**
 * Date de la dernière sauvegarde dans la barre de titre, en alerte quand elle est trop ancienne, qu'il n'y en a
 * aucune, que la dernière tentative a échoué ou que le dossier requis est illisible. Affichage seul : sauvegarder
 * et restaurer restent des commandes.
 *
 * Le libellé est du texte lisible à la navigation, sans région annoncée : les lecteurs d'écran n'entendent que le
 * passage en alerte et le retour à la normale, dans une région à part, jamais le libellé au chargement.
 */
@Component({
  selector: 'app-backup-indicator',
  template: `<span class="label">{{ view()?.label }}</span
    ><span class="cdk-visually-hidden" role="status">{{ announcement() }}</span>`,
  styles: `
    :host {
      font: var(--mat-sys-body-medium);
      white-space: nowrap;
    }

    :host(.alert) {
      padding: 0.25rem 0.75rem;
      border-radius: var(--mat-sys-corner-full);
      background-color: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      font-weight: 500;
    }
  `,
  host: {
    '[class.alert]': 'view()?.alert',
  },
})
export class BackupIndicator {
  private readonly api = inject(BackupApi);
  private readonly document = inject(DOCUMENT);

  // Le retour de veille ou le changement de jour passent par ici : l'onglet redevient visible
  private readonly tabVisible$ = fromEvent(this.document, 'visibilitychange').pipe(
    filter(() => this.document.visibilityState === 'visible'),
  );

  private readonly views$ = merge(interval(REFRESH_MS), this.tabVisible$).pipe(
    startWith(0),
    // Une erreur est déjà affichée par l'intercepteur ; ici, l'état devient simplement inconnu
    switchMap(() => this.api.status().pipe(catchError(() => of(null)))),
    map((status) => {
      const now = new Date();
      return {
        label: backupLabel(status, now),
        alert: backupAlert(status, now) !== 'none',
        known: status !== null,
      };
    }),
    scan(
      (previous: View, reading): View => ({
        label: reading.label,
        alert: reading.alert,
        ...trackAlert(previous, reading.known ? reading : null),
      }),
      BEFORE_FIRST_READING,
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  protected readonly view = toSignal(this.views$);

  // Chaque annonce est lue puis retirée : la région redevient vide, comme avant le premier changement d'état
  protected readonly announcement = toSignal(
    this.views$.pipe(
      filter((view) => view.announcement !== ''),
      switchMap((view) =>
        timer(ANNOUNCEMENT_MS).pipe(
          map(() => ''),
          startWith(view.announcement),
        ),
      ),
    ),
    { initialValue: '' },
  );
}
