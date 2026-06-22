'use client';
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users, Plus, Trash2, Upload, FileSpreadsheet,
  Search, UserPlus, AlertCircle, CheckCircle2,
  Clock, XCircle, Eye, X,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTable, type DataTableColumn,
  AppModal, AppInput, AppSelect,
  AppStatCard, AppAvatar, AppBadge,
  AppTabs, StatusBadge, getStatusTone,
  FilterBar, appToast,
} from "@/components/common";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useConfirm } from "@/hooks/use-confirm";
import { useScope } from "@/hooks/use-scope";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  listNetworkUsers,
  listUsersForMapping,
  mapUsersToSubnetwork,
  createNetworkUser,
  removeNetworkUser,
  listNetworkImportFiles,
  importNetworkMapFile,
} from "@/lib/api/network-users-api";
import {
  listProfessions,
  listRanks,
} from "@/lib/api/users-api";
import { awsLinkGenerateExcel, gcsFileUpload } from "@/lib/api/file-uploader";

// ─── Types ──────────────────────────────────────────────────────────────────

type UserStatus = "Active" | "Pending";
type MapImportStatus = "Completed" | "Completed with Errors" | "Failed" | "Processing";

interface NetworkUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  staffId: string;
  phone: string;
  profession: string;
  rank: string;
  departments: string[];
  status: UserStatus;
  // raw values for actions
  professionId: string;
  rankId: string;
}

interface MapImportFile {
  id: string;
  fileName: string;
  status: MapImportStatus;
  validatedCount: number;
  errorCount: number;
  importedCount: number;
  createdBy: string;
  createdAt: string;
}

interface RefItem { id: string; name: string; }

// ─── API shapes ─────────────────────────────────────────────────────────────

interface ApiNetworkUser {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  staff_id?: string;
  country_code?: string;
  phone_number?: string;
  profession_id?: string;
  profession_name?: string;
  rank_id?: string;
  rank_name?: string;
  status?: string;
  departments?: Array<{ id: string; department_name: string }>;
  is_mapped_to_subnetwork?: number;
}

interface ApiMapImportFile {
  id: string;
  file_name?: string;
  status?: string;
  validated_successfully?: number;
  validation_error?: number;
  imported_successfully?: number;
  created_by?: string;
  created_at?: number;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

const IMPORT_STATUS_MAP: Record<string, MapImportStatus> = {
  success: "Completed",
  partial_success: "Completed with Errors",
  error: "Failed",
  validating: "Processing",
  pending: "Processing",
};

function mapApiUser(row: ApiNetworkUser): NetworkUser {
  return {
    id: row.id,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email ?? "",
    staffId: row.staff_id ?? "",
    phone:
      row.country_code && row.phone_number
        ? `${row.country_code} ${row.phone_number}`
        : (row.phone_number ?? ""),
    profession: row.profession_name ?? "",
    rank: row.rank_name ?? "",
    departments: row.departments?.map((d) => d.department_name) ?? [],
    status: (row.status === "approved" || row.status === "active") ? "Active" : "Pending",
    professionId: row.profession_id ?? "",
    rankId: row.rank_id ?? "",
  };
}

function mapApiImportFile(row: ApiMapImportFile): MapImportFile {
  return {
    id: row.id,
    fileName: row.file_name ?? "Untitled",
    status: IMPORT_STATUS_MAP[row.status ?? ""] ?? "Processing",
    validatedCount: row.validated_successfully ?? 0,
    errorCount: row.validation_error ?? 0,
    importedCount: row.imported_successfully ?? 0,
    createdBy: row.created_by ?? "",
    createdAt: row.created_at
      ? new Date(row.created_at * 1000).toLocaleDateString()
      : "",
  };
}

const importStatusIcon = (s: MapImportStatus) => {
  if (s === "Completed") return <CheckCircle2 className="h-4 w-4 text-[hsl(var(--status-success-fg))]" />;
  if (s === "Completed with Errors") return <AlertCircle className="h-4 w-4 text-[hsl(var(--status-warning-fg))]" />;
  if (s === "Failed") return <XCircle className="h-4 w-4 text-[hsl(var(--status-error-fg))]" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
};

const importStatusTone = (s: MapImportStatus) => {
  if (s === "Completed") return "success" as const;
  if (s === "Completed with Errors") return "warning" as const;
  if (s === "Failed") return "error" as const;
  return "neutral" as const;
};

// ─── Map Users Picker Modal ──────────────────────────────────────────────────

interface MappableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  staffId: string;
  phone: string;
  rank: string;
  status: string;
  alreadyMapped: boolean;
}

interface MapUsersModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  networkId: string;
  onMapped: () => void;
}

const MapUsersModal = ({ open, onOpenChange, networkId, onMapped }: MapUsersModalProps) => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<MappableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (q: string, token: string | null) => {
    if (!networkId) return;
    setLoading(true);
    try {
      const res = await listUsersForMapping({
        search_string: q,
        subnetwork_id: networkId,
        next_token: token,
      });
      const rows = ((res.content?.data as ApiNetworkUser[]) ?? []).map(
        (u): MappableUser => ({
          id: u.id,
          firstName: u.first_name ?? "",
          lastName: u.last_name ?? "",
          email: u.email ?? "",
          staffId: u.staff_id ?? "",
          phone: u.country_code && u.phone_number
            ? `${u.country_code} ${u.phone_number}`
            : (u.phone_number ?? ""),
          rank: u.rank_name ?? "",
          status: (u.status === "approved" || u.status === "active") ? "Active" : "Pending",
          alreadyMapped: u.is_mapped_to_subnetwork === 1,
        })
      );
      if (token) {
        setUsers((prev) => [...prev, ...rows]);
      } else {
        setUsers(rows);
      }
      setNextToken(res.content?.next_token ?? null);
      setHasMore(res.content?.has_more ?? false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [networkId]);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setUsers([]);
      setNextToken(null);
      fetchUsers("", null);
    }
  }, [open, fetchUsers]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setUsers([]);
      setNextToken(null);
      fetchUsers(search, null);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, open, fetchUsers]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!selected.size || !networkId) return;
    setSubmitting(true);
    try {
      await mapUsersToSubnetwork(Array.from(selected), networkId);
      appToast.success("Users mapped", {
        description: `${selected.size} user${selected.size > 1 ? "s" : ""} added to this subnetwork.`,
      });
      onOpenChange(false);
      onMapped();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to map users";
      appToast.error("Error", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Map Users"
      size="full"
      contentClassName="[&>button.absolute]:hidden"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!selected.size || submitting}>
            {submitting ? "Adding…" : `Add${selected.size ? ` (${selected.size})` : ""}`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, phone number or staff ID"
            className="h-11 w-full rounded-full border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="px-4 py-3 w-12">Select</th>
                  <th className="px-4 py-3 whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap">Mobile Number</th>
                  <th className="px-4 py-3 whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 whitespace-nowrap">Staff ID</th>
                  <th className="px-4 py-3 whitespace-nowrap">Rank</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-t border-border transition-colors ${
                      u.alreadyMapped
                        ? "opacity-50 cursor-not-allowed bg-muted/20"
                        : "hover:bg-accent/30 cursor-pointer"
                    }`}
                    onClick={() => !u.alreadyMapped && toggle(u.id)}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={u.alreadyMapped ? true : selected.has(u.id)}
                        disabled={u.alreadyMapped}
                        onCheckedChange={() => !u.alreadyMapped && toggle(u.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <AppAvatar name={`${u.firstName} ${u.lastName}`} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {u.firstName} {u.lastName}
                          </p>
                          {u.alreadyMapped && (
                            <p className="text-[10px] text-muted-foreground">Already mapped</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge tone={getStatusTone(u.status)}>{u.status}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.phone || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{u.email || "—"}</td>
                    <td className="px-4 py-3 font-mono whitespace-nowrap">{u.staffId || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{u.rank || "—"}</td>
                  </tr>
                ))}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground text-sm">
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {hasMore && !loading && (
            <div className="p-3 border-t border-border text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchUsers(search, nextToken)}
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppModal>
  );
};

// ─── Upload CSV Modal ─────────────────────────────────────────────────────────

interface UploadCsvModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUploaded: () => void;
}

const UploadCsvModal = ({ open, onOpenChange, onUploaded }: UploadCsvModalProps) => {
  const [mapBy, setMapBy] = useState<"email" | "staff_id">("email");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setProgress(0); setUploading(false); };

  useEffect(() => { if (!open) reset(); }, [open]);

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const uploadResult = await awsLinkGenerateExcel({
        file,
        awsFolderPath: "subnetwork_map_bulk_upload",
      });
      setProgress(30);
      await gcsFileUpload({
        signedUrl: uploadResult.signedUrl,
        file,
        onProgress: (pct) => setProgress(30 + Math.round(pct * 0.6)),
      });
      setProgress(90);
      await importNetworkMapFile(uploadResult.path, mapBy);
      setProgress(100);
      appToast.success("Upload started", {
        description: "Your file is being processed. Check Imported Files for status.",
      });
      onOpenChange(false);
      onUploaded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      appToast.error("Upload failed", { description: msg });
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Bulk Map Users"
      description="Upload a CSV file to map multiple users to this subnetwork at once."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!file || uploading}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <AppSelect
          label="Map By"
          required
          value={mapBy}
          onValueChange={(v) => setMapBy(v as "email" | "staff_id")}
          options={[
            { label: "Email", value: "email" },
            { label: "Staff ID", value: "staff_id" },
          ]}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium">
            CSV File <span className="text-destructive">*</span>
          </p>
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-secondary" />
                <span className="text-sm font-medium text-foreground">{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Click to select a CSV file
                </p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {uploading && (
          <div className="space-y-1">
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground text-right">{progress}%</p>
          </div>
        )}
      </div>
    </AppModal>
  );
};

// ─── Add Trainee Modal ────────────────────────────────────────────────────────

interface AddTraineeModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  professions: RefItem[];
  onAdded: () => void;
}

const AddTraineeModal = ({ open, onOpenChange, professions, onAdded }: AddTraineeModalProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [staffId, setStaffId] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [professionId, setProfessionId] = useState("");
  const [rankId, setRankId] = useState("");
  const [ranks, setRanks] = useState<RefItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setFirstName(""); setLastName(""); setEmail(""); setStaffId("");
      setCountryCode("+966"); setPhoneNumber("");
      setProfessionId(""); setRankId(""); setRanks([]); setErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (!professionId) { setRanks([]); setRankId(""); return; }
    listRanks(professionId)
      .then((res) => {
        const rows = (res.content?.data as Array<{ id: string; name: string }>) ?? [];
        setRanks(rows.map((r) => ({ id: r.id, name: r.name })));
        setRankId("");
      })
      .catch(() => {});
  }, [professionId]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (!email.trim() && !staffId.trim()) e.email = "Email or Staff ID is required";
    if (!phoneNumber.trim()) e.phone = "Phone number is required";
    if (!professionId) e.profession = "Profession is required";
    if (!rankId) e.rank = "Rank is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        country_code: countryCode,
        phone_number: phoneNumber.trim(),
        profession_id: professionId,
        rank_id: rankId,
      };
      if (email.trim()) body.email = email.trim();
      if (staffId.trim()) body.staff_id = staffId.trim();

      await createNetworkUser(body);
      appToast.success("Trainee added", {
        description: `${firstName} ${lastName} has been added.`,
      });
      onOpenChange(false);
      onAdded();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      appToast.error("Error", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add New Trainee"
      description="Create a new trainee user in this subnetwork."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Adding…" : "Add Trainee"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <AppInput
            label="First Name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            error={errors.firstName}
          />
          <AppInput
            label="Last Name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            error={errors.lastName}
          />
        </div>
        <AppInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          helper="Email or Staff ID required"
          error={errors.email}
        />
        <AppInput
          label="Staff ID"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          placeholder="Staff ID"
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Phone Number <span className="text-destructive">*</span>
          </p>
          <div className="flex gap-2">
            <AppSelect
              value={countryCode}
              onValueChange={setCountryCode}
              options={[
                { label: "+966 (SA)", value: "+966" },
                { label: "+91 (IN)", value: "+91" },
                { label: "+1 (US)", value: "+1" },
              ]}
            />
            <div className="flex-1">
              <AppInput
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number"
                error={errors.phone}
              />
            </div>
          </div>
        </div>
        <AppSelect
          label="Profession"
          required
          value={professionId}
          onValueChange={setProfessionId}
          options={professions.map((p) => ({ label: p.name, value: p.id }))}
          placeholder="Select profession"
          error={errors.profession}
        />
        <AppSelect
          label="Rank"
          required
          value={rankId}
          onValueChange={setRankId}
          options={ranks.map((r) => ({ label: r.name, value: r.id }))}
          placeholder={professionId ? "Select rank" : "Select profession first"}
          disabled={!professionId || !ranks.length}
          error={errors.rank}
        />
      </div>
    </AppModal>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const NetworkUsersPage = () => {
  const router = useRouter();
  const sidebarMargin = useSidebarMargin();
  const { scope } = useScope();
  const networkId = scope.networkId ?? "";

  // ── Users state ────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<NetworkUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersNextToken, setUsersNextToken] = useState<string | null>(null);
  const [usersHasMore, setUsersHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({ status: "all" });
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Import files state ─────────────────────────────────────────────────────
  const [importFiles, setImportFiles] = useState<MapImportFile[]>([]);
  const [importLoading, setImportLoading] = useState(true);
  const [importStatusFilter, setImportStatusFilter] = useState<Record<string, string>>({ status: "all" });

  // ── Reference data ─────────────────────────────────────────────────────────
  const [professions, setProfessions] = useState<RefItem[]>([]);

  // ── Modals ─────────────────────────────────────────────────────────────────
  const addTraineeModal = useDisclosure();
  const mapUsersModal = useDisclosure();
  const uploadCsvModal = useDisclosure();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // ── Load professions once ──────────────────────────────────────────────────
  useEffect(() => {
    listProfessions()
      .then((res) => {
        const rows = (res.content?.data as Array<{ id: string; name: string }>) ?? [];
        setProfessions(rows.map((r) => ({ id: r.id, name: r.name })));
      })
      .catch(() => {});
  }, []);

  // ── Load network users ─────────────────────────────────────────────────────
  const loadUsers = useCallback(async (token: string | null = null, q = search) => {
    if (!networkId) return;
    if (!token) setUsersLoading(true);
    try {
      const res = await listNetworkUsers({
        next_token: token,
        search_string: q || undefined,
      });
      const rows = ((res.content?.data as ApiNetworkUser[]) ?? []).map(mapApiUser);
      setUsers(token ? (prev) => [...prev, ...rows] : rows);
      setUsersNextToken(res.content?.next_token ?? null);
      setUsersHasMore(res.content?.has_more ?? false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load users";
      appToast.error("Error", { description: msg });
    } finally {
      setUsersLoading(false);
    }
  }, [networkId, search]);

  useEffect(() => {
    loadUsers(null, "");
  }, [networkId]);

  // debounced search
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      loadUsers(null, search);
    }, 300);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [search, loadUsers]);

  // ── Load import files ──────────────────────────────────────────────────────
  const loadImportFiles = useCallback(async () => {
    if (!networkId) return;
    setImportLoading(true);
    try {
      const status = importStatusFilter.status !== "all" ? importStatusFilter.status : undefined;
      const res = await listNetworkImportFiles({ status });
      const rows = ((res.content?.data as ApiMapImportFile[]) ?? []).map(mapApiImportFile);
      setImportFiles(rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load import files";
      appToast.error("Error", { description: msg });
    } finally {
      setImportLoading(false);
    }
  }, [networkId, importStatusFilter.status]);

  useEffect(() => { loadImportFiles(); }, [loadImportFiles]);

  // ── Remove user ────────────────────────────────────────────────────────────
  const handleRemoveUser = async (u: NetworkUser) => {
    if (
      !(await confirm({
        title: "Remove user",
        description: `Remove ${u.firstName} ${u.lastName} from this subnetwork?`,
        destructive: true,
        confirmLabel: "Remove",
      }))
    ) return;
    try {
      await removeNetworkUser(u.id);
      appToast.success("User removed");
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove user";
      appToast.error("Error", { description: msg });
    }
  };

  // ── Filtered users ─────────────────────────────────────────────────────────
  const displayedUsers = users.filter((u) => {
    if (filters.status !== "all" && u.status !== filters.status) return false;
    return true;
  });

  // ── Counts ─────────────────────────────────────────────────────────────────
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "Active").length;
  const pendingUsers = users.filter((u) => u.status === "Pending").length;

  // ── Columns ─────────────────────────────────────────────────────────────────
  const userColumns: DataTableColumn<NetworkUser>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      searchable: true,
      accessor: (u) => `${u.firstName} ${u.lastName}`,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <AppAvatar name={`${u.firstName} ${u.lastName}`} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{u.firstName} {u.lastName}</p>
            {u.staffId && (
              <p className="text-xs text-muted-foreground font-mono">{u.staffId}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Mobile Number",
      cell: (u) => <span className="text-sm text-muted-foreground">{u.phone || "—"}</span>,
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      searchable: true,
      hideOnMobile: true,
      cell: (u) => <span className="text-sm text-muted-foreground truncate">{u.email || "—"}</span>,
    },
    {
      key: "departments",
      header: "Departments",
      hideOnMobile: true,
      cell: (u) =>
        u.departments.length ? (
          <div className="flex flex-wrap gap-1">
            {u.departments.slice(0, 2).map((d) => (
              <AppBadge key={d} variant="outline" className="text-xs">{d}</AppBadge>
            ))}
            {u.departments.length > 2 && (
              <AppBadge variant="outline" className="text-xs">+{u.departments.length - 2}</AppBadge>
            )}
          </div>
        ) : <span className="text-sm text-muted-foreground">—</span>,
    },
    {
      key: "profession",
      header: "Profession",
      sortable: true,
      hideOnMobile: true,
      cell: (u) => <span className="text-sm text-muted-foreground">{u.profession || "—"}</span>,
    },
    {
      key: "rank",
      header: "Rank",
      sortable: true,
      hideOnMobile: true,
      cell: (u) => <span className="text-sm text-muted-foreground">{u.rank || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (u) => (
        <StatusBadge tone={getStatusTone(u.status)}>{u.status}</StatusBadge>
      ),
    },
  ];

  const importColumns: DataTableColumn<MapImportFile>[] = [
    {
      key: "fileName",
      header: "File Name",
      sortable: true,
      searchable: true,
      cell: (f) => (
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground">{f.fileName}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (f) => (
        <div className="flex items-center gap-2">
          {importStatusIcon(f.status)}
          <StatusBadge tone={importStatusTone(f.status)}>{f.status}</StatusBadge>
        </div>
      ),
    },
    {
      key: "validatedCount",
      header: "Validated",
      cell: (f) => <span className="text-sm tabular-nums">{f.validatedCount}</span>,
    },
    {
      key: "errorCount",
      header: "Errors",
      cell: (f) => (
        <span className={`text-sm tabular-nums ${f.errorCount > 0 ? "text-[hsl(var(--status-error-fg))]" : "text-muted-foreground"}`}>
          {f.errorCount}
        </span>
      ),
    },
    {
      key: "importedCount",
      header: "Imported",
      hideOnMobile: true,
      cell: (f) => (
        <span className="text-sm tabular-nums text-[hsl(var(--status-success-fg))]">{f.importedCount}</span>
      ),
    },
    {
      key: "createdBy",
      header: "Uploaded By",
      hideOnMobile: true,
      cell: (f) => <span className="text-sm text-muted-foreground">{f.createdBy || "—"}</span>,
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      hideOnMobile: true,
      cell: (f) => <span className="text-sm text-muted-foreground">{f.createdAt}</span>,
    },
  ];

  const tabItems = [
    {
      value: "users",
      label: "Users",
      icon: Users,
      content: (
        <div className="space-y-3">
          <DataTable<NetworkUser>
            columns={userColumns}
            data={displayedUsers}
            rowKey={(u) => u.id}
            loading={usersLoading}
            searchPlaceholder="Search network users…"
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
                    ],
                  },
                ]}
                value={filters}
                onChange={setFilters}
              />
            }
            rowActions={[
              {
                label: "Remove",
                icon: Trash2,
                destructive: true,
                onClick: handleRemoveUser,
              },
            ]}
            emptyState={{
              title: "No network users yet",
              description: "Add trainees or map existing users to this subnetwork.",
            }}
          />
          {usersHasMore && !usersLoading && (
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => loadUsers(usersNextToken)}>
                Load more
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      value: "imports",
      label: "Imported Files List",
      icon: FileSpreadsheet,
      content: (
        <DataTable<MapImportFile>
          columns={importColumns}
          data={importFiles}
          rowKey={(f) => f.id}
          loading={importLoading}
          searchPlaceholder="Search import files…"
          onRowClick={(f) =>
            router.push(
              `/admin/network-users/files/${f.id}?fileName=${encodeURIComponent(f.fileName)}`
            )
          }
          toolbar={
            <FilterBar
              filters={[
                {
                  key: "status",
                  label: "Status",
                  width: 200,
                  options: [
                    { label: "Completed", value: "success" },
                    { label: "Completed with Errors", value: "partial_success" },
                    { label: "Failed", value: "error" },
                    { label: "Processing", value: "validating" },
                  ],
                },
              ]}
              value={importStatusFilter}
              onChange={setImportStatusFilter}
            />
          }
          rowActions={[
            {
              label: "View Details",
              icon: Eye,
              onClick: (f) =>
                router.push(
                  `/admin/network-users/files/${f.id}?fileName=${encodeURIComponent(f.fileName)}`
                ),
            },
          ]}
          emptyState={{
            title: "No import files yet",
            description: "Upload a CSV to bulk-map users to this subnetwork.",
          }}
        />
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        {confirmDialog}

        <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
          <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div>
                <h1 className="text-2xl font-bold text-foreground">Network Users</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage users mapped to this subnetwork.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={uploadCsvModal.onOpen} className="gap-2">
                  <Upload className="h-4 w-4" /> Bulk Upload
                </Button>
                <Button variant="outline" size="sm" onClick={mapUsersModal.onOpen} className="gap-2">
                  <UserPlus className="h-4 w-4" /> Map Users
                </Button>
                <Button size="sm" onClick={addTraineeModal.onOpen} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Trainee
                </Button>
              </div>
            </motion.div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AppStatCard label="Total Users" value={totalUsers} icon={Users} />
              <AppStatCard label="Active" value={activeUsers} icon={CheckCircle2} />
              <AppStatCard label="Pending" value={pendingUsers} icon={Clock} />
            </div>

            {/* Tabs */}
            <AppTabs items={tabItems} defaultValue="users" />
          </div>
        </main>

        {/* Modals */}
        <AddTraineeModal
          open={addTraineeModal.open}
          onOpenChange={addTraineeModal.setOpen}
          professions={professions}
          onAdded={() => loadUsers(null, "")}
        />
        <MapUsersModal
          open={mapUsersModal.open}
          onOpenChange={mapUsersModal.setOpen}
          networkId={networkId}
          onMapped={() => loadUsers(null, "")}
        />
        <UploadCsvModal
          open={uploadCsvModal.open}
          onOpenChange={uploadCsvModal.setOpen}
          onUploaded={loadImportFiles}
        />
      </div>
    </ProtectedRoute>
  );
};

export default NetworkUsersPage;
