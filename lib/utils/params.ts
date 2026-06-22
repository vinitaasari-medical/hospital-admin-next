/**
 * Validates a dynamic route parameter.
 *
 * Returns the trimmed value if usable, or null when the param is:
 *   - undefined / null
 *   - an empty string or whitespace-only string
 *   - the literal strings "undefined" or "null" (Next.js can produce these)
 *
 * Handles both string and string[] (catch-all route) param shapes.
 */
export function validateRouteParam(
  param: string | string[] | undefined
): string | null {
  const raw = Array.isArray(param) ? param[0] : param;
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "undefined" || trimmed === "null") return null;
  return trimmed;
}
