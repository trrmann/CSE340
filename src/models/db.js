import { Pool, escapeIdentifier, escapeLiteral } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

/**
 * Base class for PostgreSQL access. Models extend it and inherit its query methods.
 *
 * - One connection pool is shared by every instance (static #pool), so creating
 *   instances is cheap and never opens extra connections.
 * - SQL lives in .sql files under src/scripts/sql/. Each model passes its own folder
 *   to the constructor (for example super('organization')) and reads its queries from there.
 * - Connection-level methods (testConnection, currentUser, has/add grants) always read
 *   from the SQL root, so they work on the base class and on any model instance.
 *
 * Environment variables:
 *   DB_URL              connection string: postgresql://username:password@host:port/database
 *   DB_SCHEMA           schema used for privilege checks and grants (default: public)
 *   NODE_ENV            'development' enables the query-logging wrapper (with ENABLE_SQL_LOGGING)
 *   ENABLE_SQL_LOGGING  'true' logs each query's text, duration and row count in development
 *   DB_READ_ONLY        'true' opens every connection read-only (PostgreSQL refuses all writes) and
 *                       skips provisioning; used by deploy.sh -preview --remote
 *   RENDER_GIT_COMMIT   set by Render; reported as `version` by healthCheck()
 */
class PgDBConnection {
  /** Schema used for privilege checks and grants. */
  static #dbSchema = (process.env.DB_SCHEMA || 'public').toLowerCase();
  /** Read-only mode: every session is read-only and provisioning only verifies the tables exist. */
  static #readOnly = String(process.env.DB_READ_ONLY || '').toLowerCase() === 'true';
  /** Escape functions available to SQL templates, chosen by each replacement's `as` option. */
  static #escapers = { identifier: escapeIdentifier, literal: escapeLiteral };
  /** Cached Promise of the one-time provisioning run (null until it starts). Shared by all instances. */
  static #provisioning = null;
  /**
   * Models registered for provisioning: { order, ModelClass }. Filled by registerProvisioner,
   * which each model file calls after its class is defined (db.js never imports the models,
   * because they extend PgDBConnection and that would be a circular import).
   */
  static #provisioners = [];
  /** The single connection pool shared by every instance. */
  static #pool = new Pool({
    connectionString: process.env.DB_URL,
    // Render's internal database connection uses a self-signed certificate,
    // so certificate verification is disabled (connection is still encrypted).
    ssl: {
      rejectUnauthorized: false,
    },
    // Read-only mode: PostgreSQL itself refuses every write in these sessions.
    ...(PgDBConnection.#readOnly ? { options: '-c default_transaction_read_only=on' } : {}),
  });
  /** Folder of this file (src/models), built from the module URL so it works under nodemon and on Render. */
  static #dirname = path.dirname(fileURLToPath(import.meta.url));
  /** Root folder for all SQL files: src/scripts/sql/. */
  static #sqlRoot = path.join(PgDBConnection.#dirname, '../scripts/sql');
  /**
   * Cache of raw SQL file text, keyed by the file's full resolved path. Shared by all instances.
   * Only the unmodified file text is cached; template replacements ({{schema}} etc.) are applied
   * after loading, on every call, so different replacements never collide in the cache.
   */
  static #sqlCache = new Map();
  /**
   * Reads src/scripts/sql/<sqlFilePath> and returns the SQL text (root-relative).
   * Each file is read from disk once per process, then served from #sqlCache.
   * Edited SQL files take effect after a restart (nodemon watches .sql files in development).
   */
  static loadSQLQuery(sqlFilePath) {
    const fullPath = path.resolve(PgDBConnection.#sqlRoot, sqlFilePath);
    let sqlText = PgDBConnection.#sqlCache.get(fullPath);
    if (sqlText === undefined) {
      sqlText = readFileSync(fullPath, 'utf8');
      PgDBConnection.#sqlCache.set(fullPath, sqlText);
    }
    return sqlText;
  }
  /**
   * Empties the SQL file cache, so the next load of each file reads it from disk again.
   * Not needed in normal use (a restart also clears it); useful in tests or tools that edit SQL files.
   * @returns {number} how many cached files were cleared.
   */
  static clearSQLCache() {
    const cleared = PgDBConnection.#sqlCache.size;
    PgDBConnection.#sqlCache.clear();
    return cleared;
  }
  /**
   * What queries run on: in development (with SQL logging on) a wrapper that logs each query,
   * otherwise the shared pool itself. Set in the constructor; both expose query(text, params).
   */
  db = null;
  /** This instance's SQL folder under src/scripts/sql/ ('' for the base class). */
  #modelPathSpecification;
  /** Reads src/scripts/sql/<model folder>/<modelSqlFilePath> and returns the SQL text (model-relative). */
  loadModelSQLQuery(modelSqlFilePath) {
    return PgDBConnection.loadSQLQuery(path.join(this.#modelPathSpecification, modelSqlFilePath));
  }
  /**
   * Path rules:
   *   - Model-relative: loadModelSQLQuery / loadModelSQLTemplate -> src/scripts/sql/<model folder>/<file>
   *     Used by query({ querySQLPath }) for a model's own queries (root defaults to false).
   *   - Root-relative:  loadSQLQuery / loadSQLTemplate -> src/scripts/sql/<file>
   *     Used with root: true by the connection-level methods, so they work on any model instance.
   * Both template loaders share #applySQLTemplate, which only replaces tokens in already-loaded SQL text.
   *
   * Template replacements: { '<token>': { value, as } }
   *   - value: the value, or a function that returns it (called when the SQL is built; must not be async)
   *   - as:    'identifier' (default) for names such as schema/table/user -> "public"
   *            'literal' for string values -> 'text'
   * Every value is escaped; a missing value or unknown `as` throws an error naming the file and token.
   *
   * {{schema}} is always available: executeQuery fills it with DB_SCHEMA (lowercased; default public)
   * unless the caller passes its own '{{schema}}' replacement. Write table names in SQL files as
   * {{schema}}.table_name. Index names stay unqualified (Postgres puts an index in its table's schema).
   */
  static #applySQLTemplate(sqlText, sqlFilePath, replacements = {}) {
    return Object.entries(replacements).reduce((sql, [token, { value, as = 'identifier' }]) => {
      const resolved = typeof value === 'function' ? value() : value;
      if (resolved === undefined || resolved === null || resolved === '') {
        throw new Error(`SQL template ${sqlFilePath}: no value for ${token}`);
      }
      const escape = PgDBConnection.#escapers[as];
      if (!escape) {
        throw new Error(`SQL template ${sqlFilePath}: unknown escape type "${as}" for ${token}`);
      }
      return sql.replaceAll(token, () => escape(String(resolved)));
    }, sqlText);
  }
  /** Loads a root-relative SQL file and applies the template replacements. */
  static loadSQLTemplate(sqlFilePath, replacements = {}) {
    return PgDBConnection.#applySQLTemplate(
      PgDBConnection.loadSQLQuery(sqlFilePath),
      sqlFilePath,
      replacements
    );
  }
  /** Loads a model-relative SQL file and applies the template replacements. */
  loadModelSQLTemplate(modelSqlFilePath, replacements = {}) {
    return PgDBConnection.#applySQLTemplate(
      this.loadModelSQLQuery(modelSqlFilePath),
      modelSqlFilePath,
      replacements
    );
  }
  /**
   * @param {string} modelPathSpecification  SQL folder for this model under src/scripts/sql/
   *                                         (for example 'organization'); '' for the base class.
   */
  constructor(modelPathSpecification = '') {
    this.#modelPathSpecification = modelPathSpecification;
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_SQL_LOGGING === 'true') {
      /**
       * In development mode, we wrap the pool to provide query logging.
       * This helps with debugging by showing all executed queries in the console.
       *
       * The wrapper also adds timing information to help identify slow queries
       * and tracks the number of rows affected by each query.
       */
      this.db = {
        async query(text, params) {
          try {
            const start = Date.now();
            const res = await PgDBConnection.#pool.query(text, params);
            const duration = Date.now() - start;
            console.log('Executed query:', {
              text: text.replace(/\s+/g, ' ').trim(),
              duration: `${duration}ms`,
              rows: res.rowCount,
            });
            return res;
          } catch (error) {
            console.error('Error in query:', {
              text: text.replace(/\s+/g, ' ').trim(),
              error: error.message,
            });
            throw error;
          }
        },
      };
    } else {
      // In production, assign the pool directly without logging overhead
      this.db = PgDBConnection.#pool;
    }
  }
  /**
   * Closes the shared connection pool for every instance, in development and production alike.
   * Use only when the process is shutting down (for example in a script or a shutdown handler):
   * after this, no instance can run queries until the process restarts.
   */
  /**
   * Health for GET /api/health: waits for one-time provisioning, then checks the connection.
   * `version` is the deployed commit (Render sets RENDER_GIT_COMMIT), so release.sh can tell
   * when a new version is live; it is null when running locally.
   * @returns {Promise<{status: 'healthy'|'unhealthy', version: string|null, schema: string, readOnly: boolean, timestamp: string, error?: string}>}
   */
  static async healthCheck() {
    const base = {
      version: process.env.RENDER_GIT_COMMIT
        ? String(process.env.RENDER_GIT_COMMIT).slice(0, 7)
        : null,
      schema: PgDBConnection.#dbSchema,
      readOnly: PgDBConnection.#readOnly,
    };
    try {
      await PgDBConnection.#ensureProvisioned();
      await new PgDBConnection().executeQuery({ querySQLPath: 'testConnection.sql', root: true });
      return { status: 'healthy', ...base, timestamp: new Date().toISOString() };
    } catch (error) {
      return {
        status: 'unhealthy',
        ...base,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
  static async close() {
    await PgDBConnection.#pool.end();
  }
  /**
   * Registers a model for provisioning. Call once from the model's file, after its class:
   *   PgDBConnection.registerProvisioner(1, OrganizationsModel);
   * Models are provisioned in ascending `order`, so parents (referenced by foreign keys) come first.
   *
   * The model class must declare:
   *   static tableName = 'organization';      // the table it owns
   *   static requires  = [];                  // tables it references by foreign key (default none)
   * and provide hasTable(), create(), hasData(), defaultLoad() and drop(), each using
   * executeQuery (never gated) so provisioning never waits on itself.
   *
   * @param {number}   order       provisioning position (1 = first)
   * @param {Function} ModelClass  the model class (a subclass of PgDBConnection)
   */
  static registerProvisioner(order, ModelClass) {
    if (typeof ModelClass.tableName !== 'string' || ModelClass.tableName === '') {
      throw new Error(`registerProvisioner: ${ModelClass.name} must declare static tableName`);
    }
    PgDBConnection.#provisioners.push({ order, ModelClass });
  }
  /**
   * The registered models sorted by `order`, after checking the order is safe:
   * - every order number and table name is unique;
   * - every table a model `requires` is registered with a LOWER order (so it is built and loaded first).
   * Throws a configuration error naming the problem instead of letting a foreign key fail later.
   * @returns {Array<{order: number, ModelClass: Function}>}
   */
  static #orderedProvisioners() {
    const ordered = [...PgDBConnection.#provisioners].sort((a, b) => a.order - b.order);
    const orderOf = new Map();
    for (const { order, ModelClass } of ordered) {
      if ([...orderOf.values()].includes(order)) {
        throw new Error(`Provisioning order ${order} is used more than once (${ModelClass.name})`);
      }
      if (orderOf.has(ModelClass.tableName)) {
        throw new Error(
          `Table ${ModelClass.tableName} is registered more than once (${ModelClass.name})`
        );
      }
      orderOf.set(ModelClass.tableName, order);
    }
    for (const { order, ModelClass } of ordered) {
      for (const required of ModelClass.requires ?? []) {
        if (!orderOf.has(required)) {
          throw new Error(
            `${ModelClass.name} requires table ${required}, but no model for it is registered`
          );
        }
        if (orderOf.get(required) >= order) {
          throw new Error(
            `${ModelClass.name} (order ${order}) requires table ${required} (order ${orderOf.get(required)}); it must have a lower order`
          );
        }
      }
    }
    return ordered;
  }
  /**
   * Drops every registered table in REVERSE provisioning order (children before parents),
   * so no foreign key blocks a drop. DESTRUCTIVE: deletes the tables and their data.
   * The next query re-provisions everything (tables and default data).
   * @returns {Promise<string[]>} the table names, in the order they were dropped.
   */
  static async dropAll() {
    const dropped = [];
    for (const { ModelClass } of PgDBConnection.#orderedProvisioners().reverse()) {
      await new ModelClass().drop();
      dropped.push(ModelClass.tableName);
    }
    PgDBConnection.#provisioning = null;
    return dropped;
  }
  /**
   * Empties every registered table that exists, in ONE statement (TRUNCATE a, b, c ... RESTART IDENTITY).
   * Truncating tables one at a time fails while another table references them, even when that
   * table is empty, so they are truncated together. DESTRUCTIVE: deletes all rows.
   * The next query reloads the default data.
   * @returns {Promise<string[]>} the table names that were truncated.
   */
  static async truncateAll() {
    const pgDB = new PgDBConnection();
    const tables = [];
    for (const { ModelClass } of PgDBConnection.#orderedProvisioners()) {
      if (await pgDB.tableExists(ModelClass.tableName)) {
        tables.push(ModelClass.tableName);
      }
    }
    if (tables.length > 0) {
      const list = tables
        .map((table) => `${escapeIdentifier(PgDBConnection.#dbSchema)}.${escapeIdentifier(table)}`)
        .join(', ');
      await pgDB.db.query(`TRUNCATE TABLE ${list} RESTART IDENTITY`);
    }
    PgDBConnection.#provisioning = null;
    return tables;
  }
  /**
   * One-time provisioning, run at most once per process and shared by all instances.
   *
   * - Ensures the current user has USAGE and CREATE on the DB_SCHEMA schema (addUsage / addCreate),
   *   so a freshly re-created database (for example after a Render reset) is set up automatically.
   * - Then, for each registered model in `order` (checked by #orderedProvisioners): creates its table
   *   if missing (hasTable / create) and loads its default data if the table is empty (hasData / defaultLoad).
   *   Before creating, every required table must exist; before loading, every required table must have data.
   *   A missing prerequisite throws an error naming it, instead of a foreign-key failure.
   * - The Promise is cached in #provisioning with ??=, so concurrent and later callers all await
   *   the same single run instead of starting their own.
   * - On failure the cache is reset to null and the error is rethrown, so the next query retries.
   * - Runs through executeQuery, which is never gated, so it never waits on itself.
   *
   * @returns {Promise<boolean>} true if any grant was made, false if everything was already in place.
   */
  static #ensureProvisioned() {
    return (PgDBConnection.#provisioning ??= (async () => {
      const pgDB = new PgDBConnection();
      let usage;
      let create;
      try {
        if (PgDBConnection.#readOnly) {
          // Nothing can be created or loaded; check that everything is already there.
          for (const { ModelClass } of PgDBConnection.#orderedProvisioners()) {
            if (!(await pgDB.tableExists(ModelClass.tableName))) {
              throw new Error(
                `Read-only: table ${PgDBConnection.#dbSchema}.${ModelClass.tableName} is missing and cannot be created`
              );
            }
          }
          console.log(
            `Provisioning: read-only, all ${PgDBConnection.#provisioners.length} tables present in ${PgDBConnection.#dbSchema} (nothing created or loaded)`
          );
          return false;
        }
        // The schema must exist before privileges on it can be checked or tables created in it.
        const schemaCreated = await pgDB.ensureSchema();
        console.log(
          `Provisioning: schema ${PgDBConnection.#dbSchema} ${schemaCreated ? 'created' : 'already present'}`
        );
        usage = await pgDB.addUsage();
        create = await pgDB.addCreate();
        console.log(
          `Provisioning: USAGE ${usage ? 'granted' : 'already present'}, CREATE ${create ? 'granted' : 'already present'}`
        );
        // for...of (not forEach) so each model is awaited in order and errors reach the catch
        const ordered = PgDBConnection.#orderedProvisioners();
        const modelFor = new Map(
          ordered.map(({ ModelClass }) => [ModelClass.tableName, ModelClass])
        );
        for (const { order, ModelClass } of ordered) {
          const model = new ModelClass();
          const requires = ModelClass.requires ?? [];
          const hadTable = await model.hasTable();
          if (!hadTable) {
            for (const required of requires) {
              if (!(await pgDB.tableExists(required))) {
                throw new Error(
                  `Cannot create ${ModelClass.tableName}: required table ${required} does not exist`
                );
              }
            }
            await model.create();
          }
          const hadData = await model.hasData();
          if (!hadData) {
            for (const required of requires) {
              if (!(await new (modelFor.get(required))().hasData())) {
                throw new Error(
                  `Cannot load ${ModelClass.tableName}: required table ${required} has no data`
                );
              }
            }
            await model.defaultLoad();
          }
          console.log(
            `${order}. ${ModelClass.name} (${ModelClass.tableName}): Table ${hadTable ? 'already present' : 'created'}, Data ${hadData ? 'already present' : 'inserted'}`
          );
        }
      } catch (error) {
        PgDBConnection.#provisioning = null;
        throw error;
      }
      return usage || create;
    })());
  }
  /**
   * Runs a SQL file directly. Never gated: it does NOT wait for provisioning.
   * Use it only for provisioning and connection-level work (grants, table checks, create/load);
   * normal model reads and writes should use query(), which waits for provisioning first.
   *
   * @param {object}  options
   * @param {string}  options.querySQLPath  SQL file name/path
   * @param {boolean} [options.root=false]  true: relative to src/scripts/sql/; false: relative to this model's folder
   * @param {object}  [options.replacements={}]  template tokens to replace (see Path rules above);
   *                                             {{schema}} is added automatically from DB_SCHEMA
   * @param {Array}   [options.parameters=[]]    values for $1, $2, ... placeholders
   * @returns {Promise<object>} the pg Result (use .rows for the data)
   */
  async executeQuery({ querySQLPath, root = false, replacements = {}, parameters = [] }) {
    // Default {{schema}} first, so a caller's own '{{schema}}' replacement still wins.
    const allReplacements = { '{{schema}}': { value: PgDBConnection.#dbSchema }, ...replacements };
    if (root) {
      return this.db.query(
        PgDBConnection.loadSQLTemplate(querySQLPath, allReplacements),
        parameters
      );
    } else {
      return this.db.query(this.loadModelSQLTemplate(querySQLPath, allReplacements), parameters);
    }
  }
  /**
   * Public query method for models. Takes the same options as executeQuery and passes them through.
   * Waits for one-time provisioning (#ensureProvisioned) before running; after the
   * first run this wait is an already-resolved Promise, so it costs practically nothing.
   *
   * Example (in a model): (await this.query({ querySQLPath: 'getAllOrganizations.sql' })).rows
   */
  async query(options) {
    await PgDBConnection.#ensureProvisioned();
    return this.executeQuery(options);
  }
  /**
   * Tests the database connection (testConnection.sql) and logs the server time.
   * @returns {Promise<true>} resolves true on success; logs and rethrows on failure.
   */
  async testConnection() {
    try {
      const result = await this.executeQuery({ querySQLPath: 'testConnection.sql', root: true });
      console.log('Database connection successful:', result.rows[0].current_time);
      return true;
    } catch (error) {
      console.error('Database connection failed:', error.message);
      throw error;
    }
  }
  /**
   * The effective database role (SQL current_user) whose privileges apply to queries.
   * May differ from the login user in DB_URL when the login role switches roles on connect.
   * @returns {Promise<string>}
   */
  async currentUser() {
    return (await this.executeQuery({ querySQLPath: 'currentUser.sql', root: true })).rows[0]
      .user_name;
  }
  /**
   * Whether the DB_SCHEMA schema exists. Never errors; returns false if it is missing.
   * @returns {Promise<boolean>}
   */
  async hasSchema() {
    return (
      await this.executeQuery({
        querySQLPath: 'schemaExists.sql',
        root: true,
        parameters: [PgDBConnection.#dbSchema],
      })
    ).rows[0].schema_exists;
  }
  /**
   * Creates the DB_SCHEMA schema if it is missing (needs CREATE on the database). Safe to rerun.
   * @returns {Promise<boolean>} false if it already existed, true if it was created.
   */
  async ensureSchema() {
    if (await this.hasSchema()) return false; // already exists: nothing to do
    await this.executeQuery({ querySQLPath: 'createSchema.sql', root: true });
    return true;
  }
  /**
   * Whether a table is defined in the DB_SCHEMA schema (structure only; it may still be empty).
   * Never errors for a missing table or schema; returns false instead.
   * @param {string} tableName  table name, for example 'organization'
   * @returns {Promise<boolean>}
   */
  async tableExists(tableName) {
    return (
      await this.executeQuery({
        querySQLPath: 'tableExists.sql',
        root: true,
        parameters: [PgDBConnection.#dbSchema, tableName],
      })
    ).rows[0].table_exists;
  }
  /**
   * Whether this model's own table (its static tableName) is defined. Models can override it.
   * @returns {Promise<boolean>}
   */
  async hasTable() {
    return this.tableExists(this.constructor.tableName);
  }
  /**
   * Whether the current user has USAGE on the DB_SCHEMA schema.
   * @returns {Promise<boolean>}
   */
  async hasUsage() {
    return (
      await this.executeQuery({
        querySQLPath: 'grants/userHasSchemaUsage.sql',
        root: true,
        parameters: [await this.currentUser(), PgDBConnection.#dbSchema],
      })
    ).rows[0].has_usage;
  }
  /**
   * Grants USAGE on the DB_SCHEMA schema to the current user if it is missing. Safe to rerun.
   * @returns {Promise<boolean>} false if already granted, true if a grant was made.
   */
  async addUsage() {
    if (await this.hasUsage()) return false; // already granted: nothing to do
    const currentUser = await this.currentUser();
    await this.executeQuery({
      querySQLPath: 'grants/grantUsage.sql',
      root: true,
      replacements: {
        '{{schema}}': { value: () => PgDBConnection.#dbSchema },
        '{{user}}': { value: () => currentUser },
      },
    });
    return true;
  }
  /**
   * Whether the current user has CREATE on the DB_SCHEMA schema.
   * @returns {Promise<boolean>}
   */
  async hasCreate() {
    return (
      await this.executeQuery({
        querySQLPath: 'grants/userHasSchemaCreate.sql',
        root: true,
        parameters: [await this.currentUser(), PgDBConnection.#dbSchema],
      })
    ).rows[0].has_create;
  }
  /**
   * Grants CREATE on the DB_SCHEMA schema to the current user if it is missing. Safe to rerun.
   * @returns {Promise<boolean>} false if already granted, true if a grant was made.
   */
  async addCreate() {
    if (await this.hasCreate()) return false; // already granted: nothing to do
    const currentUser = await this.currentUser();
    await this.executeQuery({
      querySQLPath: 'grants/grantCreate.sql',
      root: true,
      replacements: {
        '{{schema}}': { value: () => PgDBConnection.#dbSchema },
        '{{user}}': { value: () => currentUser },
      },
    });
    return true;
  }
}

export { PgDBConnection };
