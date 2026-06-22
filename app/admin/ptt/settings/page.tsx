'use client';
import { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Settings, Mic, Shield, Lock, Globe, Trash2, Clock, FileText,
  Languages, Volume2, Radio, Save, RefreshCw,
} from "lucide-react";
import { adminSidebarItems } from "@/config/adminSidebarItems";

interface SettingGroup {
  title: string;
  icon: React.ElementType;
  settings: {
    key: string;
    label: string;
    description: string;
    type: "switch" | "select" | "number";
    value: any;
    options?: { value: string; label: string }[];
  }[];
}

const PTTSettings = () => {
  const sidebarMargin = useSidebarMargin();
  const [config, setConfig] = useState<Record<string, any>>({
    pttMode: "hold",
    allowMute: true,
    allowDelete: false,
    enableTranscription: false,
    enableTranslation: false,
    backgroundPTT: true,
    retentionPolicy: "30",
    encryptionEnforced: true,
    autoDeleteInactive: true,
    autoDeleteDays: "90",
    maxChannelMembers: "100",
    pttTimeout: "120",
    firstLockWins: true,
    emergencyOverrideMute: true,
    forcePlayback: true,
  });

  const update = (key: string, value: any) => setConfig(prev => ({ ...prev, [key]: value }));

  const groups: SettingGroup[] = [
    {
      title: "PTT Behavior",
      icon: Mic,
      settings: [
        { key: "pttMode", label: "Default PTT Mode", description: "How users activate push-to-talk", type: "select", value: config.pttMode, options: [{ value: "hold", label: "Hold to Talk" }, { value: "toggle", label: "Toggle" }] },
        { key: "pttTimeout", label: "PTT Timeout (seconds)", description: "Maximum continuous transmission time", type: "number", value: config.pttTimeout },
        { key: "firstLockWins", label: "First Lock Wins", description: "When multiple users press PTT simultaneously, first user gets priority", type: "switch", value: config.firstLockWins },
        { key: "allowMute", label: "Allow User Mute", description: "Users can mute themselves in channels", type: "switch", value: config.allowMute },
        { key: "backgroundPTT", label: "Background PTT", description: "Allow PTT when app is in background", type: "switch", value: config.backgroundPTT },
      ],
    },
    {
      title: "Emergency Settings",
      icon: Shield,
      settings: [
        { key: "emergencyOverrideMute", label: "Override Mute on Emergency", description: "Emergency broadcasts override all mute settings", type: "switch", value: config.emergencyOverrideMute },
        { key: "forcePlayback", label: "Force Playback", description: "Emergency audio plays even if device is muted", type: "switch", value: config.forcePlayback },
      ],
    },
    {
      title: "Content & Privacy",
      icon: Lock,
      settings: [
        { key: "allowDelete", label: "Allow Message Deletion", description: "Users can delete their own messages", type: "switch", value: config.allowDelete },
        { key: "enableTranscription", label: "Enable Transcription", description: "Auto-transcribe PTT messages to text", type: "switch", value: config.enableTranscription },
        { key: "enableTranslation", label: "Enable Translation", description: "Auto-translate messages between languages", type: "switch", value: config.enableTranslation },
        { key: "encryptionEnforced", label: "Enforce Encryption", description: "All PTT transmissions must use end-to-end encryption", type: "switch", value: config.encryptionEnforced },
      ],
    },
    {
      title: "Retention & Cleanup",
      icon: Clock,
      settings: [
        { key: "retentionPolicy", label: "Default Retention (days)", description: "How long to keep message history by default", type: "select", value: config.retentionPolicy, options: [{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "365", label: "1 year" }, { value: "0", label: "Permanent" }] },
        { key: "autoDeleteInactive", label: "Auto-Delete Inactive Channels", description: "Automatically archive channels with no activity", type: "switch", value: config.autoDeleteInactive },
        { key: "autoDeleteDays", label: "Inactivity Threshold (days)", description: "Days of inactivity before auto-archiving", type: "number", value: config.autoDeleteDays },
      ],
    },
    {
      title: "Capacity",
      icon: Globe,
      settings: [
        { key: "maxChannelMembers", label: "Max Channel Members", description: "Maximum number of members per channel", type: "number", value: config.maxChannelMembers },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />
      <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">PTT Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Global configuration for the Push-To-Talk system</p>
            </div>
            <Button className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
          </motion.div>

          <div className="space-y-6">
            {groups.map((group, gi) => (
              <motion.div key={group.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.08 }}
                className="rounded-xl bg-card p-5 shadow-card"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <group.icon className="h-4 w-4 text-secondary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{group.title}</h3>
                </div>
                <div className="space-y-4">
                  {group.settings.map(setting => (
                    <div key={setting.key} className="flex items-center justify-between py-2">
                      <div className="flex-1 pr-8">
                        <p className="text-sm font-medium text-foreground">{setting.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
                      </div>
                      {setting.type === "switch" && (
                        <Switch checked={setting.value} onCheckedChange={v => update(setting.key, v)} />
                      )}
                      {setting.type === "select" && (
                        <Select value={setting.value} onValueChange={v => update(setting.key, v)}>
                          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {setting.options?.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {setting.type === "number" && (
                        <Input type="number" value={setting.value} onChange={e => update(setting.key, e.target.value)} className="w-[100px]" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Edge Cases Documentation */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="mt-6 rounded-xl bg-card p-5 shadow-card"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Edge Case Handling Rules</h3>
            <div className="space-y-2">
              {[
                { rule: "User transmitting + admin removes → transmission stops immediately", status: "enforced" },
                { rule: "Phone call interrupts → status shown to admin as 'In Call'", status: "enforced" },
                { rule: "Network drop → 'Reconnecting' state shown to admin", status: "enforced" },
                { rule: "Multiple PTT press → first lock wins (configurable above)", status: "configurable" },
                { rule: "Emergency triggered while muted → override mute", status: "enforced" },
                { rule: "Channel deleted while active → force disconnect all members", status: "enforced" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Badge variant="outline" className={`text-[10px] ${item.status === "enforced" ? "bg-success/10 text-success border-success/30" : "bg-secondary/10 text-secondary border-secondary/30"}`}>
                    {item.status}
                  </Badge>
                  <span className="text-sm text-foreground">{item.rule}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default PTTSettings;
