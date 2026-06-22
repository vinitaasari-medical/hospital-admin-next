'use client';
import { useEffect, useMemo, useState, KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Calendar as CalendarIcon, Check, Clock,
  GripVertical, Plus, Save, Send, Trash2, AlertTriangle, Sparkles,
  ListChecks, X, TableIcon, MapPin, LayoutGrid,
  Sunrise, Sun, Sunset, Moon, UserPlus, Settings as SettingsIcon,
  ClipboardList, Bell, Lock, User, Copy, FileSpreadsheet, Printer, Globe,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Switch } from "@/components/ui/switch";
import DashboardSidebar from "@/components/DashboardSidebar";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  listDuties,
  getDutyById,
  createDutyTemplate,
  createStaffScheduleTemplate,
} from "@/lib/api/departments-api";

// ===== Schedule payload builder =====

const buildSchedulePayload = (
  data: { title: string; startDate: string; endDate: string; activeDays: string[]; shifts: WShift[]; patientListEnabled: boolean; showDutyToNetwork: boolean },
  params: { group_id: string; department_id: string; duty_code: string; sub_department_id?: string },
): Record<string, unknown> => {
  const { title, startDate, endDate, activeDays, shifts, patientListEnabled, showDutyToNetwork } = data;
  const { group_id, department_id, duty_code, sub_department_id } = params;

  const startEpoch = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : 0;
  const endEpoch = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : 0;

  const dayNumMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const targetDayNums = activeDays.map((d) => dayNumMap[d] ?? -1).filter((n) => n >= 0);

  const occurrences: Array<{ start_time: number }> = [];
  if (startEpoch && endEpoch && targetDayNums.length) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayUnix = Math.floor(todayStart.getTime() / 1000);
    const cur = new Date(startEpoch * 1000);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(endEpoch * 1000);
    end.setHours(23, 59, 59, 999);
    while (cur <= end) {
      if (targetDayNums.includes(cur.getDay())) {
        const epoch = Math.floor(cur.getTime() / 1000);
        if (epoch >= todayUnix) occurrences.push({ start_time: epoch });
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  const transformedShifts = shifts.map((shift, sIdx) => {
    const [sh, sm] = (shift.startTime || "00:00").split(":").map(Number);
    const [eh, em] = (shift.endTime || "00:00").split(":").map(Number);
    const endIsNextDay = eh < sh || (eh === sh && em <= sm);
    return {
      title: shift.name,
      start_time: `${shift.startTime || "00:00"}:00`,
      end_time: `${shift.endTime || "00:00"}:00`,
      start_is_next_day: false,
      end_is_next_day: endIsNextDay,
      sequence: sIdx + 1,
      tasks: shift.duties
        .map((duty, dIdx) => {
          const task: Record<string, unknown> = { title: duty.title, sequence: dIdx + 1 };
          if (duty.coversAreas && duty.areas.length > 0) {
            task.areas = duty.areas
              .filter((a) => a.name.trim())
              .map((area, aIdx) => ({
                title: area.name,
                sequence: aIdx + 1,
                coverage: area.roles
                  .filter((r) => r.trim())
                  .map((role, rIdx) => ({ role, sequence: rIdx + 1 })),
              }));
          } else if (duty.roles.length > 0) {
            task.coverage = duty.roles
              .filter((r) => r.trim())
              .map((role, rIdx) => ({ role, sequence: rIdx + 1 }));
          }
          return task;
        })
        .filter((t) => (t.title as string)?.trim()),
    };
  });

  const body: Record<string, unknown> = {
    title,
    start_date: startEpoch,
    end_date: endEpoch,
    department_id,
    is_notify: true,
    is_enabled: true,
    is_create_patient_list: patientListEnabled,
    show_duty_to_network: showDutyToNetwork,
    days: activeDays.join(","),
    duty_code,
    occurrences,
    group_id,
    shifts: transformedShifts,
    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  if (sub_department_id) body.sub_department_id = sub_department_id;
  return body;
};

// ===== Types =====
interface WArea {
  id: string;
  name: string;
  roles: string[];
}
interface WDuty {
  id: string;
  title: string;
  roles: string[];        // used when coversAreas = false
  coversAreas: boolean;
  areas: WArea[];         // used when coversAreas = true; each area has its own roles
}

// Number of leaf columns this duty needs in the preview/Excel grid
const dutyLeafCount = (d: WDuty) => {
  if (d.coversAreas) {
    if (d.areas.length === 0) return 1;
    return d.areas.reduce((n, a) => n + Math.max(a.roles.length, 1), 0);
  }
  return Math.max(d.roles.length, 1);
};
interface WShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  duties: WDuty[];
}

const DAYS = [
  { key: "Sun", label: "Sunday" },
  { key: "Mon", label: "Monday" },
  { key: "Tue", label: "Tuesday" },
  { key: "Wed", label: "Wednesday" },
  { key: "Thu", label: "Thursday" },
  { key: "Fri", label: "Friday" },
  { key: "Sat", label: "Saturday" },
];

const SHIFT_PALETTE = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", dot: "bg-blue-500", pillBg: "bg-blue-50", pillBorder: "border-blue-200", pillText: "text-blue-700", areaBg: "bg-blue-100/60", areaText: "text-blue-800" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500", pillBg: "bg-emerald-50", pillBorder: "border-emerald-200", pillText: "text-emerald-700", areaBg: "bg-emerald-100/60", areaText: "text-emerald-800" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500", pillBg: "bg-amber-50", pillBorder: "border-amber-200", pillText: "text-amber-700", areaBg: "bg-amber-100/60", areaText: "text-amber-800" },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-500", pillBg: "bg-violet-50", pillBorder: "border-violet-200", pillText: "text-violet-700", areaBg: "bg-violet-100/60", areaText: "text-violet-800" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", dot: "bg-rose-500", pillBg: "bg-rose-50", pillBorder: "border-rose-200", pillText: "text-rose-700", areaBg: "bg-rose-100/60", areaText: "text-rose-800" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", dot: "bg-cyan-500", pillBg: "bg-cyan-50", pillBorder: "border-cyan-200", pillText: "text-cyan-700", areaBg: "bg-cyan-100/60", areaText: "text-cyan-800" },
];

// Map shift name → palette so Morning is always blue, Evening green, Night amber, etc.
const SHIFT_NAME_PALETTE: Record<string, typeof SHIFT_PALETTE[number]> = {
  morning: SHIFT_PALETTE[0],
  day: SHIFT_PALETTE[0],
  early: SHIFT_PALETTE[0],
  evening: SHIFT_PALETTE[1],
  midday: SHIFT_PALETTE[1],
  afternoon: SHIFT_PALETTE[1],
  night: SHIFT_PALETTE[2],
  overnight: SHIFT_PALETTE[2],
};
const getShiftPalette = (name: string, fallbackIdx: number) =>
  SHIFT_NAME_PALETTE[(name || "").trim().toLowerCase()] ??
  SHIFT_PALETTE[fallbackIdx % SHIFT_PALETTE.length];


const PRESET_SHIFTS: Record<number, Omit<WShift, "duties">[]> = {
  1: [{ id: "s1", name: "Day", startTime: "08:00", endTime: "20:00" }],
  2: [
    { id: "s1", name: "Day", startTime: "07:00", endTime: "19:00" },
    { id: "s2", name: "Night", startTime: "19:00", endTime: "07:00" },
  ],
  3: [
    { id: "s1", name: "Morning", startTime: "07:00", endTime: "15:00" },
    { id: "s2", name: "Evening", startTime: "15:00", endTime: "23:00" },
    { id: "s3", name: "Night", startTime: "23:00", endTime: "07:00" },
  ],
  4: [
    { id: "s1", name: "Early", startTime: "06:00", endTime: "12:00" },
    { id: "s2", name: "Midday", startTime: "12:00", endTime: "18:00" },
    { id: "s3", name: "Evening", startTime: "18:00", endTime: "00:00" },
    { id: "s4", name: "Night", startTime: "00:00", endTime: "06:00" },
  ],
};

const ROLE_SUGGESTIONS = ["Inpatient", "ER", "ICU", "Outpatient", "Surgery", "Pediatrics", "Maternity"];

const STEPS = [
  { id: 1, title: "Schedule basics", helper: "Name and dates", icon: CalendarIcon },
  { id: 2, title: "Set up shifts", helper: "How each day is split", icon: Clock },
  { id: 3, title: "Duties & roles", helper: "What each shift covers", icon: ListChecks },
  { id: 4, title: "Settings", helper: "Notifications & extras", icon: SettingsIcon },
];

// helpers
const toMin = (t: string) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};
const overlaps = (a: WShift, b: WShift) => {
  const s1 = toMin(a.startTime), e1 = toMin(a.endTime);
  const s2 = toMin(b.startTime), e2 = toMin(b.endTime);
  const norm = (s: number, e: number) => (e <= s ? [[s, 1440], [0, e]] : [[s, e]]);
  const r1 = norm(s1, e1), r2 = norm(s2, e2);
  for (const [as, ae] of r1) for (const [bs, be] of r2) if (as < be && bs < ae) return true;
  return false;
};
const formatDateInput = (d: Date) => d.toISOString().slice(0, 10);
const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const genDutyCode = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};
const to12h = (t: string) => {
  if (!t) return "--:--";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = mStr ?? "00";
  if (Number.isNaN(h)) return "--:--";
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
};

const CreateSchedule = () => {
  const router = useRouter();
  const { toast } = useToast();
  const sidebarMargin = useSidebarMargin();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const templateId = searchParams.get("template");
  const departmentParam = searchParams.get("department") || "";
  const fromParam = searchParams.get("from") || "/admin/scheduling";
  const [editStatus, setEditStatus] = useState<"Published" | "Draft" | null>(null);
  const [editDutyCode, setEditDutyCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Locked-structure edit only applies when editing a Published schedule.
  // Drafts (not yet published) get full edit access.
  const isEdit = !!editId && editStatus === "Published";

  // ===== state =====
  const [step, setStep] = useState(1);

  // step 1 — start empty
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeDays, setActiveDays] = useState<string[]>([]);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

  // step 2 — start empty
  const [shiftCount, setShiftCount] = useState<number | null>(null);
  const [shifts, setShifts] = useState<WShift[]>([]);

  // role input per shift
  const [roleInputs, setRoleInputs] = useState<Record<string, string>>({});
  const [copiedFrom, setCopiedFrom] = useState<Record<string, string>>({});

  // step 3b — coverage by unit
  const [coverageEnabled, setCoverageEnabled] = useState(false);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [unitInput, setUnitInput] = useState("");
  // coverage[unitId] = Set of dutyIds (stored as array)
  const [coverage, setCoverage] = useState<Record<string, string[]>>({});

  // step 4 — settings
  const [patientListEnabled, setPatientListEnabled] = useState(true);
  const [showDutyToNetwork, setShowDutyToNetwork] = useState(false);
  const [notifyOnPublish, setNotifyOnPublish] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderHours, setReminderHours] = useState("2");
  const [allowSwap, setAllowSwap] = useState(true);
  const [requireSwapApproval, setRequireSwapApproval] = useState(true);
  const [visibility, setVisibility] = useState<"assigned" | "department" | "everyone">("assigned");

  // Load existing schedule when editing (API-based)
  useEffect(() => {
    if (!editId) return;
    const loadEdit = async () => {
      const groupId = localStorage.getItem("group_id") || "";
      const departmentId = localStorage.getItem("department_id") || "";
      const subDeptId = localStorage.getItem("sub_department_id") || undefined;
      if (!groupId || !departmentId) return;
      try {
        const listRes = await listDuties({
          group_id: groupId,
          department_id: departmentId,
          duty_code: editId,
          ...(subDeptId ? { sub_department_id: subDeptId } : {}),
        });
        const intervals = (listRes.content?.data ?? []) as Array<Record<string, unknown>>;
        if (intervals.length === 0) return;
        const interval = intervals[0];
        setEditDutyCode(editId);
        setEditStatus((interval.status as string) === "published" ? "Published" : "Draft");

        const detailRes = await getDutyById({
          staffing_duty_id: interval.id as string,
          start_date: interval.start_date as number,
          end_date: interval.end_date as number,
        });
        const sd = (detailRes.content?.data ?? detailRes.content ?? {}) as Record<string, unknown>;

        setTitle((sd.title as string) || (interval.title as string) || "");
        const sEpoch = (sd.start_date as number) || (interval.start_date as number);
        const eEpoch = (sd.end_date as number) || (interval.end_date as number);
        if (sEpoch) setStartDate(new Date(sEpoch * 1000).toISOString().slice(0, 10));
        if (eEpoch) setEndDate(new Date(eEpoch * 1000).toISOString().slice(0, 10));
        const daysStr = (sd.days as string) || (interval.days as string) || "";
        if (daysStr) setActiveDays(daysStr.split(",").filter(Boolean));

        const rawShifts = (sd.shifts || []) as Array<Record<string, unknown>>;
        const wizardShifts: WShift[] = rawShifts.map((shift, sIdx) => {
          const rawTasks = (shift.tasks || []) as Array<Record<string, unknown>>;
          return {
            id: uid(`s${sIdx}`),
            name: (shift.title as string) || "",
            startTime: ((shift.start_time as string) || "").slice(0, 5),
            endTime: ((shift.end_time as string) || "").slice(0, 5),
            duties: rawTasks.map((task, tIdx) => {
              const rawAreas = (task.areas || []) as Array<Record<string, unknown>>;
              if (rawAreas.length > 0) {
                return {
                  id: uid(`d${sIdx}_${tIdx}`),
                  title: (task.title as string) || "",
                  roles: [],
                  coversAreas: true,
                  areas: rawAreas.map((area, aIdx) => ({
                    id: uid(`a${sIdx}_${tIdx}_${aIdx}`),
                    name: (area.title as string) || "",
                    roles: ((area.coverage as Array<Record<string, unknown>>) || [])
                      .map((c) => (c.role as string) || "")
                      .filter(Boolean),
                  })),
                };
              }
              return {
                id: uid(`d${sIdx}_${tIdx}`),
                title: (task.title as string) || "",
                roles: ((task.coverage as Array<Record<string, unknown>>) || [])
                  .map((c) => (c.role as string) || "")
                  .filter(Boolean),
                coversAreas: false,
                areas: [],
              };
            }),
          };
        });
        setShifts(wizardShifts);
        setShiftCount(wizardShifts.length);
        if (typeof sd.show_duty_to_network === "boolean") setShowDutyToNetwork(sd.show_duty_to_network);
        if (typeof sd.is_create_patient_list === "boolean") setPatientListEnabled(sd.is_create_patient_list);
      } catch (err) {
        console.error("Failed to load schedule for edit:", err);
      }
    };
    void loadEdit();
  }, [editId]);

  // Load template data stored in sessionStorage when navigating from Templates tab
  useEffect(() => {
    if (editId) return;
    const raw = sessionStorage.getItem("mc.scheduleTemplate");
    if (!raw) return;
    sessionStorage.removeItem("mc.scheduleTemplate");
    try {
      const row = JSON.parse(raw) as Record<string, unknown>;
      const config = (row.config ?? {}) as Record<string, unknown>;
      setTitle((config.title as string) || (row.name as string) || "");
      const daysStr = (config.days as string) || "";
      if (daysStr) setActiveDays(daysStr.split(",").filter(Boolean));
      if (typeof config.show_duty_to_network === "boolean") setShowDutyToNetwork(config.show_duty_to_network);
      if (typeof config.is_create_patient_list === "boolean") setPatientListEnabled(config.is_create_patient_list);
      const rawShifts = (config.shifts || []) as Array<Record<string, unknown>>;
      const wizardShifts: WShift[] = rawShifts.map((shift, sIdx) => {
        const rawTasks = (shift.tasks || []) as Array<Record<string, unknown>>;
        return {
          id: uid(`s${sIdx}`),
          name: (shift.title as string) || "",
          startTime: ((shift.start_time as string) || "").slice(0, 5),
          endTime: ((shift.end_time as string) || "").slice(0, 5),
          duties: rawTasks.map((task, tIdx) => {
            const rawAreas = (task.areas || []) as Array<Record<string, unknown>>;
            if (rawAreas.length > 0) {
              return {
                id: uid(`d${sIdx}_${tIdx}`),
                title: (task.title as string) || "",
                roles: [],
                coversAreas: true,
                areas: rawAreas.map((area, aIdx) => ({
                  id: uid(`a${sIdx}_${tIdx}_${aIdx}`),
                  name: (area.title as string) || "",
                  roles: ((area.coverage as Array<Record<string, unknown>>) || [])
                    .map((c) => (c.role as string) || "")
                    .filter(Boolean),
                })),
              };
            }
            return {
              id: uid(`d${sIdx}_${tIdx}`),
              title: (task.title as string) || "",
              roles: ((task.coverage as Array<Record<string, unknown>>) || [])
                .map((c) => (c.role as string) || "")
                .filter(Boolean),
              coversAreas: false,
              areas: [],
            };
          }),
        };
      });
      if (wizardShifts.length > 0) {
        setShifts(wizardShifts);
        setShiftCount(wizardShifts.length);
      }
    } catch {
      // ignore malformed template data
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allDuties = useMemo(
    () => shifts.flatMap((s) => s.duties.map((d) => ({ ...d, shiftId: s.id, shiftName: s.name }))),
    [shifts],
  );

  const addUnit = (raw: string) => {
    const name = raw.trim();
    if (!name) return;
    if (units.some((u) => u.name.toLowerCase() === name.toLowerCase())) return;
    const id = uid("u");
    setUnits((p) => [...p, { id, name }]);
    setCoverage((p) => ({ ...p, [id]: [] }));
  };
  const removeUnit = (id: string) => {
    setUnits((p) => p.filter((u) => u.id !== id));
    setCoverage((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });
  };
  const toggleCoverage = (unitId: string, dutyId: string) =>
    setCoverage((p) => {
      const cur = p[unitId] || [];
      return {
        ...p,
        [unitId]: cur.includes(dutyId) ? cur.filter((x) => x !== dutyId) : [...cur, dutyId],
      };
    });

  const allDutyIds = () => shifts.flatMap((s) => s.duties.map((d) => d.id));
  const toggleAllForUnit = (unitId: string) => {
    const ids = allDutyIds();
    setCoverage((p) => {
      const cur = p[unitId] || [];
      const allSelected = ids.length > 0 && ids.every((id) => cur.includes(id));
      return { ...p, [unitId]: allSelected ? [] : ids };
    });
  };

  // ===== derived =====
  const overlapWarnings = useMemo(() => {
    const warns: string[] = [];
    for (let i = 0; i < shifts.length; i++) {
      for (let j = i + 1; j < shifts.length; j++) {
        const a = shifts[i], b = shifts[j];
        if (a.startTime && a.endTime && b.startTime && b.endTime && overlaps(a, b)) {
          warns.push(`"${a.name || `Shift ${i + 1}`}" overlaps with "${b.name || `Shift ${j + 1}`}"`);
        }
      }
    }
    return warns;
  }, [shifts]);

  const activeDayObjects = useMemo(
    () => DAYS.filter((d) => activeDays.includes(d.key)),
    [activeDays],
  );

  // Build list of actual dates (filtered by active weekdays) for the table rows
  const scheduleDates = useMemo(() => {
    if (!startDate || !endDate || activeDays.length === 0) return [];
    const out: { key: string; dayKey: string; dayLabel: string; dateNum: number; full: Date }[] = [];
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return [];
    const map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const cur = new Date(s);
    let guard = 0;
    while (cur <= e && guard < 200) {
      const dk = map[cur.getDay()];
      if (activeDays.includes(dk)) {
        out.push({
          key: cur.toISOString().slice(0, 10),
          dayKey: dk,
          dayLabel: cur.toLocaleDateString(undefined, { weekday: "short" }),
          dateNum: cur.getDate(),
          full: new Date(cur),
        });
      }
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
    return out;
  }, [startDate, endDate, activeDays]);

  // Pick a sun/moon icon based on shift start time
  const shiftIcon = (startTime: string) => {
    const h = toMin(startTime) / 60;
    if (h >= 5 && h < 11) return Sunrise;
    if (h >= 11 && h < 16) return Sun;
    if (h >= 16 && h < 20) return Sunset;
    return Moon;
  };

  // Short role abbreviation for tag pills (e.g. Inpatient -> INP)
  const roleAbbr = (role: string) => {
    const cleaned = role.trim();
    if (!cleaned) return "";
    if (cleaned.length <= 3) return cleaned.toUpperCase();
    const parts = cleaned.split(/\s+/);
    if (parts.length > 1) return parts.map((p) => p[0]).join("").slice(0, 3).toUpperCase();
    return cleaned.slice(0, 3).toUpperCase();
  };


  // ===== handlers =====
  const toggleDay = (key: string) =>
    setActiveDays((p) => (p.includes(key) ? p.filter((d) => d !== key) : [...p, key]));

  const buildPreset = (n: number): Omit<WShift, "duties">[] => {
    if (PRESET_SHIFTS[n]) return PRESET_SHIFTS[n];
    const hoursPer = 24 / n;
    return Array.from({ length: n }, (_, i) => {
      const startH = Math.round(i * hoursPer) % 24;
      const endH = Math.round((i + 1) * hoursPer) % 24;
      const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;
      return { id: `s${i + 1}`, name: `Shift ${i + 1}`, startTime: pad(startH), endTime: pad(endH) };
    });
  };

  const pickShiftCount = (n: number) => {
    setShiftCount(n);
    setShifts(
      buildPreset(n).map((s, i) => ({
        ...s,
        id: uid(`s${i}`),
        duties: [],
      })),
    );
  };

  const updateShift = (id: string, patch: Partial<WShift>) =>
    setShifts((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const addShift = () => {
    setShiftCount((p) => (p ?? 0) + 1);
    setShifts((p) => [
      ...p,
      { id: uid("s"), name: `Shift ${p.length + 1}`, startTime: "08:00", endTime: "16:00", duties: [] },
    ]);
  };
  const removeShift = (id: string) => setShifts((p) => p.filter((s) => s.id !== id));

  // duties live INSIDE a shift
  const addDuty = (shiftId: string) =>
    updateShiftDuties(shiftId, (duties) => [
      ...duties,
      { id: uid("d"), title: "", roles: [], coversAreas: false, areas: [] },
    ]);
  const removeDuty = (shiftId: string, dutyId: string) =>
    updateShiftDuties(shiftId, (duties) => duties.filter((d) => d.id !== dutyId));
  const updateDuty = (shiftId: string, dutyId: string, patch: Partial<WDuty>) =>
    updateShiftDuties(shiftId, (duties) =>
      duties.map((d) => (d.id === dutyId ? { ...d, ...patch } : d)),
    );
  const updateShiftDuties = (
    shiftId: string,
    updater: (duties: WDuty[]) => WDuty[],
  ) =>
    setShifts((p) =>
      p.map((s) => (s.id === shiftId ? { ...s, duties: updater(s.duties) } : s)),
    );

  const copyDutiesFrom = (targetShiftId: string, sourceShiftId: string) => {
    const source = shifts.find((s) => s.id === sourceShiftId);
    if (!source) return;
    const cloned: WDuty[] = source.duties.map((d) => ({
      id: uid("d"),
      title: d.title,
      roles: [...d.roles],
      coversAreas: d.coversAreas,
      areas: d.areas.map((a) => ({ id: uid("a"), name: a.name, roles: [...a.roles] })),
    }));
    updateShiftDuties(targetShiftId, () => cloned);
    setCopiedFrom((p) => ({ ...p, [targetShiftId]: sourceShiftId }));
    toast({ title: "Duties copied", description: `Copied ${cloned.length} duty(ies) from "${source.name}".` });
  };

  const addRole = (shiftId: string, dutyId: string, raw: string) => {
    const role = raw.trim();
    if (!role) return;
    updateDuty(shiftId, dutyId, {
      roles: Array.from(
        new Set([
          ...(shifts.find((s) => s.id === shiftId)?.duties.find((d) => d.id === dutyId)?.roles ?? []),
          role,
        ]),
      ),
    });
  };
  const removeRole = (shiftId: string, dutyId: string, role: string) => {
    const duty = shifts.find((s) => s.id === shiftId)?.duties.find((d) => d.id === dutyId);
    if (!duty) return;
    updateDuty(shiftId, dutyId, { roles: duty.roles.filter((r) => r !== role) });
  };

  const handleRoleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    shiftId: string,
    dutyId: string,
  ) => {
    const key = `${shiftId}:${dutyId}`;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addRole(shiftId, dutyId, roleInputs[key] || "");
      setRoleInputs((p) => ({ ...p, [key]: "" }));
    }
  };

  // ===== validation =====
  const canNext = () => {
    if (step === 1) return title.trim().length > 1 && startDate && endDate && activeDays.length > 0;
    if (step === 2) return shifts.length > 0 && shifts.every((s) => s.name.trim() && s.startTime && s.endTime);
    if (step === 3) return shifts.length > 0; // duties optional but allowed
    return true;
  };

  const handleSave = async (publish: boolean) => {
    if (saving) return;
    const groupId = localStorage.getItem("group_id") || "";
    const departmentId = localStorage.getItem("department_id") || "";
    const subDeptId = localStorage.getItem("sub_department_id") || undefined;
    const dutyCode = editDutyCode || genDutyCode();
    setSaving(true);
    try {
      if (publish) {
        const payload = buildSchedulePayload(
          { title, startDate, endDate, activeDays, shifts, patientListEnabled, showDutyToNetwork },
          { group_id: groupId, department_id: departmentId, duty_code: dutyCode, sub_department_id: subDeptId },
        );
        await createStaffScheduleTemplate(payload);
        toast({
          title: editDutyCode ? "Schedule updated" : "Schedule published",
          description: `"${title}" is ready for staff assignment.`,
        });
        router.push(
          `/admin/scheduling/view/${encodeURIComponent(dutyCode)}?from=${encodeURIComponent(fromParam)}`,
        );
      } else {
        const templateBody: Record<string, unknown> = {
          name: title,
          group_id: groupId,
          department_id: departmentId,
          config: {
            title,
            is_notify: true,
            is_enabled: true,
            show_duty_to_network: showDutyToNetwork,
            days: activeDays.join(","),
            shifts: shifts.map((shift, sIdx) => ({
              title: shift.name,
              start_time: `${shift.startTime}:00`,
              end_time: `${shift.endTime}:00`,
              sequence: sIdx + 1,
              tasks: shift.duties.map((duty, dIdx) => {
                const task: Record<string, unknown> = { title: duty.title, sequence: dIdx + 1 };
                if (duty.coversAreas && duty.areas.length > 0) {
                  task.areas = duty.areas.map((area, aIdx) => ({
                    title: area.name,
                    sequence: aIdx + 1,
                    coverage: area.roles.map((role, rIdx) => ({ role, sequence: rIdx + 1 })),
                  }));
                } else {
                  task.coverage = duty.roles.map((role, rIdx) => ({ role, sequence: rIdx + 1 }));
                }
                return task;
              }),
            })),
          },
        };
        if (subDeptId) templateBody.sub_department_id = subDeptId;
        await createDutyTemplate(templateBody);
        toast({ title: "Template saved", description: `"${title}" saved as a template. You can find it in the Templates tab.` });
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast({ title: "Error", description: e.message || "Failed to save schedule.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ===== Stepper (horizontal, above body) =====
  const Stepper = (
    <div className="flex items-stretch gap-2 overflow-x-auto">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = step > s.id;
        const active = step === s.id;
        return (
          <button
            key={s.id}
            onClick={() => (done ? setStep(s.id) : null)}
            className={cn(
              "flex-1 min-w-[180px] text-left flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all",
              active && "bg-primary/5 border-primary/30 ring-1 ring-primary/20",
              done && "border-border hover:bg-muted/60 cursor-pointer",
              !done && !active && "border-border opacity-60 cursor-default",
            )}
          >
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors",
                done && "bg-primary border-primary text-primary-foreground",
                active && "border-primary text-primary bg-background",
                !done && !active && "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold leading-none">
                Step {s.id}
              </p>
              <p className={cn("text-sm font-semibold leading-tight mt-0.5", active ? "text-foreground" : "text-foreground/80")}>
                {s.title}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );


  // ===== Empty state helper =====
  const EmptyHint = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
      <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center mb-2">
        <Icon className="h-5 w-5 opacity-60" />
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );

  // ===== Excel export =====
  const exportToExcel = () => {
    if (shifts.length === 0 || scheduleDates.length === 0) {
      toast({ title: "Nothing to export", description: "Add shifts and a date range first." });
      return;
    }
    // Build header rows
    const row1: string[] = ["Date"];
    const row2: string[] = [""];
    const row3: string[] = [""];
    const merges: XLSX.Range[] = [];
    let col = 1;
    shifts.forEach((s, sIdx) => {
      const dutySpans = s.duties.map((d) => dutyLeafCount(d));
      const span = Math.max(dutySpans.reduce((a, b) => a + b, 0), 1);
      const label = `${s.name || `Shift ${sIdx + 1}`}  ${to12h(s.startTime)} - ${to12h(s.endTime)}`;
      row1.push(label);
      for (let i = 1; i < span; i++) row1.push("");
      if (span > 1) merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + span - 1 } });
      if (s.duties.length === 0) {
        row2.push("—"); row3.push("");
      } else {
        let dCol = col;
        s.duties.forEach((d, dIdx) => {
          const dSpan = dutySpans[dIdx];
          const title = d.title || `Duty ${dIdx + 1}`;
          // Row 2: Duty title (spanning all its leaves) — for area duties we encode "Duty › Area"
          if (d.coversAreas) {
            if (d.areas.length === 0) {
              row2.push(title);
              row3.push("");
            } else {
              d.areas.forEach((a) => {
                const aSpan = Math.max(a.roles.length, 1);
                row2.push(`${title} › ${a.name}`);
                for (let i = 1; i < aSpan; i++) row2.push("");
                if (a.roles.length === 0) {
                  row3.push("");
                } else {
                  a.roles.forEach((r) => row3.push(r));
                }
              });
            }
          } else {
            row2.push(title);
            for (let i = 1; i < dSpan; i++) row2.push("");
            if (d.roles.length === 0) row3.push("");
            else d.roles.forEach((r) => row3.push(r));
          }
          if (dSpan > 1) merges.push({ s: { r: 1, c: dCol }, e: { r: 1, c: dCol + dSpan - 1 } });
          dCol += dSpan;
        });
      }
      col += span;
    });
    // Date column merge across 3 header rows
    merges.push({ s: { r: 0, c: 0 }, e: { r: 2, c: 0 } });

    const body = scheduleDates.map((dt) => {
      const r: string[] = [`${dt.dateNum} ${dt.dayLabel}`];
      shifts.forEach((s) => {
        if (s.duties.length === 0) {
          r.push("");
        } else {
          s.duties.forEach((d) => {
            const dSpan = dutyLeafCount(d);
            for (let i = 0; i < dSpan; i++) r.push("");
          });
        }
      });
      return r;
    });

    const totalCols = row1.length;
    const titleRows: string[][] = [];
    const titleMerges: XLSX.Range[] = [];
    const pad = (arr: string[]) => { while (arr.length < totalCols) arr.push(""); return arr; };
    if (title) {
      titleRows.push(pad([title]));
      titleMerges.push({ s: { r: titleRows.length - 1, c: 0 }, e: { r: titleRows.length - 1, c: totalCols - 1 } });
    }
    titleRows.push(pad(["(Departmental On-Call Rota)"]));
    titleMerges.push({ s: { r: titleRows.length - 1, c: 0 }, e: { r: titleRows.length - 1, c: totalCols - 1 } });
    if (startDate && endDate) {
      const range = `(${new Date(startDate).toLocaleDateString(undefined, { month: "long", day: "2-digit", year: "numeric" })} – ${new Date(endDate).toLocaleDateString(undefined, { month: "long", day: "2-digit", year: "numeric" })})`;
      titleRows.push(pad([range]));
      titleMerges.push({ s: { r: titleRows.length - 1, c: 0 }, e: { r: titleRows.length - 1, c: totalCols - 1 } });
    }
    titleRows.push(pad([""])); // spacer

    const offset = titleRows.length;
    const shiftedHeaderMerges = merges.map((m) => ({ s: { r: m.s.r + offset, c: m.s.c }, e: { r: m.e.r + offset, c: m.e.c } }));

    const ws = XLSX.utils.aoa_to_sheet([...titleRows, row1, row2, row3, ...body]);
    ws["!merges"] = [...titleMerges, ...shiftedHeaderMerges];
    ws["!cols"] = row1.map(() => ({ wch: 18 }));
    // Style title rows (center align, bold)
    titleRows.forEach((_, i) => {
      const cell = ws[XLSX.utils.encode_cell({ r: i, c: 0 })];
      if (cell) cell.s = { alignment: { horizontal: "center" }, font: { bold: true, sz: i === 0 ? 14 : 11 } };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Schedule");
    XLSX.writeFile(wb, `${(title || "schedule").replace(/\s+/g, "_")}.xlsx`);
    toast({ title: "Exported", description: "Excel file downloaded." });
  };

  // ===== Excel import =====
  const importFromExcel = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("No sheet found");
      const aoa: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as string[][];
      const merges = (ws["!merges"] || []) as XLSX.Range[];
      const spanAt = (r: number, c: number) => {
        for (const m of merges) {
          if (m.s.r === r && m.s.c === c) return m.e.c - m.s.c + 1;
        }
        return 1;
      };
      const isMergedAway = (r: number, c: number) => {
        for (const m of merges) {
          if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c && !(r === m.s.r && c === m.s.c)) return true;
        }
        return false;
      };

      // locate header row where col 0 === "Date"
      const headerRow = aoa.findIndex((row) => (row?.[0] || "").toString().trim().toLowerCase() === "date");
      if (headerRow < 0) throw new Error('Could not find "Date" header row');
      const row1 = aoa[headerRow] || [];
      const row2 = aoa[headerRow + 1] || [];
      const row3 = aoa[headerRow + 2] || [];

      // Pull title and date range from rows above header
      let importedTitle = "";
      let importedStart = "";
      let importedEnd = "";
      for (let i = 0; i < headerRow; i++) {
        const v = (aoa[i]?.[0] || "").toString().trim();
        if (!v) continue;
        if (v === "(Departmental On-Call Rota)") continue;
        const m = v.match(/\(([^–-]+?)\s*[–-]\s*([^)]+)\)/);
        if (m) {
          const d1 = new Date(m[1].trim());
          const d2 = new Date(m[2].trim());
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            importedStart = formatDateInput(d1);
            importedEnd = formatDateInput(d2);
            continue;
          }
        }
        if (!importedTitle) importedTitle = v;
      }

      const totalCols = Math.max(row1.length, row2.length, row3.length);
      const newShifts: WShift[] = [];
      let c = 1;
      while (c < totalCols) {
        const label = (row1[c] || "").toString().trim();
        if (!label) { c++; continue; }
        const shiftSpan = spanAt(headerRow, c) || 1;
        // Parse "Name  H:MM AM - H:MM PM"
        const tm = label.match(/^(.*?)\s{1,}(\d{1,2}:\d{2}\s*[APap][Mm])\s*[-–]\s*(\d{1,2}:\d{2}\s*[APap][Mm])\s*$/);
        const shiftName = tm ? tm[1].trim() : label;
        const to24 = (s: string) => {
          const mm = s.match(/(\d{1,2}):(\d{2})\s*([APap][Mm])/);
          if (!mm) return "";
          let h = parseInt(mm[1], 10);
          const min = mm[2];
          const ap = mm[3].toUpperCase();
          if (ap === "PM" && h !== 12) h += 12;
          if (ap === "AM" && h === 12) h = 0;
          return `${String(h).padStart(2, "0")}:${min}`;
        };
        const startTime = tm ? to24(tm[2]) : "08:00";
        const endTime = tm ? to24(tm[3]) : "16:00";

        const duties: WDuty[] = [];
        let d = c;
        const shiftEnd = c + shiftSpan;
        while (d < shiftEnd) {
          const dTitleRaw = (row2[d] || "").toString().trim();
          if (!dTitleRaw && !isMergedAway(headerRow + 1, d)) {
            // empty placeholder
            d++;
            continue;
          }
          if (isMergedAway(headerRow + 1, d)) { d++; continue; }
          const dSpan = spanAt(headerRow + 1, d) || 1;
          // Detect "Duty › Area" pattern
          if (dTitleRaw.includes("›")) {
            // Group consecutive area-cells with same duty title
            const [dutyTitle, firstArea] = dTitleRaw.split("›").map((s) => s.trim());
            const areas: WArea[] = [];
            const collectArea = (areaName: string, startCol: number, span: number) => {
              const roles: string[] = [];
              for (let rc = startCol; rc < startCol + span; rc++) {
                const r = (row3[rc] || "").toString().trim();
                if (r) roles.push(r);
              }
              areas.push({ id: uid("a"), name: areaName, roles });
            };
            collectArea(firstArea, d, dSpan);
            let nd = d + dSpan;
            while (nd < shiftEnd) {
              const ndRaw = (row2[nd] || "").toString().trim();
              if (!ndRaw.includes("›")) break;
              const [ndDuty, ndArea] = ndRaw.split("›").map((s) => s.trim());
              if (ndDuty !== dutyTitle) break;
              const ndSpan = spanAt(headerRow + 1, nd) || 1;
              collectArea(ndArea, nd, ndSpan);
              nd += ndSpan;
            }
            duties.push({ id: uid("d"), title: dutyTitle, roles: [], coversAreas: true, areas });
            d = nd;
          } else {
            const roles: string[] = [];
            for (let rc = d; rc < d + dSpan; rc++) {
              const r = (row3[rc] || "").toString().trim();
              if (r) roles.push(r);
            }
            duties.push({ id: uid("d"), title: dTitleRaw, roles, coversAreas: false, areas: [] });
            d += dSpan;
          }
        }

        newShifts.push({ id: uid("s"), name: shiftName, startTime, endTime, duties });
        c += shiftSpan;
      }

      if (newShifts.length === 0) throw new Error("No shifts detected");

      // Apply state
      if (importedTitle) setTitle(importedTitle);
      if (importedStart) setStartDate(importedStart);
      if (importedEnd) setEndDate(importedEnd);
      if (importedStart && importedEnd) {
        // Activate weekdays present in range
        const s = new Date(importedStart), e = new Date(importedEnd);
        const map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const days = new Set<string>();
        const cur = new Date(s);
        let g = 0;
        while (cur <= e && g < 400) { days.add(map[cur.getDay()]); cur.setDate(cur.getDate() + 1); g++; }
        setActiveDays(Array.from(days));
      }
      setShifts(newShifts);
      setShiftCount(newShifts.length);
      toast({ title: "Imported", description: `Loaded ${newShifts.length} shift(s) and ${newShifts.reduce((n, s) => n + s.duties.length, 0)} duties.` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err?.message || "Could not parse the file.", variant: "destructive" as any });
    }
  };

  // ===== Live Preview (Excel-style table only) =====
  const Preview = (
    <div className="space-y-4">
      {/* Shift × Duty TABLE — Excel-style */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
          <TableIcon className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Schedule sheet</h4>
          <Badge variant="outline" className="text-[10px]">
            {shifts.length} {shifts.length === 1 ? "shift" : "shifts"} · {shifts.reduce((n, s) => n + s.duties.length, 0)} duties
          </Badge>
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => window.print()} className="h-7 gap-1.5 text-xs">
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            {/* Import Excel removed */}
            <Button size="sm" variant="outline" onClick={exportToExcel} className="h-7 gap-1.5 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
            </Button>
          </div>
        </div>

        {/* Document title block (like printed rota) */}
        {(title || (startDate && endDate)) && (
          <div className="px-4 py-5 text-center border-b border-border bg-card">
            {title && (
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {title}
              </h2>
            )}
            <p className="text-sm font-semibold text-muted-foreground mt-1">
              (Departmental On-Call Rota)
            </p>
            {startDate && endDate && (
              <p className="text-sm font-semibold text-foreground/80 mt-2">
                ({new Date(startDate).toLocaleDateString(undefined, { month: "long", day: "2-digit", year: "numeric" })} – {new Date(endDate).toLocaleDateString(undefined, { month: "long", day: "2-digit", year: "numeric" })})
              </p>
            )}
          </div>
        )}

        {shifts.length === 0 ? (
          <EmptyHint icon={Clock} text="No shifts yet — choose how each day is split." />
        ) : scheduleDates.length === 0 ? (
          <EmptyHint icon={CalendarIcon} text="Pick a date range and active days to see the table." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0 min-w-[900px]">
              {/* Top header: shift bands */}
              <thead>
                <tr>
                  <th
                    rowSpan={4}
                    className="text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-3 py-3 bg-muted/30 border-b border-r border-border w-[88px] min-w-[88px] max-w-[88px] align-middle"
                  >
                    Date
                  </th>
                  {shifts.map((s, sIdx) => {
                    const c = getShiftPalette(s.name, sIdx);
                    const Icon = shiftIcon(s.startTime);
                    const span = Math.max(
                      s.duties.reduce((n, d) => n + dutyLeafCount(d), 0),
                      1,
                    );
                    return (
                      <th
                        key={`sh-${s.id}`}
                        colSpan={span}
                        className={cn(
                          "px-3 py-3 text-center border-b border-r border-border last:border-r-0",
                          c.bg,
                        )}
                      >
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", c.text)} />
                            <span className={cn("text-base font-bold", c.text)}>
                              {s.name || `Shift ${sIdx + 1}`}
                            </span>
                          </div>
                          <span className={cn("text-xs font-mono opacity-80", c.text)}>
                            {to12h(s.startTime)} – {to12h(s.endTime)}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>

                {/* Row 2 — Duty title (spans all leaves under it) */}
                <tr>
                  {shifts.map((s, sIdx) => {
                    const c = getShiftPalette(s.name, sIdx);
                    if (s.duties.length === 0) {
                      return (
                        <th
                          key={`dh-empty-${s.id}`}
                          rowSpan={3}
                          className={cn("px-2 py-2 text-center border-b border-r border-border text-[11px] italic text-muted-foreground/70", c.bg)}
                        >
                          no duties
                        </th>
                      );
                    }
                    return s.duties.map((d, dIdx) => (
                      <th
                        key={`dh-${d.id}`}
                        colSpan={dutyLeafCount(d)}
                        className={cn("px-2 py-2 text-center border-b border-r border-border", c.bg)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className={cn("text-sm font-semibold", c.text)}>
                            {d.title || `Duty ${dIdx + 1}`}
                          </span>
                        </div>
                      </th>
                    ));
                  })}
                </tr>

                {/* Row 3 — Area row for area-duties; for general duties this row holds the role pills (rowSpan=2) */}
                <tr>
                  {shifts.map((s, sIdx) => {
                    const c = getShiftPalette(s.name, sIdx);
                    if (s.duties.length === 0) return null;
                    return s.duties.map((d) => {
                      if (!d.coversAreas) {
                        if (d.roles.length === 0) {
                          return (
                            <th
                              key={`rh-empty-${d.id}`}
                              rowSpan={2}
                              className={cn("px-2 py-2 text-center border-b border-r border-border align-middle", c.bg)}
                            >
                              <span className="inline-block text-[10px] px-2 py-0.5 rounded border border-dashed border-border/60 text-muted-foreground/50">
                                role
                              </span>
                            </th>
                          );
                        }
                        return d.roles.map((r, rIdx) => (
                          <th
                            key={`rh-${d.id}-${r}-${rIdx}`}
                            rowSpan={2}
                            className={cn("px-2 py-2 text-center border-b border-r border-border align-middle", c.bg)}
                          >
                            <span className={cn("text-xs font-medium", c.pillText)}>
                              {r}
                            </span>
                          </th>
                        ));
                      }
                      if (d.areas.length === 0) {
                        return (
                          <th
                            key={`ah-empty-${d.id}`}
                            className={cn("px-2 py-2 text-center border-b border-r border-border", c.areaBg)}
                          >
                            <span className={cn("inline-block text-[10px] px-2 py-0.5 rounded border border-dashed", c.pillBorder, c.areaText, "opacity-70")}>
                              add an area
                            </span>
                          </th>
                        );
                      }
                      return d.areas.map((a) => (
                        <th
                          key={`ah-${a.id}`}
                          colSpan={Math.max(a.roles.length, 1)}
                          className={cn("px-2 py-1.5 text-center border-b border-r border-border", c.areaBg)}
                        >
                          <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", c.areaText)}>
                            <MapPin className="h-3 w-3" />
                            {a.name}
                          </span>
                        </th>
                      ));
                    });
                  })}
                </tr>

                {/* Row 4 — Role pills under each area (area-duties only; general duties already covered by rowSpan above) */}
                <tr>
                  {shifts.map((s, sIdx) => {
                    const c = getShiftPalette(s.name, sIdx);
                    if (s.duties.length === 0) return null;
                    return s.duties.map((d) => {
                      if (!d.coversAreas) return null;
                      if (d.areas.length === 0) {
                        return (
                          <th
                            key={`rh-empty-area-${d.id}`}
                            className={cn("px-2 py-2 text-center border-b border-r border-border", c.bg)}
                          >
                            <span className="inline-block text-[10px] px-2 py-0.5 rounded border border-dashed border-border/60 text-muted-foreground/50">
                              role
                            </span>
                          </th>
                        );
                      }
                      return d.areas.map((a) => {
                        if (a.roles.length === 0) {
                          return (
                            <th
                              key={`rh-area-empty-${a.id}`}
                              className={cn("px-2 py-2 text-center border-b border-r border-border", c.bg)}
                            >
                              <span className="inline-block text-[10px] px-2 py-0.5 rounded border border-dashed border-border/60 text-muted-foreground/50">
                                role
                              </span>
                            </th>
                          );
                        }
                        return a.roles.map((r, rIdx) => (
                          <th
                            key={`rh-${a.id}-${r}-${rIdx}`}
                            className={cn("px-2 py-2 text-center border-b border-r border-border", c.bg)}
                          >
                            <span className={cn("text-xs font-medium", c.pillText)}>
                              {r}
                            </span>
                          </th>
                        ));
                      });
                    });
                  })}
                </tr>

              </thead>

              <tbody>
                {scheduleDates.map((date) => (
                  <tr key={date.key}>
                    <td className="px-3 py-2 border-b border-r border-border bg-muted/20 align-middle w-[88px] min-w-[88px] max-w-[88px]">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {date.dayLabel}
                      </p>
                      <p className="text-base font-bold text-foreground leading-none mt-0.5">
                        {date.dateNum}
                      </p>
                    </td>
                    {shifts.map((s) => {
                      if (s.duties.length === 0) {
                        return (
                          <td
                            key={`cell-empty-${s.id}-${date.key}`}
                            className="border-b border-r border-border bg-card px-1 py-1 w-[140px] min-w-[140px] max-w-[140px]"
                          >
                            <div className="h-10 rounded-lg border border-dashed border-border/40 bg-muted/10" />
                          </td>
                        );
                      }
                      return s.duties.map((d) => {
                        const leaves = dutyLeafCount(d);
                        return Array.from({ length: leaves }).map((_, i) => (
                          <td
                            key={`cell-${d.id}-${date.key}-${i}`}
                            className="border-b border-r border-border bg-card px-1 py-1 align-middle text-center w-[140px] min-w-[140px] max-w-[140px]"
                          >
                            <div className="h-10 rounded-lg border border-dashed border-border/40 bg-muted/5" />
                          </td>
                        ));
                      });
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {overlapWarnings.length > 0 && (
          <div className="m-3 rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-0.5">
              {overlapWarnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          </div>
        )}
      </div>

    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />
      <main className={cn("flex-1 transition-all duration-300", sidebarMargin)}>
        {/* Top bar */}
        <div className="border-b border-border/60 bg-card/50 backdrop-blur sticky top-0 z-20">
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push(fromParam)} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Add a schedule</h1>
              <p className="text-xs text-muted-foreground">A guided assistant — no training needed.</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-[1600px] mx-auto px-6 py-6 pb-32">
          {/* Stepper above */}
          <Card className="p-3 mb-5">{Stepper}</Card>

          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* LEFT 30% — scrollable setup panel */}
            <div className="lg:col-span-3">
              <div className="lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto lg:pr-1 space-y-5">

                <Card className="p-5">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      {step === 1 && (
                        <div className="space-y-5">
                          <div>
                            <h2 className="text-base font-bold text-foreground">
                              Let's start with the basics
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                              A few quick questions to set things up.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">What would you like to call this schedule?</Label>
                            <Input
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="e.g. March 2026 On-Duty"
                              className="h-11 text-base bg-card"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-sm">Start date</Label>
                              <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                disabled={isEdit}
                                className="h-11 text-base bg-card"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">End date</Label>
                              <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                disabled={isEdit}
                                className="h-11 text-base bg-card"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Which days are active?</Label>
                            <div className="flex flex-wrap gap-2">
                              {DAYS.map((d) => {
                                const on = activeDays.includes(d.key);
                                return (
                                  <button
                                    key={d.key}
                                    type="button"
                                    onClick={() => !isEdit && toggleDay(d.key)}
                                    disabled={isEdit}
                                    className={cn(
                                      "px-4 py-2.5 rounded-full border text-sm font-medium transition-all",
                                      on
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-background border-border text-foreground hover:border-primary/40",
                                      isEdit && "opacity-60 cursor-not-allowed",
                                    )}
                                  >
                                    {d.key}
                                  </button>
                                );
                              })}
                            </div>
                            <p className="text-xs text-muted-foreground">Tap to add or remove a day.</p>
                          </div>
                        </div>
                      )}

                      {step === 2 && (
                        <div className="space-y-5">
                          <div>
                            <h2 className="text-base font-bold text-foreground">
                              How many shifts do you want each day?
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                              Pick a count and we'll set up the times. You can edit them after.
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                              <button
                                key={n}
                                onClick={() => !isEdit && pickShiftCount(n)}
                                disabled={isEdit}
                                title={`${n} ${n === 1 ? "shift" : "shifts"}`}
                                className={cn(
                                  "h-9 w-9 rounded-full border-2 text-sm font-bold flex items-center justify-center transition-all",
                                  shiftCount === n
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border text-foreground hover:border-primary/40",
                                  isEdit && "opacity-60 cursor-not-allowed",
                                )}
                              >
                                {n}
                              </button>
                            ))}
                          </div>


                          {shifts.length > 0 && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm">Your shifts</Label>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Drag to reorder. Tap a field to edit.
                                </p>

                                <Reorder.Group axis="y" values={shifts} onReorder={isEdit ? () => {} : setShifts} className="space-y-2">
                                  {shifts.map((s, idx) => {
                                    const c = getShiftPalette(s.name, idx);
                                    return (
                                      <Reorder.Item
                                        key={s.id}
                                        value={s}
                                        dragListener={!isEdit}
                                        className={cn("rounded-xl border p-3 bg-card", c.border)}
                                      >
                                        <div className="flex items-center gap-2 mb-2">
                                          
                                          <span className={cn("h-2 w-2 rounded-full", c.dot)} />
                                          <Input
                                            value={s.name}
                                            onChange={(e) => updateShift(s.id, { name: e.target.value })}
                                            placeholder="Shift name — e.g. Morning"
                                            className="h-9 text-sm font-semibold bg-card"
                                          />
                                          {shifts.length > 1 && !isEdit && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                              onClick={() => removeShift(s.id)}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <Label className="text-[10px] text-muted-foreground">Starts</Label>
                                            <Input
                                              type="time"
                                              value={s.startTime}
                                              onChange={(e) => updateShift(s.id, { startTime: e.target.value })}
                                              disabled={isEdit}
                                              className="h-9 bg-card"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-[10px] text-muted-foreground">Ends</Label>
                                            <Input
                                              type="time"
                                              value={s.endTime}
                                              onChange={(e) => updateShift(s.id, { endTime: e.target.value })}
                                              disabled={isEdit}
                                              className="h-9 bg-card"
                                            />
                                          </div>
                                        </div>
                                      </Reorder.Item>
                                    );
                                  })}
                                </Reorder.Group>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {step === 3 && (
                        <div className="space-y-5">
                          <div>
                            <h2 className="text-base font-bold text-foreground">
                              Add duties to each shift
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                              Give each duty a title (e.g. "1st On Call"). Each tag you add represents
                              one person who will cover that duty.
                            </p>
                          </div>

                          {shifts.length === 0 ? (
                            <div className="rounded-xl border border-dashed p-6 text-center">
                              <p className="text-sm text-muted-foreground">
                                Go back to step 2 to add at least one shift first.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {shifts.map((s, idx) => {
                                const c = getShiftPalette(s.name, idx);
                                return (
                                  <div key={s.id} className={cn("rounded-xl border p-3", c.border, c.bg)}>
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className={cn("h-2 w-2 rounded-full flex-shrink-0", c.dot)} />
                                      <p className={cn("text-sm font-semibold", c.text)}>
                                        {s.name || `Shift ${idx + 1}`}
                                      </p>
                                      <span className={cn("text-[11px] font-mono ml-auto", c.text)}>
                                        {to12h(s.startTime)} – {to12h(s.endTime)}
                                      </span>
                                    </div>

                                    {(() => {
                                      if (isEdit) return null;
                                      const copiedSourceId = s.duties.length > 0 ? copiedFrom[s.id] : undefined;
                                      const otherShiftsWithDuties = shifts.filter(
                                        (os) => os.id !== s.id && os.duties.length > 0 && os.id !== copiedSourceId,
                                      );
                                      if (otherShiftsWithDuties.length === 0) return null;
                                      return (
                                        <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-border bg-card/60 px-2 py-1.5">
                                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                          <span className="text-[11px] text-muted-foreground">
                                            {s.duties.length > 0 ? "Replace with copy from:" : "Same as another shift?"}
                                          </span>
                                          {otherShiftsWithDuties.map((os) => (
                                            <button
                                              key={os.id}
                                              onClick={() => copyDutiesFrom(s.id, os.id)}
                                              className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                                            >
                                              Copy from "{os.name}"
                                            </button>
                                          ))}
                                        </div>
                                      );
                                    })()}

                                    <div className="space-y-2">
                                      {s.duties.length === 0 && (
                                        <p className="text-xs text-muted-foreground italic px-1">
                                          No duties yet for this shift.
                                        </p>
                                      )}
                                      {s.duties.map((d, dIdx) => {
                                        const key = `${s.id}:${d.id}`;
                                        const addArea = (name: string) => {
                                          const trimmed = name.trim();
                                          if (!trimmed) return;
                                          if (d.areas.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) return;
                                          updateDuty(s.id, d.id, { areas: [...d.areas, { id: uid("a"), name: trimmed, roles: [] }] });
                                        };
                                        const renameArea = (areaId: string, name: string) => {
                                          updateDuty(s.id, d.id, { areas: d.areas.map((a) => (a.id === areaId ? { ...a, name } : a)) });
                                        };
                                        const removeArea = (areaId: string) => {
                                          const next = d.areas.filter((a) => a.id !== areaId);
                                          if (next.length === 0) {
                                            updateDuty(s.id, d.id, { areas: [], coversAreas: false });
                                          } else {
                                            updateDuty(s.id, d.id, { areas: next });
                                          }
                                        };
                                        const addAreaRole = (areaId: string, role: string) => {
                                          const r = role.trim();
                                          if (!r) return;
                                          updateDuty(s.id, d.id, {
                                            areas: d.areas.map((a) =>
                                              a.id === areaId && !a.roles.includes(r) ? { ...a, roles: [...a.roles, r] } : a,
                                            ),
                                          });
                                        };
                                        const removeAreaRole = (areaId: string, role: string) => {
                                          updateDuty(s.id, d.id, {
                                            areas: d.areas.map((a) =>
                                              a.id === areaId ? { ...a, roles: a.roles.filter((x) => x !== role) } : a,
                                            ),
                                          });
                                        };
                                        return (
                                          <div
                                            key={d.id}
                                            className="rounded-lg bg-card border p-3 space-y-3"
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                {dIdx + 1}
                                              </span>
                                              <Input
                                                value={d.title}
                                                onChange={(e) => updateDuty(s.id, d.id, { title: e.target.value })}
                                                placeholder="Duty title — e.g. 1st On Call"
                                                className="h-9 bg-card"
                                              />
                                              {!isEdit && (
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                  onClick={() => removeDuty(s.id, d.id)}
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                              )}
                                            </div>

                                            {/* Coverage toggle */}
                                            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                                              <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2 min-w-0">
                                                  <LayoutGrid className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                  <p className="text-sm font-semibold text-foreground leading-tight">
                                                    Does this duty cover specific areas?
                                                  </p>
                                                </div>
                                                <Switch
                                                  checked={!!d.coversAreas}
                                                  disabled={isEdit}
                                                  onCheckedChange={(checked) =>
                                                    updateDuty(s.id, d.id, checked ? { coversAreas: true } : { coversAreas: false, areas: [] })
                                                  }
                                                />
                                              </div>
                                              <p className="text-[11px] text-muted-foreground leading-snug">
                                                {d.coversAreas
                                                  ? "Add areas (e.g. Unit A, Unit B). Each area gets its own people."
                                                  : "This duty applies generally to the whole shift."}
                                              </p>
                                            </div>

                                            <AnimatePresence mode="wait" initial={false}>
                                              {!d.coversAreas ? (
                                                <motion.div
                                                  key="general"
                                                  initial={{ opacity: 0, height: 0 }}
                                                  animate={{ opacity: 1, height: "auto" }}
                                                  exit={{ opacity: 0, height: 0 }}
                                                  transition={{ duration: 0.18 }}
                                                  className="space-y-2 overflow-hidden"
                                                >
                                                  <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-semibold text-foreground">People to cover</Label>
                                                    <span className="text-[10px] text-muted-foreground">
                                                      {d.roles.length} {d.roles.length === 1 ? "person" : "people"}
                                                    </span>
                                                  </div>

                                                  {d.roles.length > 0 && (
                                                    <div className="space-y-1.5">
                                                      {d.roles.map((r, rIdx) => (
                                                        <div key={`${r}-${rIdx}`} className="flex items-center gap-2">
                                                          <span className="h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                            {rIdx + 1}
                                                          </span>
                                                          <Input
                                                            value={r}
                                                            onChange={(e) => {
                                                              const next = [...d.roles];
                                                              next[rIdx] = e.target.value;
                                                              updateDuty(s.id, d.id, { roles: next });
                                                            }}
                                                            className="h-9 text-sm bg-card border-border rounded-lg shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary focus-visible:outline-none transition-all"
                                                          />
                                                          {!isEdit && (
                                                            <Button
                                                              variant="ghost"
                                                              size="icon"
                                                              className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                                                              onClick={() => removeRole(s.id, d.id, r)}
                                                            >
                                                              <X className="h-3.5 w-3.5" />
                                                            </Button>
                                                          )}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}

                                                  {!isEdit && (
                                                    <div className="relative group">
                                                      <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                                                      <Input
                                                        value={roleInputs[key] || ""}
                                                        onChange={(e) => setRoleInputs((p) => ({ ...p, [key]: e.target.value }))}
                                                        onKeyDown={(e) => {
                                                          if (e.key === "Enter" || e.key === ",") {
                                                            e.preventDefault();
                                                            const val = (roleInputs[key] || "").trim();
                                                            if (!val) return;
                                                            addRole(s.id, d.id, val);
                                                            setRoleInputs((p) => ({ ...p, [key]: "" }));
                                                          }
                                                        }}
                                                        placeholder="Add role — press Enter"
                                                        className="h-10 pl-9 pr-16 text-sm bg-card border-border rounded-lg shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary focus-visible:outline-none transition-all"
                                                      />
                                                      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-border bg-muted/70 text-muted-foreground pointer-events-none">
                                                        ↵ Enter
                                                      </kbd>
                                                    </div>
                                                  )}

                                                </motion.div>
                                              ) : (
                                                <motion.div
                                                  key="areas"
                                                  initial={{ opacity: 0, height: 0 }}
                                                  animate={{ opacity: 1, height: "auto" }}
                                                  exit={{ opacity: 0, height: 0 }}
                                                  transition={{ duration: 0.18 }}
                                                  className="space-y-2 overflow-hidden"
                                                >
                                                  <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-semibold text-foreground">
                                                      What areas does this duty cover?
                                                    </Label>
                                                    <span className="text-[10px] text-muted-foreground">
                                                      {d.areas.length} {d.areas.length === 1 ? "area" : "areas"}
                                                    </span>
                                                  </div>

                                                  <AnimatePresence initial={false}>
                                                    {d.areas.map((a, aIdx) => {
                                                      const areaKey = `${s.id}:${d.id}:${a.id}`;
                                                      return (
                                                        <motion.div
                                                          key={a.id}
                                                          initial={{ opacity: 0, y: -4 }}
                                                          animate={{ opacity: 1, y: 0 }}
                                                          exit={{ opacity: 0, y: -4 }}
                                                          transition={{ duration: 0.15 }}
                                                          className="rounded-lg border border-border bg-card p-2.5 space-y-2 ml-2"
                                                        >
                                                          <div className="flex items-center gap-2">
                                                            <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                                            <Input
                                                              value={a.name}
                                                              onChange={(e) => renameArea(a.id, e.target.value)}
                                                              placeholder={`Area ${aIdx + 1} — e.g. Unit A`}
                                                              className="h-9 text-sm bg-card border-border rounded-lg shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary focus-visible:outline-none transition-all"
                                                            />
                                                            {!isEdit && (
                                                              <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                onClick={() => removeArea(a.id)}
                                                              >
                                                                <X className="h-3.5 w-3.5" />
                                                              </Button>
                                                            )}
                                                          </div>

                                                          {a.roles.length > 0 && (
                                                            <div className="space-y-1.5 pl-5">
                                                              {a.roles.map((r, rIdx) => (
                                                                <div key={`${r}-${rIdx}`} className="flex items-center gap-2">
                                                                  <span className="h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                                    {rIdx + 1}
                                                                  </span>
                                                                  <Input
                                                                    value={r}
                                                                    onChange={(e) => {
                                                                      const next = [...a.roles];
                                                                      next[rIdx] = e.target.value;
                                                                      updateDuty(s.id, d.id, {
                                                                        areas: d.areas.map((x) => (x.id === a.id ? { ...x, roles: next } : x)),
                                                                      });
                                                                    }}
                                                                    className="h-9 text-sm bg-card border-border rounded-lg shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary focus-visible:outline-none transition-all"
                                                                  />
                                                                  {!isEdit && (
                                                                    <Button
                                                                      variant="ghost"
                                                                      size="icon"
                                                                      className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                                                                      onClick={() => removeAreaRole(a.id, r)}
                                                                    >
                                                                      <X className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                  )}
                                                                </div>
                                                              ))}
                                                            </div>
                                                          )}

                                                          {!isEdit && (
                                                            <div className="relative pl-5 group">
                                                              <UserPlus className="absolute left-8 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                                                              <Input
                                                                value={roleInputs[areaKey] || ""}
                                                                onChange={(e) => setRoleInputs((p) => ({ ...p, [areaKey]: e.target.value }))}
                                                                onKeyDown={(e) => {
                                                                  if (e.key === "Enter" || e.key === ",") {
                                                                    e.preventDefault();
                                                                    const val = (roleInputs[areaKey] || "").trim();
                                                                    if (!val) return;
                                                                    addAreaRole(a.id, val);
                                                                    setRoleInputs((p) => ({ ...p, [areaKey]: "" }));
                                                                  }
                                                                }}
                                                                placeholder={`Add role for ${a.name || "this area"} — Enter`}
                                                                className="h-10 pl-9 pr-16 text-sm bg-card border-border rounded-lg shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary focus-visible:outline-none transition-all"
                                                              />
                                                              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-border bg-muted/70 text-muted-foreground pointer-events-none">
                                                                ↵ Enter
                                                              </kbd>
                                                            </div>
                                                          )}
                                                        </motion.div>
                                                      );
                                                    })}
                                                  </AnimatePresence>

                                                  {!isEdit && (
                                                    <div className="relative group">
                                                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                                                      <Input
                                                        value={roleInputs[`area:${key}`] || ""}
                                                        onChange={(e) => setRoleInputs((p) => ({ ...p, [`area:${key}`]: e.target.value }))}
                                                        onKeyDown={(e) => {
                                                          if (e.key === "Enter" || e.key === ",") {
                                                            e.preventDefault();
                                                            const val = (roleInputs[`area:${key}`] || "").trim();
                                                            if (!val) return;
                                                            addArea(val);
                                                            setRoleInputs((p) => ({ ...p, [`area:${key}`]: "" }));
                                                          }
                                                        }}
                                                        placeholder="Add an area — e.g. Unit A"
                                                        className="h-10 pl-9 pr-16 text-sm bg-card border-border rounded-lg shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary focus-visible:outline-none transition-all"
                                                      />
                                                      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-border bg-muted/70 text-muted-foreground pointer-events-none">
                                                        ↵ Enter
                                                      </kbd>
                                                    </div>
                                                  )}

                                                </motion.div>
                                              )}
                                            </AnimatePresence>

                                          </div>
                                        );
                                      })}
                                      {!isEdit && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => addDuty(s.id)}
                                          className="gap-1.5 w-full h-11 bg-card border-dashed border-border/70 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all rounded-lg font-medium"
                                        >
                                          <Plus className="h-4 w-4" /> Add another duty in this shift
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        </div>
                      )}

                      {step === 4 && (
                        <div className="space-y-5">
                          <div>
                            <h2 className="text-base font-bold text-foreground">
                              A few final settings
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                              Tune notifications, swaps, and visibility before you publish.
                            </p>
                          </div>

                          {/* On-Duty Patient List */}
                          <div className="rounded-xl border bg-card p-4">
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                <ClipboardList className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">
                                  On-Duty Patient List
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                  Enabling this option creates a temporary Patient List for the
                                  assigned On-Duty users, enhancing collaboration and patient
                                  management during their designated hours.
                                </p>
                              </div>
                              <Switch
                                checked={patientListEnabled}
                                onCheckedChange={setPatientListEnabled}
                              />
                            </div>
                          </div>

                          {/* Publish to Network */}
                          <div className="rounded-xl border bg-card p-4">
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                <Globe className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">
                                  Publish to Network
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                  Show this on-duty schedule to the broader network, allowing other departments and network members to view staff assignments.
                                </p>
                              </div>
                              <Switch
                                checked={showDutyToNetwork}
                                onCheckedChange={setShowDutyToNetwork}
                              />
                            </div>
                          </div>

                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </Card>
              </div>
            </div>

            {/* RIGHT 70% */}
            <div className="lg:col-span-7">
              <div className="lg:sticky lg:top-[88px]">{Preview}</div>
            </div>
          </div>
        </div>

        {/* Sticky bottom action bar */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur z-30">
          <div className={cn("max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-3", sidebarMargin)}>
            <Button
              variant="ghost"
              onClick={() => (step === 1 ? router.push(fromParam) : setStep(step - 1))}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Step {step} of {STEPS.length}</span>
              <div className="flex-1 max-w-[200px] h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(step / STEPS.length) * 100}%` }}
                />
              </div>
            </div>
            {!isEdit && (
              <Button variant="outline" onClick={() => void handleSave(false)} disabled={saving} className="gap-1.5">
                <Save className="h-4 w-4" /> Save draft
              </Button>
            )}
            {step < STEPS.length ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-1.5">
                Next step <ArrowRight className="h-4 w-4" />
              </Button>
            ) : isEdit ? (
              <Button onClick={() => void handleSave(true)} disabled={!canNext() || saving} className="gap-1.5">
                <Save className="h-4 w-4" /> Save Changes
              </Button>
            ) : (
              <Button onClick={() => setPublishConfirmOpen(true)} disabled={!canNext() || saving} className="gap-1.5">
                <Send className="h-4 w-4" /> Publish
              </Button>
            )}
          </div>
        </div>
      </main>

      <AlertDialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              "{title}" will go live and be visible to staff. You can still edit assignments later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setPublishConfirmOpen(false); void handleSave(true); }}>
              Publish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreateSchedule;
