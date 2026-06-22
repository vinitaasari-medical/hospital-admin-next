'use client';
import { DragEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, Pencil, FileSpreadsheet, Printer, GripVertical, X, Sunrise, Sun, Moon, MapPin,
  Calendar as CalendarIcon, FileText, LayoutTemplate, Send, ChevronDown, Check, Search, Undo2,
  ArrowLeft,
} from "lucide-react";
import * as XLSX from "xlsx";
import DashboardSidebar from "@/components/DashboardSidebar";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

// ===== Types (match CreateSchedule / ScheduleView) =====
interface WArea { id: string; name: string; roles: string[]; }
interface WDuty { id: string; title: string; roles: string[]; coversAreas?: boolean; areas?: WArea[]; }
interface WShift { id: string; name: string; startTime: string; endTime: string; duties: WDuty[]; }
interface ScheduleDate { key: string; dayLabel: string; dateNum: number; }
interface SavedSchedule {
  id: string;
  title: string;
  department?: string;
  startDate: string;
  endDate: string;
  shifts: WShift[];
  scheduleDates: ScheduleDate[];
  coverageEnabled: boolean;
  units: { id: string; name: string }[];
  coverage: Record<string, string[]>;
  status: "Published" | "Draft";
  assignments: Record<string, string>;
  createdAt?: string;
  activeDays?: string[];
}

interface Leaf { id: string; label: string; areaName?: string; }
const dutyLeaves = (d: WDuty): Leaf[] => {
  if (d.coversAreas && d.areas && d.areas.length > 0) {
    const out: Leaf[] = [];
    d.areas.forEach((a) => {
      if (a.roles.length === 0) out.push({ id: `${a.id}-0`, label: a.name || "—", areaName: a.name });
      else a.roles.forEach((r, i) => out.push({ id: `${a.id}-${i}`, label: r, areaName: a.name }));
    });
    return out;
  }
  if (d.roles.length === 0) return [{ id: "0", label: d.title || "Assign" }];
  return d.roles.map((r, i) => ({ id: String(i), label: r }));
};
const dutyLeafCount = (d: WDuty) => dutyLeaves(d).length;

// ===== Staff pool =====
type StaffRole = "Resident" | "Consultant" | "Assistant Consultant" | "Junior";
interface Employee { id: string; name: string; avatar: string; photoUrl: string; role: StaffRole; }
const STAFF_ROLES: StaffRole[] = ["Resident", "Assistant Consultant", "Consultant", "Junior"];
const ROLE_SHORT: Record<StaffRole, string> = {
  Resident: "RES", Consultant: "CON", "Assistant Consultant": "AST", Junior: "JNR",
};
const ROLE_COLORS: Record<StaffRole, { bg: string; text: string; border: string; dot: string }> = {
  Resident: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-400" },
  Consultant: { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-400" },
  "Assistant Consultant": { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-400" },
  Junior: { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-400" },
};
const employees: Employee[] = [
  { id: "e1", name: "Dr. Amina Hassan", avatar: "AH", photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face", role: "Consultant" },
  { id: "e2", name: "James O'Brien", avatar: "JO", photoUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face", role: "Resident" },
  { id: "e3", name: "Maria Santos", avatar: "MS", photoUrl: "https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=150&h=150&fit=crop&crop=face", role: "Assistant Consultant" },
  { id: "e4", name: "Chen Wei", avatar: "CW", photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&h=150&fit=crop&crop=face", role: "Junior" },
  { id: "e5", name: "Dr. Robert Kim", avatar: "RK", photoUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&h=150&fit=crop&crop=face", role: "Consultant" },
  { id: "e6", name: "Sarah Johnson", avatar: "SJ", photoUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150&h=150&fit=crop&crop=face", role: "Resident" },
  { id: "e7", name: "David Park", avatar: "DP", photoUrl: "https://images.unsplash.com/photo-1618498082410-b4aa22193b38?w=150&h=150&fit=crop&crop=face", role: "Junior" },
  { id: "e8", name: "Lisa Chen", avatar: "LC", photoUrl: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=150&h=150&fit=crop&crop=face", role: "Assistant Consultant" },
  { id: "e9", name: "Dr. Omar Farouk", avatar: "OF", photoUrl: "https://images.unsplash.com/photo-1612531386530-97286d97c2d2?w=150&h=150&fit=crop&crop=face", role: "Consultant" },
  { id: "e10", name: "Dr. Elena Rossi", avatar: "ER", photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face", role: "Consultant" },
  { id: "e11", name: "Priya Patel", avatar: "PP", photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face", role: "Assistant Consultant" },
  { id: "e12", name: "Mohammed Ali", avatar: "MA", photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&h=150&fit=crop&crop=face", role: "Assistant Consultant" },
  { id: "e13", name: "Hannah Becker", avatar: "HB", photoUrl: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150&h=150&fit=crop&crop=face", role: "Resident" },
  { id: "e14", name: "Tariq Aziz", avatar: "TA", photoUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&h=150&fit=crop&crop=face", role: "Resident" },
  { id: "e15", name: "Yuki Tanaka", avatar: "YT", photoUrl: "https://images.unsplash.com/photo-1594824476967-48c8b964ac31?w=150&h=150&fit=crop&crop=face", role: "Resident" },
  { id: "e16", name: "Noah Williams", avatar: "NW", photoUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face", role: "Junior" },
  { id: "e17", name: "Aisha Khan", avatar: "AK", photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face", role: "Junior" },
  { id: "e18", name: "Lucas Müller", avatar: "LM", photoUrl: "https://images.unsplash.com/photo-1618498082410-b4aa22193b38?w=150&h=150&fit=crop&crop=face", role: "Junior" },
];

const SHIFT_PALETTE = [
  { headerBg: "bg-gradient-to-b from-blue-50 to-blue-100/60", text: "text-blue-700", cellBg: "bg-blue-50/30", border: "border-blue-200", dutyText: "text-blue-700", dot: "bg-blue-500" },
  { headerBg: "bg-gradient-to-b from-emerald-50 to-emerald-100/60", text: "text-emerald-700", cellBg: "bg-emerald-50/30", border: "border-emerald-200", dutyText: "text-emerald-700", dot: "bg-emerald-500" },
  { headerBg: "bg-gradient-to-b from-orange-50 to-orange-100/60", text: "text-orange-700", cellBg: "bg-orange-50/30", border: "border-orange-200", dutyText: "text-orange-700", dot: "bg-orange-500" },
  { headerBg: "bg-gradient-to-b from-violet-50 to-violet-100/60", text: "text-violet-700", cellBg: "bg-violet-50/30", border: "border-violet-200", dutyText: "text-violet-700", dot: "bg-violet-500" },
];

const to12h = (t: string) => {
  if (!t) return "--:--";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr); const m = mStr ?? "00";
  if (Number.isNaN(h)) return "--:--";
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
};
const shiftIcon = (start: string) => {
  const h = Number((start || "08").split(":")[0]);
  if (h >= 5 && h < 12) return Sunrise;
  if (h >= 12 && h < 18) return Sun;
  return Moon;
};
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"]; const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ON_CALL_LABELS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"];
const onCallLabel = (i: number) => `${ON_CALL_LABELS[i] ?? `${i + 1}th`} On Call`;

interface MonthSeg { key: string; label: string; range: string; dates: ScheduleDate[]; }
const monthSegments = (dates: ScheduleDate[]): MonthSeg[] => {
  const map = new Map<string, ScheduleDate[]>();
  dates.forEach((d) => {
    const [y, m] = d.key.split("-");
    const k = `${y}-${m}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(d);
  });
  const out: MonthSeg[] = [];
  Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([k, arr]) => {
      const [, m] = k.split("-");
      const monthIdx = Number(m) - 1;
      const nums = arr.map((d) => d.dateNum).sort((a, b) => a - b);
      const range = `${ordinal(nums[0])} - ${ordinal(nums[nums.length - 1])}`;
      out.push({ key: k, label: MONTH_LONG[monthIdx], range, dates: arr });
    });
  return out;
};

interface OnDutyProps {
  embedded?: boolean;
  department?: string;
  /** Where to navigate after create/edit. Defaults to /admin/scheduling. */
  returnPath?: string;
}

const OnDutyScheduling = ({ embedded = false, department: deptProp, returnPath: returnPathProp }: OnDutyProps = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const department = deptProp ?? searchParams.get("department") ?? undefined;
  const returnPath = returnPathProp ?? searchParams.get("from") ?? undefined;
  const urlActiveId = searchParams.get("active");
  const { toast } = useToast();
  const sidebarMargin = useSidebarMargin();
  const isMobile = useIsMobile();
  const [staffOpen, setStaffOpen] = useState(false);
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [activeId, setActiveId] = useState<string | null>(urlActiveId);
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"shift" | "employee">("shift");
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pickerKey, setPickerKey] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerSelectedEmp, setPickerSelectedEmp] = useState<string | null>(null);
  const [pickerDates, setPickerDates] = useState<Set<string>>(new Set());
  const [openPickerCellKey, setOpenPickerCellKey] = useState<string | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherFilter, setSwitcherFilter] = useState<"all" | "live" | "draft">("all");
  const [switcherQuery, setSwitcherQuery] = useState("");
  const [templateFilter, setTemplateFilter] = useState<"all" | "live" | "draft">("all");
  const [templateQuery, setTemplateQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmAction, setConfirmAction] = useState<null | "publish" | "unpublish">(null);

  // Search tokens (AND across whitespace-separated terms)
  const searchTokens = useMemo(
    () => searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [searchQuery],
  );
  const isSearching = searchTokens.length > 0;
  const matchesCell = (parts: (string | undefined)[]) => {
    if (!isSearching) return true;
    // Each field is split into word tokens. A search term matches a field if:
    //   - it equals one of the field's words (exact word match), OR
    //   - the term is 3+ chars AND is a prefix of one of the words.
    // This prevents short queries like "ER" from leaking into words such as
    // "Emergency" or "Resident" via prefix matching, so an area search only
    // surfaces the exact area.
    const words = parts
      .filter(Boolean)
      .flatMap((p) => String(p).toLowerCase().split(/[^a-z0-9]+/))
      .filter(Boolean);
    return searchTokens.every((t) =>
      words.some((w) => w === t || (t.length >= 3 && w.startsWith(t))),
    );
  };

  

  const loadSchedules = () => {
    try {
      const raw: SavedSchedule[] = JSON.parse(localStorage.getItem("mc.schedules") || "[]");
      const list = department ? raw.filter((s) => (s.department || "") === department) : raw;
      setSchedules(list);
      if (list.length && !activeId) {
        const live = list.find((s) => s.status === "Published") || list[0];
        setActiveId(live.id);
      }
    } catch { setSchedules([]); }
  };
  useEffect(() => { loadSchedules(); /* eslint-disable-next-line */ }, [department]);

  const schedule = useMemo(
    () => schedules.find((s) => s.id === activeId) || schedules[0] || null,
    [schedules, activeId],
  );

  const months = useMemo(() => (schedule ? monthSegments(schedule.scheduleDates) : []), [schedule]);
  useEffect(() => {
    if (!months.length) { setActiveMonthKey(null); return; }
    if (!activeMonthKey || !months.some((m) => m.key === activeMonthKey)) {
      setActiveMonthKey(months[0].key);
    }
  }, [months, activeMonthKey]);

  const visibleDates = useMemo(() => {
    if (!schedule) return [];
    const seg = months.find((m) => m.key === activeMonthKey);
    return seg ? seg.dates : schedule.scheduleDates;
  }, [schedule, months, activeMonthKey]);

  const employeesByRole = useMemo(() => {
    const m: Record<StaffRole, Employee[]> = { Resident: [], Consultant: [], "Assistant Consultant": [], Junior: [] };
    employees.forEach((e) => m[e.role].push(e));
    return m;
  }, []);

  const getEmp = (eid?: string) => employees.find((e) => e.id === eid);
  const cellKey = (dateKey: string, dutyId: string, leafId: string | number) => `${dateKey}::${dutyId}::${leafId}`;

  // Compute which (shift,duty,leaf) columns should be visible under the current search.
  // A column is visible if its own attributes (shift/duty/area/role) match the search,
  // or if any assigned employee in that column matches.
  const visibleLeafSet = useMemo(() => {
    const set = new Set<string>();
    if (!schedule || !isSearching) return set;
    schedule.shifts.forEach((sh) => {
      sh.duties.forEach((d) => {
        dutyLeaves(d).forEach((lf) => {
          const key = `${sh.id}::${d.id}::${lf.id}`;
          if (matchesCell([d.title, lf.label, lf.areaName, sh.name])) {
            set.add(key);
            return;
          }
          for (const date of visibleDates) {
            const ck = cellKey(date.key, d.id, lf.id);
            const emp = getEmp(schedule.assignments[ck]);
            if (emp && matchesCell([emp.name, emp.role, d.title, lf.label, lf.areaName, sh.name])) {
              set.add(key);
              return;
            }
          }
        });
      });
    });
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, isSearching, searchTokens, visibleDates]);

  const isLeafVisible = (sh: WShift, d: WDuty, lf: Leaf) =>
    !isSearching || visibleLeafSet.has(`${sh.id}::${d.id}::${lf.id}`);
  const visibleDutyLeaves = (sh: WShift, d: WDuty) =>
    dutyLeaves(d).filter((lf) => isLeafVisible(sh, d, lf));
  const visibleDutyLeafCount = (sh: WShift, d: WDuty) => visibleDutyLeaves(sh, d).length;
  const visibleShiftLeafCount = (sh: WShift) =>
    sh.duties.reduce((n, d) => n + visibleDutyLeafCount(sh, d), 0);

  // ===== By-Employee aggregation: empId -> dateKey -> chips[] =====
  interface EmpChip { key: string; shiftIdx: number; shiftName: string; shiftLetter: string; dutyTitle: string; leafLabel: string; areaName?: string; }
  const assignmentsByEmpDate = useMemo(() => {
    const out: Record<string, Record<string, EmpChip[]>> = {};
    if (!schedule) return out;
    schedule.shifts.forEach((s, sIdx) => {
      const letter = (s.name || "?").trim().charAt(0).toUpperCase();
      s.duties.forEach((d) => {
        dutyLeaves(d).forEach((lf) => {
          visibleDates.forEach((date) => {
            const k = cellKey(date.key, d.id, lf.id);
            const empId = schedule.assignments[k];
            if (!empId) return;
            if (!out[empId]) out[empId] = {};
            if (!out[empId][date.key]) out[empId][date.key] = [];
            out[empId][date.key].push({
              key: k,
              shiftIdx: sIdx,
              shiftName: s.name,
              shiftLetter: letter,
              dutyTitle: d.title || "Duty",
              leafLabel: lf.label,
              areaName: lf.areaName,
            });
          });
        });
      });
    });
    return out;
  }, [schedule, visibleDates]);

  const employeesWithAssignments = useMemo(() => {
    const ids = new Set(Object.keys(assignmentsByEmpDate));
    return employees.filter((e) => ids.has(e.id));
  }, [assignmentsByEmpDate]);

  const persist = (next: SavedSchedule) => {
    const updated = schedules.map((s) => (s.id === next.id ? next : s));
    setSchedules(updated);
    try { localStorage.setItem("mc.schedules", JSON.stringify(updated)); } catch {}
  };

  const handleDragStart = (employeeId: string, sourceKey?: string) => (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("employeeId", employeeId);
    if (sourceKey) e.dataTransfer.setData("sourceKey", sourceKey);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDrop = (key: string) => (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragOverKey(null);
    const empId = e.dataTransfer.getData("employeeId");
    const sourceKey = e.dataTransfer.getData("sourceKey");
    if (!empId || !schedule) return;
    const next: SavedSchedule = { ...schedule, assignments: { ...schedule.assignments } };
    // Swap support: if target already has someone and source has a key, swap
    const targetCurrent = next.assignments[key];
    if (sourceKey && sourceKey !== key) {
      if (targetCurrent) next.assignments[sourceKey] = targetCurrent;
      else delete next.assignments[sourceKey];
    }
    next.assignments[key] = empId;
    persist(next);
  };
  const clearAssign = (key: string) => {
    if (!schedule) return;
    const next: SavedSchedule = { ...schedule, assignments: { ...schedule.assignments } };
    delete next.assignments[key];
    persist(next);
  };
  const assignFromPicker = (empId: string) => {
    if (!schedule || !pickerKey) return;
    const next: SavedSchedule = { ...schedule, assignments: { ...schedule.assignments, [pickerKey]: empId } };
    persist(next);
    setPickerKey(null);
    setPickerQuery("");
  };

  // ===== Duty picker helpers (used by inline AssignPopover) =====
  const applyEmpDateAssignments = (empId: string, dateKey: string, picks: string[]) => {
    if (!schedule) return;
    const next: SavedSchedule = { ...schedule, assignments: { ...schedule.assignments } };
    // Remove all existing assignments for this emp on this date
    Object.keys(next.assignments).forEach((k) => {
      if (k.startsWith(`${dateKey}::`) && next.assignments[k] === empId) {
        delete next.assignments[k];
      }
    });
    // Apply picks (overwrites whoever else is in that slot)
    picks.forEach((k) => { next.assignments[k] = empId; });
    persist(next);
  };

  // Weekday helper for local YYYY-MM-DD keys
  const weekdayOf = (dk: string) => {
    const [y, m, d] = dk.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1).getDay();
  };

  // Apply same employee to a single (dutyId, leafId) slot across multiple dates.
  // Skips dates already taken by someone else.
  const applySlotAcrossDates = (
    empId: string,
    dutyId: string,
    leafId: string | number,
    dateKeys: string[],
  ) => {
    if (!schedule) return 0;
    const next: SavedSchedule = { ...schedule, assignments: { ...schedule.assignments } };
    let skipped = 0;
    dateKeys.forEach((dk) => {
      const k = `${dk}::${dutyId}::${leafId}`;
      const taken = next.assignments[k];
      if (taken && taken !== empId) { skipped++; return; }
      next.assignments[k] = empId;
    });
    persist(next);
    return skipped;
  };

  // Replicate a set of (dutyId, leafId) picks (taken from one source date) to
  // an employee across multiple dates. Replaces that emp's prior slots on each
  // target date. Skips slots already taken by someone else.
  const applyEmpPicksAcrossDates = (
    empId: string,
    sourcePicks: string[],
    dateKeys: string[],
  ) => {
    if (!schedule) return 0;
    const next: SavedSchedule = { ...schedule, assignments: { ...schedule.assignments } };
    const suffixes = sourcePicks
      .map((k) => k.split("::").slice(1).join("::"))
      .filter(Boolean);
    let skipped = 0;
    dateKeys.forEach((dk) => {
      // Clear emp's existing slots on this date
      Object.keys(next.assignments).forEach((k) => {
        if (k.startsWith(`${dk}::`) && next.assignments[k] === empId) delete next.assignments[k];
      });
      suffixes.forEach((suf) => {
        const k = `${dk}::${suf}`;
        const taken = next.assignments[k];
        if (taken && taken !== empId) { skipped++; return; }
        next.assignments[k] = empId;
      });
    });
    persist(next);
    return skipped;
  };

  const exportToExcel = () => {
    if (!schedule) return;
    const dates = visibleDates;
    const row1: string[] = ["Date"]; const row2: string[] = [""]; const row3: string[] = [""];
    const merges: XLSX.Range[] = []; let col = 1;
    schedule.shifts.forEach((s, sIdx) => {
      const span = Math.max(s.duties.reduce((a, d) => a + dutyLeafCount(d), 0), 1);
      row1.push(`${s.name || `Shift ${sIdx + 1}`}  ${to12h(s.startTime)} - ${to12h(s.endTime)}`);
      for (let i = 1; i < span; i++) row1.push("");
      if (span > 1) merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + span - 1 } });
      if (s.duties.length === 0) { row2.push("—"); row3.push(""); }
      else {
        let dCol = col;
        s.duties.forEach((d, dIdx) => {
          const leaves = dutyLeaves(d); const dSpan = leaves.length;
          row2.push(d.title || `Duty ${dIdx + 1}`);
          for (let i = 1; i < dSpan; i++) row2.push("");
          leaves.forEach((lf) => row3.push(lf.areaName ? `${lf.areaName} · ${lf.label}` : lf.label));
          if (dSpan > 1) merges.push({ s: { r: 1, c: dCol }, e: { r: 1, c: dCol + dSpan - 1 } });
          dCol += dSpan;
        });
      }
      col += span;
    });
    merges.push({ s: { r: 0, c: 0 }, e: { r: 2, c: 0 } });
    const body = dates.map((dt) => {
      const r: string[] = [`${dt.dateNum} ${dt.dayLabel}`];
      schedule.shifts.forEach((s) => {
        if (s.duties.length === 0) { r.push(""); return; }
        s.duties.forEach((d) => dutyLeaves(d).forEach((lf) => {
          const empId = schedule.assignments[`${dt.key}::${d.id}::${lf.id}`];
          const emp = getEmp(empId);
          r.push(emp ? emp.name : "");
        }));
      });
      return r;
    });
    const ws = XLSX.utils.aoa_to_sheet([row1, row2, row3, ...body]);
    ws["!merges"] = merges; ws["!cols"] = row1.map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Schedule");
    XLSX.writeFile(wb, `${(schedule.title || "schedule").replace(/\s+/g, "_")}.xlsx`);
    toast({ title: "Exported", description: "Excel file downloaded." });
  };

  const buildExtra = () => {
    const parts: string[] = [];
    if (department) parts.push(`department=${encodeURIComponent(department)}`);
    if (returnPath) parts.push(`from=${encodeURIComponent(returnPath)}`);
    return parts.length ? `&${parts.join("&")}` : "";
  };
  const buildCreate = (base: string) => {
    const extra = buildExtra();
    if (!extra) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}${extra.slice(1)}`;
  };
  const onCreateNew = () => router.push(buildCreate("/admin/scheduling/create"));
  const onEditSetup = () => {
    if (!schedule) return;
    try { localStorage.setItem("mc.editScheduleId", schedule.id); } catch {}
    router.push(buildCreate(`/admin/scheduling/create?edit=${schedule.id}`));
  };
  const togglePublish = (publish: boolean) => {
    if (!schedule) return;
    const next: SavedSchedule = { ...schedule, status: publish ? "Published" : "Draft" };
    persist(next);
    toast({
      title: publish ? "Schedule published" : "Schedule unpublished",
      description: publish ? "Staff will see this schedule." : "Reverted to draft.",
    });
  };

  // The "anchor" is the LAST day already in the table — the new range starts from it.
  const extendStart = useMemo(() => {
    if (!schedule) return undefined;
    const [y, m, d] = schedule.endDate.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }, [schedule]);
  const [extendEnd, setExtendEnd] = useState<Date | undefined>(undefined);

  const fmtLocal = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const onExtend = () => {
    if (!schedule || !extendStart || !extendEnd) return;
    if (extendEnd <= extendStart) {
      toast({ title: "Pick a later date", description: "End date must be after the current end." });
      return;
    }
    const map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const inferred = Array.from(new Set(schedule.scheduleDates.map((d) => {
      const [yy, mm, dd] = d.key.split("-").map(Number);
      const dt = new Date(yy, (mm || 1) - 1, dd || 1); return map[dt.getDay()];
    })));
    const active = schedule.activeDays?.length ? schedule.activeDays : inferred;
    // Begin the day AFTER the existing last day (anchor stays in the table).
    const cur = new Date(extendStart); cur.setDate(cur.getDate() + 1);
    const newDates: ScheduleDate[] = [];
    let guard = 0;
    while (cur <= extendEnd && guard < 400) {
      const dk = map[cur.getDay()];
      if (active.includes(dk)) {
        newDates.push({
          key: fmtLocal(cur),
          dayLabel: cur.toLocaleDateString(undefined, { weekday: "short" }),
          dateNum: cur.getDate(),
        });
      }
      cur.setDate(cur.getDate() + 1); guard++;
    }
    const next: SavedSchedule = {
      ...schedule,
      endDate: fmtLocal(extendEnd),
      scheduleDates: [...schedule.scheduleDates, ...newDates],
    };
    persist(next);
    setExtendOpen(false); setExtendEnd(undefined);
    toast({ title: "Schedule extended", description: `${newDates.length} new date(s) added.` });
  };

  if (!schedules.length) {
    const empty = (
      <div className="max-w-3xl mx-auto p-12 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <CalendarIcon className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">No on-duty schedule yet</h1>
        <p className="text-muted-foreground mt-2 mb-6">Add your first schedule to begin assigning staff.</p>
        <Button onClick={onCreateNew} className="gap-2"><Plus className="h-4 w-4" /> Add new schedule</Button>
      </div>
    );
    if (embedded) {
      return <div className="rounded-xl bg-card shadow-card border border-border/50">{empty}</div>;
    }
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar items={adminSidebarItems} />
        <main className={cn("flex-1 transition-all duration-300", sidebarMargin)}>{empty}</main>
      </div>
    );
  }

  if (!schedule) return null;

  const dept = schedule.department || "Audiology";
  const isLive = schedule.status === "Published";

  // Inline popover for assigning duties to a specific employee on a specific date.
  // Renders Shift -> "First/Second/... On Call" columns -> role checkboxes.
  const AssignPopover = ({ emp, date, children }: { emp: Employee; date: ScheduleDate; children: React.ReactNode }) => {
    const cellId = `${emp.id}::${date.key}`;
    const isOpen = openPickerCellKey === cellId;
    // Currently assigned slot keys for this emp+date
    const currentKeys = useMemo(() => {
      const out: string[] = [];
      Object.entries(schedule.assignments).forEach(([k, v]) => {
        if (v === emp.id && k.startsWith(`${date.key}::`)) out.push(k);
      });
      return out;
    }, [emp.id, date.key]);
    const [picks, setPicks] = useState<Set<string>>(() => new Set(currentKeys));
    const [applyDates, setApplyDates] = useState<Set<string>>(() => new Set([date.key]));
    // Reset picks/dates when popover (re)opens
    useEffect(() => {
      if (isOpen) {
        setPicks(new Set(currentKeys));
        setApplyDates(new Set([date.key]));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const toggle = (k: string) => {
      setPicks((prev) => {
        const next = new Set(prev);
        if (next.has(k)) next.delete(k); else next.add(k);
        return next;
      });
    };
    const toggleDate = (dk: string) => {
      setApplyDates((prev) => {
        const n = new Set(prev);
        if (n.has(dk)) n.delete(dk); else n.add(dk);
        return n;
      });
    };
    const sourceDow = weekdayOf(date.key);
    const allKeys = visibleDates.map((dt) => dt.key);

    return (
      <Popover open={isOpen} onOpenChange={(o) => setOpenPickerCellKey(o ? cellId : null)}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="w-[640px] max-w-[92vw] p-0 flex flex-col max-h-[min(85vh,640px)] overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={emp.photoUrl} alt={emp.name} />
                <AvatarFallback className={cn("text-[9px] font-bold", ROLE_COLORS[emp.role].bg, ROLE_COLORS[emp.role].text)}>
                  {emp.avatar}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate leading-tight">{emp.name}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{emp.role} • {date.dayLabel} {date.dateNum}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {schedule.shifts.map((sh, sIdx) => {
              const sc = SHIFT_PALETTE[sIdx % SHIFT_PALETTE.length];
              const letter = (sh.name || "?").trim().charAt(0).toUpperCase();
              return (
                <div key={sh.id} className={cn("rounded-lg border overflow-hidden", sc.border)}>
                  <div className={cn("px-3 py-2 flex items-center gap-2", sc.cellBg)}>
                    <span className={cn("inline-block h-2 w-2 rounded-full", sc.dot)} />
                    <span className={cn("text-sm font-bold", sc.dutyText)}>
                      {sh.name || `Shift ${sIdx + 1}`} ({letter})
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {to12h(sh.startTime)} – {to12h(sh.endTime)}
                    </span>
                  </div>
                  {sh.duties.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground">No duties configured.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border bg-card">
                      {sh.duties.map((d, dIdx) => {
                        const leaves = dutyLeaves(d);
                        const hasAreas = !!(d.coversAreas && d.areas && d.areas.length);
                        const isOpenDuty = !hasAreas && d.roles.length === 0;
                        return (
                          <div key={d.id} className="p-3 min-w-0">
                            <p className="text-xs font-bold text-foreground mb-2 truncate" title={d.title}>
                              {d.title || onCallLabel(dIdx)}
                            </p>
                            <div className="space-y-1.5">
                              {leaves.map((lf) => {
                                const slotKey = cellKey(date.key, d.id, lf.id);
                                const taken = schedule.assignments[slotKey];
                                const takenByOther = !!taken && taken !== emp.id;
                                const disabled = takenByOther;
                                const checked = picks.has(slotKey);
                                return (
                                  <label
                                    key={lf.id}
                                    className={cn(
                                      "flex items-start gap-2 px-2 py-1.5 rounded-md border text-xs transition cursor-pointer select-none",
                                      checked
                                        ? "bg-primary/10 border-primary/40"
                                        : "bg-card border-border/60 hover:bg-muted/50",
                                      disabled && "opacity-50 cursor-not-allowed hover:bg-card",
                                    )}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      disabled={disabled}
                                      onCheckedChange={() => !disabled && toggle(slotKey)}
                                      className="mt-0.5"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-foreground leading-tight truncate">
                                        {lf.label}
                                      </p>
                                      {lf.areaName && (
                                        <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                                          <MapPin className="h-2 w-2 flex-shrink-0" /> {lf.areaName}
                                        </p>
                                      )}
                                      {takenByOther && (
                                        <p className="text-[10px] text-amber-600 truncate">
                                          Taken by {getEmp(taken)?.name}
                                        </p>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-4 py-2 border-t border-border bg-muted/10 flex-shrink-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Apply to</p>
              <span className="text-[10px] text-muted-foreground">{applyDates.size} day{applyDates.size === 1 ? "" : "s"}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              <button type="button" onClick={() => setApplyDates(new Set([date.key]))} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">Just this day</button>
              <button type="button" onClick={() => setApplyDates(new Set(allKeys))} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">All days</button>
              <button type="button" onClick={() => setApplyDates(new Set(allKeys.filter((dk) => weekdayOf(dk) === sourceDow)))} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">Every {date.dayLabel}</button>
              <button type="button" onClick={() => setApplyDates(new Set(allKeys.filter((dk) => { const w = weekdayOf(dk); return w >= 1 && w <= 5; })))} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">Weekdays</button>
              <button type="button" onClick={() => setApplyDates(new Set(allKeys.filter((dk) => { const w = weekdayOf(dk); return w === 0 || w === 6; })))} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">Weekends</button>
            </div>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {visibleDates.map((dt) => {
                const active = applyDates.has(dt.key);
                return (
                  <button
                    key={dt.key}
                    type="button"
                    onClick={() => toggleDate(dt.key)}
                    className={cn(
                      "text-[10px] px-1.5 py-1 rounded-md border min-w-[34px] flex flex-col items-center leading-none transition",
                      active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-muted",
                    )}
                  >
                    <span className="font-bold text-[11px]">{dt.dateNum}</span>
                    <span className="opacity-70 mt-0.5">{dt.dayLabel.slice(0, 2)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2 bg-muted/20 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setOpenPickerCellKey(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={applyDates.size === 0}
              onClick={() => {
                const targets = Array.from(applyDates);
                // Always update the source date with the current picks (handles unchecks)
                applyEmpDateAssignments(emp.id, date.key, Array.from(picks));
                // For other dates, replicate the picked slots (don't clear if no picks)
                const others = targets.filter((dk) => dk !== date.key);
                if (others.length > 0 && picks.size > 0) {
                  applyEmpPicksAcrossDates(emp.id, Array.from(picks), others);
                }
                setOpenPickerCellKey(null);
                toast({
                  title: "Saved",
                  description: `${emp.name} → ${targets.length} day${targets.length === 1 ? "" : "s"}.`,
                });
              }}
            >
              Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };


  const body = (
    <>
        <div className={cn(embedded ? "space-y-4 sm:space-y-5" : "max-w-[1600px] mx-auto p-3 pt-16 sm:p-6 lg:pt-6 space-y-4 sm:space-y-5")}>
          {returnPath && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(returnPath)}
              className="gap-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {/* ===== Header ===== */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words">{schedule.title}</h1>
                {isLive ? (
                  <Badge className="gap-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live now
                  </Badge>
                ) : (
                  <Badge variant="secondary">Draft</Badge>
                )}
                {schedules.length > 1 && (() => {
                  const filtered = schedules.filter((s) => {
                    if (switcherFilter === "live" && s.status !== "Published") return false;
                    if (switcherFilter === "draft" && s.status === "Published") return false;
                    const q = switcherQuery.trim().toLowerCase();
                    return !q || s.title.toLowerCase().includes(q);
                  });
                  const liveCount = schedules.filter((s) => s.status === "Published").length;
                  const draftCount = schedules.length - liveCount;
                  return (
                    <Popover open={switcherOpen} onOpenChange={setSwitcherOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 w-[160px] sm:w-[220px] justify-between text-xs font-normal gap-2">
                          <span className="flex items-center gap-2 min-w-0">
                            <span className={cn("inline-block h-1.5 w-1.5 rounded-full flex-shrink-0", schedule.status === "Published" ? "bg-emerald-500" : "bg-amber-500")} />
                            <span className="truncate">{schedule.title}</span>
                          </span>
                          <ChevronDown className="h-3.5 w-3.5 opacity-60 flex-shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] sm:w-[320px] max-w-[92vw] p-0" align="start">
                        <div className="p-2 border-b border-border space-y-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input value={switcherQuery} onChange={(e) => setSwitcherQuery(e.target.value)} placeholder="Search schedules..." className="h-8 pl-7 text-xs" />
                          </div>
                          <Tabs value={switcherFilter} onValueChange={(v) => setSwitcherFilter(v as "all" | "live" | "draft")}>
                            <TabsList className="grid grid-cols-3 h-8 w-full bg-muted/50">
                              <TabsTrigger value="all" className="text-[11px]">All ({schedules.length})</TabsTrigger>
                              <TabsTrigger value="live" className="text-[11px]">Live ({liveCount})</TabsTrigger>
                              <TabsTrigger value="draft" className="text-[11px]">Draft ({draftCount})</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                        <ScrollArea className="max-h-72">
                          <div className="p-1">
                            {filtered.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-4">No schedules found.</p>
                            )}
                            {filtered.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => { setActiveId(s.id); setActiveMonthKey(null); setSwitcherOpen(false); }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition hover:bg-muted/60",
                                  s.id === schedule.id && "bg-muted/80",
                                )}
                              >
                                <Check className={cn("h-3.5 w-3.5 flex-shrink-0", s.id === schedule.id ? "opacity-100" : "opacity-0")} />
                                <span className={cn("inline-block h-1.5 w-1.5 rounded-full flex-shrink-0", s.status === "Published" ? "bg-emerald-500" : "bg-amber-500")} />
                                <span className="text-xs truncate flex-1">{s.title}</span>
                                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border", s.status === "Published" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                                  {s.status === "Published" ? "Live" : "Draft"}
                                </span>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  );
                })()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Departments &gt; {dept}</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {isMobile && (
                <Sheet open={staffOpen} onOpenChange={setStaffOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Users className="h-4 w-4" /> Staff
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[88vw] sm:max-w-sm p-0 flex flex-col">
                    <SheetHeader className="p-3 border-b">
                      <SheetTitle className="text-sm">Staff Pool</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="flex-1">
                      <div className="p-2 space-y-3">
                        {STAFF_ROLES.map((role) => {
                          const list = employeesByRole[role];
                          if (!list?.length) return null;
                          const rc = ROLE_COLORS[role];
                          return (
                            <div key={role}>
                              <div className="flex items-center gap-1.5 mb-1.5 px-1">
                                <div className={cn("h-2 w-2 rounded-full border", rc.dot, rc.border)} />
                                <span className={cn("text-[10px] font-bold uppercase tracking-wider", rc.text)}>{role}</span>
                                <span className="text-[9px] text-muted-foreground ml-auto">{list.length}</span>
                              </div>
                              <div className="space-y-1">
                                {list.map((emp) => (
                                  <div key={emp.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border border-border/50">
                                    <Avatar className="h-6 w-6 flex-shrink-0">
                                      <AvatarImage src={emp.photoUrl} alt={emp.name} />
                                      <AvatarFallback className={cn("text-[9px] font-bold", rc.bg, rc.text)}>{emp.avatar}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-[11px] font-medium text-foreground truncate flex-1">{emp.name}</span>
                                    <span className={cn("text-[8px] font-semibold px-1 py-0 rounded border flex-shrink-0", rc.bg, rc.text, rc.border)}>
                                      {ROLE_SHORT[role]}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              )}
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
                <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print Table</span>
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-1.5">
                <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">Export Excel</span>
              </Button>
              <Button variant="outline" size="sm" onClick={onEditSetup} className="gap-1.5">
                <Pencil className="h-4 w-4" /> <span className="hidden sm:inline">Edit</span>
              </Button>
              {schedule.status === "Published" ? (
                <Button variant="secondary" size="sm" onClick={() => setConfirmAction("unpublish")} className="gap-1.5">
                  <Undo2 className="h-4 w-4" /> <span className="hidden sm:inline">Unpublish</span>
                </Button>
              ) : (
                <Button size="sm" onClick={() => setConfirmAction("publish")} className="gap-1.5">
                  <Send className="h-4 w-4" /> <span className="hidden sm:inline">Publish</span>
                </Button>
              )}
            </div>
          </div>

          <AlertDialog open={confirmAction !== null} onOpenChange={(o) => !o && setConfirmAction(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {confirmAction === "publish" ? "Confirm Publish Schedule?" : "Warning!"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmAction === "publish" && "You're about to publish this schedule. Staff will be notified and able to view their assignments. Do you want to proceed?"}
                  {confirmAction === "unpublish" && "Unpublishing will hide this schedule from staff and revert it to draft. Do you want to proceed?"}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={cn(
                    confirmAction === "unpublish" &&
                      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                  )}
                  onClick={() => {
                    const action = confirmAction;
                    setConfirmAction(null);
                    if (action === "publish") togglePublish(true);
                    else if (action === "unpublish") togglePublish(false);
                  }}
                >
                  {confirmAction === "publish" ? "Proceed" : "Proceed Anyway"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* ===== Months row + add CTA ===== */}
          <div className="flex items-center gap-2 flex-wrap">
            {months.map((m) => {
              const active = m.key === activeMonthKey;
              return (
                <button
                  key={m.key}
                  onClick={() => setActiveMonthKey(m.key)}
                  className={cn(
                    "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border text-center min-w-[80px] sm:min-w-[96px] transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-muted/50",
                  )}
                >
                  <div className={cn("text-sm font-semibold", active ? "" : "text-foreground")}>{m.label}</div>
                  <div className={cn("text-[11px]", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{m.range}</div>
                </button>
              );
            })}
            <div className="relative">
              <Popover open={addOpen} onOpenChange={setAddOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="h-11 w-11 rounded-full border border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition flex items-center justify-center"
                    aria-label="Add"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" side="bottom" sideOffset={8} className="w-80 max-w-[92vw] p-2">
                  <button
                    onClick={() => { setAddOpen(false); setExtendOpen(true); }}
                    className="w-full text-left px-3 py-2.5 rounded-md hover:bg-muted/60 transition"
                  >
                    <div className="text-sm font-semibold text-foreground">Extend existing schedule</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Apply the current schedule's setup to new dates.</div>
                  </button>
                  <button
                    onClick={() => { setAddOpen(false); onCreateNew(); }}
                    className="w-full text-left px-3 py-2.5 rounded-md bg-primary/5 hover:bg-primary/10 transition"
                  >
                    <div className="text-sm font-semibold text-foreground">Add new schedule</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Define a new schedule setup for a new date range.</div>
                  </button>
                  <button
                    onClick={() => { setAddOpen(false); setTemplateOpen(true); }}
                    className="w-full text-left px-3 py-2.5 rounded-md hover:bg-muted/60 transition"
                  >
                    <div className="text-sm font-semibold text-foreground">Select from template</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Choose from preconfigured schedule templates.</div>
                  </button>
                </PopoverContent>
              </Popover>

              {/* Extend popover anchored under the + button */}
              <Popover open={extendOpen} onOpenChange={(o) => { setExtendOpen(o); if (!o) setExtendEnd(undefined); }}>
                <PopoverTrigger asChild>
                  <span className="absolute inset-0 pointer-events-none" aria-hidden />
                </PopoverTrigger>
                <PopoverContent align="start" side="bottom" sideOffset={8} className="w-[360px] max-w-[92vw] p-3">
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-foreground">Extend Duty from</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pick the new end date. Continues from {schedule.endDate}.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={extendEnd}
                      onSelect={(d) => setExtendEnd(d && extendStart && d > extendStart ? d : undefined)}
                      defaultMonth={extendStart}
                      disabled={(d) => !!extendStart && d <= extendStart}
                      modifiers={{
                        anchor: extendStart ? [extendStart] : [],
                        inRange: (d) => !!extendStart && !!extendEnd && d > extendStart && d < extendEnd,
                      }}
                      modifiersClassNames={{
                        anchor: "bg-foreground text-background hover:bg-foreground hover:text-background rounded-md font-bold",
                        inRange: "bg-primary/80 text-primary-foreground rounded-none",
                      }}
                      numberOfMonths={1}
                      className={cn("p-2 pointer-events-auto")}
                    />
                  </div>
                  {extendEnd && (
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      To <span className="font-semibold text-foreground">{extendEnd.toLocaleDateString()}</span>
                    </p>
                  )}
                  <div className="flex justify-end gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={() => { setExtendOpen(false); setExtendEnd(undefined); }}>Cancel</Button>
                    <Button size="sm" onClick={onExtend} disabled={!extendEnd}>Extend</Button>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Template popover anchored under the + button */}
              <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
                <PopoverTrigger asChild>
                  <span className="absolute inset-0 pointer-events-none" aria-hidden />
                </PopoverTrigger>
                <PopoverContent align="start" side="bottom" sideOffset={8} className="w-[420px] max-w-[92vw] p-3">
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-foreground">Select from template</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pick a previously saved schedule.</p>
                  </div>
                  {(() => {
                  const liveCount = schedules.filter((s) => s.status === "Published").length;
                  const draftCount = schedules.length - liveCount;
                  const filtered = schedules.filter((s) => {
                    if (templateFilter === "live" && s.status !== "Published") return false;
                    if (templateFilter === "draft" && s.status === "Published") return false;
                    const q = templateQuery.trim().toLowerCase();
                    return !q || s.title.toLowerCase().includes(q);
                  });
                  return (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input value={templateQuery} onChange={(e) => setTemplateQuery(e.target.value)} placeholder="Search templates..." className="h-9 pl-8 text-sm" />
                        </div>
                        <Tabs value={templateFilter} onValueChange={(v) => setTemplateFilter(v as "all" | "live" | "draft")}>
                          <TabsList className="grid grid-cols-3 w-full bg-muted/50">
                            <TabsTrigger value="all" className="text-xs">All ({schedules.length})</TabsTrigger>
                            <TabsTrigger value="live" className="text-xs">Live ({liveCount})</TabsTrigger>
                            <TabsTrigger value="draft" className="text-xs">Draft ({draftCount})</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>
                      <div className="space-y-2 max-h-[320px] overflow-y-auto">
                        {schedules.length === 0 && <p className="text-sm text-muted-foreground">No templates available.</p>}
                        {schedules.length > 0 && filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No templates match.</p>}
                        {filtered.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setTemplateOpen(false);
                              router.push(buildCreate(`/admin/scheduling/create?template=${s.id}`));
                            }}
                            className="w-full text-left px-3 py-2.5 rounded-md border border-border hover:bg-muted/50 transition"
                          >
                            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                              <LayoutTemplate className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="truncate">{s.title}</span>
                              <span className={cn("ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border", s.status === "Published" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                                {s.status === "Published" ? "Live" : "Draft"}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{s.startDate} → {s.endDate}</div>
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => setTemplateOpen(false)}>Close</Button>
                      </div>
                    </div>
                  );
                })()}
              </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* ===== View toggle + Smart search ===== */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "shift" | "employee")}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="shift">By Shift</TabsTrigger>
                <TabsTrigger value="employee">By Employee</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1 max-w-xl">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, role, duty, area, or shift… (e.g. 'Amina ICU' or 'Consultant ER')"
                  className="pl-9 pr-9 h-9 text-sm bg-card"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
              {isSearching && (
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  Filtering • {searchTokens.length} {searchTokens.length === 1 ? "term" : "terms"}
                </Badge>
              )}
            </div>
          </div>

          {/* ===== Body: staff pool LEFT + grid RIGHT ===== */}
          <div className="flex gap-4">
            {/* Staff Pool */}
            <div className="hidden lg:block w-[260px] flex-shrink-0">
              <div className="rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden sticky top-6">
                <div className="p-3 border-b border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Staff Pool</h3>
                    <span className="text-[10px] text-muted-foreground">{employees.length} members</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Drag staff to assign duties</p>
                </div>
                <ScrollArea className="h-[calc(100vh-260px)]">
                  <div className="p-2 space-y-3">
                    {STAFF_ROLES.map((role) => {
                      const list = employeesByRole[role];
                      if (!list?.length) return null;
                      const rc = ROLE_COLORS[role];
                      return (
                        <div key={role}>
                          <div className="flex items-center gap-1.5 mb-1.5 px-1">
                            <div className={cn("h-2 w-2 rounded-full border", rc.dot, rc.border)} />
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider", rc.text)}>{role}</span>
                            <span className="text-[9px] text-muted-foreground ml-auto">{list.length}</span>
                          </div>
                          <div className="space-y-1">
                            {list.map((emp) => (
                              <div
                                key={emp.id}
                                draggable
                                onDragStart={handleDragStart(emp.id)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border border-border/50 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-border transition-all group"
                              >
                                <GripVertical className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                                <Avatar className="h-6 w-6 flex-shrink-0">
                                  <AvatarImage src={emp.photoUrl} alt={emp.name} />
                                  <AvatarFallback className={cn("text-[9px] font-bold", rc.bg, rc.text)}>{emp.avatar}</AvatarFallback>
                                </Avatar>
                                <span className="text-[11px] font-medium text-foreground truncate">
                                  {emp.name.split(" ").slice(-1)[0]}
                                </span>
                                <span className={cn("text-[8px] font-semibold px-1 py-0 rounded border ml-auto flex-shrink-0", rc.bg, rc.text, rc.border)}>
                                  {ROLE_SHORT[role]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Grid */}
            <Card className="flex-1 p-3 overflow-hidden">
              {viewMode === "shift" ? (
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm border-separate border-spacing-0 min-w-[1100px] bg-card">
                  <thead>
                    <tr>
                      <th rowSpan={4} className="text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-3 py-3 bg-card border-b border-r border-border w-[88px] min-w-[88px] max-w-[88px] align-middle sticky left-0 top-0 z-30">
                        Date
                      </th>
                      {schedule.shifts.map((s, sIdx) => {
                        const c = SHIFT_PALETTE[sIdx % SHIFT_PALETTE.length];
                        const Icon = shiftIcon(s.startTime);
                        const span = Math.max(s.duties.reduce((n, d) => n + dutyLeafCount(d), 0), 1);
                        return (
                          <th key={`sh-${s.id}`} colSpan={span}
                            className={cn("border-b border-r border-border px-3 py-2.5 text-center", c.headerBg)}>
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className={cn("h-2 w-2 rounded-full", c.dot)} />
                                <Icon className={cn("h-4 w-4", c.text)} />
                                <span className={cn("text-base font-bold", c.text)}>{s.name}</span>
                              </div>
                              <span className={cn("text-xs font-mono opacity-80", c.text)}>
                                {to12h(s.startTime)} – {to12h(s.endTime)}
                              </span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                    <tr>
                      {schedule.shifts.map((s, sIdx) => {
                        const c = SHIFT_PALETTE[sIdx % SHIFT_PALETTE.length];
                        if (s.duties.length === 0) {
                          return (
                            <th key={`dh-empty-${s.id}`} rowSpan={3}
                              className={cn("px-2 py-2 text-center border-b border-r border-border text-[11px] italic text-muted-foreground/70", c.headerBg)}>
                              no duties
                            </th>
                          );
                        }
                        return s.duties.map((d, dIdx) => (
                          <th key={`dh-${d.id}`} colSpan={dutyLeafCount(d)}
                            className={cn("px-2 py-2 text-center border-b border-r border-border", c.headerBg)}>
                            <span className={cn("text-sm font-semibold", c.dutyText)}>
                              {d.title || `Duty ${dIdx + 1}`}
                            </span>
                          </th>
                        ));
                      })}
                    </tr>
                    <tr>
                      {schedule.shifts.map((s, sIdx) => {
                        const c = SHIFT_PALETTE[sIdx % SHIFT_PALETTE.length];
                        if (s.duties.length === 0) return null;
                        return s.duties.map((d) => {
                          if (!d.coversAreas || !d.areas || d.areas.length === 0) {
                            const roles = d.roles.length === 0 ? [d.title || "—"] : d.roles;
                            return roles.map((r, rIdx) => (
                              <th key={`rh-${d.id}-${rIdx}`} rowSpan={2}
                                className={cn("px-2 py-2 text-center border-b border-r border-border align-middle", c.headerBg)}>
                                <span className={cn("text-xs font-medium", c.dutyText)}>{r}</span>
                              </th>
                            ));
                          }
                          return d.areas.map((a) => (
                            <th key={`ah-${a.id}`} colSpan={Math.max(a.roles.length, 1)}
                              className={cn("px-2 py-1.5 text-center border-b border-r border-border", c.headerBg)}>
                              <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", c.dutyText)}>
                                <MapPin className="h-3 w-3" />
                                {a.name}
                              </span>
                            </th>
                          ));
                        });
                      })}
                    </tr>
                    <tr>
                      {schedule.shifts.map((s, sIdx) => {
                        const c = SHIFT_PALETTE[sIdx % SHIFT_PALETTE.length];
                        if (s.duties.length === 0) return null;
                        return s.duties.map((d) => {
                          if (!d.coversAreas || !d.areas || d.areas.length === 0) return null;
                          return d.areas.map((a) => {
                            const roles = a.roles.length === 0 ? [a.name || "—"] : a.roles;
                            return roles.map((r, rIdx) => (
                              <th key={`rh-${a.id}-${rIdx}`}
                                className={cn("px-2 py-2 text-center border-b border-r border-border", c.headerBg)}>
                                <span className={cn("text-xs font-medium", c.dutyText)}>{r}</span>
                              </th>
                            ));
                          });
                        });
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDates.map((date) => (
                      <tr key={date.key}>
                        <td className="px-3 py-2 border-b border-r border-border bg-card align-top sticky left-0 z-20 w-[88px] min-w-[88px] max-w-[88px]">
                          <p className="text-xl font-bold text-foreground leading-none">{date.dateNum}</p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                            {date.dayLabel}
                          </p>
                        </td>
                        {schedule.shifts.map((s, sIdx) => {
                          const c = SHIFT_PALETTE[sIdx % SHIFT_PALETTE.length];
                          if (s.duties.length === 0) {
                            return (
                              <td key={`empty-${s.id}-${date.key}`} className={cn("border-b border-r border-border px-1 py-1 w-[140px] min-w-[140px] max-w-[140px]", c.cellBg)}>
                                <div className="h-10 rounded-lg border border-dashed border-border/50 bg-muted/10" />
                              </td>
                            );
                          }
                          return s.duties.flatMap((d) =>
                            dutyLeaves(d).map((lf) => {
                              const k = cellKey(date.key, d.id, lf.id);
                              const empId = schedule.assignments[k];
                              const emp = getEmp(empId);
                              const isOver = dragOverKey === k;
                              const cellMatch = emp
                                ? matchesCell([emp.name, emp.role, d.title, lf.label, lf.areaName, s.name])
                                : false;
                              const dimmed = isSearching && emp && !cellMatch;
                              const highlight = isSearching && cellMatch;
                              return (
                                <td key={`cell-${d.id}-${date.key}-${lf.id}`}
                                  className={cn("border-b border-r border-border px-1 py-1 align-middle transition-opacity w-[140px] min-w-[140px] max-w-[140px]", c.cellBg, dimmed && "opacity-25")}>
                                  {emp ? (() => {
                                    const rc = ROLE_COLORS[emp.role];
                                    return (
                                      <div
                                        draggable
                                        onDragStart={handleDragStart(emp.id, k)}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverKey(k); }}
                                        onDragLeave={() => setDragOverKey(null)}
                                        onDrop={handleDrop(k)}
                                        className={cn(
                                          "group relative flex items-center gap-1.5 p-1.5 rounded-lg bg-card border transition-all cursor-grab active:cursor-grabbing hover:shadow-sm",
                                          c.border,
                                          isOver && "ring-2 ring-primary",
                                          highlight && "ring-2 ring-primary ring-offset-1 shadow-md",
                                        )}
                                      >

                                        <Avatar className="h-7 w-7 flex-shrink-0 ring-2 ring-background">
                                          <AvatarImage src={emp.photoUrl} alt={emp.name} />
                                          <AvatarFallback className={cn("text-[9px] font-bold", rc.bg, rc.text)}>{emp.avatar}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-[10px] font-semibold text-foreground leading-tight truncate">{emp.name}</p>
                                          <span className={cn("text-[7px] font-bold px-1 py-0 rounded border uppercase tracking-wider mt-0.5 inline-block", rc.bg, rc.text, rc.border)}>
                                            {ROLE_SHORT[emp.role]}
                                          </span>
                                        </div>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); clearAssign(k); }}
                                          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    );
                                  })() : (
                                    <Popover
                                      open={pickerKey === k}
                                      onOpenChange={(o) => {
                                        if (o) {
                                          setPickerKey(k);
                                          setPickerQuery("");
                                          setPickerSelectedEmp(null);
                                          setPickerDates(new Set([date.key]));
                                        } else if (pickerKey === k) {
                                          setPickerKey(null);
                                          setPickerQuery("");
                                          setPickerSelectedEmp(null);
                                          setPickerDates(new Set());
                                        }
                                      }}
                                    >
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          onDragOver={(e) => { e.preventDefault(); setDragOverKey(k); }}
                                          onDragLeave={() => setDragOverKey(null)}
                                          onDrop={handleDrop(k)}
                                          className={cn(
                                            "w-full h-10 rounded-lg border-2 border-dashed flex items-center justify-center transition-all cursor-pointer",
                                            isOver
                                              ? "border-primary/60 bg-primary/5 scale-[1.02]"
                                              : "border-border/40 hover:border-primary/50 hover:bg-primary/5",
                                          )}
                                        >
                                          <span className="text-[9px] text-muted-foreground/70 font-medium">
                                            {isOver ? "Drop" : `+ ${lf.label.slice(0, 4).toUpperCase()}`}
                                          </span>
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent align="start" className="w-[340px] p-0">
                                        {!pickerSelectedEmp ? (
                                          <div className="p-2">
                                            <div className="px-1 pb-2">
                                              <p className="text-[11px] font-semibold text-foreground">
                                                Assign to {lf.label}
                                                {lf.areaName ? ` · ${lf.areaName}` : ""}
                                              </p>
                                              <p className="text-[10px] text-muted-foreground">
                                                {s.name || `Shift ${sIdx + 1}`} • {date.dayLabel} {date.dateNum}
                                              </p>
                                            </div>
                                            <Input
                                              autoFocus
                                              placeholder="Search by name or role..."
                                              value={pickerQuery}
                                              onChange={(e) => setPickerQuery(e.target.value)}
                                              className="h-8 mb-2"
                                            />
                                            <ScrollArea className="max-h-64">
                                              <div className="space-y-1 pr-1">
                                                {employees
                                                  .filter((emp2) => {
                                                    const q = pickerQuery.trim().toLowerCase();
                                                    if (!q) return true;
                                                    return emp2.name.toLowerCase().includes(q) || emp2.role.toLowerCase().includes(q);
                                                  })
                                                  .map((emp2) => {
                                                    const rc2 = ROLE_COLORS[emp2.role];
                                                    return (
                                                      <button
                                                        key={emp2.id}
                                                        type="button"
                                                        onClick={() => setPickerSelectedEmp(emp2.id)}
                                                        className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/60 transition text-left"
                                                      >
                                                        <Avatar className="h-7 w-7">
                                                          <AvatarImage src={emp2.photoUrl} alt={emp2.name} />
                                                          <AvatarFallback className={cn("text-[9px] font-bold", rc2.bg, rc2.text)}>{emp2.avatar}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0 flex-1">
                                                          <p className="text-xs font-medium text-foreground truncate">{emp2.name}</p>
                                                          <span className={cn("text-[8px] font-bold px-1 py-0 rounded border uppercase tracking-wider inline-block", rc2.bg, rc2.text, rc2.border)}>
                                                            {ROLE_SHORT[emp2.role]}
                                                          </span>
                                                        </div>
                                                      </button>
                                                    );
                                                  })}
                                                {employees.filter((emp2) => {
                                                  const q = pickerQuery.trim().toLowerCase();
                                                  return !q || emp2.name.toLowerCase().includes(q) || emp2.role.toLowerCase().includes(q);
                                                }).length === 0 && (
                                                  <p className="text-xs text-muted-foreground text-center py-4">No staff matches.</p>
                                                )}
                                              </div>
                                            </ScrollArea>
                                          </div>
                                        ) : (() => {
                                          const selEmp = getEmp(pickerSelectedEmp)!;
                                          const rcSel = ROLE_COLORS[selEmp.role];
                                          const sourceDow = weekdayOf(date.key);
                                          const allKeys = visibleDates.map((dt) => dt.key);
                                          const setAll = () => setPickerDates(new Set(allKeys));
                                          const setNone = () => setPickerDates(new Set([date.key]));
                                          const setWeekdays = () => setPickerDates(new Set(allKeys.filter((dk) => { const w = weekdayOf(dk); return w >= 1 && w <= 5; })));
                                          const setWeekends = () => setPickerDates(new Set(allKeys.filter((dk) => { const w = weekdayOf(dk); return w === 0 || w === 6; })));
                                          const setSameDow = () => setPickerDates(new Set(allKeys.filter((dk) => weekdayOf(dk) === sourceDow)));
                                          const toggleDate = (dk: string) => setPickerDates((prev) => { const n = new Set(prev); if (n.has(dk)) n.delete(dk); else n.add(dk); return n; });
                                          return (
                                            <div className="flex flex-col">
                                              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                                                <button type="button" onClick={() => setPickerSelectedEmp(null)} className="text-[10px] text-muted-foreground hover:text-foreground underline">
                                                  ← change
                                                </button>
                                                <Avatar className="h-6 w-6">
                                                  <AvatarImage src={selEmp.photoUrl} alt={selEmp.name} />
                                                  <AvatarFallback className={cn("text-[9px] font-bold", rcSel.bg, rcSel.text)}>{selEmp.avatar}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                  <p className="text-xs font-semibold text-foreground truncate leading-tight">{selEmp.name}</p>
                                                  <p className="text-[10px] text-muted-foreground leading-tight">→ {lf.label}{lf.areaName ? ` · ${lf.areaName}` : ""}</p>
                                                </div>
                                              </div>
                                              <div className="px-3 py-2 space-y-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Apply to</p>
                                                <div className="flex flex-wrap gap-1">
                                                  <button type="button" onClick={setNone} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">Just this day</button>
                                                  <button type="button" onClick={setAll} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">All days</button>
                                                  <button type="button" onClick={setSameDow} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">Every {date.dayLabel}</button>
                                                  <button type="button" onClick={setWeekdays} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">Weekdays</button>
                                                  <button type="button" onClick={setWeekends} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">Weekends</button>
                                                </div>
                                                <ScrollArea className="max-h-40 -mx-1 px-1">
                                                  <div className="flex flex-wrap gap-1 pt-1">
                                                    {visibleDates.map((dt) => {
                                                      const active = pickerDates.has(dt.key);
                                                      return (
                                                        <button
                                                          key={dt.key}
                                                          type="button"
                                                          onClick={() => toggleDate(dt.key)}
                                                          className={cn(
                                                            "text-[10px] px-1.5 py-1 rounded-md border min-w-[36px] flex flex-col items-center leading-none transition",
                                                            active
                                                              ? "bg-primary text-primary-foreground border-primary"
                                                              : "bg-card text-foreground border-border hover:bg-muted",
                                                          )}
                                                        >
                                                          <span className="font-bold text-[11px]">{dt.dateNum}</span>
                                                          <span className="opacity-70 mt-0.5">{dt.dayLabel.slice(0, 2)}</span>
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                </ScrollArea>
                                                <p className="text-[10px] text-muted-foreground">{pickerDates.size} day{pickerDates.size === 1 ? "" : "s"} selected</p>
                                              </div>
                                              <div className="px-3 py-2 border-t border-border flex items-center justify-end gap-2 bg-muted/20">
                                                <Button variant="outline" size="sm" onClick={() => { setPickerKey(null); setPickerSelectedEmp(null); setPickerDates(new Set()); }}>Cancel</Button>
                                                <Button
                                                  size="sm"
                                                  disabled={pickerDates.size === 0}
                                                  onClick={() => {
                                                    const targets = Array.from(pickerDates);
                                                    const skipped = applySlotAcrossDates(selEmp.id, d.id, lf.id, targets) ?? 0;
                                                    setPickerKey(null);
                                                    setPickerSelectedEmp(null);
                                                    setPickerDates(new Set());
                                                    toast({
                                                      title: "Assigned",
                                                      description: `${selEmp.name} → ${targets.length - skipped} day${targets.length - skipped === 1 ? "" : "s"}${skipped ? `, ${skipped} skipped (already taken)` : ""}.`,
                                                    });
                                                  }}
                                                >
                                                  Assign
                                                </Button>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </td>
                              );
                            }),
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-sm border-separate border-spacing-0 min-w-[1100px] bg-card">
                    <thead>
                      <tr>
                        <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-3 bg-card border-b border-r border-border w-[220px] sticky left-0 top-0 z-30">
                          Employee
                        </th>
                        {visibleDates.map((date) => (
                          <th key={`emp-h-${date.key}`} className="px-2 py-2 text-center border-b border-r border-border bg-card min-w-[150px]">
                            <p className="text-base font-bold text-foreground leading-none">{date.dateNum}</p>
                            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">{date.dayLabel}</p>
                          </th>
                        ))}
                        <th className="text-center text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-3 py-3 bg-card border-b border-border w-[60px]">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {STAFF_ROLES.map((role) => {
                        let list = employees.filter((e) => e.role === role);
                        if (isSearching) {
                          list = list.filter((e) => {
                            const chips = Object.values(assignmentsByEmpDate[e.id] || {}).flat();
                            if (chips.some((c) =>
                              matchesCell([e.name, e.role, c.dutyTitle, c.areaName, c.leafLabel, c.shiftName]),
                            )) return true;
                            return matchesCell([e.name, e.role]);
                          });
                        }
                        if (list.length === 0) return null;
                        const rc = ROLE_COLORS[role];
                        return (
                          <Fragment key={`role-group-${role}`}>
                            <tr>
                              <td colSpan={visibleDates.length + 2}
                                className={cn("px-4 py-1.5 border-b border-border text-[10px] font-bold uppercase tracking-wider sticky left-0 top-[52px] z-20", rc.bg, rc.text)}>
                                {role}s
                                <span className="ml-2 opacity-60 normal-case font-normal">({list.length})</span>
                              </td>
                            </tr>
                            {list.map((emp) => {
                              const erc = ROLE_COLORS[emp.role];
                              const empDates = assignmentsByEmpDate[emp.id] || {};
                              const totalShifts = Object.values(empDates).reduce((sum, arr) => sum + arr.length, 0);
                              return (
                                <tr key={`emp-${emp.id}`}>
                                  <td className="px-3 py-2 border-b border-r border-border bg-card sticky left-0 z-20">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarImage src={emp.photoUrl} alt={emp.name} />
                                        <AvatarFallback className={cn("text-[9px] font-bold", erc.bg, erc.text)}>{emp.avatar}</AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-foreground truncate leading-tight">{emp.name}</p>
                                        <span className={cn("text-[8px] font-bold px-1 py-0 rounded border uppercase tracking-wider mt-0.5 inline-block", erc.bg, erc.text, erc.border)}>
                                          {ROLE_SHORT[emp.role]}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  {visibleDates.map((date) => {
                                    const chips = empDates[date.key] || [];
                                    const cellActive = openPickerCellKey === `${emp.id}::${date.key}`;
                                    return (
                                      <td key={`emp-cell-${emp.id}-${date.key}`}
                                        className={cn(
                                          "px-1 py-1 border-b border-r border-border align-top bg-card group/cell relative min-w-[160px]",
                                          cellActive && "rounded-md ring-2 ring-inset ring-primary bg-primary/5",
                                        )}>
                                        {chips.length === 0 ? (
                                          <AssignPopover emp={emp} date={date}>
                                            <button
                                              type="button"
                                              className="w-full h-12 flex items-center justify-center rounded-md border border-dashed border-border/60 text-muted-foreground/40 hover:border-primary hover:text-primary hover:bg-primary/5 transition"
                                              title="Assign a duty"
                                            >
                                              <Plus className="h-3.5 w-3.5" />
                                            </button>
                                          </AssignPopover>
                                        ) : (
                                          <div className="flex flex-col gap-1">
                                            {chips.map((c) => {
                                              const sc = SHIFT_PALETTE[c.shiftIdx % SHIFT_PALETTE.length];
                                              const chipMatch = matchesCell([emp.name, emp.role, c.dutyTitle, c.areaName, c.leafLabel, c.shiftName]);
                                              const chipDimmed = isSearching && !chipMatch;
                                              const chipHighlight = isSearching && chipMatch;
                                              return (
                                                <div
                                                  key={c.key}
                                                  title={`${c.shiftName} • ${c.dutyTitle}${c.areaName ? ` • ${c.areaName}` : ""} • ${c.leafLabel}`}
                                                  className={cn(
                                                    "group relative flex items-stretch gap-1.5 pr-6 rounded-md border overflow-hidden transition hover:shadow-sm",
                                                    sc.cellBg, sc.border,
                                                    chipDimmed && "opacity-25",
                                                    chipHighlight && "ring-2 ring-primary ring-offset-1 shadow-md",
                                                  )}
                                                >

                                                  {/* Shift stripe */}
                                                  <div className={cn("flex flex-col items-center justify-center px-1 py-1 text-white flex-shrink-0", sc.dot)}>
                                                    <span className="text-[10px] font-bold leading-none">{c.shiftLetter}</span>
                                                    <span className="text-[7px] uppercase tracking-wider opacity-90 mt-0.5 leading-none">{c.shiftName.slice(0, 4)}</span>
                                                  </div>
                                                  {/* Info column */}
                                                  <div className="flex-1 min-w-0 py-1 pr-1">
                                                    <p className={cn("text-[10px] font-bold leading-tight truncate", sc.dutyText)}>
                                                      {c.dutyTitle}
                                                    </p>
                                                    {c.areaName && (
                                                      <p className="text-[9px] text-muted-foreground leading-tight truncate flex items-center gap-0.5">
                                                        <MapPin className="h-2 w-2 flex-shrink-0" />
                                                        {c.areaName}
                                                      </p>
                                                    )}
                                                    <p className="text-[9px] font-medium text-foreground/70 leading-tight truncate">
                                                      {c.leafLabel}
                                                    </p>
                                                  </div>
                                                  {/* Remove button */}
                                                  <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); clearAssign(c.key); }}
                                                    title="Remove assignment"
                                                    className="absolute top-0.5 right-0.5 h-4 w-4 rounded-sm flex items-center justify-center bg-background/60 hover:bg-destructive hover:text-destructive-foreground text-muted-foreground opacity-0 group-hover:opacity-100 transition"
                                                  >
                                                    <X className="h-2.5 w-2.5" />
                                                  </button>
                                                </div>
                                              );
                                            })}
                                            <AssignPopover emp={emp} date={date}>
                                              <button
                                                type="button"
                                                className="h-5 flex items-center justify-center rounded-md border border-dashed border-border/60 text-[10px] text-muted-foreground/60 hover:border-primary hover:text-primary hover:bg-primary/5 transition opacity-0 group-hover/cell:opacity-100"
                                                title="Add another duty"
                                              >
                                                <Plus className="h-3 w-3" />
                                              </button>
                                            </AssignPopover>
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                  <td className="px-2 py-2 border-b border-border bg-card text-center align-middle">
                                    <span className={cn("inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-[11px] font-bold border", erc.bg, erc.text, erc.border)}>
                                      {totalShifts}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                      {employees.length === 0 && (
                        <tr>
                          <td colSpan={visibleDates.length + 2} className="px-4 py-12 text-center text-sm text-muted-foreground">
                            No employees in the staff pool.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
    </>
  );

  if (embedded) {
    return <>{body}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />
      <main className={cn("flex-1 transition-all duration-300", sidebarMargin)}>
        {body}
      </main>
    </div>
  );
};

export default OnDutyScheduling;
