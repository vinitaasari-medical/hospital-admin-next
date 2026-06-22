import {
  Radio, Activity, AlertTriangle, MonitorSmartphone, KeyRound,
  ClipboardList, Settings, Mic,
} from "lucide-react";

export const pttSidebarItems = [
  { label: "PTT Overview", path: "/admin/ptt", icon: <Mic className="h-4 w-4" /> },
  { label: "PTT Channels", path: "/admin/ptt/channels", icon: <Radio className="h-4 w-4" /> },
  { label: "Live Monitor", path: "/admin/ptt/monitor", icon: <Activity className="h-4 w-4" /> },
  { label: "Emergency", path: "/admin/ptt/emergency", icon: <AlertTriangle className="h-4 w-4" /> },
  { label: "Devices", path: "/admin/ptt/devices", icon: <MonitorSmartphone className="h-4 w-4" /> },
  { label: "Roles & Access", path: "/admin/ptt/rbac", icon: <KeyRound className="h-4 w-4" /> },
  { label: "Audit Logs", path: "/admin/ptt/audit", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "PTT Settings", path: "/admin/ptt/settings", icon: <Settings className="h-4 w-4" /> },
];
