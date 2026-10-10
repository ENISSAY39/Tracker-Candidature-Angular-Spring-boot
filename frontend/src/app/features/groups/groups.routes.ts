import { Routes } from '@angular/router';

/** Routes de la feature, chargées à la demande sous `/groups`. */
export const GROUPS_ROUTES: Routes = [
  {
    path: '',
    title: 'Groupes',
    loadComponent: () => import('./groups-page/groups-page').then((m) => m.GroupsPage),
  },
  {
    path: ':id',
    title: 'Groupe',
    loadComponent: () => import('./group-page/group-page').then((m) => m.GroupPage),
  },
];
