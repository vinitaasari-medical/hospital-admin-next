'use client';
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import {
  LayoutDashboard,
  Network,
  Users,
  Shield,
  Radio,
  Settings,
  Building2,
  Activity,
  Globe,
  ChevronDown,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  AppStatCard,
  StatusBadge,
} from "@/components/common";

const sidebarItems = [
  { label: "Cluster Overview", path: "/cluster", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Networks", path: "/cluster/networks", icon: <Network className="h-4 w-4" /> },
  { label: "Users & Admins", path: "/cluster/users", icon: <Users className="h-4 w-4" /> },
  { label: "Permissions", path: "/cluster/permissions", icon: <Shield className="h-4 w-4" /> },
  { label: "Broadcast", path: "/cluster/broadcast", icon: <Radio className="h-4 w-4" /> },
  { label: "Settings", path: "/cluster/settings", icon: <Settings className="h-4 w-4" /> },
];

interface NetworkItem {
  name: string;
  type: string;
  users: number;
  status: "active" | "maintenance" | "inactive";
  health: number;
}

const networks: NetworkItem[] = [
  { name: "City General Hospital", type: "Hospital", users: 2450, status: "active", health: 99 },
  { name: "Sunrise Medical Center", type: "Clinic", users: 890, status: "active", health: 97 },
  { name: "Valley Health System", type: "Hospital Network", users: 5200, status: "active", health: 100 },
  { name: "Coastal Clinic Group", type: "Clinic Network", users: 1340, status: "maintenance", health: 85 },
  { name: "Metro Urgent Care", type: "Urgent Care", users: 620, status: "active", health: 96 },
];

const statusTone = (s: NetworkItem["status"]) =>
  s === "active" ? "success" : s === "maintenance" ? "warning" : "error";

const ClusterDashboard = () => {
  const [activeNetwork, setActiveNetwork] = useState<string>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const sidebarMargin = useSidebarMargin();

  const columns: DataTableColumn<NetworkItem>[] = [
    {
      key: "name",
      header: "Network",
      sortable: true,
      searchable: true,
      cell: (n) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-secondary" />
          </div>
          <span className="text-sm font-medium text-foreground">{n.name}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      searchable: true,
      cell: (n) => <span className="text-sm text-muted-foreground">{n.type}</span>,
    },
    {
      key: "users",
      header: "Users",
      sortable: true,
      cell: (n) => <span className="text-sm font-medium text-foreground">{n.users.toLocaleString()}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      hideOnMobile: true,
      cell: (n) => (
        <StatusBadge tone={statusTone(n.status)}>
          {n.status.charAt(0).toUpperCase() + n.status.slice(1)}
        </StatusBadge>
      ),
    },
    {
      key: "health",
      header: "Health",
      sortable: true,
      hideOnMobile: true,
      cell: (n) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-secondary" style={{ width: `${n.health}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{n.health}%</span>
        </div>
      ),
    },
  ];

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={sidebarItems} title="MedicalCircles" />

      <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* Header — clean, no CTAs. */}
          <motion.header
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground/80">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                Cluster Admin
              </span>
              <span className="truncate">MedicalCircles  ›  Cluster</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Cluster Overview</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Network health, members, and operational signals across your cluster.
                </p>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">{todayLabel}</p>
            </div>
          </motion.header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AppStatCard label="Total Networks" value="5" icon={Network} trend={{ label: "↑ 1 new this quarter", tone: "positive" }} />
            <AppStatCard label="Total Users" value="10,500" icon={Users} trend={{ label: "↑ 8% growth", tone: "positive" }} />
            <AppStatCard label="Active Admins" value="32" icon={Shield} trend={{ label: "Across all networks" }} />
            <AppStatCard label="Avg Health" value="95.4%" icon={Activity} trend={{ label: "All systems stable", tone: "positive" }} />
          </div>

          {/* Network filter — moved out of the header, lives with the table it filters. */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-foreground">Networks</h2>
              <p className="text-xs text-muted-foreground">All networks in this cluster.</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <Globe className="h-3.5 w-3.5 text-secondary" />
                {activeNetwork === "all" ? "All Networks" : activeNetwork}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg bg-card shadow-card-hover border border-border z-10">
                  <button
                    onClick={() => { setActiveNetwork("all"); setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 rounded-t-lg transition-colors text-foreground"
                  >
                    All Networks
                  </button>
                  {networks.map((n) => (
                    <button
                      key={n.name}
                      onClick={() => { setActiveNetwork(n.name); setDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-foreground last:rounded-b-lg"
                    >
                      {n.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DataTable<NetworkItem>
            columns={columns}
            data={networks}
            rowKey={(n) => n.name}
            searchPlaceholder="Search networks..."
            rowInfo={() => ({
              createdBy: "Super Admin",
              createdAt: "2024-09-01T09:00:00Z",
            })}
            pagination={false}
            emptyState={{ title: "No networks", description: "Add a network to get started." }}
          />
        </div>
      </main>
    </div>
  );
};

export default ClusterDashboard;
