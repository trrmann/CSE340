-- Fails if project_category references project; use cascadeTruncateProject or truncate everything together
TRUNCATE TABLE {{schema}}.project RESTART IDENTITY;
