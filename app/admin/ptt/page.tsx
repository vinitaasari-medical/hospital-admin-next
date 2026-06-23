'use client';
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import StatCard from "@/components/StatCard";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Radio, Users, Mic, AlertTriangle, Activity, Signal, Headphones,
  Zap, Shield, Volume2, Wifi, WifiOff,
} from "lucide-react";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

const activeChannels = [
  { name: "ER Team Alpha", speakers: 1, connected: 14, priority: "emergency" as const, speaker: "Dr. Amina Hassan", speakerPhoto: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=60&h=60&fit=crop&crop=face" },
  { name: "ICU Team", speakers: 0, connected: 8, priority: "high" as const, speaker: null, speakerPhoto: null },
  { name: "Ambulance Dispatch", speakers: 2, connected: 6, priority: "high" as const, speaker: "James O'Brien", speakerPhoto: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=60&h=60&fit=crop&crop=face" },
  { name: "Surgery Room 1", speakers: 0, connected: 4, priority: "normal" as const, speaker: null, speakerPhoto: null },
];

const recentAlerts = [
  { type: "emergency", message: "Emergency broadcast triggered on ER Team Alpha", time: "2 min ago", user: "Dr. Amina Hassan" },
  { type: "disconnect", message: "3 users lost connection in ICU Team", time: "8 min ago", user: "System" },
  { type: "mute", message: "Admin force-muted James O'Brien in Ambulance Dispatch", time: "15 min ago", user: "Admin" },
  { type: "override", message: "Emergency override activated for Surgery Room 1", time: "1h ago", user: "Dr. Robert Kim" },
];

const priorityColors: Record<string, string> = {
  normal: "bg-muted text-muted-foreground",
  high: "bg-warning/10 text-warning",
  emergency: "bg-destructive/10 text-destructive",
};

const PTTOverview = () => {
  const sidebarMargin = useSidebarMargin();
  const router = useRouter();

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar items={adminSidebarItems} />
        <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">PTT Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Push-To-Talk system overview and real-time status</p>
            </motion.div>

            {/* Stat cards — hidden
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard title="Active Channels" value="4" change="2 emergency" changeType="neutral" icon={Radio} />
              <StatCard title="Connected Users" value="74" change="↑ 8% from yesterday" changeType="positive" icon={Users} />
              <StatCard title="Active Speakers" value="3" change="Real-time" changeType="neutral" icon={Mic} />
              <StatCard title="Emergency Alerts" value="1" change="Unacknowledged" changeType="negative" icon={AlertTriangle} />
            </div>
            */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 rounded-xl bg-card p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Active Channels</h3>
                  <Button variant="ghost" size="sm" onClick={() => router.push("/admin/ptt/channels")}>View All</Button>
                </div>
                <div className="space-y-3">
                  {activeChannels.map((ch, i) => (
                    <motion.div key={ch.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push("/admin/ptt/channels")}
                    >
                      <div className="relative">
                        <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                          <Radio className="h-5 w-5 text-secondary" />
                        </div>
                        {ch.speakers > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-success animate-pulse border-2 border-card" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{ch.name}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityColors[ch.priority]}`}>{ch.priority}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {ch.connected}</span>
                          <span className="flex items-center gap-1"><Mic className="h-3 w-3" /> {ch.speakers} speaking</span>
                        </div>
                      </div>
                      {ch.speaker && (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={ch.speakerPhoto!} />
                            <AvatarFallback className="text-[9px]">{ch.speaker.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <div className="text-xs">
                            <p className="text-foreground font-medium">{ch.speaker}</p>
                            <p className="text-success flex items-center gap-1"><Mic className="h-3 w-3" /> Live</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl bg-card p-5 shadow-card">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Alerts</h3>
                <div className="space-y-3">
                  {recentAlerts.map((alert, i) => (
                    <div key={i} className="flex gap-3 p-2">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        alert.type === "emergency" ? "bg-destructive/10" : alert.type === "disconnect" ? "bg-warning/10" : "bg-muted"
                      }`}>
                        {alert.type === "emergency" ? <Zap className="h-4 w-4 text-destructive" /> :
                         alert.type === "disconnect" ? <WifiOff className="h-4 w-4 text-warning" /> :
                         alert.type === "mute" ? <Volume2 className="h-4 w-4 text-muted-foreground" /> :
                         <Shield className="h-4 w-4 text-secondary" />}
                      </div>
                      <div>
                        <p className="text-xs text-foreground">{alert.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{alert.time} · {alert.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 rounded-xl bg-card p-5 shadow-card">
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Emergency Broadcast", icon: Zap, color: "text-destructive bg-destructive/10", path: "/admin/ptt/emergency" },
                  { label: "Live Monitor", icon: Activity, color: "text-secondary bg-secondary/10", path: "/admin/ptt/monitor" },
                  { label: "Add Channel", icon: Radio, color: "text-success bg-success/10", path: "/admin/ptt/channels" },
                  { label: "Manage Devices", icon: Signal, color: "text-warning bg-warning/10", path: "/admin/ptt/devices" },
                ].map(action => (
                  <button key={action.label} onClick={() => router.push(action.path)}
                    className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className={`h-10 w-10 rounded-lg ${action.color} flex items-center justify-center`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default PTTOverview;
