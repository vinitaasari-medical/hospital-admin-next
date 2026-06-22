'use client';
import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleDate { key: string; dayLabel: string; dateNum: string; }

interface Employee { id: string; name: string; avatar: string; photoUrl: string; role: string; rank: string; }

export interface DutySlot {
  key: string; shiftIdx: number; shiftName: string; shiftLetter: string; shiftRange: string;
  dutyTitle: string; leafLabel: string; areaName?: string; takenByName?: string;
}

interface ShiftPaletteEntry { cellBg: string; dot: string; dutyText: string; border: string; }

interface RoleColor { bg: string; text: string; border: string; dot: string; }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee: Employee | null;
  date: ScheduleDate | null;
  slots: DutySlot[];
  shiftPalette: ShiftPaletteEntry[];
  roleColor: RoleColor;
  onAssign: (slotKey: string, applyDates: Set<string>) => void;
  visibleDates: ScheduleDate[];
  isPublished: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WEEKDAY_NAME = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const todayKey = new Date().toISOString().split("T")[0];
const isFuture = (key: string) => key >= todayKey;
const weekdayOf = (key: string) => {
  if (!key) return 0;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DutyPickerDialog({
  open, onOpenChange, employee, date, slots, shiftPalette, roleColor, onAssign, visibleDates, isPublished,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [applyDates, setApplyDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelected(null);
      setApplyDates(date ? new Set([date.key]) : new Set());
    }
  }, [open, date]);

  const openSlots = slots.filter((s) => !s.takenByName);

  const shiftGroups = useMemo(() => {
    const map = new Map<string, {
      shiftIdx: number; shiftName: string; shiftLetter: string; shiftRange: string;
      duties: Map<string, DutySlot[]>;
    }>();
    openSlots.forEach((s) => {
      if (!map.has(s.shiftName)) {
        map.set(s.shiftName, { shiftIdx: s.shiftIdx, shiftName: s.shiftName, shiftLetter: s.shiftLetter, shiftRange: s.shiftRange, duties: new Map() });
      }
      const sg = map.get(s.shiftName)!;
      if (!sg.duties.has(s.dutyTitle)) sg.duties.set(s.dutyTitle, []);
      sg.duties.get(s.dutyTitle)!.push(s);
    });
    return [...map.values()];
  }, [openSlots]);

  const toggleDate = (key: string) =>
    setApplyDates((p) => { const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const handleAdd = () => {
    if (!selected) return;
    onAssign(selected, isPublished ? new Set([date?.key ?? ""]) : applyDates);
    setSelected(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign duty</DialogTitle>
          <DialogDescription>Pick an eligible duty for this employee on this day.</DialogDescription>
        </DialogHeader>

        {/* Employee header */}
        {employee && date && (
          <div className={cn("flex items-center gap-3 p-3 rounded-lg border", roleColor.bg, roleColor.border)}>
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={employee.photoUrl} alt={employee.name} />
              <AvatarFallback className={cn("text-sm font-bold", roleColor.bg, roleColor.text)}>{employee.avatar}</AvatarFallback>
            </Avatar>
            <div>
              <p className={cn("text-sm font-semibold", roleColor.text)}>{employee.name}</p>
              <p className={cn("text-xs opacity-70", roleColor.text)}>{employee.role} • {date.dayLabel} {date.dateNum}</p>
            </div>
          </div>
        )}

        {/* Slot list */}
        <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
          {openSlots.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-4">No open slots for this employee on this date.</p>
          )}
          {shiftGroups.map((sg) => {
            const sc: ShiftPaletteEntry = shiftPalette[sg.shiftIdx % shiftPalette.length] || { cellBg: "", dot: "", dutyText: "", border: "" };
            return (
              <div key={sg.shiftName} className={cn("rounded-lg overflow-hidden border", sc.border)}>
                <div className={cn("flex items-center gap-2 px-3 py-2", sc.cellBg)}>
                  <div className={cn("h-2.5 w-2.5 rounded-full", sc.dot)} />
                  <span className={cn("text-xs font-bold", sc.dutyText)}>{sg.shiftName}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{sg.shiftRange}</span>
                </div>
                <div className="p-2 space-y-2">
                  {[...sg.duties.entries()].map(([dutyTitle, dutySlots]) => (
                    <div key={dutyTitle}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{dutyTitle}</p>
                      <div className="space-y-1">
                        {dutySlots.map((s) => (
                          <label key={s.key} className={cn("flex items-center gap-2.5 px-2.5 py-2 rounded-md border cursor-pointer transition-all", selected === s.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30")}>
                            <input type="radio" name="duty-pick" className="sr-only" checked={selected === s.key} onChange={() => setSelected(s.key)} />
                            <div className={cn("h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0", selected === s.key ? "border-primary" : "border-muted-foreground/40")}>
                              {selected === s.key && <div className="h-2 w-2 rounded-full bg-primary" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{s.leafLabel}</p>
                              {s.areaName && <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><MapPin className="h-3 w-3" />{s.areaName}</p>}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Apply to section — only for draft */}
        {!isPublished && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold text-foreground">Apply to</p>
            <div className="flex flex-wrap gap-1">
              {[
                { label: "Just this day", action: () => setApplyDates(new Set([date?.key ?? ""].filter(isFuture))) },
                { label: "All days", action: () => setApplyDates(new Set(visibleDates.map((d) => d.key).filter(isFuture))) },
                { label: `Every ${WEEKDAY_NAME[weekdayOf(date?.key ?? "")]}`, action: () => { const w = weekdayOf(date?.key ?? ""); setApplyDates(new Set(visibleDates.filter((d) => weekdayOf(d.key) === w && isFuture(d.key)).map((d) => d.key))); } },
                { label: "Weekdays", action: () => setApplyDates(new Set(visibleDates.filter((d) => { const w = weekdayOf(d.key); return (w >= 1 && w <= 5) && isFuture(d.key); }).map((d) => d.key))) },
                { label: "Weekends", action: () => setApplyDates(new Set(visibleDates.filter((d) => { const w = weekdayOf(d.key); return (w === 0 || w === 6) && isFuture(d.key); }).map((d) => d.key))) },
              ].map(({ label, action }) => (
                <button key={label} type="button" onClick={action} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors text-muted-foreground">
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {visibleDates.map((d) => {
                const on = applyDates.has(d.key);
                const past = !isFuture(d.key);
                return (
                  <button key={d.key} type="button" disabled={past} onClick={() => toggleDate(d.key)} className={cn("flex flex-col items-center px-2 py-1 rounded-md text-center min-w-[34px] text-[10px] border transition-all", past ? "opacity-30 cursor-not-allowed border-transparent bg-muted/20" : on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40 hover:bg-muted/30")}>
                    <strong className="text-xs leading-none">{d.dateNum}</strong>
                    <span className="leading-none mt-0.5">{d.dayLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {!isPublished && (
            <span className="text-xs text-muted-foreground">{applyDates.size} day{applyDates.size !== 1 ? "s" : ""} selected</span>
          )}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-sm rounded-md border border-border hover:bg-muted transition-colors">Cancel</button>
            <button type="button" onClick={handleAdd} disabled={!selected || (!isPublished && applyDates.size === 0)} className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {isPublished ? "Add" : "Assign"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
