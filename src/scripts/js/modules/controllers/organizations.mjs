import { BaseController } from '../library/baseController.mjs';
import { OrganizationsModel } from '../models/organizations.mjs';
import { ProjectsModel } from '../models/projects.mjs';

class OrganizationsController extends BaseController {
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
}

export { OrganizationsController };
