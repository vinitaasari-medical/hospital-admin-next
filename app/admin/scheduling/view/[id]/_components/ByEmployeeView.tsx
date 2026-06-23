'use client';
import { Fragment } from "react";
import { Plus, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleDate { key: string; dayLabel: string; dateNum: string; }

interface Employee { id: string; name: string; avatar: string; photoUrl: string; role: string; rank: string; }

interface AssignmentChip {
  key: string; shiftIdx: number; shiftName: string; shiftLetter: string;
  dutyTitle: string; leafLabel: string; areaName?: string;
}

interface ShiftPaletteEntry { cellBg: string; dot: string; dutyText: string; border: string; }

interface RoleColor { bg: string; text: string; border: string; dot: string; }

interface Props {
  visibleDates: ScheduleDate[];
  roles: string[];
  employees: Employee[];
  assignmentsByEmpDate: Record<string, Record<string, AssignmentChip[]>>;
  roleColors: Record<string, RoleColor>;
  shiftPalette: ShiftPaletteEntry[];
  roleShort: Record<string, string>;
  isSearching: boolean;
  matchesCell: (parts: (string | undefined)[]) => boolean;
  onOpenDutyPicker: (ctx: { empId: string; dateKey: string }) => void;
  onClearAssign: (key: string) => void;
}

const todayKey = new Date().toISOString().split("T")[0];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ByEmployeeView({
  visibleDates,
  roles,
  employees,
  assignmentsByEmpDate,
  roleColors,
  shiftPalette,
  roleShort,
  isSearching,
  matchesCell,
  onOpenDutyPicker,
  onClearAssign,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm border-separate border-spacing-0 min-w-[700px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-muted/40 px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-r border-border w-[180px] min-w-[180px]">
              Employee
            </th>
            {visibleDates.map((date) => {
              const isPast = date.key < todayKey;
              return (
                <th key={`bev-h-${date.key}`} className={cn("px-2 py-2 text-center border-b border-r border-border min-w-[64px]", isPast ? "bg-muted/40 opacity-60" : "bg-muted/30")}>
                  <p className="text-[12px] font-bold text-foreground leading-none">{date.dateNum}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{date.dayLabel}</p>
                </th>
              );
            })}
            <th className="px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border w-16">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => {
            let list = employees.filter((e) => e.role === role);
            if (isSearching) {
              list = list.filter((e) => {
                const chips = Object.values(assignmentsByEmpDate[e.id] || {}).flat();
                return chips.some((c) =>
                  matchesCell([e.name, e.role, e.rank, c.dutyTitle, c.areaName, c.leafLabel, c.shiftName])
                );
              });
            }
            if (list.length === 0) return null;
            const rc = roleColors[role] || { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" };

            return (
              <Fragment key={`bev-role-${role}`}>
                {/* Role header row */}
                <tr>
                  <td
                    colSpan={visibleDates.length + 2}
                    className={cn("px-3 py-2 text-xs font-bold border-b border-border", rc.bg, rc.text)}
                  >
                    {role}s
                    <span className="ml-2 font-normal opacity-70">({list.length})</span>
                  </td>
                </tr>

                {list.map((emp) => {
                  const erc = roleColors[emp.role] || { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" };
                  const empDates = assignmentsByEmpDate[emp.id] || {};
                  const totalShifts = Object.values(empDates).reduce((sum, arr) => sum + arr.length, 0);

                  return (
                    <tr key={`bev-emp-${emp.id}`} className="hover:bg-muted/10 transition-colors">
                      {/* Employee name cell */}
                      <td className="sticky left-0 z-10 bg-card px-3 py-2.5 border-b border-r border-border">
                        <div className="flex items-center gap-2.5">
                          <div className="relative flex-shrink-0">
                            <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ring-2 ring-background shadow-sm", erc.bg, erc.text)}>
                              {emp.photoUrl ? <img src={emp.photoUrl} alt={emp.name} className="h-full w-full object-cover" /> : <span className="text-[11px] font-bold">{emp.avatar}</span>}
                            </div>
                            <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background", erc.bg)}/>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate max-w-[120px] leading-tight">{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[120px] leading-none mt-0.5">{emp.role}</p>
                            <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded border mt-1 inline-block leading-none uppercase tracking-wide", erc.bg, erc.text, erc.border)}>
                              {roleShort?.[emp.role] || emp.role?.slice(0, 3).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date cells */}
                      {visibleDates.map((date) => {
                        const chips = empDates[date.key] || [];
                        const isPast = date.key < todayKey;
                        return (
                          <td key={`bev-cell-${emp.id}-${date.key}`} className={cn("px-1 py-1 border-b border-r border-border align-top", isPast && "bg-muted/20 opacity-60")}>
                            {chips.length === 0 ? (
                              isPast ? (
                                <div className="h-8 rounded border border-dashed border-border/20" />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onOpenDutyPicker?.({ empId: emp.id, dateKey: date.key })}
                                  className="w-full h-8 rounded border-2 border-dashed border-border/30 flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all"
                                >
                                  <Plus className="h-3.5 w-3.5 text-muted-foreground/50" />
                                </button>
                              )
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {chips.map((c) => {
                                  const sc: ShiftPaletteEntry = shiftPalette[c.shiftIdx % shiftPalette.length] || { cellBg: "", dot: "", dutyText: "", border: "" };
                                  const chipMatch = matchesCell([emp.name, emp.role, emp.rank, c.dutyTitle, c.areaName, c.leafLabel, c.shiftName]);
                                  return (
                                    <div
                                      key={c.key}
                                      title={`${c.shiftName} • ${c.dutyTitle}${c.areaName ? ` • ${c.areaName}` : ""} • ${c.leafLabel}`}
                                      className={cn("relative group rounded-lg border overflow-hidden shadow-sm", sc.cellBg, sc.border, isSearching && !chipMatch && "opacity-30")}
                                    >
                                      <div className="flex items-stretch">
                                        {/* Shift accent bar */}
                                        <div className={cn("w-[14px] flex-shrink-0 flex flex-col items-center justify-center py-1", sc.dot)}>
                                          <span className="text-[9px] font-black text-white leading-none">{c.shiftLetter}</span>
                                        </div>
                                        {/* Content */}
                                        <div className="flex-1 px-1.5 py-1 min-w-0">
                                          <p className={cn("text-[10px] font-bold truncate leading-tight", sc.dutyText)}>{c.dutyTitle}</p>
                                          {c.areaName && (
                                            <p className="flex items-center gap-0.5 text-[9px] text-muted-foreground leading-none mt-0.5 truncate">
                                              <MapPin className="h-2 w-2 flex-shrink-0" />{c.areaName}
                                            </p>
                                          )}
                                          <p className="text-[9px] text-muted-foreground/80 leading-none mt-0.5 truncate font-medium">{c.leafLabel}</p>
                                        </div>
                                      </div>
                                      {!isPast && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); onClearAssign?.(c.key); }}
                                          className="absolute top-0 right-0 h-4 w-4 rounded-bl-lg bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                                {!isPast && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenDutyPicker?.({ empId: emp.id, dateKey: date.key })}
                                    className="w-full h-5 rounded border border-dashed border-border/30 flex items-center justify-center hover:border-primary/40 hover:bg-primary/5 transition-all"
                                  >
                                    <Plus className="h-3 w-3 text-muted-foreground/40" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Total */}
                      <td className="px-2 py-2 text-center border-b border-border">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", erc.bg, erc.text, erc.border)}>
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
              <td colSpan={visibleDates.length + 2} className="px-4 py-8 text-center text-sm text-muted-foreground border-b border-border">
                No assignments yet. Switch to <strong>By Shift</strong> view to assign staff.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
