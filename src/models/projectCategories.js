import { PgDBConnection } from './db.js';

/**
 * Model for the project_category join table (many-to-many: projects <-> categories).
 * Currently used only for provisioning (create / default data / truncate / drop).
 */
class ProjectCategoriesModel extends PgDBConnection {
  /** Table this model owns, and the tables it references by foreign key. */
  static tableName = 'project_category';
  static requires = ['project', 'category'];
  constructor() {
    super('project_category');
  }
  async count() {
    return Number(
      (await this.executeQuery({ querySQLPath: 'countProjectCategory.sql' })).rows[0].count
    );
  }
  async hasData() {
    return (await this.executeQuery({ querySQLPath: 'hasProjectCategoryData.sql' })).rows[0]
      .has_data;
  }
  async create() {
    await this.executeQuery({ querySQLPath: 'createProjectCategory.sql' });
    return true;
  }
  async defaultLoad() {
    await this.executeQuery({ querySQLPath: 'defaultLoadProjectCategory.sql' });
    return true;
  }
  /** Nothing references project_category, so a plain truncate is always safe. */
  async truncate() {
    await this.executeQuery({ querySQLPath: 'truncateProjectCategory.sql' });
    return true;
  }
  async drop() {
    await this.executeQuery({ querySQLPath: 'dropProjectCategory.sql' });
    return true;
  }
}

// Order 4 (last): references project (order 2) and category (order 3).
PgDBConnection.registerProvisioner(4, ProjectCategoriesModel);

export { ProjectCategoriesModel };
