import { DOCUMENT } from '@angular/common';
import { inject, Service, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

/** Clé du navigateur où le choix est gardé ; aussi lue par le script de `index.html`. */
export const THEME_STORAGE_KEY = 'tracker.theme';

// Valeur CSS `color-scheme` de chaque mode : les couleurs Material (`light-dark()`) la suivent
const COLOR_SCHEMES: Record<ThemeMode, string> = {
  system: 'light dark',
  light: 'light',
  dark: 'dark',
};

/** Thème de l'interface : celui du système, clair ou sombre ; le choix est gardé dans le navigateur. */
@Service()
export class Theme {
  private readonly document = inject(DOCUMENT);
  private readonly storage = this.document.defaultView?.localStorage;

  private readonly current = signal<ThemeMode>(this.stored());
  readonly mode = this.current.asReadonly();

  constructor() {
    this.apply(this.current());
  }

  select(mode: ThemeMode): void {
    this.current.set(mode);
    this.apply(mode);
    try {
      this.storage?.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Stockage refusé par le navigateur : le choix vaut pour la session en cours
    }
  }

  private apply(mode: ThemeMode): void {
    this.document.documentElement.style.colorScheme = COLOR_SCHEMES[mode];
  }

  private stored(): ThemeMode {
    try {
      const value = this.storage?.getItem(THEME_STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : 'system';
    } catch {
      return 'system';
    }
  }
}
