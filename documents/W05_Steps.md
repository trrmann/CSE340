# W05: Learning Activities + Team Activity + Assignment: Code Steps

**Due (ET, confirm in Canvas):** Learning Activities quiz, Team Activity quiz and University Mission Feedback
**Thu Nov 26, 6:59 PM** (Thanksgiving: plan to finish early) · Assignment, Coaching Session, 60-second Status Update
**Sat Nov 28, 6:59 PM**.

Follows your structure: SQL in `src/scripts/sql/<table>/`, class methods in the models using
`this.query({ querySQLPath, params })`, course-named alias exports, controller classes with arrow-function handlers,
routes in `src/scripts/js/modules/routes.mjs`, views in `src/views/`. Every SQL statement below was run against a
throwaway local PostgreSQL database (create twice, insert, duplicate email, both `findUserByEmail` versions, bcrypt
compare, the admin `UPDATE`, `getAllUsers`, truncate/drop order) and the `setup.sql` additions were checked to build
exactly the same columns, constraints, indexes and role rows as provisioning: 18/18 passed.

**This week adds two tables** (`roles`, `users`), so provisioning, `src/setup.sql` and the database tests all change
(Part 2). File names follow the folder = table rule: `src/scripts/sql/roles/createRoles.sql`,
`src/scripts/sql/users/insertUser.sql`, and so on.

**Before you start:** finish W04 Parts 4–7 (`W04_Steps.md`). Part 5 below protects the W04 routes
(`/edit-project`, `/assign-categories`, `/new-category`, `/edit-category`), so they must exist. Then create a branch for
this week, for example `git checkout -b w5-auth`.

Do the parts **in order**; after each, run `npm run dev` and do its **Check**.

**Layout used by every step below** (unchanged from W04):

| What                                                | Where                                           |
| --------------------------------------------------- | ----------------------------------------------- |
| App setup                                           | `src/scripts/js/modules/app.mjs`                |
| Routes                                              | `src/scripts/js/modules/routes.mjs`             |
| Controllers                                         | `src/scripts/js/modules/controllers/<name>.mjs` |
| Models                                              | `src/scripts/js/modules/models/<name>.mjs`      |
| Shared classes (db, base controller, errors, flash) | `src/scripts/js/modules/library/`               |
| SQL files                                           | `src/scripts/sql/<table>/`                      |
| Views                                               | `src/views/`                                    |
| Database tests                                      | `src/scripts/js/modules/tests/`                 |

---

## Part 0: Setup (package)

- [ ] **0.1** In the project folder:

```bash
npm install bcrypt
```

bcrypt ships prebuilt binaries for Linux, so no compiler is needed. If npm prints
`install-scripts not yet covered by allowScripts: bcrypt`, it still works (checked on this machine:
`bcrypt.hash` and `bcrypt.compare` both ran). To silence the warning: `npm install-scripts approve bcrypt`.

- [ ] **0.2** Nothing new in `.env`: `SESSION_SECRET` from W04 step 0.3/0.4 is what keeps users logged in. Confirm it is
      still set locally and on Render.

---

## Part 1: Re-create your Render database (learning activity)

> **Stop before deleting anything.** Your Render database is **shared**: CSE340 (schema `public`), FlashCards,
> the IAM service and Heros all live in it. Deleting it, as the course page says, deletes their data too. It also
> **expires on Sat Nov 28**, the same day this assignment is due, so it has to be rolled over this week anyway.
> Do it as the shared monthly roll-over (task-226; FlashCards `documents/Issues.md` § 2), not as a CSE340-only step.
> Render allows one free database at a time, which is why the old one has to go first.

Do this part **before** Part 5: an account you register (including the grader's admin account) is lost when the old
database is deleted, so register it on the new one.

- [ ] **1.1** Back up every other app on the shared database and confirm each backup file is complete (owner
      routine, task-226): FlashCards `backup.sh` (FlashCards data plus its IAM identities), Heros `heros-backup.sh`,
      and any other schema you keep there. CSE340 needs no backup: provisioning rebuilds its tables and sample data,
      and your W04 test records are disposable.
- [ ] **1.2** Render dashboard → the PostgreSQL service → **Settings** → **Delete Database** (skip if Render already
      removed it).
- [ ] **1.3** **+ New** → **Postgres**: unique name; **Project** = your project; **Database** and **User** = the same
      name; **Region** = the same region as your web services; default version; **Free** plan → **Create Database**.
      Wait until it shows **Available**. Note its expiry date (about 30 days) for the next roll-over (`DB_PG_EXPIRE`
      for FlashCards).
- [ ] **1.4** Copy the **External Database URL** → in CSE340's local `.env`, replace the `DB_URL=` value.
- [ ] **1.5** Copy the **Internal Database URL** → CSE340 web service → **Environment** → `DB_URL` → paste → **Save**
      (Render redeploys). Update the database settings of the other web services on the same database too
      (FlashCards, IAM, Heros), then restore their backups from 1.1 with their restore scripts. Restores are an owner
      step; do them deliberately, one app at a time.
- [ ] **1.6** pgAdmin → your server → **Properties** → **Connection**: host, database, username and password from the
      External URL; **Parameters**: **SSL mode = require** → Save → connect.
- [ ] **1.7** Rebuild the CSE340 tables. Your app provisions automatically: the first request after start creates every
      registered table in `public` and loads its default data, so `npm run dev` + opening `/` is enough. The course
      also asks you to run `src/setup.sql` in pgAdmin. Either works, but `setup.sql` **drops** the CSE340 tables first,
      so run it only before anyone registers (after Part 2 it also drops `users`).

**Check:** `npm run dev` → `/organizations`, `/projects`, `/categories` show the sample data (3 organizations, 15
projects, 4 categories). The terminal shows `1. OrganizationsModel (organization): Table created, Data inserted` …
for all four tables. The live site works the same after Render's redeploy, and FlashCards, IAM and Heros work with
their restored data.

---

## Part 2: Roles and users tables (learning activity: authentication and authorization)

The course creates these in pgAdmin. In your app they are provisioned like every other table: one model and one SQL
folder per table, registered in dependency order (`roles` = 5, `users` = 6, because `users` references `roles`).

### 2a. Provisioning support for a table with no default data

Users must register through the site (so their passwords are hashed), so `users` has no seed rows. Without this
change, provisioning would report "Data inserted" for `users` on every start.

- [ ] **2.1** `src/scripts/js/modules/library/db.mjs`, inside `#ensureProvisioned()`: replace the line

```js
const hadData = await model.hasData();
```

with:

```js
// A model with `static seeded = false` (users) has no default data: skip the data step.
const seeded = ModelClass.seeded !== false;
const hadData = seeded ? await model.hasData() : true;
```

and in the `console.log` a few lines below, replace

```js
Data ${hadData ? 'already present' : 'inserted'}`
```

with

```js
Data ${!seeded ? 'not seeded' : hadData ? 'already present' : 'inserted'}`
```

### 2b. SQL files

- [ ] **2.2** New folder `src/scripts/sql/roles/` with these seven files:

`createRoles.sql`

```sql
-- Roles a user can hold (W05). users references roles, so roles is built first.
CREATE TABLE IF NOT EXISTS {{schema}}.roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_description TEXT
);
```

`defaultLoadRoles.sql`

```sql
INSERT INTO {{schema}}.roles (role_name, role_description) VALUES
('user', 'Standard user with basic access'),
('admin', 'Administrator with full system access');
```

`hasRolesData.sql`

```sql
SELECT EXISTS (SELECT 1 FROM {{schema}}.roles) AS has_data;
```

`countRoles.sql`

```sql
SELECT count(role_id) AS count
FROM {{schema}}.roles;
```

`truncateRoles.sql`

```sql
-- Fails while users references roles; use cascadeTruncateRoles or truncate everything together
TRUNCATE TABLE {{schema}}.roles RESTART IDENTITY;
```

`cascadeTruncateRoles.sql`

```sql
-- Also empties {{schema}}.users (every registered account!)
TRUNCATE TABLE {{schema}}.roles RESTART IDENTITY CASCADE;
```

`dropRoles.sql`

```sql
-- Drop {{schema}}.users first (it references roles)
DROP TABLE IF EXISTS {{schema}}.roles;
```

- [ ] **2.3** New folder `src/scripts/sql/users/` with these five files (Parts 3, 4 and 6 add the query files):

`createUsers.sql`

```sql
-- Requires: {{schema}}.roles (foreign key target)
-- Registered accounts (W05). email is the username; only a bcrypt hash of the password is stored.
CREATE TABLE IF NOT EXISTS {{schema}}.users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES {{schema}}.roles(role_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Foreign keys are not indexed automatically in PostgreSQL; this speeds up the roles join
CREATE INDEX IF NOT EXISTS idx_users_role_id ON {{schema}}.users(role_id);
```

`hasUsersData.sql`

```sql
SELECT EXISTS (SELECT 1 FROM {{schema}}.users) AS has_data;
```

`countUsers.sql`

```sql
SELECT count(user_id) AS count
FROM {{schema}}.users;
```

`truncateUsers.sql`

```sql
-- Deletes every registered account
TRUNCATE TABLE {{schema}}.users RESTART IDENTITY;
```

`dropUsers.sql`

```sql
DROP TABLE IF EXISTS {{schema}}.users;
```

### 2c. Models

- [ ] **2.4** New file `src/scripts/js/modules/models/roles.mjs`:

```js
import { PgDBConnection } from '../library/db.mjs';

/** Model for the roles table ('user', 'admin'). Used for provisioning; users joins it by role_id. */
class RolesModel extends PgDBConnection {
  /** Table this model owns, and the tables it references by foreign key (none). */
  static tableName = 'roles';
  static requires = [];
  constructor() {
    super('roles');
  }
  async count() {
    return Number((await this.executeQuery({ querySQLPath: 'countRoles.sql' })).rows[0].count);
  }
  async hasData() {
    return (await this.executeQuery({ querySQLPath: 'hasRolesData.sql' })).rows[0].has_data;
  }
  async create() {
    await this.executeQuery({ querySQLPath: 'createRoles.sql' });
    return true;
  }
  async defaultLoad() {
    await this.executeQuery({ querySQLPath: 'defaultLoadRoles.sql' });
    return true;
  }
  /** Fails while users references roles; use cascadeTruncate or PgDBConnection.truncateAll(). */
  async truncate() {
    await this.executeQuery({ querySQLPath: 'truncateRoles.sql' });
    return true;
  }
  /** Also empties users: every registered account is deleted. */
  async cascadeTruncate() {
    await this.executeQuery({ querySQLPath: 'cascadeTruncateRoles.sql' });
    return true;
  }
  /** Drop users first (or use PgDBConnection.dropAll(), which drops in the right order). */
  async drop() {
    await this.executeQuery({ querySQLPath: 'dropRoles.sql' });
    return true;
  }
}

// Order 5: no prerequisites, but must come before users (order 6), which references it.
PgDBConnection.registerProvisioner(5, RolesModel);

export { RolesModel };
```

- [ ] **2.5** New file `src/scripts/js/modules/models/users.mjs`. This is the whole model for the week: Parts 3, 4 and 6
      only add the SQL files its methods read, so nothing here runs until those routes exist.

```js
import bcrypt from 'bcrypt';
import { PgDBConnection } from '../library/db.mjs';

/** Model for the users table: registration, login checks and the admin users list. */
class UsersModel extends PgDBConnection {
  /** Table this model owns, and the tables it references by foreign key. */
  static tableName = 'users';
  static requires = ['roles'];
  /** No default rows: accounts are created through /register, so every password is hashed. */
  static seeded = false;
  constructor() {
    super('users');
  }

  /** Insert a new account with the default 'user' role; returns its user_id (Part 3). */
  async createUser(name, email, passwordHash) {
    const defaultRole = 'user';
    const result = await this.query({
      querySQLPath: 'insertUser.sql',
      params: [name, email, passwordHash, defaultRole],
    });
    if (result.rows.length === 0) {
      throw new Error('Failed to create user');
    }
    if (process.env.ENABLE_SQL_LOGGING === 'true') {
      console.log('Created new user with ID:', result.rows[0].user_id);
    }
    return result.rows[0].user_id;
  }

  /** The user with this email, including password_hash, or null (Part 4). */
  async findUserByEmail(email) {
    const result = await this.query({ querySQLPath: 'findUserByEmail.sql', params: [email] });
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /** True when the plain-text password matches the stored bcrypt hash (Part 4). */
  async verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
  }

  /** The user without password_hash when email and password match; otherwise null (Part 4). */
  async authenticateUser(email, password) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      return null;
    }
    if (!(await this.verifyPassword(password, user.password_hash))) {
      return null;
    }
    const safeUser = { ...user };
    delete safeUser.password_hash; // never put the hash in the session
    return safeUser;
  }

  /** Every registered user with their role name, never the password hash (Part 6). */
  async getAllUsers() {
    return (await this.query({ querySQLPath: 'getAllUsers.sql' })).rows;
  }

  async count() {
    return Number((await this.executeQuery({ querySQLPath: 'countUsers.sql' })).rows[0].count);
  }
  async hasData() {
    return (await this.executeQuery({ querySQLPath: 'hasUsersData.sql' })).rows[0].has_data;
  }
  async create() {
    await this.executeQuery({ querySQLPath: 'createUsers.sql' });
    return true;
  }
  /** Never called (seeded = false); present so every model has the same lifecycle methods. */
  async defaultLoad() {
    return true;
  }
  /** Deletes every registered account. Nothing references users, so a plain truncate is safe. */
  async truncate() {
    await this.executeQuery({ querySQLPath: 'truncateUsers.sql' });
    return true;
  }
  async drop() {
    await this.executeQuery({ querySQLPath: 'dropUsers.sql' });
    return true;
  }
}

// Order 6 (last): references roles (order 5).
PgDBConnection.registerProvisioner(6, UsersModel);

/**
 * Function-style aliases matching the course's model functions (createUser, authenticateUser).
 * findUserByEmail and verifyPassword stay internal, as the course asks.
 */
const createUser = (name, email, passwordHash) =>
  new UsersModel().createUser(name, email, passwordHash);
const authenticateUser = (email, password) => new UsersModel().authenticateUser(email, password);
const getAllUsers = () => new UsersModel().getAllUsers();

export { UsersModel, createUser, authenticateUser, getAllUsers };
```

- [ ] **2.6** `src/scripts/js/modules/app.mjs`: below the existing `import './models/projectCategories.mjs';` line, add:

```js
// Also registered for provisioning by import (roles has no controller; users is imported here too so
// both tables are created on the first request even before the user routes are added).
import './models/roles.mjs';
import './models/users.mjs';
```

### 2d. setup.sql

- [ ] **2.7** `src/setup.sql`: in the "Drop existing tables" block, add these two lines **first** (users references
      roles, so it is dropped before it):

```sql
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
```

and add at the **end** of the file:

```sql
-- -------------------------------------------------------------
-- Roles and users (W05: authentication and authorization)
-- Users register through the site (so passwords are hashed);
-- there is no sample user data.
-- -------------------------------------------------------------
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_description TEXT
);

INSERT INTO roles (role_name, role_description) VALUES
('user', 'Standard user with basic access'),
('admin', 'Administrator with full system access');

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(role_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Foreign keys are not indexed automatically in PostgreSQL; this speeds up the roles join
CREATE INDEX idx_users_role_id ON users(role_id);
```

### 2e. Database tests (they check every table, so they must know about the new two)

- [ ] **2.8** `src/scripts/js/modules/tests/provisioningScenario.mjs`: add the imports below the existing
      `import './../models/projectCategories.mjs';` line, and replace the `TABLES` line:

```js
import './../models/roles.mjs';
import './../models/users.mjs';
```

```js
const TABLES = ['organization', 'project', 'category', 'project_category', 'roles', 'users'];
```

- [ ] **2.9** `src/scripts/js/modules/tests/provisioningTest.mjs`: replace the `EXPECTED` and `ORDER` lines:

```js
const EXPECTED = {
  organization: 3,
  project: 15,
  category: 4,
  project_category: 23,
  roles: 2,
  users: 0,
};
const ORDER = ['organization', 'project', 'category', 'project_category', 'roles', 'users'];
```

- [ ] **2.10** Same file, in `runProvisioningScenarios()`: change the condition of the check named
      `'fresh schema: every table created and loaded'` to:

```js
      r.steps.every(
        (s) => s.table_ === 'created' && s.data === (s.table === 'users' ? 'not seeded' : 'inserted')
      ),
```

and the condition of `'rerun: everything already present'` to:

```js
      r.steps.length === ORDER.length &&
        r.steps.every(
          (s) =>
            s.table_ === 'already present' &&
            s.data === (s.table === 'users' ? 'not seeded' : 'already present')
        ),
```

(Optional: rename the checks "built in order 1-4", "counts 3/15/4/23" and "rebuild in order 1-4" to 1-6 /
3/15/4/23/2/0.)

- [ ] **2.11** Same file: in the `'foreign keys: …'` check add `'users->roles'` as the **last** array entry, and in the
      `'indexes present'` check add `'idx_users_role_id'` as the **last** entry:

```js
        JSON.stringify([
          'project->organization',
          'project_category->category',
          'project_category->project',
          'users->roles',
        ]),
```

```js
        JSON.stringify([
          'idx_project_category_category_id',
          'idx_project_organization_id',
          'idx_users_role_id',
        ]),
```

- [ ] **2.12** Same file, in `runSetupSqlSync()` → `describe`: add after the `project_category:` entry:

```js
        roles: await q(
          'SELECT * FROM ' +
            pg.escapeIdentifier(schema) +
            '.roles WHERE $1::text IS NOT NULL ORDER BY 1'
        ),
        users: await q(
          'SELECT * FROM ' +
            pg.escapeIdentifier(schema) +
            '.users WHERE $1::text IS NOT NULL ORDER BY 1'
        ),
```

**Check:**

- `npm run dev` → open `/` → the terminal shows `5. RolesModel (roles): Table created, Data inserted` and
  `6. UsersModel (users): Table created, Data not seeded`; restart → both say `already present` /
  `not seeded`.
- pgAdmin: `SELECT * FROM roles;` → `user`, `admin`. `SELECT * FROM users;` → no rows.
- `npm run test:db` → all pass (two more checks than before: `setup.sql in sync: roles` and `users`). The tests use
  temporary `cse340_test_…` schemas and never touch your real tables.

---

## Part 3: Registration (learning activity: hashing and user registration)

- [ ] **3.1** New file `src/scripts/sql/users/insertUser.sql`:

```sql
-- New accounts get the role named in $4 (the model passes 'user')
INSERT INTO {{schema}}.users (name, email, password_hash, role_id)
VALUES ($1, $2, $3, (SELECT role_id FROM {{schema}}.roles WHERE role_name = $4))
RETURNING user_id;
```

- [ ] **3.2** New file `src/scripts/js/modules/controllers/users.mjs`. Like W04's projects controller, this is the
      **whole file for the week** (Parts 4–6 only add routes and views):

```js
import bcrypt from 'bcrypt';
import { body } from 'express-validator';
import { BaseController } from '../library/baseController.mjs';
import { UsersModel } from '../models/users.mjs';

class UsersController extends BaseController {
  /** Server-side validation for the registration form. Limits match the users table. */
  static registrationValidation = [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ max: 100 })
      .withMessage('Name cannot exceed 100 characters'),
    body('email')
      .trim()
      .toLowerCase()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .isLength({ max: 100 })
      .withMessage('Email cannot exceed 100 characters'),
    // 7 is the minimum because the course's admin password, cse340!, has 7 characters.
    // 72 is bcrypt's limit (longer passwords are silently cut off).
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 7, max: 72 })
      .withMessage('Password must be between 7 and 72 characters'),
  ];

  /** Server-side validation for the login form (same email clean-up as registration). */
  static loginValidation = [
    body('email')
      .trim()
      .toLowerCase()
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ];

  /** PostgreSQL error 23505 = unique violation (email is UNIQUE). */
  static #isDuplicate(error) {
    return Boolean(error) && error.code === '23505';
  }

  /**
   * Route guard (W05 learning activity): continue only when someone is logged in.
   * Static so routes.mjs can use it directly: router.get('/dashboard', requireLogin, ...).
   */
  static requireLogin = (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.flash('error', 'You must be logged in to access that page.');
      return res.redirect('/login');
    }
    next();
  };

  /**
   * Middleware factory (W05 team activity): requireRole('admin') returns middleware that continues
   * only for that role. Not logged in -> /login. Logged in without the role -> redirectTo
   * (default '/'; the assignment's users page passes '/dashboard').
   */
  static requireRole =
    (role, redirectTo = '/') =>
    (req, res, next) => {
      if (!req.session || !req.session.user) {
        req.flash('error', 'You must be logged in to access this page.');
        return res.redirect('/login');
      }
      if (req.session.user.role_name !== role) {
        req.flash('error', 'You do not have permission to access this page.');
        return res.redirect(redirectTo);
      }
      next();
    };

  /** The model is passed in (tests can pass a fake); the default is the real model. */
  constructor({ usersModel = new UsersModel() } = {}) {
    super();
    this.usersModel = usersModel;
  }

  // ----- Part 3: registration -----

  showUserRegistrationForm = (_req, res) => {
    res.render('register', { title: 'Register' });
  };

  processUserRegistrationForm = async (req, res) => {
    if (this.flashErrors(req)) {
      return res.redirect('/register');
    }
    const { name, email, password } = req.body;
    try {
      // Hash the password before storing it (10 salt rounds)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      await this.usersModel.createUser(name, email, passwordHash);
      req.flash('success', 'Registration successful! Please log in.');
      res.redirect('/');
    } catch (error) {
      if (UsersController.#isDuplicate(error)) {
        req.flash('error', 'An account with that email already exists.');
      } else {
        console.error('Error registering user:', error);
        req.flash('error', 'An error occurred during registration. Please try again.');
      }
      res.redirect('/register');
    }
  };

  // ----- Part 4: login and logout -----

  showLoginForm = (_req, res) => {
    res.render('login', { title: 'Login' });
  };

  processLoginForm = async (req, res, next) => {
    if (this.flashErrors(req)) {
      return res.redirect('/login');
    }
    const { email, password } = req.body;
    try {
      const user = await this.usersModel.authenticateUser(email, password);
      if (!user) {
        // Same message for unknown email and wrong password, so it doesn't reveal which accounts exist
        req.flash('error', 'Invalid email or password.');
        return res.redirect('/login');
      }
      // New session id at login, so an id handed out before login cannot be reused (session fixation)
      req.session.regenerate((error) => {
        if (error) {
          return next(error);
        }
        req.session.user = user;
        req.flash('success', 'Login successful!');
        if (res.locals.NODE_ENV === 'development') {
          console.log('User logged in:', user);
        }
        res.redirect('/dashboard');
      });
    } catch (error) {
      console.error('Error during login:', error);
      req.flash('error', 'An error occurred during login. Please try again.');
      res.redirect('/login');
    }
  };

  processLogout = (req, res) => {
    // Remove only the user (not the whole session), so the flash message survives the redirect
    if (req.session.user) {
      delete req.session.user;
    }
    req.flash('success', 'Logout successful!');
    res.redirect('/login');
  };

  // ----- Part 4: dashboard (protected by requireLogin) -----

  showDashboard = (req, res) => {
    const user = req.session.user;
    res.render('dashboard', { title: 'Dashboard', name: user.name, email: user.email });
  };

  // ----- Part 6 (assignment): users page (protected by requireRole('admin', '/dashboard')) -----

  showUsersPage = async (_req, res) => {
    const users = await this.usersModel.getAllUsers();
    res.render('users', { title: 'Registered Users', users });
  };
}

export { UsersController };
```

- [ ] **3.3** `src/scripts/js/modules/routes.mjs`: add the import with the other controller imports, and the
      controller next to the other `static #…Controller` lines:

```js
import { UsersController } from './controllers/users.mjs';
```

```js
  static #usersController = new UsersController();
```

then in `initializeRoutes()` add, before the `// error handling routes` comment:

```js
// User registration routes
this.get('/register', Router.#usersController.showUserRegistrationForm);
this.post(
  '/register',
  UsersController.registrationValidation,
  Router.#usersController.processUserRegistrationForm
);
```

- [ ] **3.4** New file `src/views/register.ejs` (client-side: `required`, `maxlength`, `type="email"`; the server
      repeats every check):

```ejs
<%- include('partials/header') %>
<main>
  <h1><%= title %></h1>
  <form action="/register" method="POST">
    <div class="form-group">
      <label for="name">Name</label>
      <input type="text" id="name" name="name" maxlength="100" autocomplete="name" required />
    </div>
    <div class="form-group">
      <label for="email">Email (Username)</label>
      <input type="email" id="email" name="email" maxlength="100" autocomplete="email" required />
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <input
        type="password"
        id="password"
        name="password"
        maxlength="72"
        autocomplete="new-password"
        required
      />
    </div>
    <button type="submit">Register</button>
  </form>
</main>
<%- include('partials/footer') %>
```

- [ ] **3.5** `src/views/partials/header.ejs`: add a Register link as the last item in the `<ul>` (Part 4 replaces
      it with the logged-in/logged-out version):

```html
<li><a href="/register">Register</a></li>
```

**Check:**

- Nav → **Register** → name `Test User`, email `test@example.com`, password `password1` → you land on `/` with a green
  "Registration successful! Please log in."
- pgAdmin: `SELECT user_id, name, email, password_hash, role_id FROM users;` → `password_hash` starts with `$2b$10$`
  (not your password) and `role_id` is the `user` role's id.
- Register `test@example.com` again → red "An account with that email already exists." (no crash).
- Register with `TEST@Example.com ` (capitals, trailing space) → same duplicate message (the email is trimmed and
  lower-cased before it is stored or checked).
- Password `abc` → red "between 7 and 72 characters" (server-side; the browser does not check length).

---

## Part 4: Login, logout and the protected dashboard (learning activities: user login + protected routes)

- [ ] **4.1** New file `src/scripts/sql/users/findUserByEmail.sql` (the learning-activity version; Part 5 changes it
      to return the role name):

```sql
SELECT user_id, name, email, password_hash, role_id
FROM {{schema}}.users
WHERE email = $1;
```

- [ ] **4.2** `src/scripts/js/modules/routes.mjs`: add right after the `/register` routes:

```js
// User login routes
this.get('/login', Router.#usersController.showLoginForm);
this.post('/login', UsersController.loginValidation, Router.#usersController.processLoginForm);
this.get('/logout', Router.#usersController.processLogout);

// Protected dashboard route
this.get('/dashboard', UsersController.requireLogin, Router.#usersController.showDashboard);
```

- [ ] **4.3** New file `src/views/login.ejs`:

```ejs
<%- include('partials/header') %>
<main>
  <h1><%= title %></h1>
  <form action="/login" method="POST">
    <div class="form-group">
      <label for="email">Email (Username)</label>
      <input type="email" id="email" name="email" maxlength="100" autocomplete="username" required />
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <input
        type="password"
        id="password"
        name="password"
        autocomplete="current-password"
        required
      />
    </div>
    <button type="submit">Login</button>
  </form>
  <p>No account yet? <a href="/register">Register</a></p>
</main>
<%- include('partials/footer') %>
```

- [ ] **4.4** New file `src/views/dashboard.ejs`:

```ejs
<%- include('partials/header') %>
<main>
  <h1><%= title %></h1>
  <h2>Dashboard</h2>
  <p>Name: <%= name %></p>
  <p>Username: <%= email %></p>
</main>
<%- include('partials/footer') %>
```

- [ ] **4.5** `src/scripts/js/modules/app.mjs`: the course adds `isLoggedIn` to the `NODE_ENV` middleware, but in
      your app that middleware runs **before** the session middleware, where `req.session` does not exist yet. Instead,
      add this at the **end** of `configureMiddleware()`, after `this.app.use(methodOverride('_method'));`:

```js
// Login state for every template. Must come after the session middleware above.
this.app.use((req, res, next) => {
  res.locals.isLoggedIn = false;
  if (req.session && req.session.user) {
    res.locals.isLoggedIn = true;
  }
  next();
});
```

- [ ] **4.6** `src/views/partials/header.ejs`: replace the Register line from step 3.5 with the version below. (The
      course's sample has the two branches swapped: it shows Register/Login to logged-in users. This is the corrected
      order.)

```ejs
        <%_ if (isLoggedIn) { _%>
        <li><a href="/logout">Logout</a></li>
        <%_ } else { _%>
        <li><a href="/register">Register</a></li>
        <li><a href="/login">Login</a></li>
        <%_ } _%>
```

- [ ] **4.7** `src/views/home.ejs`: add right before `</main>`:

```ejs
  <%_ if (isLoggedIn) { _%>
  <p><a href="/dashboard">My Dashboard</a></p>
  <%_ } _%>
```

**Check:**

- `/dashboard` while logged out → `/login` with red "You must be logged in to access that page."
- Log in with a wrong password → red "Invalid email or password." Same message for an email that doesn't exist.
- Log in as `test@example.com` / `password1` → `/dashboard` with green "Login successful!", your name and email; the nav
  shows **Logout** only; the terminal shows `User logged in: { user_id: …, name: …, email: …, role_id: … }` with
  **no** `password_hash`.
- Visit other pages: still logged in (Logout stays). Home shows **My Dashboard**.
- Browser dev tools → Application → Cookies: the `connect.sid` value changes when you log in (session regenerated).
- **Logout** → `/login` with green "Logout successful!", nav shows Register + Login; `/dashboard` → redirected again.

---

## Part 5: Team Activity: admin role

### 5a. Role in the session

- [ ] **5.1** Replace `src/scripts/sql/users/findUserByEmail.sql` with the join version (the course's sample drops
      `name`; it is kept here because the dashboard shows it):

```sql
-- Includes the role name so it can be stored in the session (W05 team activity)
SELECT u.user_id, u.name, u.email, u.password_hash, r.role_name
FROM {{schema}}.users u
JOIN {{schema}}.roles r ON u.role_id = r.role_id
WHERE u.email = $1;
```

(No model change: `findUserByEmail()` already reads this file. Restart `npm run dev` after editing a `.sql` file.)

- [ ] **5.2** `src/scripts/js/modules/app.mjs`: in the login-state middleware from step 4.5, add before `next();`:

```js
res.locals.user = req.session.user || null;
```

### 5b. Protect admin routes on the server

- [ ] **5.3** `src/scripts/js/modules/routes.mjs`: add below the imports:

```js
const { requireLogin, requireRole } = UsersController;
```

then replace the **whole** `initializeRoutes()` method with this version. Every create, edit, assign and delete route
(GET and POST/DELETE) now has `requireRole('admin')`. Public pages stay open.

```js
  initializeRoutes() {
    this.get('/', Router.#homeController.showHomePage);

    // Organizations: public pages
    this.get('/organizations', Router.#organizationsController.showOrganizationsPage);
    this.get('/organization/:id', Router.#organizationsController.showOrganizationDetailsPage);
    // Organizations: admin only
    this.delete(
      '/organization/:id',
      requireRole('admin'),
      Router.#organizationsController.processDeleteOrganization
    );
    this.get(
      '/new-organization',
      requireRole('admin'),
      Router.#organizationsController.showNewOrganizationForm
    );
    this.post(
      '/new-organization',
      requireRole('admin'),
      OrganizationsController.validation,
      Router.#organizationsController.processNewOrganizationForm
    );
    this.get(
      '/edit-organization/:id',
      requireRole('admin'),
      Router.#organizationsController.showEditOrganizationForm
    );
    this.post(
      '/edit-organization/:id',
      requireRole('admin'),
      OrganizationsController.validation,
      Router.#organizationsController.processEditOrganizationForm
    );

    // Categories: public pages
    this.get('/categories', Router.#categoriesController.showCategoriesPage);
    this.get('/category/:id', Router.#categoriesController.showCategoryDetailsPage);
    // Categories: admin only
    this.get(
      '/assign-categories/:projectId',
      requireRole('admin'),
      Router.#categoriesController.showAssignCategoriesForm
    );
    this.post(
      '/assign-categories/:projectId',
      requireRole('admin'),
      Router.#categoriesController.processAssignCategoriesForm
    );
    this.get('/new-category', requireRole('admin'), Router.#categoriesController.showNewCategoryForm);
    this.post(
      '/new-category',
      requireRole('admin'),
      CategoriesController.validation,
      Router.#categoriesController.processNewCategoryForm
    );
    this.get(
      '/edit-category/:id',
      requireRole('admin'),
      Router.#categoriesController.showEditCategoryForm
    );
    this.post(
      '/edit-category/:id',
      requireRole('admin'),
      CategoriesController.validation,
      Router.#categoriesController.processEditCategoryForm
    );

    // Projects: public pages
    this.get('/projects', Router.#projectsController.showProjectsPage);
    this.get('/project/:id', Router.#projectsController.showProjectDetailsPage);
    // Projects: admin only
    this.delete('/project/:id', requireRole('admin'), Router.#projectsController.processDeleteProject);
    this.get('/new-project', requireRole('admin'), Router.#projectsController.showNewProjectForm);
    this.post(
      '/new-project',
      requireRole('admin'),
      ProjectsController.validation,
      Router.#projectsController.processNewProjectForm
    );
    this.get('/edit-project/:id', requireRole('admin'), Router.#projectsController.showEditProjectForm);
    this.post(
      '/edit-project/:id',
      requireRole('admin'),
      ProjectsController.validation,
      Router.#projectsController.processEditProjectForm
    );

    // Users: registration and login (public), dashboard (logged in)
    this.get('/register', Router.#usersController.showUserRegistrationForm);
    this.post(
      '/register',
      UsersController.registrationValidation,
      Router.#usersController.processUserRegistrationForm
    );
    this.get('/login', Router.#usersController.showLoginForm);
    this.post('/login', UsersController.loginValidation, Router.#usersController.processLoginForm);
    this.get('/logout', Router.#usersController.processLogout);
    this.get('/dashboard', requireLogin, Router.#usersController.showDashboard);

    // error handling routes
    this.get('/test-error', Router.#errorController.throwError500);
  }
```

(If your W04 routes use different handler names, keep your names and only add `requireRole('admin'),` as the first
handler.)

### 5c. Show admin links only to admins

Wrap each admin link with `<%_ if (user && user.role_name === 'admin') { _%>` … `<%_ } _%>`.

- [ ] **5.4** `src/views/organizations.ejs`:

```ejs
  <%_ if (user && user.role_name === 'admin') { _%>
  <p><a href="/new-organization">Add a new organization</a></p>
  <%_ } _%>
```

- [ ] **5.5** `src/views/organization.ejs`: wrap the **Edit Organization** link, the **Delete Organization** link and
      its hidden delete `<form>` (all three) in one block:

```ejs
    <%_ if (user && user.role_name === 'admin') { _%>
    <p><a href="/edit-organization/<%= organizationDetails.organization_id %>">Edit Organization</a></p>
    <p><a href="#" onclick="document.getElementById('delete-form-<%= organizationDetails.organization_id %>').submit(); return false;">Delete Organization</a></p>
    <form id="delete-form-<%= organizationDetails.organization_id %>" action="/organization/<%= organizationDetails.organization_id %>?_method=DELETE" method="POST" class="hiddenForm">
    </form>
    <%_ } _%>
```

- [ ] **5.6** `src/views/projects.ejs`: wrap `<p><a href="/new-project">Add a New Service Project</a></p>` the same way.
- [ ] **5.7** `src/views/project.ejs`: wrap **Edit Project** (W04 4.3), **Update Categories** (W04 5.7), **Delete
      Project** and its hidden form in one block.
- [ ] **5.8** `src/views/categories.ejs`: wrap **Add a new category** (W04 6.8).
- [ ] **5.9** `src/views/category.ejs`: wrap **Edit Category** (W04 6.9).

### 5d. The dedicated admin account (grader uses it)

- [ ] **5.10** On your site, **after** the Part 1 roll-over (local is fine: local and Render use the same database),
      **Register** with name
      `admin`, email `admin@example.com`, password `cse340!`. Use the form, not an `INSERT`, so the password is hashed.
- [ ] **5.11** pgAdmin, Query Tool on the new database:

```sql
-- View all users and roles
SELECT * FROM users;
SELECT * FROM roles;

-- Make the dedicated testing account an admin
UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'admin') WHERE email = 'admin@example.com';

-- Verify
SELECT users.user_id, users.email, roles.role_name FROM users JOIN roles ON users.role_id = roles.role_id;
```

Expect `admin@example.com | admin` and `test@example.com | user`. If `admin@example.com` was logged in already, log out
and in again: the role is copied into the session at login.

**Check:**

- Logged out: `/new-organization`, `/edit-project/1`, `/assign-categories/1`, `/new-category` → `/login` with red "You
  must be logged in to access this page." No Add/Edit/Delete/Update Categories links on any page.
- As `test@example.com`: the same URLs → `/` with red "You do not have permission to access this page."; still no admin
  links. Typing a delete URL is also refused (try it from the browser console:
  `fetch('/project/1?_method=DELETE', { method: 'POST' })` → the project is **not** deleted).
- As `admin@example.com` / `cse340!`: every admin link is visible and every W04 form works.
- Team discussion answers to prepare: authentication vs authorization; why `requireRole` must be a function factory
  (Express calls middleware with `(req, res, next)` only, so the role has to be captured in a closure); why hiding
  links is not security (anyone can type or script the URL).

- [ ] **5.12** Take the **W05 Team Activity quiz** in Canvas.

---

## Part 6: Assignment: registered users page (admin only)

- [ ] **6.1** New file `src/scripts/sql/users/getAllUsers.sql`:

```sql
-- Every registered user with their role (never the password hash)
SELECT u.user_id, u.name, u.email, r.role_name, u.created_at
FROM {{schema}}.users u
LEFT JOIN {{schema}}.roles r ON u.role_id = r.role_id
ORDER BY u.name, u.email;
```

- [ ] **6.2** `src/scripts/js/modules/routes.mjs`: add right after the `/dashboard` route. Non-admins who are logged in
      are sent to the **dashboard** (assignment requirement), not `/`:

```js
// Admin only: list of registered users (W05 assignment)
this.get('/users', requireRole('admin', '/dashboard'), Router.#usersController.showUsersPage);
```

- [ ] **6.3** New file `src/views/users.ejs` (the loop variable is `account`, not `user`, so it never hides the
      logged-in `user` the header uses):

```ejs
<%- include('partials/header') %>
<main>
  <h1><%= title %></h1>
  <table class="data-table">
    <caption>Every registered account and its role</caption>
    <thead>
      <tr>
        <th scope="col">Name</th>
        <th scope="col">Email (Username)</th>
        <th scope="col">Role</th>
      </tr>
    </thead>
    <tbody>
      <%_ users.forEach(account => { _%>
      <tr>
        <td><%= account.name %></td>
        <td><%= account.email %></td>
        <td><%= account.role_name || 'none' %></td>
      </tr>
      <%_ }); _%>
    </tbody>
  </table>
  <p><a href="/dashboard">Back to dashboard</a></p>
</main>
<%- include('partials/footer') %>
```

- [ ] **6.4** `src/views/dashboard.ejs`: add before `</main>`:

```ejs
  <%_ if (user && user.role_name === 'admin') { _%>
  <p><a href="/users">View all registered users</a></p>
  <%_ } _%>
```

- [ ] **6.5** `public/css/core.css`: add at the end:

```css
/* Data tables (registered users page) */
.data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}
.data-table caption {
  text-align: left;
  font-weight: bold;
  margin-bottom: 0.5rem;
}
.data-table th,
.data-table td {
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  text-align: left;
}
.data-table th {
  background-color: #f4f4f4;
}
```

(Narrow phones: if the table is wider than the screen, wrap it in `<div style="overflow-x: auto">`.)

**Check:**

- As `admin@example.com`: dashboard shows **View all registered users** → `/users` lists `admin` (admin) and
  `Test User` (user) with emails; no password hashes anywhere.
- As `test@example.com`: no link on the dashboard; typing `/users` → back on `/dashboard` with red "You do not have
  permission to access this page."
- Logged out: `/users` → `/login`.

---

## Part 7: Test, release, submit

- [ ] **7.1** Optional: add the public form pages to `src/scripts/js/modules/tests/previewTestSuite.mjs` `endpoints`
      (protected pages redirect, so leave them out):

```js
      { path: '/register', name: 'Register', type: 'page' },
      { path: '/login', name: 'Login', type: 'page' },
```

- [ ] **7.2** `npm run test:db` passes (Part 2 changes included).
- [ ] **7.3** `npm run verify` passes.
- [ ] **7.4** `deploy.sh -preview` passes.
- [ ] **7.5** Confirm `DB_URL` (Part 1.5, the new database's Internal URL) and `SESSION_SECRET` are set on Render, then commit on your W05
      branch and `release.sh cse340 <branch>`.
- [ ] **7.6** On the live site, repeat the Part 3, 4, 5 and 6 checks, including logging in as
      `admin@example.com` / `cse340!` (if this fails, the grader marks the assignment incomplete).
- [ ] **7.7** Canvas: **W05 Learning Activities quiz** (no AI) and **W05 Team Activity quiz** (Thu Nov 26).
- [ ] **7.8** Canvas: **W05 University Mission Feedback** (Thu Nov 26).
- [ ] **7.9** Canvas: **W05 Assignment** → submit `https://github.com/trrmann/CSE340` and
      `https://cse340-qdjd.onrender.com` (Sat Nov 28).
- [ ] **7.10** **W05 Coaching Session** (paste the course prompt unchanged; at least 30 minutes) → upload the
      transcript. Code to share for each required topic:

| Topic                                  | Show                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1. Registration and password hashing   | `createUsers.sql`; `processUserRegistrationForm` (genSalt/hash); `createUser` + `insertUser.sql`          |
| 2. Login and sessions                  | `authenticateUser` (compare, hash removed); `processLoginForm` (`regenerate`); session setup in `app.mjs` |
| 3. Protected access middleware         | `requireLogin`, the `requireRole` factory, and their use in `routes.mjs`                                  |
| 4. Protected access links / navigation | `header.ejs` Login/Logout block; admin `if` blocks in the views; the dashboard's users link               |

- [ ] **7.11** **W05 60-second Status Update** (Sat Nov 28).

**Note on accounts:** local and live share one database, so `test@example.com` and `admin@example.com` exist in both.
Keep the admin account until grading is finished. Remove the test account later with
`DELETE FROM users WHERE email = 'test@example.com';` if you want.
