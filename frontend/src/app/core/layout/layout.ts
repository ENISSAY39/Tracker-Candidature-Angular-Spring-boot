import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Theme, ThemeMode } from '../theme';

/**
 * Coquille de l'application : barre de titre avec la navigation et le choix du thème, puis le contenu de la page.
 */
@Component({
  imports: [MatButtonModule, MatMenuModule, MatToolbarModule, RouterLink, RouterLinkActive],
  selector: 'app-layout',
  styleUrl: './layout.scss',
  templateUrl: './layout.html',
})
export class Layout {
  protected readonly theme = inject(Theme);

  protected readonly links = [
    { path: '/applications', label: 'Candidatures' },
    { path: '/groups', label: 'Groupes' },
    { path: '/leads', label: 'Pistes' },
    { path: '/import', label: 'Import' },
  ];

  protected readonly themeModes: { mode: ThemeMode; label: string }[] = [
    { mode: 'system', label: 'Système' },
    { mode: 'light', label: 'Clair' },
    { mode: 'dark', label: 'Sombre' },
  ];

  protected readonly themeLabel = computed(
    () => this.themeModes.find(({ mode }) => mode === this.theme.mode())?.label,
  );
}
