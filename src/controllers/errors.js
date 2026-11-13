class ErrorController {
  constructor() {}
  throwError500 = async (req, res, next) => {
    const err = new Error('This is a test Error');
    err.status = 500;
    next(err);
  };
}

export { ErrorController };
