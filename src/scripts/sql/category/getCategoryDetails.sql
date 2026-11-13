SELECT category_id, name
FROM {{schema}}.category
WHERE category_id = $1;
