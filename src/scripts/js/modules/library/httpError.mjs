class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }

  static notFound(message = 'Page Not Found') {
    return new HttpError(404, message);
  }
}

export { HttpError };
