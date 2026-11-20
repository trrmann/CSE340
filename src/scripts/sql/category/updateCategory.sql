UPDATE {{schema}}.category
SET name = $1
WHERE category_id = $2
RETURNING category_id;
