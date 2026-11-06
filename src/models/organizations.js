import { pgDBConnection } from './db.js'

class OrganizationsModel extends pgDBConnection {
  constructor() {
    super('organization');
  }
  getAllOrganizations = async() => (await this.query({ querySQLPath: 'getAllOrganizations.sql' })).rows;

}

/**
 * Function-style alias matching the course assignment's model pattern (getAllOrganizations()).
 * Not used by this application (server.js uses OrganizationsModel); present only to show the
 * same functionality in line with the assignment directly.
 */
const getAllOrganizations = () => new OrganizationsModel().getAllOrganizations();

export { OrganizationsModel, getAllOrganizations }
