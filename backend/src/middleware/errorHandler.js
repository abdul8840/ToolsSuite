import { isProduction } from "../config/env.js";

export function notFound(_req, _res, next) {
  const error = new Error("Route not found");
  error.statusCode = 404;
  error.code = "NOT_FOUND";
  next(error);
}

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    code: err.code || "SERVER_ERROR",
    message: statusCode >= 500 && isProduction ? "Internal server error" : err.message
  };

  if (!isProduction && err.details) payload.details = err.details;
  if (!isProduction && err.stack) payload.stack = err.stack;

  res.status(statusCode).json(payload);
}
