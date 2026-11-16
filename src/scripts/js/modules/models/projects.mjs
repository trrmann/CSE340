import { PgDBConnection } from '../library/db.mjs';

class ProjectsModel extends PgDBConnection {
  /** Table this model owns, and the tables it references by foreign key. */
  static tableName = 'project';
  static requires = ['organization'];
  constructor() {
    super('project');
  }
  async getAllProjects() {
    return (await this.query({ querySQLPath: 'getAllProjects.sql' })).rows;
  }
  async getProjectsByOrganizationId(organizationId) {
    return (
      await this.query({
        querySQLPath: 'getProjectsByOrganizationId.sql',
        params: [organizationId],
      })
    ).rows;
  }
  async getUpcomingProjects(numberOfProjects) {
    return (
      await this.query({ querySQLPath: 'getUpcomingProjects.sql', params: [numberOfProjects] })
    ).rows;
  }
  async getProjectDetails(projectId) {
    const result = await this.query({ querySQLPath: 'getProjectDetails.sql', params: [projectId] });
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  async getProjectsByCategoryId(categoryId) {
    return (await this.query({ querySQLPath: 'getProjectsByCategoryId.sql', params: [categoryId] }))
      .rows;
  }
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
  async deleteProject(projectId) {
    const result = await this.query({ querySQLPath: 'deleteProject.sql', params: [projectId] });
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  async count() {
    return Number((await this.executeQuery({ querySQLPath: 'countProject.sql' })).rows[0].count);
  }
  async hasData() {
    return (await this.executeQuery({ querySQLPath: 'hasProjectData.sql' })).rows[0].has_data;
  }
  async create() {
    await this.executeQuery({ querySQLPath: 'createProject.sql' });
    return true;
  }
  async defaultLoad() {
    await this.executeQuery({ querySQLPath: 'defaultLoadProject.sql' });
    return true;
  }
  /** Fails while project_category references project; use cascadeTruncate or PgDBConnection.truncateAll(). */
  async truncate() {
    await this.executeQuery({ querySQLPath: 'truncateProject.sql' });
    return true;
  }
  /** Also empties project_category. */
  async cascadeTruncate() {
    await this.executeQuery({ querySQLPath: 'cascadeTruncateProject.sql' });
    return true;
  }
  /** Drop project_category first (or use PgDBConnection.dropAll(), which drops in the right order). */
  async drop() {
    await this.executeQuery({ querySQLPath: 'dropProject.sql' });
    return true;
  }
}

// Order 2: references organization (order 1); project_category (order 4) references it.
PgDBConnection.registerProvisioner(2, ProjectsModel);

/**
 * Function-style alias matching the course assignment's model pattern (getAllProjects()).
 * Not used by this application (server.js uses ProjectsModel); present only to show the
 * same functionality in line with the assignment directly.
 */
const getAllProjects = () => new ProjectsModel().getAllProjects();
const getProjectsByOrganizationId = (organizationId) =>
  new ProjectsModel().getProjectsByOrganizationId(organizationId);
const getUpcomingProjects = (numberOfProjects) =>
  new ProjectsModel().getUpcomingProjects(numberOfProjects);
const getProjectDetails = (projectId) => new ProjectsModel().getProjectDetails(projectId);
const getProjectsByCategoryId = (categoryId) =>
  new ProjectsModel().getProjectsByCategoryId(categoryId);
const createProject = (title, description, location, date, organizationId) =>
  new ProjectsModel().createProject(title, description, location, date, organizationId);
const updateProject = (projectId, title, description, location, date, organizationId) =>
  new ProjectsModel().updateProject(projectId, title, description, location, date, organizationId);
const deleteProject = (projectId) => new ProjectsModel().deleteProject(projectId);

export {
  ProjectsModel,
  getAllProjects,
  getProjectsByOrganizationId,
  getUpcomingProjects,
  getProjectDetails,
  getProjectsByCategoryId,
  createProject,
  updateProject,
  deleteProject,
};
