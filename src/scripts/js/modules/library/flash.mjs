/**
 * Flash messages: stored in the session, survive one redirect, cleared when read.
 *   req.flash('success', 'text')  store a message
 *   req.flash('error')            read (and clear) one type
 *   req.flash()                   read (and clear) all types
 * Templates call flash() through res.locals.
 */
class FlashMessages {
  static #empty() {
    return { success: [], error: [], warning: [], info: [] };
  }

  static middleware = (req, res, next) => {
    req.flash = (type, message) => {
      if (!req.session.flash) {
        req.session.flash = FlashMessages.#empty();
      }
      if (type && message) {
        (req.session.flash[type] ??= []).push(message);
        return undefined;
      }
      if (type) {
        const messages = req.session.flash[type] || [];
        req.session.flash[type] = [];
        return messages;
      }
      const all = req.session.flash;
      req.session.flash = FlashMessages.#empty();
      return all;
    };
    res.locals.flash = req.flash;
    next();
  };
}

export { FlashMessages };
