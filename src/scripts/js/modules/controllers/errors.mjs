import { BaseController } from '../library/baseController.mjs';
import { HttpError } from '../library/httpError.mjs';

class ErrorController extends BaseController {
  constructor() {
    super();
  }
  throwError500 = async (_req, _res, next) => {
    next(new HttpError(500, 'This is a test Error'));
  };
}

export { ErrorController };
