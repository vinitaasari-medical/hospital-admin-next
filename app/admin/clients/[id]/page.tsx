'use client';
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { validateRouteParam } from "@/lib/utils/params";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Users as UsersIcon, ShieldCheck, Building2, Upload, Trash2, Pencil } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import { initialClients, type Client } from "@/data/clientsMock";
import { AppAvatar } from "@/components/common/avatar";
import { StatusBadge, getStatusTone } from "@/components/common/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import ProtectedRoute from "@/components/ProtectedRoute";

const SectionCard = ({
  title,
  icon: Icon,
  count,
  search,
  onSearchChange,
  searchPlaceholder,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl bg-card shadow-card border border-border/50 overflow-hidden">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border/50">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
          <Icon className="h-4.5 w-4.5 text-secondary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{count} total</p>
        </div>
      </div>
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9 h-9"
        />
      </div>
    </div>
    <div>{children}</div>
  </div>
);

const ClientProfile = () => {
  const params = useParams();
  const id = validateRouteParam(params?.id);
  const router = useRouter();
  const sidebarMargin = useSidebarMargin();

  const source = useMemo(
    () => (id ? initialClients.find((c) => c.id === id) : undefined),
    [id]
  );
  const [client, setClient] = useState<Client | undefined>(source);
  useEffect(() => setClient(source), [source]);

  const [usersSearch, setUsersSearch] = useState("");
  const [adminsSearch, setAdminsSearch] = useState("");
  const [deptSearch, setDeptSearch] = useState("");

  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) router.replace("/admin/clients");
  }, [id, router]);

  if (!id) return null;

  const openEdit = () => {
    if (!client) return;
    setEditName(client.name);
    setEditPhotoUrl(client.photoUrl);
    setEditOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 5MB allowed.", variant: "destructive" });
      return;
    }
    setEditPhotoUrl(URL.createObjectURL(file));
  };

  const saveEdit = () => {
    if (!client) return;
    const name = editName.trim();
    if (!name) {
      toast({ title: "Name required", description: "Sub-Network name cannot be empty.", variant: "destructive" });
      return;
    }
    const avatar = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const updated: Client = { ...client, name, photoUrl: editPhotoUrl, avatar };
    setClient(updated);
    const idx = initialClients.findIndex((c) => c.id === client.id);
    if (idx >= 0) initialClients[idx] = updated;
    setEditOpen(false);
    toast({ title: "Profile updated", description: `${name} has been updated.` });
  };

  if (!client) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-screen bg-background">
          <DashboardSidebar items={adminSidebarItems} />
          <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
            <div className="p-6 lg:p-8 max-w-7xl mx-auto">
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin/clients")} className="gap-2 mb-4">
                <ArrowLeft className="h-4 w-4" /> Back to Networks
              </Button>
              <div className="text-center py-20 text-muted-foreground">Network not found.</div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  const filteredUsers = client.users.filter((u) => {
    const q = usersSearch.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
  });

  const filteredAdmins = client.admins.filter((a) => {
    const q = adminsSearch.toLowerCase();
    const name = `${a.firstName} ${a.lastName}`.toLowerCase();
    return !q || name.includes(q) || (a.email ?? "").toLowerCase().includes(q) || (a.jobTitle ?? "").toLowerCase().includes(q) || `${a.countryCode} ${a.phone}`.toLowerCase().includes(q);
  });

  const filteredDepartments = client.departments.filter((d) => {
    const q = deptSearch.toLowerCase();
    return !q || d.name.toLowerCase().includes(q) || (d.head ?? "").toLowerCase().includes(q);
  });

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar items={adminSidebarItems} />
        <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
          <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <Button variant="ghost" size="sm" onClick={() => router.push("/admin/clients")} className="gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" /> Back to Networks
            </Button>

            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-card shadow-card border border-border/50 p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                {client.photoUrl ? (
                  <img src={client.photoUrl} alt={client.name} className="h-20 w-20 rounded-2xl object-cover border border-border" />
                ) : (
                  <AppAvatar name={client.name} initials={client.avatar} size="xl" className="h-20 w-20 rounded-2xl text-lg" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Networks</span>
                    <span>›</span>
                    <span className="truncate">{client.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <h1 className="text-2xl font-bold text-foreground truncate">{client.name}</h1>
                    <StatusBadge tone={getStatusTone(client.status)}>{client.status}</StatusBadge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{client.type}</p>
                </div>
                <Button onClick={openEdit} className="gap-2 self-start sm:self-auto">
                  <Pencil className="h-4 w-4" /> Edit Profile
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                {[
                  { label: "Admins", value: client.admins.length, icon: ShieldCheck },
                  { label: "Users", value: client.users.length, icon: UsersIcon },
                  { label: "Departments", value: client.departments.length, icon: Building2 },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-lg bg-muted/40 p-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-secondary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground leading-none">{value.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <SectionCard title="Users" icon={UsersIcon} count={client.users.length} search={usersSearch} onSearchChange={setUsersSearch} searchPlaceholder="Search users by name or email...">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No users found.</div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {filteredUsers.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                      <AppAvatar name={u.name} src={u.avatarUrl ?? undefined} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email ?? "—"}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Admins" icon={ShieldCheck} count={client.admins.length} search={adminsSearch} onSearchChange={setAdminsSearch} searchPlaceholder="Search admins by name, email, job title...">
              {filteredAdmins.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No admins found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr className="text-xs text-muted-foreground">
                        <th className="font-semibold px-4 py-3">Admin Name</th>
                        <th className="font-semibold px-4 py-3">Mobile Number</th>
                        <th className="font-semibold px-4 py-3">Email</th>
                        <th className="font-semibold px-4 py-3">Job Title</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredAdmins.map((a) => {
                        const name = `${a.firstName} ${a.lastName}`.trim() || "Unnamed";
                        return (
                          <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <AppAvatar name={name} size="sm" />
                                <span className="font-medium text-foreground">{name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{a.countryCode} {a.phone}</td>
                            <td className="px-4 py-3 text-muted-foreground">{a.email ?? "—"}</td>
                            <td className="px-4 py-3 text-foreground">{a.jobTitle ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Departments" icon={Building2} count={client.departments.length} search={deptSearch} onSearchChange={setDeptSearch} searchPlaceholder="Search departments or head...">
              {filteredDepartments.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No departments found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                      <tr className="text-xs text-muted-foreground">
                        <th className="font-semibold px-4 py-3">Department Name</th>
                        <th className="font-semibold px-4 py-3">Head</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredDepartments.map((d) => (
                        <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{d.head ?? "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        </main>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <input ref={photoInputRef} type="file" accept="image/svg+xml,image/png,image/jpeg,image/gif" className="hidden" onChange={handlePhotoSelect} />
            <div className="rounded-xl border-2 border-dashed border-border p-6 flex flex-col items-center gap-4">
              {editPhotoUrl ? (
                <img src={editPhotoUrl} alt="Profile" className="h-24 w-24 rounded-xl object-cover border border-border" />
              ) : (
                <AppAvatar name={editName || "?"} size="xl" className="h-24 w-24 rounded-xl text-lg" />
              )}
              <p className="text-xs text-muted-foreground">SVG, PNG, JPG or GIF</p>
              <div className="flex items-center gap-6">
                <button type="button" onClick={() => photoInputRef.current?.click()} className="inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-secondary/80 transition-colors">
                  <Upload className="h-4 w-4" /> Upload Photo
                </button>
                <button type="button" onClick={() => setEditPhotoUrl(null)} className="inline-flex items-center gap-2 text-sm font-semibold text-destructive hover:text-destructive/80 transition-colors">
                  <Trash2 className="h-4 w-4" /> Delete Photo
                </button>
              </div>
            </div>
            <div className="space-y-2 mt-2">
              <Label htmlFor="sub-network-name">Sub-Network Name</Label>
              <Input id="sub-network-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Sub-Network name" maxLength={100} />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveEdit} className="gap-2">
                <Pencil className="h-4 w-4" /> Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
};

export default ClientProfile;
