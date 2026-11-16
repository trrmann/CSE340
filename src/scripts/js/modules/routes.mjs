import express from 'express';

import { HomeController } from './controllers/index.mjs';
import { OrganizationsController } from './controllers/organizations.mjs';
import { ProjectsController } from './controllers/projects.mjs';
import { CategoriesController } from './controllers/categories.mjs';
import { ErrorController } from './controllers/errors.mjs';

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
    this.delete('/organization/:id', Router.#organizationsController.processDeleteOrganization);
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
    this.get('/categories', Router.#categoriesController.showCategoriesPage);
    this.get('/category/:id', Router.#categoriesController.showCategoryDetailsPage);
    this.delete('/category/:id', Router.#categoriesController.processDeleteCategory);
    this.get(
      '/assign-categories/:projectId',
      Router.#categoriesController.showAssignCategoriesForm
    );
    this.post(
      '/assign-categories/:projectId',
      Router.#categoriesController.processAssignCategoriesForm
    );
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
    this.get('/projects', Router.#projectsController.showProjectsPage);
    this.get('/project/:id', Router.#projectsController.showProjectDetailsPage);
    this.delete('/project/:id', Router.#projectsController.processDeleteProject);
    this.get('/new-project', Router.#projectsController.showNewProjectForm);
    this.post(
      '/new-project',
      ProjectsController.validation,
      Router.#projectsController.processNewProjectForm
    );

    // error handling routes
    this.get('/test-error', Router.#errorController.throwError500);
  }
}

export { Router };
