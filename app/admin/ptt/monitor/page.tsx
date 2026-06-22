'use client';
import { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Radio, Mic, MicOff, Users, Wifi, WifiOff, AlertTriangle, Headphones,
  Volume2, VolumeX, Zap, Signal, Eye, PhoneOff,
} from "lucide-react";
import { adminSidebarItems } from "@/config/adminSidebarItems";

interface LiveChannel {
  id: string;
  name: string;
  priority: "normal" | "high" | "emergency";
  status: "active" | "idle" | "emergency";
  connected: number;
  currentSpeaker: { name: string; photo: string; duration: string } | null;
  queuedSpeakers: number;
  weakConnections: number;
}

const liveChannels: LiveChannel[] = [
  { id: "1", name: "ER Team Alpha", priority: "emergency", status: "emergency", connected: 14, currentSpeaker: { name: "Dr. Amina Hassan", photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=60&h=60&fit=crop&crop=face", duration: "0:23" }, queuedSpeakers: 2, weakConnections: 1 },
  { id: "2", name: "ICU Team", priority: "high", status: "active", connected: 8, currentSpeaker: { name: "Maria Santos", photo: "https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=60&h=60&fit=crop&crop=face", duration: "0:05" }, queuedSpeakers: 0, weakConnections: 0 },
  { id: "3", name: "Ambulance Dispatch", priority: "high", status: "active", connected: 6, currentSpeaker: null, queuedSpeakers: 0, weakConnections: 2 },
  { id: "4", name: "Surgery Room 1", priority: "normal", status: "idle", connected: 4, currentSpeaker: null, queuedSpeakers: 0, weakConnections: 0 },
  { id: "5", name: "General Announcements", priority: "normal", status: "idle", connected: 42, currentSpeaker: null, queuedSpeakers: 0, weakConnections: 3 },
  { id: "6", name: "Pharmacy Coordination", priority: "normal", status: "active", connected: 5, currentSpeaker: { name: "Chen Wei", photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=60&h=60&fit=crop&crop=face", duration: "0:12" }, queuedSpeakers: 1, weakConnections: 0 },
];

const statusBorder: Record<string, string> = {
  active: "border-success/50",
  idle: "border-border",
  emergency: "border-destructive animate-pulse",
};

const PTTMonitor = () => {
  const sidebarMargin = useSidebarMargin();
  const [listeningTo, setListeningTo] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />
      <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Live Monitoring</h1>
                <p className="text-sm text-muted-foreground mt-1">Real-time PTT channel activity and status</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
                <span className="text-sm text-success font-medium">Live</span>
              </div>
            </div>
          </motion.div>

          {/* Emergency Banner */}
          {liveChannels.some(ch => ch.status === "emergency") && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3"
            >
              <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive">Emergency Active</p>
                <p className="text-xs text-destructive/80">{liveChannels.filter(ch => ch.status === "emergency").map(ch => ch.name).join(", ")} — emergency broadcast in progress</p>
              </div>
              <Button size="sm" variant="destructive">View Details</Button>
            </motion.div>
          )}

          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: "Channels", value: liveChannels.length, icon: Radio },
              { label: "Connected", value: liveChannels.reduce((s, c) => s + c.connected, 0), icon: Users },
              { label: "Speaking", value: liveChannels.filter(c => c.currentSpeaker).length, icon: Mic },
              { label: "Queued", value: liveChannels.reduce((s, c) => s + c.queuedSpeakers, 0), icon: Volume2 },
              { label: "Weak Signal", value: liveChannels.reduce((s, c) => s + c.weakConnections, 0), icon: WifiOff },
            ].map(stat => (
              <div key={stat.label} className="rounded-lg bg-card p-3 shadow-card flex items-center gap-3">
                <stat.icon className="h-4 w-4 text-secondary" />
                <div>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Channel Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {liveChannels.map((ch, i) => (
              <motion.div key={ch.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`rounded-xl bg-card p-5 shadow-card border-2 ${statusBorder[ch.status]} transition-all`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Radio className={`h-4 w-4 ${ch.status === "emergency" ? "text-destructive" : "text-secondary"}`} />
                    <h3 className="font-semibold text-foreground text-sm">{ch.name}</h3>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${
                    ch.status === "emergency" ? "bg-destructive/10 text-destructive border-destructive/30" :
                    ch.status === "active" ? "bg-success/10 text-success border-success/30" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {ch.status === "emergency" ? "EMERGENCY" : ch.status === "active" ? "Active" : "Idle"}
                  </Badge>
                </div>

                {/* Current Speaker */}
                {ch.currentSpeaker ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20 mb-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={ch.currentSpeaker.photo} />
                        <AvatarFallback>{ch.currentSpeaker.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-card animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{ch.currentSpeaker.name}</p>
                      <p className="text-[10px] text-success flex items-center gap-1"><Mic className="h-3 w-3" /> Speaking · {ch.currentSpeaker.duration}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4].map(bar => (
                          <motion.div key={bar} animate={{ height: [4, 12, 6, 14, 4] }} transition={{ repeat: Infinity, duration: 0.6, delay: bar * 0.1 }}
                            className="w-1 bg-success rounded-full" />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 mb-3">
                    <MicOff className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">No active speaker</p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-sm font-bold text-foreground">{ch.connected}</p>
                    <p className="text-[9px] text-muted-foreground">Connected</p>
                  </div>
                  <div className="rounded-md bg-muted/30 p-2">
                    <p className="text-sm font-bold text-foreground">{ch.queuedSpeakers}</p>
                    <p className="text-[9px] text-muted-foreground">Queued</p>
                  </div>
                  <div className={`rounded-md p-2 ${ch.weakConnections > 0 ? "bg-warning/10" : "bg-muted/30"}`}>
                    <p className={`text-sm font-bold ${ch.weakConnections > 0 ? "text-warning" : "text-foreground"}`}>{ch.weakConnections}</p>
                    <p className="text-[9px] text-muted-foreground">Weak</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant={listeningTo === ch.id ? "default" : "outline"} size="sm" className="flex-1 text-xs gap-1.5"
                    onClick={() => setListeningTo(listeningTo === ch.id ? null : ch.id)}
                  >
                    <Headphones className="h-3 w-3" /> {listeningTo === ch.id ? "Listening..." : "Listen"}
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <Volume2 className="h-3 w-3" /> Broadcast
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PTTMonitor;
