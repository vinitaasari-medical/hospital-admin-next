'use client';
import { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import StatCard from "@/components/StatCard";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Radio, Shield, Users, Mic, MicOff, Search, Plus, MoreVertical, Lock, Unlock,
  Archive, Trash2, Eye, Settings, Crown, AlertTriangle, Signal, Hash,
  Globe, EyeOff, Zap, Volume2, UserPlus, Headphones, FileText,
  MonitorSmartphone, KeyRound, ClipboardList, Wifi, CheckCircle2,
} from "lucide-react";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import { useConfirm } from "@/hooks/use-confirm";

// Types
type PTTRole = "super-admin" | "hospital-admin" | "channel-owner" | "moderator" | "medical-staff" | "listener";

interface ChannelMember {
  id: string;
  name: string;
  avatar: string;
  photoUrl: string;
  role: PTTRole;
  status: "online" | "offline" | "busy" | "in-call";
  device: "iOS" | "Android" | "Web";
  lastActivity: string;
  isMuted: boolean;
  isSpeaking: boolean;
  canSpeak: boolean;
  blocked: boolean;
}

interface Channel {
  id: string;
  name: string;
  type: "public" | "private" | "emergency" | "moderated";
  priority: "normal" | "high" | "emergency";
  enabled: boolean;
  locked: boolean;
  historyEnabled: boolean;
  retentionDays: number;
  emergencyOverride: boolean;
  owner: string;
  moderators: string[];
  members: ChannelMember[];
  activeSpeakers: number;
  connectedCount: number;
  createdAt: string;
  description: string;
  maxMembers: number;
  autoDeleteInactive: boolean;
  encryptionEnabled: boolean;
  transcriptionEnabled: boolean;
  pttMode: "hold" | "toggle";
}

const roleConfig: Record<PTTRole, { label: string; icon: React.ElementType; color: string; description: string }> = {
  "super-admin": { label: "Super Admin", icon: Crown, color: "text-destructive bg-destructive/10", description: "Full control over all channels" },
  "hospital-admin": { label: "Hospital Admin", icon: Shield, color: "text-secondary bg-secondary/10", description: "Manage channels and members" },
  "channel-owner": { label: "Channel Owner", icon: Radio, color: "text-warning bg-warning/10", description: "Owns and configures this channel" },
  "moderator": { label: "Moderator", icon: Users, color: "text-info bg-info/10", description: "Can mute and manage speakers" },
  "medical-staff": { label: "Medical Staff", icon: Mic, color: "text-success bg-success/10", description: "Can speak and listen" },
  "listener": { label: "Listener Only", icon: Headphones, color: "text-muted-foreground bg-muted", description: "Listen-only access" },
};

const mockMembers: ChannelMember[] = [
  { id: "m1", name: "Dr. Amina Hassan", avatar: "AH", photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&h=80&fit=crop&crop=face", role: "channel-owner", status: "online", device: "iOS", lastActivity: "2 min ago", isMuted: false, isSpeaking: true, canSpeak: true, blocked: false },
  { id: "m2", name: "James O'Brien", avatar: "JO", photoUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&crop=face", role: "moderator", status: "online", device: "Android", lastActivity: "Just now", isMuted: false, isSpeaking: false, canSpeak: true, blocked: false },
  { id: "m3", name: "Maria Santos", avatar: "MS", photoUrl: "https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=80&h=80&fit=crop&crop=face", role: "medical-staff", status: "busy", device: "Web", lastActivity: "5 min ago", isMuted: false, isSpeaking: false, canSpeak: true, blocked: false },
  { id: "m4", name: "Chen Wei", avatar: "CW", photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=80&h=80&fit=crop&crop=face", role: "medical-staff", status: "online", device: "iOS", lastActivity: "1 min ago", isMuted: true, isSpeaking: false, canSpeak: true, blocked: false },
  { id: "m5", name: "Dr. Robert Kim", avatar: "RK", photoUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=80&h=80&fit=crop&crop=face", role: "listener", status: "offline", device: "Android", lastActivity: "1h ago", isMuted: false, isSpeaking: false, canSpeak: false, blocked: false },
  { id: "m6", name: "Sarah Johnson", avatar: "SJ", photoUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=80&h=80&fit=crop&crop=face", role: "medical-staff", status: "in-call", device: "iOS", lastActivity: "3 min ago", isMuted: false, isSpeaking: false, canSpeak: true, blocked: false },
];

const availableUsers = [
  { id: "u1", name: "Dr. Lisa Park", avatar: "LP", photoUrl: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=80&h=80&fit=crop&crop=face", department: "Cardiology" },
  { id: "u2", name: "Nurse David Chen", avatar: "DC", photoUrl: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=80&h=80&fit=crop&crop=face", department: "ER" },
  { id: "u3", name: "Dr. Emma Wilson", avatar: "EW", photoUrl: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=80&h=80&fit=crop&crop=face", department: "Pediatrics" },
  { id: "u4", name: "Nurse Ahmed Ali", avatar: "AA", photoUrl: "https://images.unsplash.com/photo-1618498082410-b4aa22193b38?w=80&h=80&fit=crop&crop=face", department: "ICU" },
  { id: "u5", name: "Dr. Yuki Tanaka", avatar: "YT", photoUrl: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=80&h=80&fit=crop&crop=face", department: "Surgery" },
  { id: "u6", name: "Nurse Grace Obi", avatar: "GO", photoUrl: "https://images.unsplash.com/photo-1643297654416-05795d62e39c?w=80&h=80&fit=crop&crop=face", department: "Radiology" },
];

const defaultChannel: Channel = {
  id: "", name: "", type: "public", priority: "normal", enabled: true, locked: false,
  historyEnabled: true, retentionDays: 30, emergencyOverride: false, owner: "Admin User",
  moderators: [], members: [], activeSpeakers: 0, connectedCount: 0, createdAt: "",
  description: "", maxMembers: 100, autoDeleteInactive: false, encryptionEnabled: true,
  transcriptionEnabled: false, pttMode: "hold",
};

const mockChannels: Channel[] = [
  { ...defaultChannel, id: "ch1", name: "ER Team Alpha", type: "emergency", priority: "emergency", locked: false, retentionDays: 30, emergencyOverride: true, owner: "Dr. Amina Hassan", moderators: ["James O'Brien"], members: mockMembers, activeSpeakers: 1, connectedCount: 14, createdAt: "2025-12-01", description: "Primary ER communication channel", maxMembers: 50, encryptionEnabled: true },
  { ...defaultChannel, id: "ch2", name: "ICU Team", type: "private", priority: "high", locked: true, retentionDays: 90, emergencyOverride: true, owner: "Dr. Robert Kim", moderators: ["Maria Santos"], members: mockMembers.slice(0, 4), activeSpeakers: 0, connectedCount: 8, createdAt: "2025-11-15", description: "ICU staff coordination", maxMembers: 30, encryptionEnabled: true },
  { ...defaultChannel, id: "ch3", name: "Ambulance Dispatch", type: "moderated", priority: "high", retentionDays: 7, emergencyOverride: true, owner: "James O'Brien", members: mockMembers.slice(0, 3), activeSpeakers: 2, connectedCount: 6, createdAt: "2025-10-20", description: "Dispatch coordination", maxMembers: 20 },
  { ...defaultChannel, id: "ch4", name: "Surgery Room 1", type: "private", priority: "normal", locked: true, historyEnabled: false, retentionDays: 0, owner: "Chen Wei", moderators: ["Sarah Johnson"], members: mockMembers.slice(2, 6), connectedCount: 4, createdAt: "2026-01-05", description: "Surgery Room 1 comms" },
  { ...defaultChannel, id: "ch5", name: "General Announcements", type: "public", priority: "normal", retentionDays: 30, owner: "Dr. Amina Hassan", members: mockMembers, connectedCount: 42, createdAt: "2025-09-01", description: "Hospital-wide announcements", maxMembers: 500 },
  { ...defaultChannel, id: "ch6", name: "Night Shift Coordination", type: "moderated", priority: "normal", enabled: false, retentionDays: 7, owner: "Sarah Johnson", moderators: ["Chen Wei"], members: mockMembers.slice(0, 2), createdAt: "2026-01-20", description: "Night shift team" },
];

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  public: { icon: Globe, color: "text-success", bg: "bg-success/10" },
  private: { icon: Lock, color: "text-secondary", bg: "bg-secondary/10" },
  emergency: { icon: Zap, color: "text-destructive", bg: "bg-destructive/10" },
  moderated: { icon: Volume2, color: "text-warning", bg: "bg-warning/10" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  normal: { label: "Normal", color: "bg-muted text-muted-foreground" },
  high: { label: "High", color: "bg-warning/10 text-warning border-warning/20" },
  emergency: { label: "Emergency", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const statusColors: Record<string, string> = {
  online: "bg-success",
  offline: "bg-muted-foreground/40",
  busy: "bg-warning",
  "in-call": "bg-secondary",
};

const PTTChannels = () => {
  const sidebarMargin = useSidebarMargin();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [channels, setChannels] = useState(mockChannels);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  // Add member state
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [assignedRole, setAssignedRole] = useState<PTTRole>("medical-staff");

  // Channel settings edit state
  const [editChannel, setEditChannel] = useState<Channel>(defaultChannel);

  // Create channel form state
  const [newChannel, setNewChannel] = useState({
    name: "", type: "public" as Channel["type"], priority: "normal" as Channel["priority"],
    historyEnabled: true, retentionDays: 30, emergencyOverride: false, locked: false,
  });

  const filtered = channels.filter(ch => {
    const matchSearch = ch.name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || ch.type === filterType;
    return matchSearch && matchType;
  });

  const handleCreateChannel = () => {
    const ch: Channel = {
      ...defaultChannel,
      id: `ch${Date.now()}`, name: newChannel.name, type: newChannel.type, priority: newChannel.priority,
      locked: newChannel.locked, historyEnabled: newChannel.historyEnabled,
      retentionDays: newChannel.retentionDays, emergencyOverride: newChannel.emergencyOverride,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setChannels(prev => [ch, ...prev]);
    setCreateOpen(false);
    setNewChannel({ name: "", type: "public", priority: "normal", historyEnabled: true, retentionDays: 30, emergencyOverride: false, locked: false });
  };

  const toggleChannel = (id: string) => {
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, enabled: !ch.enabled } : ch));
  };

  const archiveChannel = (id: string) => {
    setChannels(prev => prev.filter(ch => ch.id !== id));
  };

  const confirmDeleteChannel = async (ch: { id: string; name: string }) => {
    if (await confirm({
      title: "Delete channel",
      description: `Delete "${ch.name}"? All channel data will be removed. This cannot be undone.`,
      destructive: true,
      confirmLabel: "Delete",
    })) {
      archiveChannel(ch.id);
    }
  };

  const confirmArchiveChannel = async (ch: { id: string; name: string }) => {
    if (await confirm({
      title: "Archive channel",
      description: `Archive "${ch.name}"? It will be hidden from the active list.`,
      destructive: true,
      confirmLabel: "Archive",
    })) {
      archiveChannel(ch.id);
    }
  };

  const openSettings = (ch: Channel) => {
    setEditChannel({ ...ch });
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    setChannels(prev => prev.map(ch => ch.id === editChannel.id ? editChannel : ch));
    setSettingsOpen(false);
  };

  const openAddMember = () => {
    setAddMemberSearch("");
    setSelectedUsers([]);
    setAssignedRole("medical-staff");
    setAddMemberOpen(true);
  };

  const handleAddMembers = () => {
    if (!selectedChannel || selectedUsers.length === 0) return;
    const newMembers: ChannelMember[] = selectedUsers.map(uid => {
      const user = availableUsers.find(u => u.id === uid)!;
      return {
        id: uid, name: user.name, avatar: user.avatar, photoUrl: user.photoUrl,
        role: assignedRole, status: "offline" as const, device: "Web" as const,
        lastActivity: "Just added", isMuted: false, isSpeaking: false,
        canSpeak: assignedRole !== "listener", blocked: false,
      };
    });
    setChannels(prev => prev.map(ch =>
      ch.id === selectedChannel.id ? { ...ch, members: [...ch.members, ...newMembers] } : ch
    ));
    setSelectedChannel(prev => prev ? { ...prev, members: [...prev.members, ...newMembers] } : prev);
    setAddMemberOpen(false);
  };

  const handleMemberAction = async (member: ChannelMember, action: string) => {
    if (!selectedChannel) return;
    const update = (fn: (m: ChannelMember) => ChannelMember) => {
      setChannels(prev => prev.map(ch =>
        ch.id === selectedChannel!.id ? { ...ch, members: ch.members.map(m => m.id === member.id ? fn(m) : m) } : ch
      ));
      setSelectedChannel(prev => prev ? { ...prev, members: prev.members.map(m => m.id === member.id ? fn(m) : m) } : prev);
    };
    switch (action) {
      case "mute": update(m => ({ ...m, isMuted: !m.isMuted })); break;
      case "disconnect": update(m => ({ ...m, status: "offline" })); break;
      case "remove": {
        const memberName = member.name;
        if (await confirm({
          title: "Remove member",
          description: `Remove ${memberName} from this channel?`,
          destructive: true,
          confirmLabel: "Remove",
        })) {
          setChannels(prev => prev.map(ch =>
            ch.id === selectedChannel.id ? { ...ch, members: ch.members.filter(m => m.id !== member.id) } : ch
          ));
          setSelectedChannel(prev => prev ? { ...prev, members: prev.members.filter(m => m.id !== member.id) } : prev);
        }
        break;
      }
      case "block":
        update(m => ({ ...m, blocked: true, status: "offline" }));
        break;
      default:
        break;
    }
  };

  const handleRoleChange = (memberId: string, newRole: PTTRole) => {
    if (!selectedChannel) return;
    const fn = (m: ChannelMember): ChannelMember => ({
      ...m, role: newRole, canSpeak: newRole !== "listener",
    });
    setChannels(prev => prev.map(ch =>
      ch.id === selectedChannel.id ? { ...ch, members: ch.members.map(m => m.id === memberId ? fn(m) : m) } : ch
    ));
    setSelectedChannel(prev => prev ? { ...prev, members: prev.members.map(m => m.id === memberId ? fn(m) : m) } : prev);
  };

  const filteredAvailableUsers = availableUsers.filter(u => {
    const alreadyMember = selectedChannel?.members.some(m => m.id === u.id);
    const matchSearch = u.name.toLowerCase().includes(addMemberSearch.toLowerCase()) || u.department.toLowerCase().includes(addMemberSearch.toLowerCase());
    return !alreadyMember && matchSearch;
  });

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />
      <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Channel Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Create, configure, and manage PTT communication channels</p>
          </motion.div>

          {/* Stats — hidden
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Channels" value={String(channels.length)} change={`${channels.filter(c => c.enabled).length} active`} changeType="positive" icon={Radio} />
            <StatCard title="Active Speakers" value={String(channels.reduce((s, c) => s + c.activeSpeakers, 0))} change="Real-time" changeType="neutral" icon={Mic} />
            <StatCard title="Connected Users" value={String(channels.reduce((s, c) => s + c.connectedCount, 0))} change="Across all channels" changeType="positive" icon={Users} />
            <StatCard title="Emergency Channels" value={String(channels.filter(c => c.priority === "emergency").length)} change="Override enabled" changeType="neutral" icon={AlertTriangle} />
          </div>
          */}

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search channels..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="moderated">Moderated</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Channel
            </Button>
          </div>

          {/* Channel Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((ch, i) => {
                const TypeIcon = typeConfig[ch.type].icon;
                return (
                  <motion.div
                    key={ch.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow border border-border/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg ${typeConfig[ch.type].bg} flex items-center justify-center`}>
                          <TypeIcon className={`h-5 w-5 ${typeConfig[ch.type].color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">{ch.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priorityConfig[ch.priority].color}`}>
                              {priorityConfig[ch.priority].label}
                            </Badge>
                            {ch.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={ch.enabled} onCheckedChange={() => toggleChannel(ch.id)} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedChannel(ch); setMemberModalOpen(true); }}>
                              <Users className="h-4 w-4 mr-2" /> Manage Members
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openSettings(ch)}>
                              <Settings className="h-4 w-4 mr-2" /> Channel Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View History</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => confirmArchiveChannel(ch)}>
                              <Archive className="h-4 w-4 mr-2" /> Archive
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => confirmDeleteChannel(ch)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><Crown className="h-3 w-3" /> Owner: {ch.owner}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {ch.connectedCount} connected</span>
                        <span className="flex items-center gap-1.5">
                          {ch.activeSpeakers > 0 && <span className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                          {ch.activeSpeakers} speaking
                        </span>
                      </div>
                      {ch.historyEnabled && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3" /> Retention: {ch.retentionDays} days
                        </div>
                      )}
                      {ch.emergencyOverride && (
                        <div className="flex items-center gap-1.5 text-destructive">
                          <Zap className="h-3 w-3" /> Emergency override enabled
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {ch.members.slice(0, 5).map(m => (
                          <Avatar key={m.id} className="h-7 w-7 border-2 border-card">
                            <AvatarImage src={m.photoUrl} />
                            <AvatarFallback className="text-[9px]">{m.avatar}</AvatarFallback>
                          </Avatar>
                        ))}
                        {ch.members.length > 5 && (
                          <div className="h-7 w-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                            +{ch.members.length - 5}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setSelectedChannel(ch); setMemberModalOpen(true); }}>
                        Manage
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Create Channel Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Channel</DialogTitle>
              <DialogDescription>Set up a new PTT communication channel</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Channel Name</Label>
                <Input value={newChannel.name} onChange={e => setNewChannel(p => ({ ...p, name: e.target.value }))} placeholder="e.g., ER Team Alpha" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={newChannel.type} onValueChange={v => setNewChannel(p => ({ ...p, type: v as Channel["type"] }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                      <SelectItem value="moderated">Moderated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={newChannel.priority} onValueChange={v => setNewChannel(p => ({ ...p, priority: v as Channel["priority"] }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="emergency">Emergency Override</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Message History</Label>
                  <Switch checked={newChannel.historyEnabled} onCheckedChange={v => setNewChannel(p => ({ ...p, historyEnabled: v }))} />
                </div>
                {newChannel.historyEnabled && (
                  <div>
                    <Label className="text-muted-foreground">Retention (days)</Label>
                    <Input type="number" value={newChannel.retentionDays} onChange={e => setNewChannel(p => ({ ...p, retentionDays: Number(e.target.value) }))} className="mt-1" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label>Emergency Override</Label>
                  <Switch checked={newChannel.emergencyOverride} onCheckedChange={v => setNewChannel(p => ({ ...p, emergencyOverride: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Lock Settings</Label>
                  <Switch checked={newChannel.locked} onCheckedChange={v => setNewChannel(p => ({ ...p, locked: v }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateChannel} disabled={!newChannel.name.trim()}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Member Management Dialog */}
        <Dialog open={memberModalOpen} onOpenChange={setMemberModalOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-secondary" />
                {selectedChannel?.name} — Members
              </DialogTitle>
              <DialogDescription>{selectedChannel?.members.length} members in this channel</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {selectedChannel?.members.map(member => {
                const rc = roleConfig[member.role];
                const RoleIcon = rc.icon;
                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.photoUrl} />
                        <AvatarFallback>{member.avatar}</AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${statusColors[member.status]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{member.name}</span>
                        {member.isSpeaking && (
                          <span className="flex items-center gap-1 text-[10px] text-success font-medium">
                            <Mic className="h-3 w-3" /> Speaking
                          </span>
                        )}
                        {member.isMuted && <MicOff className="h-3 w-3 text-destructive" />}
                        {member.blocked && <Badge variant="destructive" className="text-[9px] px-1 py-0">Blocked</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{member.device}</span>
                        <span className="capitalize">{member.status}</span>
                        <span>{member.lastActivity}</span>
                      </div>
                    </div>
                    {/* Role selector */}
                    <Select value={member.role} onValueChange={(v) => handleRoleChange(member.id, v as PTTRole)}>
                      <SelectTrigger className="w-[150px] h-8 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className={`h-5 w-5 rounded-full ${rc.color} flex items-center justify-center`}>
                            <RoleIcon className="h-3 w-3" />
                          </div>
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleConfig).map(([key, cfg]) => {
                          const Icon = cfg.icon;
                          return (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <div className={`h-5 w-5 rounded-full ${cfg.color} flex items-center justify-center`}>
                                  <Icon className="h-3 w-3" />
                                </div>
                                {cfg.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleMemberAction(member, "mute")}>
                          {member.isMuted ? <><Mic className="h-4 w-4 mr-2" /> Unmute</> : <><MicOff className="h-4 w-4 mr-2" /> Force Mute</>}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleMemberAction(member, "disconnect")} className="text-warning">
                          <Signal className="h-4 w-4 mr-2" /> Force Disconnect
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMemberAction(member, "block")} className="text-destructive">
                          <EyeOff className="h-4 w-4 mr-2" /> Block from Channel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMemberAction(member, "remove")} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" className="gap-2" onClick={openAddMember}>
                <UserPlus className="h-4 w-4" /> Add Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-secondary" /> Add Members
              </DialogTitle>
              <DialogDescription>Select users and assign their role in {selectedChannel?.name}</DialogDescription>
            </DialogHeader>

            {/* Role Selection */}
            <div>
              <Label className="mb-2 block">Assign Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(roleConfig).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const isSelected = assignedRole === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setAssignedRole(key as PTTRole)}
                      className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all text-sm ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full ${cfg.color} flex items-center justify-center shrink-0`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-xs">{cfg.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{cfg.description}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Search */}
            <div>
              <Label className="mb-2 block">Select Users</Label>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or department..." value={addMemberSearch} onChange={e => setAddMemberSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {filteredAvailableUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No users available</p>
                ) : (
                  filteredAvailableUsers.map(user => {
                    const isSelected = selectedUsers.includes(user.id);
                    return (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50 border border-transparent"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setSelectedUsers(prev =>
                              checked ? [...prev, user.id] : prev.filter(id => id !== user.id)
                            );
                          }}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.photoUrl} />
                          <AvatarFallback className="text-[10px]">{user.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-[11px] text-muted-foreground">{user.department}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{selectedUsers.length}</span> user(s) will be added as <span className="font-medium text-foreground">{roleConfig[assignedRole].label}</span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
              <Button onClick={handleAddMembers} disabled={selectedUsers.length === 0} className="gap-2">
                <UserPlus className="h-4 w-4" /> Add {selectedUsers.length > 0 ? `${selectedUsers.length} Member(s)` : "Members"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Channel Settings Dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-secondary" />
                Channel Settings — {editChannel.name}
              </DialogTitle>
              <DialogDescription>Configure all settings for this channel</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="access">Access</TabsTrigger>
                <TabsTrigger value="retention">Retention</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-4">
                <div>
                  <Label>Channel Name</Label>
                  <Input value={editChannel.name} onChange={e => setEditChannel(p => ({ ...p, name: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input value={editChannel.description} onChange={e => setEditChannel(p => ({ ...p, description: e.target.value }))} placeholder="Channel description..." className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Channel Type</Label>
                    <Select value={editChannel.type} onValueChange={v => setEditChannel(p => ({ ...p, type: v as Channel["type"] }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="moderated">Moderated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority Level</Label>
                    <Select value={editChannel.priority} onValueChange={v => setEditChannel(p => ({ ...p, priority: v as Channel["priority"] }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="emergency">Emergency Override</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Channel Owner</Label>
                  <Input value={editChannel.owner} onChange={e => setEditChannel(p => ({ ...p, owner: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Max Members</Label>
                  <Input type="number" value={editChannel.maxMembers} onChange={e => setEditChannel(p => ({ ...p, maxMembers: Number(e.target.value) }))} className="mt-1" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Channel Enabled</Label>
                    <p className="text-xs text-muted-foreground">Users can join and communicate</p>
                  </div>
                  <Switch checked={editChannel.enabled} onCheckedChange={v => setEditChannel(p => ({ ...p, enabled: v }))} />
                </div>
              </TabsContent>

              {/* Access Tab */}
              <TabsContent value="access" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Lock Settings</Label>
                    <p className="text-xs text-muted-foreground">Prevent members from modifying channel</p>
                  </div>
                  <Switch checked={editChannel.locked} onCheckedChange={v => setEditChannel(p => ({ ...p, locked: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Emergency Override</Label>
                    <p className="text-xs text-muted-foreground">Allow emergency broadcasts to override mute/DND</p>
                  </div>
                  <Switch checked={editChannel.emergencyOverride} onCheckedChange={v => setEditChannel(p => ({ ...p, emergencyOverride: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Encryption Enforced</Label>
                    <p className="text-xs text-muted-foreground">End-to-end encryption for all PTT audio</p>
                  </div>
                  <Switch checked={editChannel.encryptionEnabled} onCheckedChange={v => setEditChannel(p => ({ ...p, encryptionEnabled: v }))} />
                </div>
                <div>
                  <Label>PTT Mode</Label>
                  <Select value={editChannel.pttMode} onValueChange={v => setEditChannel(p => ({ ...p, pttMode: v as "hold" | "toggle" }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hold">Hold to Talk</SelectItem>
                      <SelectItem value="toggle">Toggle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Retention Tab */}
              <TabsContent value="retention" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Message History</Label>
                    <p className="text-xs text-muted-foreground">Store PTT message history</p>
                  </div>
                  <Switch checked={editChannel.historyEnabled} onCheckedChange={v => setEditChannel(p => ({ ...p, historyEnabled: v }))} />
                </div>
                {editChannel.historyEnabled && (
                  <div>
                    <Label>Retention Period (days)</Label>
                    <Input type="number" value={editChannel.retentionDays} onChange={e => setEditChannel(p => ({ ...p, retentionDays: Number(e.target.value) }))} className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">Set to 0 for permanent retention</p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Transcription</Label>
                    <p className="text-xs text-muted-foreground">Auto-transcribe PTT messages to text</p>
                  </div>
                  <Switch checked={editChannel.transcriptionEnabled} onCheckedChange={v => setEditChannel(p => ({ ...p, transcriptionEnabled: v }))} />
                </div>
              </TabsContent>

              {/* Advanced Tab */}
              <TabsContent value="advanced" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-delete if Inactive</Label>
                    <p className="text-xs text-muted-foreground">Automatically archive channel after extended inactivity</p>
                  </div>
                  <Switch checked={editChannel.autoDeleteInactive} onCheckedChange={v => setEditChannel(p => ({ ...p, autoDeleteInactive: v }))} />
                </div>

                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Danger Zone
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Archive Channel</p>
                      <p className="text-xs text-muted-foreground">Disable and hide from active list</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={async () => { await confirmArchiveChannel(editChannel); setSettingsOpen(false); }}>
                      <Archive className="h-4 w-4 mr-1" /> Archive
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Delete Channel</p>
                      <p className="text-xs text-muted-foreground">Permanently remove channel and all data</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={async () => { await confirmDeleteChannel(editChannel); setSettingsOpen(false); }}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
              <Button onClick={saveSettings}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      {confirmDialog}
    </div>
  );
};

export default PTTChannels;
