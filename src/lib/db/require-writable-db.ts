import { AppError } from "@/lib/errors/app-error";

/** Mutations must not return fake success when the database client is missing. */
export function requireWritableDatabase<T>(
  client: T | null,
  action = "This action",
): T {
  if (client) return client;
  throw new AppError({
    message:
      process.env.NODE_ENV === "production"
        ? `${action} is temporarily unavailable.`
        : `${action} needs a configured database.`,
    code: "DATABASE_UNAVAILABLE",
    status: 503,
    expose: true,
  });
}
