# Import en mode remplacement : tout est effacé, seules les candidatures déclenchent le refus

L'import du classeur avec `mode=replace` supprime les candidatures, les pistes et les groupes avant de recharger, dans la même transaction que le chargement. Sans ce mode, l'import n'est refusé que si la base contient au moins une candidature : des pistes ou des groupes déjà présents ne le bloquent pas. Les deux règles n'ont volontairement pas le même périmètre.

Le remplacement doit rendre la base identique au classeur, sinon recharger un classeur corrigé ne sert à rien. Une piste n'a ni numéro ni autre clé : si le remplacement gardait les pistes, chaque rechargement les doublerait. Un groupe existant impose sa graphie à tout ce qui s'y rattache : si le remplacement gardait les groupes, une faute corrigée dans le classeur ne le serait jamais dans l'application, et les groupes disparus du classeur resteraient, vides.

Le refus, lui, protège ce qui ne se reconstitue pas : les candidatures, leurs numéros et leur journal de suivi. Quelques pistes saisies à la main avant le premier import, ou un groupe resté vide, ne justifient pas d'imposer le mode remplacement, qui les détruirait.

## Considered Options

- **Remplacement limité aux candidatures** (lecture littérale de « vide puis recharge ») : pistes doublées à chaque rechargement, anciennes graphies de groupe conservées, groupes orphelins.
- **Refus dès qu'une table est non vide** : règle symétrique et sans doublon possible, mais une seule piste saisie à la main, ou un groupe vide invisible depuis la liste des candidatures, obligerait à passer par le mode remplacement et donc à la perdre.
- **Fusion avec l'existant** (mise à jour par numéro) : pas de clé pour les pistes, et chaque conflit entre le classeur et l'application serait à arbitrer ; hors périmètre.

## Consequences

- Importer sans `mode=replace` sur une base qui contient des pistes mais aucune candidature ajoute les pistes du classeur à celles déjà présentes : des doublons sont possibles, à supprimer à la main.
- Le mode remplacement détruit tout ce qui a été saisi dans l'application depuis le dernier import et qui n'est pas dans le classeur. L'écran d'import demande une confirmation, et la procédure prévoit une sauvegarde `pg_dump` avant.
- C'est la seule opération qui peut réattribuer un numéro : la séquence est recalée sur le maximum du nouveau classeur, même si des numéros plus grands avaient été attribués dans l'application puis effacés par le remplacement. La règle « un numéro n'est jamais réutilisé » vaut entre deux remplacements, pas à travers un remplacement. C'est sans danger : les notes qui citaient ces numéros sont effacées avec les candidatures.
- Si le nouveau classeur est rejeté, la suppression est annulée avec le reste : les données d'avant sont intactes.
