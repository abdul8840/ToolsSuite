import { ValidationError } from "./errors.js";

export function parseOptions(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Options must be an object");
    return parsed;
  } catch (error) {
    throw new ValidationError("Invalid options JSON", error.message);
  }
}

export function numberOption(options, key, fallback, min, max) {
  const raw = options[key];
  const value = raw === undefined || raw === "" ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) throw new ValidationError(`${key} must be between ${min} and ${max}`);
  return value;
}

export function stringOption(options, key, fallback, allowed) {
  const value = (options[key] ?? fallback ?? "").toString();
  if (allowed && !allowed.includes(value)) throw new ValidationError(`${key} must be one of: ${allowed.join(", ")}`);
  return value;
}
