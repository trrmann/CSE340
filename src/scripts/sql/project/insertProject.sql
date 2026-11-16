INSERT INTO {{schema}}.project (title, description, location, project_date, organization_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING project_id;
