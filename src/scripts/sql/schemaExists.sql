SELECT EXISTS (
    SELECT 1
    FROM information_schema.schemata
    WHERE schema_name = $1
) AS schema_exists;
