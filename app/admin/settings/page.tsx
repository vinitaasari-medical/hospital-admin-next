'use client';
import { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import {
  Bell, Lock, Globe, Palette, Mail, Save, Radio, Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import ProtectedRoute from "@/components/ProtectedRoute";

const Settings = () => {
  const { toast } = useToast();

  const [networkName, setNetworkName] = useState("City General Hospital");
  const [networkEmail, setNetworkEmail] = useState("admin@citygeneral.com");
  const [timezone, setTimezone] = useState("utc-5");
  const [language, setLanguage] = useState("en");
  const [welcomeMsg, setWelcomeMsg] = useState("Welcome to our medical network. Stay connected with your team.");

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [broadcastNotifs, setBroadcastNotifs] = useState(true);
  const [userJoinNotifs, setUserJoinNotifs] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [ipWhitelist, setIpWhitelist] = useState(false);
  const [passwordExpiry, setPasswordExpiry] = useState("90");

  const [theme, setTheme] = useState("light");
  const [compactMode, setCompactMode] = useState(false);
  const [showAvatars, setShowAvatars] = useState(true);

  const handleSave = (section: string) => {
    toast({ title: "Settings saved", description: `${section} settings have been updated.` });
  };

  const sidebarMargin = useSidebarMargin();
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar items={adminSidebarItems} />
        <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Configure your network dashboard preferences and security.</p>
            </motion.div>

            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="w-fit">
                <TabsTrigger value="general" className="gap-1.5"><Globe className="h-3.5 w-3.5" /> General</TabsTrigger>
                <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
                <TabsTrigger value="security" className="gap-1.5"><Lock className="h-3.5 w-3.5" /> Security</TabsTrigger>
                <TabsTrigger value="appearance" className="gap-1.5"><Palette className="h-3.5 w-3.5" /> Appearance</TabsTrigger>
              </TabsList>

              <TabsContent value="general">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card shadow-card p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">General Settings</h2>
                    <p className="text-sm text-muted-foreground">Basic configuration for your network.</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>Network Name</Label>
                      <Input value={networkName} onChange={(e) => setNetworkName(e.target.value)} />
                    </div>
                    <div className="space-y-3">
                      <Label>Contact Email</Label>
                      <Input value={networkEmail} onChange={(e) => setNetworkEmail(e.target.value)} type="email" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>Timezone</Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utc-8">UTC-8 (Pacific)</SelectItem>
                          <SelectItem value="utc-5">UTC-5 (Eastern)</SelectItem>
                          <SelectItem value="utc+0">UTC+0 (GMT)</SelectItem>
                          <SelectItem value="utc+3">UTC+3 (Arabia)</SelectItem>
                          <SelectItem value="utc+5.5">UTC+5:30 (India)</SelectItem>
                          <SelectItem value="utc+8">UTC+8 (Singapore)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label>Language</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Welcome Message</Label>
                    <Textarea value={welcomeMsg} onChange={(e) => setWelcomeMsg(e.target.value)} rows={3} />
                    <p className="text-xs text-muted-foreground">Shown to users when they first join the network.</p>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => handleSave("General")} className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="notifications">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card shadow-card p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>
                    <p className="text-sm text-muted-foreground">Control how and when you receive notifications.</p>
                  </div>
                  <Separator />
                  {[
                    { label: "Email Notifications", desc: "Receive important updates via email", checked: emailNotifs, onChange: setEmailNotifs, icon: Mail },
                    { label: "Push Notifications", desc: "Browser push notifications for real-time alerts", checked: pushNotifs, onChange: setPushNotifs, icon: Bell },
                    { label: "Broadcast Alerts", desc: "Get notified when new broadcasts are published", checked: broadcastNotifs, onChange: setBroadcastNotifs, icon: Radio },
                    { label: "User Join Alerts", desc: "Notify when new users join the network", checked: userJoinNotifs, onChange: setUserJoinNotifs, icon: Users },
                    { label: "Weekly Digest", desc: "Receive a weekly summary of network activity", checked: weeklyDigest, onChange: setWeeklyDigest, icon: Globe },
                  ].map(({ label, desc, checked, onChange, icon: Icon }) => (
                    <div key={label} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                      <Switch checked={checked} onCheckedChange={onChange} />
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <Button onClick={() => handleSave("Notification")} className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="security">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card shadow-card p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Security Settings</h2>
                    <p className="text-sm text-muted-foreground">Manage authentication and access control.</p>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                      <p className="text-xs text-muted-foreground">Require 2FA for all admin accounts</p>
                    </div>
                    <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">IP Whitelist</p>
                      <p className="text-xs text-muted-foreground">Restrict dashboard access to specific IPs</p>
                    </div>
                    <Switch checked={ipWhitelist} onCheckedChange={setIpWhitelist} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>Session Timeout (minutes)</Label>
                      <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label>Password Expiry (days)</Label>
                      <Select value={passwordExpiry} onValueChange={setPasswordExpiry}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => handleSave("Security")} className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="appearance">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card shadow-card p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
                    <p className="text-sm text-muted-foreground">Customize how the dashboard looks.</p>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <Label>Theme</Label>
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Compact Mode</p>
                      <p className="text-xs text-muted-foreground">Reduce spacing for denser information display</p>
                    </div>
                    <Switch checked={compactMode} onCheckedChange={setCompactMode} />
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Show Avatars</p>
                      <p className="text-xs text-muted-foreground">Display user avatars in tables and lists</p>
                    </div>
                    <Switch checked={showAvatars} onCheckedChange={setShowAvatars} />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => handleSave("Appearance")} className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Settings;
