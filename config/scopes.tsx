/**
 * MedicalCircles tenancy / information architecture.
 *
 * 3 hierarchy levels:
 *   MedicalCircles (Super Admin)
 *     └── Cluster (e.g. Hafr Albatin)
 *           └── Hospital (e.g. King Fahad Hospital)
 *
 * The selected scope drives:
 *   - sidebar items
 *   - breadcrumbs
 *   - page titles
 *   - permissions (role)
 *   - visible data
 *
 * Routes reuse existing pages — no new pages are introduced.
 */
import {
  LayoutDashboard, Shield, Building2, Users, Radio, FolderOpen,
  Settings, Mic, Network as NetworkIcon, Briefcase,
} from "lucide-react";

export type ScopeLevel = "super_admin" | "cluster" | "hospital";

export interface SidebarNavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  children?: SidebarNavItem[];
  section?: never;
  /**
   * Mirrors the React app's hasAccess() page name (e.g. "User Management").
   * When set, the item is only included when that page appears in localStorage
   * "activePages". Items without permissionKey are always included.
   */
  permissionKey?: string;
  /** When true, the item is hidden from the sidebar without being removed. */
  hidden?: boolean;
}
export interface SidebarSection {
  section: string;
  label?: never;
  path?: never;
  icon?: never;
}
export type SidebarItem = SidebarNavItem | SidebarSection;

export interface Scope {
  id: string;
  level: ScopeLevel;
  name: string;
  shortName: string;
  role: string;
  /** parent scope id, for breadcrumbs */
  parentId?: string;
  /** scope landing/overview route */
  overviewPath: string;
  /** sidebar items visible when this scope is active */
  items: SidebarItem[];
  /** actual subnetwork/network ID stored in localStorage as "network_id" */
  networkId?: string;
  /** profile image URL for this scope's organisation */
  profileUrl?: string;
}

const icon = (C: React.ComponentType<{ className?: string }>) => (
  <C className="h-4 w-4" />
);

/* -------------------------------------------------------------------------- */
/*  Permission-filtered item builders                                          */
/*  activePages mirrors localStorage "activePages" set by useAuth.setUser().  */
/* -------------------------------------------------------------------------- */

function filterByPermission(items: SidebarItem[], activePages: string[]): SidebarItem[] {
  return items.filter((item) => {
    if ("hidden" in item && item.hidden) return false;
    if (!("permissionKey" in item) || !item.permissionKey) return true;
    return activePages.includes(item.permissionKey);
  });
}

/**
 * Sidebar items for the cluster (multi-network) admin level.
 * Mirrors the React app's src/menu/index.js items shown when no subnetwork
 * is selected and is_cluster_admin = true.
 */
export function buildClusterItems(activePages: string[]): SidebarItem[] {
  const all: SidebarItem[] = [
    { label: "Overview",    path: "/admin",                  icon: icon(LayoutDashboard) },
    { label: "Networks",    path: "/admin/clients",          icon: icon(NetworkIcon) },
    { label: "Users",       path: "/admin/users",            icon: icon(Users),    permissionKey: "Users" },
    { label: "Admins",      path: "/admin/admins",           icon: icon(Shield) },
    { label: "Role & Speciality Configuration", path: "/cluster/role-speciality", icon: icon(Briefcase) },
    { label: "Broadcast",   path: "/admin/broadcast",        icon: icon(Radio) },
    { section: "System" } as SidebarSection,
    { label: "Settings",    path: "/admin/settings",         icon: icon(Settings), permissionKey: "Setting" },
  ];
  return filterByPermission(all, activePages);
}

/**
 * Sidebar items for the hospital/subnetwork admin level.
 * Mirrors the React app's src/menu/index.js items shown when a subnetwork
 * IS selected (sub = true, network_id set).
 * "Users" is replaced by "Network Users" and "Departments" is permission-gated.
 */
export function buildHospitalItems(activePages: string[]): SidebarItem[] {
  const all: SidebarItem[] = [
    { label: "Overview",       path: "/admin",                  icon: icon(LayoutDashboard) },
    { label: "Network",        path: "/admin/clients",          icon: icon(NetworkIcon) },
    { label: "Departments",    path: "/admin/departments",      icon: icon(FolderOpen),   permissionKey: "Department" },
    { label: "Network Users",  path: "/admin/network-users",   icon: icon(Users),         permissionKey: "Users" },
    { label: "Admins",         path: "/admin/admins",           icon: icon(Shield) },
    { label: "Push-To-Talk",   path: "/admin/ptt",              icon: icon(Mic),  hidden: true },
    { label: "Broadcast",      path: "/admin/broadcast",        icon: icon(Radio) },
    { section: "System" } as SidebarSection,
    { label: "Settings",       path: "/admin/settings",         icon: icon(Settings),     permissionKey: "Setting" },
  ];
  return filterByPermission(all, activePages);
}

/* -------------------------------------------------------------------------- */
/*  Static fallback scopes (used as placeholders and for backward compat)     */
/* -------------------------------------------------------------------------- */

// ---------- Level 1: Super Admin ----------
const superAdminItems: SidebarItem[] = [
  { label: "Overview",  path: "/admin",            icon: icon(LayoutDashboard) },
  { label: "Clients",   path: "/admin/clients",    icon: icon(Building2) },
  { label: "Admins",    path: "/admin/admins",     icon: icon(Shield) },
  { label: "Broadcast", path: "/admin/broadcast",  icon: icon(Radio) },
  { section: "System" },
  { label: "Settings",  path: "/admin/settings",   icon: icon(Settings) },
];

// ---------- Level 2: Cluster ----------
const clusterItems: SidebarItem[] = [
  { label: "Overview",  path: "/cluster",          icon: icon(LayoutDashboard) },
  { label: "Networks",  path: "/admin/clients",    icon: icon(NetworkIcon) },
  { label: "Users",     path: "/admin/users",      icon: icon(Users) },
  { label: "Admins",    path: "/admin/admins",     icon: icon(Shield) },
  { label: "Role & Speciality Configuration", path: "/cluster/role-speciality", icon: icon(Briefcase) },
  { label: "Broadcast", path: "/admin/broadcast",  icon: icon(Radio) },
  { section: "System" },
  { label: "Settings",  path: "/admin/settings",   icon: icon(Settings) },
];

// ---------- Level 3: Hospital ----------
const hospitalItems: SidebarItem[] = [
  { label: "Overview",       path: "/admin",                 icon: icon(LayoutDashboard) },
  { label: "Network",        path: "/admin/clients",         icon: icon(NetworkIcon) },
  { label: "Departments",    path: "/admin/departments",     icon: icon(FolderOpen) },
  { label: "Network Users",  path: "/admin/network-users",  icon: icon(Users) },
  { label: "Admins",         path: "/admin/admins",          icon: icon(Shield) },
  { label: "Push-To-Talk",   path: "/admin/ptt",             icon: icon(Mic),  hidden: true },
  { label: "Broadcast",      path: "/admin/broadcast",       icon: icon(Radio) },
  { section: "System" },
  { label: "Settings",       path: "/admin/settings",        icon: icon(Settings) },
];

export const SCOPES: Scope[] = [
  {
    id: "super_admin",
    level: "super_admin",
    name: "MedicalCircles",
    shortName: "MC",
    role: "Super Admin",
    overviewPath: "/admin",
    items: superAdminItems,
  },
  {
    id: "cluster:hafr_albatin",
    level: "cluster",
    name: "Hafr Albatin",
    shortName: "HA",
    role: "Cluster Admin",
    parentId: "super_admin",
    overviewPath: "/cluster",
    items: clusterItems,
  },
  {
    id: "hospital:king_fahad",
    level: "hospital",
    name: "King Fahad Hospital",
    shortName: "KF",
    role: "Hospital Admin",
    parentId: "cluster:hafr_albatin",
    overviewPath: "/admin",
    items: hospitalItems,
  },
];

export const DEFAULT_SCOPE_ID = "super_admin";

export const getScope = (id: string): Scope =>
  SCOPES.find((s) => s.id === id) ?? SCOPES[0];

export const getScopeChain = (id: string): Scope[] => {
  const chain: Scope[] = [];
  let cur: Scope | undefined = getScope(id);
  while (cur) {
    chain.unshift(cur);
    cur = cur.parentId ? SCOPES.find((s) => s.id === cur!.parentId) : undefined;
  }
  return chain;
};
