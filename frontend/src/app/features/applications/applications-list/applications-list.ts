import { Component, computed, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { today } from '../../../shared/dates';
import { Status, StatusCategory } from '../../../shared/status';
import { JobApplication } from '../application';
import { ApplicationCounter, countApplications } from '../application-counters';
import {
  ApplicationFilter,
  filterApplications,
  NO_FILTER,
  StatusChoice,
} from '../application-filter';
import { ApplicationsTable } from '../applications-table/applications-table';

interface StatusOption {
  label: string;
  choice: StatusChoice;
}

interface StatusOptionGroup {
  category: StatusCategory;
  options: StatusOption[];
}

/**
 * Liste des candidatures reçues en entrée : compteurs (périmètre complet, avant filtres), filtres, puis table.
 */
@Component({
  imports: [
    ApplicationsTable,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  selector: 'app-applications-list',
  styleUrl: './applications-list.scss',
  templateUrl: './applications-list.html',
})
export class ApplicationsList {
  readonly applications = input.required<JobApplication[]>();
  readonly statuses = input.required<Status[]>();
  /** Masqué sur la page d'un groupe, où toutes les candidatures ont le même groupe. */
  readonly showGroupFilter = input(true);

  /** Jour de référence du filtre d'échéance, lu une fois à l'affichage. */
  private readonly today = today();

  protected readonly filter = signal<ApplicationFilter>(NO_FILTER);

  protected readonly counters = computed(() =>
    countApplications(this.applications(), this.statuses()),
  );

  protected readonly rows = computed(() =>
    filterApplications(this.applications(), this.statuses(), this.filter(), this.today),
  );

  protected readonly isFiltered = computed(() => this.filter() !== NO_FILTER);

  /** Une entrée par catégorie (dans l'ordre), puis ses statuts ; la catégorie entière si elle en a plusieurs. */
  protected readonly statusGroups = computed(() => {
    const groups = new Map<string, StatusOptionGroup>();
    for (const status of this.statuses()) {
      const group = groups.get(status.category.code) ?? { category: status.category, options: [] };
      group.options.push({ label: status.label, choice: { kind: 'status', code: status.code } });
      groups.set(status.category.code, group);
    }
    return [...groups.values()].map((group) =>
      group.options.length > 1
        ? {
            ...group,
            options: [
              {
                label: 'Toute la catégorie',
                choice: { kind: 'category', code: group.category.code } as StatusChoice,
              },
              ...group.options,
            ],
          }
        : group,
    );
  });

  /** Groupes présents dans la liste, par nom. */
  protected readonly groups = computed(() => {
    const names = new Map(this.applications().map((a) => [a.groupId, a.groupName]));
    return [...names]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  });

  protected readonly sameChoice = (a: StatusChoice | null, b: StatusChoice | null): boolean =>
    a?.kind === b?.kind && a?.code === b?.code;

  protected update(change: Partial<ApplicationFilter>): void {
    this.filter.update((filter) => ({ ...filter, ...change }));
  }

  protected onSearch(event: Event): void {
    this.update({ text: (event.target as HTMLInputElement).value });
  }

  protected clear(): void {
    this.filter.set(NO_FILTER);
  }

  protected isSelected(counter: ApplicationCounter): boolean {
    const choice = this.filter().statusChoice;
    return counter.category === null
      ? choice === null
      : choice?.kind === 'category' && choice.code === counter.category;
  }

  /** Un compteur filtre sur sa catégorie ; « Total », ou un compteur déjà actif, retire ce filtre. */
  protected selectCounter(counter: ApplicationCounter): void {
    const choice: StatusChoice | null =
      counter.category === null || this.isSelected(counter)
        ? null
        : { kind: 'category', code: counter.category };
    this.update({ statusChoice: choice });
  }
}
