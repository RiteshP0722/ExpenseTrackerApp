import { strings } from "../constants/strings";

interface ErrorLike {
  message?: unknown;
  code?: unknown;
  status?: unknown;
  name?: unknown;
}

function asErrorLike(err: unknown): ErrorLike {
  return typeof err === "object" && err !== null ? (err as ErrorLike) : {};
}

export function errorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  const m = asErrorLike(err).message;
  return typeof m === "string" ? m : "";
}

export function errorCode(err: unknown): string {
  const c = asErrorLike(err).code;
  return typeof c === "string" ? c : "";
}

export function isNetworkError(err: unknown): boolean {
  const msg = errorMessage(err).toLowerCase();
  return (
    msg.includes("network request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("fetch failed") ||
    msg.includes("network error") ||
    msg.includes("networkerror") ||
    msg.includes("timed out") ||
    asErrorLike(err).name === "AuthRetryableFetchError"
  );
}

/** Postgres "unique_violation" — used to detect a double save of the same expense id. */
export function isDuplicateError(err: unknown): boolean {
  return errorCode(err) === "23505";
}

export function isPermissionError(err: unknown): boolean {
  const msg = errorMessage(err).toLowerCase();
  return (
    errorCode(err) === "42501" || msg.includes("row-level security") || msg.includes("permission denied")
  );
}

/** Turns any error into a short message a non-technical person understands. */
export function friendlyError(err: unknown): string {
  // Errors the app raises itself already carry a readable message.
  if (err instanceof AppError && errorCode(err) !== "42501") return err.message;
  if (isNetworkError(err)) return strings.errorOffline;
  if (isPermissionError(err)) return strings.errorPermission;
  const msg = errorMessage(err);
  // Messages raised on purpose in schema.sql are already readable.
  if (errorCode(err) === "P0001" && msg) return msg;
  return strings.errorGeneric;
}

/** An error with a Postgres-style code, for problems the app detects itself. */
export class AppError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** Readable message for a failed "Send OTP" (Supabase returns raw SMS-provider errors). */
export function otpSendError(err: unknown): string {
  if (isNetworkError(err)) return strings.errorOffline;
  const msg = errorMessage(err).toLowerCase();
  const status = (err as { status?: unknown } | null)?.status;
  if (status === 429 || msg.includes("rate limit") || msg.includes("too many")) return strings.otpTooMany;
  if (msg.includes("provider") || msg.includes("sms") || msg.includes("twilio"))
    return strings.otpProviderError;
  return strings.otpSendFailed;
}
