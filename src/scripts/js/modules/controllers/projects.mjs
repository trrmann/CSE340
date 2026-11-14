import { BaseController } from '../library/baseController.mjs';
import { ProjectsModel } from '../models/projects.mjs';
import { CategoriesModel } from '../models/categories.mjs';

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
