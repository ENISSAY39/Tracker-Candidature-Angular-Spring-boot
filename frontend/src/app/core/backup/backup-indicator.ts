import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, interval, map, of, startWith, switchMap } from 'rxjs';
import { BackupApi } from './backup-api';
import { backupAlert, backupLabel } from './backup-status';

// L'appli peut rester ouverte plusieurs jours : l'état est relu, et l'ancienneté recalculée, toutes les heures
const REFRESH_MS = 60 * 60 * 1000;

/**
 * Date de la dernière sauvegarde dans la barre de titre, en alerte quand elle est trop ancienne ou qu'il n'y en
 * a aucune. Affichage seul : sauvegarder et restaurer restent des commandes.
 */
@Component({
  selector: 'app-backup-indicator',
  template: `{{ view()?.label }}`,
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
    // Région polie : un passage en alerte pendant que l'appli est ouverte est annoncé par les lecteurs d'écran
    role: 'status',
    '[class.alert]': 'view()?.alert',
  },
})
export class BackupIndicator {
  private readonly api = inject(BackupApi);

  protected readonly view = toSignal(
    interval(REFRESH_MS).pipe(
      startWith(0),
      // Une erreur est déjà affichée par l'intercepteur ; ici, l'état devient simplement inconnu
      switchMap(() => this.api.status().pipe(catchError(() => of(null)))),
      map((status) => {
        const now = new Date();
        return { label: backupLabel(status, now), alert: backupAlert(status, now) !== 'none' };
      }),
    ),
  );
}
