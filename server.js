import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { PgDBConnection } from './src/models/db.js';
// Imported for its side effect: registers the project_category join table for provisioning.
// Every model must be imported before the first query, or provisioning will skip its table.
import './src/models/projectCategories.js';
import { Router } from './src/routes.js';

// Define the application environment.
const NODE_ENV = process.env.NODE_ENV?.toLocaleLowerCase() || 'production';
// Define the port the server will listen on (Fixed: Changed from 'let' to 'const').
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const pgDB = new PgDBConnection();

/**
 * Configure Express middleware.
 */
app.use(express.static(path.join(__dirname, 'public')));
// Set EJS as the templating engine
app.set('view engine', 'ejs');
// Tell Express where to find your templates
app.set('views', path.join(__dirname, 'src/views'));

// Middleware to log all incoming requests
app.use((req, res, next) => {
  if (NODE_ENV === 'development') {
    console.log(`${req.method} ${req.url}`);
  }
  next();
});
// Middleware to make NODE_ENV available to all templates
app.use((req, res, next) => {
  res.locals.NODE_ENV = NODE_ENV;
  next();
});

/**
 * Use the imported router to handle the routes.
 */
app.use(new Router());

// Health check: 200 once the database is provisioned and reachable, 503 until then (or on failure).
// `version` is the deployed commit (Render sets RENDER_GIT_COMMIT), so release.sh can tell when
// a new version is live.
app.get('/api/health', async (_req, res) => {
  const health = await PgDBConnection.healthCheck();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
// catch-all route for 404 errors
app.use((req, res, next) => {
  const err = new Error('Page Not Found');
  err.status = 404;
  next(err);
});
// global error handler
app.use((err, req, res, next) => {
  // Log error details for debugging.
  console.error('Error occurred:', err.message);
  console.error('Stack trace::', err.stack);

  // Determine the status and template
  const status = err.status || 500;
  const template = status === 404 ? '404' : '500';

  // Prepare data for the template
  const context = {
    title: status === 404 ? 'Page Not Found' : 'Server Error',
    error: err.message,
    stack: err.stack,
  };

  // Render the appropriate error page
  res.status(status).render(`errors/${template}`, context);
});
app.listen(port, async () => {
  try {
    await pgDB.testConnection();
    console.log(`Server is running at http://127.0.0.1:${port}`);
    console.log(`Environment: ${NODE_ENV}`);
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
});
