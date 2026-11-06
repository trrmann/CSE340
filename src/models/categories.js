import { pgDBConnection } from './db.js'

class CategoriesModel extends pgDBConnection {
  constructor() {
    super('category');
  }
  getAllCategories = async() => (await this.query({ querySQLPath: 'getAllCategories.sql' })).rows;

}

/**
 * Function-style alias matching the course assignment's model pattern (getAllCategories()).
 * Not used by this application (server.js uses CategoriesModel); present only to show the
 * same functionality in line with the assignment directly.
 */
const getAllCategories = () => new CategoriesModel().getAllCategories();

export { CategoriesModel, getAllCategories }
