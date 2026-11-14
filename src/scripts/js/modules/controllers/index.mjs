import { BaseController } from '../library/baseController.mjs';

class HomeController extends BaseController {
  constructor() {
    super();
  }
  showHomePage = async (_req, res) => {
    const title = 'Home';
    res.render('home', { title });
  };
}

export { HomeController };
