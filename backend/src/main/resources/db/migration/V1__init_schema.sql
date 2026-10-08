-- Groupes : maison mère d'une candidature
CREATE TABLE company_group (
    id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name varchar(100) NOT NULL,
    -- nom nettoyé de ses espaces de début et de fin, et non vide
    CONSTRAINT ck_company_group_name_trimmed CHECK (name = btrim(name) AND name <> '')
);

-- unicité du nom sans tenir compte de la casse
CREATE UNIQUE INDEX uq_company_group_name_lower ON company_group (lower(name));

-- Numéro métier des candidatures : lu par le service, jamais réutilisé
CREATE SEQUENCE job_application_number_seq AS integer;

CREATE TABLE job_application (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    number           integer      NOT NULL DEFAULT nextval('job_application_number_seq'),
    company_group_id bigint       NOT NULL,
    company          varchar(255) NOT NULL,
    job_title        varchar(255) NOT NULL,
    status           varchar(30)  NOT NULL,
    sent_on          date,
    deadline_label   varchar(255),
    deadline_date    date,
    notes            text,
    start_period     varchar(100),
    channel          varchar(255),
    cv_sent          varchar(255),
    created_at       timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT uq_job_application_number UNIQUE (number),
    CONSTRAINT fk_job_application_company_group
        FOREIGN KEY (company_group_id) REFERENCES company_group (id) ON DELETE RESTRICT,
    CONSTRAINT ck_job_application_status CHECK (status IN (
        'OFFER', 'INTERVIEW', 'UNDER_REVIEW', 'IN_EVALUATION', 'PRE_SELECTION', 'SELECTION',
        'PENDING', 'TO_SEND', 'REJECTED', 'WITHDRAWN')),
    -- pas d'échéance sur un statut clos ; aucune contrainte sur sent_on (ADR 0001)
    CONSTRAINT ck_job_application_closed_without_deadline
        CHECK (status NOT IN ('REJECTED', 'WITHDRAWN') OR deadline_date IS NULL)
);

ALTER SEQUENCE job_application_number_seq OWNED BY job_application.number;

CREATE INDEX ix_job_application_company_group ON job_application (company_group_id);
