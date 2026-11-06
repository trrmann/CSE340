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
 */
class pgDBConnection {
    /** Schema used for privilege checks and grants. */
    static #dbSchema = process.env.DB_SCHEMA || 'public';
    //static #dbGrantUser = process.env.DB_GRANT_USER || undefined;
    /** Escape functions available to SQL templates, chosen by each replacement's `as` option. */
    static #escapers = { identifier: escapeIdentifier, literal: escapeLiteral };
    /** Cached Promise of the one-time provisioning run (null until it starts). Shared by all instances. */
    static #provisioning = null;
    /** The single connection pool shared by every instance. */
    static #pool = new Pool({
        connectionString: process.env.DB_URL,
        // Render's internal database connection uses a self-signed certificate,
        // so certificate verification is disabled (connection is still encrypted).
        ssl: {
            rejectUnauthorized: false
        }
    });
    /** Folder of this file (src/models), built from the module URL so it works under nodemon and on Render. */
    static #dirname = path.dirname(fileURLToPath(import.meta.url));
    /** Root folder for all SQL files: src/scripts/sql/. */
    static #sqlRoot = path.join(pgDBConnection.#dirname,'../scripts/sql');
    /**
    * Reads src/scripts/sql/<sqlFilePath> and returns the SQL text (root-relative).
    * The file is read from disk on every call.
    */
    static loadSQLQuery = (sqlFilePath) => readFileSync(path.join(pgDBConnection.#sqlRoot, sqlFilePath), 'utf8');
    /**
    * What queries run on: in development (with SQL logging on) a wrapper that logs each query,
    * otherwise the shared pool itself. Set in the constructor; both expose query(text, params).
    */
    db = null;
    /** This instance's SQL folder under src/scripts/sql/ ('' for the base class). */
    #modelPathSpecification;
    /** Reads src/scripts/sql/<model folder>/<modelSqlFilePath> and returns the SQL text (model-relative). */
    loadModelSQLQuery = (modelSqlFilePath) => pgDBConnection.loadSQLQuery(path.join(this.#modelPathSpecification, modelSqlFilePath));
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
    */
    static #applySQLTemplate = (sqlText, sqlFilePath, replacements = {}) =>
    Object.entries(replacements).reduce((sql, [token, { value, as = 'identifier' }]) => {
        const resolved = typeof value === 'function' ? value() : value;
        if (resolved === undefined || resolved === null || resolved === '') {
            throw new Error(`SQL template ${sqlFilePath}: no value for ${token}`);
        }
        const escape = pgDBConnection.#escapers[as];
        if (!escape) {
            throw new Error(`SQL template ${sqlFilePath}: unknown escape type "${as}" for ${token}`);
        }
        return sql.replaceAll(token, () => escape(String(resolved)));
    }, sqlText);
    /** Loads a root-relative SQL file and applies the template replacements. */
    static loadSQLTemplate = (sqlFilePath, replacements = {}) =>
        pgDBConnection.#applySQLTemplate(pgDBConnection.loadSQLQuery(sqlFilePath), sqlFilePath, replacements);
    /** Loads a model-relative SQL file and applies the template replacements. */
    loadModelSQLTemplate = (modelSqlFilePath, replacements = {}) =>
        pgDBConnection.#applySQLTemplate(this.loadModelSQLQuery(modelSqlFilePath), modelSqlFilePath, replacements);
    /**
    * @param {string} modelPathSpecification  SQL folder for this model under src/scripts/sql/
    *                                         (for example 'organization'); '' for the base class.
    */
    constructor(modelPathSpecification='') {
        this.#modelPathSpecification = modelPathSpecification
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
                        const res = await pgDBConnection.#pool.query(text, params);
                        const duration = Date.now() - start;
                        console.log('Executed query:', { 
                            text: text.replace(/\s+/g, ' ').trim(), 
                            duration: `${duration}ms`, 
                            rows: res.rowCount 
                        });
                        return res;
                    } catch (error) {
                        console.error('Error in query:', { 
                            text: text.replace(/\s+/g, ' ').trim(), 
                            error: error.message 
                        });
                        throw error;
                    }
                },

                async close() {
                    await pgDBConnection.#pool.end();
                }
            };
        } else {
            // In production, assign the pool directly without logging overhead
            this.db = pgDBConnection.#pool;
        }
    }
    /**
    * One-time provisioning, run at most once per process and shared by all instances.
    *
    * - Ensures the current user has USAGE and CREATE on the DB_SCHEMA schema (addUsage / addCreate),
    *   so a freshly re-created database (for example after a Render reset) is set up automatically.
    * - The Promise is cached in #provisioning with ??=, so concurrent and later callers all await
    *   the same single run instead of starting their own.
    * - On failure the cache is reset to null and the error is rethrown, so the next query retries.
    * - Runs through #executeQuery (via addUsage / addCreate), which is never gated, so it never waits on itself.
    *
    * @returns {Promise<boolean>} true if any grant was made, false if everything was already in place.
    */
    static #ensureProvisioned() {
        return pgDBConnection.#provisioning ??= ( (async () => {
            const pgDB = new pgDBConnection();
            let usage = false;
            let create = false;
            try {
                usage = await pgDB.addUsage();
                create = await pgDB.addCreate();
                console.log(`Provision use checked:  ${usage} / ${create}`);
            } catch(error) {
                pgDBConnection.#provisioning = null;
                throw error;
            }
            return usage || create;
        })());
    }
    /**
    * Runs a SQL file. Private and never gated, so connection-level methods (and provisioning)
    * can use it without waiting on provisioning.
    *
    * @param {object}  options
    * @param {string}  options.querySQLPath  SQL file name/path
    * @param {boolean} [options.root=false]  true: relative to src/scripts/sql/; false: relative to this model's folder
    * @param {object}  [options.replacements={}]  template tokens to replace (see Path rules above)
    * @param {Array}   [options.parameters=[]]    values for $1, $2, ... placeholders
    * @returns {Promise<object>} the pg Result (use .rows for the data)
    */
    async #executeQuery({querySQLPath, root=false, replacements={}, parameters=[]}) {
        if(root) {
            return await this.db.query(pgDBConnection.loadSQLTemplate(querySQLPath, replacements), parameters);
        } else {
            return await this.db.query(this.loadModelSQLTemplate(querySQLPath, replacements), parameters);
        }
    }
    /**
    * Public query method for models. Takes the same options as #executeQuery.
    * Waits for one-time provisioning (#ensureProvisioned) before running; after the
    * first run this wait is an already-resolved Promise, so it costs practically nothing.
    *
    * Example (in a model): (await this.query({ querySQLPath: 'getAllOrganizations.sql' })).rows
    */
    async query({querySQLPath, root=false, replacements={}, parameters=[]}) {
        await pgDBConnection.#ensureProvisioned();
        return this.#executeQuery({querySQLPath:querySQLPath, root:root, replacements:replacements, parameters:parameters});
    }
    /**
    * Tests the database connection (testConnection.sql) and logs the server time.
    * @returns {Promise<true>} resolves true on success; logs and rethrows on failure.
    */
    async testConnection() {
        try {
            const result = await this.#executeQuery({querySQLPath:'testConnection.sql', root:true});
            console.log('Database connection successful:', result.rows[0].current_time);
            return true;
        } catch (error) {
            console.error('Database connection failed:', error.message);
            throw error;
        }
    };
    /**
    * The effective database role (SQL current_user) whose privileges apply to queries.
    * May differ from the login user in DB_URL when the login role switches roles on connect.
    * @returns {Promise<string>}
    */
    async currentUser() {
        return (await this.#executeQuery({querySQLPath: 'currentUser.sql', root: true})).rows[0].user_name;
    }
    /**
    * Whether the current user has USAGE on the DB_SCHEMA schema.
    * @returns {Promise<boolean>}
    */
    async hasUsage() {
        return (await this.#executeQuery({querySQLPath: 'grants/userHasSchemaUsage.sql', root: true, parameters: [await this.currentUser(), pgDBConnection.#dbSchema]})).rows[0].has_usage;
    }
    /**
    * Grants USAGE on the DB_SCHEMA schema to the current user if it is missing. Safe to rerun.
    * @returns {Promise<boolean>} false if already granted, true if a grant was made.
    */
    async addUsage() {
        if (await this.hasUsage()) return false;          // already granted: nothing to do
        const currentUser = await this.currentUser();
        (await (this.#executeQuery({querySQLPath: 'grants/grantUsage.sql', root: true, replacements: {
            '{{schema}}': { value: () => pgDBConnection.#dbSchema },
            '{{user}}':   { value: () => currentUser }
        }})));
        return true;
    }
    /**
    * Whether the current user has CREATE on the DB_SCHEMA schema.
    * @returns {Promise<boolean>}
    */
    async hasCreate() {
        return (await this.#executeQuery({querySQLPath: 'grants/userHasSchemaCreate.sql', root: true, parameters: [await this.currentUser(), pgDBConnection.#dbSchema]})).rows[0].has_create;
    }
    /**
    * Grants CREATE on the DB_SCHEMA schema to the current user if it is missing. Safe to rerun.
    * @returns {Promise<boolean>} false if already granted, true if a grant was made.
    */
    async addCreate() {
        if (await this.hasCreate()) return false;          // already granted: nothing to do
        const currentUser = await this.currentUser();
        (await (this.#executeQuery({querySQLPath: 'grants/grantCreate.sql', root: true, replacements: {
            '{{schema}}': { value: () => pgDBConnection.#dbSchema },
            '{{user}}':   { value: () => currentUser }
        }})));
        return true;
    }

}

export { pgDBConnection }