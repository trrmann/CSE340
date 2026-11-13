SELECT
    project_id,
    organization_id,
    title,
    description,
    location,
    project_date
FROM {{schema}}.project
WHERE organization_id = $1
ORDER BY project_date;