'use client';
import { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle, Zap, Radio, Check, Clock, X, Shield, Mic, Bell,
  ChevronRight, FileText, Download, Volume2,
} from "lucide-react";
import { adminSidebarItems } from "@/config/adminSidebarItems";

interface EmergencyLog {
  id: string;
  type: "hospital-wide" | "channel-specific";
  channel: string;
  triggeredBy: string;
  triggeredByPhoto: string;
  timestamp: string;
  message: string;
  ackRequired: number;
  ackReceived: number;
  escalated: boolean;
  status: "active" | "resolved" | "escalated";
}

const emergencyLogs: EmergencyLog[] = [
  { id: "e1", type: "hospital-wide", channel: "All Channels", triggeredBy: "Dr. Amina Hassan", triggeredByPhoto: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=60&h=60&fit=crop&crop=face", timestamp: "2026-02-18 14:23", message: "Code Blue - Building A, Floor 3", ackRequired: 24, ackReceived: 18, escalated: false, status: "active" },
  { id: "e2", type: "channel-specific", channel: "ER Team Alpha", triggeredBy: "James O'Brien", triggeredByPhoto: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=60&h=60&fit=crop&crop=face", timestamp: "2026-02-18 13:45", message: "Mass casualty incoming - 5 patients ETA 10min", ackRequired: 14, ackReceived: 14, escalated: false, status: "resolved" },
  { id: "e3", type: "channel-specific", channel: "ICU Team", triggeredBy: "Dr. Robert Kim", triggeredByPhoto: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=60&h=60&fit=crop&crop=face", timestamp: "2026-02-18 11:10", message: "Critical equipment failure - Ventilator Bay 2", ackRequired: 8, ackReceived: 5, escalated: true, status: "escalated" },
  { id: "e4", type: "hospital-wide", channel: "All Channels", triggeredBy: "Admin", triggeredByPhoto: "", timestamp: "2026-02-17 22:00", message: "Fire drill - Southeast wing", ackRequired: 74, ackReceived: 74, escalated: false, status: "resolved" },
];

const ackDetails = [
  { name: "Dr. Amina Hassan", photo: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=60&h=60&fit=crop&crop=face", acked: true, time: "14:24" },
  { name: "James O'Brien", photo: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=60&h=60&fit=crop&crop=face", acked: true, time: "14:24" },
  { name: "Maria Santos", photo: "https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=60&h=60&fit=crop&crop=face", acked: true, time: "14:25" },
  { name: "Chen Wei", photo: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=60&h=60&fit=crop&crop=face", acked: false, time: null },
  { name: "Dr. Robert Kim", photo: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=60&h=60&fit=crop&crop=face", acked: true, time: "14:26" },
  { name: "Sarah Johnson", photo: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=60&h=60&fit=crop&crop=face", acked: false, time: null },
];

const PTTEmergency = () => {
  const sidebarMargin = useSidebarMargin();
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<EmergencyLog | null>(null);
  const [emergencyType, setEmergencyType] = useState<"hospital-wide" | "channel-specific">("hospital-wide");
  const [emergencyChannel, setEmergencyChannel] = useState("all");
  const [emergencyMessage, setEmergencyMessage] = useState("");

  const statusConfig: Record<string, { color: string; label: string }> = {
    active: { color: "bg-destructive/10 text-destructive border-destructive/30", label: "ACTIVE" },
    resolved: { color: "bg-success/10 text-success border-success/30", label: "Resolved" },
    escalated: { color: "bg-warning/10 text-warning border-warning/30", label: "Escalated" },
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />
      <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Emergency Controls</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage emergency broadcasts, acknowledgments, and audit trails</p>
          </motion.div>

          {/* Emergency Trigger Button */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
            className="mb-8 p-6 rounded-xl bg-destructive/5 border-2 border-destructive/20 flex flex-col sm:flex-row items-center gap-4"
          >
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Zap className="h-8 w-8 text-destructive" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-lg font-bold text-foreground">Emergency Broadcast</h2>
              <p className="text-sm text-muted-foreground">Trigger an emergency broadcast to all or specific channels. Overrides mute & DND.</p>
            </div>
            <Button variant="destructive" size="lg" className="gap-2 text-base px-8" onClick={() => setTriggerOpen(true)}>
              <AlertTriangle className="h-5 w-5" /> Trigger Emergency
            </Button>
          </motion.div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Active Emergencies", value: emergencyLogs.filter(e => e.status === "active").length, color: "text-destructive" },
              { label: "Pending ACKs", value: emergencyLogs.filter(e => e.status === "active").reduce((s, e) => s + (e.ackRequired - e.ackReceived), 0), color: "text-warning" },
              { label: "Resolved Today", value: emergencyLogs.filter(e => e.status === "resolved").length, color: "text-success" },
              { label: "Escalated", value: emergencyLogs.filter(e => e.escalated).length, color: "text-warning" },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl bg-card p-4 shadow-card">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Emergency Logs */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-xl bg-card p-5 shadow-card"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Emergency Log</h3>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
            <div className="space-y-3">
              {emergencyLogs.map((log, i) => (
                <motion.div key={log.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    log.status === "active" ? "bg-destructive/10" : log.status === "escalated" ? "bg-warning/10" : "bg-success/10"
                  }`}>
                    {log.status === "active" ? <Zap className="h-5 w-5 text-destructive animate-pulse" /> :
                     log.status === "escalated" ? <AlertTriangle className="h-5 w-5 text-warning" /> :
                     <Check className="h-5 w-5 text-success" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{log.message}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusConfig[log.status].color}`}>{statusConfig[log.status].label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Radio className="h-3 w-3" /> {log.channel}</span>
                      <span>{log.timestamp}</span>
                      <span>by {log.triggeredBy}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Progress value={(log.ackReceived / log.ackRequired) * 100} className="w-20 h-1.5" />
                      <span className="text-xs text-muted-foreground">{log.ackReceived}/{log.ackRequired}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Acknowledged</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Trigger Dialog */}
        <Dialog open={triggerOpen} onOpenChange={setTriggerOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Trigger Emergency Broadcast
              </DialogTitle>
              <DialogDescription>This will override mute, DND, and force playback on all targeted devices.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Broadcast Type</label>
                <Select value={emergencyType} onValueChange={v => setEmergencyType(v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hospital-wide">Hospital-Wide</SelectItem>
                    <SelectItem value="channel-specific">Channel-Specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {emergencyType === "channel-specific" && (
                <div>
                  <label className="text-sm font-medium">Target Channel</label>
                  <Select value={emergencyChannel} onValueChange={setEmergencyChannel}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="er">ER Team Alpha</SelectItem>
                      <SelectItem value="icu">ICU Team</SelectItem>
                      <SelectItem value="ambulance">Ambulance Dispatch</SelectItem>
                      <SelectItem value="surgery">Surgery Room 1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Emergency Message</label>
                <Input value={emergencyMessage} onChange={e => setEmergencyMessage(e.target.value)} placeholder="e.g., Code Blue - Building A, Floor 3" className="mt-1" />
              </div>
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive space-y-1">
                <p className="font-medium">This action will:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Override all mute & DND settings</li>
                  <li>Force audio playback on all devices</li>
                  <li>Require acknowledgment from all recipients</li>
                  <li>Auto-escalate if not acknowledged in 60 seconds</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTriggerOpen(false)}>Cancel</Button>
              <Button variant="destructive" className="gap-2" onClick={() => setTriggerOpen(false)}>
                <Zap className="h-4 w-4" /> Trigger Emergency
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ACK Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Emergency Detail</DialogTitle>
              <DialogDescription>{selectedLog?.message}</DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">Triggered By</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedLog.triggeredByPhoto} />
                        <AvatarFallback className="text-[8px]">{selectedLog.triggeredBy[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">{selectedLog.triggeredBy}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">Timestamp</p>
                    <p className="text-sm font-medium text-foreground mt-1">{selectedLog.timestamp}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">Acknowledgment Status</p>
                    <span className="text-xs text-muted-foreground">{selectedLog.ackReceived}/{selectedLog.ackRequired}</span>
                  </div>
                  <Progress value={(selectedLog.ackReceived / selectedLog.ackRequired) * 100} className="h-2 mb-3" />
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {ackDetails.map(person => (
                      <div key={person.name} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={person.photo} />
                          <AvatarFallback className="text-[9px]">{person.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm text-foreground">{person.name}</span>
                        {person.acked ? (
                          <div className="flex items-center gap-1.5 text-success">
                            <Check className="h-3.5 w-3.5" />
                            <span className="text-xs">{person.time}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-warning">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-xs">Pending</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default PTTEmergency;
