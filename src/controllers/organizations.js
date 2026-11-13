import { OrganizationsModel } from '../models/organizations.js';

class OrganizationsController {
  static #organizationsModel = new OrganizationsModel();
  constructor() {}
  showOrganizationsPage = async (_req, res) => {
    const organizations = await OrganizationsController.#organizationsModel.getAllOrganization();
    const title = 'Our Partner Organizations';
    res.render('organizations', { title, organizations });
  };
}

export { OrganizationsController };
