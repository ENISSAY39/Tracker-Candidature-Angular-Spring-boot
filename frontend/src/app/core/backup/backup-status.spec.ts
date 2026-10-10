import { BackupStatus, backupAlert, backupLabel } from './backup-status';

describe('backup status', () => {
  // Samedi 10 octobre 2026, 16:00, heure locale
  const now = new Date(2026, 9, 10, 16, 0);

  function backedUpAt(date: Date): BackupStatus {
    return { available: true, lastBackupAt: date.toISOString() };
  }

  describe('backupAlert', () => {
    it('is none for a backup of at most 48 hours', () => {
      expect(backupAlert(backedUpAt(new Date(2026, 9, 10, 15, 59)), now)).toBe('none');
      expect(backupAlert(backedUpAt(new Date(2026, 9, 8, 16, 0)), now)).toBe('none');
    });

    it('is stale beyond 48 hours', () => {
      expect(backupAlert(backedUpAt(new Date(2026, 9, 8, 15, 59)), now)).toBe('stale');
      expect(backupAlert(backedUpAt(new Date(2026, 8, 1, 9, 0)), now)).toBe('stale');
    });

    it('is missing when the folder holds no backup', () => {
      expect(backupAlert({ available: true, lastBackupAt: null }, now)).toBe('missing');
    });

    it('is none when the folder is unavailable or the status unknown', () => {
      expect(backupAlert({ available: false, lastBackupAt: null }, now)).toBe('none');
      expect(backupAlert(null, now)).toBe('none');
    });
  });

  describe('backupLabel', () => {
    it('gives the time of a backup made today', () => {
      expect(backupLabel(backedUpAt(new Date(2026, 9, 10, 9, 5)), now)).toBe(
        'Dernière sauvegarde : aujourd’hui 09:05',
      );
    });

    it('gives the time of a backup made yesterday', () => {
      expect(backupLabel(backedUpAt(new Date(2026, 9, 9, 14, 32)), now)).toBe(
        'Dernière sauvegarde : hier 14:32',
      );
    });

    it('gives the date of an older backup and says when it is too old', () => {
      expect(backupLabel(backedUpAt(new Date(2026, 9, 8, 16, 0)), now)).toBe(
        'Dernière sauvegarde : 08/10/2026 16:00',
      );
      expect(backupLabel(backedUpAt(new Date(2026, 9, 7, 23, 17)), now)).toBe(
        'Dernière sauvegarde : 07/10/2026 23:17 (plus de 48 h)',
      );
    });

    it('says so when there is no backup', () => {
      expect(backupLabel({ available: true, lastBackupAt: null }, now)).toBe('Aucune sauvegarde');
    });

    it('says so when the folder is unavailable or the status unknown', () => {
      expect(backupLabel({ available: false, lastBackupAt: null }, now)).toBe(
        'Sauvegarde : état indisponible',
      );
      expect(backupLabel(null, now)).toBe('Sauvegarde : état indisponible');
    });
  });
});
