import { body } from 'express-validator';
import { BaseController } from '../library/baseController.mjs';
import { CategoriesModel } from '../models/categories.mjs';
import { ProjectsModel } from '../models/projects.mjs';
import { ProjectCategoriesModel } from '../models/projectCategories.mjs';

class CategoriesController extends BaseController {
  /** Server-side validation for the create and edit category forms. */
  static validation = [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Category name is required')
      .isLength({ min: 3, max: 100 })
      .withMessage('Category name must be between 3 and 100 characters'),
  ];

  /** PostgreSQL error 23505 = unique violation (category names are UNIQUE). */
  static #isDuplicate(error) {
    return Boolean(error) && error.code === '23505';
  }

  constructor({
    categoriesModel = new CategoriesModel(),
    projectsModel = new ProjectsModel(),
    projectCategoriesModel = new ProjectCategoriesModel(),
  } = {}) {
    super();
    this.categoriesModel = categoriesModel;
    this.projectsModel = projectsModel;
    this.projectCategoriesModel = projectCategoriesModel;
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

  showAssignCategoriesForm = async (req, res, next) => {
    const projectId = this.parseId(req.params.projectId);
    const projectDetails = projectId ? await this.projectsModel.getProjectDetails(projectId) : null;
    if (!projectDetails) {
      return next(this.notFound('Project Not Found'));
    }
    const categories = await this.categoriesModel.getAllCategories();
    const assignedCategories = await this.categoriesModel.getCategoriesByProjectId(projectId);
    const title = 'Assign Categories to Project';
    res.render('assign-categories', {
      title,
      projectId,
      projectDetails,
      categories,
      assignedCategories,
    });
  };

  processAssignCategoriesForm = async (req, res, next) => {
    const projectId = this.parseId(req.params.projectId);
    if (!projectId) {
      return next(this.notFound('Project Not Found'));
    }
    const selected = req.body.categoryIds || [];
    const categoryIds = (Array.isArray(selected) ? selected : [selected]).map(Number);
    await this.projectCategoriesModel.updateCategoryAssignments(projectId, categoryIds);
    req.flash('success', 'Categories updated successfully.');
    res.redirect(`/project/${projectId}`);
  };

  showNewCategoryForm = async (_req, res) => {
    const title = 'Add New Category';
    res.render('new-category', { title });
  };

  processNewCategoryForm = async (req, res) => {
    if (this.flashErrors(req)) {
      return res.redirect('/new-category');
    }
    try {
      const categoryId = await this.categoriesModel.createCategory(req.body.name);
      req.flash('success', 'Category added successfully!');
      res.redirect(`/category/${categoryId}`);
    } catch (error) {
      req.flash(
        'error',
        CategoriesController.#isDuplicate(error)
          ? 'A category with that name already exists.'
          : 'There was an error creating the category.'
      );
      res.redirect('/new-category');
    }
  };

  showEditCategoryForm = async (req, res, next) => {
    const categoryId = this.parseId(req.params.id);
    const category = categoryId ? await this.categoriesModel.getCategoryDetails(categoryId) : null;
    if (!category) {
      return next(this.notFound('Category Not Found'));
    }
    const title = 'Edit Category';
    res.render('edit-category', { title, category });
  };

  processEditCategoryForm = async (req, res, next) => {
    const categoryId = this.parseId(req.params.id);
    if (!categoryId) {
      return next(this.notFound('Category Not Found'));
    }
    if (this.flashErrors(req)) {
      return res.redirect(`/edit-category/${categoryId}`);
    }
    try {
      await this.categoriesModel.updateCategory(categoryId, req.body.name);
      req.flash('success', 'Category updated successfully!');
      res.redirect(`/category/${categoryId}`);
    } catch (error) {
      req.flash(
        'error',
        CategoriesController.#isDuplicate(error)
          ? 'A category with that name already exists.'
          : 'There was an error updating the category.'
      );
      res.redirect(`/edit-category/${categoryId}`);
    }
  };
}

export { CategoriesController };
