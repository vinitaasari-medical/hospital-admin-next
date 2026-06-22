'use client';
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Eye,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import {
  DataTable,
  type DataTableColumn,
  AppModal,
  AppInput,
  AppSelect,
  AppStatCard,
  AppAvatar,
  AppBadge,
  AppTabs,
  StatusBadge,
  getStatusTone,
  FilterBar,
  appToast,
} from "@/components/common";

import {
  listUsers,
  createUser,
  updateUser,
  deleteUsers,
  removeUserFromAllDepartment,
  removeUserFromSubnetwork,
  listProfessions,
  listRanks,
  listSubnetworks,
  listImportFiles,
  viewImportFile,
  bulkUserUpload,
} from "@/lib/api/users-api";
import { awsLinkGenerateExcel, gcsFileUpload } from "@/lib/api/file-uploader";

// ─── Types ─────────────────────────────────────────────────────────────────

type UserStatus = "Active" | "Pending" | "Suspended";
type UserType = "Full Time" | "Part Time" | "Contractor";
type ImportStatus = "Completed" | "Completed with Errors" | "Failed" | "Processing";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  staffId: string;
  phone: string;
  userType: UserType;
  profession: string;
  rank: string;
  department: string;
  subNetworks: string[];
  status: UserStatus;
  source: "Manual" | "Import";
  createdBy: string;
  createdAt: string;
  // API-specific fields preserved for edit/delete flows
  professionId: string;
  rankId: string;
  rawUserType: "fulltime" | "trainee";
  rawCountryCode: string;
  rawPhoneNumber: string;
  subNetworkIds: string[];
  rawDepartments: Array<{ id: string; department_id?: string; department_name: string }>;
}

interface ImportError {
  row: number;
  field: string;
  value: string;
  message: string;
}

interface ImportFile {
  id: string;
  fileName: string;
  uploadedAt: string;
  totalRows: number;
  validatedCount: number;
  errorCount: number;
  importedCount: number;
  status: ImportStatus;
  errors: ImportError[];
  createdBy: string;
}

interface RefItem { id: string; name: string; }

// ─── API response shapes ────────────────────────────────────────────────────

interface ApiUser {
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
  user_type: "fulltime" | "trainee";
  status?: string;
  subnetwork_ids?: string[];
  departments?: Array<{ id: string; department_id?: string; department_name: string }>;
  created_by?: string;
  created_at?: number;
}

interface ApiImportFile {
  id: string;
  file_name?: string;
  status?: string;
  validated_successfully?: number;
  validation_error?: number;
  imported_successfully?: number;
  created_by?: string;
  created_at?: number;
}

interface ApiImportRecord {
  first_name?: string; first_name_error?: string;
  last_name?: string; last_name_error?: string;
  email?: string; email_error?: string;
  staff_id?: string; staff_id_error?: string;
  country_code?: string; country_code_error?: string;
  mobile_number?: string; mobile_number_error?: string;
  profession?: string; profession_error?: string;
  rank_name?: string; rank_error?: string;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

const IMPORT_STATUS_MAP: Record<string, ImportStatus> = {
  success: "Completed",
  partial_success: "Completed with Errors",
  error: "Failed",
  validating: "Processing",
  pending: "Processing",
};

function mapApiUser(row: ApiUser, subnetworkMap: Map<string, string>): User {
  const subNetworkIds = row.subnetwork_ids ?? [];
  const subNetworks = subNetworkIds
    .map((id) => subnetworkMap.get(id))
    .filter((n): n is string => !!n);

  return {
    id: row.id,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    email: row.email ?? "",
    staffId: row.staff_id ?? "",
    phone:
      row.country_code && row.phone_number
        ? `${row.country_code} ${row.phone_number}`
        : "",
    userType: row.user_type === "fulltime" ? "Full Time" : "Part Time",
    profession: row.profession_name ?? "",
    rank: row.rank_name ?? "",
    department:
      row.departments?.length ? row.departments[0].department_name : "NA",
    subNetworks,
    status: row.status === "pending" ? "Pending" : "Active",
    source: "Manual",
    createdBy: row.created_by ?? "",
    createdAt: row.created_at
      ? new Date(row.created_at * 1000).toISOString()
      : "",
    professionId: row.profession_id ?? "",
    rankId: row.rank_id ?? "",
    rawUserType: row.user_type ?? "fulltime",
    rawCountryCode: row.country_code ?? "+966",
    rawPhoneNumber: row.phone_number ?? "",
    subNetworkIds,
    rawDepartments: row.departments ?? [],
  };
}

function mapApiImportFile(row: ApiImportFile): ImportFile {
  return {
    id: row.id,
    fileName: row.file_name ?? "",
    uploadedAt: row.created_at
      ? new Date(row.created_at * 1000).toISOString()
      : "",
    totalRows: (row.validated_successfully ?? 0) + (row.validation_error ?? 0),
    validatedCount: row.validated_successfully ?? 0,
    errorCount: row.validation_error ?? 0,
    importedCount: row.imported_successfully ?? 0,
    status: IMPORT_STATUS_MAP[row.status ?? ""] ?? "Processing",
    errors: [],
    createdBy: row.created_by ?? "",
  };
}

function mapImportRecordToError(
  record: ApiImportRecord,
  rowIndex: number
): ImportError | null {
  const errors: string[] = [];
  if (record.first_name_error && record.first_name_error !== "NA")
    errors.push(`First Name: ${record.first_name_error}`);
  if (record.last_name_error && record.last_name_error !== "NA")
    errors.push(`Last Name: ${record.last_name_error}`);
  if (record.email_error && record.email_error !== "NA")
    errors.push(`Email: ${record.email_error}`);
  if (record.staff_id_error && record.staff_id_error !== "NA")
    errors.push(`Staff ID: ${record.staff_id_error}`);
  if (record.mobile_number_error && record.mobile_number_error !== "NA")
    errors.push(`Phone: ${record.mobile_number_error}`);
  if (record.profession_error && record.profession_error !== "NA")
    errors.push(`Profession: ${record.profession_error}`);
  if (record.rank_error && record.rank_error !== "NA")
    errors.push(`Rank: ${record.rank_error}`);

  if (!errors.length) return null;

  return {
    row: rowIndex + 1,
    field: "validation",
    value: record.email ?? record.staff_id ?? "",
    message: errors.join("; "),
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const REQUIRED_COLUMNS = ["first_name", "last_name", "email", "staff_id", "mobile_number", "user_type", "profession", "rank"];
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const isValidPhone = (p: string) => p.trim().replace(/\D/g, "").length >= 7;

// ─── Component ──────────────────────────────────────────────────────────────

const UserManagement = () => {
  const router = useRouter();
  const sidebarMargin = useSidebarMargin();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Reference data from API ──
  const [professions, setProfessions] = useState<RefItem[]>([]);
  const [filterRanks, setFilterRanks] = useState<RefItem[]>([]);
  const [formRanks, setFormRanks] = useState<RefItem[]>([]);
  const [subnetworkList, setSubnetworkList] = useState<RefItem[]>([]);
  const [subnetworkMap, setSubnetworkMap] = useState<Map<string, string>>(new Map());
  const isClusterAdmin =
    typeof window !== "undefined" &&
    localStorage.getItem("is_cluster_admin") === "true";
  const isSingleNetwork =
    typeof window !== "undefined" &&
    localStorage.getItem("is_single") === "1";

  // ── Users list ──
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [nextUserToken, setNextUserToken] = useState<string | null>(null);

  // ── Import files list ──
  const [imports, setImports] = useState<ImportFile[]>([]);
  const [importsLoading, setImportsLoading] = useState(false);

  // ── Active tab ──
  const [activeTab, setActiveTab] = useState("users");

  // ── Filters ──
  const [userFilters, setUserFilters] = useState<Record<string, string>>({
    userType: "all",
    department: "all",
    profession: "all",
    rank: "all",
    status: "all",
  });
  const [importFilters, setImportFilters] = useState<Record<string, string>>({
    status: "all",
  });

  // ── Search (server-side, debounced) ──
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Add / Edit form ──
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fFirstName, setFFirstName] = useState("");
  const [fLastName, setFLastName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fStaffId, setFStaffId] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fUserTypeRaw, setFUserTypeRaw] = useState<"fulltime" | "trainee" | "">("");
  const [fProfessionId, setFProfessionId] = useState("");
  const [fRankId, setFRankId] = useState("");
  const [fSubnetworkId, setFSubnetworkId] = useState("");

  // ── Delete / Remove user flow ──
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // Multi-step single-user removal (role checking)
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);
  const [removeCheckLoading, setRemoveCheckLoading] = useState(false);
  const [removeErrorData, setRemoveErrorData] = useState<{
    errorData: Array<{ type: string; department_name?: string; active_duties?: Array<{ title: string }> }>;
  } | null>(null);
  const [removeNoConflicts, setRemoveNoConflicts] = useState(false);
  const [removeFinalDone, setRemoveFinalDone] = useState(false);
  const [removeConfirmLoading, setRemoveConfirmLoading] = useState(false);

  // ── Import modal ──
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // ── View import file errors ──
  const [viewImport, setViewImport] = useState<ImportFile | null>(null);
  const [viewImportErrors, setViewImportErrors] = useState<ImportError[]>([]);
  const [viewImportLoading, setViewImportLoading] = useState(false);

  // ─── API: fetch users ──────────────────────────────────────────────────────

  const fetchUsers = useCallback(
    async (token: string | null, refresh = false) => {
      setUsersLoading(true);
      try {
        const profId =
          userFilters.profession !== "all" ? userFilters.profession : null;
        const rkId =
          userFilters.rank !== "all" ? userFilters.rank : null;

        const res = await listUsers({
          next_token: token,
          profession_id: profId,
          rank_id: rkId,
          search_string: userSearchQuery || undefined,
        });

        const data = (res.content?.data ?? []) as ApiUser[];
        const mapped = data.map((row) => mapApiUser(row, subnetworkMap));

        if (refresh) {
          setUsers(mapped);
        } else {
          setUsers((prev) => [...prev, ...mapped]);
        }
        setHasMoreUsers(res.content?.has_more ?? false);
        setNextUserToken(res.content?.next_token ?? null);
      } catch (err: unknown) {
        const e = err as { message?: string };
        toast({
          title: "Failed to load users",
          description: e?.message ?? "Something went wrong",
          variant: "destructive",
        });
      } finally {
        setUsersLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userFilters.profession, userFilters.rank, userSearchQuery, subnetworkMap]
  );

  // ─── API: fetch import files ───────────────────────────────────────────────

  const fetchImports = useCallback(
    async (token: string | null = null, refresh = false) => {
      setImportsLoading(true);
      try {
        const statusVal =
          importFilters.status !== "all" ? importFilters.status : null;
        const res = await listImportFiles({
          next_token: token,
          status: statusVal,
        });
        const data = (res.content?.data ?? []) as ApiImportFile[];
        const mapped = data.map(mapApiImportFile);
        if (refresh) {
          setImports(mapped);
        } else {
          setImports((prev) => [...prev, ...mapped]);
        }
      } catch (err: unknown) {
        const e = err as { message?: string };
        toast({
          title: "Failed to load import files",
          description: e?.message ?? "Something went wrong",
          variant: "destructive",
        });
      } finally {
        setImportsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [importFilters.status]
  );

  // ─── Initial data load ─────────────────────────────────────────────────────

  useEffect(() => {
    // Professions
    listProfessions()
      .then((res) => {
        const data = (res.content?.data ?? []) as RefItem[];
        setProfessions(data);
      })
      .catch(() => {});

    // Subnetworks (cluster admins only)
    if (isClusterAdmin) {
      listSubnetworks()
        .then((res) => {
          const data = (res.content?.data ?? []) as Array<{
            id: string;
            name: string;
          }>;
          setSubnetworkList(data);
          setSubnetworkMap(new Map(data.map((n) => [n.id, n.name])));
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch users once subnetworkMap is ready (or on mount if no subnets needed)
  useEffect(() => {
    fetchUsers(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subnetworkMap]);

  // ─── Re-fetch when server-side filters change ──────────────────────────────

  useEffect(() => {
    fetchUsers(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFilters.profession, userFilters.rank]);

  // Fetch ranks for rank filter when profession filter changes
  useEffect(() => {
    if (userFilters.profession && userFilters.profession !== "all") {
      listRanks(userFilters.profession)
        .then((res) => {
          const data = (res.content?.data ?? []) as RefItem[];
          setFilterRanks(data);
        })
        .catch(() => {});
    } else {
      setFilterRanks([]);
    }
    // Reset rank filter when profession changes
    setUserFilters((prev) => ({ ...prev, rank: "all" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFilters.profession]);

  // ─── Re-fetch imports when status filter changes ───────────────────────────

  useEffect(() => {
    fetchImports(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importFilters.status]);

  // Load imports when switching to imports tab
  useEffect(() => {
    if (activeTab === "imports") {
      fetchImports(null, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ─── Debounced server-side search ─────────────────────────────────────────

  const handleSearchChange = useCallback((value: string) => {
    setUserSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      // fetchUsers will be triggered by the userSearchQuery state change
    }, 300);
  }, []);

  // Re-fetch on search query change (300ms debounce is handled above)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchUsers(null, true);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearchQuery]);

  // ─── Fetch ranks for form when profession changes ──────────────────────────

  useEffect(() => {
    if (fProfessionId) {
      listRanks(fProfessionId)
        .then((res) => {
          const data = (res.content?.data ?? []) as RefItem[];
          setFormRanks(data);
        })
        .catch(() => {});
      setFRankId(""); // Reset rank when profession changes
    } else {
      setFormRanks([]);
    }
  }, [fProfessionId]);

  // ─── Form helpers ──────────────────────────────────────────────────────────

  const resetForm = () => {
    setFFirstName("");
    setFLastName("");
    setFEmail("");
    setFStaffId("");
    setFPhone("");
    setFUserTypeRaw("");
    setFProfessionId("");
    setFRankId("");
    setFSubnetworkId("");
    setFormRanks([]);
  };

  const openAdd = () => {
    resetForm();
    setEditUser(null);
    setFormOpen(true);
  };

  const openEdit = (u: User) => {
    setFFirstName(u.firstName);
    setFLastName(u.lastName);
    setFEmail(u.email);
    setFStaffId(u.staffId);
    setFPhone(u.phone);
    setFUserTypeRaw(u.rawUserType);
    setFProfessionId(u.professionId);
    setFRankId(u.rankId);
    setFSubnetworkId(u.subNetworkIds[0] ?? "");
    setEditUser(u);
    setFormOpen(true);
  };

  // ─── Validation ────────────────────────────────────────────────────────────

  const identifierValid =
    isValidEmail(fEmail) || fStaffId.trim().length > 0;

  const formValid =
    fFirstName.trim() &&
    fLastName.trim() &&
    identifierValid &&
    isValidPhone(fPhone) &&
    !!fUserTypeRaw &&
    !!fProfessionId &&
    !!fRankId;

  // ─── Save user (create / update) ──────────────────────────────────────────

  const saveUser = async () => {
    if (!formValid) return;
    setFormLoading(true);

    try {
      // Parse phone: fPhone is "+966 XXXXXXXX"
      const parts = fPhone.trim().split(" ");
      const countryCode = parts[0] ?? "+966";
      const nationalNumber = parts.slice(1).join("") || fPhone.replace(/\D/g, "");

      const body: Record<string, unknown> = {
        first_name: fFirstName.trim(),
        last_name: fLastName.trim(),
        profession_id: fProfessionId,
        rank_id: fRankId,
        user_type: fUserTypeRaw,
      };

      if (fEmail.trim()) body.email = fEmail.trim();
      if (fStaffId.trim()) body.staff_id = fStaffId.trim();

      if (editUser) {
        body.user_id = editUser.id;

        // Phone: keep original if user hasn't changed it
        if (nationalNumber && nationalNumber !== editUser.rawPhoneNumber) {
          body.phone_number = nationalNumber;
          body.country_code = countryCode;
        } else {
          body.phone_number = editUser.rawPhoneNumber;
          body.country_code = editUser.rawCountryCode;
        }

        // Subnetworks: merge previous department IDs with newly selected
        const prevIds = editUser.rawDepartments.map(
          (d) => d.department_id ?? d.id
        );
        const newId = fSubnetworkId ? [fSubnetworkId] : [];
        const finalIds = Array.from(new Set([...prevIds, ...newId]));
        if (!isSingleNetwork) body.subnetwork_ids = finalIds;
      } else {
        body.phone_number = nationalNumber;
        body.country_code = countryCode;
        if (!isSingleNetwork && fSubnetworkId) {
          body.subnetwork_ids = [fSubnetworkId];
        }
      }

      if (editUser) {
        await updateUser(body);
        appToast.success("User updated", {
          description: `${fFirstName} ${fLastName} updated.`,
        });
      } else {
        await createUser(body);
        appToast.success("User added", {
          description: `${fFirstName} ${fLastName} created.`,
        });
      }

      setFormOpen(false);
      setEditUser(null);
      fetchUsers(null, true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({
        title: editUser ? "Update failed" : "Create failed",
        description: e?.message ?? "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Delete users (bulk row action) ───────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteLoading(true);
    try {
      await deleteUsers([deleteUser.id]);
      appToast.success("User removed", {
        description: `${deleteUser.firstName} ${deleteUser.lastName} removed.`,
      });
      setDeleteUser(null);
      fetchUsers(null, true);
    } catch (err: unknown) {
      const e = err as { message?: string; userMessage?: string };
      if (e?.userMessage === "USER_REMOVAL_NOT_ELIGIBLE") {
        toast({
          title: "Cannot delete user",
          description:
            "This user has active on-duty assignments or holds a department head role. Remove those assignments first.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Delete failed",
          description: e?.message ?? "Something went wrong",
          variant: "destructive",
        });
      }
      setDeleteUser(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Single-user removal flow (role-checking, from row action) ────────────

  const openRemoveUser = useCallback(async (u: User) => {
    setRemoveTarget(u);
    setRemoveErrorData(null);
    setRemoveNoConflicts(false);
    setRemoveFinalDone(false);
    setRemoveOpen(true);
    setRemoveCheckLoading(true);

    try {
      // Check roles without force-deleting
      await removeUserFromAllDepartment(u.id, false);
      setRemoveNoConflicts(true);
    } catch (err: unknown) {
      const e = err as { errorData?: unknown };
      if (e?.errorData && Array.isArray(e.errorData)) {
        setRemoveErrorData({ errorData: e.errorData as never[] });
      } else {
        setRemoveNoConflicts(true);
      }
    } finally {
      setRemoveCheckLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemoveAllRoles = async () => {
    if (!removeTarget) return;
    setRemoveCheckLoading(true);
    try {
      await removeUserFromAllDepartment(removeTarget.id, true);
      setRemoveErrorData(null);
      setRemoveFinalDone(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({
        title: "Failed to remove roles",
        description: e?.message ?? "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setRemoveCheckLoading(false);
    }
  };

  const handleConfirmRemoveUser = async () => {
    if (!removeTarget) return;
    setRemoveConfirmLoading(true);
    try {
      const hasSub =
        typeof window !== "undefined" && localStorage.getItem("sub");
      if (!hasSub) {
        await deleteUsers([removeTarget.id]);
      } else {
        await removeUserFromSubnetwork(removeTarget.id);
      }
      appToast.success("User deleted", {
        description: `${removeTarget.firstName} ${removeTarget.lastName} has been deleted.`,
      });
      setRemoveOpen(false);
      setRemoveTarget(null);
      fetchUsers(null, true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({
        title: "Delete failed",
        description: e?.message ?? "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setRemoveConfirmLoading(false);
    }
  };

  // ─── Import: file selection ────────────────────────────────────────────────

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.name.match(/\.csv$/i)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file only.",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      if (file.size === 0) {
        toast({
          title: "Empty file",
          description: "The selected file is empty.",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 20 MB.",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      setImportFile(file);
      setImportErrors([]);
      setImportProgress(0);

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
            defval: "",
          });
          if (json.length === 0) {
            toast({
              title: "Empty file",
              description: "No data rows.",
              variant: "destructive",
            });
            setImportFile(null);
            return;
          }
          const normalized = json.map((row) => {
            const out: Record<string, string> = {};
            Object.entries(row).forEach(([k, v]) => {
              out[k.toLowerCase().trim().replace(/\s+/g, "_")] = String(v).trim();
            });
            return out;
          });
          const headers = Object.keys(normalized[0]);
          const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
          if (missing.length > 0) {
            setImportErrors([
              {
                row: 0,
                field: "format",
                value: "",
                message: `Missing required columns: ${missing.join(", ")}`,
              },
            ]);
            setImportPreview([]);
            return;
          }
          const errors: ImportError[] = [];
          normalized.forEach((row, idx) => {
            if (!row.first_name?.trim())
              errors.push({
                row: idx + 2,
                field: "first_name",
                value: row.first_name || "",
                message: "First name is required",
              });
            if (!row.last_name?.trim())
              errors.push({
                row: idx + 2,
                field: "last_name",
                value: row.last_name || "",
                message: "Last name is required",
              });
            if (
              !isValidEmail(row.email || "") &&
              !row.staff_id?.trim()
            ) {
              errors.push({
                row: idx + 2,
                field: "email/staff_id",
                value: row.email || "",
                message: "Email or Staff ID required",
              });
            }
            if (!isValidPhone(row.mobile_number || ""))
              errors.push({
                row: idx + 2,
                field: "mobile_number",
                value: row.mobile_number || "",
                message: "Phone invalid",
              });
            if (!row.profession?.trim())
              errors.push({
                row: idx + 2,
                field: "profession",
                value: "",
                message: "Profession required",
              });
            if (!row.rank?.trim())
              errors.push({
                row: idx + 2,
                field: "rank",
                value: "",
                message: "Rank required",
              });
            if (!["fulltime", "trainee"].includes((row.user_type || "").toLowerCase().trim()))
              errors.push({
                row: idx + 2,
                field: "user_type",
                value: row.user_type || "",
                message: 'User type must be "fulltime" or "trainee"',
              });
          });
          setImportErrors(errors);
          setImportPreview(normalized.slice(0, 5));
        } catch {
          toast({
            title: "Parse error",
            description: "Could not read the file.",
            variant: "destructive",
          });
          setImportFile(null);
        }
      };
      reader.readAsArrayBuffer(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [toast]
  );

  // ─── Import: run (S3 upload → bulkuserupload API) ─────────────────────────

  const runImport = useCallback(async () => {
    if (!importFile) return;
    if (importErrors.length > 0 && importErrors[0].field === "format") return;

    setImporting(true);
    setImportProgress(0);

    try {
      // 1. Get signed URL and upload to S3
      const uploadResult = await awsLinkGenerateExcel({
        file: importFile,
        awsFolderPath: "user_bulk_upload",
      });

      await gcsFileUpload({
        signedUrl: uploadResult.signedUrl,
        file: uploadResult.file,
        onProgress: (pct) => setImportProgress(Math.round(pct * 0.8)), // 0–80%
      });

      setImportProgress(90);

      // 2. Notify backend
      await bulkUserUpload(uploadResult.path);

      setImportProgress(100);
      appToast.success("File uploaded", {
        description: "Bulk import started. Check the Imported Files List tab.",
      });

      setImportOpen(false);
      setImportFile(null);
      setImportPreview([]);
      setImportErrors([]);
      setActiveTab("imports");
      fetchImports(null, true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({
        title: "Import failed",
        description: e?.message ?? "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }, [importFile, importErrors, toast, fetchImports]);

  // ─── Download template ─────────────────────────────────────────────────────

  const downloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/users_template.csv";
    link.download = "users_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── View import file details ──────────────────────────────────────────────

  const handleViewImport = useCallback(
    async (imp: ImportFile) => {
      setViewImport(imp);
      setViewImportErrors([]);
      setViewImportLoading(true);

      try {
        const res = await viewImportFile(imp.id);
        const records = (res.content?.data ?? []) as ApiImportRecord[];
        const errors = records
          .map((r, i) => mapImportRecordToError(r, i))
          .filter((e): e is ImportError => e !== null);
        setViewImportErrors(errors);
      } catch {
        // If fetch fails, show any errors already on the import record
        setViewImportErrors(imp.errors);
      } finally {
        setViewImportLoading(false);
      }
    },
    []
  );

  // ─── Computed: client-side filtered users ─────────────────────────────────
  // Profession and rank are server-side — only userType, status, department
  // need client-side filtering within the loaded set.

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        if (
          userFilters.userType !== "all" &&
          u.userType !== userFilters.userType
        )
          return false;
        if (
          userFilters.status !== "all" &&
          u.status !== userFilters.status
        )
          return false;
        if (
          userFilters.department !== "all" &&
          u.department !== userFilters.department
        )
          return false;
        return true;
      }),
    [users, userFilters]
  );

  const filteredImports = useMemo(
    () =>
      imports.filter((i) => {
        // status filter is already server-side; this covers any residual
        if (
          importFilters.status !== "all" &&
          i.status !== importFilters.status
        )
          return false;
        return true;
      }),
    [imports, importFilters]
  );

  // ─── Computed: departments list (unique from loaded users) ────────────────

  const departmentOptions = useMemo(() => {
    const depts = new Set(users.map((u) => u.department).filter(Boolean));
    return Array.from(depts).map((d) => ({ label: d, value: d }));
  }, [users]);

  // ─── Column definitions ────────────────────────────────────────────────────

  const userColumns: DataTableColumn<User>[] = [
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
            <p className="font-medium text-foreground truncate">
              {u.firstName} {u.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {u.userType}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Mobile Number",
      hideOnMobile: true,
      cell: (u) => (
        <span className="text-sm text-muted-foreground">{u.phone}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortable: true,
      searchable: true,
      hideOnMobile: true,
      cell: (u) => (
        <span className="text-sm text-muted-foreground">{u.email || "-"}</span>
      ),
    },
    {
      key: "staffId",
      header: "Staff ID",
      sortable: true,
      searchable: true,
      hideOnMobile: true,
      cell: (u) => (
        <span className="text-sm font-mono text-foreground">
          {u.staffId || "-"}
        </span>
      ),
    },
    {
      key: "subNetworks",
      header: "Sub-Network",
      hideOnMobile: true,
      cell: (u) => (
        <div className="flex items-center gap-1 flex-wrap">
          {u.subNetworks.length ? (
            u.subNetworks.map((n) => (
              <AppBadge key={n} variant="secondary" className="text-[11px]">
                {n}
              </AppBadge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      hideOnMobile: true,
      cell: (u) => (
        <span className="text-sm text-foreground">{u.department}</span>
      ),
    },
    {
      key: "profession",
      header: "Profession",
      sortable: true,
      cell: (u) => (
        <span className="text-sm text-foreground">{u.profession || "-"}</span>
      ),
    },
    {
      key: "rank",
      header: "Rank",
      sortable: true,
      hideOnMobile: true,
      cell: (u) => (
        <span className="text-sm text-muted-foreground">{u.rank || "-"}</span>
      ),
    },
    {
      key: "userType",
      header: "User Type",
      sortable: true,
      cell: (u) => (
        <AppBadge variant="secondary">{u.userType}</AppBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      hideOnMobile: true,
      cell: (u) => (
        <StatusBadge tone={getStatusTone(u.status)}>{u.status}</StatusBadge>
      ),
    },
  ];

  const importColumns: DataTableColumn<ImportFile>[] = [
    {
      key: "fileName",
      header: "File Name",
      sortable: true,
      searchable: true,
      cell: (i) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
            <FileSpreadsheet className="h-4 w-4 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{i.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(i.uploadedAt).toLocaleString("en", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (i) => (
        <StatusBadge tone={getStatusTone(i.status)}>{i.status}</StatusBadge>
      ),
    },
    {
      key: "validated",
      header: "Validated Successfully",
      hideOnMobile: true,
      cell: (i) => (
        <span className="text-sm text-foreground font-medium">
          {i.validatedCount}
        </span>
      ),
    },
    {
      key: "errors",
      header: "Validation Errors",
      hideOnMobile: true,
      cell: (i) => (
        <span
          className={`text-sm font-medium ${
            i.errorCount > 0 ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {i.errorCount}
        </span>
      ),
    },
    {
      key: "imported",
      header: "Imported Successfully",
      hideOnMobile: true,
      cell: (i) => (
        <span className="text-sm text-foreground font-medium">
          {i.importedCount} / {i.totalRows}
        </span>
      ),
    },
  ];

  // ─── Form fields (same layout as before, options from API) ────────────────

  const userFormFields = (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppInput
          label="First Name"
          required
          value={fFirstName}
          onChange={(e) => setFFirstName(e.target.value)}
          placeholder="Write name"
          maxLength={50}
        />
        <AppInput
          label="Last Name"
          required
          value={fLastName}
          onChange={(e) => setFLastName(e.target.value)}
          placeholder="Write name"
          maxLength={50}
        />
      </div>

      <AppInput
        label="Email"
        type="email"
        value={fEmail}
        onChange={(e) => setFEmail(e.target.value)}
        placeholder="Enter Email"
        maxLength={255}
      />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        OR
        <div className="h-px flex-1 bg-border" />
      </div>

      <AppInput
        label="Staff ID"
        value={fStaffId}
        onChange={(e) => setFStaffId(e.target.value)}
        placeholder="Enter Staff ID"
        maxLength={32}
      />

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Phone Number <span className="text-destructive">*</span>
        </label>
        <div className="flex">
          <div className="flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground">
            +966
          </div>
          <Input
            value={fPhone.replace(/^\+966\s?/, "")}
            onChange={(e) =>
              setFPhone(`+966 ${e.target.value.replace(/\D/g, "")}`)
            }
            placeholder="5XXXXXXXX"
            maxLength={15}
            className="rounded-l-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppSelect
          label="User Type"
          required
          value={fUserTypeRaw}
          onValueChange={(v) => setFUserTypeRaw(v as "fulltime" | "trainee")}
          placeholder="Select User Type"
          options={[
            { label: "Full-Time", value: "fulltime" },
            { label: "Part-Time", value: "trainee" },
          ]}
        />
        <AppSelect
          label="Profession"
          required
          value={fProfessionId}
          onValueChange={setFProfessionId}
          placeholder="Select Profession"
          options={professions.map((p) => ({ label: p.name, value: p.id }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AppSelect
          label="Rank"
          required
          value={fRankId}
          onValueChange={setFRankId}
          placeholder={fProfessionId ? "Select Rank" : "Select profession first"}
          options={formRanks.map((r) => ({ label: r.name, value: r.id }))}
        />
        {!isSingleNetwork && (
          <AppSelect
            label="Network (Optional)"
            value={fSubnetworkId}
            onValueChange={setFSubnetworkId}
            placeholder="Select Network"
            options={subnetworkList.map((n) => ({
              label: n.name,
              value: n.id,
            }))}
          />
        )}
      </div>
    </div>
  );

  // ─── Remove user dialog body ───────────────────────────────────────────────

  const departmentHeadArray =
    removeErrorData?.errorData
      .filter((e) => e.type === "department_head")
      .map((e) => ({ department_name: e.department_name ?? "" })) ?? [];

  const activeDutiesArray =
    removeErrorData?.errorData
      .filter((e) => e.type === "active_duties")
      .flatMap((e) => e.active_duties ?? []) ?? [];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />

      <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                User Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Add users manually or import in bulk from spreadsheets.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeTab === "imports" && (
                <>
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" /> Download Template
                  </Button>
                  <Button
                    onClick={() => setImportOpen(true)}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" /> Upload CSV file
                  </Button>
                </>
              )}
              {activeTab === "users" && (
                <Button onClick={openAdd} className="gap-2">
                  <Plus className="h-4 w-4" /> Add New User
                </Button>
              )}
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <AppStatCard
              label="Total Users"
              value={users.length.toString()}
              icon={Users}
            />
            <AppStatCard
              label="Active"
              value={users
                .filter((u) => u.status === "Active")
                .length.toString()}
              icon={CheckCircle2}
            />
            <AppStatCard
              label="Pending"
              value={users
                .filter((u) => u.status === "Pending")
                .length.toString()}
              icon={Clock}
            />
            <AppStatCard
              label="Imports"
              value={imports.length.toString()}
              icon={FileSpreadsheet}
            />
          </div>

          <AppTabs
            value={activeTab}
            onValueChange={setActiveTab}
            items={[
              {
                value: "users",
                label: "Users",
                icon: Users,
                content: (
                  <DataTable<User>
                    columns={userColumns}
                    data={filteredUsers}
                    rowKey={(u) => u.id}
                    loading={usersLoading}
                    searchPlaceholder="Search by name, email, phone or staff ID..."
                    onSearchChange={handleSearchChange}
                    selectable
                    rowInfo={(u) => ({
                      createdBy: u.createdBy,
                      createdAt: u.createdAt,
                    })}
                    toolbar={
                      <FilterBar
                        filters={[
                          {
                            key: "userType",
                            label: "User Type",
                            width: 160,
                            options: [
                              { label: "Full Time", value: "Full Time" },
                              { label: "Part Time", value: "Part Time" },
                            ],
                          },
                          {
                            key: "department",
                            label: "Department",
                            width: 180,
                            options: departmentOptions,
                          },
                          {
                            key: "profession",
                            label: "Profession",
                            width: 180,
                            options: professions.map((p) => ({
                              label: p.name,
                              value: p.id,
                            })),
                          },
                          {
                            key: "rank",
                            label: "Rank",
                            width: 180,
                            options: filterRanks.map((r) => ({
                              label: r.name,
                              value: r.id,
                            })),
                          },
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
                        value={userFilters}
                        onChange={setUserFilters}
                      />
                    }
                    rowActions={[
                      { label: "Edit", icon: Pencil, onClick: openEdit },
                      {
                        label: "Remove",
                        icon: Trash2,
                        destructive: true,
                        onClick: (u) => setDeleteUser(u),
                      },
                    ]}
                    bulkActions={[
                      {
                        label: "Delete selected",
                        icon: Trash2,
                        destructive: true,
                        onClick: async (rows) => {
                          try {
                            await deleteUsers(rows.map((r) => r.id));
                            appToast.success(
                              `${rows.length} user${rows.length > 1 ? "s" : ""} removed`
                            );
                            fetchUsers(null, true);
                          } catch (err: unknown) {
                            const e = err as {
                              message?: string;
                              userMessage?: string;
                            };
                            if (
                              e?.userMessage === "USER_REMOVAL_NOT_ELIGIBLE"
                            ) {
                              toast({
                                title: "Cannot delete",
                                description:
                                  "One or more users have active roles. Remove their assignments first.",
                                variant: "destructive",
                              });
                            } else {
                              toast({
                                title: "Delete failed",
                                description: e?.message ?? "Something went wrong",
                                variant: "destructive",
                              });
                            }
                          }
                        },
                      },
                    ]}
                    emptyState={{
                      title: "No users yet",
                      description:
                        "Add a user manually or import from a spreadsheet.",
                    }}
                  />
                ),
              },
              {
                value: "imports",
                label: "Imported Files List",
                icon: FileSpreadsheet,
                content: (
                  <DataTable<ImportFile>
                    columns={importColumns}
                    data={filteredImports}
                    rowKey={(i) => i.id}
                    loading={importsLoading}
                    searchPlaceholder="Search files..."
                    onRowClick={(imp) =>
                      router.push(
                        `/admin/users/files/${imp.id}?fileName=${encodeURIComponent(imp.fileName)}`
                      )
                    }
                    rowInfo={(i) => ({
                      createdBy: i.createdBy,
                      createdAt: i.uploadedAt,
                    })}
                    toolbar={
                      <FilterBar
                        filters={[
                          {
                            key: "status",
                            label: "Status",
                            width: 200,
                            options: [
                              { label: "Success", value: "success" },
                              {
                                label: "Partial Success",
                                value: "partial_success",
                              },
                              { label: "Error", value: "error" },
                              { label: "Pending", value: "pending" },
                              { label: "Validating", value: "validating" },
                            ],
                          },
                        ]}
                        value={importFilters}
                        onChange={setImportFilters}
                      />
                    }
                    rowActions={[
                      {
                        label: "View details",
                        icon: Eye,
                        onClick: (imp: ImportFile) =>
                          router.push(
                            `/admin/users/files/${imp.id}?fileName=${encodeURIComponent(imp.fileName)}`
                          ),
                      },
                    ]}
                    emptyState={{
                      title: "No imports yet",
                      description: "Upload a CSV to start importing users.",
                    }}
                  />
                ),
              },
            ]}
          />
        </div>
      </main>

      {/* ── Add / Edit User Modal ───────────────────────────────────────── */}
      <AppModal
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) {
            setFormOpen(false);
            setEditUser(null);
          } else {
            setFormOpen(true);
          }
        }}
        title={editUser ? "Edit User" : "Add User"}
        description={
          editUser ? "Update user details." : "Manually register a new user."
        }
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                setEditUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={saveUser}
              disabled={!formValid || formLoading}
            >
              {formLoading
                ? "Saving..."
                : editUser
                ? "Save Changes"
                : "Add"}
            </Button>
          </>
        }
      >
        {userFormFields}
      </AppModal>

      {/* ── Delete confirmation (simple row action) ────────────────────── */}
      <AlertDialog
        open={!!deleteUser}
        onOpenChange={(o) => !o && setDeleteUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteUser &&
                `"${deleteUser.firstName} ${deleteUser.lastName}" will be permanently removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Multi-step RemoveUser dialog (role checking) ───────────────── */}
      <Dialog
        open={removeOpen}
        onOpenChange={(o) => {
          if (!o) {
            setRemoveOpen(false);
            setRemoveTarget(null);
            setRemoveErrorData(null);
            setRemoveNoConflicts(false);
            setRemoveFinalDone(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Delete &quot;
              {removeTarget
                ? `${removeTarget.firstName} ${removeTarget.lastName}`
                : ""}
              &quot;?
            </DialogTitle>
            <DialogDescription>
              Deleting this user will revoke their access immediately. Reassign
              any active duties and admin roles before confirming.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {removeCheckLoading && (
              <p className="text-sm text-muted-foreground">
                Checking roles &amp; assignments…
              </p>
            )}

            {!removeCheckLoading && removeNoConflicts && !removeFinalDone && (
              <p className="text-sm text-muted-foreground">
                No roles &amp; assignments found. You can safely delete this
                user.
              </p>
            )}

            {!removeCheckLoading && removeFinalDone && (
              <div className="flex flex-col items-center py-4 gap-2">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-sm font-medium">
                  All roles &amp; assignments removed.
                </p>
              </div>
            )}

            {!removeCheckLoading && removeErrorData && !removeFinalDone && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Active on-duty coverage
                </p>
                {activeDutiesArray.map((d, i) => (
                  <p key={i} className="text-sm text-foreground">
                    {d.title}
                  </p>
                ))}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">
                  Other roles
                </p>
                {departmentHeadArray.length ? (
                  departmentHeadArray.map((r, i) => (
                    <p key={i} className="text-sm text-foreground">
                      Department Head of &quot;{r.department_name}&quot;
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleRemoveAllRoles}
                    disabled={removeCheckLoading}
                    className="text-sm font-medium text-destructive hover:underline disabled:opacity-50"
                  >
                    Remove all roles &amp; assignments
                  </button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemoveOpen(false);
                setRemoveTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                !!removeErrorData ||
                removeCheckLoading ||
                removeConfirmLoading
              }
              onClick={handleConfirmRemoveUser}
            >
              {removeConfirmLoading ? "Deleting…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import Modal ─────────────────────────────────────────────────── */}
      <Dialog
        open={importOpen}
        onOpenChange={(o) => {
          if (!o && !importing) {
            setImportOpen(false);
            setImportFile(null);
            setImportPreview([]);
            setImportErrors([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload CSV file</DialogTitle>
            <DialogDescription>
              Upload a CSV file. Required columns: {REQUIRED_COLUMNS.join(", ")}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" /> Download Template
            </Button>

            {!importFile ? (
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    CSV only (max 20MB)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-secondary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {importFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  {!importing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setImportFile(null);
                        setImportPreview([]);
                        setImportErrors([]);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {importErrors.length > 0 &&
                  importErrors[0].field === "format" && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-semibold text-destructive">
                          File format error
                        </span>
                      </div>
                      <p className="text-sm text-destructive/80">
                        {importErrors[0].message}
                      </p>
                    </div>
                  )}

                {importPreview.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Preview (first 5 rows)
                    </p>
                    <ScrollArea className="rounded-lg border border-border">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {REQUIRED_COLUMNS.map((col) => (
                                <TableHead
                                  key={col}
                                  className="text-xs capitalize whitespace-nowrap"
                                >
                                  {col.replace(/_/g, " ")}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importPreview.map((row, idx) => (
                              <TableRow key={idx}>
                                {REQUIRED_COLUMNS.map((col) => (
                                  <TableCell
                                    key={col}
                                    className="text-xs py-2 whitespace-nowrap"
                                  >
                                    {row[col] || "—"}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {importErrors.length > 0 &&
                  importErrors[0].field !== "format" && (
                    <div className="bg-[hsl(var(--status-warning-bg))] border border-[hsl(var(--status-warning-fg)/0.3)] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-[hsl(var(--status-warning-fg))]" />
                        <span className="text-sm font-semibold text-[hsl(var(--status-warning-fg))]">
                          {importErrors.length} validation{" "}
                          {importErrors.length === 1 ? "error" : "errors"} —
                          these rows will be skipped
                        </span>
                      </div>
                      <ScrollArea className="max-h-[140px]">
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {importErrors.slice(0, 20).map((e, i) => (
                            <li key={i}>
                              Row {e.row} ·{" "}
                              <span className="font-medium">{e.field}</span>:{" "}
                              {e.message}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  )}

                {importing && (
                  <div className="space-y-2">
                    <Progress value={importProgress} />
                    <p className="text-xs text-muted-foreground text-center">
                      Uploading... {Math.round(importProgress)}%
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!importing) {
                  setImportOpen(false);
                  setImportFile(null);
                  setImportPreview([]);
                  setImportErrors([]);
                }
              }}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={runImport}
              disabled={
                !importFile ||
                importing ||
                (importErrors.length > 0 &&
                  importErrors[0].field === "format")
              }
            >
              {importing ? "Uploading..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View import file details ──────────────────────────────────────── */}
      <Dialog
        open={!!viewImport}
        onOpenChange={(o) => {
          if (!o) {
            setViewImport(null);
            setViewImportErrors([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewImport?.fileName}</DialogTitle>
            <DialogDescription>
              {viewImportLoading
                ? "Loading records…"
                : `${viewImportErrors.length} validation ${
                    viewImportErrors.length === 1 ? "issue" : "issues"
                  }`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {viewImportLoading && (
              <p className="text-sm text-muted-foreground">Loading…</p>
            )}
            {!viewImportLoading &&
              viewImportErrors.map((e, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/40"
                >
                  <AlertCircle className="h-4 w-4 text-[hsl(var(--status-warning-fg))] mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      Row {e.row} · {e.field}
                    </p>
                    <p className="text-muted-foreground text-xs">{e.message}</p>
                    {e.value && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Value:{" "}
                        <code className="bg-background px-1 rounded">
                          {e.value}
                        </code>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            {!viewImportLoading && viewImportErrors.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No validation issues found.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
