# Phases du projet

Plan de construction du tracker de candidatures, dans l'ordre. Source : `CLAUDE.md` (« Ordre de construction »). Chaque phase avance par tranches verticales courtes (migration → entité → service → contrôleur → tests → écran), avec un commit par tranche au format Conventional Commits. Workflow Git : une branche et une PR par tranche, jamais de commit ni de push sur `main`, fusion par l'agent une fois la CI verte (détail dans `CLAUDE.md`, « Workflow Git »).

Une phase est terminée quand les tests de la partie touchée sont au vert : `./mvnw verify`, `npx ng test --no-watch`, `npx ng build`.

## Phase 1 — Socle

- [x] Installer JDK 25 (`java -version` → 25, `JAVA_HOME` à jour) et lancer Docker Desktop
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

Deux tranches, une branche et une PR chacune. Décisions et vocabulaire : `CLAUDE.md`, `GLOSSARY.md`, `docs/adr/0001-cross-column-invariants.md`.

### Tranche 1 — Groupes et candidatures (`feat/schema-applications`)

- [x] `ddl-auto: validate` et `open-in-view: false` dans `application.yaml`
- [x] Migration `V1__init_schema.sql` : `company_group` (index unique sur `lower(name)`, `CHECK` nom nettoyé et non vide), séquence `job_application_number_seq`, `job_application` (`number` avec `DEFAULT nextval`, clé étrangère `ON DELETE RESTRICT`, `CHECK` sur le statut, `CHECK` `deadline_date` nulle sur un statut clos ; pas de `CHECK` sur `sent_on`), `created_at` / `updated_at` avec `DEFAULT now()`
- [x] Enums `ApplicationStatus` (avec `label` et `category`) et `StatusCategory`
- [x] Entités `CompanyGroup` et `JobApplication` (`number` en `updatable = false`, horodatage par `@PrePersist` / `@PreUpdate`)
- [x] Repositories Spring Data, dont la lecture de `nextval` et la recherche d'un groupe sans tenir compte de la casse
- [x] Tests d'intégration sur Testcontainers (`postgres:18`) : contraintes `CHECK`, unicité du nom de groupe, unicité du `number`, suppression d'un groupe non vide refusée

### Tranche 2 — Pistes (`feat/schema-leads`)

- [x] Migration `V2__job_lead.sql` : `job_lead`, `CHECK` sur l'état, `CHECK` motif renseigné et non vide si et seulement si `DISCARDED`
- [x] Enum `LeadState`, entité `JobLead`, repository
- [x] Tests d'intégration sur Testcontainers : les deux sens du `CHECK` sur le motif

## Phase 3 — API candidatures, groupes, statuts

- [x] `common` : `GlobalExceptionHandler` (`ProblemDetail`, RFC 9457 : 400 avec champs en erreur, 404, 409) et exceptions métier
- [x] `GET /api/statuses` (code, libellé, catégorie, ordre)
- [x] Candidatures : DTO `…Request` / `…Response`, mapper manuel, service, contrôleur ; `GET`, `POST`, `PUT`, `DELETE`
- [x] Création du groupe à la volée à partir de `groupName` : nom nettoyé, recherche sans tenir compte de la casse, graphie existante conservée
- [x] Attribution du `number` par le service à partir de la séquence (immuable, jamais réutilisé, trous possibles) ; aucun `number` dans les `…Request`
- [x] `PATCH /api/applications/{id}/status` avec `{status, sentOn?, deadlineDate?}` ; 400 si la date d'envoi manque, jamais d'horloge serveur
- [x] Règles métier : `sent_on` obligatoire sauf `TO_SEND` / `WITHDRAWN`, `deadline_date` remise à `null` sur les statuts clos, champs texte facultatifs vides enregistrés à `null`
- [x] Groupes : `GET`, `PUT` (renommer ; 409 si le nom est déjà pris, pas de fusion), `DELETE` (409 si le groupe a des candidatures)
- [x] Tests : services en unitaire (Mockito), contrôleurs en `@WebMvcTest`

## Phase 4 — Import Excel

- [x] Lecture de la feuille « Toutes les candidatures » avec Apache POI : ligne d'en-têtes (première cellule = `#`), colonnes lues par leur intitulé, arrêt à la première ligne sans `#`
- [x] Conversion du statut par libellé exact, rejet de l'import avec le numéro de ligne si le libellé est inconnu
- [x] Dates : cellules de type date uniquement
- [x] Rejet de l'import avec le numéro de ligne si « Envoyée le » manque alors que le statut l'exige
- [x] Lecture des feuilles « À évaluer » et « Abandonnées » vers `job_lead` (en-têtes repérés par `Entreprise`, lignes vides ignorées) ; feuilles par employeur et « Autres » ignorées
- [x] Conservation des `number` du classeur, recalage de la séquence sur le maximum
- [x] `POST /api/import/excel` : tout ou rien (une transaction), refus si la base contient déjà des candidatures sauf `?mode=replace`
- [x] Réponse avec le nombre de lignes créées par table
- [x] Tests d'intégration sur Testcontainers avec un classeur fictif généré par POI dans le test (`*.xlsx` est ignoré par Git)
- [ ] Recette : les compteurs après import correspondent à la ligne 2 de « Toutes les candidatures »

## Phase 5 — Écran liste

- [x] Layout et navigation (`core/`), intercepteur d'erreurs HTTP, locale `fr-FR`
- [x] `applications-api.ts` et types calqués sur les `…Response`
- [x] Table Angular Material triable avec tri par défaut (catégorie, puis `deadline_date`, puis `number`)
- [x] Composants partagés : `status-badge` (palette par catégorie, WCAG AA), `deadline-cell` (gras `#C00000` si dépassée, `#B45309` de J à J+3)
- [x] Compteurs (« Total » + un par catégorie non vide) calculés en `computed`
- [x] Filtres : catégorie ou statut, groupe, texte libre, échéance dépassée ou sous 3 jours
- [x] Lignes grisées pour les statuts clos, notes tronquées
- [x] Tests Vitest : tri, compteurs, alertes d'échéance, service d'API

## Phase 6 — Fiche, formulaire, changement de statut

- [x] Fiche d'une candidature (`/applications/:id`) avec notes complètes
- [x] Formulaire de création et d'édition (datepicker, groupe en autocomplétion, canal en autocomplétion sur les valeurs existantes)
- [x] Proposition de `deadline_date = sent_on + 14 jours` à la saisie de `sent_on` si l'échéance est vide
- [x] Changement rapide de statut depuis la liste (`PATCH …/status`) ; dialogue « Envoyée le » (aujourd'hui par défaut, échéance proposée à + 14 jours) seulement si la date d'envoi manque
- [x] Suppression avec `confirm-dialog`
- [x] Retours utilisateur par snackbar, gestion des erreurs de validation du backend

## Phase 7 — Groupes, pistes, écran d'import

- [x] Liste des groupes (`/groups`) et page d'un groupe (`/groups/:id`) : même liste filtrée, compteurs du groupe
- [x] Renommage et suppression d'un groupe (gestion du 409)
- [x] Backend `joblead` : CRUD, `GET /api/leads?state=`
- [ ] « Promouvoir » : crée une candidature `TO_SEND` (groupe demandé) et supprime la piste dans la même transaction ; 409 sur une piste écartée
- [ ] « Écarter » : passage en `DISCARDED` avec motif obligatoire, `planned_cv` et `remark` conservés
- [ ] « Réévaluer » (`POST /api/leads/{id}/restore`) : retour en `TO_EVALUATE`, motif effacé
- [x] Écran des pistes (`/leads`) : onglets « À évaluer » et « Écartées »
- [x] Écran d'import (`/import`) : envoi du classeur, choix du mode, affichage du résultat

## Phase 8 — README et recette finale

- [ ] `README.md` : démarrage (`docker compose up -d`, dev local), sauvegarde (`pg_dump`), import du classeur
- [ ] Recette en conteneurs : `docker compose up -d` sur `http://localhost:8090`, import du classeur, compteurs conformes

## Hors périmètre

Authentification, historique des statuts, pièces jointes, export Excel, notifications, pagination serveur, CD (publication d'images, déploiement distant) : à ne pas aborder sans demande explicite. La CI GitHub Actions fait partie de la phase 1.
