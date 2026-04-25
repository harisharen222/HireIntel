export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (msg: string, details?: unknown) =>
  new HttpError(400, 'BAD_REQUEST', msg, details);
export const unauthorized = (msg = 'Authentication required') =>
  new HttpError(401, 'UNAUTHORIZED', msg);
export const forbidden = (msg = 'Insufficient permissions') =>
  new HttpError(403, 'FORBIDDEN', msg);
export const notFound = (msg = 'Not found') => new HttpError(404, 'NOT_FOUND', msg);
export const conflict = (msg: string) => new HttpError(409, 'CONFLICT', msg);
export const unprocessable = (msg: string) => new HttpError(422, 'UNPROCESSABLE', msg);
export const tooMany = (msg = 'Too many requests') =>
  new HttpError(429, 'TOO_MANY_REQUESTS', msg);
export const serviceUnavailable = (msg = 'Service unavailable') =>
  new HttpError(503, 'SERVICE_UNAVAILABLE', msg);
