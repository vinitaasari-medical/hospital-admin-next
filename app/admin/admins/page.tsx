'use client';
import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import { Users, Shield, Plus, Pencil, Trash2, Search, KeyRound, Ban, CheckCircle2, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DataTable,
  type DataTableColumn,
  AppModal,
  AppInput,
  AppSelect,
  AppStatCard,
  AppAvatar,
  AppBadge,
  StatusBadge,
  getStatusTone,
  FilterBar,
  appToast,
} from "@/components/common";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useConfirm } from "@/hooks/use-confirm";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmins,
  resetAdminPassword,
  listPortalPages,
  listDepartments,
  listAdminCandidates,
  listSubnetworks,
  type AdminRecord,
  type PortalPage,
  type DeptItem,
  type ApiCandidateUser,
} from "@/lib/api/admins-api";

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminType = "Cluster" | "Department" | "Sub-Network";

interface Admin {
  id: string;
  name: string;
  email: string;
  adminType: AdminType;
  staffId: string;
  jobTitle: string;
  network: string;
  privileges: string[];
  status: "Active" | "Suspended";
  avatar: string;
  createdBy?: string;
  createdAt?: string;
}

interface CandidateUser {
  id: string;
  name: string;
  email: string;
  staffId: string;
  phone: string;
  jobTitle: string;
  rank: string;
  status: "Active" | "Pending";
  isAlreadyAdmin?: boolean;
}

interface NetworkItem {
  id: string;
  name: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { label: "Cluster", value: "Cluster" },
  { label: "Department", value: "Department" },
  { label: "Sub-Network", value: "Sub-Network" },
];

const ADMIN_TYPE_FILTER_MAP: Record<string, string> = {
  "Sub-Network": "network",
  Cluster: "cluster",
  Department: "department",
};

const ADMIN_TYPE_DISPLAY_MAP: Record<string, AdminType> = {
  cluster: "Cluster",
  subnetwork: "Sub-Network",
  department: "Department",
  network: "Sub-Network",
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapApiAdmin(row: AdminRecord): Admin {
  const first = row.first_name ?? "";
  const last = row.last_name ?? "";
  return {
    id: row.id,
    name: `${first} ${last}`.trim(),
    email: row.email ?? "",
    adminType: ADMIN_TYPE_DISPLAY_MAP[row.admin_type] ?? "Cluster",
    staffId: row.staff_id ?? "",
    jobTitle: row.profession_name ?? "",
    network: row.subnetwork_ids?.[0] ?? row.network_id ?? "",
    privileges: row.page_ids ?? [],
    status: row.status === "approved" ? "Active" : "Suspended",
    avatar: `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase(),
    createdBy: row.created_by ?? "",
    createdAt: row.created_at ? new Date(row.created_at * 1000).toISOString() : "",
  };
}

function mapApiCandidateUser(row: ApiCandidateUser): CandidateUser {
  return {
    id: row.id,
    name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
    email: row.email ?? "",
    staffId: row.staff_id ?? "",
    phone:
      row.country_code && row.phone_number
        ? `${row.country_code} ${row.phone_number}`
        : row.phone_number ?? "",
    jobTitle: row.profession_name ?? "",
    rank: row.rank_name ?? "",
    status: row.status === "pending" ? "Pending" : "Active",
    isAlreadyAdmin: row.exists_hospital_admin_with_same_email ?? false,
  };
}

const typeVariant = (t: AdminType) =>
  t === "Cluster" ? "default" : t === "Sub-Network" ? "secondary" : "outline";

// ─── AdminForm ────────────────────────────────────────────────────────────────

interface AdminFormProps {
  // Network
  networkIds: string[];
  toggleNetwork: (id: string) => void;
  allNetworks: boolean;
  setAllNetworks: (v: boolean) => void;
  networkList: NetworkItem[];
  // User
  userId: string;
  selectedUser: CandidateUser | null;
  onPickUser: () => void;
  // Basic fields
  jobTitle: string;
  setJobTitle: (v: string) => void;
  email: string;
  // Privileges
  privileges: string[];
  setPrivileges: (v: string[]) => void;
  togglePrivilege: (id: string) => void;
  privilegePages: PortalPage[];
  manageNetwork: boolean;
  setManageNetwork: (v: boolean) => void;
  // Departments (sub-admin)
  isDepartmentSelect: boolean;
  setIsDepartmentSelect: (v: boolean) => void;
  departmentIds: string[];
  toggleDepartment: (id: string) => void;
  departmentList: DeptItem[];
  // Context
  isSub: boolean;
}

const AdminForm = ({
  networkIds,
  toggleNetwork,
  allNetworks,
  setAllNetworks,
  networkList,
  userId,
  jobTitle,
  setJobTitle,
  email,
  privileges,
  setPrivileges,
  togglePrivilege,
  privilegePages,
  manageNetwork,
  setManageNetwork,
  isDepartmentSelect,
  setIsDepartmentSelect,
  departmentIds,
  toggleDepartment,
  departmentList,
  onPickUser,
  selectedUser,
  isSub,
}: AdminFormProps) => {
  // Mirror React's page filtering logic exactly
  const filteredPages = privilegePages.filter((page) => {
    if (allNetworks && page.page === "Department") return false;
    if (page.page === "Network" && (isSub || !allNetworks)) return false;
    return true;
  });

  const privilegeSummary = React.useMemo(() => {
    if (manageNetwork) return "Manage All";
    if (isDepartmentSelect) return "Manage Specific Department";
    if (privileges.length > 0) {
      return privileges.length === filteredPages.length && filteredPages.length > 0
        ? "All Pages"
        : `${privileges.length} page${privileges.length > 1 ? "s" : ""} selected`;
    }
    return "";
  }, [manageNetwork, isDepartmentSelect, privileges, filteredPages]);

  return (
    <div className="space-y-4">

      {/* Network multi-select — hidden for sub-admins */}
      {!isSub && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Select Network <span className="text-destructive">*</span>
          </Label>
          <div className="rounded-md border border-input bg-background p-3 space-y-2 max-h-48 overflow-y-auto">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={allNetworks}
                onCheckedChange={() => setAllNetworks(!allNetworks)}
              />
              <span className="font-medium">All</span>
            </label>
            {networkList.length > 0 && (
              <div className="border-t border-border pt-2 space-y-1.5">
                {networkList.map((n) => (
                  <label key={n.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={allNetworks || networkIds.includes(n.id)}
                      disabled={allNetworks}
                      onCheckedChange={() => toggleNetwork(n.id)}
                    />
                    <span>{n.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User picker */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </Label>
        <button
          type="button"
          onClick={onPickUser}
          className="flex w-full items-center justify-between h-10 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent/40 transition"
        >
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <AppAvatar name={selectedUser.name} size="xs" />
              <span className="font-medium text-foreground">{selectedUser.name}</span>
              <span className="text-muted-foreground">— {selectedUser.staffId}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Choose Admin</span>
          )}
          <Search className="h-4 w-4 text-muted-foreground" />
        </button>
        <p className="text-xs text-muted-foreground">
          *Administrator roles can only be assigned to users who have a valid email address.
        </p>
      </div>

      <AppInput
        label="Job Title"
        required
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
        placeholder="Job Title"
      />

      <AppInput
        label="Email"
        required
        type="email"
        value={email}
        onChange={() => {}}
        placeholder="Email"
        disabled={!!userId}
      />

      {/* Privilege section — Popover menu */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Select Privileges <span className="text-destructive">*</span>
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between h-10 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent/40 transition"
            >
              {privilegeSummary ? (
                <span className="text-foreground">{privilegeSummary}</span>
              ) : (
                <span className="text-muted-foreground">Select privileges…</span>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="p-3"
            style={{ width: "var(--radix-popover-trigger-width)" }}
          >
            <div className="max-h-64 overflow-y-auto">

              {/* CLUSTER: Manage All → divider → All Pages */}
              {!isSub && (
                <>
                  <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
                    <Checkbox
                      checked={manageNetwork}
                      onCheckedChange={() => {
                        const next = !manageNetwork;
                        setManageNetwork(next);
                        if (next) {
                          setPrivileges([]);
                          setIsDepartmentSelect(false);
                        }
                      }}
                    />
                    <span className="font-medium">Manage All</span>
                  </label>
                  <div className="border-t border-border mb-2" />
                </>
              )}

              {/* SUB-NETWORK: Manage Specific Department → divider → All Pages */}
              {isSub && (
                <>
                  <label
                    className={`flex items-center gap-2 text-sm cursor-pointer mb-2 ${
                      privileges.length > 0 ? "opacity-40" : ""
                    }`}
                  >
                    <Checkbox
                      checked={isDepartmentSelect}
                      onCheckedChange={() => {
                        const next = !isDepartmentSelect;
                        setIsDepartmentSelect(next);
                        if (next) {
                          setPrivileges([]);
                          setManageNetwork(false);
                        } else {
                          toggleDepartment("__clear__");
                        }
                      }}
                    />
                    <span className="font-medium">Manage Specific Department</span>
                  </label>
                  <div className="border-t border-border mb-2" />
                </>
              )}

              {/* All Pages — for both cluster and sub-network */}
              <p className="text-xs text-muted-foreground mb-1.5 opacity-60">All Pages</p>
              <div className="space-y-1">
                {filteredPages.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-start gap-2 text-sm rounded py-1 px-1 ${
                      manageNetwork || isDepartmentSelect
                        ? "opacity-60 cursor-not-allowed"
                        : "cursor-pointer hover:bg-accent/20"
                    }`}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={manageNetwork ? true : (!isDepartmentSelect && privileges.includes(p.id))}
                      disabled={isDepartmentSelect}
                      onCheckedChange={() => {
                        if (!manageNetwork && !isDepartmentSelect) togglePrivilege(p.id);
                      }}
                    />
                    <div>
                      <p>{p.page}</p>
                      {p.description && (
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Department multi-select — sub-admin only, when isDepartmentSelect */}
      {isSub && isDepartmentSelect && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Select Department <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between h-10 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent/40 transition"
              >
                {departmentIds.length > 0 ? (
                  <span className="text-foreground">
                    {departmentIds.length === 1
                      ? departmentList.find((d) => d.id === departmentIds[0])?.name ?? "1 selected"
                      : `${departmentIds.length} departments selected`}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select departments…</span>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="p-3"
              style={{ width: "var(--radix-popover-trigger-width)" }}
            >
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {departmentList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No departments found</p>
                ) : (
                  departmentList.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer rounded py-1 px-1 hover:bg-accent/20">
                      <Checkbox
                        checked={departmentIds.includes(d.id)}
                        onCheckedChange={() => toggleDepartment(d.id)}
                      />
                      <span>{d.name}</span>
                    </label>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

// ─── UserPickerModal ──────────────────────────────────────────────────────────

interface UserPickerModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (u: CandidateUser) => void;
  initialId?: string;
  users: CandidateUser[];
  loading?: boolean;
  onSearchChange?: (q: string) => void;
}

const UserPickerModal = ({
  open,
  onOpenChange,
  onSelect,
  initialId,
  users,
  loading,
  onSearchChange,
}: UserPickerModalProps) => {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string>(initialId ?? "");

  React.useEffect(() => {
    if (open) {
      setPicked(initialId ?? "");
      setSearch("");
    }
  }, [open, initialId]);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    onSearchChange?.(q);
  };

  const confirm = () => {
    const u = users.find((x) => x.id === picked);
    if (u) onSelect(u);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Select Admin"
      size="full"
      contentClassName="[&>button.absolute]:hidden"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!picked}>
            Add
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, email, phone number or staff id"
            className="h-11 w-full rounded-full border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="px-4 py-3 w-12 whitespace-nowrap">Select</th>
                  <th className="px-4 py-3 whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap">Mobile Number</th>
                  <th className="px-4 py-3 whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 whitespace-nowrap">Staff ID</th>
                  <th className="px-4 py-3 whitespace-nowrap">Rank</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className={`border-t border-border ${
                        u.isAlreadyAdmin
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-accent/30 cursor-pointer"
                      }`}
                      onClick={() => !u.isAlreadyAdmin && setPicked(u.id)}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={picked === u.id}
                          disabled={u.isAlreadyAdmin}
                          onCheckedChange={() => !u.isAlreadyAdmin && setPicked(u.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <AppAvatar name={u.name} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.isAlreadyAdmin ? (
                                <span className="text-destructive font-medium">Already Admin</span>
                              ) : (
                                u.jobTitle
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge tone={getStatusTone(u.status)}>{u.status}</StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {u.phone}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 font-mono whitespace-nowrap">{u.staffId}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{u.rank}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppModal>
  );
};

// ─── AdminManagement ──────────────────────────────────────────────────────────

const AdminManagement = () => {
  const sidebarMargin = useSidebarMargin();

  const isSub =
    typeof window !== "undefined" && localStorage.getItem("sub") === "true";

  // ── Admin list ──
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [rawAdmins, setRawAdmins] = useState<AdminRecord[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);

  // ── Reference data ──
  const [portalPages, setPortalPages] = useState<PortalPage[]>([]);
  const [networkList, setNetworkList] = useState<NetworkItem[]>([]);
  const [departmentList, setDepartmentList] = useState<DeptItem[]>([]);

  // ── Filters ──
  const [typeFilter, setTypeFilter] = useState<Record<string, string>>({
    adminType: "all",
    status: "all",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Modals ──
  const addModal = useDisclosure();
  const editModal = useDisclosure();
  const pickerModal = useDisclosure();
  const [editing, setEditing] = useState<AdminRecord | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  // ── Form state ──
  const [fNetworkIds, setFNetworkIds] = useState<string[]>([]);
  const [fAllNetworks, setFAllNetworks] = useState(false);
  const [fUserId, setFUserId] = useState("");
  const [fJobTitle, setFJobTitle] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPrivileges, setFPrivileges] = useState<string[]>([]);
  const [fManageNetwork, setFManageNetwork] = useState(false);
  const [fIsDepartmentSelect, setFIsDepartmentSelect] = useState(false);
  const [fDepartmentIds, setFDepartmentIds] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CandidateUser | null>(null);

  // ── User picker ──
  const [candidateUsers, setCandidateUsers] = useState<CandidateUser[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const pickerSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Fetch admins ────────────────────────────────────────────────────────────

  const fetchAdmins = useCallback(
    async (refresh = false) => {
      setAdminsLoading(true);
      try {
        const statusVal =
          typeFilter.status !== "all"
            ? typeFilter.status === "Active"
              ? "approved"
              : "suspended"
            : undefined;
        const adminTypeVal =
          typeFilter.adminType !== "all"
            ? ADMIN_TYPE_FILTER_MAP[typeFilter.adminType]
            : undefined;

        const res = await listAdmins({
          next_token: null,
          status: statusVal,
          admin_type: adminTypeVal,
          search_string: searchQuery || undefined,
        });

        const data = (res.content?.data ?? []) as AdminRecord[];
        const mapped = data.map(mapApiAdmin);

        if (refresh) {
          setAdmins(mapped);
          setRawAdmins(data);
        } else {
          setAdmins((prev) => [...prev, ...mapped]);
          setRawAdmins((prev) => [...prev, ...data]);
        }
      } catch (err: unknown) {
        const e = err as { message?: string };
        appToast.error("Failed to load admins", { description: e?.message });
      } finally {
        setAdminsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeFilter.status, typeFilter.adminType, searchQuery]
  );

  // ─── Fetch candidate users ────────────────────────────────────────────────────

  const fetchCandidates = useCallback(async (search: string) => {
    setCandidateLoading(true);
    try {
      const res = await listAdminCandidates({ search_string: search || undefined });
      const data = (res.content?.data ?? []) as ApiCandidateUser[];
      setCandidateUsers(data.map(mapApiCandidateUser));
    } catch {
      // silently fail
    } finally {
      setCandidateLoading(false);
    }
  }, []);

  // ─── Initial data load ───────────────────────────────────────────────────────

  useEffect(() => {
    listPortalPages()
      .then((res) => {
        const raw = res.content?.data as Record<string, unknown> | undefined;
        setPortalPages(((raw?.data ?? []) as PortalPage[]));
      })
      .catch(() => {});

    listSubnetworks()
      .then((res) => setNetworkList((res.content?.data ?? []) as NetworkItem[]))
      .catch(() => {});

    if (isSub) {
      listDepartments()
        .then((res) => setDepartmentList((res.content?.data ?? []) as DeptItem[]))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAdmins(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter.status, typeFilter.adminType]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => fetchAdmins(true), 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // ─── Form helpers ─────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFNetworkIds([]);
    setFAllNetworks(false);
    setFUserId("");
    setFJobTitle("");
    setFEmail("");
    setFPrivileges([]);
    setFManageNetwork(false);
    setFIsDepartmentSelect(false);
    setFDepartmentIds([]);
    setSelectedUser(null);
  };

  const openAdd = () => {
    resetForm();
    addModal.onOpen();
  };

  const openEdit = (a: Admin) => {
    const raw = rawAdmins.find((r) => r.id === a.id);
    if (!raw) return;
    setEditing(raw);
    setFNetworkIds(raw.subnetwork_ids ?? []);
    setFAllNetworks(raw.has_all_cluster === 1);
    setFManageNetwork(raw.has_manage_network === 1);
    const hasDepts = !!(raw.department_ids?.length);
    setFIsDepartmentSelect(hasDepts);
    setFDepartmentIds(raw.department_ids ?? []);
    setFUserId("");
    setSelectedUser(null);
    setFJobTitle(raw.profession_name ?? "");
    setFEmail(raw.email ?? "");
    // When manage_network was set, page_ids won't be meaningful — keep empty for the checkboxes
    setFPrivileges(raw.has_manage_network === 1 ? [] : (raw.page_ids ?? []));
    editModal.onOpen();
  };

  const togglePriv = (id: string) =>
    setFPrivileges((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleNetwork = (id: string) =>
    setFNetworkIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // toggleDepartment also handles the "__clear__" sentinel from the sub-admin form
  const toggleDept = (id: string) => {
    if (id === "__clear__") {
      setFDepartmentIds([]);
      return;
    }
    setFDepartmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ─── Validation ───────────────────────────────────────────────────────────────

  const addFormValid =
    !!fUserId &&
    !!fJobTitle &&
    (fManageNetwork || fIsDepartmentSelect || fPrivileges.length > 0);

  const editFormValid =
    !!fJobTitle &&
    (fManageNetwork || fIsDepartmentSelect || fPrivileges.length > 0);

  // ─── CRUD handlers ────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addFormValid) return;
    setFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        user_id: fUserId,
        profession_name: fJobTitle,
      };
      if (!isSub) {
        if (fAllNetworks) {
          body.all_cluster = 1;
        } else if (fNetworkIds.length > 0) {
          body.subnetwork_ids = fNetworkIds;
        }
      }
      if (fManageNetwork) {
        body.manage_network = 1;
      } else if (fIsDepartmentSelect) {
        body.department_ids = fDepartmentIds;
      } else {
        body.portal_page_ids = fPrivileges;
      }
      await createAdmin(body);
      appToast.success("Admin added successfully");
      addModal.onClose();
      fetchAdmins(true);
    } catch (err: unknown) {
      const e = err as { message?: string; userMessage?: string };
      appToast.error("Failed to add admin", {
        description: e?.userMessage || e?.message,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editing || !editFormValid) return;
    setFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        admin_id: editing.id,
        profession_name: fJobTitle,
      };
      if (!isSub) {
        if (fAllNetworks) {
          body.all_cluster = 1;
        } else {
          body.subnetwork_ids =
            fNetworkIds.length > 0 ? fNetworkIds : [...(editing.subnetwork_ids ?? [])];
        }
      }
      if (fManageNetwork) {
        body.manage_network = 1;
      } else if (fIsDepartmentSelect) {
        body.department_ids = fDepartmentIds;
      } else {
        body.portal_page_ids = fPrivileges;
      }
      await updateAdmin(body);
      appToast.success("Admin updated successfully");
      editModal.onClose();
      fetchAdmins(true);
    } catch (err: unknown) {
      const e = err as { message?: string; userMessage?: string };
      appToast.error("Failed to update admin", {
        description: e?.userMessage || e?.message,
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteFromEdit = async () => {
    if (!editing) return;
    if (
      await confirm({
        title: "Delete admin",
        description: `Delete ${editing.first_name} ${editing.last_name}? This cannot be undone.`,
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteAdmins([editing.id]);
        appToast.success("Admin deleted");
        editModal.onClose();
        fetchAdmins(true);
      } catch (err: unknown) {
        const e = err as { message?: string };
        appToast.error("Failed to delete admin", { description: e?.message });
      }
    }
  };

  const handleRemove = async (a: Admin) => {
    if (
      await confirm({
        title: "Remove admin",
        description: `Remove ${a.name}? This cannot be undone.`,
        destructive: true,
        confirmLabel: "Remove",
      })
    ) {
      try {
        await deleteAdmins([a.id]);
        appToast.success("Admin removed");
        fetchAdmins(true);
      } catch (err: unknown) {
        const e = err as { message?: string };
        appToast.error("Failed to remove admin", { description: e?.message });
      }
    }
  };

  const handleBulkRemove = async (rows: Admin[]) => {
    if (
      await confirm({
        title: `Remove ${rows.length} admin${rows.length > 1 ? "s" : ""}`,
        description: "This action cannot be undone.",
        destructive: true,
        confirmLabel: "Remove",
      })
    ) {
      try {
        await deleteAdmins(rows.map((r) => r.id));
        appToast.success(`${rows.length} admin${rows.length > 1 ? "s" : ""} removed`);
        fetchAdmins(true);
      } catch (err: unknown) {
        const e = err as { message?: string };
        appToast.error("Failed to remove admins", { description: e?.message });
      }
    }
  };

  const handleSuspendToggle = async (a: Admin) => {
    const suspending = a.status === "Active";
    if (
      await confirm({
        title: suspending ? "Suspend admin" : "Reactivate admin",
        description: suspending
          ? `Suspend ${a.name}? They will lose access until reactivated.`
          : `Reactivate ${a.name}?`,
        destructive: suspending,
        confirmLabel: suspending ? "Suspend" : "Reactivate",
      })
    ) {
      try {
        await updateAdmin({
          admin_id: a.id,
          status: suspending ? "suspended" : "approved",
        });
        appToast.success(suspending ? "Admin suspended" : "Admin reactivated");
        fetchAdmins(true);
      } catch (err: unknown) {
        const e = err as { message?: string };
        appToast.error("Action failed", { description: e?.message });
      }
    }
  };

  const handleResetPassword = async (a: Admin) => {
    if (
      !(await confirm({
        title: "Reset password",
        description: `Send a password reset email to ${a.email}?`,
        confirmLabel: "Send email",
      }))
    )
      return;
    try {
      await resetAdminPassword(a.email);
      appToast.success("Reset email sent", {
        description: `A password reset email was sent to ${a.email}.`,
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Failed", { description: e?.message });
    }
  };

  // ─── Picker handler ───────────────────────────────────────────────────────────

  const openPicker = () => {
    fetchCandidates("");
    pickerModal.onOpen();
  };

  const handlePickerSearch = (q: string) => {
    if (pickerSearchTimer.current) clearTimeout(pickerSearchTimer.current);
    pickerSearchTimer.current = setTimeout(() => fetchCandidates(q), 300);
  };

  // ─── Computed ────────────────────────────────────────────────────────────────

  const counts = {
    total: admins.length,
    active: admins.filter((a) => a.status === "Active").length,
    clusterAdmins: admins.filter((a) => a.adminType === "Cluster").length,
  };

  const columns: DataTableColumn<Admin>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      searchable: true,
      accessor: (a) => a.name,
      cell: (a) => (
        <div className="flex items-center gap-3">
          <AppAvatar name={a.name} initials={a.avatar} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{a.name}</p>
            {a.jobTitle && (
              <p className="text-xs text-muted-foreground truncate">{a.jobTitle}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "adminType",
      header: "Admin Type",
      sortable: true,
      searchable: true,
      cell: (a) => (
        <AppBadge variant={typeVariant(a.adminType)}>{a.adminType}</AppBadge>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      searchable: true,
      cell: (a) => (
        <span className="text-sm text-muted-foreground">{a.email}</span>
      ),
    },
    {
      key: "staffId",
      header: "Staff ID",
      sortable: true,
      searchable: true,
      hideOnMobile: true,
      cell: (a) => (
        <span className="text-sm font-mono text-foreground">{a.staffId || "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      hideOnMobile: true,
      cell: (a) => (
        <StatusBadge tone={getStatusTone(a.status)}>{a.status}</StatusBadge>
      ),
    },
  ];

  // ─── Shared form props ───────────────────────────────────────────────────────

  const sharedFormProps: AdminFormProps = {
    networkIds: fNetworkIds,
    toggleNetwork,
    allNetworks: fAllNetworks,
    setAllNetworks: setFAllNetworks,
    networkList,
    userId: fUserId,
    jobTitle: fJobTitle,
    setJobTitle: setFJobTitle,
    email: fEmail,
    privileges: fPrivileges,
    setPrivileges: setFPrivileges,
    togglePrivilege: togglePriv,
    privilegePages: portalPages,
    manageNetwork: fManageNetwork,
    setManageNetwork: setFManageNetwork,
    isDepartmentSelect: fIsDepartmentSelect,
    setIsDepartmentSelect: setFIsDepartmentSelect,
    departmentIds: fDepartmentIds,
    toggleDepartment: toggleDept,
    departmentList,
    onPickUser: openPicker,
    selectedUser,
    isSub,
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar items={adminSidebarItems} />
        {confirmDialog}

        <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
            >
              <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Management</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage administrator accounts and permissions.
                </p>
              </div>
              <Button onClick={openAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Admin
              </Button>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <AppStatCard label="Total Admins" value={counts.total} icon={Shield} />
              <AppStatCard label="Active Now" value={counts.active} icon={Users} />
              <AppStatCard label="Cluster Admins" value={counts.clusterAdmins} icon={Shield} />
            </div>

            <DataTable<Admin>
              columns={columns}
              data={admins}
              rowKey={(a) => a.id}
              loading={adminsLoading}
              searchPlaceholder="Search admins..."
              onSearchChange={setSearchQuery}
              rowInfo={(a) => ({
                createdBy: a.createdBy ?? "",
                createdAt: a.createdAt ?? "",
              })}
              selectable
              bulkActions={[
                {
                  label: "Delete selected",
                  icon: Trash2,
                  destructive: true,
                  onClick: handleBulkRemove,
                },
              ]}
              toolbar={
                <FilterBar
                  filters={[
                    {
                      key: "adminType",
                      label: "Admin Type",
                      width: 180,
                      options: TYPE_OPTIONS,
                    },
                    {
                      key: "status",
                      label: "Status",
                      width: 160,
                      options: [
                        { label: "Active", value: "Active" },
                        { label: "Suspended", value: "Suspended" },
                      ],
                    },
                  ]}
                  value={typeFilter}
                  onChange={setTypeFilter}
                />
              }
              rowActions={[
                { label: "Edit", icon: Pencil, onClick: openEdit },
                { label: "Reset password", icon: KeyRound, onClick: handleResetPassword },
                {
                  label: "Suspend",
                  icon: Ban,
                  onClick: handleSuspendToggle,
                  hidden: (a) => a.status !== "Active",
                },
                {
                  label: "Reactivate",
                  icon: CheckCircle2,
                  onClick: handleSuspendToggle,
                  hidden: (a) => a.status !== "Suspended",
                },
                {
                  label: "Remove",
                  icon: Trash2,
                  destructive: true,
                  onClick: handleRemove,
                },
              ]}
              emptyState={{
                title: "No admins found",
                description: "Try adjusting your search or filter.",
              }}
            />
          </div>
        </main>

        {/* ── Add Admin Modal ──────────────────────────────────────────────── */}
        <AppModal
          open={addModal.open}
          onOpenChange={addModal.setOpen}
          title="Add Admin"
          description="Assign administrator privileges to an existing user."
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={addModal.onClose}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!addFormValid || formLoading}>
                {formLoading ? "Adding…" : "Add"}
              </Button>
            </>
          }
        >
          <AdminForm {...sharedFormProps} />
        </AppModal>

        {/* ── Edit Admin Modal ─────────────────────────────────────────────── */}
        <AppModal
          open={editModal.open}
          onOpenChange={editModal.setOpen}
          title="Edit Admin"
          description="Update administrator details."
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDeleteFromEdit}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete Admin
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={editModal.onClose}>
                  Cancel
                </Button>
                <Button onClick={handleEdit} disabled={!editFormValid || formLoading}>
                  {formLoading ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          }
        >
          <AdminForm {...sharedFormProps} />
        </AppModal>

        {/* ── User Picker Modal ────────────────────────────────────────────── */}
        <UserPickerModal
          open={pickerModal.open}
          onOpenChange={pickerModal.setOpen}
          initialId={fUserId}
          users={candidateUsers}
          loading={candidateLoading}
          onSearchChange={handlePickerSearch}
          onSelect={(u) => {
            setFUserId(u.id);
            setFEmail(u.email);
            setSelectedUser(u);
            if (!fJobTitle) setFJobTitle(u.jobTitle);
            pickerModal.onClose();
          }}
        />
      </div>
    </ProtectedRoute>
  );
};

export default AdminManagement;
