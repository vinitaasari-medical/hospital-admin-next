'use client';
import { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ClipboardList, Download, Search, Filter, Radio, Users, Zap, MicOff,
  Trash2, LogOut, Shield, Plus, Lock, Settings,
} from "lucide-react";
import { adminSidebarItems } from "@/config/adminSidebarItems";

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  category: "channel" | "member" | "emergency" | "device" | "settings";
  user: string;
  userPhoto: string;
  target: string;
  details: string;
  severity: "info" | "warning" | "critical";
}

const auditLogs: AuditEntry[] = [
  { id: "a1", timestamp: "2026-02-18 14:23:45", action: "Emergency Triggered", category: "emergency", user: "Dr. Amina Hassan", userPhoto: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=60&h=60&fit=crop&crop=face", target: "All Channels", details: "Code Blue - Building A, Floor 3", severity: "critical" },
  { id: "a2", timestamp: "2026-02-18 14:15:22", action: "Member Removed", category: "member", user: "Admin", userPhoto: "", target: "David Park", details: "Removed from ER Team Alpha", severity: "warning" },
  { id: "a3", timestamp: "2026-02-18 13:58:10", action: "Channel Created", category: "channel", user: "James O'Brien", userPhoto: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=60&h=60&fit=crop&crop=face", target: "Night Shift Coordination", details: "Moderated channel, normal priority", severity: "info" },
  { id: "a4", timestamp: "2026-02-18 13:45:00", action: "Force Muted", category: "member", user: "Admin", userPhoto: "", target: "Chen Wei", details: "Muted in Ambulance Dispatch", severity: "warning" },
  { id: "a5", timestamp: "2026-02-18 13:30:15", action: "Force Disconnect", category: "device", user: "Admin", userPhoto: "", target: "Dr. Robert Kim", details: "Session revoked, device: Pixel 8 Pro", severity: "warning" },
  { id: "a6", timestamp: "2026-02-18 12:00:00", action: "Channel Deleted", category: "channel", user: "Admin", userPhoto: "", target: "Old Radiology Channel", details: "Permanently deleted with history", severity: "critical" },
  { id: "a7", timestamp: "2026-02-18 11:10:30", action: "Emergency Escalated", category: "emergency", user: "System", userPhoto: "", target: "ICU Team", details: "Auto-escalated after 60s no ACK", severity: "critical" },
  { id: "a8", timestamp: "2026-02-18 10:45:00", action: "Settings Changed", category: "settings", user: "Admin", userPhoto: "", target: "Global PTT Settings", details: "Background PTT disabled for Listener role", severity: "info" },
  { id: "a9", timestamp: "2026-02-17 22:15:00", action: "Channel Archived", category: "channel", user: "Sarah Johnson", userPhoto: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=60&h=60&fit=crop&crop=face", target: "Weekend Coverage", details: "Archived with 7-day retention", severity: "info" },
  { id: "a10", timestamp: "2026-02-17 20:00:00", action: "Member Promoted", category: "member", user: "Admin", userPhoto: "", target: "Maria Santos", details: "Promoted to Moderator in ICU Team", severity: "info" },
];

const categoryIcon: Record<string, React.ElementType> = {
  channel: Radio,
  member: Users,
  emergency: Zap,
  device: LogOut,
  settings: Settings,
};

const categoryColor: Record<string, string> = {
  channel: "text-secondary bg-secondary/10",
  member: "text-info bg-info/10",
  emergency: "text-destructive bg-destructive/10",
  device: "text-warning bg-warning/10",
  settings: "text-muted-foreground bg-muted",
};

const severityBadge: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  warning: "bg-warning/10 text-warning border-warning/30",
  critical: "bg-destructive/10 text-destructive border-destructive/30",
};

const PTTAudit = () => {
  const sidebarMargin = useSidebarMargin();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");

  const filtered = auditLogs.filter(log => {
    const matchSearch = log.action.toLowerCase().includes(search.toLowerCase()) || log.target.toLowerCase().includes(search.toLowerCase()) || log.user.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || log.category === filterCategory;
    const matchSev = filterSeverity === "all" || log.severity === filterSeverity;
    return matchSearch && matchCat && matchSev;
  });

  const handleExportCSV = () => {
    const headers = ["Timestamp", "Action", "Category", "User", "Target", "Details", "Severity"];
    const rows = filtered.map(l => [l.timestamp, l.action, l.category, l.user, l.target, l.details, l.severity]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ptt-audit-log.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />
      <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
            <p className="text-sm text-muted-foreground mt-1">Complete audit trail for compliance and security review</p>
          </motion.div>

          {/* HIPAA Compliance Banner */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="mb-6 p-4 rounded-xl bg-success/5 border border-success/20 flex items-center gap-3"
          >
            <Shield className="h-5 w-5 text-success" />
            <div>
              <p className="text-sm font-medium text-foreground">HIPAA Compliance Ready</p>
              <p className="text-xs text-muted-foreground">All actions are logged with timestamps, user identity, and IP address. Logs are encrypted at rest.</p>
            </div>
          </motion.div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="channel">Channel</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="device">Device</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          {/* Table */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-xl bg-card shadow-card overflow-hidden"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(log => {
                  const CatIcon = categoryIcon[log.category];
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{log.timestamp}</TableCell>
                      <TableCell className="text-sm font-medium text-foreground">{log.action}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className={`h-5 w-5 rounded flex items-center justify-center ${categoryColor[log.category]}`}>
                            <CatIcon className="h-3 w-3" />
                          </div>
                          <span className="text-xs capitalize">{log.category}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {log.userPhoto ? (
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={log.userPhoto} />
                              <AvatarFallback className="text-[8px]">{log.user[0]}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                              <Shield className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          <span className="text-xs">{log.user}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground">{log.target}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{log.details}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${severityBadge[log.severity]}`}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default PTTAudit;
