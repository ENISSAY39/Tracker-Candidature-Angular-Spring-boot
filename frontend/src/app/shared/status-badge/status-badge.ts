import { Component, computed, input } from '@angular/core';
import { Status, StatusCategoryCode } from '../status';

interface BadgeColors {
  background: string;
  text: string;
}

// Palette du classeur par catégorie, contraste WCAG AA vérifié (≥ 4,5:1). Seules couleurs codées en dur.
const PALETTE: Record<StatusCategoryCode, BadgeColors> = {
  OFFER: { background: '#C6EFCE', text: '#006100' },
  INTERVIEW: { background: '#BDD7EE', text: '#1F4E79' },
  OPENED: { background: '#FFD966', text: '#6B5000' },
  PENDING: { background: '#FFF2CC', text: '#7F6000' },
  TO_SEND: { background: '#EDEDED', text: '#404040' },
  REJECTED: { background: '#FFC7CE', text: '#9C0006' },
  WITHDRAWN: { background: '#D9D9D9', text: '#595959' },
};

/** Libellé d'un statut, aux couleurs de sa catégorie. */
@Component({
  selector: 'app-status-badge',
  template: `{{ status().label }}`,
  styles: `
    :host {
      display: inline-block;
      padding: 0.125rem 0.625rem;
      border-radius: 1rem;
      font: var(--mat-sys-label-medium);
      white-space: nowrap;
    }
  `,
  host: {
    '[style.background-color]': 'colors().background',
    '[style.color]': 'colors().text',
  },
})
export class StatusBadge {
  readonly status = input.required<Status>();

  protected readonly colors = computed(() => PALETTE[this.status().category.code]);
}
