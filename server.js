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
/** 
  * Define routes for the application
  */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/views/home.html'));
});
app.get('/organizations', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/views/organizations.html'));
});
app.get('/projects', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/views/project.html'));
}); 
/*
app.get('/', (req, res) => {
  res.send('Hello from Express!');
});
*/
app.listen(port, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${port}`);
});
