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
