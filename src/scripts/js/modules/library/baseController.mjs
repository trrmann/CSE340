import { validationResult } from 'express-validator';
import { HttpError } from './httpError.mjs';

/**
 * Shared helpers for every controller. Controllers extend this class, so the same rules
 * apply everywhere (for example, what counts as a valid id).
 */
class BaseController {
  /** A positive whole-number id from a route parameter, or null if it isn't one. */
  parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  /** A 404 error for the global error handler. */
  notFound(message) {
    return HttpError.notFound(message);
  }

  /** Flash every validation error from express-validator; returns true when there were errors. */
  flashErrors(req) {
    const results = validationResult(req);
    results.array().forEach((error) => req.flash('error', error.msg));
    return !results.isEmpty();
  }
}

export { BaseController };
