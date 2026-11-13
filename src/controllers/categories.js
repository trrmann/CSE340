import { CategoriesModel } from '../models/categories.js';

class CategoriesController {
  static #categoriesModel = new CategoriesModel();
  constructor() {}
  showCategoriesPage = async (_req, res) => {
    const categories = await CategoriesController.#categoriesModel.getAllCategories();
    const title = 'Service Project Categories';
    res.render('categories', { title, categories });
  };
}

export { CategoriesController };
