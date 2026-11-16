# W03 Team Activity + Assignment: Code Steps

Follows your existing structure: SQL in `src/scripts/sql/<model>/`, class methods in `src/models/` (using
`this.query({ querySQLPath, params })`), course-named alias exports, controller classes in `src/controllers/`, routes in
`src/routes.js`, views in `src/views/`. Every clickable card uses the same **stretched `card-link`** pattern as the
organization cards. Every SQL query below was tested against your database.

Do the parts **in order**. After each part, run `npm run dev` and do its **Check** before moving on.

---

## Part 0: Shared CSS for links and tags (do first)

- [x] **0.1** `public/css/core.css`: find this rule (from the clickable-card CSS):

```css
.card .contact-link {
  position: relative;
  z-index: 1;
}
```

Replace it with this (it keeps any **other** link inside a card, such as the email link, an organization link, or a
category tag, clickable above the card's stretched link), and add the tag styles below it:

```css
/* Other links inside a clickable card stay clickable on their own */
.card a:not(.card-link) {
  position: relative;
  z-index: 1;
}

/* Category tags (project details page) */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  color: inherit;
  text-decoration: none;
  font-size: 0.9rem;
}

.tag:hover,
.tag:focus-visible {
  background-color: var(--accent-color);
}
```

X **Check:** `/organizations`: cards still lift on hover; clicking a card opens the organization; the email still opens
your mail app.

---

## Part 1: Organization URL singular (assignment requires `/organization/[id]`)

- [x] **1.1** `src/routes.js`: change

```js
this.get('/organizations/:id', Router.#organizationsController.showOrganizationDetailsPage);
```

to

```js
this.get('/organization/:id', Router.#organizationsController.showOrganizationDetailsPage);
```

- [x] **1.2** `src/views/organizations.ejs`: in the card link, change `href="/organizations/<%=` to
      `href="/organization/<%=` (only that one word changes).

X **Check:** `/organizations` → click a card → URL is `/organization/1` and the page loads.

---

## Part 2: Team Activity: upcoming projects + project details

- [x] **2.1** New file `src/scripts/sql/project/getUpcomingProjects.sql`:

```sql
SELECT p.project_id, p.organization_id, p.title, p.description, p.location, p.project_date,
       o.name AS organization_name
FROM {{schema}}.project p
JOIN {{schema}}.organization o ON o.organization_id = p.organization_id
WHERE p.project_date >= CURRENT_DATE
ORDER BY p.project_date
LIMIT $1;
```

- [x] **2.2** New file `src/scripts/sql/project/getProjectDetails.sql`:

```sql
SELECT p.project_id, p.organization_id, p.title, p.description, p.location, p.project_date,
       o.name AS organization_name
FROM {{schema}}.project p
JOIN {{schema}}.organization o ON o.organization_id = p.organization_id
WHERE p.project_id = $1;
```

- [x] **2.3** `src/models/projects.js`: add these two methods **inside the class**, right after
      `getProjectsByOrganizationId(...)`:

```js
  async getUpcomingProjects(numberOfProjects) {
    return (
      await this.query({ querySQLPath: 'getUpcomingProjects.sql', params: [numberOfProjects] })
    ).rows;
  }
  async getProjectDetails(projectId) {
    const result = await this.query({ querySQLPath: 'getProjectDetails.sql', params: [projectId] });
    return result.rows.length > 0 ? result.rows[0] : null;
  }
```

- [x] **2.4** `src/models/projects.js`: at the bottom, add the course-named aliases **above** the `export` line, and
      replace the `export` line:

```js
const getUpcomingProjects = (numberOfProjects) =>
  new ProjectsModel().getUpcomingProjects(numberOfProjects);
const getProjectDetails = (projectId) => new ProjectsModel().getProjectDetails(projectId);

export {
  ProjectsModel,
  getAllProjects,
  getProjectsByOrganizationId,
  getUpcomingProjects,
  getProjectDetails,
};
```

- [x] **2.5** `src/controllers/projects.js`: replace the **whole file** with:

```js
import { ProjectsModel } from '../models/projects.js';

const NUMBER_OF_UPCOMING_PROJECTS = 5;

class ProjectsController {
  static #projectsModel = new ProjectsModel();
  constructor() {}

  /** A 404 error for the global error handler. */
  static notFound(message) {
    const err = new Error(message);
    err.status = 404;
    return err;
  }

  showProjectsPage = async (_req, res) => {
    const projects = await ProjectsController.#projectsModel.getUpcomingProjects(
      NUMBER_OF_UPCOMING_PROJECTS
    );
    const title = 'Upcoming Service Projects';
    res.render('projects', { title, projects });
  };

  showProjectDetailsPage = async (req, res, next) => {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId) || projectId < 1) {
      return next(ProjectsController.notFound('Project Not Found'));
    }
    const project = await ProjectsController.#projectsModel.getProjectDetails(projectId);
    if (!project) {
      return next(ProjectsController.notFound('Project Not Found'));
    }
    const title = project.title;
    res.render('project', { title, project });
  };
}

export { ProjectsController };
```

- [x] **2.6** `src/routes.js`: add this line right after the `/projects` route:

```js
this.get('/project/:id', Router.#projectsController.showProjectDetailsPage);
```

- [x] **2.7** New file `src/views/project.ejs`:

```html
<%- include('partials/header') %>
<main class="content-split">
  <section class="intro-block">
    <h1><%= project.title %></h1>
    <p>
      Sponsored by
      <a href="/organization/<%= project.organization_id %>"><%= project.organization_name %></a>
    </p>
  </section>
  <section class="projects-column">
    <div class="card">
      <p>
        <strong>Date:</strong> <%= project.project_date.toLocaleDateString('en-US', { weekday:
        'long', year: 'numeric', month: 'long', day: 'numeric' }) %>
      </p>
      <p><strong>Location:</strong> <%= project.location %></p>
      <p><%= project.description %></p>
    </div>
  </section>
</main>
<%- include('partials/footer') %>
```

- [x] **2.8** `src/views/projects.ejs`: replace the `<h3>…</h3>` line inside the card (title + organization) with:

```html
<h3>
  <a class="card-link" href="/project/<%= project.project_id %>"
    ><%= project.project_date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric',
    month: 'long', day: 'numeric' }) %>: <%= project.title %></a
  >
  (<em
    ><a href="/organization/<%= project.organization_id %>"><%= project.organization_name %></a></em
  >)
</h3>
```

Also in `projects.ejs`, delete the line `<h2>Upcoming Service Projects</h2>` (the page `<h1>` now says it) and change
`class="card interactive-card"` to `class="card"`.

- [x] **2.9** `src/views/organization.ejs`: replace the `<h3>…</h3>` line inside the project card with:

```html
<h3>
  <a class="card-link" href="/project/<%= project.project_id %>"
    ><%= project.project_date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day:
    'numeric' }) %>: <%= project.title %></a
  >
</h3>
```

X **Check:**

- `/projects` shows **5** upcoming projects, title "Upcoming Service Projects"; clicking a card opens `/project/<id>`;
  clicking the organization name opens `/organization/<id>`.
- `/organization/1` → clicking a project card opens that project.
- `/project/999` and `/project/abc` show your 404 page.
- [x] Take the **W03 Team Activity quiz** in Canvas (late is allowed).

---

## Part 3: Assignment: category pages + category tags

- [x] **3.1** New file `src/scripts/sql/category/getCategoryDetails.sql`:

```sql
SELECT category_id, name
FROM {{schema}}.category
WHERE category_id = $1;
```

- [x] **3.2** New file `src/scripts/sql/category/getCategoriesByProjectId.sql`:

```sql
SELECT c.category_id, c.name
FROM {{schema}}.category c
JOIN {{schema}}.project_category pc ON pc.category_id = c.category_id
WHERE pc.project_id = $1
ORDER BY c.name;
```

- [x] **3.3** New file `src/scripts/sql/project/getProjectsByCategoryId.sql`:

```sql
SELECT p.project_id, p.organization_id, p.title, p.description, p.location, p.project_date,
       o.name AS organization_name
FROM {{schema}}.project p
JOIN {{schema}}.project_category pc ON pc.project_id = p.project_id
JOIN {{schema}}.organization o ON o.organization_id = p.organization_id
WHERE pc.category_id = $1
ORDER BY p.project_date;
```

- [x] **3.4** `src/models/categories.js`: add these two methods **inside the class**, right after `getAllCategories()`:

```js
  async getCategoryDetails(categoryId) {
    const result = await this.query({ querySQLPath: 'getCategoryDetails.sql', params: [categoryId] });
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  async getCategoriesByProjectId(projectId) {
    return (await this.query({ querySQLPath: 'getCategoriesByProjectId.sql', params: [projectId] }))
      .rows;
  }
```

- [x] **3.5** `src/models/categories.js`: add aliases above the `export` line and replace the `export` line:

```js
const getCategoryDetails = (categoryId) => new CategoriesModel().getCategoryDetails(categoryId);
const getCategoriesByProjectId = (projectId) =>
  new CategoriesModel().getCategoriesByProjectId(projectId);

export { CategoriesModel, getAllCategories, getCategoryDetails, getCategoriesByProjectId };
```

- [x] **3.6** `src/models/projects.js`: add this method **inside the class**, after `getProjectDetails(...)`:

```js
  async getProjectsByCategoryId(categoryId) {
    return (await this.query({ querySQLPath: 'getProjectsByCategoryId.sql', params: [categoryId] }))
      .rows;
  }
```

and add its alias + export (replace the `export` block from step 2.4):

```js
const getProjectsByCategoryId = (categoryId) =>
  new ProjectsModel().getProjectsByCategoryId(categoryId);

export {
  ProjectsModel,
  getAllProjects,
  getProjectsByOrganizationId,
  getUpcomingProjects,
  getProjectDetails,
  getProjectsByCategoryId,
};
```

- [x] **3.7** `src/controllers/categories.js`: replace the **whole file** with:

```js
import { CategoriesModel } from '../models/categories.js';
import { ProjectsModel } from '../models/projects.js';

class CategoriesController {
  static #categoriesModel = new CategoriesModel();
  static #projectsModel = new ProjectsModel();
  constructor() {}

  showCategoriesPage = async (_req, res) => {
    const categories = await CategoriesController.#categoriesModel.getAllCategories();
    const title = 'Service Project Categories';
    res.render('categories', { title, categories });
  };

  showCategoryDetailsPage = async (req, res, next) => {
    const categoryId = Number(req.params.id);
    const category =
      Number.isInteger(categoryId) && categoryId > 0
        ? await CategoriesController.#categoriesModel.getCategoryDetails(categoryId)
        : null;
    if (!category) {
      const err = new Error('Category Not Found');
      err.status = 404;
      return next(err);
    }
    const projects = await CategoriesController.#projectsModel.getProjectsByCategoryId(categoryId);
    const title = category.name;
    res.render('category', { title, category, projects });
  };
}

export { CategoriesController };
```

- [x] **3.8** `src/controllers/projects.js`: show category tags on the project page.
  1. Add this import under the existing import line:

     ```js
     import { CategoriesModel } from '../models/categories.js';
     ```

  2. Add this line under `static #projectsModel = new ProjectsModel();`:

     ```js
       static #categoriesModel = new CategoriesModel();
     ```

  3. In `showProjectDetailsPage`, replace the last two lines (`const title = …` and `res.render(…)`) with:

     ```js
     const categories =
       await ProjectsController.#categoriesModel.getCategoriesByProjectId(projectId);
     const title = project.title;
     res.render('project', { title, project, categories });
     ```

- [x] **3.9** `src/routes.js`: add this line right after the `/categories` route:

```js
this.get('/category/:id', Router.#categoriesController.showCategoryDetailsPage);
```

- [x] **3.10** New file `src/views/category.ejs`:

```html
<%- include('partials/header') %>
<main class="content-split">
  <section class="intro-block">
    <h1><%= category.name %></h1>
    <p>Service projects in this category.</p>
  </section>
  <section class="projects-column">
    <h2>Service Projects</h2>
    <div class="card-grid vertical-stack">
      <%_ if (projects.length === 0) { _%>
      <p>No projects in this category yet.</p>
      <%_ } _%> <%_ projects.forEach(project => { _%>
      <div class="card">
        <h3>
          <a class="card-link" href="/project/<%= project.project_id %>"
            ><%= project.project_date.toLocaleDateString('en-US', { year: 'numeric', month: 'long',
            day: 'numeric' }) %>: <%= project.title %></a
          >
          (<em
            ><a href="/organization/<%= project.organization_id %>"
              ><%= project.organization_name %></a
            ></em
          >)
        </h3>
        <p><%= project.description %></p>
        <p><strong>Location:</strong> <%= project.location %></p>
      </div>
      <%_ }); _%>
    </div>
  </section>
</main>
<%- include('partials/footer') %>
```

- [x] **3.11** `src/views/categories.ejs`: replace the line `<h3><%= category.name %></h3>` with:

```html
<h3><a class="card-link" href="/category/<%= category.category_id %>"><%= category.name %></a></h3>
```

- [x] **3.12** `src/views/project.ejs` (from step 2.7): add the tags **inside the card**, right after the
      description line `<p><%= project.description %></p>`:

```html
<%_ if (categories.length > 0) { _%>
<ul class="tag-list">
  <%_ categories.forEach(category => { _%>
  <li><a class="tag" href="/category/<%= category.category_id %>"><%= category.name %></a></li>
  <%_ }); _%>
</ul>
<%_ } _%>
```

X**Check:**

- `/categories`: each category card is clickable (lifts on hover) and opens `/category/<id>`.
- `/category/1` (Environmental) lists its 6 projects; each project card opens the project; organization names open the
  organization.
- `/project/2` (Accessible Ramp Build) shows tags **Community Service** and **Health & Wellness**; each tag opens its
  category page.
- `/category/999` and `/category/abc` show your 404 page.

---

## Part 4: Test, release, submit

- [x] **4.1** Optional: add the new pages to the preview tests. In
      `src/scripts/js/modules/tests/previewTestSuite.mjs`, inside `endpoints: [ … ]`, add:

```js
      { path: '/organization/1', name: 'Organization Details', type: 'page' },
      { path: '/project/2', name: 'Project Details', type: 'page' },
      { path: '/category/1', name: 'Category Details', type: 'page' },
```

- [x] **4.2** `npm run verify` passes (format + lint).
- [x] **4.3** `deploy.sh -preview` passes (preview tests + database tests).
- [x] **4.4** Commit on a branch, then release.sh cs`e340 <branch>`.
- [x] **4.5** On the live site, repeat the Part 2 and Part 3 checks.
- [x] **4.6** Canvas: **W03 Assignment**: submit `https://github.com/trrmann/CSE340` and
      `https://cse340-qdjd.onrender.com`.
- [x] **4.7** Canvas: **W03 Learning Activities quiz** and **W03 Team Activity quiz** (late; no AI).
- [x] **4.8** **W03 Coaching Session** (models, views, controllers, error handling), then upload the transcript.
- [x] **4.9** **W03 60-second Status Update**.
