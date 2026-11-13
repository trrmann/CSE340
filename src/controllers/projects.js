import { ProjectsModel } from '../models/projects.js';

class ProjectsController {
  static #projectsModel = new ProjectsModel();
  constructor() {}
  showProjectsPage = async (_req, res) => {
    const projects = await ProjectsController.#projectsModel.getAllProjects();
    const title = 'Service Projects';
    res.render('projects', { title, projects });
  };
}

export { ProjectsController };
