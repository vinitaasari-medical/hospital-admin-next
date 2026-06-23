'use client';
import { DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { validateRouteParam } from "@/lib/utils/params";
import { io, Socket } from "socket.io-client";
import { DayPicker, type DateRange as DayPickerDateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  ArrowLeft, X, Sunrise, Sun, Moon, MapPin,
  FileSpreadsheet, Printer, Send, Pencil, FileDown,
  Search, CalendarDays, Plus, LayoutTemplate, FilePlus2,
  LayoutGrid, Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import DashboardSidebar from "@/components/DashboardSidebar";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  listDuties, getDutyById, publishStaffingDuty, assignCoverageUser,
  listDepartmentUsers, extendStaffScheduleTemplate, listDutyTemplates,
} from "@/lib/api/departments-api";
import ByEmployeeView from "./_components/ByEmployeeView";
import DutyPickerDialog, { type DutySlot } from "./_components/DutyPickerDialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Interval { staffing_id: string; start_date: number; end_date: number; }
interface WArea { id: string; name: string; roles: string[]; }
interface WDuty { id: string; title: string; roles: string[]; coversAreas: boolean; areas: WArea[]; }
interface WShift { id: string; name: string; startTime: string; endTime: string; duties: WDuty[]; }
interface Leaf { id: string; label: string; areaName?: string; }
interface ScheduleDate { key: string; dayLabel: string; dateNum: string; }
interface SavedSchedule {
  id: string; title: string; startDate: string; endDate: string;
  shifts: WShift[]; scheduleDates: ScheduleDate[];
  status: "Published" | "Draft";
  assignments: Record<string, string>;
  showDutyToNetwork: boolean;
}
interface Employee { id: string; name: string; avatar: string; photoUrl: string; role: string; rank: string; }
interface ApiTemplate { id: string; name: string; configTitle: string; createdAt: string; isLive: boolean; raw: Record<string, unknown>; }

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAY_NAME = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const SHIFT_PALETTE = [
  { headerBg:"bg-gradient-to-b from-blue-50 to-blue-100/60", text:"text-blue-700", cellBg:"bg-blue-50/30", border:"border-blue-200", dutyText:"text-blue-700" },
  { headerBg:"bg-gradient-to-b from-emerald-50 to-emerald-100/60", text:"text-emerald-700", cellBg:"bg-emerald-50/30", border:"border-emerald-200", dutyText:"text-emerald-700" },
  { headerBg:"bg-gradient-to-b from-orange-50 to-orange-100/60", text:"text-orange-700", cellBg:"bg-orange-50/30", border:"border-orange-200", dutyText:"text-orange-700" },
  { headerBg:"bg-gradient-to-b from-violet-50 to-violet-100/60", text:"text-violet-700", cellBg:"bg-violet-50/30", border:"border-violet-200", dutyText:"text-violet-700" },
];
// For ByEmployee view — role-based palette using Tailwind class strings
const SV_ROLE_PALETTE = [
  { bg:"bg-violet-50", text:"text-violet-700", border:"border-violet-200", dot:"bg-violet-500" },
  { bg:"bg-sky-50",    text:"text-sky-700",    border:"border-sky-200",    dot:"bg-sky-500" },
  { bg:"bg-amber-50",  text:"text-amber-700",  border:"border-amber-200",  dot:"bg-amber-500" },
  { bg:"bg-rose-50",   text:"text-rose-700",   border:"border-rose-200",   dot:"bg-rose-500" },
];
// Shift chip palette for ByEmployeeView — Tailwind class strings
const SV_SHIFT_PALETTE_OBJ = [
  { cellBg:"bg-blue-50/30",    dot:"bg-blue-500",    dutyText:"text-blue-700",    border:"border-blue-200" },
  { cellBg:"bg-emerald-50/30", dot:"bg-emerald-500", dutyText:"text-emerald-700", border:"border-emerald-200" },
  { cellBg:"bg-orange-50/30",  dot:"bg-orange-500",  dutyText:"text-orange-700",  border:"border-orange-200" },
  { cellBg:"bg-violet-50/30",  dot:"bg-violet-500",  dutyText:"text-violet-700",  border:"border-violet-200" },
];
const RANK_COLORS: Record<string, { bg:string; text:string; border:string; dot:string }> = {
  Resident:               { bg:"bg-violet-100", text:"text-violet-700", border:"border-violet-200", dot:"bg-violet-500" },
  Consultant:             { bg:"bg-sky-100",    text:"text-sky-700",    border:"border-sky-200",    dot:"bg-sky-500" },
  "Assistant Consultant": { bg:"bg-amber-100",  text:"text-amber-700",  border:"border-amber-200",  dot:"bg-amber-500" },
  Junior:                 { bg:"bg-rose-100",   text:"text-rose-700",   border:"border-rose-200",   dot:"bg-rose-500" },
};
const RANK_SHORT: Record<string,string> = { Resident:"RES", Consultant:"CON", "Assistant Consultant":"AST", Junior:"JNR" };
const RANK_ORDER = ["Consultant","Assistant Consultant","Resident","Junior"];
// Ordered palette for index-based cycling (mirrors ReactJS FALLBACK_CLASSES pattern)
const RANK_PALETTE = Object.values(RANK_COLORS);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const localDateKey = (d: Date) => {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};

// ReactJS ScheduleTable uses ISO-based todayKey (toISOString) to match ReactJS exactly
const todayKey = new Date().toISOString().split("T")[0];
const isFuture = (key: string) => key >= todayKey;

const ordinal = (n: number) => { const s=["th","st","nd","rd"],v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); };
const ivLabel = (iv: Interval) => MONTH_LONG[new Date(iv.start_date*1000).getMonth()];
const ivRange = (iv: Interval) => { const s=new Date(iv.start_date*1000),e=new Date(iv.end_date*1000); return `${ordinal(s.getDate())} – ${ordinal(e.getDate())}`; };

const splitDataIntervalsByMonths = (data: Array<Record<string,unknown>>): Interval[] => {
  if (!Array.isArray(data)) return [];
  const result: Interval[] = [];
  data.forEach((item) => {
    const staffing_id = item.id as string;
    const start_date = item.start_date as number;
    const end_date = item.end_date as number;
    if (!start_date || !end_date) return;
    let current = new Date(start_date*1000);
    const endDateObj = new Date(end_date*1000);
    current.setHours(0,0,0,0); endDateObj.setHours(23,59,59,999);
    while (current <= endDateObj) {
      const year=current.getFullYear(), month=current.getMonth();
      const lastDayOfMonth = new Date(year, month+1, 0); lastDayOfMonth.setHours(23,59,59,999);
      const intervalEnd = lastDayOfMonth < endDateObj ? lastDayOfMonth : endDateObj;
      result.push({ staffing_id, start_date: Math.floor(current.getTime()/1000), end_date: Math.floor(intervalEnd.getTime()/1000) });
      current = new Date(year, month+1, 1); current.setHours(0,0,0,0);
    }
  });
  result.sort((a,b) => a.start_date!==b.start_date ? a.start_date-b.start_date : a.end_date-b.end_date);
  return result;
};

const to12h = (t: string) => {
  if (!t) return "--:--";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return "--:--";
  return `${h%12===0?12:h%12}:${mStr??"00"} ${h>=12?"PM":"AM"}`;
};

const shiftIcon = (start: string) => {
  const h = Number((start||"08").split(":")[0]);
  if (h>=5 && h<12) return Sunrise; if (h>=12 && h<18) return Sun; return Moon;
};

// Exact copy of ReactJS dutyLeaves
const dutyLeaves = (d: WDuty): Leaf[] => {
  if (d.coversAreas && d.areas && d.areas.length>0) {
    const out: Leaf[] = [];
    d.areas.forEach((a) => {
      if (a.roles.length===0) out.push({ id:`${a.id}-0`, label:a.name||"—", areaName:a.name });
      else a.roles.forEach((r,i) => out.push({ id:`${a.id}-${i}`, label:r, areaName:a.name }));
    });
    return out;
  }
  if (d.roles.length===0) return [{ id:"0", label:d.title||"Assign" }];
  return d.roles.map((r,i) => ({ id:String(i), label:r }));
};
const dutyLeafCount = (d: WDuty) => dutyLeaves(d).length;
const mkCellKey = (dateKey: string, dutyId: string, leafId: string) => `${dateKey}::${dutyId}::${leafId}`;

const rankOf = (rankName: string) => {
  const r = (rankName||"").toLowerCase();
  if (r.includes("consultant")||r.includes("head")) return "Consultant";
  if (r.includes("senior")||r.includes("assistant")) return "Assistant Consultant";
  if (r.includes("resident")||r.includes("intern")) return "Resident";
  return "Junior";
};
const rc = (rank: string) => RANK_COLORS[rank] ?? { bg:"bg-slate-100", text:"text-slate-700", border:"border-slate-200", dot:"bg-slate-500" };
const rs = (rank: string) => RANK_SHORT[rank] ?? rank.slice(0,3).toUpperCase();

// ─── Socket helpers ───────────────────────────────────────────────────────────

const getSocketBaseUrl = () => process.env.NEXT_PUBLIC_BASE_URL_STAFFING ?? "";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScheduleView() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const sidebarMargin = useSidebarMargin();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from") || "/admin/scheduling";
  const dutyCode = validateRouteParam(id) ?? "";

  // ── Department breadcrumb (display only) ──────────────────────────────────
  const [deptName, setDeptName] = useState("");
  useEffect(() => {
    const name = localStorage.getItem("sub_department_name") || localStorage.getItem("department_name") || "";
    setDeptName(name);
  }, []);

  // ── Intervals ─────────────────────────────────────────────────────────────
  const [intervals, setIntervals] = useState<Interval[]>([]);
  const [currentInterval, setCurrentInterval] = useState<Interval|null>(null);
  const [intervalsLoading, setIntervalsLoading] = useState(true);

  // ── Schedule detail ───────────────────────────────────────────────────────
  const [schedule, setSchedule] = useState<SavedSchedule|null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [coverageMap, setCoverageMap] = useState<Record<string,string>>({});

  // ── Staff pool ────────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [staffSearch, setStaffSearch] = useState("");

  // ── Socket ────────────────────────────────────────────────────────────────
  const socketRef = useRef<Socket|null>(null);

  // ── View toggle ───────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"shift"|"employee">("shift");

  // ── Cell picker (2-step popover: employee → dates) ────────────────────────
  const [pickerKey, setPickerKey] = useState<string|null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerStep, setPickerStep] = useState<1|2>(1);
  const [pickerEmpId, setPickerEmpId] = useState<string|null>(null);
  const [pickerDates, setPickerDates] = useState<Set<string>>(new Set());

  // ── By Employee duty picker ───────────────────────────────────────────────
  const [dutyPickerCtx, setDutyPickerCtx] = useState<{ empId:string; dateKey:string }|null>(null);

  // ── Grid drag/drop ────────────────────────────────────────────────────────
  const [dragOverKey, setDragOverKey] = useState<string|null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Confirm dialog ────────────────────────────────────────────────────────
  const [confirmAction, setConfirmAction] = useState<null|"publish"|"unpublish"|"edit">(null);

  // ── Extend dialog ─────────────────────────────────────────────────────────
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendEnd, setExtendEnd] = useState<Date|undefined>(undefined);

  // ── Create new dialog ─────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [createRange, setCreateRange] = useState<DayPickerDateRange | undefined>(undefined);

  // ── Template dialog ───────────────────────────────────────────────────────
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateQuery, setTemplateQuery] = useState("");
  const [templateFilter, setTemplateFilter] = useState<"all"|"live"|"draft">("all");
  const [templateStartDate, setTemplateStartDate] = useState("");
  const [templateEndDate, setTemplateEndDate] = useState("");

  // ── Invalid param guard ───────────────────────────────────────────────────
  useEffect(() => {
    if (!dutyCode) router.replace("/admin/scheduling");
  }, [dutyCode, router]);

  // ── Socket initialization ──────────────────────────────────────────────────

  useEffect(() => {
    if (socketRef.current) return;
    const userId = localStorage.getItem("userId") || "";
    const networkId = localStorage.getItem("network_id") || "";
    try {
      const baseUrl = getSocketBaseUrl();
      if (!baseUrl || baseUrl === "https://undefined") return;
      socketRef.current = io(`${baseUrl}/staffing/editassignments`, {
        path: "/staffing/socket.io",
        transports: ["websocket"],
        withCredentials: true,
        query: { device_type: "web", user_id: userId, network_id: networkId },
      });
    } catch { /* non-fatal if socket URL not configured */ }
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadIntervals = useCallback(async () => {
    if (!dutyCode) { setIntervalsLoading(false); return; }
    setIntervalsLoading(true);
    try {
      const groupId = localStorage.getItem("group_id") || "";
      const departmentId = localStorage.getItem("department_id") || "";
      const subDeptId = localStorage.getItem("sub_department_id") || undefined;
      const res = await listDuties({ group_id:groupId, department_id:departmentId, duty_code:dutyCode, ...(subDeptId?{sub_department_id:subDeptId}:{}) });
      const raw = (res.content?.data??[]) as Array<Record<string,unknown>>;
      const split = splitDataIntervalsByMonths(raw);
      setIntervals(split);
      if (split.length>0) setCurrentInterval(split[0]);
    } catch (err: unknown) {
      toast({ title:"Failed to load schedule", description:(err as {message?:string}).message, variant:"destructive" });
    } finally { setIntervalsLoading(false); }
  }, [dutyCode, toast]);

  const loadDetail = useCallback(async (interval: Interval) => {
    setScheduleLoading(true);
    // Immediate scheduleDates update (mirrors ReactJS behaviour)
    setSchedule((prev) => {
      if (!prev) return prev;
      const scheduleDates: ScheduleDate[] = [];
      const cur = new Date(interval.start_date*1000), end = new Date(interval.end_date*1000);
      cur.setHours(0,0,0,0); end.setHours(23,59,59,999);
      while (cur<=end) {
        scheduleDates.push({ key:localDateKey(cur), dateNum:String(cur.getDate()).padStart(2,"0"), dayLabel:cur.toLocaleDateString("en-US",{weekday:"short"}).toUpperCase() });
        cur.setDate(cur.getDate()+1);
      }
      return { ...prev, scheduleDates, assignments:{} };
    });
    try {
      const res = await getDutyById({ staffing_duty_id:interval.staffing_id, start_date:interval.start_date, end_date:interval.end_date });
      const data = (res.content?.data??res.content??{}) as Record<string,unknown>;
      const rawOccs = (data.occurrences as Array<Record<string,unknown>>)??[];
      if (rawOccs.length===0) { toast({ title:"No schedule data found for this interval.", variant:"destructive" }); setScheduleLoading(false); return; }

      // Shifts — REAL API IDs (task.id, area.id, shift_id)
      const firstSIs = (rawOccs[0].shift_instances??[]) as Array<Record<string,unknown>>;
      const shifts: WShift[] = firstSIs.map((si) => ({
        id: si.shift_id as string,
        name: si.title as string,
        startTime: ((si.shift_start_time as string)||"").slice(0,5),
        endTime: ((si.shift_end_time as string)||"").slice(0,5),
        duties: ((si.tasks??[]) as Array<Record<string,unknown>>).map((task) => ({
          id: task.id as string,
          title: task.title as string,
          coversAreas: !!(task.has_multiple_areas),
          roles: task.has_multiple_areas ? [] : ((task.coverage??[]) as Array<Record<string,unknown>>).map((c) => c.title as string),
          areas: task.has_multiple_areas
            ? ((task.areas??[]) as Array<Record<string,unknown>>).map((a) => ({ id:a.id as string, name:a.title as string, roles:((a.coverage??[]) as Array<Record<string,unknown>>).map((c) => c.title as string) }))
            : [],
        })),
      }));

      // scheduleDates — one per occurrence
      const scheduleDates: ScheduleDate[] = rawOccs.map((occ) => {
        const d = new Date((occ.start_time as number)*1000);
        return { key:localDateKey(d), dateNum:String(d.getDate()).padStart(2,"0"), dayLabel:d.toLocaleDateString("en-US",{weekday:"short"}).toUpperCase() };
      });

      // Build assignments + coverageMap (exact field names from API)
      const assignments: Record<string,string> = {};
      const newCoverageMap: Record<string,string> = {};
      const preloadedUsers: Record<string,Record<string,unknown>> = {};

      rawOccs.forEach((occ) => {
        const dk = localDateKey(new Date((occ.start_time as number)*1000));
        ((occ.shift_instances??[]) as Array<Record<string,unknown>>).forEach((si) => {
          ((si.tasks??[]) as Array<Record<string,unknown>>).forEach((task) => {
            const taskId = task.id as string;
            if (task.has_multiple_areas && task.areas) {
              ((task.areas??[]) as Array<Record<string,unknown>>).forEach((area) => {
                const areaId = area.id as string;
                ((area.coverage??[]) as Array<Record<string,unknown>>).forEach((cov, idx) => {
                  const k = mkCellKey(dk, taskId, `${areaId}-${idx}`);
                  const assignId = cov.assignment_id as string;
                  if (assignId) newCoverageMap[k] = assignId;
                  const u = cov.assigned_user as Record<string,unknown>|null;
                  if (u?.user_id) { assignments[k]=u.user_id as string; preloadedUsers[u.user_id as string]=u; }
                });
              });
            } else {
              ((task.coverage??[]) as Array<Record<string,unknown>>).forEach((cov, idx) => {
                const k = mkCellKey(dk, taskId, String(idx));
                const assignId = cov.assignment_id as string;
                if (assignId) newCoverageMap[k] = assignId;
                const u = cov.assigned_user as Record<string,unknown>|null;
                if (u?.user_id) { assignments[k]=u.user_id as string; preloadedUsers[u.user_id as string]=u; }
              });
            }
          });
        });
      });

      setCoverageMap(newCoverageMap);

      // Merge pre-loaded users so chips render before listdepartmentusers completes
      if (Object.keys(preloadedUsers).length>0) {
        setEmployees((prev) => {
          const merged = [...prev];
          Object.values(preloadedUsers).forEach((u) => {
            if (!merged.find((e) => e.id===(u.user_id as string))) {
              const fn=(u.first_name as string)||"", ln=(u.last_name as string)||"";
              merged.push({ id:u.user_id as string, name:`${fn} ${ln}`.trim(), avatar:`${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase()||"?", photoUrl:(u.profile_url as string)||"", role:"Member", rank:"Unranked" });
            }
          });
          return merged;
        });
      }

      setSchedule({ id:dutyCode, title:(data.title as string)||"", startDate:localDateKey(new Date((data.start_date as number)*1000)), endDate:localDateKey(new Date((data.end_date as number)*1000)), status:(data.publish_status as string)==="published"?"Published":"Draft", shifts, scheduleDates, assignments, showDutyToNetwork:!!(data.show_duty_to_network) });
    } catch (err: unknown) {
      toast({ title:"Failed to load schedule details", description:(err as {message?:string}).message, variant:"destructive" });
    } finally { setScheduleLoading(false); }
  }, [dutyCode, toast]);

  const loadStaff = useCallback(async () => {
    const subDeptId = localStorage.getItem("sub_department_id")||"";
    const departmentId = localStorage.getItem("department_id")||"";
    const effectiveDeptId = subDeptId||departmentId;
    if (!effectiveDeptId) return;
    try {
      const res = await listDepartmentUsers(effectiveDeptId);
      const raw = (res.content?.data??[]) as Array<Record<string,unknown>>;
      const apiUsers: Employee[] = (Array.isArray(raw)?raw:[]).map((emp, idx) => ({
        id: (emp.id as string)||`emp-${idx}`,
        name: `${(emp.first_name as string)||""} ${(emp.last_name as string)||""}`.trim()||`Employee ${idx+1}`,
        avatar: `${((emp.first_name as string)||"E").charAt(0)}${((emp.last_name as string)||"").charAt(0)}`.toUpperCase(),
        photoUrl: (emp.profile_url as string)||"",
        role: (emp.profession_name as string)||"Member",
        rank: (emp.rank_name as string)||"Unranked",  // raw rank_name from API — no normalization
      }));
      setEmployees((prev) => {
        const apiIds = new Set(apiUsers.map((u) => u.id));
        const preloaded = prev.filter((u) => !apiIds.has(u.id));
        return [...apiUsers, ...preloaded];
      });
    } catch { /* non-fatal */ }
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const groupId=localStorage.getItem("group_id")||"", departmentId=localStorage.getItem("department_id")||"";
      const subDeptId=localStorage.getItem("sub_department_id")||undefined;
      const res = await listDutyTemplates({ group_id:groupId, department_id:departmentId, ...(subDeptId?{sub_department_id:subDeptId}:{}) });
      const raw = (res.content?.data??[]) as Array<Record<string,unknown>>;
      setTemplates(raw.map((t) => {
        const config = (t.config??{}) as Record<string,unknown>;
        return { id:t.id as string, name:(t.name as string)||"", configTitle:(config.title as string)||(t.name as string)||"Untitled", createdAt:t.created_at?new Date((t.created_at as number)*1000).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}):"", isLive:config.is_enabled===1, raw:t };
      }));
    } catch { /* non-fatal */ } finally { setTemplatesLoading(false); }
  }, []);

  useEffect(() => { void loadIntervals(); }, [loadIntervals]);
  useEffect(() => { void loadStaff(); }, [loadStaff]);
  useEffect(() => { if (currentInterval) void loadDetail(currentInterval); }, [currentInterval, loadDetail]);

  // ── Assignment logic — mirrors ReactJS handleAssign exactly ───────────────

  const handleAssign = useCallback((keyOrKeys: string|string[], empId: string) => {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    const isPublished = schedule?.status==="Published";

    // Local state update first
    setSchedule((prev) => {
      if (!prev) return prev;
      const next = { ...prev, assignments:{ ...prev.assignments } };
      keys.forEach((k) => { if (!empId) delete next.assignments[k]; else next.assignments[k]=empId; });
      return next;
    });

    if (keys.length===1) {
      const key = keys[0];
      const assignmentId = coverageMap[key];
      if (!assignmentId) { return; }
      const dateKey = key.split("::")[0];
      const isToday = dateKey===todayKey;
      const body = { staffing_coverage_assignment_id:assignmentId, assignee_user_id:empId };

      if (isToday && isPublished) {
        assignCoverageUser(body)
          .then(() => toast({ title:empId?"User assigned!":"User unassigned!" }))
          .catch((err: {message?:string}) => toast({ title:"Failed to save assignment", description:err.message, variant:"destructive" }));
      } else {
        if (!socketRef.current?.connected) { toast({ title:"Socket not connected", variant:"destructive" }); return; }
        console.log("[socket] new_assignment (single)", body);
        socketRef.current.emit("new_assignment", body);
        toast({ title:empId?"User assigned!":"User unassigned!" });
      }
    } else {
      // Multi-assign
      const assignmentIds = keys.map((k) => coverageMap[k]).filter(Boolean);
      console.log("[handleAssign] multi", { keys, assignmentIds, coverageMapSize:Object.keys(coverageMap).length });
      if (assignmentIds.length===0) {
        console.warn("[handleAssign] No coverage IDs found for keys:", keys);
        toast({ title:"Unable to assign", description:"No valid slots found. Please refresh and try again.", variant:"destructive" });
        return;
      }

      if (isPublished) {
        const todayKeys = keys.filter((k) => k.split("::")[0]===todayKey);
        const otherKeys = keys.filter((k) => k.split("::")[0]!==todayKey);
        const otherIds = otherKeys.map((k) => coverageMap[k]).filter(Boolean);
        const todayIds = todayKeys.map((k) => coverageMap[k]).filter(Boolean);

        if (otherIds.length>0) {
          if (!socketRef.current?.connected) { toast({ title:"Socket not connected", variant:"destructive" }); return; }
          console.log("[socket] new_assignment (multi-other)", { staffing_coverage_assignment_ids:otherIds, assignee_user_id:empId });
          socketRef.current.emit("new_assignment", { staffing_coverage_assignment_ids:otherIds, assignee_user_id:empId });
        }
        if (todayIds.length>0) {
          Promise.all(todayIds.map((aid) => assignCoverageUser({ staffing_coverage_assignment_id:aid, assignee_user_id:empId })))
            .then(() => toast({ title:empId?"Users assigned!":"Assignments removed!" }))
            .catch((err: {message?:string}) => toast({ title:"Failed", description:err.message, variant:"destructive" }));
        } else { toast({ title:empId?"Users assigned!":"Assignments removed!" }); }
      } else {
        if (!socketRef.current?.connected) { toast({ title:"Socket not connected", variant:"destructive" }); return; }
        console.log("[socket] new_assignment (multi-draft)", { staffing_coverage_assignment_ids:assignmentIds, assignee_user_id:empId });
        socketRef.current.emit("new_assignment", { staffing_coverage_assignment_ids:assignmentIds, assignee_user_id:empId });
        toast({ title:empId?"Users assigned!":"Assignments removed!" });
      }
    }
  }, [coverageMap, schedule, toast]);

  // ── Picker helpers ────────────────────────────────────────────────────────

  const openPicker = (k: string) => {
    setPickerKey(k); setPickerQuery(""); setPickerStep(1); setPickerEmpId(null);
    // ReactJS does NOT filter by isFuture on initial date — popover is only shown for future cells
    setPickerDates(new Set([k.split("::")[0]]));
  };
  const closePicker = () => { setPickerKey(null); setPickerQuery(""); setPickerStep(1); setPickerEmpId(null); };
  const weekdayOf = (key: string) => { if (!key) return 0; const [y,m,d]=key.split("-").map(Number); return new Date(y,m-1,d).getDay(); };

  const applyPickerPreset = (preset: string) => {
    if (!pickerKey||!schedule) return;
    const dateKey=pickerKey.split("::")[0], wd=weekdayOf(dateKey), vd=schedule.scheduleDates.map((d)=>d.key);
    let sel: string[] = [];
    if (preset==="just") sel=[dateKey].filter(isFuture);
    else if (preset==="all") sel=vd.filter(isFuture);
    else if (preset==="every") sel=vd.filter((k)=>weekdayOf(k)===wd&&isFuture(k));
    else if (preset==="weekdays") sel=vd.filter((k)=>{const w=weekdayOf(k);return w>=1&&w<=5&&isFuture(k);});
    else if (preset==="weekends") sel=vd.filter((k)=>{const w=weekdayOf(k);return (w===0||w===6)&&isFuture(k);});
    setPickerDates(new Set(sel));
  };
  const applyPickerAssign = () => {
    if (!pickerKey||!pickerEmpId||pickerDates.size===0) return;
    const [,dutyId,leafId]=pickerKey.split("::");
    const keys=[...pickerDates].map((dk)=>mkCellKey(dk,dutyId,leafId));
    handleAssign(keys, pickerEmpId);
    closePicker();
  };

  // ── Drag-drop ─────────────────────────────────────────────────────────────

  const handleDragStart = (empId: string, sourceKey?: string) => (e: DragEvent<HTMLElement>) => {
    e.dataTransfer.setData("employeeId", empId);
    if (sourceKey) e.dataTransfer.setData("sourceKey", sourceKey);
    e.dataTransfer.effectAllowed="move";
  };
  const handleDrop = (key: string, isPast: boolean) => (e: DragEvent<HTMLElement>) => {
    if (isPast) return;
    e.preventDefault(); setDragOverKey(null);
    const empId=e.dataTransfer.getData("employeeId"), sourceKey=e.dataTransfer.getData("sourceKey");
    if (!empId) return;
    // Move from source: local only (no API for source clear, mirrors ReactJS)
    if (sourceKey&&sourceKey!==key) {
      setSchedule((prev) => { if (!prev) return prev; const n={...prev,assignments:{...prev.assignments}}; delete n.assignments[sourceKey]; return n; });
    }
    handleAssign(key, empId);
  };

  // ── Remove (AssignedChip X button) — local + socket/REST ─────────────────

  const handleRemove = (key: string) => {
    handleAssign(key, ""); // "" = unassign, goes through socket/REST routing
  };

  // ── Publish/unpublish ─────────────────────────────────────────────────────

  const togglePublish = async (publish: boolean) => {
    if (!currentInterval) return;
    try {
      await publishStaffingDuty({ staffing_duty_id:currentInterval.staffing_id, publish_status:publish?"published":"draft", local_time_epoch:Math.floor(Date.now()/1000) });
      void loadDetail(currentInterval); // refetch in-place, mirrors ReactJS
      toast({ title:publish?"Schedule published":"Schedule unpublished" });
    } catch (err: unknown) { toast({ title:"Failed", description:(err as {message?:string}).message, variant:"destructive" }); }
  };

  // ── Extend schedule ───────────────────────────────────────────────────────

  const extendStart = useMemo(() => schedule?.endDate ? (() => { const [y,m,d]=schedule.endDate.split("-").map(Number); return new Date(y,m-1,d); })() : undefined, [schedule?.endDate]);

  const handleExtend = async () => {
    if (!schedule||!currentInterval||!extendEnd||!extendStart) return;
    if (extendEnd<=extendStart) return;
    const toLocalEpoch=(d: Date)=>Math.floor(d.getTime()/1000);
    const extendFrom = new Date(extendStart); extendFrom.setDate(extendFrom.getDate()+1);
    const startEpoch = toLocalEpoch(extendFrom), endEpoch = toLocalEpoch(extendEnd);
    // Infer active days from existing schedule dates (matches ReactJS ExtendScheduleDialog)
    const map = WEEKDAY_NAME;
    const active = Array.from(new Set(schedule.scheduleDates.map((d)=>map[new Date(d.key+"T00:00:00").getDay()])));
    const cur = new Date(extendFrom); cur.setHours(0,0,0,0);
    const endD = new Date(extendEnd); endD.setHours(23,59,59,999);
    const newDates: Array<{key:string; dayLabel:string; dateNum:number}> = [];
    let guard=0;
    while (cur<=endD&&guard<400) {
      if (active.includes(map[cur.getDay()])) newDates.push({ key:localDateKey(cur), dayLabel:cur.toLocaleDateString(undefined,{weekday:"short"}), dateNum:cur.getDate() });
      cur.setDate(cur.getDate()+1); guard++;
    }
    const occurrences = newDates.map((d)=>({ start_time:Math.floor(new Date(d.key+"T00:00:00").getTime()/1000) }));
    try {
      await extendStaffScheduleTemplate({ duty_code:dutyCode, staffing_duty_id:currentInterval.staffing_id, start_date:startEpoch, end_date:endEpoch, occurrences });
      toast({ title:"Schedule extended", description:"New dates have been added." });
      setExtendOpen(false); setExtendEnd(undefined);
      void loadIntervals();
    } catch (err: unknown) { toast({ title:"Extend failed", description:(err as {message?:string}).message, variant:"destructive" }); }
  };

  // ── Create new ────────────────────────────────────────────────────────────

  const maxEndDate = intervals.length>0 ? new Date(intervals[intervals.length-1].end_date*1000) : null;

  const handleCreateNew = () => {
    if (!createRange?.from||!createRange?.to) return;
    const parts=[`from=${encodeURIComponent(fromParam)}`];
    const deptParam = searchParams.get("department")??"";
    if (deptParam) parts.unshift(`department=${encodeURIComponent(deptParam)}`);
    parts.push(`start=${Math.floor(createRange.from.getTime()/1000)}`);
    parts.push(`end=${Math.floor(createRange.to.getTime()/1000)}`);
    const scheduleName = schedule?.title || dutyCode || "";
    if (scheduleName) parts.push(`name=${encodeURIComponent(scheduleName)}`);
    parts.push(`duty_code=${encodeURIComponent(dutyCode)}`);
    router.push(`/admin/scheduling/create?${parts.join("&")}`);
    setCreateOpen(false); setCreateRange(undefined);
  };

  // ── By Employee helpers ───────────────────────────────────────────────────

  const uniqueRoles = useMemo(() => {
    const seen=new Set<string>(), out: string[] = [];
    employees.forEach((e) => { if (e.role&&!seen.has(e.role)) { seen.add(e.role); out.push(e.role); } });
    return out;
  }, [employees]);
  const roleColors = useMemo(() => { const out: Record<string,{bg:string;text:string;border:string;dot:string}>={}; uniqueRoles.forEach((role,idx)=>{out[role]=SV_ROLE_PALETTE[idx%SV_ROLE_PALETTE.length];}); return out; }, [uniqueRoles]);
  const roleShort = useMemo(() => { const out: Record<string,string>={}; uniqueRoles.forEach((role)=>{out[role]=role.slice(0,3).toUpperCase();}); return out; }, [uniqueRoles]);

  const assignmentsByEmpDate = useMemo(() => {
    const out: Record<string,Record<string,Array<{key:string;shiftIdx:number;shiftName:string;shiftLetter:string;dutyTitle:string;leafLabel:string;areaName?:string}>>>={}; if (!schedule) return out;
    schedule.shifts.forEach((s,sIdx)=>{
      const letter=(s.name||"?").trim().charAt(0).toUpperCase();
      s.duties.forEach((d)=>{ dutyLeaves(d).forEach((lf)=>{ schedule.scheduleDates.forEach((date)=>{ const k=mkCellKey(date.key,d.id,lf.id), empId=schedule.assignments[k]; if (!empId) return; if (!out[empId]) out[empId]={}; if (!out[empId][date.key]) out[empId][date.key]=[]; out[empId][date.key].push({key:k,shiftIdx:sIdx,shiftName:s.name,shiftLetter:letter,dutyTitle:d.title||"Duty",leafLabel:lf.label,areaName:lf.areaName}); }); }); });
    });
    return out;
  }, [schedule]);

  const getEmp = useCallback((eid?: string) => employees.find((e)=>e.id===eid), [employees]);

  const slotsForEmpDate = (emp: Employee, dateKey: string): DutySlot[] => {
    if (!schedule) return [];
    const out: DutySlot[] = [];
    schedule.shifts.forEach((s,sIdx)=>{
      const letter=(s.name||"?").trim().charAt(0).toUpperCase(), range=`${to12h(s.startTime)} – ${to12h(s.endTime)}`;
      s.duties.forEach((d)=>{ dutyLeaves(d).forEach((lf)=>{ const k=mkCellKey(dateKey,d.id,lf.id), taken=schedule.assignments[k]; if (taken===emp.id) return; out.push({key:k,shiftIdx:sIdx,shiftName:s.name,shiftLetter:letter,shiftRange:range,dutyTitle:d.title||"Duty",leafLabel:lf.label,areaName:lf.areaName,takenByName:taken?getEmp(taken)?.name:undefined}); }); });
    });
    return out;
  };

  const assignDutyToEmp = (slotKey: string, applyDates: Set<string>) => {
    if (!dutyPickerCtx) return;
    const empId=dutyPickerCtx.empId;
    const [,dutyId,leafId]=slotKey.split("::");
    const dates=applyDates&&applyDates.size>0?applyDates:new Set([dutyPickerCtx.dateKey]);
    const keys=[...dates].map((dk)=>`${dk}::${dutyId}::${leafId}`);
    if (keys.length>0) handleAssign(keys, empId);
    setDutyPickerCtx(null);
  };

  // ── Computed ──────────────────────────────────────────────────────────────

  const totals = useMemo(()=>{
    if (!schedule) return {total:0,filled:0};
    let total=0;
    schedule.scheduleDates.forEach(()=>schedule.shifts.forEach((s)=>s.duties.forEach((d)=>(total+=dutyLeafCount(d)))));
    return {total,filled:Object.values(schedule.assignments).filter(Boolean).length};
  }, [schedule]);

  const searchTokens = useMemo(()=>searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean),[searchQuery]);
  const isSearching = searchTokens.length>0;
  const matchesCell = (parts: (string|undefined)[]) => {
    if (!isSearching) return true;
    const words=parts.filter(Boolean).flatMap((p)=>String(p).toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean);
    return searchTokens.every((t)=>words.some((w)=>w.startsWith(t)));
  };

  const filteredPool = useMemo(()=>{
    const q=staffSearch.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter((e)=>e.name.toLowerCase().includes(q)||e.role.toLowerCase().includes(q)||(e.rank||"").toLowerCase().includes(q));
  },[employees,staffSearch]);

  // Group staff by raw rank (preserves original listing labels from API)
  const poolByRank = useMemo(()=>{
    const m: Record<string,Employee[]>={};
    filteredPool.forEach((e)=>{ const r=e.rank||"Unranked"; if (!m[r]) m[r]=[]; m[r].push(e); });
    return m;
  },[filteredPool]);

  // Pre-filtered rank entries with stable index — index drives color cycling for unknown ranks
  const poolRankEntries = useMemo(()=>
    [...RANK_ORDER, ...Object.keys(poolByRank).filter((r)=>!RANK_ORDER.includes(r))]
      .map((rank)=>({ rank, list: poolByRank[rank]||[] }))
      .filter(({ list })=>list.length>0)
  ,[poolByRank]);

  const filteredPickerEmps = useMemo(()=>{
    const q=pickerQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e)=>e.name.toLowerCase().includes(q)||(e.rank||"").toLowerCase().includes(q)||(e.role||"").toLowerCase().includes(q));
  },[employees,pickerQuery]);

  const minTemplateDate = useMemo(()=>{
    if (intervals.length===0) return "";
    const maxEnd=Math.max(...intervals.map((iv)=>iv.end_date));
    const d=new Date(maxEnd*1000); d.setDate(d.getDate()+1); return localDateKey(d);
  },[intervals]);

  const deptParam = searchParams.get("department")??"";
  const editExtra = [deptParam?`department=${encodeURIComponent(deptParam)}`:"", `from=${encodeURIComponent(fromParam)}`].filter(Boolean).join("&");
  const isPublished = schedule?.status==="Published";

  // Duty picker context data for dialog
  const pickerEmp = dutyPickerCtx ? employees.find((e)=>e.id===dutyPickerCtx.empId) : null;
  const pickerDate = dutyPickerCtx ? (schedule?.scheduleDates.find((d)=>d.key===dutyPickerCtx.dateKey)??null) : null;
  const pickerSlots = pickerEmp&&dutyPickerCtx ? slotsForEmpDate(pickerEmp, dutyPickerCtx.dateKey) : [];
  const pickerRoleColor = pickerEmp ? (roleColors[pickerEmp.role]??SV_ROLE_PALETTE[0]) : SV_ROLE_PALETTE[0];

  // ── Excel export ──────────────────────────────────────────────────────────

  const exportToExcel = () => {
    if (!schedule) return;
    const sch=schedule;
    const row1:string[]=["Date"], row2:string[]=[""], row3:string[]=[""];
    const merges: XLSX.Range[]=[];
    let col=1;
    sch.shifts.forEach((s,sIdx)=>{
      const span=Math.max(s.duties.reduce((a,d)=>a+dutyLeafCount(d),0),1);
      row1.push(`${s.name||`Shift ${sIdx+1}`}  ${to12h(s.startTime)} - ${to12h(s.endTime)}`);
      for (let i=1;i<span;i++) row1.push("");
      if (span>1) merges.push({s:{r:0,c:col},e:{r:0,c:col+span-1}});
      if (s.duties.length===0){row2.push("—");row3.push("");}
      else { let dCol=col; s.duties.forEach((d,dIdx)=>{ const leaves=dutyLeaves(d); row2.push(d.title||`Duty ${dIdx+1}`); for (let i=1;i<leaves.length;i++) row2.push(""); leaves.forEach((lf)=>row3.push(lf.areaName?`${lf.areaName} · ${lf.label}`:lf.label)); if (leaves.length>1) merges.push({s:{r:1,c:dCol},e:{r:1,c:dCol+leaves.length-1}}); dCol+=leaves.length; }); }
      col+=span;
    });
    merges.push({s:{r:0,c:0},e:{r:2,c:0}});
    const body=sch.scheduleDates.map((dt)=>{ const r=[`${dt.dateNum} ${dt.dayLabel}`]; sch.shifts.forEach((s)=>{ if (s.duties.length===0){r.push("");return;} s.duties.forEach((d)=>dutyLeaves(d).forEach((lf)=>{ const emp=getEmp(sch.assignments[mkCellKey(dt.key,d.id,lf.id)]); r.push(emp?emp.name:""); })); }); return r; });
    const totalCols=row1.length, pad=(arr:string[])=>{ while(arr.length<totalCols)arr.push(""); return arr; };
    const titleRows:string[][]=[], titleMerges:XLSX.Range[]=[];
    if (sch.title){titleRows.push(pad([sch.title]));titleMerges.push({s:{r:0,c:0},e:{r:0,c:totalCols-1}});}
    titleRows.push(pad(["(Departmental On-Call Rota)"]));
    titleMerges.push({s:{r:titleRows.length-1,c:0},e:{r:titleRows.length-1,c:totalCols-1}});
    if (sch.startDate&&sch.endDate){const range=`(${new Date(sch.startDate).toLocaleDateString(undefined,{month:"long",day:"2-digit",year:"numeric"})} – ${new Date(sch.endDate).toLocaleDateString(undefined,{month:"long",day:"2-digit",year:"numeric"})})`;titleRows.push(pad([range]));titleMerges.push({s:{r:titleRows.length-1,c:0},e:{r:titleRows.length-1,c:totalCols-1}});}
    titleRows.push(pad([""]));
    const offset=titleRows.length;
    const shifted=merges.map((m)=>({s:{r:m.s.r+offset,c:m.s.c},e:{r:m.e.r+offset,c:m.e.c}}));
    const ws=XLSX.utils.aoa_to_sheet([...titleRows,row1,row2,row3,...body]);
    ws["!merges"]=[...titleMerges,...shifted]; ws["!cols"]=row1.map(()=>({wch:18}));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Schedule");
    XLSX.writeFile(wb,`${(sch.title||"schedule").replace(/\s+/g,"_")}.xlsx`);
    toast({title:"Exported",description:"Excel file downloaded."});
  };

  // ── PDF download (jsPDF + html2canvas — lazy import) ──────────────────────

  const downloadPdf = async () => {
    if (!schedule) return;
    const { jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");
    const SHIFT_HDR=["#dbeafe","#d1fae5","#ffedd5","#ede9fe"], SHIFT_TEXT=["#1d4ed8","#047857","#c2410c","#6d28d9"], SHIFT_BDR=["#bfdbfe","#a7f3d0","#fed7aa","#ddd6fe"];
    const mkTh=(text:string,css:string):HTMLTableCellElement=>{ const el=document.createElement("th") as HTMLTableCellElement; el.textContent=text; el.style.cssText=css; return el; };
    const wrap=document.createElement("div"); wrap.style.cssText="position:fixed;left:-9999px;top:0;width:1400px;background:#fff;z-index:-999;";
    const tbl=document.createElement("table"); tbl.style.cssText="border-collapse:collapse;width:100%;font-family:system-ui,Arial,sans-serif;font-size:10px;";
    const thead=document.createElement("thead");
    const r1=document.createElement("tr");
    const dateHdr=mkTh("Date","background:#00172d;color:#fff;font-weight:700;text-align:center;padding:5px 6px;border:1px solid #1e3a5f;min-width:48px;vertical-align:middle;"); dateHdr.rowSpan=3; r1.appendChild(dateHdr);
    schedule.shifts.forEach((s,si)=>{ const span=Math.max(s.duties.flatMap((d)=>dutyLeaves(d)).length,1),time=s.startTime&&s.endTime?` · ${s.startTime}–${s.endTime}`:""; const th=mkTh(`${s.name||`Shift ${si+1}`}${time}`,`background:${SHIFT_HDR[si%4]};color:${SHIFT_TEXT[si%4]};font-weight:700;text-align:center;padding:5px 6px;border:1px solid ${SHIFT_BDR[si%4]};`); th.colSpan=span; r1.appendChild(th); });
    thead.appendChild(r1);
    const r2=document.createElement("tr");
    schedule.shifts.forEach((s,si)=>{ if (s.duties.length===0){r2.appendChild(mkTh("—",`background:#f8faff;color:#6b7280;text-align:center;padding:3px 6px;border:1px solid ${SHIFT_BDR[si%4]};`));} else { s.duties.forEach((d)=>{ const dl=dutyLeaves(d); const th=mkTh(d.title||"Duty","background:#e8f0fe;color:#1d4ed8;font-weight:600;text-align:center;padding:3px 6px;border:1px solid #bfdbfe;"); th.colSpan=dl.length; r2.appendChild(th); }); } });
    thead.appendChild(r2);
    const r3=document.createElement("tr");
    schedule.shifts.forEach((s,si)=>{ if (s.duties.length===0){r3.appendChild(mkTh("",`background:#f5f7ff;padding:2px 6px;border:1px solid ${SHIFT_BDR[si%4]};`));} else { s.duties.forEach((d)=>{ dutyLeaves(d).forEach((lf)=>{ r3.appendChild(mkTh(lf.areaName?`${lf.areaName} · ${lf.label}`:lf.label,"background:#f5f7ff;color:#374151;text-align:center;padding:2px 6px;border:1px solid #e2e8f0;font-size:8px;font-weight:500;")); }); }); } });
    thead.appendChild(r3); tbl.appendChild(thead);
    const tbody=document.createElement("tbody");
    schedule.scheduleDates.forEach((dt,ri)=>{ const tr=document.createElement("tr"); tr.style.background=ri%2===0?"#ffffff":"#f9fafb"; const dateTd=document.createElement("td"); dateTd.innerHTML=`<div style="font-size:7px;color:#6b7280;font-weight:600;">${dt.dayLabel}</div><div style="font-size:12px;font-weight:700;color:#00172d;">${dt.dateNum}</div>`; dateTd.style.cssText="text-align:center;padding:3px;border:1px solid #e2e8f0;background:#f8fafc;vertical-align:middle;"; tr.appendChild(dateTd);
    schedule.shifts.forEach((s)=>{ const mkTd=(text:string,css:string)=>{const t=document.createElement("td");t.textContent=text;t.style.cssText=css;return t;}; if (s.duties.length===0){tr.appendChild(mkTd("","border:1px solid #e2e8f0;padding:4px;"));return;} s.duties.forEach((d)=>{ dutyLeaves(d).forEach((lf)=>{ const emp=getEmp(schedule.assignments[mkCellKey(dt.key,d.id,lf.id)]); tr.appendChild(mkTd(emp?emp.name:"",`text-align:center;padding:4px 5px;border:1px solid #e2e8f0;font-size:9px;color:${emp?"#111827":"#d1d5db"};`)); }); }); }); tbody.appendChild(tr); });
    tbl.appendChild(tbody); wrap.appendChild(tbl); document.body.appendChild(wrap);
    let tableCanvas: Awaited<ReturnType<typeof html2canvas>>; try { tableCanvas=await html2canvas(wrap,{scale:2,backgroundColor:"#ffffff",logging:false}); } finally { document.body.removeChild(wrap); }
    const HEADER_H=28,FOOTER_H=8,MARGIN=10;
    const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight(),availW=pageW-MARGIN*2,availH=pageH-HEADER_H-FOOTER_H-MARGIN;
    const imgW=tableCanvas.width,imgH=tableCanvas.height,renderH=(imgH/imgW)*availW,totalPages=Math.ceil(renderH/availH);
    const drawHeader=(page:number)=>{ doc.setFillColor(255,255,255);doc.rect(0,0,pageW,HEADER_H,"F");doc.setFontSize(14);doc.setFont("helvetica","bold");doc.setTextColor(0,23,45);doc.text(schedule.title||"Schedule",MARGIN+4,11);doc.setFontSize(8);doc.setFont("helvetica","normal");doc.setTextColor(100,110,130);doc.text(`${schedule.startDate} – ${schedule.endDate}`,MARGIN+4,17);doc.setFillColor(...(isPublished?[22,163,74] as [number,number,number]:[107,114,128] as [number,number,number]));doc.roundedRect(pageW-MARGIN-20,8,20,7,2,2,"F");doc.setTextColor(255,255,255);doc.setFontSize(8);doc.setFont("helvetica","bold");doc.text(isPublished?"Live":"Draft",pageW-MARGIN-10,12.8,{align:"center"});doc.setDrawColor(220,225,235);doc.setLineWidth(0.3);doc.line(MARGIN,HEADER_H,pageW-MARGIN,HEADER_H);doc.setFontSize(7);doc.setTextColor(180,180,180);doc.setFont("helvetica","normal");doc.text(`Generated by MedicalCircles  ·  Page ${page} of ${totalPages}`,pageW/2,pageH-3,{align:"center"}); };
    for (let p=0;p<totalPages;p++){ if (p>0) doc.addPage(); drawHeader(p+1); const yStart_mm=p*availH,yEnd_mm=Math.min((p+1)*availH,renderH),sliceH_mm=yEnd_mm-yStart_mm,srcY=Math.round((yStart_mm/renderH)*imgH),srcH=Math.max(Math.round((sliceH_mm/renderH)*imgH),1); const slice=document.createElement("canvas"); slice.width=imgW; slice.height=srcH; slice.getContext("2d")!.drawImage(tableCanvas,0,srcY,imgW,srcH,0,0,imgW,srcH); doc.addImage(slice.toDataURL("image/png"),"PNG",MARGIN,HEADER_H+2,availW,sliceH_mm); }
    doc.save(`${(schedule.title||"schedule").replace(/\s+/g,"_")}.pdf`);
  };

  // ── Render guards ─────────────────────────────────────────────────────────

  if (intervalsLoading) return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />
      <main className={cn("flex-1 transition-all duration-300",sidebarMargin)}>
        <div className="flex items-center justify-center py-40"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"/></div>
      </main>
    </div>
  );

  if (intervals.length===0) return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />
      <main className={cn("flex-1 transition-all duration-300",sidebarMargin)}>
        <div className="max-w-7xl mx-auto p-8"><Button variant="ghost" size="sm" onClick={()=>router.push(fromParam)} className="gap-1.5 mb-4"><ArrowLeft className="h-4 w-4"/>Back</Button><p className="text-muted-foreground">Schedule not found.</p></div>
      </main>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />
      <main className={cn("flex-1 transition-all duration-300 overflow-x-hidden",sidebarMargin)}>
        <div className="max-w-[1800px] mx-auto p-6 space-y-4">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="sm" onClick={()=>router.push(fromParam)} className="gap-1.5 self-start -ml-2 text-muted-foreground hover:text-foreground h-8">
                <ArrowLeft className="h-4 w-4"/>Back
              </Button>
              <div className="mt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground">{schedule?.title||dutyCode}</h1>
                  {isPublished ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"/></span>
                      Live now
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border">Draft</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {deptName ? `Departments > ${deptName}` : schedule ? `${new Date(schedule.startDate+"T00:00:00").toLocaleDateString(undefined,{day:"numeric",month:"long",year:"numeric"})} – ${new Date(schedule.endDate+"T00:00:00").toLocaleDateString(undefined,{day:"numeric",month:"long",year:"numeric"})}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="text-right mr-0.5 border-r border-border pr-3">
                <p className="text-xs text-muted-foreground">Assignments</p>
                <p className="text-sm font-bold text-foreground">{totals.filled} <span className="text-muted-foreground font-normal">/ {totals.total}</span></p>
              </div>
              <Button variant="outline" size="sm" onClick={()=>window.print()} className="gap-1.5 h-9 px-3.5"><Printer className="h-4 w-4"/>Print Table</Button>
              <Button variant="outline" size="sm" onClick={exportToExcel} disabled={!schedule} className="gap-1.5 h-9 px-3.5"><FileSpreadsheet className="h-4 w-4"/>Export Excel</Button>
              <Button variant="outline" size="sm" onClick={()=>void downloadPdf()} disabled={!schedule} className="gap-1.5 h-9 px-3.5"><FileDown className="h-4 w-4"/>Download Table</Button>
              <Button variant="outline" size="sm" onClick={()=>setConfirmAction("edit")} disabled={!schedule} className="gap-1.5 h-9 px-3.5"><Pencil className="h-4 w-4"/>Edit</Button>
              {isPublished ? (
                <Button size="sm" disabled className="gap-1.5 h-9 px-3.5"><Send className="h-4 w-4"/>Published</Button>
              ) : (
                <Button size="sm" onClick={()=>setConfirmAction("publish")} className="gap-1.5 h-9 px-3.5"><Send className="h-4 w-4"/>Publish</Button>
              )}
            </div>
          </div>

          {/* ── Interval tabs + Add button ──────────────────────────────── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden flex-wrap">
            {intervals.map((iv) => {
              const isActive=currentInterval?.staffing_id===iv.staffing_id&&currentInterval?.start_date===iv.start_date;
              return (
                <button key={`${iv.staffing_id}-${iv.start_date}`} type="button" onClick={()=>{ if (!isActive) setCurrentInterval(iv); }}
                  className={cn("flex-shrink-0 flex flex-col items-center px-5 py-3 rounded-2xl font-medium transition-all border whitespace-nowrap min-w-[100px]", isActive?"bg-[#00172d] text-white border-[#00172d] shadow-md":"bg-card border-border text-muted-foreground hover:border-border hover:text-foreground hover:shadow-sm")}>
                  <span className="font-bold text-sm leading-tight">{ivLabel(iv)}</span>
                  <span className={cn("text-[11px] mt-0.5",isActive?"text-white/70":"text-muted-foreground/70")}>{ivRange(iv)}</span>
                </button>
              );
            })}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex-shrink-0 h-11 w-11 rounded-full border-2 border-dashed border-gray-400 bg-gray-100 text-gray-500 flex items-center justify-center group transition-all duration-200 hover:bg-gray-200 hover:border-gray-500 hover:scale-110 active:scale-95" aria-label="Add schedule">
                  <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90"/>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem onClick={()=>{setExtendEnd(undefined);setExtendOpen(true);}} className="flex items-start gap-3 py-2.5 focus:bg-gray-100 hover:bg-gray-100 focus:text-foreground cursor-pointer">
                  <CalendarDays className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0"/>
                  <div><p className="font-medium text-sm">Extend existing schedule</p><p className="text-xs text-muted-foreground">Apply current setup to new dates.</p></div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={()=>{setCreateRange(undefined);setCreateOpen(true);}} className="flex items-start gap-3 py-2.5 focus:bg-gray-100 hover:bg-gray-100 focus:text-foreground cursor-pointer">
                  <FilePlus2 className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0"/>
                  <div><p className="font-medium text-sm">Create new schedule</p><p className="text-xs text-muted-foreground">Define a new schedule for a new date range.</p></div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={()=>{void loadTemplates();setTemplateQuery("");setTemplateFilter("all");setTemplateStartDate("");setTemplateEndDate("");setTemplateOpen(true);}} className="flex items-start gap-3 py-2.5 focus:bg-gray-100 hover:bg-gray-100 focus:text-foreground cursor-pointer">
                  <LayoutTemplate className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0"/>
                  <div><p className="font-medium text-sm">Select from template</p><p className="text-xs text-muted-foreground">Choose from saved schedule templates.</p></div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── View toggle + Search ─────────────────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap print:hidden">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "shift" | "employee")}>
              <TabsList>
                <TabsTrigger value="shift" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  By Shift
                </TabsTrigger>
                <TabsTrigger value="employee" className="gap-2">
                  <Users className="h-4 w-4" />
                  By Employee
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative max-w-2xl flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"/>
              <Input placeholder="Search by name, role, duty, area, or shift... (e.g. 'Amina ICU' or 'Consultant ER')" className="pl-9 pr-8 h-10 bg-white border-gray-200" value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)}/>
              {searchQuery && <button type="button" onClick={()=>setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5"/></button>}
            </div>
          </div>

          {/* ── Confirm dialog ───────────────────────────────────────────── */}
          <AlertDialog open={confirmAction!==null} onOpenChange={(o)=>!o&&setConfirmAction(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmAction==="publish"?"Confirm Publish Schedule?":"Warning!"}</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmAction==="publish"&&"You're about to publish this schedule. Staff will be notified and able to view their assignments. Do you want to proceed?"}
                  {confirmAction==="unpublish"&&"Unpublishing will hide this schedule from staff and revert it to draft. Do you want to proceed?"}
                  {confirmAction==="edit"&&"Editing this schedule will remove all users assigned to it. Do you want to proceed?"}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={cn(confirmAction!=="publish"&&"bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                  onClick={()=>{
                    const action=confirmAction; setConfirmAction(null);
                    if (action==="publish") void togglePublish(true);
                    else if (action==="unpublish") void togglePublish(false);
                    else if (action==="edit") router.push(`/admin/scheduling/create?edit=${schedule?.id}&${editExtra}`);
                  }}>
                  {confirmAction==="publish"?"Proceed":"Proceed Anyway"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* ── Body: Staff Pool LEFT + Grid RIGHT ─────────────────────── */}
          {scheduleLoading ? (
            <div className="flex items-center justify-center py-20"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent"/></div>
          ) : !schedule ? (
            <div className="rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">Could not load schedule details for this interval.</div>
          ) : (
            <div className="flex gap-4 items-start">

              {/* ── Staff Pool (LEFT) ──────────────────────────────────── */}
              <div className="w-[240px] flex-shrink-0 print:hidden">
                <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden sticky top-6">
                  <div className="px-3.5 pt-3.5 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest">Staff Pool</h3>
                      <span className="text-[10px] font-medium text-gray-400">{employees.length} members</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-none">Drag staff to assign duties</p>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none"/>
                      <Input placeholder="Search staff..." className="pl-7 h-8 text-xs bg-gray-50 border-gray-200" value={staffSearch} onChange={(e)=>setStaffSearch(e.target.value)}/>
                    </div>
                  </div>
                  <ScrollArea style={{ height:"calc(100vh - 220px)" }}>
                    <div className="px-2.5 pb-2.5 space-y-3">
                      {poolRankEntries.map(({ rank, list }, rankIdx)=>{
                        const rankCls = RANK_COLORS[rank] ?? RANK_PALETTE[rankIdx % RANK_PALETTE.length];
                        return (
                          <div key={rank}>
                            <div className="flex items-center gap-1.5 mb-1.5 px-1">
                              <div className={cn("h-2 w-2 rounded-full flex-shrink-0",rankCls.dot)}/>
                              <span className={cn("text-[10px] font-bold uppercase tracking-widest",rankCls.text)}>{rank}</span>
                              <span className="text-[9px] font-medium text-gray-400 ml-auto">{list.length}</span>
                            </div>
                            <div className="space-y-1">
                              {list.map((emp)=>(
                                <div key={emp.id} draggable onDragStart={handleDragStart(emp.id) as React.DragEventHandler<HTMLDivElement>}
                                  className={cn("flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white border border-gray-100 border-l-[3px] cursor-grab active:cursor-grabbing hover:bg-gray-50 hover:border-gray-300 hover:shadow-md hover:-translate-y-px transition-all group",rankCls.border)}>
                                  <Avatar className="h-6 w-6 flex-shrink-0">
                                    <AvatarImage src={emp.photoUrl} alt={emp.name}/>
                                    <AvatarFallback className={cn("text-[9px] font-bold",rankCls.bg,rankCls.text)}>{emp.avatar}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-[11px] font-medium text-gray-700 truncate flex-1">{emp.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {filteredPool.length===0&&<p className="text-xs text-center text-gray-400 py-6">No staff found.</p>}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              {/* ── Schedule Grid / By Employee (RIGHT) ───────────────── */}
              <div className="flex-1 min-w-0">
                {viewMode==="shift" ? (
                  <ShiftGrid
                    schedule={schedule}
                    employees={employees}
                    dragOverKey={dragOverKey}
                    getEmp={getEmp}
                    pickerKey={pickerKey}
                    pickerStep={pickerStep}
                    pickerQuery={pickerQuery}
                    pickerDates={pickerDates}
                    pickerEmpId={pickerEmpId}
                    filteredPickerEmps={filteredPickerEmps}
                    isSearching={isSearching}
                    matchesCell={matchesCell}
                    todayKey={todayKey}
                    weekdayOf={weekdayOf}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                    onDragOver={(k)=>setDragOverKey(k)}
                    onDragLeave={()=>setDragOverKey(null)}
                    onRemove={handleRemove}
                    onOpenPicker={openPicker}
                    onClosePicker={closePicker}
                    onSetPickerQuery={setPickerQuery}
                    onSelectEmp={(empId)=>{setPickerEmpId(empId);setPickerStep(2);}}
                    onApplyPreset={applyPickerPreset}
                    onTogglePickerDate={(dk)=>{if (!isFuture(dk)) return; setPickerDates((p)=>{const n=new Set(p);n.has(dk)?n.delete(dk):n.add(dk);return n;});}}
                    onApplyPickerAssign={applyPickerAssign}
                    setPickerStep={setPickerStep}
                  />
                ) : (
                  <ByEmployeeView
                    visibleDates={schedule.scheduleDates}
                    roles={uniqueRoles}
                    employees={employees}
                    assignmentsByEmpDate={assignmentsByEmpDate}
                    roleColors={roleColors}
                    shiftPalette={SV_SHIFT_PALETTE_OBJ}
                    roleShort={roleShort}
                    isSearching={isSearching}
                    matchesCell={matchesCell}
                    onOpenDutyPicker={setDutyPickerCtx}
                    onClearAssign={handleRemove}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Extend Schedule Dialog (DayPicker calendar) ────────────────── */}
      <Dialog open={extendOpen} onOpenChange={(o)=>{if (!o){setExtendOpen(false);setExtendEnd(undefined);}}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Extend Schedule</DialogTitle>
            <DialogDescription>Pick the new end date. The schedule continues from its current last day{schedule?.endDate?` (${schedule.endDate})`:""}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center w-full overflow-hidden">
            <DayPicker
              mode="single"
              selected={extendEnd}
              onSelect={(d)=>setExtendEnd(d&&extendStart&&d>extendStart?d:undefined)}
              defaultMonth={extendStart}
              disabled={(d)=>!!extendStart&&d<=extendStart}
              modifiers={{ anchor:extendStart?[extendStart]:[] }}
              modifiersClassNames={{ anchor:"rdp-day_selected" }}
              numberOfMonths={1}
              classNames={{ root:"rdp w-full", month:"rdp-month w-full", table:"rdp-table w-full", head_row:"rdp-head_row flex w-full", row:"rdp-row flex w-full mt-1", head_cell:"rdp-head_cell flex-1 text-center text-xs font-medium text-muted-foreground", cell:"rdp-cell flex-1 text-center" }}
            />
          </div>
          {extendEnd && <p className="text-xs text-center text-muted-foreground">Extending to <strong>{extendEnd.toLocaleDateString()}</strong></p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={()=>{setExtendOpen(false);setExtendEnd(undefined);}}>Cancel</Button>
            <Button onClick={()=>void handleExtend()} disabled={!extendEnd}>Extend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create New Schedule Dialog (DayPicker range) ───────────────── */}
      <Dialog open={createOpen} onOpenChange={(o)=>{if (!o){setCreateOpen(false);setCreateRange(undefined);}}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Schedule</DialogTitle>
            <DialogDescription>
              Pick a start and end date for the new schedule.
              {maxEndDate&&<> Dates up to <strong>{maxEndDate.toLocaleDateString()}</strong> are already scheduled.</>}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center w-full overflow-hidden">
            <DayPicker
              mode="range"
              selected={createRange}
              onSelect={(r)=>setCreateRange(r??undefined)}
              disabled={(d)=>!!maxEndDate&&d.getTime()<=maxEndDate.getTime()}
              defaultMonth={maxEndDate?new Date(maxEndDate.getFullYear(),maxEndDate.getMonth()+1,1):undefined}
              numberOfMonths={1}
              classNames={{ root:"rdp w-full", month:"rdp-month w-full", table:"rdp-table w-full", head_row:"rdp-head_row flex w-full", row:"rdp-row flex w-full mt-1", head_cell:"rdp-head_cell flex-1 text-center text-xs font-medium text-muted-foreground", cell:"rdp-cell flex-1 text-center" }}
            />
          </div>
          {createRange?.from&&createRange?.to&&<p className="text-xs text-center text-muted-foreground"><strong>{createRange.from.toLocaleDateString()}</strong> → <strong>{createRange.to.toLocaleDateString()}</strong></p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={()=>{setCreateOpen(false);setCreateRange(undefined);}}>Cancel</Button>
            <Button onClick={handleCreateNew} disabled={!createRange?.from||!createRange?.to}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Template Dialog ────────────────────────────────────────────── */}
      <Dialog open={templateOpen} onOpenChange={(o)=>{if (!o) setTemplateOpen(false);}}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select from template</DialogTitle>
            <DialogDescription>Pick a previously saved schedule template and choose its date range.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-foreground block mb-1">Start date</label><Input type="date" value={templateStartDate} min={minTemplateDate||undefined} onChange={(e)=>{setTemplateStartDate(e.target.value);if (templateEndDate&&e.target.value>templateEndDate) setTemplateEndDate("");}}/></div>
            <div><label className="text-xs font-medium text-foreground block mb-1">End date</label><Input type="date" value={templateEndDate} min={templateStartDate||minTemplateDate||undefined} onChange={(e)=>setTemplateEndDate(e.target.value)}/></div>
          </div>
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/><Input placeholder="Search templates..." className="pl-8 h-8 text-sm" value={templateQuery} onChange={(e)=>setTemplateQuery(e.target.value)}/></div>
          <div className="flex gap-1.5">
            {(["all","live","draft"] as const).map((f)=>(
              <button key={f} type="button" onClick={()=>setTemplateFilter(f)} className={cn("px-3 py-1 rounded-full text-xs font-medium border transition-colors",templateFilter===f?"bg-primary text-primary-foreground border-primary":"bg-card border-border text-muted-foreground hover:border-primary/40")}>
                {f==="all"?`All (${templates.length})`:f==="live"?`Live (${templates.filter((t)=>t.isLive).length})`:`Draft (${templates.filter((t)=>!t.isLive).length})`}
              </button>
            ))}
          </div>
          <ScrollArea className="h-52 rounded-md border">
            <div className="p-2 space-y-1">
              {templatesLoading&&<p className="text-xs text-center text-muted-foreground py-6">Loading templates…</p>}
              {!templatesLoading&&templates.length===0&&<p className="text-xs text-center text-muted-foreground py-6">No templates available.</p>}
              {!templatesLoading&&(()=>{
                const filtered=templates.filter((t)=>{
                  if (templateFilter==="live"&&!t.isLive) return false;
                  if (templateFilter==="draft"&&t.isLive) return false;
                  const q=templateQuery.trim().toLowerCase();
                  return !q||t.configTitle.toLowerCase().includes(q)||t.name.toLowerCase().includes(q);
                });
                if (filtered.length===0) return <p className="text-xs text-center text-muted-foreground py-6">No templates match.</p>;
                return filtered.map((t)=>(
                  <button key={t.id} type="button" className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/30 transition-all"
                    onClick={()=>{ sessionStorage.setItem("mc.scheduleTemplate",JSON.stringify(t.raw)); const parts=[`from=${encodeURIComponent(fromParam)}`]; if (deptParam) parts.unshift(`department=${encodeURIComponent(deptParam)}`); if (templateStartDate) parts.push(`start=${templateStartDate}`); if (templateEndDate) parts.push(`end=${templateEndDate}`); router.push(`/admin/scheduling/create?${parts.join("&")}`); setTemplateOpen(false); }}>
                    <LayoutTemplate className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{t.configTitle}</p>{t.createdAt&&<p className="text-xs text-muted-foreground">Created: {t.createdAt}</p>}</div>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0",t.isLive?"text-emerald-700 bg-emerald-50 border-emerald-200":"text-muted-foreground bg-muted border-border")}>{t.isLive?"Live":"Draft"}</span>
                  </button>
                ));
              })()}
            </div>
          </ScrollArea>
          <DialogFooter><Button variant="outline" onClick={()=>setTemplateOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DutyPickerDialog (By Employee view) ──────────────────────── */}
      <DutyPickerDialog
        open={!!dutyPickerCtx}
        onOpenChange={(o)=>{if (!o) setDutyPickerCtx(null);}}
        employee={pickerEmp}
        date={pickerDate}
        slots={pickerSlots}
        shiftPalette={SV_SHIFT_PALETTE_OBJ}
        roleColor={pickerRoleColor}
        onAssign={assignDutyToEmp}
        visibleDates={schedule?.scheduleDates??[]}
        isPublished={!!isPublished}
      />
    </div>
  );
}

// ─── ShiftGrid sub-component ──────────────────────────────────────────────────
// Kept in same file to share types. Mirrors ReactJS ScheduleTable layout.

interface ShiftGridProps {
  schedule: SavedSchedule;
  employees: Employee[];
  dragOverKey: string|null;
  getEmp: (eid?:string) => Employee|undefined;
  pickerKey: string|null;
  pickerStep: 1|2;
  pickerQuery: string;
  pickerDates: Set<string>;
  pickerEmpId: string|null;
  filteredPickerEmps: Employee[];
  isSearching: boolean;
  matchesCell: (parts:(string|undefined)[])=>boolean;
  todayKey: string;
  weekdayOf: (key:string)=>number;
  onDragStart: (empId:string, sourceKey?:string) => (e:DragEvent<HTMLElement>)=>void;
  onDrop: (key:string, isPast:boolean) => (e:DragEvent<HTMLElement>)=>void;
  onDragOver: (key:string) => void;
  onDragLeave: () => void;
  onRemove: (key:string) => void;
  onOpenPicker: (k:string) => void;
  onClosePicker: () => void;
  onSetPickerQuery: (q:string) => void;
  onSelectEmp: (empId:string) => void;
  onApplyPreset: (preset:string) => void;
  onTogglePickerDate: (dk:string) => void;
  onApplyPickerAssign: () => void;
  setPickerStep: (s:1|2) => void;
}

function ShiftGrid({
  schedule, employees, dragOverKey, getEmp,
  pickerKey, pickerStep, pickerQuery, pickerDates, pickerEmpId, filteredPickerEmps,
  isSearching, matchesCell, todayKey: _todayKey, weekdayOf,
  onDragStart, onDrop, onDragOver, onDragLeave, onRemove,
  onOpenPicker, onClosePicker, onSetPickerQuery, onSelectEmp,
  onApplyPreset, onTogglePickerDate, onApplyPickerAssign, setPickerStep,
}: ShiftGridProps) {

  const getSelEmp = (empId:string|null) => employees.find((e)=>e.id===empId);

  return (
    <Card className="p-3 overflow-hidden min-w-0">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-separate border-spacing-0 min-w-[900px]">
          <thead>
            <tr>
              <th rowSpan={4} className="text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-3 py-3 bg-muted/30 border-b border-r border-border w-[80px] min-w-[80px] max-w-[80px] align-middle sticky left-0 z-10">Date</th>
              {schedule.shifts.map((s,sIdx)=>{
                const c=SHIFT_PALETTE[sIdx%SHIFT_PALETTE.length], span=Math.max(s.duties.reduce((n,d)=>n+dutyLeafCount(d),0),1), Icon=shiftIcon(s.startTime);
                return (
                  <th key={`sh-${s.id}`} colSpan={span} className={cn("border-b border-r border-border px-3 py-2.5 text-center",c.headerBg)}>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-current opacity-60"/><Icon className={cn("h-4 w-4",c.text)}/><span className={cn("text-sm font-bold",c.text)}>{s.name}</span></div>
                      <span className={cn("text-xs font-mono opacity-80",c.text)}>{to12h(s.startTime)} – {to12h(s.endTime)}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
            <tr>
              {schedule.shifts.map((s,sIdx)=>{ const c=SHIFT_PALETTE[sIdx%SHIFT_PALETTE.length]; if (s.duties.length===0) return <th key={`dh-empty-${s.id}`} rowSpan={3} className={cn("px-2 py-2 text-center border-b border-r border-border text-[11px] italic text-muted-foreground/70",c.headerBg)}>no duties</th>; return s.duties.map((d,dIdx)=>(<th key={`dh-${d.id}`} colSpan={dutyLeafCount(d)} className={cn("px-2 py-2 text-center border-b border-r border-border",c.headerBg)}><span className={cn("text-sm font-semibold",c.dutyText)}>{d.title||`Duty ${dIdx+1}`}</span></th>)); })}
            </tr>
            <tr>
              {schedule.shifts.map((s,sIdx)=>{ const c=SHIFT_PALETTE[sIdx%SHIFT_PALETTE.length]; if (s.duties.length===0) return null; return s.duties.map((d)=>{ if (!d.coversAreas||!d.areas||d.areas.length===0){const roles=d.roles.length===0?[d.title||"—"]:d.roles; return roles.map((r,rIdx)=>(<th key={`rh-${d.id}-${rIdx}`} rowSpan={2} className={cn("px-2 py-2 text-center border-b border-r border-border align-middle",c.headerBg)}><span className={cn("text-xs font-medium",c.dutyText)}>{r}</span></th>));} return d.areas.map((a)=>(<th key={`ah-${a.id}`} colSpan={Math.max(a.roles.length,1)} className={cn("px-2 py-1.5 text-center border-b border-r border-border",c.headerBg)}><span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold",c.dutyText)}><MapPin className="h-3 w-3"/>{a.name}</span></th>)); }); })}
            </tr>
            <tr>
              {schedule.shifts.map((s,sIdx)=>{ const c=SHIFT_PALETTE[sIdx%SHIFT_PALETTE.length]; if (s.duties.length===0) return null; return s.duties.map((d)=>{ if (!d.coversAreas||!d.areas||d.areas.length===0) return null; return d.areas.map((a)=>{ const roles=a.roles.length===0?[a.name||"—"]:a.roles; return roles.map((r,rIdx)=>(<th key={`rh2-${a.id}-${rIdx}`} className={cn("px-2 py-2 text-center border-b border-r border-border",c.headerBg)}><span className={cn("text-xs font-medium",c.dutyText)}>{r}</span></th>)); }); }); })}
            </tr>
          </thead>
          <tbody>
            {schedule.scheduleDates.map((date)=>{
              const isPast=date.key<_todayKey;
              return (
                <tr key={date.key} className={cn(isPast&&"opacity-55")}>
                  <td className={cn("px-3 py-2 border-b border-r border-border align-top sticky left-0 z-10 w-[80px] min-w-[80px] max-w-[80px]",isPast?"bg-muted/50":"bg-muted/20")}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{date.dayLabel}</p>
                    <p className="text-xl font-bold text-foreground leading-none mt-0.5">{date.dateNum}</p>
                    {isPast&&<p className="text-[9px] text-muted-foreground/50 mt-0.5">past</p>}
                  </td>
                  {schedule.shifts.map((s,sIdx)=>{
                    const c=SHIFT_PALETTE[sIdx%SHIFT_PALETTE.length];
                    if (s.duties.length===0) return (<td key={`empty-${s.id}-${date.key}`} className={cn("border-b border-r border-border px-1 py-1 w-[130px] min-w-[130px]",isPast?"bg-muted/20":c.cellBg)}><div className="h-10 rounded-lg border border-dashed border-border/40 bg-muted/10"/></td>);
                    return s.duties.flatMap((d)=>dutyLeaves(d).map((lf)=>{
                      const k=mkCellKey(date.key,d.id,lf.id), emp=getEmp(schedule.assignments[k]);
                      const isOver=dragOverKey===k, cellMatch=emp?matchesCell([emp.name,emp.role,emp.rank,d.title,lf.label,lf.areaName,s.name]):false, dimmed=isSearching&&!!emp&&!cellMatch;
                      const rankCls = emp ? (rc(rankOf(emp.rank))||rc("Junior")) : rc("Junior");
                      return (
                        <td key={`cell-${d.id}-${date.key}-${lf.id}`} className={cn("border-b border-r border-border px-1 py-1 align-middle w-[130px] min-w-[130px]",isPast?"bg-muted/20":c.cellBg,dimmed&&"opacity-30")}>
                          {emp ? (
                            /* Assigned chip — drag-to-move + X-to-remove. NO click-to-reassign (matches ReactJS). */
                            <div
                              draggable={!isPast}
                              onDragStart={!isPast?onDragStart(emp.id,k) as React.DragEventHandler<HTMLDivElement>:undefined}
                              onDragOver={!isPast?(e)=>{e.preventDefault();onDragOver(k);}:undefined}
                              onDragLeave={!isPast?onDragLeave:undefined}
                              onDrop={!isPast?onDrop(k,isPast) as React.DragEventHandler<HTMLDivElement>:undefined}
                              className={cn("group relative flex items-center gap-2 px-2 py-1.5 rounded-xl bg-card border-2 transition-all",isPast?"cursor-default":"cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-px",rankCls.border,(isOver||pickerKey===k)&&"ring-2 ring-accent shadow-md")}
                            >
                              <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-background shadow-sm">
                                <AvatarImage src={emp.photoUrl} alt={emp.name}/>
                                <AvatarFallback className={cn("text-[10px] font-bold",rankCls.bg,rankCls.text)}>{emp.avatar}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-foreground leading-tight truncate">{emp.name}</p>
                                <p className="text-[9px] text-muted-foreground leading-none truncate mt-0.5">{emp.role||emp.rank}</p>
                                <span className={cn("text-[7px] font-bold px-1 py-0 rounded border uppercase tracking-wider mt-0.5 inline-block leading-tight",rankCls.bg,rankCls.text,rankCls.border)}>{rs(rankOf(emp.rank))}</span>
                              </div>
                              {!isPast&&(
                                <button onClick={(e)=>{e.stopPropagation();onRemove(k);}} className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                  <X className="h-2.5 w-2.5"/>
                                </button>
                              )}
                            </div>
                          ) : isPast ? (
                            <div className="h-10 rounded-lg border border-dashed border-border/20"/>
                          ) : (
                            /* Empty future cell — popover picker */
                            <Popover open={pickerKey===k} onOpenChange={(open)=>open?onOpenPicker(k):onClosePicker()}>
                              <PopoverTrigger asChild>
                                <button type="button"
                                  onDragOver={(e)=>{e.preventDefault();onDragOver(k);}}
                                  onDragLeave={onDragLeave}
                                  onDrop={onDrop(k,false) as React.DragEventHandler<HTMLButtonElement>}
                                  className={cn("w-full h-10 rounded-lg border-2 border-dashed flex items-center justify-center transition-all",isOver?"border-primary/80 bg-primary/10 scale-[1.02]":"border-border/40 hover:border-primary/60 hover:bg-gray-100")}>
                                  <span className="text-[11px] text-muted-foreground/50 font-medium select-none">{isOver?"Drop":"+"}</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[340px] p-0 shadow-xl border border-border/80 overflow-hidden rounded-2xl" align="start" sideOffset={8}>
                                {pickerStep===1 ? (
                                  /* ── Step 1: Member selection ── */
                                  <div className="flex flex-col">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-br from-primary/[0.06] to-accent/[0.06] border-b border-border/70">
                                      <div>
                                        <p className="text-sm font-semibold text-foreground leading-none">Assign Member</p>
                                        <p className="text-[11px] text-muted-foreground mt-1">Select a staff member to assign</p>
                                      </div>
                                      <button type="button" onClick={onClosePicker} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground">
                                        <X className="h-3.5 w-3.5"/>
                                      </button>
                                    </div>
                                    {/* Search */}
                                    <div className="px-3 pt-3 pb-2">
                                      <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
                                        <input autoFocus className="w-full pl-9 pr-8 h-9 text-sm bg-muted/50 rounded-lg border border-border/60 focus:border-accent/60 focus:ring-2 focus:ring-accent/15 outline-none placeholder:text-muted-foreground/50 transition-all" placeholder="Search by name or role..." value={pickerQuery} onChange={(ev)=>onSetPickerQuery(ev.target.value)}/>
                                        {pickerQuery&&<button type="button" onClick={()=>onSetPickerQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"><X className="h-3.5 w-3.5"/></button>}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground mt-1.5 pl-0.5">{filteredPickerEmps.length} member{filteredPickerEmps.length!==1?"s":""} available</p>
                                    </div>
                                    {/* List */}
                                    <ScrollArea className="h-52">
                                      <div className="px-2 pb-2 space-y-0.5">
                                        {filteredPickerEmps.length===0&&(
                                          <div className="flex flex-col items-center justify-center py-8 gap-2">
                                            <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center">
                                              <Users className="h-5 w-5 text-muted-foreground/40"/>
                                            </div>
                                            <p className="text-xs text-muted-foreground">No staff matches your search.</p>
                                          </div>
                                        )}
                                        {filteredPickerEmps.map((e2)=>{ const rk=rc(rankOf(e2.rank)); return (
                                          <button key={e2.id} type="button" onClick={()=>onSelectEmp(e2.id)} className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-accent/10 hover:border-accent/20 border border-transparent group transition-all text-left">
                                            <div className="relative flex-shrink-0">
                                              <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm">
                                                <AvatarImage src={e2.photoUrl} alt={e2.name}/>
                                                <AvatarFallback className={cn("text-[10px] font-bold",rk.bg,rk.text)}>{e2.avatar}</AvatarFallback>
                                              </Avatar>
                                              <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",rk.bg)}/>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-semibold text-foreground leading-tight truncate group-hover:text-accent transition-colors">{e2.name}</p>
                                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{e2.role||e2.rank}</p>
                                            </div>
                                            <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-md border flex-shrink-0 uppercase tracking-wide",rk.bg,rk.text,rk.border)}>{rs(rankOf(e2.rank))}</span>
                                          </button>
                                        ); })}
                                      </div>
                                    </ScrollArea>
                                  </div>
                                ) : (
                                  /* ── Step 2: Date selection ── */
                                  <div className="flex flex-col">
                                    {/* Selected member header */}
                                    <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-br from-primary/[0.06] to-accent/[0.06] border-b border-border/70">
                                      <button type="button" onClick={()=>setPickerStep(1)} className="flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent/70 transition-colors flex-shrink-0">
                                        <ArrowLeft className="h-3 w-3"/> Change
                                      </button>
                                      <span className="h-4 w-px bg-border flex-shrink-0"/>
                                      {getSelEmp(pickerEmpId)&&(()=>{ const selEmp=getSelEmp(pickerEmpId)!; const rk=rc(rankOf(selEmp.rank)); return (
                                        <>
                                          <Avatar className="h-7 w-7 flex-shrink-0 ring-2 ring-background shadow-sm">
                                            <AvatarImage src={selEmp.photoUrl} alt={selEmp.name}/>
                                            <AvatarFallback className={cn("text-[9px] font-bold",rk.bg,rk.text)}>{selEmp.avatar}</AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-foreground leading-none truncate">{selEmp.name}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{selEmp.role||selEmp.rank}</p>
                                          </div>
                                        </>
                                      ); })()}
                                    </div>
                                    {/* Quick select presets */}
                                    <div className="px-3 pt-3 pb-2.5 border-b border-border/60">
                                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Quick select</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {[
                                          {label:"Just this day",preset:"just"},
                                          {label:"All days",preset:"all"},
                                          {label:`Every ${WEEKDAY_NAME[weekdayOf(pickerKey?.split("::")[0]??"")]}`,preset:"every"},
                                          {label:"Weekdays",preset:"weekdays"},
                                          {label:"Weekends",preset:"weekends"},
                                        ].map(({label,preset})=>(
                                          <button key={preset} type="button" onClick={()=>onApplyPreset(preset)}
                                            className="text-[11px] px-2.5 py-1 rounded-full border border-border/70 text-muted-foreground font-medium hover:border-accent/50 hover:bg-accent/10 hover:text-accent transition-all">
                                            {label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    {/* Date grid */}
                                    <div className="px-3 pt-2.5 pb-2">
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Select dates</p>
                                        {pickerDates.size>0&&(
                                          <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                                            {pickerDates.size} selected
                                          </span>
                                        )}
                                      </div>
                                      <div className="max-h-[152px] overflow-y-auto">
                                        <div className="grid grid-cols-7 gap-1">
                                          {schedule.scheduleDates.map((d)=>{
                                            const on=pickerDates.has(d.key), past=d.key<_todayKey;
                                            return (
                                              <button key={d.key} type="button" disabled={past} onClick={()=>onTogglePickerDate(d.key)}
                                                className={cn(
                                                  "flex flex-col items-center py-1.5 px-0.5 rounded-lg text-center transition-all border select-none",
                                                  past
                                                    ? "opacity-25 cursor-not-allowed border-transparent"
                                                    : on
                                                      ? "bg-accent text-accent-foreground border-accent shadow-sm"
                                                      : "border-border/60 text-foreground hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
                                                )}>
                                                <strong className="text-[12px] leading-none font-bold">{d.dateNum}</strong>
                                                <span className="text-[8px] leading-none mt-0.5 font-medium opacity-80">{d.dayLabel}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                    {/* Footer */}
                                    <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/70 bg-muted/20">
                                      <span className="text-[11px] text-muted-foreground font-medium">
                                        {pickerDates.size===0?"No days selected":`${pickerDates.size} day${pickerDates.size!==1?"s":""} selected`}
                                      </span>
                                      <div className="flex gap-2">
                                        <button type="button" onClick={onClosePicker}
                                          className="text-xs px-3 py-1.5 rounded-lg border border-border/70 bg-background hover:bg-muted/60 text-foreground transition-colors font-medium">
                                          Cancel
                                        </button>
                                        <button type="button" onClick={onApplyPickerAssign} disabled={pickerDates.size===0}
                                          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium shadow-sm">
                                          Assign
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          )}
                        </td>
                      );
                    }));
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
