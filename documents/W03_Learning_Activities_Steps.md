# W03 Learning Activities — Checklist

Tick each box as you go. Details and code for every step are further down, under the same numbers.
After each activity: run `npm run dev` and open the pages in the browser.

## 1. Middleware (in `server.js`)

- [ ] 1.1 Add a global middleware **above your routes** that logs each request (method + URL), then calls `next()`.
- [ ] 1.2 Add a global middleware that sets `res.locals.NODE_ENV` (use your existing `NODE_ENV` const), then `next()`.
- [ ] 1.3 In `src/views/partials/footer.ejs`, show the environment (only in development, per the details below).

## 2. Error handling

- [ ] 2.1 Create `src/views/errors/404.ejs` ("Page Not Found"), using the header and footer partials.
- [ ] 2.2 Create `src/views/errors/500.ejs` ("Something Went Wrong"), same partials.
- [ ] 2.3 In `server.js`, **after all routes**: add a catch-all that creates a 404 error and passes it to `next(err)`.
- [ ] 2.4 Last of all: add the global error handler `(err, req, res, _next)` that renders the 404 or 500 page with the right status.
- [ ] 2.5 Add the `/test-error` route, then test: a bad URL gives 404, `/test-error` gives 500.

## 3. MVC refactor

- [ ] 3.1 Create `src/controllers/` with `index.js`, `organizations.js`, `projects.js`, `categories.js` and `errors.js`.
- [ ] 3.2 Move each route's callback from `server.js` into its controller as a named function (`showHomePage`, `showOrganizationsPage`, `showProjectsPage`, `showCategoriesPage`, `testErrorPage`). Import the model **alias functions** (`getAllOrganizations` and so on).
- [ ] 3.3 Create `src/routes.js` with an Express `Router`; map each path to its controller function.
- [ ] 3.4 In `server.js`: `app.use(router)`; remove the old page routes. **Keep** `/api/health`, the `projectCategories.js` import and `app.listen` with `testConnection()`. Keep the 404 and error handlers **after** the router.
- [ ] 3.5 Test that every page still works.

## 4. Route parameters: organization details page

- [ ] 4.1 SQL files: `organization/getOrganizationDetails.sql` (`WHERE organization_id = $1`) and `project/getProjectsByOrganizationId.sql`.
- [ ] 4.2 Model methods plus course-named aliases: `getOrganizationDetails(id)` and `getProjectsByOrganizationId(id)` (see the table below).
- [ ] 4.3 Controller `showOrganizationDetailsPage`: read `req.params.id`, get the organization and its projects, render `organization`.
- [ ] 4.4 Route: `router.get('/organization/:id', showOrganizationDetailsPage)`.
- [ ] 4.5 View `src/views/organization.ejs`: organization details plus a "Service Projects" list.
- [ ] 4.6 In `organizations.ejs`, link each organization name to `/organization/<%= organization.organization_id %>`.
- [ ] 4.7 Test `/organization/1`, `/organization/2`, `/organization/3`, and a bad id (should show an error page).

## Finish

- [ ] `npm run verify` (format + lint) passes.
- [ ] `deploy.sh -preview` passes (all tests).
- [ ] Commit on a branch, then `release.sh cse340 <branch>`.
- [ ] Take the **W03 Learning Activities quiz** in Canvas (no AI; course materials allowed).

# W03 Learning Activities — step-by-step (from the course site, condensed)

Source: https://byui-cse.github.io/cse340-ww-course-v2/week03/ — the course page is authoritative; open it if anything here is unclear.

## Before you start: your project vs. the course code

Do the four activities **in order** (1 → 4); each builds on the previous one. After each "Activity Instructions" section,
run `npm run dev` and check the pages before moving on. The course code assumes plain function models; yours are
classes, so translate as follows:

| Course code says                                                                                  | In your project                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import { getAllOrganizations } from '../models/organizations.js'`                                | Works as-is: your models export the course-named alias functions (`getAllOrganizations`, `getAllProjects`, `getAllCategories`). Controllers can import these exactly as the course shows.                                                                                                                                                                                                                                                                                               |
| New model functions (activity 4): `getOrganizationDetails(id)`, `getProjectsByOrganizationId(id)` | 1) Add SQL files: `src/scripts/sql/organization/getOrganizationDetails.sql` and `src/scripts/sql/project/getProjectsByOrganizationId.sql` using `{{schema}}.table` and `$1` for the id. 2) Add a class method that calls `this.query({ querySQLPath: '<file>.sql', parameters: [id] })` and returns `.rows[0]` (details) or `.rows` (list). 3) Export a course-named alias function, e.g. `const getOrganizationDetails = (id) => new OrganizationsModel().getOrganizationDetails(id);` |
| `import db from './db.js'` / `db.query(...)`                                                      | Not used in your design; use the class `query()` method as above.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Moving route callbacks out of `server.js` (activity 3)                                            | Move the 4 page routes into controllers + `src/routes.js`. **Keep in server.js**: the `/api/health` route, the side-effect `import './src/models/projectCategories.js'`, and the `app.listen` block with `testConnection()`.                                                                                                                                                                                                                                                            |
| 404 catch-all + global error handler (activity 2)                                                 | Register them **after all routes**, including `/api/health` and the router. Error handlers need 4 parameters; name unused ones with a leading underscore (`_req`, `_next`) so ESLint passes.                                                                                                                                                                                                                                                                                            |
| `res.locals.NODE_ENV` (activity 1)                                                                | Your `server.js` already has `const NODE_ENV = ...toLocaleLowerCase()`; reuse it.                                                                                                                                                                                                                                                                                                                                                                                                       |

**When done:** `npm run verify` (format + lint), then `deploy.sh -preview` (runs all tests), then commit on a branch and
`release.sh cse340 <branch>`. Optional: add `/organization/1` to the endpoints in
`src/scripts/js/modules/tests/previewTestSuite.mjs`.

**Quiz rule:** the W03 Learning Activities quiz (due Thu Nov 12, 6:59 PM ET) must be taken **without AI**: course
materials only, 3 attempts, latest score kept.

---

---

## 1. Middleware

Full page: https://byui-cse.github.io/cse340-ww-course-v2/week03/prepare-middleware.html

In this activity, you will add middleware functions to your application.

### Add middleware to log every request

    In this step, you will add a middleware function that will log every request to your application. This will help you understand how middleware processes every request that comes to your server.

    In your server.js file, add the following code to come after the code that sets the view engine and the views directory, but directly before your route definitions.

```
// Middleware to log all incoming requests
app.use((req, res, next) => {
    if (NODE_ENV === 'development') {
        console.log(`${req.method} ${req.url}`);
    }
    next(); // Pass control to the next middleware or route
});
```

        Save your file and navigate to different pages in your application. Watch your console to see the logs for each request. This demonstrates how middleware runs for every request before reaching your route handlers.

### Add middleware to make NODE_ENV available

    In this step, you will create another middleware function to make the environment variable NODE_ENV available to all your templates. This will be helpful in the future, when you create an error page and want to display detailed error information only when NODE_ENV is set to development.

    Add the following code directly after your previous middleware function that logs every request.

```
// Middleware to make NODE_ENV available to all templates
app.use((req, res, next) => {
    res.locals.NODE_ENV = NODE_ENV;
    next();
});
```

### Update your footer

    Now that you have made the NODE_ENV variable available to all your templates, you can update your footer to use this variable dynamically.

    Update your src/views/partials/footer.ejs file to include a conditional message that displays "(Development mode)" after the copyright, only when NODE_ENV is set to development.

    Update your footer.ejs file to look as follows:

```

        ©  CSE 340 Service Network.

            (Development mode)

```

        Save your file and refresh any page in your application. Your footer should now show the current year and indicate if you are in development mode.

---

## 2. Error Handling (Status Codes)

Full page: https://byui-cse.github.io/cse340-ww-course-v2/week03/prepare-status-codes.html

Complete the following steps to add error handling to your application

### Create your 404 error page

        First, create a new folder errors in your src/views folder. Your folder structure should look like this:

```
src/
└── views/
    ├── errors/
    └── partials/
```

      Next, create a new file for your 404 error page: 404.ejs in the src/views/errors folder.

      Include the following content in the 404.ejs page:

```

### Page Not Found

    The page you are looking for does not exist.
    Return to the homepage to continue browsing.

```

### Using the same header and footer

      Notice that your error pages can use the same header and footer partials as the rest of your site. This helps maintain a consistent look and feel across all pages, including error pages.

### Create your 500 error page

    Next, you will create a file to render when an unexpected server error occurs.

    Create a file named 500.ejs in your src/views/errors directory and include the following content:

```

### Something Went Wrong

    We are experiencing technical difficulties. Our team has been notified and is working to fix the issue.
    Return to the homepage to continue browsing.

            Error Details (Development Only)

```

        This template shows a user-friendly message while hiding technical details from users in production. The details element creates an expandable section that only appears during development.

### Implement the catch-all route

        Add this middleware to your server.js file after all your regular routes but before you start the server. This creates a 404 error for any request that does not match your defined routes:

```
// Catch-all route for 404 errors
app.use((req, res, next) => {
    const err = new Error('Page Not Found');
    err.status = 404;
    next(err);
});
```

        Because you placed this after all of your other routes, this middleware only runs when no other route matches, creating a 404 error and forwarding it to your global error handler. Setting err.status = 404 tells your error handler what type of error occurred.

### Create the global error handler

        Add this error handling middleware after your catch-all route. The four-parameter signature tells Express this is specifically for handling errors:

```
// Global error handler
app.use((err, req, res, next) => {
    // Log error details for debugging
    console.error('Error occurred:', err.message);
    console.error('Stack trace:', err.stack);

    // Determine status and template
    const status = err.status || 500;
    const template = status === 404 ? '404' : '500';

    // Prepare data for the template
    const context = {
        title: status === 404 ? 'Page Not Found' : 'Server Error',
        error: err.message,
        stack: err.stack
    };

    // Render the appropriate error template
    res.status(status).render(`errors/${template}`, context);
});
```

        This handler catches all errors, logs them for developers, and renders the appropriate template based on the error's status code. The logging helps you debug issues while the templates provide a polished experience for users.

### Test Your Error Handling

    It can be difficult to test error handling because errors are often unexpected and rare during normal use. In order to help test, you will create a test route you can load to trigger a 500 error.

        Add this route before your catch-all middleware:

```
// Test route for 500 errors
app.get('/test-error', (req, res, next) => {
    const err = new Error('This is a test error');
    err.status = 500;
    next(err);
});
```

        This route simulates a server error by creating a new error and forwarding it to the global error handler.

    Test your error handling
    Start your server and visit the following URLs in your browser:

-
404 Error: Visit any non-existent page like http://127.0.0.1:3000/does-not-exist or http://127.0.0.1:3000/sldkfjlksj

-           500 Error: Visit http://127.0.0.1:3000/test-error

        Both should display your custom error pages instead of default browser error messages. Check your server console to confirm errors are being logged properly.

---

## 3. The Model-View-Controller Pattern

Full page: https://byui-cse.github.io/cse340-ww-course-v2/week03/prepare-mvc.html

As noted, your Views and Models are already well-defined in your project structure in the views/ and models/ folders.

    In this activity, you will refactor your current code to follow the MVC architecture more explicitly by pulling out the controller logic from the server.js file into separate controller modules.

    Then, you will be in a position to add more advanced features and business logic to your application while keeping your code organized and maintainable.

### Understand the plan

    In the next few steps, you will move all of the router and controller logic out of server.js into other files. Before moving any code, it is important to understand what you will be moving.

    The following snippet contains one of the route handlers from your server.js file:

```
app.get('/organizations', async (req, res) => {
    const organizations = await getAllOrganizations();
    const title = 'Our Partner Organizations';

    res.render('organizations', { title, organizations });
});
```

    In this code, the callback function is the controller logic. You will give this function a name (organizationsPage) and move it to a controller file src/controllers/organizations.js. For example, this function will look something like the following:

```
const organizationsPage = async (req, res) => {
    const organizations = await getAllOrganizations();
    const title = 'Our Partner Organizations';

    res.render('organizations', { title, organizations });
});
```

    Then, the routing logic that calls this controller function (app.get('/organizations', async (req, res) => { ... })) will be updated to call this function name ( app.get('/organizations', organizationsPage); ) and placed in a separate routing file: src/routes.js. It will look something like this:

```
import { organizationsPage } from './controllers/organizations.js';

app.get('/organizations', organizationsPage);
```

    When you are finished, all of the callback functions (the controller logic) will be in src/controllers/*.js files, and then all of the routing logic will be in src/routes.js file.

    Then, your server.js file will import the routes from src/routes.js and use them with app.use().

    The following steps will guide you through all of these changes.

### Create Controller Modules

- Create a new folder named controllers/ in your src/ folder.

- Create the following files in your src/controllers/ folder—one for each major feature of your application:

- src/controllers/index.js

- src/controllers/organizations.js

- src/controllers/projects.js

- src/controllers/categories.js

- src/controllers/errors.js

### Move the controller callback functions to the controllers files

    You will move the callback controller functions from server.js to the new controllers you just created and give them each a name.

    The following table indicates which functions will be moved to which controller files:

        Move the callback from this route
        To this Controller file

        app.get('/', ...)
        src/controllers/index.js

        app.get('/organizations', ...)
        src/controllers/organizations.js

        app.get('/projects', ...)
        src/controllers/projects.js

        app.get('/categories', ...)
        src/controllers/categories.js

        app.get('/test-error', ...)
        src/controllers/errors.js

    When you move the function you need to:

- Give the function a name (for example: showOrganizationsPage)

- At the top of the controller file, make sure to import any models functions you need.

- At the bottom of the controller file, export the controller functions so they can be imported and used later in the routes.js file.

  First, move the home page callback controller function to the src/controllers/index.js file. It should look as follows:

```
// Import any needed model functions (none are needed for the home page, so this is empty)

// Define any controller functions
const showHomePage = async (req, res) => {
    const title = 'Home';

    res.render('home', { title });
};

// Export any controller functions
export { showHomePage };
```

    Next, move the organizations callback controller function to the src/controllers/organizations.js file. It should look as follows:

```
// Import any needed model functions
import { getAllOrganizations } from '../models/organizations.js';

// Define any controller functions
const showOrganizationsPage = async (req, res) => {
    const organizations = await getAllOrganizations();
    const title = 'Our Partner Organizations';

    res.render('organizations', { title, organizations });
};

// Export any controller functions
export { showOrganizationsPage };
```

    Next, move the service projects callback controller function to the src/controllers/projects.js file. It should look as follows:

```
// Import any needed model functions
import { getAllProjects } from '../models/projects.js';

// Define any controller functions
const showProjectsPage = async (req, res) => {
    const projects = await getAllProjects();
    const title = 'Service Projects';

    res.render('projects', { title, projects });
};

// Export any controller functions
export { showProjectsPage };
```

    Next, move the categories callback controller function to the src/controllers/categories.js file. It should look as follows:

```
// Import any needed model functions
import { getAllCategories } from '../models/categories.js';

// Define any controller functions
const showCategoriesPage = async (req, res) => {
    const categories = await getAllCategories();
    const title = 'Service Categories';

    res.render('categories', { title, categories });
};

// Export any controller functions
export { showCategoriesPage };
```

### Be careful about relative paths

      When importing model functions into your controller files, make sure to use the correct relative path. Before, these imports were relative to the root directory, so they started with ./src/models/. Now they are being imported from files in the src/controllers/ directory, so they need to begin with ../models/ instead.

    Next, move the test-error callback function to the src/controllers/errors.js file. It should look as follows:

```
// Import any needed model functions (none are needed for the error pages, so this is empty)

// Define any controller functions

// Test route for 500 errors
const testErrorPage = (req, res, next) => {
    const err = new Error('This is a test error');
    err.status = 500;
    next(err);
};

// Export any controller functions
export { testErrorPage };
```

### Create the routes.js file

    Create a new file named src/routes.js. This file will contain all of the routing logic for your application.

    In this file, you will import all of the controller functions you just created and then define the routes that use those controller functions as route handlers.

    Finally, you will export the router object to use in the server.js file.

    Your src/routes.js file should look as follows:

```
import express from 'express';

import { showHomePage } from './controllers/index.js';
import { showOrganizationsPage } from './controllers/organizations.js';
import { showProjectsPage } from './controllers/projects.js';
import { showCategoriesPage } from './controllers/categories.js';
import { testErrorPage } from './controllers/errors.js';

const router = express.Router();

router.get('/', showHomePage);
router.get('/organizations', showOrganizationsPage);
router.get('/projects', showProjectsPage);
router.get('/categories', showCategoriesPage);

// error-handling routes
router.get('/test-error', testErrorPage);

export default router;
```

    Notice that in this file, you are using a router object to define your routes instead of directly using the app object. You then export this router object to use in server.js.

### Refactor server.js to use your new routes

    Now that you have the Controllers in place, you can update server.js to use the router you created in src/routes.js.

    First, at the top of your server.js file, next to your other import statements, import the router:

```
import router from './src/routes.js';
```

    Then, you can also remove the following imports that are no longer used in server.js:

```
// REMOVE these from server.js
import { getAllOrganizations } from './models/organizations.js';
import { getAllProjects } from './models/projects.js';
import { getAllCategories } from './models/categories.js';
```

    Next, you can replace all of the route definitions from server.js with a single line: app.use(router);. You will no longer need all the individual route definitions since they are now in src/routes.js.

    Remove these route definitions from server.js:

```
// REMOVE these from server.js
app.get('/',
    ...
);

app.get('/organizations',
    ...
);

app.get('/projects',
    ...
);

app.get('/categories',
    ...
);

app.get('/test-error',
    ...
);
```

    And replace them with this single line of code:

```
// Use the imported router to handle routes
app.use(router);
```

    Using app.use(router); tells your Express application to use the routes defined in the router object for handling incoming requests. This keeps your server.js file clean and focused on application setup, while all routing logic is encapsulated in the router module.

### Be careful about the order

      As mentioned in the middleware learning activity, the order in which you use middleware and routes in Express matters. Make sure to place app.use(router); after any middleware that needs to run before your routes. It should come right before your catch-all route and global error handler.

    Your server.js file should now look something like this:

```
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { testConnection } from './src/models/db.js';
import router from './src/routes.js';

// Define the application environment
const NODE_ENV = process.env.NODE_ENV?.toLowerCase() || 'production';

// Define the port number the server will listen on
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/**
  * Configure Express middleware
  */

// Serve static files from the public directory
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
    next(); // Pass control to the next middleware or route
});

// Middleware to make NODE_ENV available to all templates
app.use((req, res, next) => {
    res.locals.NODE_ENV = NODE_ENV;
    next();
});

// Use the imported router to handle routes
app.use(router);

// Catch-all route for 404 errors
app.use((req, res, next) => {
    const err = new Error('Page Not Found');
    err.status = 404;
    next(err);
});

// Global error handler
app.use((err, req, res, next) => {
    // Log error details for debugging
    console.error('Error occurred:', err.message);
    console.error('Stack trace:', err.stack);

    // Determine status and template
    const status = err.status || 500;
    const template = status === 404 ? '404' : '500';

    // Prepare data for the template
    const context = {
        title: status === 404 ? 'Page Not Found' : 'Server Error',
        error: err.message,
        stack: err.stack
    };

    // Render the appropriate error template
    res.status(status).render(`errors/${template}`, context);
});

app.listen(PORT, async () => {
  try {
    await testConnection();
    console.log(`Server is running at http://127.0.0.1:${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
});
```

### Test your application

    Now that you have refactored your application to use the MVC pattern, it is important to test everything to ensure it still works as expected.

    First, test your application locally, then, deploy it to your hosting environment and test it there as well.

    If you encounter any problems, make sure you fix them before moving on.

---

## 4. Route and Query Parameters

Full page: https://byui-cse.github.io/cse340-ww-course-v2/week03/prepare-route-parameters.html

For this activity, you will enhance your application by adding new functionality related to organizations. Specifically, you will create a new organization details page to display information about a specific organization and the service projects associated with it. This will use route parameters to identify organizations by their unique IDs.

### New Functionality

    You will add the following new functionality:

- Create a new organization details page that lists the details of a specific organization and the service projects associated with that organization. The URL for this page will be in the format /organization/:id such as /organization/123

- Update your main partner organizations page (/organizations) that lists all organizations so that it now includes links to the new organization details pages.

  To complete this activity, follow these steps:

### Create the model functions for organization details

    For the organization details page, we will need two model functions:

- A function to retrieve the details of a specific organization.

- A function to retrieve the service projects associated with a specific organization.

  In your organization model file src/models/organizations.js, create a new function that retrieves the details of a specific organization. This function should accept an organization ID as a parameter and return the relevant data.

- Open the src/models/organizations.js file and add the following new function for retrieving organization details. It should come directly after the other function you already have that retrieves all organizations.

```
const getOrganizationDetails = async (organizationId) => {
      const query = `
      SELECT
        organization_id,
        name,
        description,
        contact_email,
        logo_filename
      FROM organization
      WHERE organization_id = $1;
    `;

      const queryParams = [organizationId];
      const result = await db.query(query, queryParams);

      // Return the first row of the result set, or null if no rows are found
      return result.rows.length > 0 ? result.rows[0] : null;
};
```

- Export the new function by adding it to the export statement at the bottom of the file as follows:

```
// Export the model functions
export { getAllOrganizations, getOrganizationDetails };
```

### Important Security Note

      Notice that this function uses a parameterized query to safely include the organization ID in the SQL statement, which helps prevent SQL injection attacks. If you included the organization ID directly in the query string, it could allow malicious users to execute arbitrary SQL commands.
      In this course, you should always use parameterized queries when including user input in SQL statements. Never put the user input directly into the query string.

    Next, you will create the model function to retrieve the service projects associated with a specific organization. This function should be in the src/models/projects.js model file, because it related specifically to projects.

- Open the src/models/projects.js file and add the following new function for retrieving service projects associated with an organization. It should come directly after the other function you already have that retrieves all projects.

```
const getProjectsByOrganizationId = async (organizationId) => {
      const query = `
        SELECT
          project_id,
          organization_id,
          title,
          description,
          location,
          date
        FROM project
        WHERE organization_id = $1
        ORDER BY date;
      `;

      const queryParams = [organizationId];
      const result = await db.query(query, queryParams);

      return result.rows;
};
```

- Export the new function by adding it to the export statement at the bottom of the file as follows:

```
// Export the model functions
export { getAllProjects, getProjectsByOrganizationId };
```

### Create the controller function for organization details

    In your organization controller file src/controllers/organizations.js, create a new controller function that uses the model functions you just created to get the details of an organization and its service projects and then pass that data to a new view to render the information.

- Open the src/controllers/organizations.js file and import the two model functions at the top of the file (replace your earlier import statement that only imported getAllOrganizations to now import two functions from that model):

```
import { getAllOrganizations, getOrganizationDetails } from '../models/organizations.js';
import { getProjectsByOrganizationId } from '../models/projects.js';
```

- Next, add the following new controller function for the organization details page. It should come directly after the other controller function you already have to render the list of all organizations. This controller function should call the two model functions you just imported to get the organization details and its associated service projects, then pass that data to a new view to render the information.

```
const showOrganizationDetailsPage = async (req, res) => {
    const organizationId = req.params.id;
    const organizationDetails = await getOrganizationDetails(organizationId);
    const projects = await getProjectsByOrganizationId(organizationId);
    const title = 'Organization Details';

    res.render('organization', {title, organizationDetails, projects});
};
```

- Notice that this code refers to an EJS template named organization.ejs which does not exist yet. You will create this EJS template in a future step.

- Export the new controller function by adding it to the export statement at the bottom of the file as follows:

```
// Export any controller functions
export { showOrganizationsPage, showOrganizationDetailsPage };
```

### Update the router to include the new route

    In your router file src/routes.js, add a new route that maps to the organization details controller function.

- Open the src/routes.js file. At the top, add the following import to the list of model imports:

```
import { showOrganizationDetailsPage } from './controllers/organizations.js';
```

- Add the following new route definition. You can place this at the end of the list of the other routes.

```
// Route for organization details page
router.get('/organization/:id', showOrganizationDetailsPage);
```

    Notice that this route uses a URL parameter (:id) to capture the organization ID from the URL. This ID is then accessed by the controller function to fetch and display the details for the specific organization.

    For example, the URL for this page will look like /organization/13 where 13 is the ID of the organization.

### Create the organization details view

    Create a new view file src/views/organization.ejs to display the organization details and its associated service projects.

- Create a new file named organization.ejs in your src/views directory.

- This EJS template should include the following:

- The header and footer partials.

- An <h2> heading for the organization name.

- An image of the organization's logo.

- A paragraph with the organization's description.

- A list of the service projects associated with the organization. Each service project should be a link to the service project details page. You have not created this page yet, but you will in the team activity this week. The URL for the links should be /project/[id] where [id] is the ID of the service project. (This link will not work yet, but as soon as you create the page in your team activity it will work.)

        Sample code (click to expand)
        Your code for src/views/organization.ejs should look similar to the following:

```

###

###

    " alt=" logo">

    Description:

### Service Projects

         { %>

- ">

```

      Notice that the image URL will be built to have the logo filename from the organization details, so it will generate a URL like this /images/logo.png where logo.png is the filename of the organization's logo.

### Update the organizations list view to include links

    Update the main partner organizations view src/views/organizations.ejs to include links to the new organization details pages.

- Open the src/views/organizations.ejs file.

- Modify the code that displays each organization to include a link to the organization details page. The new link should look as follows:

```
">
```

    Notice that the organization id is placed in the link URL, so that it will generate a URL like this /organization/13 where 13 is the ID of the organization.

      Sample code (click to expand)
      The complete src/views/organizations.ejs file should look similar to this:

```

###

    Here are a few of our partner organizations:

         { %>

- " alt=" logo">">:

```

### Test your application

    Start your application and navigate to the organizations list page. Click on an organization link to verify that the organization details page displays the correct information.

### Hint: View the HTML source

      If you encounter any issues with the links or images not displaying correctly, viewing the HTML source can help you diagnose the problem. In the browser, right-click on the page and select "View Page Source" (or a similar option depending on your browser). This will show you the raw HTML that was generated by your EJS templates.
