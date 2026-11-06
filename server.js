import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { pgDBConnection } from './src/models/db.js';
import { OrganizationsModel } from './src/models/organizations.js';
import { ProjectsModel } from './src/models/projects.js';
import { CategoriesModel } from './src/models/categories.js';

// Define the application environment.
const NODE_ENV = process.env.NODE_ENV?.toLocaleLowerCase() || 'production';
// Define the port the server will listen on (Fixed: Changed from 'let' to 'const').
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const pgDB = new pgDBConnection();
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
app.get('/', async (req, res) => {
  const title = "Home";
  res.render('home', { title });
});

app.get('/organizations', async (req, res) => {
  const organizations = await organizationsModel.getAllOrganizations();
  const title = 'Our Partner Organizations';
  res.render('organizations', { title, organizations });
});

app.get('/categories', async (req, res) => {
  const categories = await categoriesModel.getAllCategories();
  const title = 'Service Project Categories';
  res.render('categories', { title, categories });
});

app.get('/projects', async (req, res) => {
  const projects = await projectsModel.getAllProjects();
  const title = 'Service Projects';
  res.render('projects', { title, projects });
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
