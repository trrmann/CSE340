INSERT INTO {{schema}}.project_category (project_id, category_id)
SELECT $1, unnest($2::int[]);
