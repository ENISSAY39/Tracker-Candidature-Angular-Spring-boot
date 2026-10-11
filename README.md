# Tracker de candidatures

Application web **mono-utilisateur, en local**, qui remplace mon classeur Excel de suivi de candidatures (stage de fin d'études). On y retrouve :

- les candidatures numérotées, rattachées à un groupe (la maison mère), avec leur statut, leur échéance de relance et des notes de suivi ;
- une page par groupe, l'équivalent des feuilles par employeur du classeur ;
- un vivier de pistes, à évaluer ou écartées.

Le classeur se charge en une fois depuis l'écran **Import**.

> **Mise en garde**
>
> - **Aucune authentification** : l'application est faite pour un usage local. Les ports sont publiés sur `127.0.0.1` seulement ; ne les exposez pas sur le réseau.
> - **Données personnelles** : `data/` (classeur, sauvegardes), `.env` et tout fichier `*.xlsx` restent hors Git (`.gitignore`). Ne les commitez pas, ne les collez pas dans une issue.
> - **Commandes qui détruisent les données** : `docker compose down -v`, `docker volume rm tracker_postgres-data`, `dropdb`, `DROP`, `TRUNCATE`, `flyway clean`, ainsi qu'un import en mode remplacement. Faites une sauvegarde avant : `docker compose exec backup backup-now`.

## Démarrage en conteneurs

Prérequis : Docker avec Docker Compose (Docker Desktop sous Windows). Rien d'autre à installer.

```bash
docker compose up -d        # construit puis démarre postgres, backup, backend et frontend
docker compose ps           # les quatre services doivent être « Up » (postgres et backup « healthy »)
```

L'application est sur **http://localhost:8090**.

- Le frontend (nginx) relaie `/api` vers le backend.
- Le backend n'est pas publié sur l'hôte.
- La base est publiée sur `127.0.0.1:5432`.
- Le service `backup` sauvegarde la base dans `data/backups/` (voir « Sauvegarde et restauration ») ; il ne publie aucun port.
- La barre de titre affiche la date de la dernière sauvegarde.

Arrêt :

```bash
docker compose stop         # arrête les conteneurs
docker compose down         # arrête et supprime les conteneurs ; le volume de la base est conservé
```

Les données vivent dans le volume nommé `tracker_postgres-data` : elles survivent à `stop`, `down` et à un redémarrage du poste. Seul `docker compose down -v` (ou la suppression du volume) les efface.

## Configuration

Base, utilisateur et mot de passe valent `tracker` par défaut. Pour changer ces valeurs ou celles des sauvegardes, copiez le modèle et éditez-le avant le premier démarrage :

```bash
cp .env.example .env
```

| Variable | Défaut | Rôle |
|---|---|---|
| `POSTGRES_DB` | `tracker` | Nom de la base |
| `POSTGRES_USER` | `tracker` | Utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | `tracker` | Mot de passe |
| `BACKUP_DIR` | `./data/backups` | Dossier de l'hôte où vont les sauvegardes |
| `BACKUP_KEEP` | `90` | Nombre de sauvegardes conservées |

Docker Compose lit `.env` à la racine ; le backend lancé en local aussi (`spring.config.import`). Le service `backup` lit les mêmes variables `POSTGRES_*` que la base. Changer `POSTGRES_*` après la création du volume ne modifie pas une base déjà initialisée.

## Import du classeur

1. Ouvrir **Import** dans la navigation, choisir le classeur `.xlsx`, cliquer sur « Importer ».
2. L'écran affiche le nombre de groupes, de candidatures et de pistes créés. Les compteurs de la liste des candidatures doivent alors être ceux de la ligne 2 de la feuille « Toutes les candidatures ».

Règles :

- **Tout ou rien** : à la moindre anomalie, rien n'est écrit. Le motif s'affiche dans la page et cite la feuille et, le cas échéant, la ligne à corriger (statut inconnu, date d'envoi manquante, cellule qui n'est pas une date, numéro en double, feuille ou colonne introuvable…).
- **Feuilles lues**, toutes trois obligatoires :
  - « Toutes les candidatures » donne les candidatures et les groupes ;
  - « À évaluer » et « Abandonnées » donnent les pistes, à évaluer ou écartées ;
  - les autres feuilles sont ignorées.
- **Numéros** : ceux du classeur sont conservés ; la candidature créée ensuite prend le numéro suivant le plus grand.
- **Base déjà remplie** : si la base contient au moins une candidature, l'import est refusé. L'écran propose alors le **mode remplacement**, également disponible par la case « Remplacer les données existantes ». Ce mode supprime candidatures, pistes et groupes puis recharge le classeur, dans une seule transaction : si le classeur est refusé, rien n'est effacé. Il détruit tout ce qui a été saisi dans l'application depuis le dernier import : **faites une sauvegarde avant** avec `docker compose exec backup backup-now` (ADR 0002) ; le dialogue de confirmation le rappelle.
- **Taille** : 10 Mo au plus.

## Sauvegarde et restauration

La base est la seule source de vérité : le classeur n'est qu'une photo du jour de l'import. Le service `backup` (image `postgres:18`) la sauvegarde tout seul dès que l'appli tourne (ADR 0003).

- **Automatique** : au démarrage, puis toutes les heures, une sauvegarde est faite si la plus récente a plus de 24 h (ou s'il n'y en a aucune). Pas d'heure fixe : le poste n'a pas besoin d'être allumé en continu.
- **Fichiers** : `data/backups/tracker-AAAA-MM-JJ_HHMM.sql` (dossier ignoré par Git), en SQL lisible (`pg_dump --clean --if-exists`). Si la minute est déjà prise, les secondes sont ajoutées (`…_HHMMSS.sql`). Un dump n'apparaît dans le dossier qu'une fois complet.
- **Rétention** : les `BACKUP_KEEP` fichiers les plus récents sont gardés (90 par défaut) ; les plus anciens sont supprimés après une sauvegarde réussie.
- **Dans l'appli** : la barre de titre affiche « Dernière sauvegarde : hier 14:32 ». L'indicateur passe en alerte quand la plus récente a plus de 48 h, qu'il n'y en a aucune, que la dernière tentative a échoué (« dernière tentative en échec » ; le détail est dans `docker compose logs backup`) ou que le dossier des sauvegardes est illisible (« Sauvegardes illisibles » : le montage du conteneur est cassé) ; il est relu toutes les heures et quand l'onglet redevient visible, par exemple au réveil du poste. Les lecteurs d'écran n'annoncent que le passage en alerte et le retour à la normale. Le backend lit pour cela le dossier des sauvegardes, monté en lecture seule (`GET /api/backup/status`) : l'appli ne sauvegarde et ne restaure rien, ces actions restent des commandes.
- **Surveillance** : `docker compose ps` affiche `backup` en `unhealthy` si la sauvegarde la plus récente a plus de 48 h ou si la dernière tentative a échoué ; le détail est dans `docker compose logs backup`.

Redémarrer l'appli ne force pas une sauvegarde : tant que la plus récente a moins de 24 h, `docker compose up -d` ou un redémarrage du poste ne crée aucun fichier. Ce qui est saisi entre-temps n'est donc sauvegardé que le lendemain.

Pour **forcer une sauvegarde tout de suite**, quel que soit l'âge de la dernière :

```bash
docker compose exec backup backup-now
```

À lancer après une saisie importante, et toujours **avant un import en mode remplacement** ou toute opération risquée. Le fichier créé compte dans la rétention comme les autres.

Restauration (Git Bash, depuis la racine du dépôt) : elle **remplace** tout le contenu de la base par celui du fichier.

```bash
scripts/restore.sh data/backups/tracker-AAAA-MM-JJ_HHMM.sql
```

Le script demande de taper « restaurer », fait d'abord une sauvegarde de sécurité de l'état actuel, puis rejoue le fichier en une seule transaction : si le fichier est invalide, rien n'est modifié. Flyway retrouve son historique dans la sauvegarde et la numérotation reprend là où en était la séquence sauvegardée. Rechargez ensuite la page de l'application.

Limites acceptées :

- avec le dossier par défaut, les sauvegardes sont sur le même disque que la base ; pointez `BACKUP_DIR` vers un autre disque ou un dossier synchronisé pour vous protéger d'une panne ;
- les fichiers `.sql` contiennent les données personnelles en clair, sans chiffrement ;
- jusqu'à une journée de saisie peut être perdue en cas d'incident ;
- une sauvegarde se restaure sur la version de l'appli qui l'a produite : rejouée après une migration du schéma, elle laisse en place les tables ajoutées depuis, et Flyway refuse alors de démarrer.

## Développement local

Prérequis : JDK 25, Node.js 24 LTS (≥ 24.15) et Docker.

- Vérifiez `java -version` : le `JAVA_HOME` système peut encore pointer sur un JDK 21.
- Sous Windows (Git Bash) : `export JAVA_HOME="/c/Program Files/Java/jdk-25.0.4.1"; export PATH="$JAVA_HOME/bin:$PATH"`.
- PowerShell : `.\mvnw.cmd` à la place de `./mvnw`.

En développement, ne démarrez que la base et sa sauvegarde, pour ne pas entrer en conflit de ports avec les conteneurs `backend` et `frontend` :

```bash
docker compose up -d postgres backup          # base → 127.0.0.1:5432, et sa sauvegarde automatique (aucun port)
cd backend && ./mvnw spring-boot:run          # API → http://localhost:8081
cd frontend && npm ci && npm start            # http://localhost:4200, proxy /api → :8081
```

- L'API locale écoute sur **8081**, le port 8080 étant pris sur le poste de dev ; dans son conteneur, elle écoute sur 8080.
- `spring-boot:run` et `npm start` sont bloquants : un terminal chacun.
- Le proxy (`frontend/proxy.conf.json`) évite toute configuration CORS.
- L'API locale lit les sauvegardes dans `../data/backups` (propriété `tracker.backup.directory`). Si `BACKUP_DIR` vise un autre dossier, donnez-le aussi à l'API : `TRACKER_BACKUP_DIRECTORY=/chemin ./mvnw spring-boot:run`. Dossier absent : la barre de titre affiche « Sauvegarde : état indisponible », sans alerte, car en local l'API ne voit pas forcément le dossier (propriété `tracker.backup.required`, faux par défaut ; les conteneurs la passent à vrai, et un dossier illisible y met alors l'indicateur en alerte).

Tests et build :

```bash
cd backend && ./mvnw verify                   # tous les tests ; Docker doit tourner (Testcontainers, postgres:18)
cd backend && ./mvnw test -Dtest=JobApplicationServiceTest   # une seule classe
cd frontend && npx ng test --no-watch         # Vitest, un seul passage
cd frontend && npx ng build                   # doit passer sans erreur
```

Les tests n'utilisent que des données fictives, dont des classeurs générés en mémoire ; aucun fichier `*.xlsx` n'est versionné.

## Stack

- **Backend** :
  - Java 25 (LTS) et Spring Boot 4.1 (Web MVC, Data JPA, Validation, Flyway), Maven wrapper ;
  - Apache POI pour lire le classeur ;
  - package racine `io.github.enissay39.tracker`.
- **Base** : PostgreSQL 18 ; schéma géré par les migrations Flyway uniquement (`ddl-auto: validate`).
- **Frontend** : Angular 22 (standalone, signals, zoneless, Signal Forms), Angular Material 22 (thème M3), SCSS, TypeScript 6, npm.
- **Tests** : JUnit, AssertJ, Mockito, Testcontainers ; Vitest via `ng test`.
- **Conteneurs** :
  - `postgres:18`, pour la base et pour le service de sauvegarde `backup` ;
  - backend en Dockerfile multi-étapes (Temurin 25) ;
  - frontend servi par nginx non root, qui relaie `/api`.
- **Volontairement absents** : Lombok, MapStruct, Spring Security, H2, NgRx, Tailwind.

## Architecture en bref

- **Backend** (`backend/`) : un package par fonctionnalité.
  - Packages : `jobapplication`, `companygroup`, `joblead`, `excelimport`, `backup` (date de la dernière sauvegarde, en lecture seule), ainsi que `common` pour les erreurs `ProblemDetail` et les exceptions métier.
- **API REST** sous `/api`, en JSON, dates au format `yyyy-MM-dd`, sans pagination (moins de 1 000 lignes).
- **Frontend** (`frontend/`) : `core/` (mise en page, indicateur de sauvegarde, intercepteur d'erreurs, locale fr), `shared/` (badges, échéances, dialogue de confirmation) et un dossier par écran sous `features/`.
  - Écrans : `applications`, `groups`, `leads`, `import`, chargés à la demande.

Le détail du modèle de données, des règles métier, de l'API et des conventions de code est dans `CLAUDE.md`.

## Intégration continue

GitHub Actions (`.github/workflows/ci.yml`), sur chaque push et sur les PR vers `main` :

- **backend** : `./mvnw -B verify` (Temurin 25, Testcontainers) ;
- **frontend** : `npm ci`, `npx ng test --no-watch`, `npx ng build` (Node 24) ;
- **docker** : `docker compose build`, `docker compose up -d`, attente de `http://localhost:8090`, sauvegarde puis restauration de données fictives, lecture de l'état des sauvegardes par l'API, puis `docker compose down`.

Il n'y a pas de CD : aucune image n'est publiée et rien n'est déployé. Aucun secret, données fictives uniquement.

## Limites connues et hors périmètre

- Un seul utilisateur, sans authentification, sur le poste local.
- Sauvegardes sur le même disque que la base par défaut, non chiffrées, au plus une par jour sans action manuelle (ADR 0003).
- L'import ne fusionne pas : premier chargement, ou remplacement complet. Un import sans remplacement sur une base qui ne contient que des pistes ajoute celles du classeur, avec des doublons possibles (ADR 0002).
- Hors périmètre tant que ce n'est pas demandé : historique des statuts, pièces jointes, export Excel, notifications, pagination serveur, déploiement distant.

## Documentation

- [`CLAUDE.md`](CLAUDE.md) : modèle de données, règles métier, API, conventions, commandes et méthode de travail.
- [`GLOSSARY.md`](GLOSSARY.md) : vocabulaire (candidature, groupe, piste à évaluer ou écartée…).
- [`docs/adr/`](docs/adr/) : décisions d'architecture (invariants entre colonnes, périmètre du mode remplacement, sauvegarde automatique).
- [`docs/phases.md`](docs/phases.md) : plan de construction par phases.
