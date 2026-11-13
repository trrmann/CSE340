SELECT p.project_id, p.organization_id, p.title, p.description, p.location, p.project_date,
       o.name AS organization_name
FROM {{schema}}.project p
JOIN {{schema}}.organization o ON o.organization_id = p.organization_id
WHERE p.project_date >= CURRENT_DATE
ORDER BY p.project_date
LIMIT $1;