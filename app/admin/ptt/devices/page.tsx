'use client';
import { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import StatCard from "@/components/StatCard";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MonitorSmartphone, Smartphone, Tablet, Monitor, Search, MoreVertical,
  Wifi, WifiOff, Shield, Lock, LogOut, AlertTriangle, Signal,
  Fingerprint, Ban, RefreshCw,
} from "lucide-react";
import { adminSidebarItems } from "@/config/adminSidebarItems";

interface Device {
  id: string;
  user: string;
  userPhoto: string;
  userAvatar: string;
  deviceName: string;
  platform: "iOS" | "Android" | "Web";
  osVersion: string;
  appVersion: string;
  status: "online" | "offline" | "weak";
  lastSeen: string;
  ip: string;
  backgroundPTT: boolean;
  singleDeviceLock: boolean;
  simultaneousLogin: boolean;
}

const mockDevices: Device[] = [
  { id: "d1", user: "Dr. Amina Hassan", userPhoto: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=60&h=60&fit=crop&crop=face", userAvatar: "AH", deviceName: "iPhone 15 Pro", platform: "iOS", osVersion: "17.4", appVersion: "2.4.1", status: "online", lastSeen: "Now", ip: "192.168.1.42", backgroundPTT: true, singleDeviceLock: true, simultaneousLogin: false },
  { id: "d2", user: "James O'Brien", userPhoto: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=60&h=60&fit=crop&crop=face", userAvatar: "JO", deviceName: "Samsung Galaxy S24", platform: "Android", osVersion: "14", appVersion: "2.4.0", status: "online", lastSeen: "Now", ip: "192.168.1.55", backgroundPTT: true, singleDeviceLock: false, simultaneousLogin: true },
  { id: "d3", user: "Maria Santos", userPhoto: "https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=60&h=60&fit=crop&crop=face", userAvatar: "MS", deviceName: "Chrome Browser", platform: "Web", osVersion: "Win 11", appVersion: "2.4.1", status: "weak", lastSeen: "2 min ago", ip: "192.168.1.78", backgroundPTT: false, singleDeviceLock: false, simultaneousLogin: false },
  { id: "d4", user: "Chen Wei", userPhoto: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=60&h=60&fit=crop&crop=face", userAvatar: "CW", deviceName: "iPad Pro 12.9", platform: "iOS", osVersion: "17.3", appVersion: "2.3.8", status: "online", lastSeen: "Now", ip: "192.168.1.91", backgroundPTT: true, singleDeviceLock: true, simultaneousLogin: false },
  { id: "d5", user: "Dr. Robert Kim", userPhoto: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=60&h=60&fit=crop&crop=face", userAvatar: "RK", deviceName: "Pixel 8 Pro", platform: "Android", osVersion: "14", appVersion: "2.4.1", status: "offline", lastSeen: "1h ago", ip: "192.168.1.33", backgroundPTT: false, singleDeviceLock: false, simultaneousLogin: false },
  { id: "d6", user: "Sarah Johnson", userPhoto: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=60&h=60&fit=crop&crop=face", userAvatar: "SJ", deviceName: "iPhone 14", platform: "iOS", osVersion: "17.2", appVersion: "2.4.0", status: "online", lastSeen: "Now", ip: "192.168.1.67", backgroundPTT: true, singleDeviceLock: true, simultaneousLogin: false },
];

const platformIcon: Record<string, React.ElementType> = {
  iOS: Smartphone,
  Android: Smartphone,
  Web: Monitor,
};

const statusConfig: Record<string, { color: string; dot: string; label: string }> = {
  online: { color: "text-success", dot: "bg-success", label: "Online" },
  offline: { color: "text-muted-foreground", dot: "bg-muted-foreground/40", label: "Offline" },
  weak: { color: "text-warning", dot: "bg-warning", label: "Weak" },
};

const PTTDevices = () => {
  const sidebarMargin = useSidebarMargin();
  const [search, setSearch] = useState("");
  const [devices, setDevices] = useState(mockDevices);

  const filtered = devices.filter(d => d.user.toLowerCase().includes(search.toLowerCase()) || d.deviceName.toLowerCase().includes(search.toLowerCase()));

  const toggleBgPTT = (id: string) => setDevices(prev => prev.map(d => d.id === id ? { ...d, backgroundPTT: !d.backgroundPTT } : d));
  const toggleLock = (id: string) => setDevices(prev => prev.map(d => d.id === id ? { ...d, singleDeviceLock: !d.singleDeviceLock } : d));

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />
      <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Device & Connection Control</h1>
            <p className="text-sm text-muted-foreground mt-1">Monitor connected devices, manage sessions, and enforce device policies</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Connected Devices" value={String(devices.filter(d => d.status === "online").length)} change="Active now" changeType="positive" icon={MonitorSmartphone} />
            <StatCard title="Weak Connections" value={String(devices.filter(d => d.status === "weak").length)} change="Monitoring" changeType="negative" icon={WifiOff} />
            <StatCard title="Simultaneous Logins" value={String(devices.filter(d => d.simultaneousLogin).length)} change="Detected" changeType="negative" icon={AlertTriangle} />
            <StatCard title="Device-Locked Users" value={String(devices.filter(d => d.singleDeviceLock).length)} change="Enforced" changeType="neutral" icon={Lock} />
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users or devices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          {/* Table */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-xl bg-card shadow-card overflow-hidden"
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Background PTT</TableHead>
                  <TableHead>Device Lock</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(device => {
                  const PlatformIcon = platformIcon[device.platform];
                  const st = statusConfig[device.status];
                  return (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={device.userPhoto} />
                              <AvatarFallback className="text-[9px]">{device.userAvatar}</AvatarFallback>
                            </Avatar>
                            <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${st.dot}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{device.user}</p>
                            <p className="text-[10px] text-muted-foreground">{device.ip}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{device.deviceName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <PlatformIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{device.platform}</span>
                          <span className="text-[10px] text-muted-foreground">({device.osVersion})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                          <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                          {device.simultaneousLogin && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-warning border-warning/30 ml-1">Dual</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch checked={device.backgroundPTT} onCheckedChange={() => toggleBgPTT(device.id)} />
                      </TableCell>
                      <TableCell>
                        <Switch checked={device.singleDeviceLock} onCheckedChange={() => toggleLock(device.id)} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{device.lastSeen}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><RefreshCw className="h-4 w-4 mr-2" /> Refresh Status</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-warning"><LogOut className="h-4 w-4 mr-2" /> Force Disconnect</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive"><Ban className="h-4 w-4 mr-2" /> Revoke Session</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

export default PTTDevices;
