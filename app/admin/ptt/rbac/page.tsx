'use client';
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Shield, Crown, Users, Radio, Mic, Headphones, Check, X } from "lucide-react";
import { adminSidebarItems } from "@/config/adminSidebarItems";

interface Role {
  name: string;
  icon: React.ElementType;
  color: string;
  permissions: Record<string, boolean>;
}

const permissions = [
  "Create Channels",
  "Delete Channels",
  "Trigger Emergency",
  "Mute Others",
  "Delete Messages",
  "Access History",
  "Manage Members",
  "Force Disconnect",
  "View Audit Logs",
  "Configure Settings",
];

const roles: Role[] = [
  { name: "Super Admin", icon: Crown, color: "text-destructive bg-destructive/10",
    permissions: Object.fromEntries(permissions.map(p => [p, true])) },
  { name: "Hospital Admin", icon: Shield, color: "text-secondary bg-secondary/10",
    permissions: { "Create Channels": true, "Delete Channels": true, "Trigger Emergency": true, "Mute Others": true, "Delete Messages": true, "Access History": true, "Manage Members": true, "Force Disconnect": true, "View Audit Logs": true, "Configure Settings": false } },
  { name: "Channel Owner", icon: Radio, color: "text-warning bg-warning/10",
    permissions: { "Create Channels": false, "Delete Channels": false, "Trigger Emergency": true, "Mute Others": true, "Delete Messages": true, "Access History": true, "Manage Members": true, "Force Disconnect": false, "View Audit Logs": false, "Configure Settings": false } },
  { name: "Moderator", icon: Users, color: "text-info bg-info/10",
    permissions: { "Create Channels": false, "Delete Channels": false, "Trigger Emergency": false, "Mute Others": true, "Delete Messages": false, "Access History": true, "Manage Members": false, "Force Disconnect": false, "View Audit Logs": false, "Configure Settings": false } },
  { name: "Medical Staff", icon: Mic, color: "text-success bg-success/10",
    permissions: { "Create Channels": false, "Delete Channels": false, "Trigger Emergency": false, "Mute Others": false, "Delete Messages": false, "Access History": true, "Manage Members": false, "Force Disconnect": false, "View Audit Logs": false, "Configure Settings": false } },
  { name: "Listener Only", icon: Headphones, color: "text-muted-foreground bg-muted",
    permissions: { "Create Channels": false, "Delete Channels": false, "Trigger Emergency": false, "Mute Others": false, "Delete Messages": false, "Access History": false, "Manage Members": false, "Force Disconnect": false, "View Audit Logs": false, "Configure Settings": false } },
];

const PTTRBAC = () => {
  const sidebarMargin = useSidebarMargin();

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />
      <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Roles & Access Control</h1>
            <p className="text-sm text-muted-foreground mt-1">Define role-based permissions for the PTT system</p>
          </motion.div>

          {/* Role Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {roles.map((role, i) => (
              <motion.div key={role.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="rounded-xl bg-card p-4 shadow-card text-center"
              >
                <div className={`h-10 w-10 rounded-full ${role.color} flex items-center justify-center mx-auto mb-2`}>
                  <role.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">{role.name}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {Object.values(role.permissions).filter(Boolean).length}/{permissions.length} permissions
                </p>
              </motion.div>
            ))}
          </div>

          {/* Permission Matrix */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-xl bg-card shadow-card overflow-hidden"
          >
            <div className="p-5 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Permission Matrix</h3>
              <p className="text-xs text-muted-foreground mt-1">Toggle permissions for each role</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Permission</TableHead>
                    {roles.map(r => (
                      <TableHead key={r.name} className="text-center min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`h-6 w-6 rounded-full ${r.color} flex items-center justify-center`}>
                            <r.icon className="h-3 w-3" />
                          </div>
                          <span className="text-[10px]">{r.name}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map(perm => (
                    <TableRow key={perm}>
                      <TableCell className="font-medium text-sm">{perm}</TableCell>
                      {roles.map(role => (
                        <TableCell key={role.name} className="text-center">
                          {role.permissions[perm] ? (
                            <div className="h-6 w-6 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                              <Check className="h-3.5 w-3.5 text-success" />
                            </div>
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center mx-auto">
                              <X className="h-3.5 w-3.5 text-muted-foreground/50" />
                            </div>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default PTTRBAC;
