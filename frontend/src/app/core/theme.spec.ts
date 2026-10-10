import { TestBed } from '@angular/core/testing';
import { Theme, THEME_STORAGE_KEY } from './theme';

describe('Theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.style.colorScheme = '';
  });

  it('follows the system when nothing was chosen', () => {
    const theme = TestBed.inject(Theme);

    expect(theme.mode()).toBe('system');
    expect(document.documentElement.style.colorScheme).toBe('light dark');
  });

  it('applies the chosen mode and remembers it', () => {
    const theme = TestBed.inject(Theme);

    theme.select('dark');

    expect(theme.mode()).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('restores the remembered mode', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    const theme = TestBed.inject(Theme);

    expect(theme.mode()).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('goes back to the system mode', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const theme = TestBed.inject(Theme);

    theme.select('system');

    expect(document.documentElement.style.colorScheme).toBe('light dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
  });

  it('ignores an unknown remembered value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');

    expect(TestBed.inject(Theme).mode()).toBe('system');
  });
});
