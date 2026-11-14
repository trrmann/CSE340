# W04: Learning Activities + Team Activity + Assignment: Code Steps

**Due (ET):** Learning Activities + Team Activity quizzes **Thu Nov 19, 6:59 PM** · Assignment, Coaching, Status
Update **Sat Nov 21, 6:59 PM**.

Follows your structure: SQL in `src/scripts/sql/<model>/`, class methods in `src/models/` using
`this.query({ querySQLPath, params })`, course-named alias exports, controller classes with arrow-function handlers,
routes in `src/routes.js`, views in `src/views/`. Every SQL statement below was validated against your database.

**This week adds no tables**, so `src/setup.sql` and provisioning don't change. Your existing table-file names
(`createOrganization.sql` = CREATE TABLE) stay; the new row-level files are named `insert…sql` / `update…sql`.

Do **Part A first** (W03 improvements), then the parts **in order**; after each, run `npm run dev` and do its **Check**.

---

## Part A: W03 coaching improvements (do these before W04)

From the W03 coaching session: an `HttpError` class, a shared `BaseController`, models passed into controllers
(dependency injection), and an `App` class for the server. **Nothing changes for visitors**: same pages, URLs, file
names and course function names; `server.js` stays the entry point. Do this part on its own branch and release it
before Part 0, so W04 starts from a working base.

- [ ] **A.1** New file `src/lib/httpError.js`:

```js
/**
 * An Error that carries an HTTP status for the global error handler.
 *   next(new HttpError(404, 'Category Not Found'))
 */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }

  static notFound(message = 'Page Not Found') {
    return new HttpError(404, message);
  }
}

export { HttpError };
```

- [ ] **A.2** New file `src/controllers/baseController.js`:

```js
import { HttpError } from '../lib/httpError.js';

/**
 * Shared helpers for every controller. Controllers extend this class, so the same rules
 * apply everywhere (for example, what counts as a valid id).
 */
class BaseController {
  /** A positive whole-number id from a route parameter, or null if it isn't one. */
  parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  /** A 404 error for the global error handler. */
  notFound(message) {
    return HttpError.notFound(message);
  }
}

export { BaseController };
```

- [ ] **A.3** `src/controllers/index.js`: replace the **whole file** with:

```js
import { BaseController } from './baseController.js';

class HomeController extends BaseController {
  showHomePage = async (_req, res) => {
    const title = 'Home';
    res.render('home', { title });
  };
}

export { HomeController };
```

- [ ] **A.4** `src/controllers/errors.js`: replace the **whole file** with:

```js
import { BaseController } from './baseController.js';
import { HttpError } from '../lib/httpError.js';

class ErrorController extends BaseController {
  throwError500 = async (_req, _res, next) => {
    next(new HttpError(500, 'This is a test Error'));
  };
}

export { ErrorController };
```

- [ ] **A.5** `src/controllers/organizations.js`: replace the **whole file** with:

```js
import { BaseController } from './baseController.js';
import { OrganizationsModel } from '../models/organizations.js';
import { ProjectsModel } from '../models/projects.js';

class OrganizationsController extends BaseController {
  /** Models are passed in (tests can pass fakes); the defaults are the real models. */
  constructor({
    organizationsModel = new OrganizationsModel(),
    projectsModel = new ProjectsModel(),
  } = {}) {
    super();
    this.organizationsModel = organizationsModel;
    this.projectsModel = projectsModel;
  }

  showOrganizationsPage = async (_req, res) => {
    const organizations = await this.organizationsModel.getAllOrganization();
    const title = 'Our Partner Organizations';
    res.render('organizations', { title, organizations });
  };

  showOrganizationDetailsPage = async (req, res, next) => {
    const organizationId = this.parseId(req.params.id);
    const organizationDetails = organizationId
      ? await this.organizationsModel.getOrganizationDetails(organizationId)
      : null;
    if (!organizationDetails) {
      return next(this.notFound('Organization Not Found'));
    }
    const projects = await this.projectsModel.getProjectsByOrganizationId(organizationId);
    const title = 'Organization Details';
    res.render('organization', { title, organizationDetails, projects });
  };
}

export { OrganizationsController };
```

- [ ] **A.6** `src/controllers/projects.js`: replace the **whole file** with:

```js
import { BaseController } from './baseController.js';
import { ProjectsModel } from '../models/projects.js';
import { CategoriesModel } from '../models/categories.js';

const NUMBER_OF_UPCOMING_PROJECTS = 5;

class ProjectsController extends BaseController {
  constructor({
    projectsModel = new ProjectsModel(),
    categoriesModel = new CategoriesModel(),
  } = {}) {
    super();
    this.projectsModel = projectsModel;
    this.categoriesModel = categoriesModel;
  }

  showProjectsPage = async (_req, res) => {
    const projects = await this.projectsModel.getUpcomingProjects(NUMBER_OF_UPCOMING_PROJECTS);
    const title = 'Upcoming Service Projects';
    res.render('projects', { title, projects });
  };

  showProjectDetailsPage = async (req, res, next) => {
    const projectId = this.parseId(req.params.id);
    const project = projectId ? await this.projectsModel.getProjectDetails(projectId) : null;
    if (!project) {
      return next(this.notFound('Project Not Found'));
    }
    const categories = await this.categoriesModel.getCategoriesByProjectId(projectId);
    const title = project.title;
    res.render('project', { title, project, categories });
  };
}

export { ProjectsController };
```

- [ ] **A.7** `src/controllers/categories.js`: replace the **whole file** with:

```js
import { BaseController } from './baseController.js';
import { CategoriesModel } from '../models/categories.js';
import { ProjectsModel } from '../models/projects.js';

class CategoriesController extends BaseController {
  constructor({
    categoriesModel = new CategoriesModel(),
    projectsModel = new ProjectsModel(),
  } = {}) {
    super();
    this.categoriesModel = categoriesModel;
    this.projectsModel = projectsModel;
  }

  showCategoriesPage = async (_req, res) => {
    const categories = await this.categoriesModel.getAllCategories();
    const title = 'Service Project Categories';
    res.render('categories', { title, categories });
  };

  showCategoryDetailsPage = async (req, res, next) => {
    const categoryId = this.parseId(req.params.id);
    const category = categoryId ? await this.categoriesModel.getCategoryDetails(categoryId) : null;
    if (!category) {
      return next(this.notFound('Category Not Found'));
    }
    const projects = await this.projectsModel.getProjectsByCategoryId(categoryId);
    const title = category.name;
    res.render('category', { title, category, projects });
  };
}

export { CategoriesController };
```

- [ ] **A.8** New file `src/app.js` (everything that was in `server.js`, as a class with one method per setup step,
      always called in the right order):

```js
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { PgDBConnection } from './models/db.js';
// Imported for its side effect: registers the project_category join table for provisioning.
// Every model must be imported before the first query, or provisioning will skip its table.
import './models/projectCategories.js';
import { Router } from './routes.js';
import { HttpError } from './lib/httpError.js';

/** Project root folder (this file is src/app.js). */
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

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
```

- [ ] **A.9** `server.js`: replace the **whole file** with:

```js
import { App } from './src/app.js';

// Entry point: build the application and start listening (setup lives in src/app.js).
await new App().start();
```

**Check (Part A):**

- `npm run dev`: `/`, `/organizations`, `/organization/1`, `/projects`, `/project/2`, `/categories`, `/category/1`
  all look exactly as before.
- `/nope` → 404 page; `/test-error` → 500 page; `/organization/abc` and `/project/999` → 404 page.
- `/api/health` → `"status":"healthy"`.
- `npm run verify`, then `deploy.sh -preview` (all tests), then commit on a branch and `release.sh cse340 <branch>`.

---

## Part 0: Setup (packages, placeholder logo, session secret)

- [ ] **0.1** In the project folder:

```bash
npm install express-session express-validator
```

- [ ] **0.2** Placeholder logo for new organizations:

```bash
curl -o public/images/placeholder-logo.png https://byui-cse.github.io/cse340-ww-course-v2/images/week01/site-images/placeholder-logo.png
```

- [ ] **0.3** Generate a session secret and add it to `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Add the line `SESSION_SECRET=<the printed value>` to `.env`.

- [ ] **0.4** **Render:** web service → **Environment** → add `SESSION_SECRET` with **a different** generated value →
      Save. (Without it, production sessions and flash messages won't work.)

---

## Part 1: Forms, sessions, flash messages (shared plumbing)

- [ ] **1.1** New file `src/middleware/flash.js`:

```js
/**
 * Flash messages: stored in the session, survive one redirect, cleared when read.
 *   req.flash('success', 'text')  store a message
 *   req.flash('error')            read (and clear) one type
 *   req.flash()                   read (and clear) all types
 * Templates call flash() through res.locals.
 */
class FlashMessages {
  static #empty() {
    return { success: [], error: [], warning: [], info: [] };
  }

  static middleware = (req, res, next) => {
    req.flash = (type, message) => {
      if (!req.session.flash) {
        req.session.flash = FlashMessages.#empty();
      }
      if (type && message) {
        (req.session.flash[type] ??= []).push(message);
        return undefined;
      }
      if (type) {
        const messages = req.session.flash[type] || [];
        req.session.flash[type] = [];
        return messages;
      }
      const all = req.session.flash;
      req.session.flash = FlashMessages.#empty();
      return all;
    };
    res.locals.flash = req.flash;
    next();
  };
}

export { FlashMessages };
```

- [ ] **1.2** `src/app.js`: add these imports with the other imports at the top:

```js
import session from 'express-session';
import { FlashMessages } from './middleware/flash.js';
```

and add this at the **end** of the `configureMiddleware()` method (after the `res.locals.NODE_ENV` middleware; routes
are set up after this method, so these run first):

```js
// Read form submissions (POST bodies)
this.app.use(express.urlencoded({ extended: true }));
this.app.use(express.json());
// Sessions (in memory) and flash messages
this.app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }, // 1 hour
  })
);
this.app.use(FlashMessages.middleware);
```

- [ ] **1.3** `src/controllers/baseController.js`: add form-validation support for every controller. Add this import
      at the top:

```js
import { validationResult } from 'express-validator';
```

and add this method **inside the class**, after `notFound(...)`:

```js
  /** Flash every validation error from express-validator; returns true when there were errors. */
  flashErrors(req) {
    const results = validationResult(req);
    results.array().forEach((error) => req.flash('error', error.msg));
    return !results.isEmpty();
  }
```

- [ ] **1.4** `src/views/partials/header.ejs`: directly **after** the line `</nav>`, add:

```html
<%_ const messages = flash(); _%> <%_ Object.keys(messages).forEach(type => { _%> <%_ if
(messages[type].length > 0) { _%>
<div class="alert <%= type %>">
  <%_ messages[type].forEach(msg => { _%>
  <p><%= msg %></p>
  <%_ }); _%>
</div>
<%_ } _%> <%_ }); _%>
```

- [ ] **1.5** `public/css/core.css`: add at the end:

```css
/* Forms */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font: inherit;
}

.form-group textarea {
  min-height: 6rem;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Flash messages */
.alert {
  padding: 15px;
  margin: 1rem 0;
  border: 1px solid transparent;
  border-radius: 4px;
}
.alert.success {
  color: #155724;
  background-color: #d4edda;
  border-color: #c3e6cb;
}
.alert.error {
  color: #721c24;
  background-color: #f8d7da;
  border-color: #f5c6cb;
}
.alert.warning {
  color: #856404;
  background-color: #fff3cd;
  border-color: #ffeeba;
}
.alert.info {
  color: #0c5460;
  background-color: #d1ecf1;
  border-color: #bee5eb;
}
```

**Check:** every existing page still loads (the header now calls `flash()`, which needs Part 1.3).

---

## Part 2: Create + edit organizations (learning activities: forms, sessions, validation, update)

- [ ] **2.1** New file `src/scripts/sql/organization/insertOrganization.sql`:

```sql
INSERT INTO {{schema}}.organization (name, description, contact_email, logo_filename)
VALUES ($1, $2, $3, $4)
RETURNING organization_id;
```

- [ ] **2.2** New file `src/scripts/sql/organization/updateOrganization.sql`:

```sql
UPDATE {{schema}}.organization
SET name = $1, description = $2, contact_email = $3, logo_filename = $4
WHERE organization_id = $5
RETURNING organization_id;
```

- [ ] **2.3** `src/models/organizations.js`: add **inside the class**, after `getOrganizationDetails(...)`:

```js
  async createOrganization(name, description, contactEmail, logoFilename) {
    const result = await this.query({
      querySQLPath: 'insertOrganization.sql',
      params: [name, description, contactEmail, logoFilename],
    });
    if (result.rows.length === 0) {
      throw new Error('Failed to create organization');
    }
    return result.rows[0].organization_id;
  }
  async updateOrganization(organizationId, name, description, contactEmail, logoFilename) {
    const result = await this.query({
      querySQLPath: 'updateOrganization.sql',
      params: [name, description, contactEmail, logoFilename, organizationId],
    });
    if (result.rows.length === 0) {
      throw new Error('Organization not found');
    }
    return result.rows[0].organization_id;
  }
```

- [ ] **2.4** `src/models/organizations.js`: add aliases above the `export` line and replace the `export` line:

```js
const createOrganization = (name, description, contactEmail, logoFilename) =>
  new OrganizationsModel().createOrganization(name, description, contactEmail, logoFilename);
const updateOrganization = (organizationId, name, description, contactEmail, logoFilename) =>
  new OrganizationsModel().updateOrganization(
    organizationId,
    name,
    description,
    contactEmail,
    logoFilename
  );

export {
  OrganizationsModel,
  getAllOrganizations,
  getOrganizationDetails,
  createOrganization,
  updateOrganization,
};
```

- [ ] **2.5** `src/controllers/organizations.js`: replace the **whole file** with:

```js
import { body } from 'express-validator';
import { BaseController } from './baseController.js';
import { OrganizationsModel } from '../models/organizations.js';
import { ProjectsModel } from '../models/projects.js';

class OrganizationsController extends BaseController {
  /** Server-side validation for the create and edit organization forms. */
  static validation = [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Organization name is required')
      .isLength({ min: 3, max: 150 })
      .withMessage('Organization name must be between 3 and 150 characters'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Organization description is required')
      .isLength({ max: 500 })
      .withMessage('Organization description cannot exceed 500 characters'),
    body('contactEmail')
      .normalizeEmail()
      .notEmpty()
      .withMessage('Contact email is required')
      .isEmail()
      .withMessage('Please provide a valid email address'),
  ];

  /** Models are passed in (tests can pass fakes); the defaults are the real models. */
  constructor({
    organizationsModel = new OrganizationsModel(),
    projectsModel = new ProjectsModel(),
  } = {}) {
    super();
    this.organizationsModel = organizationsModel;
    this.projectsModel = projectsModel;
  }

  showOrganizationsPage = async (_req, res) => {
    const organizations = await this.organizationsModel.getAllOrganization();
    const title = 'Our Partner Organizations';
    res.render('organizations', { title, organizations });
  };

  showOrganizationDetailsPage = async (req, res, next) => {
    const organizationId = this.parseId(req.params.id);
    const organizationDetails = organizationId
      ? await this.organizationsModel.getOrganizationDetails(organizationId)
      : null;
    if (!organizationDetails) {
      return next(this.notFound('Organization Not Found'));
    }
    const projects = await this.projectsModel.getProjectsByOrganizationId(organizationId);
    const title = 'Organization Details';
    res.render('organization', { title, organizationDetails, projects });
  };

  showNewOrganizationForm = async (_req, res) => {
    const title = 'Add New Organization';
    res.render('new-organization', { title });
  };

  processNewOrganizationForm = async (req, res) => {
    if (this.flashErrors(req)) {
      return res.redirect('/new-organization');
    }
    const { name, description, contactEmail } = req.body;
    const logoFilename = 'placeholder-logo.png';
    const organizationId = await this.organizationsModel.createOrganization(
      name,
      description,
      contactEmail,
      logoFilename
    );
    req.flash('success', 'Organization added successfully!');
    res.redirect(`/organization/${organizationId}`);
  };

  showEditOrganizationForm = async (req, res, next) => {
    const organizationId = this.parseId(req.params.id);
    const organizationDetails = organizationId
      ? await this.organizationsModel.getOrganizationDetails(organizationId)
      : null;
    if (!organizationDetails) {
      return next(this.notFound('Organization Not Found'));
    }
    const title = 'Edit Organization';
    res.render('edit-organization', { title, organizationDetails });
  };

  processEditOrganizationForm = async (req, res, next) => {
    const organizationId = this.parseId(req.params.id);
    if (!organizationId) {
      return next(this.notFound('Organization Not Found'));
    }
    if (this.flashErrors(req)) {
      return res.redirect(`/edit-organization/${organizationId}`);
    }
    const { name, description, contactEmail, logoFilename } = req.body;
    await this.organizationsModel.updateOrganization(
      organizationId,
      name,
      description,
      contactEmail,
      logoFilename
    );
    req.flash('success', 'Organization updated successfully!');
    res.redirect(`/organization/${organizationId}`);
  };
}

export { OrganizationsController };
```

- [ ] **2.6** `src/routes.js` (it already imports `OrganizationsController`): in `initializeRoutes()`, add right after the `/organization/:id` route:

```js
this.get('/new-organization', Router.#organizationsController.showNewOrganizationForm);
this.post(
  '/new-organization',
  OrganizationsController.validation,
  Router.#organizationsController.processNewOrganizationForm
);
this.get('/edit-organization/:id', Router.#organizationsController.showEditOrganizationForm);
this.post(
  '/edit-organization/:id',
  OrganizationsController.validation,
  Router.#organizationsController.processEditOrganizationForm
);
```

- [ ] **2.7** New file `src/views/new-organization.ejs` (client-side validation: `required` + `maxlength`; **no**
      `minlength` on the name, so you can see the server-side check):

```html
<%- include('partials/header') %>
<main>
  <h1><%= title %></h1>
  <form action="/new-organization" method="POST">
    <div class="form-group">
      <label for="name">Organization Name</label>
      <input type="text" id="name" name="name" maxlength="150" required />
    </div>
    <div class="form-group">
      <label for="description">Description</label>
      <textarea id="description" name="description" maxlength="500" required></textarea>
    </div>
    <div class="form-group">
      <label for="contactEmail">Contact Email</label>
      <input type="email" id="contactEmail" name="contactEmail" maxlength="255" required />
    </div>
    <button type="submit">Create Organization</button>
  </form>
</main>
<%- include('partials/footer') %>
```

- [ ] **2.8** New file `src/views/edit-organization.ejs`:

```html
<%- include('partials/header') %>
<main>
  <h1><%= title %></h1>
  <form action="/edit-organization/<%= organizationDetails.organization_id %>" method="POST">
    <div class="form-group">
      <label for="name">Organization Name</label>
      <input
        type="text"
        id="name"
        name="name"
        value="<%= organizationDetails.name %>"
        maxlength="150"
        required
      />
    </div>
    <div class="form-group">
      <label for="description">Description</label>
      <textarea id="description" name="description" maxlength="500" required>
<%= organizationDetails.description %></textarea>
    </div>
    <div class="form-group">
      <label for="contactEmail">Contact Email</label>
      <input
        type="email"
        id="contactEmail"
        name="contactEmail"
        value="<%= organizationDetails.contact_email %>"
        maxlength="255"
        required
      />
    </div>
    <div class="form-group">
      <label for="logoFilename">Logo Filename</label>
      <input
        type="text"
        id="logoFilename"
        name="logoFilename"
        value="<%= organizationDetails.logo_filename %>"
        maxlength="255"
        required
      />
    </div>
    <button type="submit">Update Organization</button>
  </form>
</main>
<%- include('partials/footer') %>
```

- [ ] **2.9** `src/views/organizations.ejs`: add above the `<section class="card-grid">` line:

```html
<p><a href="/new-organization">Add a new organization</a></p>
```

- [ ] **2.10** `src/views/organization.ejs`: add inside the `intro-block` section, right after the description `<p>`:

```html
<p><a href="/edit-organization/<%= organizationDetails.organization_id %>">Edit Organization</a></p>
```

**Check:**

- `/organizations` → "Add a new organization" → submit valid data → you land on the new organization's page with a
  green "Organization added successfully!" message (shown once; reload and it's gone).
- Submit a 2-character name (passes the browser, fails the server) → back on the form with a red error message.
- Organization page → "Edit Organization" → form is pre-filled → change something → saved, green message.
- `/edit-organization/999` → 404 page.

---

## Part 3: Create service projects (learning activity: inserting new projects)

- [ ] **3.1** New file `src/scripts/sql/project/insertProject.sql`:

```sql
INSERT INTO {{schema}}.project (title, description, location, project_date, organization_id)
VALUES ($1, $2, $3, $4, $5)
RETURNING project_id;
```

- [ ] **3.2** New file `src/scripts/sql/project/updateProject.sql` (used in Part 4):

```sql
UPDATE {{schema}}.project
SET title = $1, description = $2, location = $3, project_date = $4, organization_id = $5
WHERE project_id = $6
RETURNING project_id;
```

- [ ] **3.3** `src/models/projects.js`: add **inside the class**, after `getProjectsByCategoryId(...)`:

```js
  async createProject(title, description, location, date, organizationId) {
    const result = await this.query({
      querySQLPath: 'insertProject.sql',
      params: [title, description, location, date, organizationId],
    });
    if (result.rows.length === 0) {
      throw new Error('Failed to create project');
    }
    return result.rows[0].project_id;
  }
  async updateProject(projectId, title, description, location, date, organizationId) {
    const result = await this.query({
      querySQLPath: 'updateProject.sql',
      params: [title, description, location, date, organizationId, projectId],
    });
    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }
    return result.rows[0].project_id;
  }
```

- [ ] **3.4** `src/models/projects.js`: add aliases above the `export` block and add the two names to it:

```js
const createProject = (title, description, location, date, organizationId) =>
  new ProjectsModel().createProject(title, description, location, date, organizationId);
const updateProject = (projectId, title, description, location, date, organizationId) =>
  new ProjectsModel().updateProject(projectId, title, description, location, date, organizationId);
```

Export block (replace it):

```js
export {
  ProjectsModel,
  getAllProjects,
  getProjectsByOrganizationId,
  getUpcomingProjects,
  getProjectDetails,
  getProjectsByCategoryId,
  createProject,
  updateProject,
};
```

- [ ] **3.5** `src/controllers/projects.js`: replace the **whole file** with (this also contains the Part 4 edit
      handlers, so Part 4 is mostly routes + view):

```js
import { body } from 'express-validator';
import { BaseController } from './baseController.js';
import { ProjectsModel } from '../models/projects.js';
import { CategoriesModel } from '../models/categories.js';
import { OrganizationsModel } from '../models/organizations.js';

const NUMBER_OF_UPCOMING_PROJECTS = 5;

class ProjectsController extends BaseController {
  /** Server-side validation for the create and edit project forms (limits match the table). */
  static validation = [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ min: 3, max: 150 })
      .withMessage('Title must be between 3 and 150 characters'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Description is required')
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('location')
      .trim()
      .notEmpty()
      .withMessage('Location is required')
      .isLength({ max: 255 })
      .withMessage('Location must be less than 255 characters'),
    body('date')
      .notEmpty()
      .withMessage('Date is required')
      .isISO8601()
      .withMessage('Date must be a valid date format'),
    body('organizationId')
      .notEmpty()
      .withMessage('Organization is required')
      .isInt()
      .withMessage('Organization must be a valid integer'),
  ];

  constructor({
    projectsModel = new ProjectsModel(),
    categoriesModel = new CategoriesModel(),
    organizationsModel = new OrganizationsModel(),
  } = {}) {
    super();
    this.projectsModel = projectsModel;
    this.categoriesModel = categoriesModel;
    this.organizationsModel = organizationsModel;
  }

  showProjectsPage = async (_req, res) => {
    const projects = await this.projectsModel.getUpcomingProjects(NUMBER_OF_UPCOMING_PROJECTS);
    const title = 'Upcoming Service Projects';
    res.render('projects', { title, projects });
  };

  showProjectDetailsPage = async (req, res, next) => {
    const projectId = this.parseId(req.params.id);
    const project = projectId ? await this.projectsModel.getProjectDetails(projectId) : null;
    if (!project) {
      return next(this.notFound('Project Not Found'));
    }
    const categories = await this.categoriesModel.getCategoriesByProjectId(projectId);
    const title = project.title;
    res.render('project', { title, project, categories });
  };

  showNewProjectForm = async (_req, res) => {
    const organizations = await this.organizationsModel.getAllOrganization();
    const title = 'Add New Service Project';
    res.render('new-project', { title, organizations });
  };

  processNewProjectForm = async (req, res) => {
    if (this.flashErrors(req)) {
      return res.redirect('/new-project');
    }
    const { title, description, location, date, organizationId } = req.body;
    try {
      const newProjectId = await this.projectsModel.createProject(
        title,
        description,
        location,
        date,
        organizationId
      );
      req.flash('success', 'New service project created successfully!');
      res.redirect(`/project/${newProjectId}`);
    } catch (error) {
      console.error('Error creating new project:', error);
      req.flash('error', 'There was an error creating the service project.');
      res.redirect('/new-project');
    }
  };

  showEditProjectForm = async (req, res, next) => {
    const projectId = this.parseId(req.params.id);
    const project = projectId ? await this.projectsModel.getProjectDetails(projectId) : null;
    if (!project) {
      return next(this.notFound('Project Not Found'));
    }
    const organizations = await this.organizationsModel.getAllOrganization();
    const title = 'Edit Service Project';
    res.render('edit-project', { title, project, organizations });
  };

  processEditProjectForm = async (req, res, next) => {
    const projectId = this.parseId(req.params.id);
    if (!projectId) {
      return next(this.notFound('Project Not Found'));
    }
    if (this.flashErrors(req)) {
      return res.redirect(`/edit-project/${projectId}`);
    }
    const { title, description, location, date, organizationId } = req.body;
    try {
      await this.projectsModel.updateProject(
        projectId,
        title,
        description,
        location,
        date,
        organizationId
      );
      req.flash('success', 'Service project updated successfully!');
      res.redirect(`/project/${projectId}`);
    } catch (error) {
      console.error('Error updating project:', error);
      req.flash('error', 'There was an error updating the service project.');
      res.redirect(`/edit-project/${projectId}`);
    }
  };
}

export { ProjectsController };
```

- [ ] **3.6** `src/routes.js` (it already imports `ProjectsController`): in `initializeRoutes()`, add right after the `/project/:id` route:

```js
this.get('/new-project', Router.#projectsController.showNewProjectForm);
this.post(
  '/new-project',
  ProjectsController.validation,
  Router.#projectsController.processNewProjectForm
);
```

- [ ] **3.7** New file `src/views/new-project.ejs`:

```html
<%- include('partials/header') %>
<main>
  <h1><%= title %></h1>
  <form action="/new-project" method="POST">
    <div class="form-group">
      <label for="title">Project Title</label>
      <input type="text" id="title" name="title" maxlength="150" required />
    </div>
    <div class="form-group">
      <label for="description">Description</label>
      <textarea id="description" name="description" maxlength="1000" required></textarea>
    </div>
    <div class="form-group">
      <label for="location">Location</label>
      <input type="text" id="location" name="location" maxlength="255" required />
    </div>
    <div class="form-group">
      <label for="date">Date</label>
      <input type="date" id="date" name="date" required />
    </div>
    <div class="form-group">
      <label for="organizationId">Organization</label>
      <select id="organizationId" name="organizationId" required>
        <option value="">Select an organization</option>
        <%_ organizations.forEach(organization => { _%>
        <option value="<%= organization.organization_id %>"><%= organization.name %></option>
        <%_ }); _%>
      </select>
    </div>
    <button type="submit">Create Service Project</button>
  </form>
</main>
<%- include('partials/footer') %>
```

- [ ] **3.8** `src/views/projects.ejs`: add inside the `intro-block` section, after the `<h1>`:

```html
<p><a href="/new-project">Add a New Service Project</a></p>
```

**Check:** `/projects` → "Add a New Service Project" → create one dated in the future → you land on its page with a
green message; it now appears on `/projects` if it's within the next 5. Submit a 2-character title → red error.

---

## Part 4: Team Activity: edit service projects

(Model `updateProject` = step 3.2–3.4; controllers `showEditProjectForm` / `processEditProjectForm` = step 3.5.)

- [ ] **4.1** `src/routes.js`: add right after the `/new-project` routes:

```js
this.get('/edit-project/:id', Router.#projectsController.showEditProjectForm);
this.post(
  '/edit-project/:id',
  ProjectsController.validation,
  Router.#projectsController.processEditProjectForm
);
```

- [ ] **4.2** New file `src/views/edit-project.ejs` (the date input needs `YYYY-MM-DD`, built from the local date
      parts so the day never shifts):

```html
<%- include('partials/header') %>
<%_ const d = project.project_date;
    const dateValue = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); _%>
<main>
  <h1><%= title %></h1>
  <form action="/edit-project/<%= project.project_id %>" method="POST">
    <div class="form-group">
      <label for="title">Project Title</label>
      <input type="text" id="title" name="title" value="<%= project.title %>" maxlength="150" required>
    </div>
    <div class="form-group">
      <label for="description">Description</label>
      <textarea id="description" name="description" maxlength="1000" required><%= project.description %></textarea>
    </div>
    <div class="form-group">
      <label for="location">Location</label>
      <input type="text" id="location" name="location" value="<%= project.location %>" maxlength="255" required>
    </div>
    <div class="form-group">
      <label for="date">Date</label>
      <input type="date" id="date" name="date" value="<%= dateValue %>" required>
    </div>
    <div class="form-group">
      <label for="organizationId">Organization</label>
      <select id="organizationId" name="organizationId" required>
        <%_ organizations.forEach(organization => { _%>
        <option value="<%= organization.organization_id %>"<%= organization.organization_id === project.organization_id ? ' selected' : '' %>><%= organization.name %></option>
        <%_ }); _%>
      </select>
    </div>
    <button type="submit">Update Service Project</button>
  </form>
</main>
<%- include('partials/footer') %>
```

- [ ] **4.3** `src/views/project.ejs`: add inside the `intro-block` section, after the "Sponsored by" paragraph:

```html
<p><a href="/edit-project/<%= project.project_id %>">Edit Project</a></p>
```

**Check:** a project page → "Edit Project" → form pre-filled (date and organization selected) → change the
organization → saved, green message, project now shows the new sponsor. `/edit-project/999` → 404.

- [ ] **4.4** Take the **W04 Team Activity quiz** in Canvas.

---

## Part 5: Assign categories to a project (learning activity)

- [ ] **5.1** New file `src/scripts/sql/project_category/deleteProjectCategories.sql`:

```sql
DELETE FROM {{schema}}.project_category
WHERE project_id = $1;
```

- [ ] **5.2** New file `src/scripts/sql/project_category/insertProjectCategories.sql` (inserts every selected
      category in one statement):

```sql
INSERT INTO {{schema}}.project_category (project_id, category_id)
SELECT $1, unnest($2::int[]);
```

- [ ] **5.3** `src/models/projectCategories.js`: add **inside the class**, after the constructor:

```js
  /** Replace a project's categories with exactly the given category ids. */
  async updateCategoryAssignments(projectId, categoryIds) {
    await this.query({ querySQLPath: 'deleteProjectCategories.sql', params: [projectId] });
    if (categoryIds.length > 0) {
      await this.query({
        querySQLPath: 'insertProjectCategories.sql',
        params: [projectId, categoryIds],
      });
    }
  }
```

and replace the `export` line at the bottom with:

```js
const updateCategoryAssignments = (projectId, categoryIds) =>
  new ProjectCategoriesModel().updateCategoryAssignments(projectId, categoryIds);

export { ProjectCategoriesModel, updateCategoryAssignments };
```

- [ ] **5.4** `src/controllers/categories.js`: replace the **whole file** with (also contains the Part 6 category
      create/edit handlers):

```js
import { body } from 'express-validator';
import { BaseController } from './baseController.js';
import { CategoriesModel } from '../models/categories.js';
import { ProjectsModel } from '../models/projects.js';
import { ProjectCategoriesModel } from '../models/projectCategories.js';

class CategoriesController extends BaseController {
  /** Server-side validation for the create and edit category forms. */
  static validation = [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Category name is required')
      .isLength({ min: 3, max: 100 })
      .withMessage('Category name must be between 3 and 100 characters'),
  ];

  /** PostgreSQL error 23505 = unique violation (category names are UNIQUE). */
  static #isDuplicate(error) {
    return Boolean(error) && error.code === '23505';
  }

  constructor({
    categoriesModel = new CategoriesModel(),
    projectsModel = new ProjectsModel(),
    projectCategoriesModel = new ProjectCategoriesModel(),
  } = {}) {
    super();
    this.categoriesModel = categoriesModel;
    this.projectsModel = projectsModel;
    this.projectCategoriesModel = projectCategoriesModel;
  }

  showCategoriesPage = async (_req, res) => {
    const categories = await this.categoriesModel.getAllCategories();
    const title = 'Service Project Categories';
    res.render('categories', { title, categories });
  };

  showCategoryDetailsPage = async (req, res, next) => {
    const categoryId = this.parseId(req.params.id);
    const category = categoryId ? await this.categoriesModel.getCategoryDetails(categoryId) : null;
    if (!category) {
      return next(this.notFound('Category Not Found'));
    }
    const projects = await this.projectsModel.getProjectsByCategoryId(categoryId);
    const title = category.name;
    res.render('category', { title, category, projects });
  };

  showAssignCategoriesForm = async (req, res, next) => {
    const projectId = this.parseId(req.params.projectId);
    const projectDetails = projectId ? await this.projectsModel.getProjectDetails(projectId) : null;
    if (!projectDetails) {
      return next(this.notFound('Project Not Found'));
    }
    const categories = await this.categoriesModel.getAllCategories();
    const assignedCategories = await this.categoriesModel.getCategoriesByProjectId(projectId);
    const title = 'Assign Categories to Project';
    res.render('assign-categories', {
      title,
      projectId,
      projectDetails,
      categories,
      assignedCategories,
    });
  };

  processAssignCategoriesForm = async (req, res, next) => {
    const projectId = this.parseId(req.params.projectId);
    if (!projectId) {
      return next(this.notFound('Project Not Found'));
    }
    const selected = req.body.categoryIds || [];
    const categoryIds = (Array.isArray(selected) ? selected : [selected]).map(Number);
    await this.projectCategoriesModel.updateCategoryAssignments(projectId, categoryIds);
    req.flash('success', 'Categories updated successfully.');
    res.redirect(`/project/${projectId}`);
  };

  showNewCategoryForm = async (_req, res) => {
    const title = 'Add New Category';
    res.render('new-category', { title });
  };

  processNewCategoryForm = async (req, res) => {
    if (this.flashErrors(req)) {
      return res.redirect('/new-category');
    }
    try {
      const categoryId = await this.categoriesModel.createCategory(req.body.name);
      req.flash('success', 'Category added successfully!');
      res.redirect(`/category/${categoryId}`);
    } catch (error) {
      req.flash(
        'error',
        CategoriesController.#isDuplicate(error)
          ? 'A category with that name already exists.'
          : 'There was an error creating the category.'
      );
      res.redirect('/new-category');
    }
  };

  showEditCategoryForm = async (req, res, next) => {
    const categoryId = this.parseId(req.params.id);
    const category = categoryId ? await this.categoriesModel.getCategoryDetails(categoryId) : null;
    if (!category) {
      return next(this.notFound('Category Not Found'));
    }
    const title = 'Edit Category';
    res.render('edit-category', { title, category });
  };

  processEditCategoryForm = async (req, res, next) => {
    const categoryId = this.parseId(req.params.id);
    if (!categoryId) {
      return next(this.notFound('Category Not Found'));
    }
    if (this.flashErrors(req)) {
      return res.redirect(`/edit-category/${categoryId}`);
    }
    try {
      await this.categoriesModel.updateCategory(categoryId, req.body.name);
      req.flash('success', 'Category updated successfully!');
      res.redirect(`/category/${categoryId}`);
    } catch (error) {
      req.flash(
        'error',
        CategoriesController.#isDuplicate(error)
          ? 'A category with that name already exists.'
          : 'There was an error updating the category.'
      );
      res.redirect(`/edit-category/${categoryId}`);
    }
  };
}

export { CategoriesController };
```

- [ ] **5.5** `src/routes.js` (it already imports `CategoriesController`): in `initializeRoutes()`, add right after the `/category/:id` route:

```js
this.get('/assign-categories/:projectId', Router.#categoriesController.showAssignCategoriesForm);
this.post(
  '/assign-categories/:projectId',
  Router.#categoriesController.processAssignCategoriesForm
);
```

- [ ] **5.6** New file `src/views/assign-categories.ejs`:

```html
<%- include('partials/header') %>
<main>
  <h1><%= projectDetails.title %></h1>
  <h2>Assign Categories</h2>
  <form action="/assign-categories/<%= projectId %>" method="POST">
    <div class="form-group">
      <%_ categories.forEach(category => { _%>
      <div class="checkbox-row">
        <input type="checkbox" id="category-<%= category.category_id %>" name="categoryIds" value="<%= category.category_id %>"<%= assignedCategories.some(ac => ac.category_id === category.category_id) ? ' checked' : '' %>>
        <label for="category-<%= category.category_id %>"><%= category.name %></label>
      </div>
      <%_ }); _%>
    </div>
    <button type="submit">Update Categories</button>
  </form>
</main>
<%- include('partials/footer') %>
```

- [ ] **5.7** `src/views/project.ejs`: add right after the "Edit Project" link from step 4.3:

```html
<p><a href="/assign-categories/<%= project.project_id %>">Update Categories</a></p>
```

**Check:** project page → "Update Categories" → current categories are pre-checked → change them → saved, green
message, the tags on the project page match. Uncheck all → saved with no tags.

---

## Part 6: Assignment: create + edit categories

- [ ] **6.1** New file `src/scripts/sql/category/insertCategory.sql`:

```sql
INSERT INTO {{schema}}.category (name)
VALUES ($1)
RETURNING category_id;
```

- [ ] **6.2** New file `src/scripts/sql/category/updateCategory.sql`:

```sql
UPDATE {{schema}}.category
SET name = $1
WHERE category_id = $2
RETURNING category_id;
```

- [ ] **6.3** `src/models/categories.js`: add **inside the class**, after `getCategoriesByProjectId(...)`:

```js
  async createCategory(name) {
    const result = await this.query({ querySQLPath: 'insertCategory.sql', params: [name] });
    if (result.rows.length === 0) {
      throw new Error('Failed to create category');
    }
    return result.rows[0].category_id;
  }
  async updateCategory(categoryId, name) {
    const result = await this.query({
      querySQLPath: 'updateCategory.sql',
      params: [name, categoryId],
    });
    if (result.rows.length === 0) {
      throw new Error('Category not found');
    }
    return result.rows[0].category_id;
  }
```

- [ ] **6.4** `src/models/categories.js`: add aliases above the `export` line and replace the `export` line:

```js
const createCategory = (name) => new CategoriesModel().createCategory(name);
const updateCategory = (categoryId, name) => new CategoriesModel().updateCategory(categoryId, name);

export {
  CategoriesModel,
  getAllCategories,
  getCategoryDetails,
  getCategoriesByProjectId,
  createCategory,
  updateCategory,
};
```

- [ ] **6.5** `src/routes.js`: add right after the `/assign-categories/:projectId` routes:

```js
this.get('/new-category', Router.#categoriesController.showNewCategoryForm);
this.post(
  '/new-category',
  CategoriesController.validation,
  Router.#categoriesController.processNewCategoryForm
);
this.get('/edit-category/:id', Router.#categoriesController.showEditCategoryForm);
this.post(
  '/edit-category/:id',
  CategoriesController.validation,
  Router.#categoriesController.processEditCategoryForm
);
```

- [ ] **6.6** New file `src/views/new-category.ejs` (client: `required` + `maxlength="100"`; **no** `minlength`, so the
      server's 3-character minimum can be tested):

```html
<%- include('partials/header') %>
<main>
  <h1><%= title %></h1>
  <form action="/new-category" method="POST">
    <div class="form-group">
      <label for="name">Category Name</label>
      <input type="text" id="name" name="name" maxlength="100" required />
    </div>
    <button type="submit">Create Category</button>
  </form>
</main>
<%- include('partials/footer') %>
```

- [ ] **6.7** New file `src/views/edit-category.ejs`:

```html
<%- include('partials/header') %>
<main>
  <h1><%= title %></h1>
  <form action="/edit-category/<%= category.category_id %>" method="POST">
    <div class="form-group">
      <label for="name">Category Name</label>
      <input
        type="text"
        id="name"
        name="name"
        value="<%= category.name %>"
        maxlength="100"
        required
      />
    </div>
    <button type="submit">Update Category</button>
  </form>
</main>
<%- include('partials/footer') %>
```

- [ ] **6.8** `src/views/categories.ejs`: add inside the `intro-block` section, after the `<p>`:

```html
<p><a href="/new-category">Add a new category</a></p>
```

- [ ] **6.9** `src/views/category.ejs`: add inside the `intro-block` section, after the `<p>`:

```html
<p><a href="/edit-category/<%= category.category_id %>">Edit Category</a></p>
```

**Check:**

- `/categories` → "Add a new category" → "Food Security" → lands on its page with a green message.
- Create "ab" (2 characters) → red "between 3 and 100 characters" message (server-side).
- Create "Environmental" again → red "already exists" message (no crash).
- Category page → "Edit Category" → pre-filled → rename → saved. `/edit-category/999` → 404.

---

## Part 7: Test, release, submit

- [ ] **7.1** Optional: add form pages to `src/scripts/js/modules/tests/previewTestSuite.mjs` `endpoints`:

```js
      { path: '/new-organization', name: 'New Organization', type: 'page' },
      { path: '/new-project', name: 'New Project', type: 'page' },
      { path: '/new-category', name: 'New Category', type: 'page' },
```

- [ ] **7.2** `npm run verify` passes.
- [ ] **7.3** `deploy.sh -preview` passes.
- [ ] **7.4** Confirm `SESSION_SECRET` is set on Render (step 0.4), then commit on a branch and
      `release.sh cse340 <branch>`.
- [ ] **7.5** On the live site, repeat the Part 2, 3, 4, 5 and 6 checks.
- [ ] **7.6** Canvas: **W04 Learning Activities quiz** (no AI) and **W04 Team Activity quiz** (Thu Nov 19).
- [ ] **7.7** Canvas: **W04 Assignment** → submit `https://github.com/trrmann/CSE340` and
      `https://cse340-qdjd.onrender.com` (Sat Nov 21).
- [ ] **7.8** **W04 Coaching Session** (form submissions, forms for updates, sessions + flash messages, server-side
      validation) → upload transcript.
- [ ] **7.9** **W04 60-second Status Update**.

**Note on test data:** the forms write to your real database (the class database). Test records you create there stay
there; if you want them gone later, they can be removed from the edit pages' data or with a one-off query.
