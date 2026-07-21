/**
 * Base class for service-layer errors.
 * The oRPC error interceptor can inspect `status` to map to HTTP codes.
 */
export class ServiceError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string, identifier?: string) {
    super(
      404,
      identifier
        ? `${resource} '${identifier}' not found`
        : `${resource} not found`,
    );
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string) {
    super(409, message);
    this.name = "ConflictError";
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string) {
    super(400, message);
    this.name = "ValidationError";
  }
}

/** True when `err` is a SQLite UNIQUE-constraint violation. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Error &&
    `${err.cause ?? err.message}`.includes("UNIQUE constraint failed")
  );
}
