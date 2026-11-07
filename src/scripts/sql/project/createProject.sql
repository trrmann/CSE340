-- Requires: {{schema}}.organization (foreign key target)
CREATE TABLE IF NOT EXISTS {{schema}}.project (
    project_id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES {{schema}}.organization(organization_id),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    project_date DATE NOT NULL
);
-- Foreign keys are not indexed automatically in PostgreSQL; this speeds up the join
CREATE INDEX IF NOT EXISTS idx_project_organization_id ON {{schema}}.project(organization_id);
