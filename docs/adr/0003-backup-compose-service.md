# Sauvegarde automatique : un service Compose `backup`, pas un export Excel ni une tâche planifiée

La base PostgreSQL est la seule source de vérité : le classeur d'origine n'est qu'une photo du jour de l'import. Elle est sauvegardée par un quatrième service de `compose.yaml`, `backup`, sur l'image `postgres:18`. Il écrit un dump SQL (`pg_dump --clean --if-exists`) dans un dossier de l'hôte dès que la sauvegarde la plus récente a plus de 24 h, vérifie toutes les heures, garde les `BACKUP_KEEP` fichiers les plus récents et expose son état par un `healthcheck`. La même commande sert à la demande (`docker compose exec backup backup-now`) ; la restauration passe par `scripts/restore.sh`, lancé à la main.

Le poste n'est pas allumé en continu et l'appli ne tourne que quand Docker tourne : la sauvegarde doit donc partir avec `docker compose up -d`, sans rien installer ni configurer ailleurs, et se rattraper au démarrage plutôt que viser une heure fixe. L'image du serveur fournit déjà `pg_dump` et `psql` dans la bonne version : aucune dépendance nouvelle, aucun Dockerfile.

## Considered Options

- **Export Excel** : un fichier lisible sans l'appli, mais il faut écrire et maintenir l'inverse de l'import, il ne porte ni l'historique Flyway ni l'état de la séquence des numéros, et il reste hors périmètre. Un dump SQL restaure la base à l'identique.
- **Tâche planifiée Windows** qui lance `pg_dump` : rien à ajouter à Compose, mais la configuration vit hors du dépôt, ne suit pas un changement de poste, ne se teste pas en CI, et une heure fixe est manquée quand le poste est éteint.
- **Tâche dans le backend** (`@Scheduled`) : il faudrait `pg_dump` dans l'image Java ou un export écrit à la main, et la sauvegarde ne tournerait pas en dev local, où le backend ne tourne pas en conteneur. Elle dépendrait aussi de la bonne santé de l'appli qu'elle protège.

## Consequences

- `docker compose up -d` démarre quatre services ; en dev local, `docker compose up -d postgres backup` suffit à être sauvegardé, sans conflit de port.
- Avec le dossier par défaut (`./data/backups/`), les sauvegardes sont sur le même disque que la base : elles protègent d'une erreur de manipulation (import en `mode=replace`, suppression), pas d'une panne du disque. `BACKUP_DIR` permet de viser un autre disque ou un dossier synchronisé.
- Les dumps contiennent les données personnelles en clair, sans chiffrement : le dossier reste hors Git.
- Jusqu'à une journée de saisie peut être perdue ; une sauvegarde à la demande avant toute opération risquée réduit cette fenêtre.
- La restauration rejoue le dump dans une seule transaction : un fichier invalide laisse la base intacte. Elle n'est jamais lancée par l'appli ni par un agent sans accord explicite.
- Le nom des fichiers est `tracker-AAAA-MM-JJ_HHMM.sql` ; quand la minute est déjà prise (sauvegarde à la demande, sauvegarde de sécurité d'une restauration), les secondes sont ajoutées (`…_HHMMSS.sql`) pour ne jamais écraser une sauvegarde existante.
- L'état de la sauvegarde est visible par `docker compose ps` et, dans l'appli, par la date de la dernière sauvegarde en barre de titre, en alerte si elle est trop ancienne ou si la dernière tentative a échoué : le backend lit le dossier monté en lecture seule, sans jamais sauvegarder ni restaurer.
