import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

//Define the application environment.
const NODE_ENV = process.env.NODE_ENV?.toLocaleLowerCase() || 'production';
//Define the port the server will listen on.
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
//console.log("Hello, Node.js");
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
  */
app.get('/', (req, res) => {
  const title = "Home";
  //res.sendFile(path.join(__dirname, 'src/views/home.html'));
  res.render('home', { title });
});
app.get('/organizations', (req, res) => {
  const title = "Organizations";
  //res.sendFile(path.join(__dirname, 'src/views/organizations.html'));
  res.render('organizations', { title });
});
app.get('/categories', (req, res) => {
  const title = "Categories";
  //res.sendFile(path.join(__dirname, 'src/views/categories.html'));
  res.render('categories', { title });
});
app.get('/projects', (req, res) => {
  const title = "Projects";
  //res.sendFile(path.join(__dirname, 'src/views/project.html'));
  res.render('project', { title });
}); 
/*
app.get('/', (req, res) => {
  res.send('Hello from Express!');
});
*/
app.listen(port, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${port}`);
});
