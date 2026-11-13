import { OrganizationsModel } from '../models/organizations.js';
import { ProjectsModel } from '../models/projects.js';

class OrganizationsController {
  static #organizationsModel = new OrganizationsModel();
  constructor() {}
  showOrganizationsPage = async (_req, res) => {
    const organizations = await OrganizationsController.#organizationsModel.getAllOrganization();
    const title = 'Our Partner Organizations';
    res.render('organizations', { title, organizations });
  };
  showOrganizationDetailsPage = async (req, res, next) => {
    const organizationId = req.params.id;
    const organizationDetails =
      await OrganizationsController.#organizationsModel.getOrganizationDetails(organizationId);
    const projects = await new ProjectsModel().getProjectsByOrganizationId(organizationId);
    const title = 'Organization Details';
    if (!organizationDetails) {
      const err = new Error('Organization Not Found');
      err.status = 404;
      next(err);
    } else {
      res.render('organization', { title, organizationDetails, projects });
    }
  };
}

export { OrganizationsController };
