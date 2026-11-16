UPDATE {{schema}}.project
SET title = $1, description = $2, location = $3, project_date = $4, organization_id = $5
WHERE project_id = $6
RETURNING project_id;
