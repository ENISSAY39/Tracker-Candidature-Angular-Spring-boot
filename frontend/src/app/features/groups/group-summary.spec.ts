import { replaceGroup, summarizeGroups } from './group-summary';

describe('summarizeGroups', () => {
  const groups = [
    { id: 2, name: 'Groupe Alpha' },
    { id: 3, name: 'Groupe Bêta' },
    { id: 1, name: 'Groupe Fictif' },
  ];

  it('counts the applications of each group', () => {
    const applications = [{ groupId: 1 }, { groupId: 2 }, { groupId: 1 }, { groupId: 1 }];

    expect(summarizeGroups(groups, applications)).toEqual([
      { id: 2, name: 'Groupe Alpha', applicationCount: 1 },
      { id: 3, name: 'Groupe Bêta', applicationCount: 0 },
      { id: 1, name: 'Groupe Fictif', applicationCount: 3 },
    ]);
  });

  it('keeps empty groups, in the order received', () => {
    expect(
      summarizeGroups(groups, []).map((group) => [group.name, group.applicationCount]),
    ).toEqual([
      ['Groupe Alpha', 0],
      ['Groupe Bêta', 0],
      ['Groupe Fictif', 0],
    ]);
  });
});

describe('replaceGroup', () => {
  it('replaces the renamed group and keeps the list sorted by name, ignoring case and accents', () => {
    const groups = [
      { id: 2, name: 'Groupe Alpha' },
      { id: 3, name: 'groupe bêta' },
      { id: 1, name: 'Groupe Fictif' },
    ];

    expect(replaceGroup(groups, { id: 2, name: 'Groupe Été' })).toEqual([
      { id: 3, name: 'groupe bêta' },
      { id: 2, name: 'Groupe Été' },
      { id: 1, name: 'Groupe Fictif' },
    ]);
  });
});
