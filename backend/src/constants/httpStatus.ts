// Central registry of HTTP status codes used across the backend — replaces
// magic numbers like `new AppError('...', 401)` with `HttpStatus.UNAUTHORIZED`
// so call sites are self-documenting and a typo (e.g. 401 vs 410) is caught
// by name instead of by memorizing the numeric table.
export const HttpStatus = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;
