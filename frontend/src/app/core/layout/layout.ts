import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Coquille de l'application : barre de titre avec la navigation, puis le contenu de la page.
 */
@Component({
  imports: [MatButtonModule, MatToolbarModule, RouterLink, RouterLinkActive],
  selector: 'app-layout',
  styleUrl: './layout.scss',
  templateUrl: './layout.html',
})
export class Layout {
  protected readonly links = [
    { path: '/applications', label: 'Candidatures' },
    { path: '/groups', label: 'Groupes' },
    { path: '/leads', label: 'Pistes' },
    { path: '/import', label: 'Import' },
  ];
}
