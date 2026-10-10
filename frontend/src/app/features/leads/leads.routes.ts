import { Routes } from '@angular/router';

/** Routes de la feature, chargées à la demande sous `/leads`. */
export const LEADS_ROUTES: Routes = [
  {
    path: '',
    title: 'Pistes',
    loadComponent: () => import('./leads-page/leads-page').then((m) => m.LeadsPage),
  },
];
