import { body } from 'express-validator';
import { BaseController } from '../library/baseController.mjs';
import { ProjectsModel } from '../models/projects.mjs';
import { CategoriesModel } from '../models/categories.mjs';
import { OrganizationsModel } from '../models/organizations.mjs';

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

  processDeleteProject = async (req, res, next) => {
    const projectId = this.parseId(req.params.id);
    if (!projectId) {
      return next(this.notFound('Project Not Found'));
    }
    const project = await this.projectsModel.getProjectDetails(projectId);
    if (!project) {
      return next(this.notFound('Project Not Found'));
    }
    const { title } = project;
    try {
      await this.projectsModel.deleteProject(projectId);
      req.flash('success', `Service project '${title}' deleted successfully!`);
      res.redirect('/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      req.flash('error', 'There was an error deleting the service project.');
      res.redirect(`/project/${projectId}`);
    }
  };
}

export { ProjectsController };
