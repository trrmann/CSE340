import express from 'express';

import { HomeController } from './controllers/index.js';
import { OrganizationsController } from './controllers/organizations.js';
import { ProjectsController } from './controllers/projects.js';
import { CategoriesController } from './controllers/categories.js';
import { ErrorController } from './controllers/errors.js';

class Router extends express.Router {
  static #homeController = new HomeController();
  static #organizationsController = new OrganizationsController();
  static #projectsController = new ProjectsController();
  static #categoriesController = new CategoriesController();
  static #errorController = new ErrorController();
  constructor() {
    super();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.get('/', Router.#homeController.showHomePage);
    this.get('/organizations', Router.#organizationsController.showOrganizationsPage);
    this.get('/organization/:id', Router.#organizationsController.showOrganizationDetailsPage);
    this.get('/categories', Router.#categoriesController.showCategoriesPage);
    this.get('/category/:id', Router.#categoriesController.showCategoryDetailsPage);
    this.get('/projects', Router.#projectsController.showProjectsPage);
    this.get('/project/:id', Router.#projectsController.showProjectDetailsPage);

    // error handling routes
    this.get('/test-error', Router.#errorController.throwError500);
  }
}

export { Router };
