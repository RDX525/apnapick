export function stripControlChars(input: string): string {
  return input.replace(/[\u0000-\u001F\u007F]/g, "");
}

export function truncateString(input: string, max: number): string {
  if (input.length <= max) return input;
  return input.slice(0, max);
}

export function sanitizeSearchQuery(input: string): string {
  return truncateString(stripControlChars(input).trim(), 200);
}

/** Escape user input for PostgREST `.or()` filter values. */
export function escapePostgrestOrValue(input: string): string {
  return stripControlChars(input)
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\./g, "\\.");
}

/** JSON for <script type="application/ld+json"> — escape HTML breakouts. */
export function escapeJsonForScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
