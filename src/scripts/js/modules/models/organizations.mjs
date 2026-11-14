import { PgDBConnection } from '../library/db.mjs';

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
  async getOrganizationDetails(organizationId) {
    const result = await this.query({
      querySQLPath: 'getOrganizationDetails.sql',
      params: [organizationId],
    });
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  async createOrganization(name, description, contactEmail, logoFilename) {
    const result = await this.query({
      querySQLPath: 'insertOrganization.sql',
      params: [name, description, contactEmail, logoFilename],
    });
    if (result.rows.length === 0) {
      throw new Error('Failed to create organization');
    }
    return result.rows[0].organization_id;
  }
  async updateOrganization(organizationId, name, description, contactEmail, logoFilename) {
    const result = await this.query({
      querySQLPath: 'updateOrganization.sql',
      params: [name, description, contactEmail, logoFilename, organizationId],
    });
    if (result.rows.length === 0) {
      throw new Error('Organization not found');
    }
    return result.rows[0].organization_id;
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
const getOrganizationDetails = (organizationId) =>
  new OrganizationsModel().getOrganizationDetails(organizationId);
const createOrganization = (name, description, contactEmail, logoFilename) =>
  new OrganizationsModel().createOrganization(name, description, contactEmail, logoFilename);
const updateOrganization = (organizationId, name, description, contactEmail, logoFilename) =>
  new OrganizationsModel().updateOrganization(
    organizationId,
    name,
    description,
    contactEmail,
    logoFilename
  );

export {
  OrganizationsModel,
  getAllOrganizations,
  getOrganizationDetails,
  createOrganization,
  updateOrganization,
};
