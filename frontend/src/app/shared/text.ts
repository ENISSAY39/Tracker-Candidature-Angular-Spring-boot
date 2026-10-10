/** Texte en minuscules sans accents : « Évaluation » et « evaluation » se trouvent l'un l'autre. */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr');
}

/** Vrai si `text` contient `searched`, sans tenir compte de la casse ni des accents. */
export function containsText(text: string, searched: string): boolean {
  return foldText(text).includes(foldText(searched.trim()));
}

/** Texte sans espaces de début et de fin, ou `null` s'il est vide : un champ facultatif vide part à `null`. */
export function trimToNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}
