import { PgDBConnection } from '../library/db.mjs';

class CategoriesModel extends PgDBConnection {
  /** Table this model owns, and the tables it references by foreign key (none). */
  static tableName = 'category';
  static requires = [];
  constructor() {
    super('category');
  }
  async getAllCategories() {
    return (await this.query({ querySQLPath: 'getAllCategories.sql' })).rows;
  }
  async getCategoryDetails(categoryId) {
    const result = await this.query({
      querySQLPath: 'getCategoryDetails.sql',
      params: [categoryId],
    });
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  async getCategoriesByProjectId(projectId) {
    return (await this.query({ querySQLPath: 'getCategoriesByProjectId.sql', params: [projectId] }))
      .rows;
  }
  async count() {
    return Number((await this.executeQuery({ querySQLPath: 'countCategory.sql' })).rows[0].count);
  }
  async hasData() {
    return (await this.executeQuery({ querySQLPath: 'hasCategoryData.sql' })).rows[0].has_data;
  }
  async create() {
    await this.executeQuery({ querySQLPath: 'createCategory.sql' });
    return true;
  }
  async defaultLoad() {
    await this.executeQuery({ querySQLPath: 'defaultLoadCategory.sql' });
    return true;
  }
  /** Fails while project_category references category; use cascadeTruncate or PgDBConnection.truncateAll(). */
  async truncate() {
    await this.executeQuery({ querySQLPath: 'truncateCategory.sql' });
    return true;
  }
  /** Also empties project_category. */
  async cascadeTruncate() {
    await this.executeQuery({ querySQLPath: 'cascadeTruncateCategory.sql' });
    return true;
  }
  /** Drop project_category first (or use PgDBConnection.dropAll(), which drops in the right order). */
  async drop() {
    await this.executeQuery({ querySQLPath: 'dropCategory.sql' });
    return true;
  }
}

// Order 3: no prerequisites, but must come before project_category (order 4), which references it.
PgDBConnection.registerProvisioner(3, CategoriesModel);

/**
 * Function-style alias matching the course assignment's model pattern (getAllCategories()).
 * Not used by this application (server.js uses CategoriesModel); present only to show the
 * same functionality in line with the assignment directly.
 */
const getAllCategories = () => new CategoriesModel().getAllCategories();
const getCategoryDetails = (categoryId) => new CategoriesModel().getCategoryDetails(categoryId);
const getCategoriesByProjectId = (projectId) =>
  new CategoriesModel().getCategoriesByProjectId(projectId);

export { CategoriesModel, getAllCategories, getCategoryDetails, getCategoriesByProjectId };
