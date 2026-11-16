/**
 * One provisioning scenario, run in its own process by provisioningTest.mjs (provisioning is
 * cached once per process, so every scenario needs a fresh one). DB_SCHEMA must point at a
 * temporary test schema. Prints one line: RESULT <json>.
 *
 * Usage: node --env-file=.env provisioningScenario.mjs <scenario>
 */
import pg from 'pg';
import { PgDBConnection } from './../library/db.mjs';
import { OrganizationsModel } from './../models/organizations.mjs';
import { ProjectsModel } from './../models/projects.mjs';
import { CategoriesModel } from './../models/categories.mjs';
import './../models/projectCategories.mjs';

const TABLES = ['organization', 'project', 'category', 'project_category'];
const scenario = process.argv[2];
const schema = process.env.DB_SCHEMA;
const raw = new pg.Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false },
});
const quoted = pg.escapeIdentifier(schema);
const sql = async (text) => (await raw.query(text)).rows;

// Row count per table, or null when the table does not exist.
const counts = async () => {
  const out = {};
  for (const table of TABLES) {
    const exists = (await sql(`SELECT to_regclass('${quoted}.${table}') IS NOT NULL AS e`))[0].e;
    out[table] = exists
      ? (await sql(`SELECT count(*)::int AS n FROM ${quoted}.${pg.escapeIdentifier(table)}`))[0].n
      : null;
  }
  return out;
};

// Capture the provisioning log lines ("1. OrganizationsModel (organization): Table ..., Data ...").
const steps = [];
const log = console.log;
console.log = (...args) => {
  const line = args.join(' ');
  const match = line.match(/^(\d+)\. \w+ \((\w+)\): Table (.+), Data (.+)$/);
  if (match) {
    steps.push({ order: Number(match[1]), table: match[2], table_: match[3], data: match[4] });
  }
};

const result = { scenario };
try {
  switch (scenario) {
    case 'provision':
      result.rows = (await new ProjectsModel().getAllProjects()).length;
      break;
    case 'removeProjectCascade':
      await sql(`ALTER TABLE ${quoted}.project
                 DROP CONSTRAINT IF EXISTS project_organization_id_fkey`);
      await sql(`ALTER TABLE ${quoted}.project
                 ADD CONSTRAINT project_organization_id_fkey
                 FOREIGN KEY (organization_id)
                 REFERENCES ${quoted}.organization(organization_id)`);
      break;
    case 'cascadeDelete': {
      const client = await raw.connect();
      try {
        await client.query('BEGIN');
        const organization = (
          await client.query(
            `SELECT organization_id FROM ${quoted}.organization ORDER BY 1 LIMIT 1`
          )
        ).rows[0];
        const projectIds = (
          await client.query(
            `SELECT project_id FROM ${quoted}.project WHERE organization_id = $1`,
            [organization.organization_id]
          )
        ).rows.map((row) => row.project_id);
        await client.query(`DELETE FROM ${quoted}.organization WHERE organization_id = $1`, [
          organization.organization_id,
        ]);
        const remainingProjects = (
          await client.query(
            `SELECT count(*)::int AS count FROM ${quoted}.project WHERE project_id = ANY($1::int[])`,
            [projectIds]
          )
        ).rows[0].count;
        const remainingCategoryLinks = (
          await client.query(
            `SELECT count(*)::int AS count FROM ${quoted}.project_category WHERE project_id = ANY($1::int[])`,
            [projectIds]
          )
        ).rows[0].count;
        result.cascaded =
          projectIds.length > 0 && remainingProjects === 0 && remainingCategoryLinks === 0;
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
      break;
    }
    case 'structure':
      result.foreignKeys = (
        await sql(`SELECT conrelid::regclass::text AS tbl, confrelid::regclass::text AS ref,
                          confdeltype
                   FROM pg_constraint WHERE contype = 'f' AND connamespace = '${quoted}'::regnamespace
                   ORDER BY 1, 2`)
      ).map((r) => `${r.tbl.split('.').pop()}->${r.ref.split('.').pop()}:${r.confdeltype}`);
      result.indexes = (
        await sql(`SELECT indexname FROM pg_indexes
                   WHERE schemaname = '${schema}' AND indexname LIKE 'idx_%' ORDER BY 1`)
      ).map((r) => r.indexname);
      break;
    case 'truncateAll':
      result.truncated = await PgDBConnection.truncateAll();
      result.afterTruncate = await counts();
      await new OrganizationsModel().getAllOrganization();
      result.ids = (
        await sql(
          `SELECT min(organization_id) AS lo, max(organization_id) AS hi FROM ${quoted}.organization`
        )
      )[0];
      break;
    case 'dropAll':
      result.dropped = await PgDBConnection.dropAll();
      result.afterDrop = await counts();
      await new CategoriesModel().getAllCategories();
      break;
    case 'dropJoinTable':
      await sql(`DROP TABLE ${quoted}.project_category`);
      await new ProjectsModel().getAllProjects();
      break;
    case 'emptyJoinTable':
      await sql(`TRUNCATE ${quoted}.project_category`);
      await new ProjectsModel().getAllProjects();
      break;
    case 'missingDataPrereq':
      await sql(`TRUNCATE ${quoted}.project_category, ${quoted}.project, ${quoted}.category,
                 ${quoted}.organization RESTART IDENTITY`);
      OrganizationsModel.prototype.defaultLoad = async () => true; // "forgets" to load organizations
      await new ProjectsModel().getAllProjects();
      break;
    case 'missingTablePrereq':
      await sql(
        `DROP TABLE IF EXISTS ${quoted}.project_category, ${quoted}.project, ${quoted}.organization`
      );
      OrganizationsModel.prototype.hasTable = async () => true; // claims to exist but does not
      OrganizationsModel.prototype.hasData = async () => true;
      await new ProjectsModel().getAllProjects();
      break;
    // Configuration checks: a deliberately bad model is registered before the first query.
    case 'configLowerOrder':
      PgDBConnection.registerProvisioner(
        0,
        class EarlyModel extends PgDBConnection {
          static tableName = 'early_test';
          static requires = ['organization']; // order 0 < organization's 1: invalid
        }
      );
      await new ProjectsModel().getAllProjects();
      break;
    case 'configDuplicateOrder':
      PgDBConnection.registerProvisioner(
        3,
        class DuplicateModel extends PgDBConnection {
          static tableName = 'duplicate_test';
          static requires = [];
        }
      );
      await new ProjectsModel().getAllProjects();
      break;
    case 'configMissingModel':
      PgDBConnection.registerProvisioner(
        9,
        class OrphanModel extends PgDBConnection {
          static tableName = 'orphan_test';
          static requires = ['not_registered'];
        }
      );
      await new ProjectsModel().getAllProjects();
      break;
    default:
      throw new Error(`unknown scenario ${scenario}`);
  }
} catch (error) {
  result.error = error.message;
}
result.steps = steps;
result.counts = await counts();
console.log = log;
console.log(`RESULT ${JSON.stringify(result)}`);
await raw.end();
process.exit(0);
