import { Routes } from '@angular/router';

/** Routes de la feature, chargées à la demande sous `/import`. */
export const IMPORT_ROUTES: Routes = [
  {
    path: '',
    title: 'Import du classeur',
    loadComponent: () => import('./import-page/import-page').then((m) => m.ImportPage),
  },
];
