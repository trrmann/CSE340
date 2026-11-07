-- Nothing references project_category, so a plain truncate is always safe
TRUNCATE TABLE {{schema}}.project_category;
