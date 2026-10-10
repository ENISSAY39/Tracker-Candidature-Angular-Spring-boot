# Tracker de candidatures



<!-- Notes de maintenance (commentaire HTML : non injecté dans le contexte de Claude Code).
- Socle généré, section « Initialisation » supprimée. Reste à faire au fil des phases :
  élaguer ce qui se lit dans le code (arborescence, routes) pour rester sous 200 lignes.
- Versions vérifiées le 06/10/2026 : Spring Boot 4.1.1, Angular 22.2, Node 24 LTS, PostgreSQL 18. -->

Description du projet et stack (versions, outils) : voir `README.md`.

- Code, schéma SQL et API en **anglais** ; interface et messages utilisateur en **français**.
- Me répondre en français, de façon concise.


## Warning !!! 
- Ne jamais se mettre en Co Author dans les comitt, push, PR, issues etc
- **Ne jamais commiter ni pousser directement sur `main`.** Workflow obligatoire pour toute modification (code ou docs), voir « Workflow Git » plus bas.

## Stack

Java 25 / Spring Boot 4 / PostgreSQL 18 / Angular 22 (détail dans `README.md`). Poste Windows, commandes pour Git Bash. Volontairement absents : Lombok, MapStruct, Spring Security, H2, NgRx, Tailwind. Ne pas ajouter de dépendance sans me la proposer d'abord.

## Commandes

```bash
docker compose up -d                          # toute l'appli en conteneurs (db, back, front) → http://localhost:8090
docker compose up -d postgres                 # base seule pour le dev → 127.0.0.1:5432
cd backend && ./mvnw spring-boot:run          # API → http://localhost:8081
cd backend && ./mvnw verify                   # tous les tests (Docker doit tourner) ; une classe : ./mvnw test -Dtest=JobApplicationServiceTest
cd frontend && npm start                      # ng serve → http://localhost:4200, proxy /api → :8081
cd frontend && npx ng test --no-watch         # Vitest, un seul passage ; cibler : --include "src/app/features/leads/**"
cd frontend && npx ng build                   # doit passer sans erreur
docker compose exec -T postgres pg_dump -U tracker tracker > data/backup.sql   # sauvegarde de la base
```

Le port 8080 est pris sur le poste de dev (service Windows) : l'API locale écoute sur **8081** (`server.port`). Dans son conteneur elle écoute sur 8080, non publié sur l'hôte. En dev local, ne lancer que `postgres` pour éviter les conflits de port avec les conteneurs `backend` / `frontend`.

Le `JAVA_HOME` système peut encore pointer sur un JDK 21 : vérifier `java -version` (25 attendu) ; JDK 25 est dans `C:\Program Files\Java\jdk-25.0.4.1` (Git Bash : `export JAVA_HOME="/c/Program Files/Java/jdk-25.0.4.1"; export PATH="$JAVA_HOME/bin:$PATH"`).

`spring-boot:run` et `npm start` sont bloquants : les lancer en arrière-plan, ou me demander de le faire.

**Session cloud Claude Code** (Linux, pas le poste Windows) : le script d'installation de l'environnement fournit JDK 25 dans `/opt/jdk25` et Node 24 dans `/opt/node24`. Avant de lancer les tests : `export JAVA_HOME=/opt/jdk25 PATH=/opt/jdk25/bin:/opt/node24/bin:$PATH`, et démarrer Docker pour Testcontainers s'il ne répond pas (`docker info`, sinon `dockerd` en arrière-plan). Si `./mvnw` ne peut pas télécharger Maven derrière le proxy, utiliser `mvn` (même commandes). `gh` n'y est pas installé : utiliser les outils GitHub de la session pour les issues et les PR.

## Arborescence cible

```text
tracker-candidatures/
├── CLAUDE.md  README.md  compose.yaml  .env.example  .gitignore
├── .github/workflows/ci.yml        # CI GitHub Actions (build + tests + test de fumée Docker)
├── data/                           # ignoré par Git : classeur Excel réel, sauvegardes SQL
├── backend/                        # généré par Spring Initializr
│   ├── pom.xml  mvnw  mvnw.cmd  Dockerfile
│   └── src/
│       ├── main/java/io/github/enissay39/tracker/    # un package par fonctionnalité, pas par couche technique
│       │   ├── jobapplication/     # JobApplication, ApplicationStatus, StatusCategory, Repository, Service, Controller, Mapper, dto/
│       │   ├── companygroup/       # CompanyGroup + Repository, Service, Controller, dto/
│       │   ├── joblead/            # JobLead, LeadState + promotion / écart / réévaluation
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
                ├── leads/          # pistes à évaluer / écartées
                └── import/         # envoi du classeur Excel
```

## Modèle de données (transposition du classeur)

- Feuille « Toutes les candidatures » → table `job_application`.
- Sa colonne « Groupe » → table `company_group` (entité `CompanyGroup`) : `id`, `name varchar(100)` non nul, unique sans tenir compte de la casse (index sur `lower(name)`), sans espace en début ni en fin et non vide (`CHECK`).
- Les feuilles par employeur → **aucune table** : ce sont des vues filtrées par groupe. Dans l'appli, chaque groupe a sa page. La feuille « Autres » n'est pas un groupe : c'est un regroupement de présentation du classeur, sans équivalent dans l'appli (chaque employeur isolé est un groupe à part entière).
- Feuilles « À évaluer » et « Abandonnées » → table `job_lead` (`state` = `TO_EVALUATE` / `DISCARDED`). Dans l'appli, un `JobLead` s'appelle une **piste**, à évaluer ou écartée (vocabulaire : `GLOSSARY.md`).
- Ligne 2 de chaque feuille (compteurs) → calculée, jamais stockée.
- Champs en texte libre : colonnes `text`, sans longueur maximale (le classeur réel dépasse largement 255 caractères) ; seul le nom d'un groupe est limité (100 caractères).

### `job_application` — entité `JobApplication`

| Colonne Excel | Colonne SQL | Type | Règle |
|---|---|---|---|
| # | `number` | `integer` unique, non nul | Numéro métier donné par la séquence `job_application_number_seq` ; immuable, jamais réutilisé (les notes citent « n° 26 ») ; attribué par le service, trous possibles |
| Groupe | `company_group_id` | FK non nulle | Maison mère ; créée à la volée à partir de son nom |
| Entreprise | `company` | `text` non nul | Texte libre : entité + service + site |
| Poste | `job_title` | `text` non nul | Texte libre : intitulé + référence de l'annonce |
| Statut | `status` | `varchar(30)` non nul + `CHECK` | Enum `ApplicationStatus` stocké en texte |
| Envoyée le | `sent_on` | `date` | Obligatoire sauf statuts `TO_SEND` et `WITHDRAWN` ; contrôlé par le service, sans `CHECK` (ADR 0001) |
| Échéance | `deadline_label` | `text` | Prochaine étape en clair (« Relance le 18/10 », « Refus si rien au 21/10 ») |
| Date échéance | `deadline_date` | `date` | Saisie à part, jamais déduite du libellé ; pilote les alertes ; nulle sur un statut clos (`CHECK`) |
| Prochaine action | `notes` | `text` | Journal de suivi daté, écarts, points de vigilance, actions à mener |
| Début | `start_period` | `text` | Texte libre : début + durée (« Févr. 2027, 6 mois ») |
| Canal | `channel` | `text` | Texte libre (site carrière, JobTeaser, cooptation…) ; autocomplétion sur les valeurs existantes |
| CV envoyé | `cv_sent` | `text` | Noms des fichiers CV / lettre envoyés |
| — | `id`, `created_at`, `updated_at` | `bigint` identité, `timestamptz` | Techniques |

### `job_lead` — entité `JobLead`

| Colonne Excel | Colonne SQL | Type | Règle |
|---|---|---|---|
| Entreprise | `company` | `text` non nul | |
| Poste | `job_title` | `text` non nul | |
| CV prévu (À évaluer) | `planned_cv` | `text` | |
| Remarque (À évaluer) | `remark` | `text` | |
| Motif (Abandonnées) | `discard_reason` | `text` | Renseigné et non vide si et seulement si `DISCARDED` (`CHECK`) |
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
- **Transitions** : libres, pas de machine à états ; changement rapide depuis la liste via `PATCH …/status`. Si le nouveau statut exige une date d'envoi et que la candidature n'en a pas, le front la demande dans un dialogue (préremplie à aujourd'hui, avec l'échéance proposée à + 14 jours) et l'envoie dans le `PATCH` ; sans date, le backend répond 400 et ne lit jamais l'horloge du serveur. Revenir à `TO_SEND` conserve `sent_on` ; rouvrir un statut clos ne restaure pas `deadline_date`.
- **Numéro** : le service lit `nextval` de la séquence et pose `number` à la création ; aucun `…Request` ne porte de `number`, seul l'import en impose un. Une création qui échoue laisse un trou dans la numérotation.
- **Groupes** : le nom est nettoyé (espaces de début et de fin) avant toute recherche ou création, la recherche ignore la casse et la graphie du groupe existant est conservée ; seule l'action « Renommer » la change. Renommer vers un nom déjà pris → 409, pas de fusion. Un groupe vide reste jusqu'à sa suppression manuelle.
- **Notes** : tronquées dans la table, texte intégral avec retours à la ligne dans la fiche.
- **Pistes (`JobLead`)** : « Promouvoir » crée une candidature `TO_SEND` (`company`, `job_title`, `planned_cv` → `cv_sent`, `remark` → `notes`, groupe demandé) et supprime la piste dans la même transaction ; réservé aux pistes à évaluer (409 sur une piste écartée). « Écarter » passe en `DISCARDED` avec motif obligatoire, en conservant `planned_cv` et `remark`. « Réévaluer » repasse en `TO_EVALUATE` et efface le motif.
- Vocabulaire : « Offre » et « Abandonnée » ne désignent que des statuts de candidature ; un `JobLead` est une « piste », « à évaluer » ou « écartée » (`GLOSSARY.md`).

## API REST (préfixe `/api`, JSON, dates `yyyy-MM-dd`)

```text
GET /applications · GET /applications/{id} · POST /applications · PUT /applications/{id} · DELETE /applications/{id}
PATCH /applications/{id}/status   {status, sentOn?, deadlineDate?}
GET /statuses                     code, label, category, ordre
GET /groups · PUT /groups/{id} (renommer) · DELETE /groups/{id} (409 si le groupe a des candidatures)
GET /leads?state= · POST /leads · PUT /leads/{id} · DELETE /leads/{id}
POST /leads/{id}/promote {groupName} · POST /leads/{id}/discard {reason} · POST /leads/{id}/restore
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
- `created_at` / `updated_at` posés par l'entité (`@PrePersist` / `@PreUpdate`), avec `DEFAULT now()` en SQL comme filet. Un champ texte facultatif vide est enregistré à `null`, jamais en chaîne vide.
- Tests : services en unitaire (Mockito), contrôleurs en `@WebMvcTest`, repositories et import en intégration sur Testcontainers (`postgres:18`).
- Spring Boot 4 diffère des 3.x : starters modulaires (`spring-boot-starter-webmvc`, `spring-boot-starter-flyway`, un starter `-test` par techno), Jackson 3 (paquets `tools.jackson`), `@MockitoBean` à la place de `@MockBean`. En cas de doute sur une API, lire la doc de la version installée plutôt que coder de mémoire.

## Conventions frontend

- Les règles Angular génériques sont dans `frontend/CLAUDE.md` (généré par le CLI) : ne pas les dupliquer ici. Fichiers sans suffixe de type (`applications-page.ts`, classe `ApplicationsPage`), créés avec `npx ng generate`.
- Interface en français, libellés en dur (pas d'i18n), locale `fr-FR` (dates `dd/MM/yyyy`). Routes en anglais : `/applications`, `/applications/:id`, `/groups`, `/groups/:id`, `/leads`, `/import`.
- Angular Material pour tous les composants (table triable, champs, datepicker, chips, dialog, snackbar). Couleurs via les variables `--mat-sys-*`, sauf la palette des statuts.
- Appels HTTP uniquement dans un service `…-api.ts` par feature, jamais dans un composant. Types TypeScript calqués sur les `…Response` du backend.
- Dates sans heure : chaîne `yyyy-MM-dd` de bout en bout ; ne jamais passer par `toISOString()` (le fuseau décale d'un jour).
- Dev : `proxy.conf.json` envoie `/api` vers `http://localhost:8081` ; aucune configuration CORS côté backend.
- Tests Vitest à côté du fichier (`*.spec.ts`), en priorité sur les services d'API et la logique d'affichage (tri, compteurs, alertes d'échéance).

## Import du classeur Excel

- `POST /api/import/excel` reçoit `Tracker_Candidatures.xlsx` depuis l'écran Import. Tout ou rien (une transaction) ; la réponse donne le nombre de lignes créées par table.
- « Toutes les candidatures » : repérer la ligne d'en-têtes (première cellule = `#`), lire les colonnes **par leur intitulé**, s'arrêter à la première ligne sans `#`. Ignorer les feuilles par employeur.
- « Statut » → enum par libellé exact ; un libellé inconnu rejette l'import en citant la ligne. Dates : cellules de type date uniquement, ne jamais analyser le texte de « Échéance ». Une candidature sans « Envoyée le » alors que son statut l'exige rejette l'import en citant la ligne.
- « À évaluer » et « Abandonnées » : ligne d'en-têtes repérée par sa première cellule (`Entreprise`), colonnes lues par leur intitulé, lignes vides ignorées ; elles alimentent `job_lead` (`TO_EVALUATE` / `DISCARDED`).
- Classeur de test : fictif et généré par POI dans le test (`*.xlsx` est ignoré par Git).
- Conserver les `number` du classeur, puis recaler la séquence sur le maximum. Refuser l'import si la base contient déjà des candidatures, sauf `mode=replace` (vide candidatures, pistes et groupes puis recharge ; ADR 0002).
- Recette : les compteurs affichés après import sont ceux de la ligne 2 de « Toutes les candidatures ».

## Garde-fous et méthode de travail

- Le classeur et la base contiennent mes **données personnelles réelles** : `data/`, `.env`, tout fichier `*.xlsx` et tout export restent hors Git. Tests et exemples : données fictives uniquement.
- Ne jamais lancer `docker compose down -v`, `docker volume rm`, `DROP`, `TRUNCATE` ni `flyway clean` sur la base de dev sans mon accord explicite. Les tests passent uniquement par Testcontainers.
- `compose.yaml` : trois services **sans profil**, `docker compose up -d` démarre tout. `postgres` (image `postgres:18`, pas de Dockerfile, volume nommé monté sur `/var/lib/postgresql` — depuis PostgreSQL 18, ce n'est plus `/var/lib/postgresql/data` — publié sur `127.0.0.1:5432`), `backend` (Dockerfile multi-étapes, non publié sur l'hôte) et `frontend` (Dockerfile + nginx, publié sur `127.0.0.1:8090`, proxy `/api` → `backend:8080`). Ports publiés sur `127.0.0.1` seulement. Base, utilisateur et mot de passe de dev : `tracker`, surchargeables par `.env` (ignoré par Git ; seul `.env.example` est versionné).
- **CI** (`.github/workflows/ci.yml`, GitHub Actions) : déclenchée sur tout push et sur les PR vers `main`. Job backend (`setup-java` Temurin 25, cache Maven, `./mvnw -B verify`), job frontend (`setup-node` 24, cache npm, `npm ci`, `npx ng test --no-watch`, `npx ng build`), job Docker (`docker compose build` puis test de fumée : `up -d`, attente de `http://localhost:8090`, `down`). Actions épinglées par version majeure, aucun secret, données fictives uniquement. Pas de CD : aucune image publiée, aucun déploiement.
- Aucune authentification (usage local) : ne rien exposer hors de `127.0.0.1`.
- Avancer par tranches verticales courtes (migration → entité → service → contrôleur → tests → écran) ; un commit par tranche, au format Conventional Commits.
- **Workflow Git** (jamais de commit ni de push sur `main`, y compris pour la documentation) :
  1. Créer une branche depuis `main` à jour : `git switch main && git pull && git switch -c <type>/<sujet>` (ex. `feat/backend-scaffold`, `docs/git-workflow`).
  2. Commiter sur la branche (Conventional Commits, sans co-auteur), puis la pousser : `git push -u origin <branche>`.
  3. Ouvrir une PR vers `main` avec `gh pr create` (corps sans mention de co-auteur ni de Claude).
  4. **Lier la PR à son issue** (obligatoire quand elle en a une, y compris une sous-issue) et le dire dans le corps de la PR :
     - la PR termine l'issue / sous-issue (critères d'acceptation remplis) : `Closes #n`, pour que la fusion la ferme ;
     - la PR n'en fait qu'une partie : `Part of #n` (pas de `Closes`) ;
     - sous-issue d'un parent : ajouter `Part of #parent` ; le parent n'est fermé (`Closes #parent`) que par la PR qui termine sa dernière sous-issue.
  5. **Fusion par l'agent** : la PR reste obligatoire (c'est la trace de ce qui a été fait), mais je n'ai pas besoin de la relire. Une fois la **CI verte** sur le dernier commit, fusionner la PR soi-même (merge commit depuis GitHub, pas de squash ni de rebase). Tant que la PR n'est pas fusionnée, pousser librement sur sa branche les corrections de CI et de tests. Si je laisse un commentaire de revue, le traiter sur la même branche avant de fusionner.
  6. Après la fusion : `git switch main && git pull`, suppression de la branche locale fusionnée, et vérifier que l'issue est bien fermée. Puis passer à l'issue suivante.
  - **Ne jamais fusionner une PR dont la CI est rouge ou en cours.** Si une issue demande une décision qui n'est pas dans ce fichier, `GLOSSARY.md` ou `docs/adr/` (choix d'architecture, nouvelle dépendance, règle métier ambiguë) : ne pas deviner, poser la question en commentaire de l'issue, lui mettre le label `needs-info` et passer à une autre issue.
  - Une branche et une PR par issue / tranche. Pas de `push --force`, pas de `reset --hard`, pas de `git branch -f main` sans mon accord explicite.
- Avant d'annoncer une tâche finie : tests de la partie touchée au vert (`./mvnw verify`, `npx ng test --no-watch`, `npx ng build`).
- Ordre de construction : 1) socle (backend et frontend générés, `compose.yaml` complet avec les Dockerfiles et la CI) 2) schéma + entités 3) API candidatures, groupes, statuts 4) import Excel 5) écran liste (table, compteurs, filtres, alertes) 6) fiche, formulaire, changement de statut 7) groupes, pistes, écran d'import 8) `README.md` et recette finale en conteneurs (`docker compose up -d` sur `http://localhost:8090`).
- Hors périmètre tant que je ne le demande pas : authentification, historique des statuts, pièces jointes, export Excel, notifications, pagination serveur, CD (publication d'images, déploiement distant).

## Agent skills

### Issue tracker

Les issues vivent dans GitHub Issues du dépôt (CLI `gh`). Voir `docs/agents/issue-tracker.md`.

### Triage labels

Vocabulaire par défaut : `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. Voir `docs/agents/triage-labels.md`.

### Domain docs

Single-context : `GLOSSARY.md` et `docs/adr/` à la racine. Voir `docs/agents/domain.md`.