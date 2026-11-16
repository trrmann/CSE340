DELETE FROM {{schema}}.category
WHERE category_id = $1
RETURNING category_id;
