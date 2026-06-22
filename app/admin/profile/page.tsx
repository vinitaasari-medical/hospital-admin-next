'use client';
import { useState, useRef } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import { Save, Camera, KeyRound, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import ProtectedRoute from "@/components/ProtectedRoute";

const Profile = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("Admin User");
  const [email, setEmail] = useState("admin@medcircles.com");
  const [phone, setPhone] = useState("+1 555-0199");
  const [role, setRole] = useState("Super Admin");
  const [bio, setBio] = useState("Healthcare network administrator with 10+ years of experience managing multi-facility operations.");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleProfileSave = () => {
    toast({ title: "Profile updated", description: "Your profile information has been saved." });
  };

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters required.", variant: "destructive" });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast({ title: "Password changed", description: "Your password has been updated successfully." });
  };

  const initials = fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB.", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
    toast({ title: "Photo updated", description: "Your profile photo has been changed." });
  };

  const sidebarMargin = useSidebarMargin();
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar items={adminSidebarItems} />
        <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your personal information and security.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card shadow-card p-6 mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
                  ) : (
                    <div className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                      {initials}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Camera className="h-5 w-5 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="text-lg font-semibold text-foreground">{fullName}</h2>
                  <p className="text-sm text-muted-foreground">{email}</p>
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                      <Shield className="h-3 w-3" /> {role}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            <Tabs defaultValue="info" className="space-y-6">
              <TabsList className="w-fit">
                <TabsTrigger value="info" className="gap-1.5">Profile Info</TabsTrigger>
                <TabsTrigger value="password" className="gap-1.5"><KeyRound className="h-3.5 w-3.5" /> Password</TabsTrigger>
              </TabsList>

              <TabsContent value="info">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card shadow-card p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
                    <p className="text-sm text-muted-foreground">Update your personal details.</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input value={role} disabled className="bg-muted/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleProfileSave} className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="password">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card shadow-card p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
                    <p className="text-sm text-muted-foreground">Ensure your account uses a strong password.</p>
                  </div>
                  <Separator />
                  <div className="max-w-md space-y-4">
                    <div className="space-y-2">
                      <Label>Current Password</Label>
                      <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
                    </div>
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm New Password</Label>
                      <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handlePasswordChange} disabled={!currentPassword || !newPassword || !confirmPassword} className="gap-2">
                      <KeyRound className="h-4 w-4" /> Update Password
                    </Button>
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

export default Profile;
