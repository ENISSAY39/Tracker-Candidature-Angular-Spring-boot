import { Routes } from '@angular/router';

/** Routes de la feature, chargées à la demande sous `/applications`. */
export const APPLICATIONS_ROUTES: Routes = [
  {
    path: '',
    title: 'Candidatures',
    loadComponent: () =>
      import('./applications-page/applications-page').then((m) => m.ApplicationsPage),
  },
  {
    path: ':id',
    title: 'Candidature',
    loadComponent: () =>
      import('./application-detail/application-detail').then((m) => m.ApplicationDetail),
  },
];
