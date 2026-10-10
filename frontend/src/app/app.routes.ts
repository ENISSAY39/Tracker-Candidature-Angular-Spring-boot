import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'applications',
    title: 'Candidatures',
    loadComponent: () =>
      import('./features/applications/applications-page/applications-page').then(
        (m) => m.ApplicationsPage,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'applications' },
  { path: '**', redirectTo: 'applications' },
];
