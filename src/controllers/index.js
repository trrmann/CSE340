class HomeController {
  constructor() {}
  showHomePage = async (_req, res) => {
    const title = 'Home';
    res.render('home', { title });
  };
}

export { HomeController };
