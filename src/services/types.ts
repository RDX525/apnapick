/**
 * Service layer contract — keep business rules out of UI and route handlers.
 */
export type ServiceResult<T> =
  { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(code: string, message: string): ServiceResult<T> {
  return { ok: false, error: { code, message } };
}
