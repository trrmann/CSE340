/**
 * One provisioning scenario, run in its own process by provisioningTest.mjs (provisioning is
 * cached once per process, so every scenario needs a fresh one). DB_SCHEMA must point at a
 * temporary test schema. Prints one line: RESULT <json>.
 *
 * Usage: node --env-file=.env provisioningScenario.mjs <scenario>
 */
import pg from 'pg';
import { PgDBConnection } from '../../../../models/db.js';
import { OrganizationsModel } from '../../../../models/organizations.js';
import { ProjectsModel } from '../../../../models/projects.js';
import { CategoriesModel } from '../../../../models/categories.js';
import '../../../../models/projectCategories.js';

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
    case 'structure':
      result.foreignKeys = (
        await sql(`SELECT conrelid::regclass::text AS tbl, confrelid::regclass::text AS ref
                   FROM pg_constraint WHERE contype = 'f' AND connamespace = '${quoted}'::regnamespace
                   ORDER BY 1, 2`)
      ).map((r) => `${r.tbl.split('.').pop()}->${r.ref.split('.').pop()}`);
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
