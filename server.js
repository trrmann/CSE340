import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

// Define the application environment.
const NODE_ENV = process.env.NODE_ENV?.toLocaleLowerCase() || 'production';
// Define the port the server will listen on (Fixed: Changed from 'let' to 'const').
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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
  const title = "Organizations";
  res.render('organizations', { title });
});

app.get('/categories', async (req, res) => {
  const title = "Categories";
  res.render('categories', { title });
});

app.get('/projects', async (req, res) => {
  const title = "Projects";
  res.render('project', { title });
}); 

app.listen(port, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${port}`);
});
