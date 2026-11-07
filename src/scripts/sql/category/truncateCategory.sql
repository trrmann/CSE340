-- Fails if project_category references category; use cascadeTruncateCategory or truncate everything together
TRUNCATE TABLE {{schema}}.category RESTART IDENTITY;
