'use client';
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { validateRouteParam } from "@/lib/utils/params";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Users,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import { Button } from "@/components/ui/button";
import { appToast } from "@/components/common";
import { viewImportFile } from "@/lib/api/users-api";

interface ApiImportRecord {
  first_name?: string;
  first_name_error?: string;
  last_name?: string;
  last_name_error?: string;
  email?: string;
  email_error?: string;
  staff_id?: string;
  staff_id_error?: string;
  country_code?: string;
  country_code_error?: string;
  mobile_number?: string;
  mobile_number_error?: string;
  profession?: string;
  profession_error?: string;
  rank_name?: string;
  rank_error?: string;
}

const isFieldError = (val: string | undefined): boolean =>
  Boolean(val && val !== "NA");

const hasAnyError = (r: ApiImportRecord): boolean =>
  [
    r.first_name_error,
    r.last_name_error,
    r.email_error,
    r.staff_id_error,
    r.country_code_error,
    r.mobile_number_error,
    r.profession_error,
    r.rank_error,
  ].some(isFieldError);

const RecordCell = ({
  value,
  error,
  primary,
}: {
  value?: string;
  error?: string;
  primary?: boolean;
}) => {
  if (isFieldError(error)) {
    return (
      <div className="flex items-center gap-1.5 text-[hsl(var(--status-error-fg))] min-w-0">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="text-sm truncate">{error}</span>
      </div>
    );
  }
  return (
    <span
      className={
        primary
          ? "text-sm font-medium text-foreground"
          : "text-sm text-muted-foreground"
      }
    >
      {value || "—"}
    </span>
  );
};

const NameCell = ({ record }: { record: ApiImportRecord }) => {
  const firstErr = isFieldError(record.first_name_error);
  const lastErr = isFieldError(record.last_name_error);
  if (firstErr || lastErr) {
    const error = firstErr ? record.first_name_error : record.last_name_error;
    return (
      <div className="flex items-center gap-1.5 text-[hsl(var(--status-error-fg))] min-w-0">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="text-sm truncate">{error}</span>
      </div>
    );
  }
  const full =
    `${record.first_name ?? ""} ${record.last_name ?? ""}`.trim() || "—";
  return <span className="text-sm font-medium text-foreground">{full}</span>;
};

const MobileCell = ({ record }: { record: ApiImportRecord }) => {
  const mobileErr = isFieldError(record.mobile_number_error);
  const codeErr = isFieldError(record.country_code_error);
  if (mobileErr || codeErr) {
    const error = mobileErr ? record.mobile_number_error : record.country_code_error;
    return (
      <div className="flex items-center gap-1.5 text-[hsl(var(--status-error-fg))] min-w-0">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="text-sm truncate">{error}</span>
      </div>
    );
  }
  const phone =
    [record.country_code, record.mobile_number].filter(Boolean).join(" ") ||
    "—";
  return <span className="text-sm text-muted-foreground">{phone}</span>;
};

const LoadingSkeleton = () => (
  <div className="space-y-2 p-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
    ))}
  </div>
);

// ─── Inner component (reads searchParams, requires Suspense) ─────────────────

const ImportFileDetailContent = () => {
  const params = useParams();
  const id = validateRouteParam(params.id);
  const searchParams = useSearchParams();
  const router = useRouter();
  const sidebarMargin = useSidebarMargin();

  const rawFileName = searchParams.get("fileName") ?? "";
  const fileName = rawFileName
    ? rawFileName.charAt(0).toUpperCase() + rawFileName.slice(1)
    : "Import File";

  const [records, setRecords] = useState<ApiImportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { router.replace("/admin/users"); return; }
    const load = async () => {
      try {
        const res = await viewImportFile(id);
        setRecords((res.content?.data ?? []) as ApiImportRecord[]);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load import records";
        appToast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, router]);

  if (!id) return null;

  const errorCount = records.filter(hasAnyError).length;
  const validCount = records.length - errorCount;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />

      <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* Back */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {/* Header card */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-card shadow-card border border-border/50 p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="h-16 w-16 rounded-2xl bg-secondary/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-8 w-8 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <button
                    type="button"
                    onClick={() => router.push("/admin/users")}
                    className="hover:text-foreground transition-colors"
                  >
                    Users
                  </button>
                  <span>›</span>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="hover:text-foreground transition-colors"
                  >
                    Imported Files
                  </button>
                  <span>›</span>
                  <span className="text-foreground font-medium truncate">
                    {fileName}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-foreground mt-1 truncate">
                  {fileName}
                </h1>
              </div>
            </div>

            {/* Stats — only shown after load */}
            {!loading && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                {[
                  {
                    label: "Total Records",
                    value: records.length,
                    icon: Users,
                    bg: "bg-secondary/10",
                    fg: "text-secondary",
                  },
                  {
                    label: "Valid Records",
                    value: validCount,
                    icon: CheckCircle2,
                    bg: "bg-[hsl(var(--status-success-bg))]",
                    fg: "text-[hsl(var(--status-success-fg))]",
                  },
                  {
                    label: "Records with Errors",
                    value: errorCount,
                    icon: AlertCircle,
                    bg:
                      errorCount > 0
                        ? "bg-[hsl(var(--status-error-bg))]"
                        : "bg-secondary/10",
                    fg:
                      errorCount > 0
                        ? "text-[hsl(var(--status-error-fg))]"
                        : "text-secondary",
                  },
                ].map(({ label, value, icon: Icon, bg, fg }) => (
                  <div
                    key={label}
                    className="rounded-lg bg-muted/40 p-3 flex items-center gap-3"
                  >
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center ${bg}`}
                    >
                      <Icon className={`h-4 w-4 ${fg}`} />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground leading-none">
                        {value.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Records table */}
          <div className="rounded-xl bg-card shadow-card border border-border/50 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border/50">
              <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Import Records
                </h2>
                <p className="text-xs text-muted-foreground">
                  {loading ? "Loading…" : `${records.length} total`}
                </p>
              </div>
            </div>

            {loading ? (
              <LoadingSkeleton />
            ) : records.length === 0 ? (
              <div className="p-12 text-center">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">
                  No records found in this file.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 sticky top-0 z-10">
                    <tr className="text-left text-xs font-semibold uppercase text-muted-foreground border-b border-border/50">
                      <th className="px-4 py-3 w-10 text-center">#</th>
                      <th className="px-4 py-3 min-w-[160px]">Name</th>
                      <th className="px-4 py-3 min-w-[150px]">Mobile Number</th>
                      <th className="px-4 py-3 min-w-[180px]">Email</th>
                      <th className="px-4 py-3 min-w-[100px]">Staff ID</th>
                      <th className="px-4 py-3 min-w-[130px]">Profession</th>
                      <th className="px-4 py-3 min-w-[130px]">Rank</th>
                      <th className="px-4 py-3 w-16 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {records.map((record, i) => {
                      const rowError = hasAnyError(record);
                      return (
                        <tr
                          key={i}
                          className={`transition-colors hover:bg-accent/30 ${
                            rowError
                              ? "bg-[hsl(var(--status-error-bg))]/20"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                            {i + 1}
                          </td>
                          <td className="px-4 py-3">
                            <NameCell record={record} />
                          </td>
                          <td className="px-4 py-3">
                            <MobileCell record={record} />
                          </td>
                          <td className="px-4 py-3">
                            <RecordCell
                              value={record.email}
                              error={record.email_error}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <RecordCell
                              value={record.staff_id}
                              error={record.staff_id_error}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <RecordCell
                              value={record.profession}
                              error={record.profession_error}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <RecordCell
                              value={record.rank_name}
                              error={record.rank_error}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {rowError ? (
                              <AlertCircle className="h-4 w-4 text-[hsl(var(--status-error-fg))] mx-auto" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--status-success-fg))] mx-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// ─── Page export (wraps in Suspense for useSearchParams) ─────────────────────

const ImportFileDetailPage = () => (
  <Suspense>
    <ImportFileDetailContent />
  </Suspense>
);

export default ImportFileDetailPage;
