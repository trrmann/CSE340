import { pgDBConnection } from './db.js'

class ProjectsModel extends pgDBConnection {
  constructor() {
    super('project');
  }
  getAllProjects = async() => (await this.query({ querySQLPath: 'getAllProjects.sql' })).rows;

}

/**
 * Function-style alias matching the course assignment's model pattern (getAllProjects()).
 * Not used by this application (server.js uses ProjectsModel); present only to show the
 * same functionality in line with the assignment directly.
 */
const getAllProjects = () => new ProjectsModel().getAllProjects();

export { ProjectsModel, getAllProjects }