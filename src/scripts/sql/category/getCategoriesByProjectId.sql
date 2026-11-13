SELECT c.category_id, c.name
FROM {{schema}}.category c
JOIN {{schema}}.project_category pc ON pc.category_id = c.category_id
WHERE pc.project_id = $1
ORDER BY c.name;
