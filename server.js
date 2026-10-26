import express from 'express';
//Define the application environment.
const NODE_ENV = process.env.NODE_ENV?.toLocaleLowerCase() || 'production';
//Define the port the server will listen on.
const port = process.env.PORT || 3000;
const app = express();
//console.log("Hello, Node.js");
app.get('/', (req, res) => {
  res.send('Hello from Express!');
});
app.listen(port, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${port}`);
});
