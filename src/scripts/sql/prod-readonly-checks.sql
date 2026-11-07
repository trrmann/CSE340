-- Read-only production checks for prod-readonly-check.sh: row COUNTS only, never row contents.
-- :schema is the app schema (DB_SCHEMA from .env, default public), passed by the script.
-- Run by psql (not by the app), so it uses psql variables instead of {{schema}}.

-- Which CSE340 tables exist in the app schema.
SELECT n.nspname AS schema, c.relname AS table_name
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname = :'schema'
  AND c.relname IN ('organization', 'project', 'category', 'project_category')
ORDER BY 1, 2;

-- Row count per table (0 rows listed for a missing table would hide a problem, so missing
-- tables are reported as -1). release.sh compares these before and after a release.
SELECT t.name AS source,
       CASE WHEN to_regclass(format('%I.%I', :'schema', t.name)) IS NULL THEN -1
            ELSE (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM %I.%I', :'schema', t.name), false, true, '')))[1]::text::int
       END AS count
FROM (VALUES (1, 'organization'), (2, 'project'), (3, 'category'), (4, 'project_category')) AS t(ord, name)
ORDER BY t.ord;

-- Who this session is, and whether it can use the app schema.
SELECT session_user AS login, current_user AS acting_as, :'schema' AS schema,
       has_schema_privilege(:'schema', 'USAGE') AS can_use_schema,
       has_schema_privilege(:'schema', 'CREATE') AS can_create_in_schema,
       current_setting('transaction_read_only') AS read_only_session;
