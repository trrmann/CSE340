DELETE FROM {{schema}}.organization
WHERE organization_id = $1
RETURNING name;
