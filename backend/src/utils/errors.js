export class AppError extends Error {
  constructor(message, statusCode = 500, code = "APP_ERROR", details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class ToolDependencyError extends AppError {
  constructor(binary, hint) {
    super(`${binary} is required on this server for this operation. ${hint || "Install it and try again."}`, 501, "MISSING_LOCAL_DEPENDENCY", { binary, hint });
  }
}
