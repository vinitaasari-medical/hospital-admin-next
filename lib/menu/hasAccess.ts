// Mirrors hasAccess() from hospital-admin/src/menu/index.js.
// Reads the "activePages" string[] stored in localStorage by useAuth.setUser().

export function hasAccess(page: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem("activePages");
    if (!raw) return false;
    const pages = JSON.parse(raw) as unknown;
    return Array.isArray(pages) && (pages as string[]).includes(page);
  } catch {
    return false;
  }
}

export function getActivePages(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("activePages");
    if (!raw) return [];
    const pages = JSON.parse(raw) as unknown;
    return Array.isArray(pages) ? (pages as string[]) : [];
  } catch {
    return [];
  }
}
