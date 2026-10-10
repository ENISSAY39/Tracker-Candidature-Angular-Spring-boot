-- Champs en texte libre : plus de longueur maximale, comme notes et remark (le classeur réel dépasse 255 caractères).
-- Le nom d'un groupe reste limité à 100 caractères : il porte un index unique.
ALTER TABLE job_application
    ALTER COLUMN company        TYPE text,
    ALTER COLUMN job_title      TYPE text,
    ALTER COLUMN deadline_label TYPE text,
    ALTER COLUMN start_period   TYPE text,
    ALTER COLUMN channel        TYPE text,
    ALTER COLUMN cv_sent        TYPE text;

ALTER TABLE job_lead
    ALTER COLUMN company    TYPE text,
    ALTER COLUMN job_title  TYPE text,
    ALTER COLUMN planned_cv TYPE text;
