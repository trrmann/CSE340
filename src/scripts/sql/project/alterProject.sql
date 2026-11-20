DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = '{{schema}}.project'::regclass
      AND conname = 'project_organization_id_fkey'
      AND confdeltype = 'c'
  ) THEN
    ALTER TABLE {{schema}}.project
      DROP CONSTRAINT IF EXISTS project_organization_id_fkey;

    ALTER TABLE {{schema}}.project
      ADD CONSTRAINT project_organization_id_fkey
      FOREIGN KEY (organization_id)
      REFERENCES {{schema}}.organization(organization_id)
      ON DELETE CASCADE;
  END IF;
END
$migration$;