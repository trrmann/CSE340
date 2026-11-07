import { PgDBConnection } from './db.js';

class OrganizationsModel extends PgDBConnection {
  /** Table this model owns, and the tables it references by foreign key (none). */
  static tableName = 'organization';
  static requires = [];
  constructor() {
    super('organization');
  }
  async getAllOrganization() {
    return (await this.query({ querySQLPath: 'getAllOrganization.sql' })).rows;
  }
  async count() {
    return Number(
      (await this.executeQuery({ querySQLPath: 'countOrganization.sql' })).rows[0].count
    );
  }
  async hasData() {
    return (await this.executeQuery({ querySQLPath: 'hasOrganizationData.sql' })).rows[0].has_data;
  }
  async cascadeTruncate() {
    await this.executeQuery({ querySQLPath: 'cascadeTruncateOrganization.sql' });
    return true;
  }
  async hasTable() {
    return this.tableExists('organization');
  }
  async create() {
    await this.executeQuery({ querySQLPath: 'createOrganization.sql' });
    return true;
  }
  async defaultLoad() {
    await this.executeQuery({ querySQLPath: 'defaultLoadOrganization.sql' });
    return true;
  }
  async drop() {
    await this.executeQuery({ querySQLPath: 'dropOrganization.sql' });
    return true;
  }
  async truncate() {
    await this.executeQuery({ querySQLPath: 'truncateOrganization.sql' });
    return true;
  }
}

// Provision this table first (order 1): other tables reference organization by foreign key.
PgDBConnection.registerProvisioner(1, OrganizationsModel);

/**
 * Function-style alias matching the course assignment's model pattern (getAllOrganizations()).
 * Not used by this application (server.js uses OrganizationsModel); present only to show the
 * same functionality in line with the assignment directly.
 */
const getAllOrganizations = () => new OrganizationsModel().getAllOrganization();

export { OrganizationsModel, getAllOrganizations };
