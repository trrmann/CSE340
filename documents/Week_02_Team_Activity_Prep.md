# W02 Team Activity: Database Entities for Service Projects — Prep Sheet

Source: https://byui-cse.github.io/cse340-ww-course-v2/week02/team-activity.html
Meeting: 1 hour, Microsoft Teams video. Thursday Nov 5, 2026, 7:00 PM Eastern.

## Before the meeting

- [x] Learning activities 1–5 done (organization table, db.js, organizations.js, organizations.ejs)
- [x] `src/setup.sql` created with the organization table and data
- [ ] Render `DB_URL` fixed (Internal URL) and /organizations working on https://cse340-qdjd.onrender.com
- [ ] Canvas quiz for the learning activities

## Meeting agenda

1. Choose a leader (rotate each week).
2. Opening prayer.
3. Code review, 10 minutes: one person shares last week's code. What was done well? Any suggestions?
4. Review the requirements (below).
5. Design the table(s) as a group: tables, columns, data types, constraints.
6. Each person builds it in their own project (see "Build steps").
7. Group discussion questions (similar ones are on the quiz afterward).
8. Deploy and test.

## Requirements

- Every service project belongs to exactly one sponsoring organization.
- Fields: Project ID, Organization ID, Title, Description, Location, Date.
- At least 5 projects per organization (15 or more in total for 3 organizations).

## My proposed design (to bring to the group)

One table, `project`, in a one-to-many relationship (one organization has many projects).

| Column          | Type         | Constraints                                           |
| --------------- | ------------ | ----------------------------------------------------- |
| project_id      | SERIAL       | PRIMARY KEY                                           |
| organization_id | INTEGER      | NOT NULL, FOREIGN KEY → organization(organization_id) |
| title           | VARCHAR(150) | NOT NULL                                              |
| description     | TEXT         | NOT NULL                                              |
| location        | VARCHAR(255) | NOT NULL                                              |
| project_date    | DATE         | NOT NULL                                              |

Notes:

- Use `DATE`, not `VARCHAR`, so dates sort correctly and can be formatted nicely in EJS.
- Use `project_date` rather than `date`, which is a SQL type name.
- Name the table `project`, singular, to match `organization`.
- Optionally add an index on `organization_id`, since it's used in the JOIN. Postgres doesn't index foreign keys automatically.
- In `setup.sql`, `DROP TABLE IF EXISTS project;` must come **before** dropping `organization`.

## Build steps (each person)

1. Run CREATE TABLE `project` and the INSERTs (15 or more rows) in pgAdmin or psql.
2. Check the data with `SELECT * FROM project;` and a JOIN query.
3. Add the SQL to `src/setup.sql`.
4. Create `src/models/projects.js` with `getAllProjects()`. It joins `project` with `organization` to get the organization name. Follow the pattern in `src/models/organizations.js`.
5. In `server.js`, import `getAllProjects`, call it in the `/projects` route, and log the result with `console.log` to check it.
6. Pass the projects to the view: `res.render('projects', { title, projects })`.
7. In the view, loop through the projects and show each as **Date: Project Title (Organization Name)**, with a readable date.
   - The course refers to `views/projects.ejs`. My file is currently `src/views/project.ejs`, so rename it to `projects.ejs` to match.
8. Commit, push, and confirm it works on Render.

## Group discussion questions (with my notes)

**1. What happens if `organization_id` is in the project table without a foreign key constraint?**
The database won't enforce referential integrity. A project could reference an organization that doesn't exist, such as a typo or ID 99. An organization could also be deleted while its projects remain, leaving them orphaned. JOINs would then silently drop or mismatch those rows. A foreign key rejects bad IDs on insert or update, and blocks (or cascades) deletes of organizations that still have projects.

**2. Why put database queries in a separate module (`src/models/projects.js`) instead of `server.js`?**

- It separates concerns: routes handle HTTP, models handle data. This is the start of MVC.
- The same query can be reused in several routes.
- The code is easier to read, test and maintain. If the SQL or the database changes, only one file changes.
- `server.js` stays short.

**3. What's the difference between `<%= ... %>` and `<%- ... %>` in EJS?**

- `<%= %>` outputs **escaped** HTML. Characters like `<`, `>` and `&` are encoded. Use it for data, especially anything from the database or users, because it prevents XSS.
- `<%- %>` outputs **raw, unescaped** HTML. Use it only for trusted HTML, such as `<%- include('partials/header') %>`.

## After the meeting

- [ ] Confirm the deployed site's /projects page works on Render
- [ ] Canvas: Team Activity quiz
- If absent: post in the Teams channel, do the activity alone, and post 1–2 paragraphs on what you learned.

## Looking ahead: W02 Assignment (Categories)

- `category` table (id, name) plus a many-to-many **join table** (for example `project_category`) with foreign keys to both, a composite primary key, and indexes.
- At least 3 categories, with every project in at least one category. All SQL goes in `src/setup.sql`, which is graded.
- `src/models/categories.js` with `getAllCategories()`, the `/categories` route, and `categories.ejs` showing the names.
- Submit the GitHub repo URL and the Render site URL in Canvas.
