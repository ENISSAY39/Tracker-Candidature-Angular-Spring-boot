import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'applications',
    loadChildren: () =>
      import('./features/applications/applications.routes').then((m) => m.APPLICATIONS_ROUTES),
  },
  { path: '', pathMatch: 'full', redirectTo: 'applications' },
  { path: '**', redirectTo: 'applications' },
];
