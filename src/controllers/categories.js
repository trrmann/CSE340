import { CategoriesModel } from '../models/categories.js';
import { ProjectsModel } from '../models/projects.js';

class CategoriesController {
  static #categoriesModel = new CategoriesModel();
  static #projectsModel = new ProjectsModel();
  constructor() {}

  showCategoriesPage = async (_req, res) => {
    const categories = await CategoriesController.#categoriesModel.getAllCategories();
    const title = 'Service Project Categories';
    res.render('categories', { title, categories });
  };

  showCategoryDetailsPage = async (req, res, next) => {
    const categoryId = Number(req.params.id);
    const category =
      Number.isInteger(categoryId) && categoryId > 0
        ? await CategoriesController.#categoriesModel.getCategoryDetails(categoryId)
        : null;
    if (!category) {
      const err = new Error('Category Not Found');
      err.status = 404;
      return next(err);
    }
    const projects = await CategoriesController.#projectsModel.getProjectsByCategoryId(categoryId);
    const title = category.name;
    res.render('category', { title, category, projects });
  };
}

export { CategoriesController };
