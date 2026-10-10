import { Component, computed, inject, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { groupByCategory, Status } from '../../../shared/status';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { JobApplication } from '../application';
import { StatusChanger } from '../status-changer';

/** Badge de statut qui ouvre le menu des statuts groupés par catégorie, pour en changer en deux clics. */
@Component({
  imports: [MatMenuModule, NgTemplateOutlet, StatusBadge],
  selector: 'app-status-menu',
  template: `
    @if (current(); as status) {
      <button
        type="button"
        class="trigger"
        [matMenuTriggerFor]="menu"
        [attr.aria-label]="status.label + ', changer le statut'"
      >
        <app-status-badge [status]="status" />
      </button>
    }
    <mat-menu #menu="matMenu">
      @for (group of groups(); track group.category.code) {
        <!-- Groupe nommé seulement si la catégorie regroupe plusieurs statuts (sinon il répéterait le libellé) -->
        @if (group.statuses.length > 1) {
          <div role="group" [attr.aria-label]="group.category.label">
            <div class="status-menu-category" aria-hidden="true">{{ group.category.label }}</div>
            @for (status of group.statuses; track status.code) {
              <ng-container
                [ngTemplateOutlet]="item"
                [ngTemplateOutletContext]="{ $implicit: status }"
              />
            }
          </div>
        } @else {
          <ng-container
            [ngTemplateOutlet]="item"
            [ngTemplateOutletContext]="{ $implicit: group.statuses[0] }"
          />
        }
      }
      <ng-template #item let-status>
        <button
          mat-menu-item
          type="button"
          [disabled]="status.code === application().status"
          (click)="choose(status)"
        >
          {{ status.label }}
        </button>
      </ng-template>
    </mat-menu>
  `,
  styles: `
    .trigger {
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
      border-radius: 1rem;
    }

    .status-menu-category {
      padding: 0.5rem 1rem 0.25rem;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-medium);
    }
  `,
})
export class StatusMenu {
  readonly application = input.required<JobApplication>();
  readonly statuses = input.required<Status[]>();
  /** Candidature à jour, telle que renvoyée par le serveur. */
  readonly changed = output<JobApplication>();

  private readonly changer = inject(StatusChanger);

  protected readonly current = computed(() =>
    this.statuses().find((status) => status.code === this.application().status),
  );

  protected readonly groups = computed(() => groupByCategory(this.statuses()));

  protected choose(status: Status): void {
    this.changer.change(this.application(), status).subscribe({
      next: (updated) => this.changed.emit(updated),
      // Échec déjà affiché par l'intercepteur : le statut reste inchangé
      error: () => undefined,
    });
  }
}
