import {
  LayoutDashboard, Shield, Building2, Users, Radio, FolderOpen,
  Settings,
} from "lucide-react";

export type SidebarItem = {
  label: string;
  path: string;
  icon: React.ReactNode;
  section?: never;
} | {
  section: string;
  label?: never;
  path?: never;
  icon?: never;
};

export const adminSidebarItems: SidebarItem[] = [
  { label: "Overview", path: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Admin Management", path: "/admin/admins", icon: <Shield className="h-4 w-4" /> },
  { label: "Networks", path: "/admin/clients", icon: <Building2 className="h-4 w-4" /> },
  { label: "Users", path: "/admin/users", icon: <Users className="h-4 w-4" /> },
  { label: "Broadcast", path: "/admin/broadcast", icon: <Radio className="h-4 w-4" /> },
  { label: "Departments", path: "/admin/departments", icon: <FolderOpen className="h-4 w-4" /> },
{ section: "System" },
  { label: "Settings", path: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
];
