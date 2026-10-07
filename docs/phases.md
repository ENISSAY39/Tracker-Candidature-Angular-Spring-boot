# Phases du projet

Plan de construction du tracker de candidatures, dans l'ordre. Source : `CLAUDE.md` (« Ordre de construction »). Chaque phase avance par tranches verticales courtes (migration → entité → service → contrôleur → tests → écran), avec un commit par tranche au format Conventional Commits. Workflow Git : une branche et une PR par tranche, jamais de commit ni de push sur `main`, relecture et fusion par toi (détail dans `CLAUDE.md`, « Workflow Git »).

Une phase est terminée quand les tests de la partie touchée sont au vert : `./mvnw verify`, `npx ng test --no-watch`, `npx ng build`.

## Phase 1 — Socle

- [ ] Installer JDK 25 (`java -version` → 25, `JAVA_HOME` à jour) et lancer Docker Desktop
- [x] Générer le backend avec Spring Initializr (Java 25, Maven, `web`, `data-jpa`, `postgresql`, `flyway`, `validation`, `testcontainers`) ; vérifier les starters Spring Boot 4 et `flyway-database-postgresql`
- [x] Générer le frontend avec Angular CLI 22 (SCSS, routing, zoneless, sans SSR) puis ajouter Angular Material
- [x] Ajouter la dépendance `poi-ooxml` au `pom.xml`
- [x] `server.port: 8081` dans `application.yaml` (le 8080 est pris sur le poste de dev)
- [x] Fixer `postgres:18` dans `TestcontainersConfiguration`
- [x] Créer `.env.example` et le `.gitignore` racine (`data/`, `.env`) ; seul `.env.example` est versionné
- [x] `Dockerfile` du backend (multi-étapes, JDK 25 puis JRE 25) et `Dockerfile` + `nginx.conf` du frontend (build Angular, proxy `/api` → `backend:8080`)
- [x] Créer `compose.yaml` sans profil : `postgres` (image `postgres:18`, volume nommé sur `/var/lib/postgresql`, `127.0.0.1:5432`), `backend` (non publié), `frontend` (`127.0.0.1:8090`)
- [x] Créer `proxy.conf.json` (`/api` → `http://localhost:8081`) et le brancher sur `npm start`
- [x] Créer `.github/workflows/ci.yml` : tout push et PR vers `main` ; jobs backend (`./mvnw -B verify`), frontend (`npm ci`, `ng test --no-watch`, `ng build`) et Docker (`docker compose build` + test de fumée sur `http://localhost:8090`) ; actions épinglées par version majeure, aucun secret
- [x] Vérifier en local : le backend démarre, le frontend compile, les tests générés passent, `docker compose up -d` démarre les trois conteneurs
- [x] Mettre à jour la section « Initialisation » de `CLAUDE.md` puis la supprimer
- [x] Une branche + une PR par tranche (backend + infra Docker, frontend, documentation, CI), commits sans co-auteur
- [x] Après la fusion de chaque PR par toi : CI verte sur GitHub (vérifiable avec `gh run list`)

## Phase 2 — Schéma et entités

- [ ] Migration `V1__init_schema.sql` : `company_group` (index unique sur `lower(name)`), séquence `job_application_number_seq`, `job_application`, `job_lead`, contraintes `CHECK` sur les enums
- [ ] Enums `ApplicationStatus` (avec `label` et `category`), `StatusCategory`, `LeadState`
- [ ] Entités `CompanyGroup`, `JobApplication`, `JobLead` (`ddl-auto: validate`, `open-in-view: false`)
- [ ] Repositories Spring Data
- [ ] Tests d'intégration des repositories sur Testcontainers (`postgres:18`)

## Phase 3 — API candidatures, groupes, statuts

- [ ] `common` : `GlobalExceptionHandler` (`ProblemDetail`, RFC 9457 : 400 avec champs en erreur, 404, 409) et exceptions métier
- [ ] `GET /api/statuses` (code, libellé, catégorie, ordre)
- [ ] Candidatures : DTO `…Request` / `…Response`, mapper manuel, service, contrôleur ; `GET`, `POST`, `PUT`, `DELETE`
- [ ] Création du groupe à la volée à partir de `groupName`
- [ ] Attribution du `number` par la séquence (immuable, jamais réutilisé)
- [ ] `PATCH /api/applications/{id}/status`
- [ ] Règles métier : `sent_on` obligatoire sauf `TO_SEND` / `WITHDRAWN`, `deadline_date` remise à `null` sur les statuts clos
- [ ] Groupes : `GET`, `PUT` (renommer), `DELETE` (409 si le groupe a des candidatures)
- [ ] Tests : services en unitaire (Mockito), contrôleurs en `@WebMvcTest`

## Phase 4 — Import Excel

- [ ] Lecture de la feuille « Toutes les candidatures » avec Apache POI : ligne d'en-têtes (première cellule = `#`), colonnes lues par leur intitulé, arrêt à la première ligne sans `#`
- [ ] Conversion du statut par libellé exact, rejet de l'import avec le numéro de ligne si le libellé est inconnu
- [ ] Dates : cellules de type date uniquement
- [ ] Conservation des `number` du classeur, recalage de la séquence sur le maximum
- [ ] `POST /api/import/excel` : tout ou rien (une transaction), refus si la base contient déjà des candidatures sauf `?mode=replace`
- [ ] Réponse avec le nombre de lignes créées par table
- [ ] Tests d'intégration sur Testcontainers avec un classeur fictif
- [ ] Recette : les compteurs après import correspondent à la ligne 2 de « Toutes les candidatures »

## Phase 5 — Écran liste

- [ ] Layout et navigation (`core/`), intercepteur d'erreurs HTTP, locale `fr-FR`
- [ ] `applications-api.ts` et types calqués sur les `…Response`
- [ ] Table Angular Material triable avec tri par défaut (catégorie, puis `deadline_date`, puis `number`)
- [ ] Composants partagés : `status-badge` (palette par catégorie, WCAG AA), `deadline-cell` (gras `#C00000` si dépassée, `#B45309` de J à J+3)
- [ ] Compteurs (« Total » + un par catégorie non vide) calculés en `computed`
- [ ] Filtres : catégorie ou statut, groupe, texte libre, échéance dépassée ou sous 3 jours
- [ ] Lignes grisées pour les statuts clos, notes tronquées
- [ ] Tests Vitest : tri, compteurs, alertes d'échéance, service d'API

## Phase 6 — Fiche, formulaire, changement de statut

- [ ] Fiche d'une candidature (`/applications/:id`) avec notes complètes
- [ ] Formulaire de création et d'édition (datepicker, groupe en autocomplétion, canal en autocomplétion sur les valeurs existantes)
- [ ] Proposition de `deadline_date = sent_on + 14 jours` à la saisie de `sent_on` si l'échéance est vide
- [ ] Changement rapide de statut depuis la liste (`PATCH …/status`)
- [ ] Suppression avec `confirm-dialog`
- [ ] Retours utilisateur par snackbar, gestion des erreurs de validation du backend

## Phase 7 — Groupes, offres, écran d'import

- [ ] Liste des groupes (`/groups`) et page d'un groupe (`/groups/:id`) : même liste filtrée, compteurs du groupe
- [ ] Renommage et suppression d'un groupe (gestion du 409)
- [ ] Backend `joblead` : CRUD, `GET /api/leads?state=`
- [ ] « Promouvoir » : crée une candidature `TO_SEND` (groupe demandé) et supprime l'offre dans la même transaction
- [ ] « Écarter » : passage en `DISCARDED` avec motif obligatoire
- [ ] Écran des offres (`/leads`) : à évaluer / abandonnées
- [ ] Écran d'import (`/import`) : envoi du classeur, choix du mode, affichage du résultat

## Phase 8 — README et recette finale

- [ ] `README.md` : démarrage (`docker compose up -d`, dev local), sauvegarde (`pg_dump`), import du classeur
- [ ] Recette en conteneurs : `docker compose up -d` sur `http://localhost:8090`, import du classeur, compteurs conformes

## Hors périmètre

Authentification, historique des statuts, pièces jointes, export Excel, notifications, pagination serveur, CD (publication d'images, déploiement distant) : à ne pas aborder sans demande explicite. La CI GitHub Actions fait partie de la phase 1.
