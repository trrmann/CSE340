import { PgDBConnection } from './db.js';

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

export { ProjectsModel, getAllProjects };
