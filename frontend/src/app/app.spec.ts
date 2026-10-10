import { formatDate } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { Router } from '@angular/router';
import { App } from './app';
import { appConfig } from './app.config';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: appConfig.providers,
    }).compileComponents();
  });

  async function renderAt(url: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the application title and the navigation in French', async () => {
    const page = await renderAt('/applications');

    expect(page.querySelector('mat-toolbar')?.textContent).toContain('Tracker de candidatures');
    const link = page.querySelector<HTMLAnchorElement>('nav a[href="/applications"]');
    expect(link?.textContent?.trim()).toBe('Candidatures');
  });

  it('offers the groups in the navigation and opens their list', async () => {
    const page = await renderAt('/groups');

    const link = page.querySelector<HTMLAnchorElement>('nav a[href="/groups"]');
    expect(link?.textContent?.trim()).toBe('Groupes');
    expect(link?.getAttribute('aria-current')).toBe('page');
    expect(page.querySelector('h1')?.textContent).toContain('Groupes');
  });

  it('offers the leads in the navigation and opens their page', async () => {
    const page = await renderAt('/leads');

    const link = page.querySelector<HTMLAnchorElement>('nav a[href="/leads"]');
    expect(link?.textContent?.trim()).toBe('Pistes');
    expect(link?.getAttribute('aria-current')).toBe('page');
    expect(page.querySelector('h1')?.textContent).toContain('Pistes');
  });

  it('offers the import in the navigation and opens its page', async () => {
    const page = await renderAt('/import');

    const link = page.querySelector<HTMLAnchorElement>('nav a[href="/import"]');
    expect(link?.textContent?.trim()).toBe('Import');
    expect(link?.getAttribute('aria-current')).toBe('page');
    expect(page.querySelector('h1')?.textContent).toContain('Import du classeur');
  });

  it('marks the navigation entry of the current page as active', async () => {
    const page = await renderAt('/applications');

    const link = page.querySelector('nav a[href="/applications"]');
    expect(link?.getAttribute('aria-current')).toBe('page');
  });

  it.each(['/', '/route-inconnue'])('redirects %s to the applications page', async (url) => {
    const page = await renderAt(url);

    expect(TestBed.inject(Router).url).toBe('/applications');
    expect(page.querySelector('h1')?.textContent).toContain('Candidatures');
  });

  it('formats dates in French for pipes and for Material', () => {
    const locale = TestBed.inject(LOCALE_ID);

    expect(locale).toBe('fr-FR');
    expect(formatDate('2026-10-04', 'shortDate', locale)).toBe('04/10/2026');
    expect(formatDate('2026-10-04', 'longDate', locale)).toBe('4 octobre 2026');
    expect(TestBed.inject(MAT_DATE_LOCALE)).toBe('fr-FR');
  });

  it('reads and writes Material dates as dd/MM/yyyy', () => {
    const adapter = TestBed.inject<DateAdapter<Date>>(DateAdapter);
    const formats = TestBed.inject(MAT_DATE_FORMATS);

    expect(adapter.parse('04/10/2026', formats.parse.dateInput)).toEqual(new Date(2026, 9, 4));
    expect(adapter.format(new Date(2026, 9, 4), formats.display.dateInput)).toBe('04/10/2026');
  });

  it('rejects a typed date that does not exist', () => {
    const adapter = TestBed.inject<DateAdapter<Date>>(DateAdapter);
    const formats = TestBed.inject(MAT_DATE_FORMATS);

    const parsed = adapter.parse('31/02/2026', formats.parse.dateInput);

    expect(adapter.isValid(parsed as Date)).toBe(false);
  });
});
