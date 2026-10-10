import { Routes } from '@angular/router';
import { leaveApplicationForm } from './application-form/leave-application-form';

/** Routes de la feature, chargées à la demande sous `/applications`. */
export const APPLICATIONS_ROUTES: Routes = [
  {
    path: '',
    title: 'Candidatures',
    loadComponent: () =>
      import('./applications-page/applications-page').then((m) => m.ApplicationsPage),
  },
  // « new » avant « :id », sinon il serait lu comme un identifiant
  {
    path: 'new',
    title: 'Nouvelle candidature',
    loadComponent: () =>
      import('./application-form/application-form').then((m) => m.ApplicationForm),
    canDeactivate: [leaveApplicationForm],
  },
  {
    path: ':id',
    title: 'Candidature',
    loadComponent: () =>
      import('./application-detail/application-detail').then((m) => m.ApplicationDetail),
  },
  {
    path: ':id/edit',
    title: 'Modifier la candidature',
    loadComponent: () =>
      import('./application-form/application-form').then((m) => m.ApplicationForm),
    canDeactivate: [leaveApplicationForm],
  },
];
