-- Requires: {{schema}}.project and {{schema}}.category (foreign key targets)
-- Many-to-many join table: one row per (project, category) link
CREATE TABLE IF NOT EXISTS {{schema}}.project_category (
    project_id INTEGER NOT NULL REFERENCES {{schema}}.project(project_id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES {{schema}}.category(category_id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, category_id)
);
-- The composite primary key already indexes lookups by project_id;
-- this index speeds up lookups by category_id (e.g. "all projects in a category")
CREATE INDEX IF NOT EXISTS idx_project_category_category_id ON {{schema}}.project_category(category_id);
