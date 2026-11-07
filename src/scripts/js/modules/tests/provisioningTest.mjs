/**
 * Database test suite: provisioning order, prerequisites, teardown order and setup.sql sync.
 *
 * Uses ONLY the class database (DB_URL). Every test runs in temporary schemas inside it
 * (cse340_test_*), which are dropped afterwards, even when a test fails. The app's own schema
 * (DB_SCHEMA, default public) is never touched: the suite refuses to run if a test schema
 * name could collide with it.
 */
import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';
import { TestResults } from './testResults.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(HERE, '../../../../..');
const SCENARIO = path.join(HERE, 'provisioningScenario.mjs');
const EXPECTED = { organization: 3, project: 15, category: 4, project_category: 23 };
const ORDER = ['organization', 'project', 'category', 'project_category'];

export class ProvisioningTest {
  constructor() {
    const stamp = `${process.pid}_${Date.now()}`;
    this.testSchema = `cse340_test_${stamp}`;
    this.setupSchema = `cse340_test_setup_${stamp}`;
    this.results = new TestResults();
    this.pool = new pg.Pool({
      connectionString: process.env.DB_URL,
      ssl: { rejectUnauthorized: false },
    });
  }

  check(name, passed, details = '') {
    this.results.addTest(name, passed ? 'PASS' : 'FAIL', passed ? '' : details);
    console.log(`${passed ? '✓' : '✗'} ${name}${passed || !details ? '' : `: ${details}`}`);
  }

  /** Run one scenario in a fresh process against the temporary schema. */
  scenario(name, schema = this.testSchema) {
    const run = spawnSync(process.execPath, [SCENARIO, name], {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        DB_SCHEMA: schema,
        ENABLE_SQL_LOGGING: 'false',
        DB_READ_ONLY: 'false',
      },
      encoding: 'utf8',
    });
    const line = (run.stdout || '').split('\n').find((l) => l.startsWith('RESULT '));
    if (!line) {
      throw new Error(`scenario ${name} printed no result: ${(run.stderr || '').slice(0, 300)}`);
    }
    return JSON.parse(line.slice('RESULT '.length));
  }

  static sameCounts(counts) {
    return ORDER.every((table) => counts[table] === EXPECTED[table]);
  }

  static stepOrder(steps) {
    return steps.map((step) => step.table).join(',');
  }

  async dropSchemas() {
    for (const schema of [this.testSchema, this.setupSchema]) {
      await this.pool.query(`DROP SCHEMA IF EXISTS ${pg.escapeIdentifier(schema)} CASCADE`);
    }
  }

  async runProvisioningScenarios() {
    let r = this.scenario('provision');
    this.check(
      'fresh schema: built in order 1-4',
      ProvisioningTest.stepOrder(r.steps) === ORDER.join(','),
      JSON.stringify(r.steps)
    );
    this.check(
      'fresh schema: every table created and loaded',
      r.steps.every((s) => s.table_ === 'created' && s.data === 'inserted'),
      JSON.stringify(r.steps)
    );
    this.check(
      'fresh schema: counts 3/15/4/23',
      ProvisioningTest.sameCounts(r.counts),
      JSON.stringify(r.counts)
    );

    r = this.scenario('provision');
    this.check(
      'rerun: everything already present',
      r.steps.length === 4 &&
        r.steps.every((s) => s.table_ === 'already present' && s.data === 'already present'),
      JSON.stringify(r.steps)
    );

    r = this.scenario('structure');
    this.check(
      'foreign keys: project->organization, project_category->project and ->category',
      JSON.stringify(r.foreignKeys) ===
        JSON.stringify([
          'project->organization',
          'project_category->category',
          'project_category->project',
        ]),
      JSON.stringify(r.foreignKeys)
    );
    this.check(
      'indexes present',
      JSON.stringify(r.indexes) ===
        JSON.stringify(['idx_project_category_category_id', 'idx_project_organization_id']),
      JSON.stringify(r.indexes)
    );

    r = this.scenario('dropJoinTable');
    this.check(
      'dropped join table: only it is rebuilt',
      r.steps
        .filter((s) => s.table_ === 'created')
        .map((s) => s.table)
        .join() === 'project_category' && ProvisioningTest.sameCounts(r.counts),
      JSON.stringify(r.steps)
    );

    r = this.scenario('emptyJoinTable');
    this.check(
      'emptied join table: only its data is reloaded',
      r.steps
        .filter((s) => s.data === 'inserted')
        .map((s) => s.table)
        .join() === 'project_category' && ProvisioningTest.sameCounts(r.counts),
      JSON.stringify(r.steps)
    );

    r = this.scenario('truncateAll');
    this.check(
      'truncateAll empties every table in one statement',
      JSON.stringify(r.truncated) === JSON.stringify(ORDER) &&
        Object.values(r.afterTruncate).every((n) => n === 0),
      JSON.stringify(r)
    );
    this.check(
      'truncateAll then reload: counts and ids restart at 1',
      ProvisioningTest.sameCounts(r.counts) && r.ids.lo === 1 && r.ids.hi === 3,
      JSON.stringify(r)
    );

    r = this.scenario('dropAll');
    this.check(
      'dropAll drops children first (reverse order)',
      JSON.stringify(r.dropped) === JSON.stringify([...ORDER].reverse()) &&
        Object.values(r.afterDrop).every((n) => n === null),
      JSON.stringify(r.dropped)
    );
    this.check(
      'dropAll then rebuild in order 1-4',
      ProvisioningTest.stepOrder(r.steps) === ORDER.join(',') &&
        ProvisioningTest.sameCounts(r.counts),
      JSON.stringify(r.steps)
    );

    r = this.scenario('missingDataPrereq');
    this.check(
      'refuses to load project before organization has data',
      r.error === 'Cannot load project: required table organization has no data',
      r.error || 'no error'
    );
    this.scenario('provision');

    r = this.scenario('missingTablePrereq');
    this.check(
      'refuses to create project before organization exists',
      r.error === 'Cannot create project: required table organization does not exist',
      r.error || 'no error'
    );
    r = this.scenario('provision');
    this.check(
      'restored after prerequisite failures',
      ProvisioningTest.sameCounts(r.counts),
      JSON.stringify(r.counts)
    );

    r = this.scenario('configLowerOrder');
    this.check(
      'config: a model ordered before its prerequisite is refused',
      /requires table organization \(order 1\); it must have a lower order/.test(r.error || ''),
      r.error || 'no error'
    );
    r = this.scenario('configDuplicateOrder');
    this.check(
      'config: duplicate order numbers are refused',
      /order 3 is used more than once/.test(r.error || ''),
      r.error || 'no error'
    );
    r = this.scenario('configMissingModel');
    this.check(
      'config: an unregistered prerequisite is refused',
      /requires table not_registered, but no model for it is registered/.test(r.error || ''),
      r.error || 'no error'
    );
  }

  /** Build src/setup.sql into its own schema and compare it with provisioning, catalog by catalog. */
  async runSetupSqlSync() {
    const client = await this.pool.connect();
    try {
      await client.query(`CREATE SCHEMA ${pg.escapeIdentifier(this.setupSchema)}`);
      await client.query(`SET search_path TO ${pg.escapeIdentifier(this.setupSchema)}`);
      await client.query(readFileSync(path.join(PROJECT_ROOT, 'src/setup.sql'), 'utf8'));
    } finally {
      client.release();
    }
    const describe = async (schema) => {
      const q = async (text) =>
        (await this.pool.query(text, [schema])).rows.map((r) =>
          JSON.stringify(r).split(`${schema}.`).join('')
        );
      return {
        columns:
          await q(`SELECT table_name, ordinal_position, column_name, data_type, character_maximum_length, is_nullable,
                                 replace(column_default, $1 || '.', '') AS column_default
                          FROM information_schema.columns WHERE table_schema = $1 ORDER BY 1, 2`),
        constraints:
          await q(`SELECT conrelid::regclass::text AS tbl, conname, contype, pg_get_constraintdef(oid) AS def
                              FROM pg_constraint WHERE connamespace = $1::regnamespace ORDER BY 1, 2`),
        indexes: await q(
          `SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = $1 ORDER BY 1, 2`
        ),
        organization: await q(
          'SELECT * FROM ' +
            pg.escapeIdentifier(schema) +
            '.organization WHERE $1::text IS NOT NULL ORDER BY 1'
        ),
        project: await q(
          'SELECT * FROM ' +
            pg.escapeIdentifier(schema) +
            '.project WHERE $1::text IS NOT NULL ORDER BY 1'
        ),
        category: await q(
          'SELECT * FROM ' +
            pg.escapeIdentifier(schema) +
            '.category WHERE $1::text IS NOT NULL ORDER BY 1'
        ),
        project_category: await q(
          'SELECT * FROM ' +
            pg.escapeIdentifier(schema) +
            '.project_category WHERE $1::text IS NOT NULL ORDER BY 1, 2'
        ),
      };
    };
    const built = await describe(this.setupSchema);
    const provisioned = await describe(this.testSchema);
    for (const part of Object.keys(built)) {
      const same = JSON.stringify(built[part]) === JSON.stringify(provisioned[part]);
      this.check(
        `setup.sql in sync: ${part} (${built[part].length})`,
        same,
        `setup.sql ${built[part].length} vs provisioning ${provisioned[part].length}`
      );
    }
  }

  async run() {
    const appSchema = (process.env.DB_SCHEMA || 'public').toLowerCase();
    if (!process.env.DB_URL) throw new Error('DB_URL is not set');
    if (appSchema.startsWith('cse340_test_'))
      throw new Error(`DB_SCHEMA ${appSchema} looks like a test schema; refusing to run`);
    console.log(
      `Database tests in temporary schemas ${this.testSchema} / ${this.setupSchema} (app schema ${appSchema} untouched)`
    );
    try {
      await this.dropSchemas();
      await this.runProvisioningScenarios();
      await this.runSetupSqlSync();
    } catch (error) {
      this.check('database test suite ran to the end', false, error.message);
    } finally {
      await this.dropSchemas();
      const left = (
        await this.pool.query(
          "SELECT count(*)::int AS n FROM pg_namespace WHERE nspname LIKE 'cse340_test_%'"
        )
      ).rows[0].n;
      this.check('temporary test schemas removed', left === 0, `${left} left`);
      await this.pool.end();
    }
    console.log(this.results.toString());
    return { success: this.results.getSummary().success, results: this.results };
  }
}

export default ProvisioningTest;
