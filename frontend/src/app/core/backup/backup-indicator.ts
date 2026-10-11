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
  startWith,
  switchMap,
} from 'rxjs';
import { BackupApi } from './backup-api';
import { backupAlert, backupAnnouncement, backupLabel } from './backup-status';

// L'appli peut rester ouverte plusieurs jours : l'état est relu, et l'ancienneté recalculée, toutes les heures
const REFRESH_MS = 60 * 60 * 1000;

interface Reading {
  label: string;
  alert: boolean;
}

interface View extends Reading {
  /** Texte de la région annoncée aux lecteurs d'écran ; vide tant qu'aucun changement d'état n'a eu lieu. */
  announcement: string;
}

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
    ><span class="cdk-visually-hidden" role="status">{{ view()?.announcement }}</span>`,
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

  protected readonly view = toSignal(
    merge(interval(REFRESH_MS), this.tabVisible$).pipe(
      startWith(0),
      // Une erreur est déjà affichée par l'intercepteur ; ici, l'état devient simplement inconnu
      switchMap(() => this.api.status().pipe(catchError(() => of(null)))),
      map((status): Reading => {
        const now = new Date();
        return { label: backupLabel(status, now), alert: backupAlert(status, now) !== 'none' };
      }),
      scan(
        (previous: View | null, reading): View => ({
          ...reading,
          // Une lecture sans changement d'état laisse l'annonce déjà faite en place : rien de nouveau à lire
          announcement:
            backupAnnouncement(previous?.alert ?? null, reading.alert, reading.label) ??
            previous?.announcement ??
            '',
        }),
        null,
      ),
    ),
  );
}
