DELETE FROM {{schema}}.project
WHERE project_id = $1
RETURNING project_id;
