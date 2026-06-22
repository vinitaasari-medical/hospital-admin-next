'use client';
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FolderOpen, Plus, Pencil, Trash2, Building2, Eye, Search,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTable,
  type DataTableColumn,
  AppModal,
  AppInput,
  AppSelect,
  AppStatCard,
  AppAvatar,
  StatusBadge,
  getStatusTone,
  FilterBar,
  appToast,
} from "@/components/common";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useConfirm } from "@/hooks/use-confirm";
import { type DepartmentRecord } from "@/data/departmentsMock";
import {
  listDepartments as fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartments,
  deleteDepartmentSingle,
  listUsersForPicker,
} from "@/lib/api/departments-api";

// ─── Utility: map raw API dept → DepartmentRecord ────────────────────────────

export const mapApiDept = (d: Record<string, unknown>): DepartmentRecord => {
  const headUser = d.head_user as Record<string, string> | null | undefined;
  return {
    id: d.id as string,
    departmentCode: (d.code as string) || "",
    name: (d.name as string) || "",
    description: "",
    type: (d.type as string) === "primary" ? "Primary" : "Sub-Department",
    parentId: (d.primary_department_id as string) || null,
    headName: headUser?.name || "",
    headUserId: headUser?.id || (d.head_user_id as string) || undefined,
    userCount: (d.user_count as number) ?? 0,
    users: [],
    groups: [],
    templates: [],
    createdAt: d.created_at
      ? new Date((d.created_at as number) * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "",
  };
};

// ─── Utility: map raw API user → CandidateUser ───────────────────────────────

export const mapApiUserToCandidateUser = (u: Record<string, unknown>): CandidateUser => ({
  id: u.id as string,
  name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
  email: (u.email as string) || "",
  staffId: (u.staff_id as string) || "",
  phone: (u.concat_cc_phone as string) || (u.phone_number as string) || "",
  jobTitle: (u.profession_name as string) || "",
  rank: (u.rank_name as string) || "",
  status: (u.status as string) === "approved" ? "Active" : "Pending",
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CandidateUser {
  id: string;
  name: string;
  email: string;
  staffId: string;
  phone: string;
  jobTitle: string;
  rank: string;
  status: "Active" | "Pending";
}

// Kept for any legacy references, but picker now loads from API
export const CANDIDATE_USERS: CandidateUser[] = [];

interface UserPickerModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (u: CandidateUser) => void;
  initialId?: string;
  title?: string;
}

// ─── UserPickerModal (API-driven) ─────────────────────────────────────────────

export const UserPickerModal = ({
  open,
  onOpenChange,
  onSelect,
  initialId,
  title = "Select Department Head",
}: UserPickerModalProps) => {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string>(initialId ?? "");
  const [users, setUsers] = useState<CandidateUser[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setPicked(initialId ?? "");
      setSearch("");
    }
  }, [open, initialId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const delay = setTimeout(
      async () => {
        setSearching(true);
        try {
          const res = await listUsersForPicker({ search_string: search || undefined });
          if (cancelled) return;
          const raw = (res.content?.data ?? []) as Array<Record<string, unknown>>;
          setUsers(raw.map(mapApiUserToCandidateUser));
        } catch {
          if (!cancelled) setUsers([]);
        } finally {
          if (!cancelled) setSearching(false);
        }
      },
      search ? 400 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(delay);
    };
  }, [search, open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.staffId.toLowerCase().includes(q),
    );
  }, [users, search]);

  const confirmPick = () => {
    const u = users.find((x) => x.id === picked);
    if (u) {
      onSelect(u);
      onOpenChange(false);
    }
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="full"
      contentClassName="[&>button.absolute]:hidden"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={confirmPick} disabled={!picked}>Select</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                {searching && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Searching…
                      </div>
                    </td>
                  </tr>
                )}
                {!searching && filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-border hover:bg-accent/30 cursor-pointer"
                    onClick={() => setPicked(u.id)}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={picked === u.id}
                        onCheckedChange={() => setPicked(u.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <AppAvatar name={u.name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.jobTitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge tone={getStatusTone(u.status)}>{u.status}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.email}</td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap">{u.staffId}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{u.rank}</td>
                  </tr>
                ))}
                {!searching && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppModal>
  );
};

// ─── HeadPickerField ──────────────────────────────────────────────────────────

interface HeadPickerFieldProps {
  head: CandidateUser | null;
  onPick: () => void;
  onClear: () => void;
}

export const HeadPickerField = ({ head, onPick, onClear }: HeadPickerFieldProps) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">Department Head</Label>
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center justify-between h-10 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent/40 transition"
    >
      {head ? (
        <div className="flex items-center gap-2 min-w-0">
          <AppAvatar name={head.name} size="xs" />
          <span className="font-medium text-foreground truncate">{head.name}</span>
          <span className="text-muted-foreground truncate">— {head.staffId}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">Choose Department Head</span>
      )}
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
    {head && (
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-muted-foreground hover:text-foreground underline"
      >
        Clear selection
      </button>
    )}
  </div>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface BlockedDuty {
  duty_id?: string;
  title: string;
  status?: string;
  publish_status?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { label: "Primary", value: "Primary" },
  { label: "Sub-Department", value: "Sub-Department" },
];

// ─── Departments page ─────────────────────────────────────────────────────────

const Departments = () => {
  const router = useRouter();
  const sidebarMargin = useSidebarMargin();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Record<string, string>>({ type: "all" });
  const addModal = useDisclosure();
  const editModal = useDisclosure();
  const [editing, setEditing] = useState<DepartmentRecord | null>(null);

  // Form state
  const [fName, setFName] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fType, setFType] = useState<"Primary" | "Sub-Department">("Primary");
  const [fParent, setFParent] = useState<string>("");
  const [fHead, setFHead] = useState<CandidateUser | null>(null);
  const pickerModal = useDisclosure();
  const [blockedDutiesDialog, setBlockedDutiesDialog] = useState<{ open: boolean; duties: BlockedDuty[] }>({ open: false, duties: [] });

  const navigateToDepartment = (d: DepartmentRecord) => {
    if (d.type === "Sub-Department") {
      localStorage.setItem("sub_department_id", d.id);
      localStorage.setItem("department_id", d.parentId || d.id);
      router.push(`/admin/departments/${d.parentId || d.id}/${d.id}`);
    } else {
      localStorage.setItem("department_id", d.id);
      localStorage.removeItem("sub_department_id");
      router.push(`/admin/departments/${d.id}`);
    }
  };

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchDepartments();
      const raw = (res.content?.data ?? []) as Array<Record<string, unknown>>;
      setDepartments(raw.map(mapApiDept));
    } catch {
      appToast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const resetForm = () => {
    setFName("");
    setFDescription("");
    setFType("Primary");
    setFParent("");
    setFHead(null);
  };

  const primaryOptions = useMemo(
    () =>
      departments
        .filter((d) => d.type === "Primary")
        .map((d) => ({ label: d.name, value: d.id })),
    [departments],
  );

  const filtered = useMemo(
    () => departments.filter((d) => filter.type === "all" || d.type === filter.type),
    [departments, filter],
  );

  // Group: each primary followed immediately by its sub-departments
  const groupedFiltered = useMemo(() => {
    if (filter.type !== "all") return filtered;
    const primaries = filtered.filter((d) => d.type === "Primary");
    const subs = filtered.filter((d) => d.type === "Sub-Department");
    const result: DepartmentRecord[] = [];
    for (const p of primaries) {
      result.push(p);
      subs.filter((s) => s.parentId === p.id).forEach((s) => result.push(s));
    }
    // orphaned subs whose parent isn't in this filtered set
    const placed = new Set(result.map((d) => d.id));
    subs.filter((s) => !placed.has(s.id)).forEach((s) => result.push(s));
    return result;
  }, [filtered, filter.type]);

  const openAdd = () => {
    resetForm();
    addModal.onOpen();
  };

  const openEdit = (d: DepartmentRecord) => {
    setEditing(d);
    setFName(d.name);
    setFDescription(d.description);
    setFType(d.type);
    setFParent(d.parentId ?? "");
    if (d.headName && d.headUserId) {
      setFHead({
        id: d.headUserId,
        name: d.headName,
        email: "",
        staffId: "",
        phone: "",
        jobTitle: "",
        rank: "",
        status: "Active",
      });
    } else {
      setFHead(null);
    }
    editModal.onOpen();
  };

  const handleAdd = async () => {
    if (!fName.trim()) return;
    setSaving(true);
    try {
      await createDepartment({
        name: fName.trim(),
        type: fType === "Primary" ? "primary" : "sub",
        ...(fType === "Sub-Department" && fParent ? { primary_department_id: fParent } : {}),
        ...(fHead ? { head_user_id: fHead.id } : {}),
      });
      addModal.onClose();
      appToast.success("Department created");
      await loadDepartments();
    } catch (err: unknown) {
      appToast.error((err as { message?: string })?.message ?? "Failed to create department");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editing || !fName.trim()) return;
    setSaving(true);
    try {
      await updateDepartment({
        department_id: editing.id,
        name: fName.trim(),
        ...(fHead ? { head_user_id: fHead.id } : {}),
      });
      editModal.onClose();
      appToast.success("Department updated");
      await loadDepartments();
    } catch (err: unknown) {
      appToast.error((err as { message?: string })?.message ?? "Failed to update department");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (d: DepartmentRecord) => {
    if (
      await confirm({
        title: "Remove department",
        description: `Remove ${d.name}? This cannot be undone.`,
        destructive: true,
        confirmLabel: "Remove",
      })
    ) {
      try {
        await deleteDepartmentSingle(d.id);
        appToast.success("Department removed");
        await loadDepartments();
      } catch (err: unknown) {
        const e = err as { code?: number; userMessage?: unknown; message?: string };
        if (e.code === 409) {
          const um = e.userMessage as { blocked_duties?: BlockedDuty[] } | undefined;
          setBlockedDutiesDialog({ open: true, duties: um?.blocked_duties ?? [] });
        } else {
          appToast.error(e.message ?? "Failed to remove department");
        }
      }
    }
  };

  const handleBulkRemove = async (rows: DepartmentRecord[]) => {
    if (
      await confirm({
        title: `Remove ${rows.length} department${rows.length > 1 ? "s" : ""}`,
        description: "This action cannot be undone.",
        destructive: true,
        confirmLabel: "Remove",
      })
    ) {
      try {
        await deleteDepartments(rows.map((r) => r.id));
        appToast.success(`${rows.length} department${rows.length > 1 ? "s" : ""} removed`);
        await loadDepartments();
      } catch (err: unknown) {
        appToast.error((err as { message?: string })?.message ?? "Failed to remove departments");
      }
    }
  };

  const counts = {
    total: departments.length,
    primary: departments.filter((d) => d.type === "Primary").length,
    sub: departments.filter((d) => d.type === "Sub-Department").length,
    members: departments.reduce((s, d) => s + (d.userCount ?? d.users.length), 0),
  };

  const columns: DataTableColumn<DepartmentRecord>[] = [
    {
      key: "name",
      header: "Department",
      sortable: true,
      searchable: true,
      accessor: (d) => d.name,
      cell: (d) => (
        <div className={`flex items-center gap-3 ${d.type === "Sub-Department" && filter.type === "all" ? "pl-7" : ""}`}>
          {d.type === "Sub-Department" && filter.type === "all" && (
            <span className="text-muted-foreground/60 select-none -ml-5 mr-1">↳</span>
          )}
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{d.name}</p>
            {d.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[260px]">{d.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      searchable: true,
      cell: (d) => (
        <StatusBadge tone={d.type === "Primary" ? "info" : "neutral"}>{d.type}</StatusBadge>
      ),
    },
    {
      key: "departmentCode",
      header: "Department ID",
      sortable: true,
      searchable: true,
      cell: (d) => <span className="text-sm font-mono text-foreground">{d.departmentCode}</span>,
    },
  ];

  return (
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
              <h1 className="text-2xl font-bold text-foreground">Departments</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage primary and sub-departments, members, channels, schedules and templates.
              </p>
            </div>
            <Button onClick={openAdd} className="gap-2" disabled={loading}>
              <Plus className="h-4 w-4" />
              Add Department
            </Button>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <AppStatCard label="Total Departments" value={counts.total} icon={FolderOpen} />
            <AppStatCard label="Primary" value={counts.primary} icon={Building2} />
            <AppStatCard label="Sub-Departments" value={counts.sub} icon={Building2} />
            <AppStatCard label="Total Members" value={counts.members} icon={FolderOpen} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <DataTable<DepartmentRecord>
              columns={columns}
              data={groupedFiltered}
              rowKey={(d) => d.id}
              searchPlaceholder="Search by name or ID..."
              onRowClick={navigateToDepartment}
              rowInfo={(d) => ({
                createdBy: "Super Admin",
                createdAt: d.createdAt,
              })}
              selectable
              bulkActions={[
                { label: "Delete selected", icon: Trash2, destructive: true, onClick: handleBulkRemove },
              ]}
              toolbar={
                <FilterBar
                  filters={[
                    {
                      key: "type",
                      label: "Type",
                      width: 180,
                      options: TYPE_OPTIONS,
                    },
                  ]}
                  value={filter}
                  onChange={setFilter}
                />
              }
              rowActions={[
                { label: "View", icon: Eye, onClick: navigateToDepartment },
                { label: "Edit", icon: Pencil, onClick: openEdit },
                { label: "Remove", icon: Trash2, destructive: true, onClick: handleRemove },
              ]}
              emptyState={{
                title: "No departments found",
                description: "Try adjusting your search or filter.",
              }}
            />
          )}
        </div>
      </main>

      {/* Add Department */}
      <AppModal
        open={addModal.open}
        onOpenChange={addModal.setOpen}
        title="Add Department"
        description="Add a new primary or sub-department."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={addModal.onClose} disabled={saving}>Cancel</Button>
            <Button
              onClick={handleAdd}
              disabled={saving || !fName.trim() || (fType === "Sub-Department" && !fParent)}
            >
              {saving ? "Adding…" : "Add"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <AppInput
            label="Department Name"
            required
            value={fName}
            onChange={(e) => setFName(e.target.value)}
            placeholder="e.g. Cardiology"
            maxLength={100}
          />
          <AppInput
            label="Description"
            value={fDescription}
            onChange={(e) => setFDescription(e.target.value)}
            placeholder="Brief description"
            maxLength={255}
          />
          <AppSelect
            label="Type"
            required
            value={fType}
            onValueChange={(v) => setFType(v as "Primary" | "Sub-Department")}
            options={TYPE_OPTIONS}
          />
          {fType === "Sub-Department" && (
            <AppSelect
              label="Parent Department"
              required
              value={fParent}
              onValueChange={setFParent}
              options={primaryOptions}
              placeholder="Select primary department"
            />
          )}
          <HeadPickerField head={fHead} onPick={pickerModal.onOpen} onClear={() => setFHead(null)} />
        </div>
      </AppModal>

      {/* Edit Department */}
      <AppModal
        open={editModal.open}
        onOpenChange={editModal.setOpen}
        title="Edit Department"
        description="Update department details."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={editModal.onClose} disabled={saving}>Cancel</Button>
            <Button
              onClick={handleEdit}
              disabled={saving || !fName.trim() || (fType === "Sub-Department" && !fParent)}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <AppInput
            label="Department Name"
            required
            value={fName}
            onChange={(e) => setFName(e.target.value)}
            maxLength={100}
          />
          <AppInput
            label="Description"
            value={fDescription}
            onChange={(e) => setFDescription(e.target.value)}
            maxLength={255}
          />
          <AppSelect
            label="Type"
            required
            value={fType}
            onValueChange={(v) => setFType(v as "Primary" | "Sub-Department")}
            options={TYPE_OPTIONS}
          />
          {fType === "Sub-Department" && (
            <AppSelect
              label="Parent Department"
              required
              value={fParent}
              onValueChange={setFParent}
              options={primaryOptions.filter((o) => o.value !== editing?.id)}
              placeholder="Select primary department"
            />
          )}
          <HeadPickerField head={fHead} onPick={pickerModal.onOpen} onClear={() => setFHead(null)} />
        </div>
      </AppModal>

      <UserPickerModal
        open={pickerModal.open}
        onOpenChange={pickerModal.setOpen}
        initialId={fHead?.id}
        onSelect={(u) => setFHead(u)}
      />

      {/* Blocked duties error — shown when ext/deletedepartment returns 409 */}
      <AppModal
        open={blockedDutiesDialog.open}
        onOpenChange={(o) => setBlockedDutiesDialog((prev) => ({ ...prev, open: o }))}
        title="Cannot Delete Department"
        description="One or more duties have ongoing shifts with assigned users. Remove all user assignments from the listed duties and try again."
        size="md"
        footer={
          <Button onClick={() => setBlockedDutiesDialog({ open: false, duties: [] })}>OK</Button>
        }
      >
        {blockedDutiesDialog.duties.length > 0 && (
          <div className="space-y-2 mt-2">
            {blockedDutiesDialog.duties.map((duty, i) => (
              <div
                key={duty.duty_id ?? i}
                className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5"
              >
                <span className="font-medium text-sm">{duty.title}</span>
                <div className="flex gap-2">
                  {duty.status && (
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                      {duty.status}
                    </span>
                  )}
                  {duty.publish_status && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      {duty.publish_status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AppModal>
    </div>
  );
};

export default Departments;
