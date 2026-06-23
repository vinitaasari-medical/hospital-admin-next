'use client';
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { validateRouteParam } from "@/lib/utils/params";
import { motion } from "framer-motion";
import {
  ArrowLeft, Users as UsersIcon, Radio, CalendarClock, Building2,
  Search, Plus, Info, CalendarDays, LayoutDashboard, FileText, Trash2,
  Upload, ImageIcon, X, Pencil,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";

import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import { type DepartmentRecord, type DepartmentUser, type OfficialGroup } from "@/data/departmentsMock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DataTable,
  type DataTableColumn,
  AppModal,
  FilterBar,
  appToast,
  AppAvatar,
  StatusBadge,
  getStatusTone,
} from "@/components/common";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useConfirm } from "@/hooks/use-confirm";
import {
  UserPickerModal,
  HeadPickerField,
  type CandidateUser,
  mapApiDept,
} from "@/app/admin/departments/page";
import {
  listDepartments as fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartments,
  listDepartmentUsers,
  addDepartmentUsers,
  removeDepartmentUsers,
  removeUserFromDepartment,
  listOfficialGroups,
  createOfficialGroup,
  editOfficialGroup,
  deleteOfficialGroups,
  listUsersForPicker,
  listDuties,
  deleteStaffingDuty,
  listDutyTemplates,
} from "@/lib/api/departments-api";
import { awsLinkGenerateImage, gcsFileUpload } from "@/lib/api/file-uploader";

// ─── Utility mappers ──────────────────────────────────────────────────────────

const mapApiUserToDeptUser = (u: Record<string, unknown>): DepartmentUser => ({
  id: u.id as string,
  name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
  email: (u.email as string) || "",
  phone: (u.concat_cc_phone as string) || (u.phone_number as string) || "",
  profession: (u.profession_name as string) || "",
  rank: (u.rank_name as string) || "",
  avatar: `${String(u.first_name ?? "").charAt(0)}${String(u.last_name ?? "").charAt(0)}`.toUpperCase(),
  status: (u.status as string) === "approved" ? "Active" : "Pending",
  isMapped: (u.is_mapped_to_department as number) === 1,
});

const mapApiGroup = (g: Record<string, unknown>): OfficialGroup => {
  const members = (g.members as Array<Record<string, unknown>>) ?? [];
  const adminMembers = members.filter((m) => m.role === "admin");
  return {
    id: g.id as string,
    groupId: (g.search_id as string) || (g.id as string),
    name: (g.name as string) || "",
    description: (g.description as string) || undefined,
    image: (g.profile_url as string) || undefined,
    memberCount: members.length,
    admins: adminMembers.map((m) => String(m.first_name || "")).filter(Boolean),
    memberIds: members.map((m) => m.user_id as string),
    adminIds: adminMembers.map((m) => m.user_id as string),
    createdAt: g.created_at
      ? new Date((g.created_at as number) * 1000).toISOString()
      : undefined,
  };
};

// ─── Schedule + Template types (scheduling module integration) ───────────────

interface ApiTemplate {
  id: string;
  name: string;
  title: string;  // from config.title
  createdAt: string;
  raw: Record<string, unknown>; // full row for passing to create wizard
}

interface SavedSchedule {
  id: string;
  title: string;
  department?: string;
  startDate: string;
  endDate: string;
  status: string;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtEpoch = (epoch: number) => {
  const dt = new Date(epoch * 1000);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

const mapApiSchedule = (d: Record<string, unknown>): SavedSchedule => {
  const rawStatus = ((d.status) as string | undefined) ?? "";
  // Capitalise first letter exactly as the React source does (status.charAt(0).toUpperCase() + status.slice(1))
  const displayStatus = rawStatus ? rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1) : "—";
  return {
    id: (d.duty_code as string) || (d.id as string),
    title: (d.title as string) || "",
    startDate: d.start_date ? fmtEpoch(d.start_date as number) : "",
    endDate: d.end_date ? fmtEpoch(d.end_date as number) : "",
    status: displayStatus,
  };
};

// ─── SectionCard ──────────────────────────────────────────────────────────────

const SectionCard = ({
  title,
  icon: Icon,
  count,
  search,
  onSearchChange,
  searchPlaceholder,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl bg-card shadow-card border border-border/50 overflow-hidden">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border/50">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-secondary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{count} total</p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {onSearchChange && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 h-9"
            />
          </div>
        )}
        {action}
      </div>
    </div>
    <div>{children}</div>
  </div>
);

// ─── TabBtn ───────────────────────────────────────────────────────────────────

const TabBtn = ({
  value, icon: Icon, label,
}: { value: string; icon: React.ComponentType<{ className?: string }>; label: string }) => (
  <TabsTrigger value={value} className="gap-1.5">
    <Icon className="h-3.5 w-3.5" /> {label}
  </TabsTrigger>
);

// ─── MultiUserPickerModal (API-driven) ────────────────────────────────────────

interface MultiUserPickerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  departmentId: string;
  onConfirm: (users: DepartmentUser[]) => void;
}

const MultiUserPickerModal = ({ open, onOpenChange, departmentId, onConfirm }: MultiUserPickerProps) => {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<DepartmentUser[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setPicked(new Set());
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const delay = setTimeout(
      async () => {
        setSearching(true);
        try {
          const res = await listUsersForPicker({
            search_string: search || undefined,
            mapping_checks: { department_id: departmentId },
          });
          if (cancelled) return;
          const raw = (res.content?.data ?? []) as Array<Record<string, unknown>>;
          setUsers(raw.map(mapApiUserToDeptUser));
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
  }, [search, open, departmentId]);

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectableUsers = users.filter((u) => !u.isMapped);
  const allSelected = selectableUsers.length > 0 && selectableUsers.every((u) => picked.has(u.id));
  const toggleAll = () => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (allSelected) selectableUsers.forEach((u) => next.delete(u.id));
      else selectableUsers.forEach((u) => next.add(u.id));
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = users.filter((u) => picked.has(u.id));
    onConfirm(selected);
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Members"
      description="Select one or more users to add to this department."
      size="full"
      contentClassName="[&>button.absolute]:hidden"
      footer={
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-sm text-muted-foreground">{picked.size} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={picked.size === 0}>
              Add {picked.size > 0 ? `(${picked.size})` : ""}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone..."
            className="h-11 pl-10 rounded-full"
          />
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="px-4 py-3 w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                      disabled={selectableUsers.length === 0}
                    />
                  </th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Mobile Number</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Profession</th>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Status</th>
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
                {!searching && users.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-t border-border transition-colors ${
                      u.isMapped
                        ? "opacity-50 cursor-not-allowed bg-muted/30"
                        : "hover:bg-accent/30 cursor-pointer"
                    }`}
                    onClick={() => { if (!u.isMapped) toggle(u.id); }}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={u.isMapped ? true : picked.has(u.id)}
                        onCheckedChange={() => { if (!u.isMapped) toggle(u.id); }}
                        disabled={u.isMapped}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <AppAvatar name={u.name} size="sm" />
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{u.name}</span>
                          {u.isMapped && (
                            <span className="text-xs text-muted-foreground">Already a member</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{u.profession}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{u.rank}</td>
                    <td className="px-4 py-3">
                      {u.isMapped ? (
                        <Badge variant="secondary" className="text-xs">Member</Badge>
                      ) : (
                        <StatusBadge tone={getStatusTone(u.status ?? "Active")}>{u.status ?? "Active"}</StatusBadge>
                      )}
                    </td>
                  </tr>
                ))}
                {!searching && users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No users found.
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

// ─── CreateGroupModal ─────────────────────────────────────────────────────────

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  memberPool: DepartmentUser[];
  onSave: (group: OfficialGroup, imageFile?: File) => void;
  editing?: OfficialGroup | null;
}

const CreateGroupModal = ({
  open,
  onOpenChange,
  memberPool,
  onSave,
  editing,
}: CreateGroupModalProps) => {
  const isEdit = !!editing;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string | undefined>();
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setDescription(editing.description ?? "");
        setImage(editing.image);
        setMemberIds(new Set(editing.memberIds ?? []));
        setAdminIds(new Set(editing.adminIds ?? []));
      } else {
        setName("");
        setDescription("");
        setImage(undefined);
        setMemberIds(new Set());
        setAdminIds(new Set());
      }
      setMemberSearch("");
      setImageFile(null);
    }
  }, [open, editing]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      appToast.error("Image must be under 2MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const filteredMembers = memberPool.filter((u) => {
    const q = memberSearch.toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const selectedMembers = memberPool.filter((u) => memberIds.has(u.id));
  const eligibleAdminPool = selectedMembers;

  useEffect(() => {
    setAdminIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (memberIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [memberIds]);

  const canSave = name.trim().length > 0 && adminIds.size > 0;

  const handleSave = () => {
    if (!canSave) return;
    const trimmedName = name.trim().slice(0, 100);
    const trimmedDesc = description.trim().slice(0, 500);
    const admins = eligibleAdminPool
      .filter((u) => adminIds.has(u.id))
      .map((u) => u.name.split(" ")[0]);
    const group: OfficialGroup = {
      id: editing?.id ?? `g_${Date.now()}`,
      groupId: editing?.groupId ?? String(Math.floor(1000000000 + Math.random() * 8999999999)),
      name: trimmedName,
      description: trimmedDesc || undefined,
      image,
      memberCount: memberIds.size,
      admins: admins.length > 0 ? admins : ["—"],
      memberIds: Array.from(memberIds),
      adminIds: Array.from(adminIds),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    onSave(group, imageFile ?? undefined);
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Official Group" : "New Official Group"}
      description={
        isEdit
          ? "Changes will sync to the mobile app."
          : "This group will be created and synced to the mobile app."
      }
      size="full"
      contentClassName="[&>button.absolute]:hidden"
      footer={
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="text-sm text-muted-foreground">
            {memberIds.size} member{memberIds.size === 1 ? "" : "s"} · {adminIds.size} admin{adminIds.size === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {isEdit ? "Save Changes" : "Add Group"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left: image + name + description */}
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Group Image</Label>
            <div className="mt-2 flex flex-col items-center gap-3">
              <div className="h-32 w-32 rounded-2xl bg-muted/40 border border-dashed border-border flex items-center justify-center overflow-hidden">
                {image ? (
                  <img src={image} alt="Group" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload
                </Button>
                {image && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => { setImage(undefined); setImageFile(null); }}
                    className="gap-2 text-destructive"
                  >
                    <X className="h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="g-name" className="text-xs uppercase text-muted-foreground">
              Group Name
            </Label>
            <Input
              id="g-name"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Internal Medicine Official Group"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="g-desc" className="text-xs uppercase text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="g-desc"
              value={description}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group for?"
              rows={4}
              className="mt-1.5 resize-none"
            />
            <p className="text-[11px] text-muted-foreground mt-1">{description.length}/500</p>
          </div>
        </div>

        {/* Right: members + admins */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase text-muted-foreground">Members ({memberIds.size})</Label>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search department members..."
                  className="h-9 pl-9 text-sm"
                />
              </div>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="max-h-[280px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left text-xs font-semibold uppercase text-muted-foreground">
                      <th className="px-4 py-2.5 w-12"></th>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Profession</th>
                      <th className="px-4 py-2.5">Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((u) => (
                      <tr
                        key={u.id}
                        className="border-t border-border hover:bg-accent/30 cursor-pointer"
                        onClick={() => toggle(memberIds, setMemberIds, u.id)}
                      >
                        <td className="px-4 py-2.5">
                          <Checkbox
                            checked={memberIds.has(u.id)}
                            onCheckedChange={() => toggle(memberIds, setMemberIds, u.id)}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <AppAvatar name={u.name} size="sm" />
                            <span className="font-medium text-foreground">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{u.profession}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{u.rank}</td>
                      </tr>
                    ))}
                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          {memberPool.length === 0 ? "No department members available." : "No matches."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase text-muted-foreground">Admins ({adminIds.size})</Label>
            <p className="text-[11px] text-muted-foreground mb-2">
              Select admins from the chosen members.
            </p>
            <div className="border border-border rounded-lg p-3 min-h-[80px]">
              {eligibleAdminPool.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Select members first to assign admins.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {eligibleAdminPool.map((u) => {
                    const isAdmin = adminIds.has(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggle(adminIds, setAdminIds, u.id)}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                          isAdmin
                            ? "bg-secondary/15 border-secondary text-secondary"
                            : "bg-background border-border hover:bg-accent/40"
                        }`}
                      >
                        <AppAvatar name={u.name} size="sm" />
                        {u.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppModal>
  );
};

// ─── SubDepartmentModal ───────────────────────────────────────────────────────

interface SubDepartmentModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  parent: DepartmentRecord | undefined;
  editing?: DepartmentRecord | null;
  onSave: (s: DepartmentRecord) => void;
}

const SubDepartmentModal = ({
  open,
  onOpenChange,
  parent,
  editing,
  onSave,
}: SubDepartmentModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [head, setHead] = useState<CandidateUser | null>(null);
  const pickerModal = useDisclosure();

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setDescription(editing?.description ?? "");
      if (editing?.headName && editing?.headUserId) {
        setHead({
          id: editing.headUserId,
          name: editing.headName,
          email: "",
          staffId: "",
          phone: "",
          jobTitle: "",
          rank: "",
          status: "Active",
        });
      } else {
        setHead(null);
      }
    }
  }, [open, editing]);

  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const record: DepartmentRecord = editing
      ? {
          ...editing,
          name: name.trim(),
          description: description.trim(),
          headName: head?.name ?? "",
          headUserId: head?.id ?? undefined,
        }
      : {
          id: `sd-${Date.now()}`,
          departmentCode: "",
          name: name.trim(),
          description: description.trim(),
          type: "Sub-Department",
          parentId: parent?.id ?? null,
          headName: head?.name ?? "",
          headUserId: head?.id ?? undefined,
          users: [],
          groups: [],
          templates: [],
          createdAt: new Date().toLocaleDateString("en", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        };
    onSave(record);
    onOpenChange(false);
  };

  return (
    <>
      <AppModal
        open={open}
        onOpenChange={onOpenChange}
        title={editing ? "Edit Sub-Department" : "Add Sub-Department"}
        description={parent ? `Under ${parent.name}` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!canSave}>
              {editing ? "Save changes" : "Add"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sd-name">Department Name *</Label>
            <Input
              id="sd-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cardiology"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sd-desc">Description</Label>
            <Textarea
              id="sd-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Short description..."
            />
          </div>
          <HeadPickerField
            head={head}
            onPick={pickerModal.onOpen}
            onClear={() => setHead(null)}
          />
        </div>
      </AppModal>
      <UserPickerModal
        open={pickerModal.open}
        onOpenChange={pickerModal.setOpen}
        onSelect={setHead}
        initialId={head?.id}
      />
    </>
  );
};

// ─── DepartmentProfile ────────────────────────────────────────────────────────

const DepartmentProfile = () => {
  const params = useParams();
  const id = validateRouteParam(params.id) ?? "";
  const sub_id = validateRouteParam(params.sub_id);
  const deptId = sub_id ?? id;
  const router = useRouter();
  const sidebarMargin = useSidebarMargin();

  // ── Department data ──────────────────────────────────────────────────────
  const [dept, setDept] = useState<DepartmentRecord | null>(null);
  const [parentDept, setParentDept] = useState<DepartmentRecord | null>(null);
  const [deptLoading, setDeptLoading] = useState(true);

  const loadDept = useCallback(async () => {
    if (!deptId) { router.replace("/admin/departments"); return; }
    setDeptLoading(true);
    try {
      const res = await fetchDepartments();
      const all = ((res.content?.data ?? []) as Array<Record<string, unknown>>).map(mapApiDept);
      const found = all.find((d) => d.id === deptId) ?? null;
      setDept(found);
      if (found) {
        if (sub_id) {
          localStorage.setItem("sub_department_id", sub_id);
          localStorage.setItem("sub_department_name", found.name);
          localStorage.setItem("department_id", id);
          const parent = all.find((d) => d.id === id);
          if (parent) localStorage.setItem("department_name", parent.name);
        } else {
          localStorage.setItem("department_id", id);
          localStorage.setItem("department_name", found.name);
          localStorage.removeItem("sub_department_id");
          localStorage.removeItem("sub_department_name");
        }
        localStorage.removeItem("group_id");
      }
      if (found?.parentId) {
        setParentDept(all.find((d) => d.id === found.parentId) ?? null);
      } else {
        setParentDept(null);
      }
      // seed sub-departments from the full list (always uses primary id)
      setSubDepartments(all.filter((d) => d.parentId === id));
    } catch {
      appToast.error("Failed to load department");
    } finally {
      setDeptLoading(false);
    }
  }, [id, sub_id, deptId]);

  useEffect(() => {
    loadDept();
  }, [loadDept]);

  // ── Members ──────────────────────────────────────────────────────────────
  const [members, setMembers] = useState<DepartmentUser[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    if (!deptId) return;
    setMembersLoading(true);
    try {
      const res = await listDepartmentUsers(deptId);
      const data = (res.content?.data ?? []) as Array<Record<string, unknown>>;
      setMembers(data.map(mapApiUserToDeptUser));
    } catch {
      appToast.error("Failed to load members");
    } finally {
      setMembersLoading(false);
    }
  }, [deptId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // ── Groups ───────────────────────────────────────────────────────────────
  const [groups, setGroups] = useState<OfficialGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    if (!deptId) return;
    setGroupsLoading(true);
    try {
      const all: OfficialGroup[] = [];
      let token: string | null = null;
      do {
        const res = await listOfficialGroups(deptId, token);
        const page = (res.content?.data ?? []) as Array<Record<string, unknown>>;
        all.push(...page.map(mapApiGroup));
        token = (res.content?.next_token as string) ?? null;
      } while (token);
      setGroups(all);
      if (all.length > 0) {
        localStorage.setItem("group_id", all[0].id);
      }
    } catch {
      appToast.error("Failed to load groups");
    } finally {
      setGroupsLoading(false);
    }
  }, [deptId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // ── Sub-departments ──────────────────────────────────────────────────────
  const [subDepartments, setSubDepartments] = useState<DepartmentRecord[]>([]);
  const subModal = useDisclosure();
  const [editingSub, setEditingSub] = useState<DepartmentRecord | null>(null);

  // ── Schedules (API-driven) ─────────────────────────────────────────────
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [scheduleCannotDelete, setScheduleCannotDelete] = useState(false);

  const loadSchedules = useCallback(async () => {
    let groupId = localStorage.getItem("group_id");
    if (!groupId) {
      try {
        const res = await listOfficialGroups(deptId);
        const grps = (res.content?.data ?? []) as Array<Record<string, unknown>>;
        if (grps.length > 0) {
          groupId = grps[0].id as string;
          localStorage.setItem("group_id", groupId);
        }
      } catch {
        // no group yet — leave schedules empty
      }
    }
    if (!groupId) {
      setSchedules([]);
      return;
    }
    try {
      const subDeptId = localStorage.getItem("sub_department_id");
      const departmentId = localStorage.getItem("department_id") || id;
      const res = await listDuties({
        group_id: groupId,
        department_id: departmentId,
        is_summary: true,
        ...(subDeptId ? { sub_department_id: subDeptId } : {}),
      });
      const data = (res.content?.data ?? []) as Array<Record<string, unknown>>;
      setSchedules(data.map(mapApiSchedule));
    } catch {
      appToast.error("Failed to load schedules");
    }
  }, [deptId, id]);

  useEffect(() => {
    if (dept) void loadSchedules();
  }, [dept, loadSchedules]);

  // ── Templates (API-driven) ────────────────────────────────────────────────
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);

  const loadTemplates = useCallback(async () => {
    let groupId = localStorage.getItem("group_id");
    if (!groupId) {
      try {
        const res = await listOfficialGroups(deptId);
        const grps = (res.content?.data ?? []) as Array<Record<string, unknown>>;
        if (grps.length > 0) {
          groupId = grps[0].id as string;
          localStorage.setItem("group_id", groupId);
        }
      } catch {
        // no group — leave templates empty
      }
    }
    if (!groupId) return;
    try {
      const subDeptId = localStorage.getItem("sub_department_id");
      const departmentId = localStorage.getItem("department_id") || id;
      const res = await listDutyTemplates({
        group_id: groupId,
        department_id: departmentId,
        ...(subDeptId ? { sub_department_id: subDeptId } : {}),
      });
      const data = (res.content?.data ?? []) as Array<Record<string, unknown>>;
      setTemplates(
        data.map((row) => {
          const config = (row.config ?? {}) as Record<string, unknown>;
          const ts = row.created_at as number;
          return {
            id: (row.id as string) || "",
            name: (row.name as string) || "",
            title: (config.title as string) || (row.name as string) || "",
            createdAt: ts ? new Date(ts * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—",
            raw: row,
          };
        }),
      );
    } catch {
      appToast.error("Failed to load templates");
    }
  }, [id]);

  useEffect(() => {
    if (dept) void loadTemplates();
  }, [dept, loadTemplates]);

  // ── Search state ─────────────────────────────────────────────────────────
  const [membersSearch, setMembersSearch] = useState("");
  const [groupsSearch, setGroupsSearch] = useState("");
  const [schedulesSearch, setSchedulesSearch] = useState("");
  const [templatesSearch, setTemplatesSearch] = useState("");
  const [subsSearch, setSubsSearch] = useState("");

  // ── Member filters ────────────────────────────────────────────────────────
  const [memberFilters, setMemberFilters] = useState<Record<string, string>>({
    profession: "all",
    rank: "all",
    status: "all",
  });
  const pickerModal = useDisclosure();
  const newGroupModal = useDisclosure();
  const [editingGroup, setEditingGroup] = useState<OfficialGroup | null>(null);
  const { confirm: confirmDelete, dialog: confirmDialog } = useConfirm();

  // ── Force-delete member state (for 409 on-duty conflict) ─────────────────
  const [removingUserForForce, setRemovingUserForForce] = useState<DepartmentUser | null>(null);
  const [forceDeleteError, setForceDeleteError] = useState<{
    open: boolean;
    duties: Array<{ title: string }>;
    roles: string[];
  }>({ open: false, duties: [], roles: [] });
  const [forceDeleting, setForceDeleting] = useState(false);

  // ── Loading / not-found guards ────────────────────────────────────────────
  if (deptLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar items={adminSidebarItems} />
        <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
          <div className="flex items-center justify-center py-40">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </main>
      </div>
    );
  }

  if (!dept) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar items={adminSidebarItems} />
        <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2 mb-4">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="text-center py-20 text-muted-foreground">Department not found.</div>
          </div>
        </main>
      </div>
    );
  }

  const isSubDept = dept.type === "Sub-Department";

  // ── Derived data ──────────────────────────────────────────────────────────

  const filteredMembers = members.filter((u) => {
    const q = membersSearch.toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q);
    const matchesProfession =
      memberFilters.profession === "all" || u.profession === memberFilters.profession;
    const matchesRank = memberFilters.rank === "all" || u.rank === memberFilters.rank;
    const matchesStatus =
      memberFilters.status === "all" || (u.status ?? "Active") === memberFilters.status;
    return matchesSearch && matchesProfession && matchesRank && matchesStatus;
  });

  const professionOptions = Array.from(new Set(members.map((u) => u.profession).filter(Boolean))).map(
    (p) => ({ label: p, value: p }),
  );
  const rankOptions = Array.from(new Set(members.map((u) => u.rank).filter(Boolean))).map((r) => ({
    label: r,
    value: r,
  }));

  // ── Member handlers ───────────────────────────────────────────────────────

  const handleAddMembers = async (users: DepartmentUser[]) => {
    if (users.length === 0) return;
    try {
      await addDepartmentUsers(deptId, users.map((u) => u.id));
      appToast.success(`${users.length} member${users.length > 1 ? "s" : ""} added`);
      await loadMembers();
    } catch (err: unknown) {
      appToast.error((err as { message?: string })?.message ?? "Failed to add members");
    }
  };

  const handleRemoveMember = async (u: DepartmentUser) => {
    if (
      await confirmDelete({
        title: "Remove member",
        description: `Remove ${u.name} from this department?`,
        destructive: true,
        confirmLabel: "Remove",
      })
    ) {
      try {
        await removeUserFromDepartment({ department_id: deptId, user_id: u.id, is_force_delete: false });
        appToast.success("Member removed");
        await loadMembers();
      } catch (err: unknown) {
        const e = err as { code?: number; errorData?: unknown; message?: string };
        if (e.code === 409) {
          const errors = Array.isArray(e.errorData)
            ? (e.errorData as Array<{ type: string; active_duties?: Array<{ title: string }>; message?: string }>)
            : [];
          const duties = errors
            .filter((x) => x.type === "active_duties")
            .flatMap((x) => x.active_duties ?? []);
          const roles = errors
            .filter((x) => x.type === "department_head")
            .map(() => "Department Head");
          setRemovingUserForForce(u);
          setForceDeleteError({ open: true, duties, roles });
        } else {
          appToast.error(e.message ?? "Failed to remove member");
        }
      }
    }
  };

  const handleForceRemoveMember = async () => {
    if (!removingUserForForce) return;
    setForceDeleting(true);
    try {
      await removeUserFromDepartment({
        department_id: deptId,
        user_id: removingUserForForce.id,
        is_force_delete: true,
      });
      appToast.success("Member removed");
      setForceDeleteError({ open: false, duties: [], roles: [] });
      setRemovingUserForForce(null);
      await loadMembers();
    } catch (err: unknown) {
      appToast.error((err as { message?: string }).message ?? "Failed to remove member");
    } finally {
      setForceDeleting(false);
    }
  };

  const handleBulkRemoveMembers = async (rows: DepartmentUser[]) => {
    if (
      await confirmDelete({
        title: `Remove ${rows.length} member${rows.length > 1 ? "s" : ""}`,
        description: "They will be unassigned from this department.",
        destructive: true,
        confirmLabel: "Remove",
      })
    ) {
      try {
        await removeDepartmentUsers(deptId, rows.map((r) => r.id));
        appToast.success(`${rows.length} member${rows.length > 1 ? "s" : ""} removed`);
        await loadMembers();
      } catch (err: unknown) {
        appToast.error((err as { message?: string })?.message ?? "Failed to remove members");
      }
    }
  };

  // ── Schedule handlers (API) ───────────────────────────────────────────────

  const handleDeleteSchedule = async (s: SavedSchedule) => {
    if (
      await confirmDelete({
        title: "Delete schedule",
        description: `Delete "${s.title}"? This cannot be undone.`,
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteStaffingDuty(s.id);
        appToast.success("Schedule deleted");
        await loadSchedules();
      } catch (err: unknown) {
        const e = err as { code?: number; message?: string };
        if (e.code === 409) {
          setScheduleCannotDelete(true);
        } else {
          appToast.error(e.message ?? "Failed to delete schedule");
        }
      }
    }
  };

  const handleBulkDeleteSchedules = async (rows: SavedSchedule[]) => {
    if (
      await confirmDelete({
        title: `Delete ${rows.length} schedule${rows.length > 1 ? "s" : ""}`,
        description: "These schedules will be removed permanently.",
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await Promise.all(rows.map((s) => deleteStaffingDuty(s.id)));
        appToast.success(`${rows.length} schedule${rows.length > 1 ? "s" : ""} deleted`);
        await loadSchedules();
      } catch (err: unknown) {
        const e = err as { code?: number; message?: string };
        if (e.code === 409) {
          setScheduleCannotDelete(true);
        } else {
          appToast.error(e.message ?? "Failed to delete schedules");
        }
      }
    }
  };

  // ── Group handlers ────────────────────────────────────────────────────────

  const handleSaveGroup = async (g: OfficialGroup, imageFile?: File) => {
    const isEdit = !!editingGroup;
    try {
      let profile_url: string | undefined;
      if (imageFile) {
        const uploadResult = await awsLinkGenerateImage({
          file: imageFile,
          awsFolderPath: "group/profile_pic",
        });
        await gcsFileUpload({ signedUrl: uploadResult.signedUrl, file: imageFile });
        profile_url = uploadResult.signedUrl.split("?")[0];
      } else if (isEdit && !g.image && editingGroup!.image) {
        profile_url = "";
      }

      if (isEdit) {
        const originalAdminIds = editingGroup!.adminIds ?? [];
        const newAdminIds = g.adminIds ?? [];
        const add_admin_ids = newAdminIds.filter((aid) => !originalAdminIds.includes(aid));
        const remove_admin_ids = originalAdminIds.filter((aid) => !newAdminIds.includes(aid));
        await editOfficialGroup({
          group_id: g.id,
          name: g.name,
          description: g.description,
          ...(profile_url !== undefined ? { profile_url } : {}),
          ...(add_admin_ids.length > 0 ? { add_admin_ids } : {}),
          ...(remove_admin_ids.length > 0 ? { remove_admin_ids } : {}),
        });
      } else {
        await createOfficialGroup({
          name: g.name,
          description: g.description,
          department_id: deptId,
          ...(profile_url ? { profile_url } : {}),
          members: (g.memberIds ?? []).map((mid) => ({
            member_id: mid,
            role: (g.adminIds ?? []).includes(mid) ? "admin" : "member",
          })),
        });
      }
      appToast.success(
        isEdit
          ? `Group "${g.name}" updated`
          : `Group "${g.name}" created and synced to mobile app`,
      );
      setEditingGroup(null);
      await loadGroups();
    } catch (err: unknown) {
      appToast.error(
        (err as { message?: string })?.message ??
          `Failed to ${isEdit ? "update" : "create"} group`,
      );
    }
  };

  const handleEditGroup = (g: OfficialGroup) => {
    setEditingGroup(g);
    newGroupModal.onOpen();
  };

  const handleOpenNewGroup = () => {
    setEditingGroup(null);
    newGroupModal.onOpen();
  };

  const handleDeleteGroup = async (g: OfficialGroup) => {
    if (
      await confirmDelete({
        title: "Delete official group",
        description: `Delete "${g.name}"? This will remove it from the mobile app.`,
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteOfficialGroups([g.id]);
        appToast.success("Group deleted");
        await loadGroups();
      } catch (err: unknown) {
        appToast.error((err as { message?: string })?.message ?? "Failed to delete group");
      }
    }
  };

  const handleBulkDeleteGroups = async (rows: OfficialGroup[]) => {
    if (
      await confirmDelete({
        title: `Delete ${rows.length} group${rows.length > 1 ? "s" : ""}`,
        description: "These groups will be removed from the mobile app.",
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteOfficialGroups(rows.map((r) => r.id));
        appToast.success(`${rows.length} group${rows.length > 1 ? "s" : ""} deleted`);
        await loadGroups();
      } catch (err: unknown) {
        appToast.error((err as { message?: string })?.message ?? "Failed to delete groups");
      }
    }
  };

  // ── Sub-department handlers ───────────────────────────────────────────────

  const handleOpenNewSub = () => {
    setEditingSub(null);
    subModal.onOpen();
  };
  const handleEditSub = (s: DepartmentRecord) => {
    setEditingSub(s);
    subModal.onOpen();
  };

  const handleSaveSub = async (s: DepartmentRecord) => {
    const isEdit = !!editingSub;
    try {
      if (isEdit) {
        await updateDepartment({
          department_id: s.id,
          name: s.name,
          ...(s.headUserId ? { head_user_id: s.headUserId } : {}),
        });
      } else {
        await createDepartment({
          name: s.name,
          type: "sub",
          primary_department_id: id,
          ...(s.headUserId ? { head_user_id: s.headUserId } : {}),
        });
      }
      appToast.success(
        isEdit ? `Sub-department "${s.name}" updated` : `Sub-department "${s.name}" created`,
      );
      setEditingSub(null);
      await loadDept();
    } catch (err: unknown) {
      appToast.error(
        (err as { message?: string })?.message ??
          `Failed to ${isEdit ? "update" : "create"} sub-department`,
      );
    }
  };

  const handleDeleteSub = async (s: DepartmentRecord) => {
    if (
      await confirmDelete({
        title: "Delete sub-department",
        description: `Delete "${s.name}"? This cannot be undone.`,
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteDepartments([s.id]);
        appToast.success("Sub-department deleted");
        await loadDept();
      } catch (err: unknown) {
        appToast.error((err as { message?: string })?.message ?? "Failed to delete sub-department");
      }
    }
  };

  const handleBulkDeleteSubs = async (rows: DepartmentRecord[]) => {
    if (
      await confirmDelete({
        title: `Delete ${rows.length} sub-department${rows.length > 1 ? "s" : ""}`,
        description: "These sub-departments will be removed permanently.",
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteDepartments(rows.map((r) => r.id));
        appToast.success(`${rows.length} sub-department${rows.length > 1 ? "s" : ""} deleted`);
        await loadDept();
      } catch (err: unknown) {
        appToast.error(
          (err as { message?: string })?.message ?? "Failed to delete sub-departments",
        );
      }
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────

  const scheduleColumns: DataTableColumn<SavedSchedule>[] = [
    {
      key: "title",
      header: "On-Duty Title",
      sortable: true,
      searchable: true,
      cell: (s) => <span className="font-medium text-foreground">{s.title}</span>,
    },
    {
      key: "startDate",
      header: "Start Date",
      sortable: true,
      cell: (s) => <span className="text-muted-foreground">{s.startDate}</span>,
    },
    {
      key: "endDate",
      header: "End Date",
      sortable: true,
      cell: (s) => <span className="text-muted-foreground">{s.endDate}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (s) => {
        const tone = s.status.toLowerCase() === "published" ? "success" : getStatusTone(s.status);
        return <StatusBadge tone={tone}>{s.status}</StatusBadge>;
      },
    },
  ];

  const memberColumns: DataTableColumn<DepartmentUser>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      searchable: true,
      accessor: (u) => u.name,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <AppAvatar name={u.name} size="sm" />
          <span className="font-medium text-foreground">{u.name}</span>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Mobile Number",
      sortable: true,
      searchable: true,
      cell: (u) => <span className="text-muted-foreground">{u.phone}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      searchable: true,
      cell: (u) => <span className="text-muted-foreground">{u.email}</span>,
    },
    {
      key: "profession",
      header: "Profession",
      sortable: true,
      cell: (u) => <span className="text-foreground">{u.profession}</span>,
    },
    {
      key: "rank",
      header: "Rank",
      sortable: true,
      cell: (u) => <span className="text-foreground">{u.rank}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (u) => (
        <StatusBadge tone={getStatusTone(u.status ?? "Active")}>{u.status ?? "Active"}</StatusBadge>
      ),
    },
  ];

  const groupColumns: DataTableColumn<OfficialGroup>[] = [
    {
      key: "name",
      header: "Group",
      sortable: true,
      searchable: true,
      accessor: (g) => g.name,
      cell: (g) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center overflow-hidden shrink-0">
            {g.image ? (
              <img src={g.image} alt={g.name} className="h-full w-full object-cover" />
            ) : (
              <Radio className="h-4 w-4 text-secondary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{g.name}</p>
            {g.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[260px]">{g.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "groupId",
      header: "Group ID",
      sortable: true,
      searchable: true,
      cell: (g) => <span className="font-mono text-xs text-muted-foreground">{g.groupId}</span>,
    },
    {
      key: "memberCount",
      header: "Members",
      sortable: true,
      cell: (g) => <span className="text-muted-foreground">{g.memberCount}</span>,
    },
    {
      key: "admins",
      header: "Admins",
      cell: (g) => (
        <div className="flex flex-wrap gap-1.5">
          {g.admins.slice(0, 3).map((a, i) => (
            <Badge key={`${g.id}-${a}-${i}`} variant="outline" className="text-xs">
              {a}
            </Badge>
          ))}
          {g.admins.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{g.admins.length - 3}
            </Badge>
          )}
        </div>
      ),
    },
  ];

  const subColumns: DataTableColumn<DepartmentRecord>[] = [
    {
      key: "name",
      header: "Department",
      sortable: true,
      searchable: true,
      accessor: (s) => s.name,
      cell: (s) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-secondary" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{s.name}</p>
            {s.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[260px]">{s.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "departmentCode",
      header: "Department ID",
      sortable: true,
      searchable: true,
      cell: (s) => <span className="font-mono text-xs text-muted-foreground">{s.departmentCode}</span>,
    },
    {
      key: "headName",
      header: "Head",
      sortable: true,
      cell: (s) => <span className="text-foreground">{s.headName || "—"}</span>,
    },
    {
      key: "members",
      header: "Members",
      sortable: true,
      accessor: (s) => s.userCount ?? s.users.length,
      cell: (s) => <span className="text-muted-foreground">{s.userCount ?? s.users.length}</span>,
    },
  ];

  // ── Filtered lists ────────────────────────────────────────────────────────

  const filteredGroups = groups.filter((g) => {
    const q = groupsSearch.toLowerCase();
    return !q || g.name.toLowerCase().includes(q) || g.groupId.toLowerCase().includes(q);
  });
  const filteredSchedules = schedules.filter((s) => {
    const q = schedulesSearch.toLowerCase();
    return !q || s.title.toLowerCase().includes(q);
  });
  const filteredTemplates = templates.filter((t) => {
    const q = templatesSearch.toLowerCase();
    return !q || t.title.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
  });
  const filteredSubs = subDepartments.filter((s) => {
    const q = subsSearch.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.departmentCode.toLowerCase().includes(q);
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />
      <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* Back */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (parentDept) router.push(`/admin/departments/${parentDept.id}`);
              else router.push("/admin/departments");
            }}
            className="gap-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {parentDept ? `Back to ${parentDept.name}` : "Back to Departments"}
          </Button>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-card shadow-card border border-border/50 p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="h-20 w-20 rounded-2xl bg-secondary/10 flex items-center justify-center">
                <Building2 className="h-10 w-10 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <button
                    type="button"
                    onClick={() => router.push("/admin/departments")}
                    className="hover:text-foreground transition-colors"
                  >
                    Departments
                  </button>
                  {parentDept && (
                    <>
                      <span>›</span>
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/departments/${parentDept.id}`)}
                        className="hover:text-foreground transition-colors truncate"
                      >
                        {parentDept.name}
                      </button>
                    </>
                  )}
                  <span>›</span>
                  <span className="text-foreground font-medium truncate">{dept.name}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <h1 className="text-2xl font-bold text-foreground truncate">{dept.name}</h1>
                  <StatusBadge tone={dept.type === "Primary" ? "info" : "neutral"}>{dept.type}</StatusBadge>
                  <Badge variant="outline" className="text-xs font-mono">{dept.departmentCode}</Badge>
                </div>
                {dept.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{dept.description}</p>
                )}
              </div>
            </div>

            <div
              className={`grid grid-cols-1 ${isSubDept ? "sm:grid-cols-3" : "sm:grid-cols-4"} gap-3 mt-6`}
            >
              {[
                { label: "Members", value: membersLoading ? "—" : members.length, icon: UsersIcon },
                { label: "Schedules", value: schedules.length, icon: CalendarClock },
                { label: "Official Groups", value: groupsLoading ? "—" : groups.length, icon: Radio },
                ...(isSubDept
                  ? []
                  : [{ label: "Sub-Departments", value: subDepartments.length, icon: Building2 }]),
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-lg bg-muted/40 p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-secondary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground leading-none">
                      {typeof value === "number" ? value.toLocaleString() : value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Tabs */}
          <Tabs key={String(id)} defaultValue="overview" className="space-y-6">
            <TabsList className="w-fit">
              <TabBtn value="overview" icon={LayoutDashboard} label="Overview" />
              <TabBtn value="members" icon={UsersIcon} label="Members" />
              <TabBtn value="channels" icon={Radio} label="Communication Channels" />
              <TabBtn value="schedule" icon={CalendarClock} label="Schedule" />
              <TabBtn value="templates" icon={FileText} label="Templates" />
              {!isSubDept && <TabBtn value="subs" icon={Building2} label="Sub-Departments" />}
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              <SectionCard title="Info" icon={Info} count={4}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department Head</span>
                    <span className="font-medium text-foreground">{dept.headName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <StatusBadge tone={dept.type === "Primary" ? "info" : "neutral"}>{dept.type}</StatusBadge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department ID</span>
                    <span className="font-mono text-foreground">{dept.departmentCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-medium text-foreground">{members.length}</span>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Members" icon={UsersIcon} count={members.length}>
                {membersLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No members yet.</div>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {members.slice(0, 4).map((u) => (
                      <li key={u.id} className="flex items-center gap-3 p-4">
                        <AppAvatar name={u.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{u.rank}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard title="Schedules" icon={CalendarClock} count={schedules.length}>
                {schedules.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No schedules yet.</div>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {schedules.slice(0, 4).map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{s.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.startDate} → {s.endDate}
                          </p>
                        </div>
                        <StatusBadge tone={s.status === "Published" ? "success" : "neutral"}>
                          {s.status}
                        </StatusBadge>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard title="Official Groups" icon={Radio} count={groups.length}>
                {groupsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : groups.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No official groups yet.</div>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {groups.slice(0, 4).map((g) => (
                      <li key={g.id} className="flex items-center gap-3 p-4">
                        <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center overflow-hidden shrink-0">
                          {g.image ? (
                            <img src={g.image} alt={g.name} className="h-full w-full object-cover" />
                          ) : (
                            <Radio className="h-4 w-4 text-secondary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{g.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{g.groupId}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{g.memberCount} members</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </TabsContent>

            {/* MEMBERS */}
            <TabsContent value="members" className="mt-0">
              <DataTable<DepartmentUser>
                columns={memberColumns}
                data={filteredMembers}
                rowKey={(u) => u.id}
                searchPlaceholder="Search members by name, email or phone..."
                selectable
                toolbar={
                  <div className="flex items-center justify-between gap-3 w-full">
                    <FilterBar
                      filters={[
                        { key: "profession", label: "Profession", width: 180, options: professionOptions },
                        { key: "rank", label: "Rank", width: 180, options: rankOptions },
                        {
                          key: "status",
                          label: "Status",
                          width: 160,
                          options: [
                            { label: "Active", value: "Active" },
                            { label: "Pending", value: "Pending" },
                          ],
                        },
                      ]}
                      value={memberFilters}
                      onChange={setMemberFilters}
                    />
                    <Button size="sm" onClick={pickerModal.onOpen} className="gap-2 shrink-0">
                      <Plus className="h-4 w-4" /> Add Members
                    </Button>
                  </div>
                }
                rowActions={[
                  { label: "Remove", icon: Trash2, destructive: true, onClick: handleRemoveMember },
                ]}
                bulkActions={[
                  {
                    label: "Remove selected",
                    icon: Trash2,
                    destructive: true,
                    onClick: handleBulkRemoveMembers,
                  },
                ]}
                emptyState={{
                  title: "No members found",
                  description:
                    members.length === 0
                      ? "Add members from your user pool."
                      : "Try adjusting your filters.",
                }}
              />
            </TabsContent>

            {/* COMMUNICATION CHANNELS */}
            <TabsContent value="channels" className="mt-0">
              <DataTable<OfficialGroup>
                columns={groupColumns}
                data={filteredGroups}
                rowKey={(g) => g.id}
                onRowClick={handleEditGroup}
                searchPlaceholder="Search by group name or ID..."
                selectable
                toolbar={
                  <div className="flex items-center justify-end w-full">
                    <Button size="sm" className="gap-2" onClick={handleOpenNewGroup}>
                      <Plus className="h-4 w-4" /> Create Official Group
                    </Button>
                  </div>
                }
                rowActions={[
                  { label: "Edit", icon: Pencil, onClick: handleEditGroup },
                  { label: "Delete", icon: Trash2, destructive: true, onClick: handleDeleteGroup },
                ]}
                bulkActions={[
                  {
                    label: "Delete selected",
                    icon: Trash2,
                    destructive: true,
                    onClick: handleBulkDeleteGroups,
                  },
                ]}
                emptyState={{
                  title: "No official groups yet",
                  description: "Add a group to broadcast it to the mobile app.",
                  action: (
                    <Button size="sm" className="gap-2" onClick={handleOpenNewGroup}>
                      <Plus className="h-4 w-4" /> New Channel
                    </Button>
                  ),
                }}
              />
            </TabsContent>

            {/* SCHEDULE */}
            <TabsContent value="schedule" className="mt-0">
              <DataTable<SavedSchedule>
                columns={scheduleColumns}
                data={filteredSchedules}
                rowKey={(s) => s.id}
                onRowClick={(s) =>
                  router.push(
                    `/admin/scheduling/view/${encodeURIComponent(s.id)}?from=${encodeURIComponent(sub_id ? `/admin/departments/${id}/${sub_id}` : `/admin/departments/${id}`)}`,
                  )
                }
                searchPlaceholder="Search schedules by title..."
                toolbar={
                  <div className="flex items-center justify-end w-full">
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() =>
                        router.push(
                          `/admin/scheduling/create?department=${encodeURIComponent(dept.name)}&from=${encodeURIComponent(`/admin/departments/${dept.id}`)}`,
                        )
                      }
                    >
                      <Plus className="h-4 w-4" /> Add Schedule
                    </Button>
                  </div>
                }
                rowActions={[
                  {
                    label: "Delete",
                    icon: Trash2,
                    destructive: true,
                    onClick: handleDeleteSchedule,
                  },
                ]}
                bulkActions={[
                  {
                    label: "Delete selected",
                    icon: Trash2,
                    destructive: true,
                    onClick: handleBulkDeleteSchedules,
                  },
                ]}
                selectable
                emptyState={{
                  title: "No schedules yet",
                  description: "Add your first on-duty schedule for this department.",
                  action: (
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() =>
                        router.push(
                          `/admin/scheduling/create?department=${encodeURIComponent(dept.name)}&from=${encodeURIComponent(`/admin/departments/${dept.id}`)}`,
                        )
                      }
                    >
                      <Plus className="h-4 w-4" /> Add Schedule
                    </Button>
                  ),
                }}
              />
            </TabsContent>

            {/* TEMPLATES */}
            <TabsContent value="templates" className="mt-0">
              <SectionCard
                title="Templates"
                icon={FileText}
                count={templates.length}
                search={templatesSearch}
                onSearchChange={setTemplatesSearch}
                searchPlaceholder="Search templates..."
                action={
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      router.push(
                        `/admin/scheduling/create?department=${encodeURIComponent(dept.name)}&from=${encodeURIComponent(`/admin/departments/${dept.id}`)}`,
                      )
                    }
                  >
                    <Plus className="h-4 w-4" /> New Template
                  </Button>
                }
              >
                {filteredTemplates.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No templates yet. Save a schedule as a draft to create a template.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-left">
                        <tr className="text-xs text-muted-foreground">
                          <th className="font-semibold px-4 py-3">Name</th>
                          <th className="font-semibold px-4 py-3">Created At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {filteredTemplates.map((t) => (
                          <tr
                            key={t.id}
                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => {
                              sessionStorage.setItem("mc.scheduleTemplate", JSON.stringify(t.raw));
                              router.push(
                                `/admin/scheduling/create?department=${encodeURIComponent(dept.name)}&from=${encodeURIComponent(`/admin/departments/${dept.id}`)}`,
                              );
                            }}
                          >
                            <td className="px-4 py-3 font-medium text-foreground">{t.title || t.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{t.createdAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            {/* SUB-DEPARTMENTS */}
            {!isSubDept && (
              <TabsContent value="subs" className="mt-0">
                <DataTable<DepartmentRecord>
                  columns={subColumns}
                  data={filteredSubs}
                  rowKey={(s) => s.id}
                  onRowClick={(s) => router.push(`/admin/departments/${s.id}`)}
                  searchPlaceholder="Search by name or ID..."
                  selectable
                  toolbar={
                    <div className="flex items-center justify-end w-full">
                      <Button size="sm" className="gap-2" onClick={handleOpenNewSub}>
                        <Plus className="h-4 w-4" /> Add Sub-Department
                      </Button>
                    </div>
                  }
                  rowActions={[
                    { label: "Edit", icon: Pencil, onClick: handleEditSub },
                    { label: "Delete", icon: Trash2, destructive: true, onClick: handleDeleteSub },
                  ]}
                  bulkActions={[
                    {
                      label: "Delete selected",
                      icon: Trash2,
                      destructive: true,
                      onClick: handleBulkDeleteSubs,
                    },
                  ]}
                  emptyState={{
                    title: "No sub-departments yet",
                    description: "Add a sub-department to organise this department.",
                    action: (
                      <Button size="sm" className="gap-2" onClick={handleOpenNewSub}>
                        <Plus className="h-4 w-4" /> Add Sub-Department
                      </Button>
                    ),
                  }}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>

      <MultiUserPickerModal
        open={pickerModal.open}
        onOpenChange={pickerModal.setOpen}
        departmentId={deptId}
        onConfirm={handleAddMembers}
      />
      <CreateGroupModal
        open={newGroupModal.open}
        onOpenChange={(o) => {
          newGroupModal.setOpen(o);
          if (!o) setEditingGroup(null);
        }}
        memberPool={members}
        onSave={handleSaveGroup}
        editing={editingGroup}
      />
      <SubDepartmentModal
        open={subModal.open}
        onOpenChange={(o) => {
          subModal.setOpen(o);
          if (!o) setEditingSub(null);
        }}
        parent={dept}
        editing={editingSub}
        onSave={handleSaveSub}
      />
      {confirmDialog}

      {/* Force-remove member dialog — shown when ext/removeuserfromdepartment returns 409 */}
      <AppModal
        open={forceDeleteError.open}
        onOpenChange={(o) => {
          if (!o) {
            setForceDeleteError({ open: false, duties: [], roles: [] });
            setRemovingUserForForce(null);
          }
        }}
        title={`Remove "${removingUserForForce?.name ?? ""}"?`}
        description="Removing this member will remove their access immediately. Reassign any on-duty coverage and admin roles before continuing."
        size="md"
        contentClassName="[&>button.absolute]:hidden"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button
              variant="outline"
              onClick={() => {
                setForceDeleteError({ open: false, duties: [], roles: [] });
                setRemovingUserForForce(null);
              }}
              disabled={forceDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleForceRemoveMember}
              disabled={forceDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {forceDeleting ? "Removing…" : "Remove"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-sm">
          {forceDeleteError.duties.length > 0 && (
            <div>
              <p className="font-semibold mb-1">Active on-duty coverage</p>
              {forceDeleteError.duties.map((d, i) => (
                <p key={i} className="text-muted-foreground">{d.title}</p>
              ))}
            </div>
          )}
          {forceDeleteError.roles.length > 0 && (
            <div>
              <p className="font-semibold mb-1">Other roles</p>
              {forceDeleteError.roles.map((r, i) => (
                <p key={i} className="text-muted-foreground">{r}</p>
              ))}
            </div>
          )}
        </div>
      </AppModal>

      {/* Cannot-delete schedule dialog — shown when deletestaffingduty returns 409 */}
      <AppModal
        open={scheduleCannotDelete}
        onOpenChange={(o) => { if (!o) setScheduleCannotDelete(false); }}
        title="Cannot Delete Schedule"
        description="This schedule cannot be deleted because there is an ongoing shift with assigned users. Remove all assigned users first."
        size="sm"
        contentClassName="[&>button.absolute]:hidden"
        footer={
          <div className="flex justify-end w-full">
            <Button onClick={() => setScheduleCannotDelete(false)}>OK</Button>
          </div>
        }
      />
    </div>
  );
};

export default DepartmentProfile;
