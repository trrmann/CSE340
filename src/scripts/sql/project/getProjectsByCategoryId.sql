SELECT p.project_id, p.organization_id, p.title, p.description, p.location, p.project_date,
       o.name AS organization_name
FROM {{schema}}.project p
JOIN {{schema}}.project_category pc ON pc.project_id = p.project_id
JOIN {{schema}}.organization o ON o.organization_id = p.organization_id
WHERE pc.category_id = $1
ORDER BY p.project_date;
