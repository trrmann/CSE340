INSERT INTO {{schema}}.category (name)
VALUES ($1)
RETURNING category_id;
