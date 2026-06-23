'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useScope } from "@/hooks/use-scope";
import { motion } from "framer-motion";
import { Users, Megaphone, ShieldPlus, Briefcase } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import { AppCard, AppStatCard } from "@/components/common";
import ProtectedRoute from "@/components/ProtectedRoute";
import { apiClient } from "@/lib/api/apiClient";

// ── helpers ───────────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function toEpoch(d: Date) {
  return Math.floor(d.getTime() / 1000);
}

function monthRange(year: number, month: number) {
  return {
    start_date: toEpoch(new Date(year, month, 1, 0, 0, 0)),
    end_date: toEpoch(new Date(year, month + 1, 0, 23, 59, 59, 999)),
  };
}

function last30Days() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  return { start_date: toEpoch(start), end_date: toEpoch(end) };
}

const fmt = (n: number) => n.toLocaleString();

function fetchMetrics(names: string[], start_date: number, end_date: number) {
  return apiClient("POST", "admin", "gethospitaladminmetrics", {
    body: { name: names, start_date, end_date },
    shouldUseDefaultToken: false,
  });
}

// ── chart ─────────────────────────────────────────────────────────────────────

function MiniBar({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <div className="h-32 flex items-end gap-1.5">
        {data.map((v, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${(v / max) * 100}%` }}
            transition={{ duration: 0.4, delay: i * 0.03 }}
            className="flex-1 rounded-t-md bg-secondary/80 hover:bg-secondary transition-colors"
            title={`${labels[i]}: ${v}`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {labels.map((m, i) => (
          <span key={i} className="text-xs text-muted-foreground flex-1 text-center">{m}</span>
        ))}
      </div>
    </div>
  );
}

// ── types ─────────────────────────────────────────────────────────────────────

interface Stats {
  users: number;
  admins: number;
  broadcasts: number;
  departments: number;
}

// ── page ──────────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const sidebarMargin = useSidebarMargin();
  const { scope, chain } = useScope();

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonth = useMemo(() => new Date().getMonth(), []);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [stats, setStats] = useState<Stats | null>(null);
  const [graphCounts, setGraphCounts] = useState<number[]>([]);
  const [graphLabels, setGraphLabels] = useState<string[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingGraph, setLoadingGraph] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      // Match ReactJS exactly: read network_id standalone key from localStorage
      const networkId = typeof window !== "undefined"
        ? window.localStorage.getItem("network_id")
        : null;
      const { start_date, end_date } = last30Days();
      const names = networkId
        ? ["user_count", "admin_count", "broadcast_count", "department_count"]
        : ["user_count", "admin_count", "broadcast_count"];
      const res = await fetchMetrics(names, start_date, end_date);
      // API may return metrics directly in content or nested in content.data
      const raw = res?.content as Record<string, unknown> | undefined;
      const c = (raw?.total_user_count != null
        ? raw
        : raw?.data != null && typeof raw.data === "object"
          ? (raw.data as Record<string, unknown>)
          : raw) as Record<string, unknown> | undefined;
      if (c) {
        const userArr = c.total_user_count as any[];
        const adminArr = c.total_admin_count as any[];
        const broadcastArr = c.total_broadcast_count as any[];
        const deptArr = c.total_department_count as any[];
        setStats({
          // try .total_user (Card.js) then .total_user_count (MidOverview.jsx)
          users: userArr?.[0]?.total_user ?? userArr?.[0]?.total_user_count ?? 0,
          admins: adminArr?.[0]?.total_admin ?? 0,
          broadcasts: broadcastArr?.[0]?.total_broadcast ?? 0,
          departments: deptArr?.[0]?.total_department ?? 0,
        });
      }
    } catch {
      // API error — stats stay null, cards show 0
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchGraph = useCallback(async (month: number, year: number) => {
    setLoadingGraph(true);
    try {
      const { start_date, end_date } = monthRange(year, month);
      const res = await fetchMetrics(["user_graph_data"], start_date, end_date);
      const raw = res?.content as Record<string, unknown> | undefined;
      const c = (raw?.user_data != null
        ? raw
        : raw?.data != null && typeof raw.data === "object"
          ? (raw.data as Record<string, unknown>)
          : raw) as Record<string, unknown> | undefined;
      const userData = (c?.user_data as { count: number; date: string }[]) ?? [];
      setGraphCounts(userData.map((d) => d.count));
      setGraphLabels(userData.map((d) => d.date));
    } catch {
      // API error — graph stays empty
    } finally {
      setLoadingGraph(false);
    }
  }, []);

  // Re-fetch when scope changes so department count reflects the selected context
  useEffect(() => { fetchStats(); }, [fetchStats, scope]);
  useEffect(() => { fetchGraph(selectedMonth, selectedYear); }, [fetchGraph, selectedMonth, selectedYear]);

  const headerCopy = useMemo(() => {
    if (scope.level === "hospital") {
      return {
        title: "Hospital Overview",
        subtitle: `Activity, engagement, and operational signals for ${scope.name}.`,
      };
    }
    if (scope.level === "cluster") {
      return {
        title: "Cluster Overview",
        subtitle: `Network health and engagement across ${scope.name}.`,
      };
    }
    return {
      title: "Platform Overview",
      subtitle: "Health, engagement, and operational signals across all clusters.",
    };
  }, [scope]);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      }),
    [],
  );

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = 2000; y <= currentYear; y++) years.push(y);
    return years;
  }, [currentYear]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar items={adminSidebarItems} />

        <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
          <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

            <motion.header
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                  {scope.role}
                </span>
                <span className="truncate">
                  {chain.map((s) => s.name).join("  ›  ")}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">
                    {headerCopy.title}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">{headerCopy.subtitle}</p>
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">{todayLabel}</p>
              </div>
            </motion.header>

            {/* ── Section 1: Stat Cards ── */}
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Overview
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AppStatCard label="Users" value={loadingStats ? "—" : fmt(stats?.users ?? 0)} icon={Users} />
                <AppStatCard label="Admins" value={loadingStats ? "—" : fmt(stats?.admins ?? 0)} icon={ShieldPlus} />
                <AppStatCard label="Broadcasts" value={loadingStats ? "—" : fmt(stats?.broadcasts ?? 0)} icon={Megaphone} />
                <AppStatCard label="Departments" value={loadingStats ? "—" : fmt(stats?.departments ?? 0)} icon={Briefcase} />
              </div>
            </section>

            {/* ── Section 2: User Analytics Graph ── */}
            <section>
              <AppCard
                header={
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">User Analytics</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Monthly user activity overview
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        disabled={loadingGraph}
                        className="text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-50"
                      >
                        {MONTHS.map((m, i) => (
                          <option
                            key={m}
                            value={i}
                            disabled={selectedYear === currentYear && i > currentMonth}
                          >
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        disabled={loadingGraph}
                        className="text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-50"
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                }
              >
                {loadingGraph ? (
                  <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                    Loading…
                  </div>
                ) : graphCounts.length > 0 ? (
                  <MiniBar data={graphCounts} labels={graphLabels} />
                ) : (
                  <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                    No data for this period
                  </div>
                )}
              </AppCard>
            </section>

          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default AdminDashboard;
