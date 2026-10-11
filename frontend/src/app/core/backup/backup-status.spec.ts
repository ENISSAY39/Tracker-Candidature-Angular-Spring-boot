import { BackupStatus, backupAlert, backupLabel, trackAlert } from './backup-status';

describe('backup status', () => {
  // Samedi 10 octobre 2026, 16:00, heure locale
  const now = new Date(2026, 9, 10, 16, 0);

  function backedUpAt(date: Date, lastAttemptFailed = false): BackupStatus {
    return {
      available: true,
      lastBackupAt: date.toISOString(),
      lastAttemptFailed,
      required: false,
    };
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
      expect(
        backupAlert(
          { available: true, lastBackupAt: null, lastAttemptFailed: false, required: false },
          now,
        ),
      ).toBe('missing');
    });

    it('is failed when the last attempt failed, whatever the age of the last backup', () => {
      expect(backupAlert(backedUpAt(new Date(2026, 9, 10, 15, 59), true), now)).toBe('failed');
      expect(backupAlert(backedUpAt(new Date(2026, 9, 7, 23, 17), true), now)).toBe('failed');
      expect(
        backupAlert(
          { available: true, lastBackupAt: null, lastAttemptFailed: true, required: false },
          now,
        ),
      ).toBe('failed');
    });

    it('is none when the folder is unavailable or the status unknown', () => {
      expect(
        backupAlert(
          { available: false, lastBackupAt: null, lastAttemptFailed: false, required: false },
          now,
        ),
      ).toBe('none');
      expect(backupAlert(null, now)).toBe('none');
    });

    it('is unreadable when the folder is unavailable but required, as in a container', () => {
      expect(
        backupAlert(
          { available: false, lastBackupAt: null, lastAttemptFailed: false, required: true },
          now,
        ),
      ).toBe('unreadable');
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

    it('says when the last attempt failed', () => {
      expect(backupLabel(backedUpAt(new Date(2026, 9, 9, 14, 32), true), now)).toBe(
        'Dernière sauvegarde : hier 14:32 (dernière tentative en échec)',
      );
      expect(backupLabel(backedUpAt(new Date(2026, 9, 7, 23, 17), true), now)).toBe(
        'Dernière sauvegarde : 07/10/2026 23:17 (plus de 48 h, dernière tentative en échec)',
      );
      expect(
        backupLabel(
          { available: true, lastBackupAt: null, lastAttemptFailed: true, required: false },
          now,
        ),
      ).toBe('Aucune sauvegarde (dernière tentative en échec)');
    });

    it('says so when there is no backup', () => {
      expect(
        backupLabel(
          { available: true, lastBackupAt: null, lastAttemptFailed: false, required: false },
          now,
        ),
      ).toBe('Aucune sauvegarde');
    });

    it('says so when the folder is unavailable or the status unknown', () => {
      expect(
        backupLabel(
          { available: false, lastBackupAt: null, lastAttemptFailed: false, required: false },
          now,
        ),
      ).toBe('Sauvegarde : état indisponible');
      expect(backupLabel(null, now)).toBe('Sauvegarde : état indisponible');
    });

    it('says the backups are unreadable when the folder is unavailable but required', () => {
      expect(
        backupLabel(
          { available: false, lastBackupAt: null, lastAttemptFailed: false, required: true },
          now,
        ),
      ).toBe('Sauvegardes illisibles');
    });
  });

  describe('trackAlert', () => {
    const start = { knownAlert: null, announcement: '' };
    const label = 'Aucune sauvegarde';

    it('announces nothing on the first reading, alert or not', () => {
      expect(trackAlert(start, { alert: false, label })).toEqual({
        knownAlert: false,
        announcement: '',
      });
      expect(trackAlert(start, { alert: true, label })).toEqual({
        knownAlert: true,
        announcement: '',
      });
    });

    it('announces the switch to alert, with its label', () => {
      expect(trackAlert({ knownAlert: false, announcement: '' }, { alert: true, label })).toEqual({
        knownAlert: true,
        announcement: 'Alerte sauvegarde : Aucune sauvegarde',
      });
    });

    it('announces the return to normal', () => {
      expect(
        trackAlert(
          { knownAlert: true, announcement: '' },
          { alert: false, label: 'Dernière sauvegarde : aujourd’hui 16:30' },
        ),
      ).toEqual({ knownAlert: false, announcement: 'Sauvegarde : retour à la normale' });
    });

    it('announces nothing while the alert state does not change', () => {
      expect(trackAlert({ knownAlert: false, announcement: '' }, { alert: false, label })).toEqual({
        knownAlert: false,
        announcement: '',
      });
      expect(trackAlert({ knownAlert: true, announcement: '' }, { alert: true, label })).toEqual({
        knownAlert: true,
        announcement: '',
      });
    });

    it('keeps the last known state and announces nothing when the status is unknown', () => {
      expect(trackAlert({ knownAlert: true, announcement: '' }, null)).toEqual({
        knownAlert: true,
        announcement: '',
      });
      expect(trackAlert(start, null)).toEqual({ knownAlert: null, announcement: '' });
    });
  });
});
