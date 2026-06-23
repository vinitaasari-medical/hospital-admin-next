'use client';
import { useState, useRef, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, forceLogout } from "@/lib/api/apiClient";
import { awsLinkGenerateImage, gcsFileUpload } from "@/lib/api/file-uploader";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

// Maps dial code digits to ISO-2 country code for PhoneInput's country prop.
// Needed because if country_code is missing, react-phone-input-2 auto-detects
// the country from the number prefix which can be wrong (e.g. "65..." → Singapore).
function dialCodeToIso2(dialCode: string): string {
  const map: Record<string, string> = {
    "1": "us", "7": "ru", "20": "eg", "27": "za", "30": "gr",
    "31": "nl", "32": "be", "33": "fr", "34": "es", "36": "hu",
    "39": "it", "40": "ro", "41": "ch", "43": "at", "44": "gb",
    "45": "dk", "46": "se", "47": "no", "48": "pl", "49": "de",
    "51": "pe", "52": "mx", "54": "ar", "55": "br", "56": "cl",
    "57": "co", "60": "my", "61": "au", "62": "id", "63": "ph",
    "64": "nz", "65": "sg", "66": "th", "81": "jp", "82": "kr",
    "84": "vn", "86": "cn", "90": "tr", "91": "in", "92": "pk",
    "93": "af", "94": "lk", "95": "mm", "98": "ir",
    "212": "ma", "213": "dz", "216": "tn", "218": "ly",
    "234": "ng", "254": "ke", "256": "ug", "260": "zm", "263": "zw",
    "351": "pt", "352": "lu", "353": "ie", "358": "fi", "359": "bg",
    "370": "lt", "371": "lv", "372": "ee", "380": "ua", "381": "rs",
    "385": "hr", "386": "si", "420": "cz", "421": "sk",
    "502": "gt", "503": "sv", "504": "hn", "505": "ni",
    "506": "cr", "507": "pa", "591": "bo", "593": "ec",
    "673": "bn", "880": "bd", "886": "tw",
    "960": "mv", "961": "lb", "962": "jo", "963": "sy",
    "964": "iq", "965": "kw", "966": "sa", "967": "ye", "968": "om",
    "971": "ae", "972": "il", "973": "bh", "974": "qa",
    "975": "bt", "977": "np", "992": "tj", "993": "tm",
    "994": "az", "995": "ge", "996": "kg", "998": "uz",
  };
  return map[dialCode] ?? "sa";
}

const Profile = () => {
  const { toast } = useToast();
  const { getUser, getUserEmail, getUserId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile info — separate first/last matching the API payload
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("sa");
  const [role, setRole] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Inline validation errors for profile info
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pwErrors, setPwErrors] = useState({ old: "", new_: "", confirm: "" });

  useEffect(() => {
    const user = getUser();
    if (user) {
      setFirstName(user.first_name ?? "");
      setLastName(user.last_name ?? "");
      setEmail(user.email ?? "");
      // Build phone value for PhoneInput: dialCode (digits only) + local number.
      // Guard against double-prefix in case phone_number already includes dialCode.
      const dialCode = (user.country_code ?? "").replace("+", "").trim();
      const rawPhone = (user.phone_number ?? "").trim();
      let combined = rawPhone;
      if (dialCode && rawPhone && !rawPhone.startsWith(dialCode)) {
        combined = `${dialCode}${rawPhone}`;
      }
      setPhone(combined);
      setPhoneCountry(dialCodeToIso2(dialCode));
      setRole(user.role_name ?? "");
      setProfileUrl(user.profile_url ?? "");
    } else {
      setEmail(getUserEmail() ?? "");
    }
  }, []);

  const fullName = `${firstName} ${lastName}`.trim() || "Admin";
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "A";

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
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const validateProfileInfo = (): boolean => {
    let valid = true;
    setFirstNameError("");
    setLastNameError("");
    if (!firstName.trim()) {
      setFirstNameError("First name is required");
      valid = false;
    }
    if (!lastName.trim()) {
      setLastNameError("Last name is required");
      valid = false;
    }
    return valid;
  };

  const handleProfileSave = async () => {
    if (!validateProfileInfo()) return;
    setIsSaving(true);
    try {
      let uploadedUrl = profileUrl;
      if (avatarFile) {
        const { signedUrl } = await awsLinkGenerateImage({
          file: avatarFile,
          awsFolderPath: "network",
        });
        await gcsFileUpload({ signedUrl, file: avatarFile });
        uploadedUrl = signedUrl.split("?")[0];
        setProfileUrl(uploadedUrl);
        setAvatarFile(null);
      }

      await apiClient("POST", "admin", "updatemyadminprofile", {
        body: { first_name: firstName, last_name: lastName, profile_url: uploadedUrl },
        shouldUseDefaultToken: false,
        enableLogging: true,
      });

      // Mirror what ReactJS does: update localStorage user object
      const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (stored) {
        const u = JSON.parse(stored);
        u.first_name = firstName;
        u.last_name = lastName;
        u.profile_url = uploadedUrl;
        localStorage.setItem("user", JSON.stringify(u));
        window.dispatchEvent(new Event("storage"));
      }

      toast({ title: "Profile updated", description: "Your profile information has been saved." });
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message ?? "Something went wrong";
      toast({ title: "Update failed", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const validatePassword = (): boolean => {
    const errs = { old: "", new_: "", confirm: "" };
    let valid = true;
    if (!currentPassword) { errs.old = "Current password is required"; valid = false; }
    if (!newPassword) { errs.new_ = "New password is required"; valid = false; }
    if (!confirmPassword) {
      errs.confirm = "Confirm password is required";
      valid = false;
    } else if (newPassword && confirmPassword !== newPassword) {
      errs.confirm = "Confirm password must match new password";
      valid = false;
    }
    setPwErrors(errs);
    return valid;
  };

  const handlePasswordChange = async () => {
    if (!validatePassword()) return;
    setIsChangingPassword(true);
    try {
      await apiClient("POST", "admin", "changeadminpassword", {
        body: {
          admin_id: getUserId(),
          new_password: newPassword,
          old_password: currentPassword,
        },
        shouldUseDefaultToken: false,
        enableLogging: true,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwErrors({ old: "", new_: "", confirm: "" });
      toast({ title: "Password changed", description: "Your password has been updated successfully." });
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      if (err?.code === 403) {
        forceLogout();
        return;
      }
      toast({
        title: "Password change failed",
        description: err?.message ?? "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const sidebarMargin = useSidebarMargin();
  const avatarSrc = avatarPreview || profileUrl;

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
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
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
                    <div className="space-y-3">
                      <Label>First Name</Label>
                      <Input
                        value={firstName}
                        onChange={(e) => { setFirstName(e.target.value); if (firstNameError) setFirstNameError(""); }}
                        placeholder="First name"
                      />
                      {firstNameError && <p className="text-xs text-destructive">{firstNameError}</p>}
                    </div>
                    <div className="space-y-3">
                      <Label>Last Name</Label>
                      <Input
                        value={lastName}
                        onChange={(e) => { setLastName(e.target.value); if (lastNameError) setLastNameError(""); }}
                        placeholder="Last name"
                      />
                      {lastNameError && <p className="text-xs text-destructive">{lastNameError}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label>Email</Label>
                      <Input value={email} disabled className="bg-muted/50" type="email" />
                    </div>
                    <div className="space-y-3">
                      <Label>Phone</Label>
                      <PhoneInput
                        value={phone}
                        disabled
                        country={phoneCountry}
                        inputStyle={{
                          width: "100%",
                          height: "36px",
                          fontSize: "14px",
                          backgroundColor: "hsl(var(--muted) / 0.5)",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "calc(var(--radius) - 2px)",
                          color: "hsl(var(--foreground))",
                          cursor: "not-allowed",
                          opacity: 0.7,
                        }}
                        buttonStyle={{
                          backgroundColor: "hsl(var(--muted) / 0.5)",
                          border: "1px solid hsl(var(--border))",
                          borderRight: "none",
                          borderRadius: "calc(var(--radius) - 2px) 0 0 calc(var(--radius) - 2px)",
                          cursor: "not-allowed",
                        }}
                        containerStyle={{ width: "100%" }}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Role</Label>
                    <Input value={role} disabled className="bg-muted/50" />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleProfileSave} disabled={isSaving} className="gap-2">
                      {isSaving ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
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
                    <div className="space-y-3">
                      <Label>Current Password</Label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => { setCurrentPassword(e.target.value); if (pwErrors.old) setPwErrors((p) => ({ ...p, old: "" })); }}
                        placeholder="Enter current password"
                      />
                      {pwErrors.old && <p className="text-xs text-destructive">{pwErrors.old}</p>}
                    </div>
                    <div className="space-y-3">
                      <Label>New Password</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); if (pwErrors.new_) setPwErrors((p) => ({ ...p, new_: "" })); }}
                        placeholder="Enter new password"
                      />
                      {pwErrors.new_ && <p className="text-xs text-destructive">{pwErrors.new_}</p>}
                      {!pwErrors.new_ && (
                        <p className="text-xs text-muted-foreground">
                          Password must contain at least 8 characters, one uppercase, one lowercase, and one digit
                        </p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label>Confirm New Password</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); if (pwErrors.confirm) setPwErrors((p) => ({ ...p, confirm: "" })); }}
                        placeholder="Confirm new password"
                      />
                      {pwErrors.confirm && <p className="text-xs text-destructive">{pwErrors.confirm}</p>}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handlePasswordChange}
                      disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="gap-2"
                    >
                      {isChangingPassword ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                      {isChangingPassword ? "Updating..." : "Update Password"}
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
