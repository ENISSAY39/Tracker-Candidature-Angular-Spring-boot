-- Pistes : annonces repérées, à évaluer ou écartées
CREATE TABLE job_lead (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company        varchar(255) NOT NULL,
    job_title      varchar(255) NOT NULL,
    planned_cv     varchar(255),
    remark         text,
    discard_reason text,
    state          varchar(20)  NOT NULL,
    created_at     timestamptz  NOT NULL DEFAULT now(),
    updated_at     timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT ck_job_lead_state CHECK (state IN ('TO_EVALUATE', 'DISCARDED')),
    -- motif renseigné et non vide (au moins un caractère hors espaces) si et seulement si la piste est écartée (ADR 0001)
    CONSTRAINT ck_job_lead_discard_reason CHECK (
        (state = 'DISCARDED' AND discard_reason IS NOT NULL AND discard_reason ~ '[^[:space:]]')
        OR (state <> 'DISCARDED' AND discard_reason IS NULL))
);
