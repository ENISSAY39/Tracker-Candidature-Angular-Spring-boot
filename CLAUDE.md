# Tracker de candidatures



<!-- Notes de maintenance (commentaire HTML : non injecté dans le contexte de Claude Code).
- Fichier de démarrage pour un dépôt vide. Une fois le socle généré : supprimer la section « Initialisation »
  et élaguer ce qui se lit dans le code (arborescence, routes) pour rester sous 200 lignes.
- Versions vérifiées le 06/10/2026 : Spring Boot 4.1.1, Angular 22.2, Node 24 LTS, PostgreSQL 18. -->

Application web **mono-utilisateur, en local**, qui remplace mon classeur Excel de suivi de candidatures (stage de fin d'études) : candidatures numérotées, rattachées à un groupe employeur, avec statut, échéance de relance et notes de suivi, plus un vivier d'offres à évaluer ou abandonnées.

- Code, schéma SQL et API en **anglais** ; interface et messages utilisateur en **français**.
- Me répondre en français, de façon concise.


## Warning !!! 
- Ne jamais se mettre en Co Author dans les comitt, push, PR, issues etc

## Stack

- **Backend** : Java 25 (LTS), Spring Boot 4 (4.1 à ce jour : Web MVC, Data JPA, Validation, Flyway), Maven wrapper ; package racine `io.github.enissay39.tracker`.
- **Base** : PostgreSQL 18 dans Docker Compose ; schéma géré par Flyway uniquement.
- **Frontend** : Angular 22 (standalone, signals, zoneless), Angular Material 22 (thème M3), SCSS, TypeScript 6, npm.
- **Tests** : JUnit, AssertJ, Mockito, Testcontainers (PostgreSQL) ; Vitest via `ng test`.
- **Import Excel** : Apache POI (`poi-ooxml`).
- **Poste de dev** : Windows, JDK 25, Node.js 24 LTS (≥ 24.15), Docker Desktop. Commandes écrites pour Git Bash (PowerShell : `./mvnw` → `.\mvnw.cmd`).
- Volontairement absents : Lombok, MapStruct, Spring Security, H2, NgRx, Tailwind. Ne pas ajouter de dépendance sans me la proposer d'abord.

## Commandes

```bash
docker compose up -d postgres                 # base de dev → 127.0.0.1:5432
cd backend && ./mvnw spring-boot:run          # API → http://localhost:8080
cd backend && ./mvnw verify                   # tous les tests (Docker doit tourner) ; une classe : ./mvnw test -Dtest=JobApplicationServiceTest
cd frontend && npm start                      # ng serve → http://localhost:4200, proxy /api → :8080
cd frontend && npx ng test --no-watch         # Vitest, un seul passage ; cibler : --include "src/app/features/leads/**"
cd frontend && npx ng build                   # doit passer sans erreur
docker compose exec -T postgres pg_dump -U tracker tracker > data/backup.sql   # sauvegarde de la base
```

`spring-boot:run` et `npm start` sont bloquants : les lancer en arrière-plan, ou me demander de le faire.

## Arborescence cible

```text
tracker-candidatures/
├── CLAUDE.md  README.md  compose.yaml  .env.example  .gitignore
├── data/                           # ignoré par Git : classeur Excel réel, sauvegardes SQL
├── backend/                        # généré par Spring Initializr
│   ├── pom.xml  mvnw  mvnw.cmd  Dockerfile
│   └── src/
│       ├── main/java/io/github/enissay39/tracker/    # un package par fonctionnalité, pas par couche technique
│       │   ├── jobapplication/     # JobApplication, ApplicationStatus, StatusCategory, Repository, Service, Controller, Mapper, dto/
│       │   ├── companygroup/       # CompanyGroup + Repository, Service, Controller, dto/
│       │   ├── joblead/            # JobLead, LeadState + promotion / abandon
│       │   ├── excelimport/        # lecture du classeur (POI) → entités
│       │   └── common/             # GlobalExceptionHandler (ProblemDetail), exceptions métier, config ; ne dépend d'aucun autre package
│       ├── main/resources/         # application.yaml, db/migration/V1__init_schema.sql, V2__…
│       └── test/java/…             # même découpage que main
└── frontend/                       # généré par Angular CLI, avec son propre CLAUDE.md
    ├── angular.json  package.json  proxy.conf.json  Dockerfile  nginx.conf
    └── src/
        ├── index.html  main.ts  styles.scss
        └── app/
            ├── app.ts  app.html  app.config.ts  app.routes.ts
            ├── core/               # layout (navigation), intercepteur d'erreurs HTTP, locale fr
            ├── shared/             # status-badge, deadline-cell, confirm-dialog, utilitaires de date
            └── features/           # un dossier par écran, routes en lazy loading
                ├── applications/   # liste (table, compteurs, filtres), fiche, formulaire, applications-api.ts
                ├── groups/         # liste des groupes, page d'un groupe
                ├── leads/          # offres à évaluer / abandonnées
                └── import/         # envoi du classeur Excel
```

## Modèle de données (transposition du classeur)

- Feuille « Toutes les candidatures » → table `job_application`.
- Sa colonne « Groupe » → table `company_group` (entité `CompanyGroup`) : `id`, `name varchar(100)` non nul, unique sans tenir compte de la casse (index sur `lower(name)`).
- Les 12 feuilles par employeur (dont « Autres ») → **aucune table** : ce sont des vues filtrées par groupe. Dans l'appli, chaque groupe a sa page.
- Feuilles « À évaluer » et « Abandonnées » → table `job_lead` (`state` = `TO_EVALUATE` / `DISCARDED`).
- Ligne 2 de chaque feuille (compteurs) → calculée, jamais stockée.

### `job_application` — entité `JobApplication`

| Colonne Excel | Colonne SQL | Type | Règle |
|---|---|---|---|
| # | `number` | `integer` unique, non nul | Numéro métier donné par la séquence `job_application_number_seq` ; immuable, jamais réutilisé (les notes citent « n° 26 ») |
| Groupe | `company_group_id` | FK non nulle | Maison mère ; créée à la volée à partir de son nom |
| Entreprise | `company` | `varchar(255)` non nul | Texte libre : entité + service + site |
| Poste | `job_title` | `varchar(255)` non nul | Texte libre : intitulé + référence de l'annonce |
| Statut | `status` | `varchar(30)` non nul + `CHECK` | Enum `ApplicationStatus` stocké en texte |
| Envoyée le | `sent_on` | `date` | Obligatoire sauf statuts `TO_SEND` et `WITHDRAWN` |
| Échéance | `deadline_label` | `varchar(255)` | Prochaine étape en clair (« Relance le 18/10 », « Refus si rien au 21/10 ») |
| Date échéance | `deadline_date` | `date` | Saisie à part, jamais déduite du libellé ; pilote les alertes |
| Prochaine action | `notes` | `text` | Journal de suivi daté, écarts, points de vigilance, actions à mener |
| Début | `start_period` | `varchar(100)` | Texte libre : début + durée (« Févr. 2027, 6 mois ») |
| Canal | `channel` | `varchar(255)` | Texte libre (site carrière, JobTeaser, cooptation…) ; autocomplétion sur les valeurs existantes |
| CV envoyé | `cv_sent` | `varchar(255)` | Noms des fichiers CV / lettre envoyés |
| — | `id`, `created_at`, `updated_at` | `bigint` identité, `timestamptz` | Techniques |

### `job_lead` — entité `JobLead`

| Colonne Excel | Colonne SQL | Type | Règle |
|---|---|---|---|
| Entreprise | `company` | `varchar(255)` non nul | |
| Poste | `job_title` | `varchar(255)` non nul | |
| CV prévu (À évaluer) | `planned_cv` | `varchar(255)` | |
| Remarque (À évaluer) | `remark` | `text` | |
| Motif (Abandonnées) | `discard_reason` | `text` | Obligatoire si `DISCARDED` |
| (nom de la feuille) | `state` | `varchar(20)` non nul + `CHECK` | Enum `LeadState` : `TO_EVALUATE` / `DISCARDED` |
| — | `id`, `created_at`, `updated_at` | `bigint` identité, `timestamptz` | Techniques |

## Statuts et règles métier

| Catégorie `StatusCategory` (libellé du compteur) | Statuts `ApplicationStatus` → libellé FR | Sens | Badge fond / texte |
|---|---|---|---|
| `OFFER` (Offre) | `OFFER` → Offre | Proposition reçue | `#C6EFCE` / `#006100` |
| `INTERVIEW` (Entretien) | `INTERVIEW` → Entretien | Échange planifié ou en cours | `#BDD7EE` / `#1F4E79` |
| `OPENED` (Dossier ouvert par le recruteur) | `UNDER_REVIEW` → En examen · `IN_EVALUATION` → En cours d'évaluation · `PRE_SELECTION` → Pré-sélection · `SELECTION` → Sélection | Statut affiché par le portail, pas encore de contact | `#FFD966` / `#6B5000` |
| `PENDING` (En attente) | `PENDING` → En attente | Envoyée, pas encore de réponse | `#FFF2CC` / `#7F6000` |
| `TO_SEND` (À envoyer) | `TO_SEND` → À envoyer | Retenue, pas encore partie | `#EDEDED` / `#404040` |
| `REJECTED` (Refus) | `REJECTED` → Refus | Réponse négative | `#FFC7CE` / `#9C0006` |
| `WITHDRAWN` (Abandonnée) | `WITHDRAWN` → Abandonnée | Écartée volontairement | `#D9D9D9` / `#595959` |

- Libellés et catégories : la source de vérité est l'enum Java (`label`, `category`), exposé par `GET /api/statuses`. Le front ne définit que les couleurs, par catégorie (palette du classeur, ajustée pour WCAG AA).
- **Compteurs** : « Total » puis un compteur par catégorie non vide, dans l'ordre du tableau ; calculés côté front (`computed`) sur la liste affichée, globale ou d'un groupe.
- **Tri par défaut** : ordre des catégories du tableau, puis `deadline_date` croissante (vides à la fin), puis `number`.
- **Filtres de la liste** : catégorie ou statut, groupe, texte libre (entreprise, poste, notes), échéance dépassée ou sous 3 jours.
- **Échéance** : à la saisie de `sent_on`, proposer `deadline_date = sent_on + 14 jours` si elle est vide (règle de relance, modifiable). Alerte sur la date : dépassée → gras `#C00000` ; d'aujourd'hui à J+3 → gras `#B45309`.
- **Statuts clos** (`REJECTED`, `WITHDRAWN`) : `deadline_date` remise à `null`, ligne en gris `#6E6E6E`, aucune alerte.
- **Transitions** : libres, pas de machine à états ; changement rapide depuis la liste via `PATCH …/status`.
- **Notes** : tronquées dans la table, texte intégral avec retours à la ligne dans la fiche.
- **Offres (`JobLead`)** : « Promouvoir » crée une candidature `TO_SEND` (`company`, `job_title`, `planned_cv` → `cv_sent`, `remark` → `notes`, groupe demandé) et supprime le lead dans la même transaction. « Écarter » passe en `DISCARDED` avec motif obligatoire.
- À ne pas confondre : statut « Offre » (proposition reçue) ≠ offre à évaluer (annonce repérée → `JobLead`) ; statut « Abandonnée » (`WITHDRAWN`, candidature suivie) ≠ offre abandonnée (`DISCARDED`, jamais candidatée).

## API REST (préfixe `/api`, JSON, dates `yyyy-MM-dd`)

```text
GET /applications · GET /applications/{id} · POST /applications · PUT /applications/{id} · DELETE /applications/{id}
PATCH /applications/{id}/status   {status}
GET /statuses                     code, label, category, ordre
GET /groups · PUT /groups/{id} (renommer) · DELETE /groups/{id} (409 si le groupe a des candidatures)
GET /leads?state= · POST /leads · PUT /leads/{id} · DELETE /leads/{id}
POST /leads/{id}/promote {groupName} · POST /leads/{id}/discard {reason}
POST /import/excel                multipart `file`, option `?mode=replace`
```

- Volume faible (< 1 000 lignes) : `GET /applications` renvoie tout, **sans pagination** ; tri et filtres côté front.
- Entrées et sorties : `record` Java dédiés (`…Request`, `…Response`), validés par Jakarta Validation ; jamais d'entité JPA exposée. Le groupe se passe par son nom (`groupName`), créé s'il n'existe pas.
- Erreurs : `ProblemDetail` (RFC 9457) depuis un unique `@RestControllerAdvice` ; 400 validation (avec les champs en erreur), 404, 409.

## Conventions backend

- Contrôleur mince → service `@Transactional` (`readOnly = true` en lecture) → repository Spring Data. Les règles métier ci-dessus vivent dans les services.
- Injection par constructeur. Mapping entité ↔ `record` écrit à la main dans un `…Mapper`.
- Schéma : uniquement des migrations Flyway `V{n}__description.sql` ; `ddl-auto: validate`, `open-in-view: false`. Ne jamais modifier une migration déjà appliquée : en ajouter une.
- Enums en `@Enumerated(EnumType.STRING)`, doublés d'une contrainte `CHECK` en SQL.
- Tests : services en unitaire (Mockito), contrôleurs en `@WebMvcTest`, repositories et import en intégration sur Testcontainers (`postgres:18`).
- Spring Boot 4 diffère des 3.x : starters modulaires (`spring-boot-starter-webmvc`, `spring-boot-starter-flyway`, un starter `-test` par techno), Jackson 3 (paquets `tools.jackson`), `@MockitoBean` à la place de `@MockBean`. En cas de doute sur une API, lire la doc de la version installée plutôt que coder de mémoire.

## Conventions frontend

- Les règles Angular génériques sont dans `frontend/CLAUDE.md` (généré par le CLI) : ne pas les dupliquer ici. Fichiers sans suffixe de type (`applications-page.ts`, classe `ApplicationsPage`), créés avec `npx ng generate`.
- Interface en français, libellés en dur (pas d'i18n), locale `fr-FR` (dates `dd/MM/yyyy`). Routes en anglais : `/applications`, `/applications/:id`, `/groups`, `/groups/:id`, `/leads`, `/import`.
- Angular Material pour tous les composants (table triable, champs, datepicker, chips, dialog, snackbar). Couleurs via les variables `--mat-sys-*`, sauf la palette des statuts.
- Appels HTTP uniquement dans un service `…-api.ts` par feature, jamais dans un composant. Types TypeScript calqués sur les `…Response` du backend.
- Dates sans heure : chaîne `yyyy-MM-dd` de bout en bout ; ne jamais passer par `toISOString()` (le fuseau décale d'un jour).
- Dev : `proxy.conf.json` envoie `/api` vers `http://localhost:8080` ; aucune configuration CORS côté backend.
- Tests Vitest à côté du fichier (`*.spec.ts`), en priorité sur les services d'API et la logique d'affichage (tri, compteurs, alertes d'échéance).

## Import du classeur Excel

- `POST /api/import/excel` reçoit `Tracker_Candidatures.xlsx` depuis l'écran Import. Tout ou rien (une transaction) ; la réponse donne le nombre de lignes créées par table.
- « Toutes les candidatures » : repérer la ligne d'en-têtes (première cellule = `#`), lire les colonnes **par leur intitulé**, s'arrêter à la première ligne sans `#`. Ignorer les feuilles par employeur.
- « Statut » → enum par libellé exact ; un libellé inconnu rejette l'import en citant la ligne. Dates : cellules de type date uniquement, ne jamais analyser le texte de « Échéance ».
- Conserver les `number` du classeur, puis recaler la séquence sur le maximum. Refuser l'import si la base contient déjà des candidatures, sauf `mode=replace` (vide puis recharge).
- Recette : les compteurs affichés après import sont ceux de la ligne 2 de « Toutes les candidatures ».

## Garde-fous et méthode de travail

- Le classeur et la base contiennent mes **données personnelles réelles** : `data/`, `.env` et tout export restent hors Git. Tests et exemples : données fictives uniquement.
- Ne jamais lancer `docker compose down -v`, `docker volume rm`, `DROP`, `TRUNCATE` ni `flyway clean` sur la base de dev sans mon accord explicite. Les tests passent uniquement par Testcontainers.
- `compose.yaml` : image `postgres:18`, volume nommé monté sur `/var/lib/postgresql` (depuis PostgreSQL 18, ce n'est plus `/var/lib/postgresql/data`), ports publiés sur `127.0.0.1` seulement. Base, utilisateur et mot de passe de dev : `tracker`, surchargeables par `.env`.
- Aucune authentification (usage local) : ne rien exposer hors de `127.0.0.1`.
- Avancer par tranches verticales courtes (migration → entité → service → contrôleur → tests → écran) ; un commit par tranche, au format Conventional Commits.
- Avant d'annoncer une tâche finie : tests de la partie touchée au vert (`./mvnw verify`, `npx ng test --no-watch`, `npx ng build`).
- Ordre de construction : 1) socle (section Initialisation) 2) schéma + entités 3) API candidatures, groupes, statuts 4) import Excel 5) écran liste (table, compteurs, filtres, alertes) 6) fiche, formulaire, changement de statut 7) groupes, offres, écran d'import 8) empaquetage local (`Dockerfile` backend, `Dockerfile` + nginx frontend, profil `app` dans `compose.yaml` → `docker compose --profile app up -d` sur `http://localhost:8090`).
- Hors périmètre tant que je ne le demande pas : authentification, historique des statuts, pièces jointes, export Excel, notifications, pagination serveur, CI/CD, déploiement distant.

## Initialisation (une seule fois — supprimer cette section une fois le socle commité)

```bash
curl -s https://start.spring.io/starter.zip -d type=maven-project -d language=java -d javaVersion=25 \
  -d groupId=io.github.enissay39 -d artifactId=tracker -d name=tracker -d packageName=io.github.enissay39.tracker \
  -d configurationFileFormat=yaml -d dependencies=web,data-jpa,postgresql,flyway,validation,testcontainers \
  -o backend.zip && unzip -q backend.zip -d backend && rm backend.zip
npx -y @angular/cli@22 new frontend --style=scss --ssr=false --routing --zoneless \
  --skip-git --package-manager=npm --ai-config=claude-code --defaults
cd frontend && npx ng add @angular/material --defaults --skip-confirmation
```

- Ne pas écrire `pom.xml` ni `package.json` à la main : partir de ces générateurs, puis ajouter `poi-ooxml`.
- Ensuite : fixer `postgres:18` dans `TestcontainersConfiguration`, créer `compose.yaml`, `.env.example`, le `.gitignore` racine (`data/`, `.env`) et `proxy.conf.json`, puis brancher le proxy sur `npm start`.

## Agent skills

### Issue tracker

Les issues vivent dans GitHub Issues du dépôt (CLI `gh`). Voir `docs/agents/issue-tracker.md`.

### Triage labels

Vocabulaire par défaut : `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Voir `docs/agents/triage-labels.md`.

### Domain docs

Single-context : `GLOSSARY.md` et `docs/adr/` à la racine. Voir `docs/agents/domain.md`.