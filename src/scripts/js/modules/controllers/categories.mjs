import { BaseController } from '../library/baseController.mjs';
import { CategoriesModel } from '../models/categories.mjs';
import { ProjectsModel } from '../models/projects.mjs';

class CategoriesController extends BaseController {
  constructor({
    categoriesModel = new CategoriesModel(),
    projectsModel = new ProjectsModel(),
  } = {}) {
    super();
    this.categoriesModel = categoriesModel;
    this.projectsModel = projectsModel;
  }

  showCategoriesPage = async (_req, res) => {
    const categories = await this.categoriesModel.getAllCategories();
    const title = 'Service Project Categories';
    res.render('categories', { title, categories });
  };

  showCategoryDetailsPage = async (req, res, next) => {
    const categoryId = this.parseId(req.params.id);
    const category = categoryId ? await this.categoriesModel.getCategoryDetails(categoryId) : null;
    if (!category) {
      return next(this.notFound('Category Not Found'));
    }
    const projects = await this.projectsModel.getProjectsByCategoryId(categoryId);
    const title = category.name;
    res.render('category', { title, category, projects });
  };
}

export { CategoriesController };
