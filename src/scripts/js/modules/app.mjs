import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { PgDBConnection } from './library/db.mjs';
// Imported for its side effect: registers the project_category join table for provisioning.
// Every model must be imported before the first query, or provisioning will skip its table.
import './models/projectCategories.mjs';
import { Router } from './routes.mjs';
import { HttpError } from './library/httpError.mjs';

/** Project root folder (this file is src/scripts/js/modules/app.mjs, four levels below it). */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/**
 * The web application. Setup always runs in this order:
 * views/static files -> middleware -> routes -> 404 catch-all -> error handler.
 */
class App {
  constructor({
    port = process.env.PORT || 3000,
    nodeEnv = process.env.NODE_ENV?.toLowerCase() || 'production',
  } = {}) {
    this.port = port;
    this.nodeEnv = nodeEnv;
    this.server = null;
    this.app = express();
    this.configureViews();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  configureViews() {
    this.app.use(express.static(path.join(ROOT, 'public')));
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(ROOT, 'src/views'));
  }

  configureMiddleware() {
    // Log every request in development
    this.app.use((req, _res, next) => {
      if (this.nodeEnv === 'development') {
        console.log(`${req.method} ${req.url}`);
      }
      next();
    });
    // Make NODE_ENV available to all templates
    this.app.use((_req, res, next) => {
      res.locals.NODE_ENV = this.nodeEnv;
      next();
    });
  }

  configureRoutes() {
    this.app.use(new Router());
    // Health check: 200 once the database is provisioned and reachable, 503 until then.
    // `version` is the deployed commit, so release.sh can tell when a new version is live.
    this.app.get('/api/health', async (_req, res) => {
      const health = await PgDBConnection.healthCheck();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });
  }

  configureErrorHandling() {
    // Catch-all 404: only reached when no route matched
    this.app.use((_req, _res, next) => {
      next(HttpError.notFound());
    });
    // Global error handler: four parameters, so Express treats it as the error handler
    this.app.use((err, _req, res, _next) => {
      console.error('Error occurred:', err.message);
      console.error('Stack trace::', err.stack);
      const status = err.status || 500;
      const template = status === 404 ? '404' : '500';
      const context = {
        title: status === 404 ? 'Page Not Found' : 'Server Error',
        error: err.message,
        stack: err.stack,
      };
      res.status(status).render(`errors/${template}`, context);
    });
  }

  /** Start listening; resolves once the server is up (and the database was checked). */
  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, async () => {
        try {
          await new PgDBConnection().testConnection();
          console.log(`Server is running at http://127.0.0.1:${this.port}`);
          console.log(`Environment: ${this.nodeEnv}`);
        } catch (error) {
          console.error('Error connecting to the database:', error);
        }
        resolve(this.server);
      });
    });
  }

  /** Stop listening (for tests or a clean shutdown). */
  async stop() {
    if (this.server) {
      await new Promise((resolve) => this.server.close(resolve));
      this.server = null;
    }
  }
}

export { App };
