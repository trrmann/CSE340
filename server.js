import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { PgDBConnection } from './src/models/db.js';
import { OrganizationsModel } from './src/models/organizations.js';
import { ProjectsModel } from './src/models/projects.js';
import { CategoriesModel } from './src/models/categories.js';
// Imported for its side effect: registers the project_category join table for provisioning.
// Every model must be imported before the first query, or provisioning will skip its table.
import './src/models/projectCategories.js';

// Define the application environment.
const NODE_ENV = process.env.NODE_ENV?.toLocaleLowerCase() || 'production';
// Define the port the server will listen on (Fixed: Changed from 'let' to 'const').
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const pgDB = new PgDBConnection();
const organizationsModel = new OrganizationsModel();
const projectsModel = new ProjectsModel();
const categoriesModel = new CategoriesModel();

/**
 * Configure Express middleware.
 */
app.use(express.static(path.join(__dirname, 'public')));
// Set EJS as the templating engine
app.set('view engine', 'ejs');
// Tell Express where to find your templates
app.set('views', path.join(__dirname, 'src/views'));

/**
 * Define routes for the application
 * (Fixed: Added 'async' to every route handler arrow function)
 */
app.get('/', async (_req, res) => {
  const title = 'Home';
  res.render('home', { title });
});

app.get('/organizations', async (_req, res) => {
  const organizations = await organizationsModel.getAllOrganization();
  const title = 'Our Partner Organizations';
  res.render('organizations', { title, organizations });
});

app.get('/categories', async (_req, res) => {
  const categories = await categoriesModel.getAllCategories();
  const title = 'Service Project Categories';
  res.render('categories', { title, categories });
});

app.get('/projects', async (_req, res) => {
  const projects = await projectsModel.getAllProjects();
  const title = 'Service Projects';
  res.render('projects', { title, projects });
});

// Health check: 200 once the database is provisioned and reachable, 503 until then (or on failure).
// `version` is the deployed commit (Render sets RENDER_GIT_COMMIT), so release.sh can tell when
// a new version is live.
app.get('/api/health', async (_req, res) => {
  const health = await PgDBConnection.healthCheck();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
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
