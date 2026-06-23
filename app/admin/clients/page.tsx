'use client';
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import { initialClients, type Client, type Admin, type Branch } from "@/data/clientsMock";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  ImagePlus,
  Eye,
  MapPin,
  Phone,
  Globe,
  ChevronRight,
  Check,
  X,
  GitBranch,
  UserPlus,
  Network,
  Users,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/common/table";
import { StatusBadge, getStatusTone } from "@/components/common/status";
import { AppAvatar } from "@/components/common/avatar";
import { AppSidePanel } from "@/components/common/side-panel";
import { FilterBar } from "@/components/common/filters";
import { AppStatCard } from "@/components/common/cards/AppCard";
import { useToast } from "@/hooks/use-toast";
import ProtectedRoute from "@/components/ProtectedRoute";

const COUNTRY_CODES = [
  { code: "+1", label: "US +1" },
  { code: "+44", label: "UK +44" },
  { code: "+966", label: "SA +966" },
  { code: "+971", label: "AE +971" },
  { code: "+20", label: "EG +20" },
  { code: "+91", label: "IN +91" },
  { code: "+49", label: "DE +49" },
  { code: "+33", label: "FR +33" },
  { code: "+61", label: "AU +61" },
  { code: "+81", label: "JP +81" },
];

const emptyAdmin = (): Admin => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  firstName: "",
  lastName: "",
  phone: "",
  countryCode: "+1",
});

const emptyBranch = (): Branch => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  name: "",
  slug: "",
  logoUrl: null,
  coverUrl: null,
  admins: [emptyAdmin()],
});

const WIZARD_STEPS_WITH_SUB = [
  { id: 1, label: "Main Network", description: "Network details" },
  { id: 2, label: "Contact", description: "Contact information" },
  { id: 3, label: "Sub-Networks", description: "Add sub-networks" },
  { id: 4, label: "Review", description: "Confirm & create" },
];

const WIZARD_STEPS_NO_SUB = [
  { id: 1, label: "Main Network", description: "Network details" },
  { id: 2, label: "Contact", description: "Contact information" },
  { id: 3, label: "Review", description: "Confirm & create" },
];

const AdminEntry = ({
  admin,
  onUpdate,
  onRemove,
  canRemove,
}: {
  admin: Admin;
  onUpdate: (field: keyof Admin, value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) => (
  <div className="flex items-start gap-2">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
      <div className="space-y-1">
        <Label className="text-xs">First Name</Label>
        <Input
          value={admin.firstName}
          onChange={(e) => onUpdate("firstName", e.target.value)}
          placeholder="First name"
          maxLength={50}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Last Name</Label>
        <Input
          value={admin.lastName}
          onChange={(e) => onUpdate("lastName", e.target.value)}
          placeholder="Last name"
          maxLength={50}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Phone</Label>
        <div className="flex gap-1">
          <Select value={admin.countryCode} onValueChange={(v) => onUpdate("countryCode", v)}>
            <SelectTrigger className="w-[90px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRY_CODES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={admin.phone}
            onChange={(e) => onUpdate("phone", e.target.value)}
            placeholder="Phone number"
            maxLength={20}
          />
        </div>
      </div>
    </div>
    {canRemove && (
      <Button variant="ghost" size="icon" className="h-8 w-8 mt-6 shrink-0" onClick={onRemove}>
        <X className="h-3.5 w-3.5" />
      </Button>
    )}
  </div>
);

const ClientManagement = () => {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const router = useRouter();

  const [listPanel, setListPanel] = useState<{
    open: boolean;
    title: string;
    description: string;
    items: { id: string; name: string; meta?: string }[];
  }>({ open: false, title: "", description: "", items: [] });
  const [listSearch, setListSearch] = useState("");

  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("Hospital");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formHasSubNetworks, setFormHasSubNetworks] = useState(false);
  const [formAdmins, setFormAdmins] = useState<Admin[]>([emptyAdmin()]);
  const [formBranches, setFormBranches] = useState<Branch[]>([emptyBranch()]);
  const [formPhotoUrl, setFormPhotoUrl] = useState<string | null>(null);
  const [formCoverUrl, setFormCoverUrl] = useState<string | null>(null);

  const branchLogoRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const branchCoverRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const wizardSteps = formHasSubNetworks ? WIZARD_STEPS_WITH_SUB : WIZARD_STEPS_NO_SUB;
  const reviewStep = formHasSubNetworks ? 4 : 3;
  const subNetworkStep = formHasSubNetworks ? 3 : -1;

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
    setFormPhotoUrl(URL.createObjectURL(file));
  };

  const handleBranchImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    branchId: string,
    field: "logoUrl" | "coverUrl"
  ) => {
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
    const url = URL.createObjectURL(file);
    setFormBranches((prev) =>
      prev.map((b) => (b.id === branchId ? { ...b, [field]: url } : b))
    );
  };

  const resetWizard = () => {
    setStep(1);
    setFormName("");
    setFormType("Hospital");
    setFormEmail("");
    setFormPhone("");
    setFormWebsite("");
    setFormAddress("");
    setFormHasSubNetworks(false);
    setFormAdmins([emptyAdmin()]);
    setFormBranches([emptyBranch()]);
    setFormPhotoUrl(null);
    setFormCoverUrl(null);
  };

  const openWizard = () => {
    resetWizard();
    setEditingClient(null);
    setWizardOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setStep(1);
    setFormName(client.name);
    setFormType(client.type);
    setFormEmail(client.email);
    setFormPhone(client.phone);
    setFormWebsite(client.website);
    setFormAddress(client.address);
    setFormHasSubNetworks(client.hasSubNetworks);
    setFormAdmins(client.admins.length > 0 ? client.admins : [emptyAdmin()]);
    setFormBranches(client.branches.length > 0 ? client.branches : [emptyBranch()]);
    setFormPhotoUrl(client.photoUrl);
    setFormCoverUrl(client.coverUrl);
    setWizardOpen(true);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return (
          formName.trim().length > 0 &&
          formType.length > 0 &&
          formAdmins.some((a) => a.firstName.trim() && a.lastName.trim() && a.phone.trim())
        );
      case 2:
        return formEmail.trim().length > 0 && formPhone.trim().length > 0 && formAddress.trim().length > 0;
      case subNetworkStep:
        return true;
      default:
        return true;
    }
  };

  const handleCreate = () => {
    const validBranches = formHasSubNetworks
      ? formBranches.filter((b) => b.name.trim().length > 0)
      : [];
    const validAdmins = formAdmins.filter((a) => a.firstName.trim() || a.lastName.trim());

    if (editingClient) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === editingClient.id
            ? {
                ...c,
                name: formName.trim(),
                type: formType,
                email: formEmail.trim(),
                phone: formPhone.trim(),
                website: formWebsite.trim(),
                address: formAddress.trim(),
                hasSubNetworks: formHasSubNetworks,
                admins: validAdmins,
                branches: validBranches,
                avatar: formName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
                photoUrl: formPhotoUrl,
                coverUrl: formCoverUrl,
              }
            : c
        )
      );
      setWizardOpen(false);
      setEditingClient(null);
      toast({ title: "Network updated", description: `${formName} has been updated.` });
      return;
    }

    const newClient: Client = {
      id: Date.now().toString(),
      name: formName.trim(),
      type: formType,
      email: formEmail.trim(),
      phone: formPhone.trim(),
      website: formWebsite.trim(),
      address: formAddress.trim(),
      status: "Active",
      hasSubNetworks: formHasSubNetworks,
      admins: validAdmins,
      branches: validBranches,
      users: [],
      departments: [],
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      avatar: formName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
      photoUrl: formPhotoUrl,
      coverUrl: formCoverUrl,
    };
    setClients((prev) => [newClient, ...prev]);
    setWizardOpen(false);
    toast({
      title: "Network created",
      description: `${newClient.name} has been added${formHasSubNetworks ? ` with ${validBranches.length} sub-network(s)` : ""}.`,
    });
  };

  const handleDelete = () => {
    if (!deleteClient) return;
    setClients((prev) => prev.filter((c) => c.id !== deleteClient.id));
    toast({ title: "Network removed", description: `${deleteClient.name} has been removed.`, variant: "destructive" });
    setDeleteClient(null);
  };

  const addAdmin = () => setFormAdmins((prev) => [...prev, emptyAdmin()]);
  const removeAdmin = (id: string) => setFormAdmins((prev) => prev.filter((a) => a.id !== id));
  const updateAdmin = (id: string, field: keyof Admin, value: string) => {
    setFormAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const addBranch = () => setFormBranches((prev) => [...prev, emptyBranch()]);
  const removeBranch = (id: string) => setFormBranches((prev) => prev.filter((b) => b.id !== id));
  const updateBranch = (id: string, field: keyof Branch, value: string) => {
    setFormBranches((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const addBranchAdmin = (branchId: string) => {
    setFormBranches((prev) =>
      prev.map((b) => (b.id === branchId ? { ...b, admins: [...b.admins, emptyAdmin()] } : b))
    );
  };
  const removeBranchAdmin = (branchId: string, adminId: string) => {
    setFormBranches((prev) =>
      prev.map((b) =>
        b.id === branchId ? { ...b, admins: b.admins.filter((a) => a.id !== adminId) } : b
      )
    );
  };
  const updateBranchAdmin = (branchId: string, adminId: string, field: keyof Admin, value: string) => {
    setFormBranches((prev) =>
      prev.map((b) =>
        b.id === branchId
          ? { ...b, admins: b.admins.map((a) => (a.id === adminId ? { ...a, [field]: value } : a)) }
          : b
      )
    );
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

  const filtered = clients.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdminsPanel = (c: Client) => {
    setListSearch("");
    setListPanel({
      open: true,
      title: `${c.name} — Admins`,
      description: `${c.admins.length} admin${c.admins.length !== 1 ? "s" : ""} managing this network`,
      items: c.admins.map((a) => ({
        id: a.id,
        name: `${a.firstName} ${a.lastName}`.trim() || "Unnamed admin",
        meta: `${a.countryCode} ${a.phone}`,
      })),
    });
  };

  const openUsersPanel = (c: Client) => {
    setListSearch("");
    setListPanel({
      open: true,
      title: `${c.name} — Users`,
      description: `${c.users.length} user${c.users.length !== 1 ? "s" : ""} in this network`,
      items: c.users.map((u) => ({ id: u.id, name: u.name, meta: u.role })),
    });
  };

  const clientColumns: DataTableColumn<Client>[] = [
    {
      key: "name",
      header: "Sub-Network Name",
      sortable: true,
      searchable: true,
      accessor: (c) => c.name,
      cell: (c) => (
        <div className="flex items-center gap-3">
          {c.photoUrl ? (
            <img src={c.photoUrl} alt={c.name} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <AppAvatar name={c.name} initials={c.avatar} size="sm" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{c.name}</p>
            <p className="text-xs text-muted-foreground truncate">{c.type}</p>
          </div>
        </div>
      ),
    },
    {
      key: "admins",
      header: "Admin",
      sortable: true,
      accessor: (c) => c.admins.length,
      cell: (c) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); openAdminsPanel(c); }}
          className="group gap-1.5 h-8 px-2 -ml-2 hover:bg-accent hover:text-white"
        >
          <UserPlus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-white" />
          <span className="font-medium text-foreground group-hover:text-white">{c.admins.length}</span>
          <span className="text-xs text-muted-foreground group-hover:text-white">admin{c.admins.length !== 1 ? "s" : ""}</span>
        </Button>
      ),
    },
    {
      key: "users",
      header: "Users",
      sortable: true,
      accessor: (c) => c.users.length,
      cell: (c) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); openUsersPanel(c); }}
          className="group gap-1.5 h-8 px-2 -ml-2 hover:bg-accent hover:text-white"
        >
          <Users className="h-3.5 w-3.5 text-muted-foreground group-hover:text-white" />
          <span className="font-medium text-foreground group-hover:text-white">{c.users.length.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground group-hover:text-white">user{c.users.length !== 1 ? "s" : ""}</span>
        </Button>
      ),
    },
    {
      key: "departments",
      header: "Departments",
      sortable: true,
      accessor: (c) => c.departments.length,
      cell: (c) => (
        <Button variant="ghost" size="sm" className="group gap-1.5 h-8 px-2 -ml-2 hover:bg-accent hover:text-white">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-white" />
          <span className="font-medium text-foreground group-hover:text-white">{c.departments.length.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground group-hover:text-white">dept{c.departments.length !== 1 ? "s" : ""}</span>
        </Button>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      hideOnMobile: true,
      cell: (c) => <StatusBadge tone={getStatusTone(c.status)}>{c.status}</StatusBadge>,
    },
  ];

  const sidebarMargin = useSidebarMargin();

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar items={adminSidebarItems} />

        <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
            >
              <div>
                <h1 className="text-2xl font-bold text-foreground">Networks</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage hospital networks and their sub-networks.
                </p>
              </div>
            </motion.div>

            {/* Stat cards — hidden
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <AppStatCard label="Total Networks" value={clients.length} icon={Network} />
              <AppStatCard label="Active" value={clients.filter((c) => c.status === "Active").length} icon={CheckCircle2} />
              <AppStatCard label="Total Sub-Networks" value={clients.reduce((sum, c) => sum + c.branches.length, 0)} icon={GitBranch} />
            </div>
            */}

            <DataTable<Client>
              columns={clientColumns}
              data={filtered}
              rowKey={(c) => c.id}
              searchPlaceholder="Search networks..."
              onRowClick={(c) => router.push(`/admin/clients/${c.id}`)}
              toolbar={
                <FilterBar
                  filters={[
                    {
                      key: "status",
                      label: "Status",
                      width: 160,
                      options: [
                        { label: "Active", value: "Active" },
                        { label: "Pending", value: "Pending" },
                        { label: "Inactive", value: "Inactive" },
                      ],
                    },
                  ]}
                  value={{ status: statusFilter === "all" ? "" : statusFilter }}
                  onChange={(v) => setStatusFilter(v.status || "all")}
                />
              }
              rowInfo={(c) => ({
                createdBy: c.admins[0] ? `${c.admins[0].firstName} ${c.admins[0].lastName}` : "—",
                createdAt: c.createdAt,
              })}
              rowActions={[
                { label: "View Profile", icon: Eye, onClick: (c) => router.push(`/admin/clients/${c.id}`) },
                { label: "Remove", icon: Trash2, destructive: true, onClick: (c) => setDeleteClient(c) },
              ]}
              emptyState={{
                title: "No networks found",
                description: "Try adjusting your search or filter.",
              }}
            />
          </div>
        </main>

        <AlertDialog open={!!deleteClient} onOpenChange={(open) => !open && setDeleteClient(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Client</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{deleteClient?.name}</strong> and all its data? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AppSidePanel
          open={listPanel.open}
          onOpenChange={(open) => setListPanel((p) => ({ ...p, open }))}
          title={listPanel.title}
          description={listPanel.description}
          size="md"
        >
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {(() => {
              const q = listSearch.trim().toLowerCase();
              const visible = q
                ? listPanel.items.filter((i) => i.name.toLowerCase().includes(q) || (i.meta ?? "").toLowerCase().includes(q))
                : listPanel.items;
              if (visible.length === 0) {
                return <p className="text-sm text-muted-foreground text-center py-8">{listPanel.items.length === 0 ? "Nothing to show yet." : "No matches found."}</p>;
              }
              return (
                <>
                  <p className="text-xs text-muted-foreground">Showing {visible.length.toLocaleString()} of {listPanel.items.length.toLocaleString()}</p>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {visible.map((i) => (
                      <li key={i.id} className="flex items-center gap-3 px-3 py-2.5">
                        <AppAvatar name={i.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{i.name}</p>
                          {i.meta && <p className="text-xs text-muted-foreground truncate">{i.meta}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              );
            })()}
          </div>
        </AppSidePanel>
      </div>
    </ProtectedRoute>
  );
};

export default ClientManagement;
