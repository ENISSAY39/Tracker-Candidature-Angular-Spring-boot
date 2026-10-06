# Tracker de candidatures

Application web **mono-utilisateur, en local**, qui remplace mon classeur Excel de suivi de candidatures (stage de fin d'études) : candidatures numérotées, rattachées à un groupe employeur, avec statut, échéance de relance et notes de suivi, plus un vivier d'offres à évaluer ou abandonnées.

## Stack

- **Backend** : Java 25 (LTS), Spring Boot 4 (4.1 à ce jour : Web MVC, Data JPA, Validation, Flyway), Maven wrapper ; package racine `io.github.enissay39.tracker`.
- **Base** : PostgreSQL 18 dans Docker Compose ; schéma géré par Flyway uniquement.
- **Frontend** : Angular 22 (standalone, signals, zoneless), Angular Material 22 (thème M3), SCSS, TypeScript 6, npm.
- **Tests** : JUnit, AssertJ, Mockito, Testcontainers (PostgreSQL) ; Vitest via `ng test`.
- **Import Excel** : Apache POI (`poi-ooxml`).
- **Poste de dev** : Windows, JDK 25, Node.js 24 LTS (≥ 24.15), Docker Desktop. Commandes écrites pour Git Bash (PowerShell : `./mvnw` → `.\mvnw.cmd`).
- Volontairement absents : Lombok, MapStruct, Spring Security, H2, NgRx, Tailwind.

## Documentation

- `CLAUDE.md` : commandes, modèle de données, règles métier, API, conventions et méthode de travail.
- `docs/phases.md` : plan de construction par phases.

Le démarrage, la sauvegarde et l'import du classeur seront détaillés ici en fin de projet (phase 8).
