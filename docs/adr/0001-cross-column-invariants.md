# Invariants entre colonnes : deux `CHECK` en base, `sent_on` contrôlé par le service seul

Trois règles métier croisent deux colonnes. Deux sont garanties par une contrainte `CHECK` dès la première migration : `deadline_date` est nulle sur un statut clos (`REJECTED`, `WITHDRAWN`), et `discard_reason` est renseigné si et seulement si la piste est `DISCARDED`. La troisième, `sent_on` obligatoire sauf pour `TO_SEND` et `WITHDRAWN`, n'a volontairement pas de `CHECK` : elle est contrôlée par le service et par l'import.

La différence tient à la provenance des données. Les deux premières règles ne peuvent jamais être violées par une saisie légitime, parce que le service et l'import normalisent la valeur avant d'écrire. La date d'envoi, elle, peut manquer dans des données historiques du classeur : l'import doit pouvoir examiner chaque ligne et rejeter le fichier en citant la ligne fautive, ce qu'une violation de contrainte en base ne permet pas de dire clairement.

## Considered Options

- **Trois `CHECK`** : cohérent, mais une ligne historique sans date ferait échouer l'import sur une erreur SQL, sans numéro de ligne exploitable.
- **Aucun `CHECK`, tout dans les services** : conforme à « les règles métier vivent dans les services », mais les deux règles strictes ne seraient vraies que pour ce qui passe par l'API.

## Consequences

Ajouter plus tard un `CHECK` sur `sent_on` reste possible par une nouvelle migration, à condition qu'aucune ligne en base ne le viole. Le classeur réel du 08/10/2026 ne contient aucune ligne fautive.
