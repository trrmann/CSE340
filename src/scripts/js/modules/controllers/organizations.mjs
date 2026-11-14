import { body } from 'express-validator';
import { BaseController } from '../library/baseController.mjs';
import { OrganizationsModel } from '../models/organizations.mjs';
import { ProjectsModel } from '../models/projects.mjs';

class OrganizationsController extends BaseController {
  /** Server-side validation for the create and edit organization forms. */
  static validation = [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Organization name is required')
      .isLength({ min: 3, max: 150 })
      .withMessage('Organization name must be between 3 and 150 characters'),
    body('description')
      .trim()
      .notEmpty()
      .withMessage('Organization description is required')
      .isLength({ max: 500 })
      .withMessage('Organization description cannot exceed 500 characters'),
    body('contactEmail')
      .normalizeEmail()
      .notEmpty()
      .withMessage('Contact email is required')
      .isEmail()
      .withMessage('Please provide a valid email address'),
  ];

  /** Models are passed in (tests can pass fakes); the defaults are the real models. */
  constructor({
    organizationsModel = new OrganizationsModel(),
    projectsModel = new ProjectsModel(),
  } = {}) {
    super();
    this.organizationsModel = organizationsModel;
    this.projectsModel = projectsModel;
  }

  showOrganizationsPage = async (_req, res) => {
    const organizations = await this.organizationsModel.getAllOrganization();
    const title = 'Our Partner Organizations';
    res.render('organizations', { title, organizations });
  };

  showOrganizationDetailsPage = async (req, res, next) => {
    const organizationId = this.parseId(req.params.id);
    const organizationDetails = organizationId
      ? await this.organizationsModel.getOrganizationDetails(organizationId)
      : null;
    if (!organizationDetails) {
      return next(this.notFound('Organization Not Found'));
    }
    const projects = await this.projectsModel.getProjectsByOrganizationId(organizationId);
    const title = 'Organization Details';
    res.render('organization', { title, organizationDetails, projects });
  };

  showNewOrganizationForm = async (_req, res) => {
    const title = 'Add New Organization';
    res.render('new-organization', { title });
  };

  processNewOrganizationForm = async (req, res) => {
    if (this.flashErrors(req)) {
      return res.redirect('/new-organization');
    }
    const { name, description, contactEmail } = req.body;
    const logoFilename = 'placeholder-logo.png';
    const organizationId = await this.organizationsModel.createOrganization(
      name,
      description,
      contactEmail,
      logoFilename
    );
    req.flash('success', 'Organization added successfully!');
    res.redirect(`/organization/${organizationId}`);
  };

  showEditOrganizationForm = async (req, res, next) => {
    const organizationId = this.parseId(req.params.id);
    const organizationDetails = organizationId
      ? await this.organizationsModel.getOrganizationDetails(organizationId)
      : null;
    if (!organizationDetails) {
      return next(this.notFound('Organization Not Found'));
    }
    const title = 'Edit Organization';
    res.render('edit-organization', { title, organizationDetails });
  };

  processEditOrganizationForm = async (req, res, next) => {
    const organizationId = this.parseId(req.params.id);
    if (!organizationId) {
      return next(this.notFound('Organization Not Found'));
    }
    if (this.flashErrors(req)) {
      return res.redirect(`/edit-organization/${organizationId}`);
    }
    const { name, description, contactEmail, logoFilename } = req.body;
    await this.organizationsModel.updateOrganization(
      organizationId,
      name,
      description,
      contactEmail,
      logoFilename
    );
    req.flash('success', 'Organization updated successfully!');
    res.redirect(`/organization/${organizationId}`);
  };
}

export { OrganizationsController };
