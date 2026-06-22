'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Briefcase, Award, Plus, Pencil, Trash2, CheckCircle2,
  Stethoscope, Layers, ChevronRight, Search as SearchIcon, MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DataTable, type DataTableColumn, AppModal, AppInput, AppStatCard, AppTabs,
  StatusBadge, getStatusTone, appToast, FilterBar, EmptyState,
} from "@/components/common";
import { Switch } from "@/components/ui/switch";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";
import {
  listProfessions, createProfession, updateProfession,
  listSpecialties, createSpecialty, updateSpecialty,
  listSubSpecialties, createSubSpecialty, updateSubSpecialty,
  listGenericRanks, createGenericRank, updateGenericRank,
  listSpecialtyRanks, createSpecialtyRank, updateSpecialtyRank,
  type EntityItem,
} from "@/lib/api/role-specialty-api";

/* ============================================================== */
/* Generic Ranks tab                                              */
/* ============================================================== */

interface GenericRankRow extends EntityItem {}

interface ConfigListHandle { openAdd: () => void; }

const GenericRanksList = forwardRef<ConfigListHandle>((_, ref) => {
  const [rows, setRows] = useState<GenericRankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const formModal = useDisclosure();
  const [editing, setEditing] = useState<GenericRankRow | null>(null);
  const [name, setName] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [statusFilter, setStatusFilter] = useState<Record<string, string>>({ status: "all" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listGenericRanks();
      setRows((res.content?.data ?? []) as GenericRankRow[]);
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Failed to load", { description: e?.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setName(""); formModal.onOpen(); };
  useImperativeHandle(ref, () => ({ openAdd }));
  const openEdit = (r: GenericRankRow) => { setEditing(r); setName(r.name); formModal.onOpen(); };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      if (editing) {
        await updateGenericRank(editing.id, { entity_name: trimmed });
        appToast.success("Generic Rank updated");
      } else {
        await createGenericRank(trimmed);
        appToast.success("Generic Rank created");
      }
      formModal.onClose();
      load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error(editing ? "Update failed" : "Create failed", { description: e?.message });
    }
  };

  const toggleActive = async (r: GenericRankRow, next: boolean) => {
    setRows((prev) => prev.map((p) => (p.id === r.id ? { ...p, is_enabled: next } : p)));
    try {
      await updateGenericRank(r.id, { is_enabled: next });
      appToast.success(`${next ? "Enabled" : "Disabled"}`, {
        description: `"${r.name}" is now ${next ? "active" : "inactive"}.`,
        action: {
          label: "Undo",
          onClick: async () => {
            setRows((prev) => prev.map((p) => (p.id === r.id ? { ...p, is_enabled: !next } : p)));
            try { await updateGenericRank(r.id, { is_enabled: !next }); }
            catch { load(); }
          },
        },
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Update failed", { description: e?.message });
      load();
    }
  };

  const handleDelete = async (r: GenericRankRow) => {
    const ok = await confirm({
      title: "Disable generic rank?",
      description: `"${r.name}" will be disabled.`,
      confirmLabel: "Disable", destructive: true,
    });
    if (!ok) return;
    try {
      await updateGenericRank(r.id, { is_enabled: false });
      appToast.success("Generic Rank disabled");
      load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Failed", { description: e?.message });
    }
  };

  const total = rows.length;
  const active = rows.filter((r) => r.is_enabled).length;

  const columns: DataTableColumn<GenericRankRow>[] = [
    {
      key: "name", header: "Generic Ranks", sortable: true, searchable: true,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Award className="h-4 w-4 text-secondary" />
          </div>
          <span className="text-sm font-medium text-foreground">{r.name}</span>
        </div>
      ),
    },
    {
      key: "is_enabled", header: "Status", sortable: true,
      accessor: (r) => r.is_enabled ? "Active" : "Suspended",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Switch checked={r.is_enabled} onCheckedChange={(v) => toggleActive(r, v)} />
          <StatusBadge tone={getStatusTone(r.is_enabled ? "Active" : "Suspended")}>
            {r.is_enabled ? "Active" : "Suspended"}
          </StatusBadge>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AppStatCard label="Total Generic Ranks" value={total.toString()} icon={Award} />
        <AppStatCard label="Active" value={active.toString()} icon={CheckCircle2}
          trend={{ label: `${total - active} inactive` }} />
        <AppStatCard label="Used as fallback" value="Yes" icon={CheckCircle2}
          trend={{ label: "Legacy global pool", tone: "positive" }} />
      </div>

      <DataTable<GenericRankRow>
        columns={columns}
        data={rows.filter((r) => statusFilter.status === "all" ||
          (statusFilter.status === "Active" ? r.is_enabled : !r.is_enabled))}
        loading={loading}
        rowKey={(r) => r.id}
        searchPlaceholder="Search generic ranks..."
        toolbar={
          <FilterBar
            filters={[{ key: "status", label: "Status", width: 160, options: [
              { label: "Active", value: "Active" }, { label: "Suspended", value: "Suspended" },
            ] }]}
            value={statusFilter} onChange={setStatusFilter}
          />
        }
        rowActions={[
          { label: "Edit", icon: Pencil, onClick: openEdit },
          { label: "Disable", icon: Trash2, onClick: handleDelete, destructive: true },
        ]}
        emptyState={{ title: "No generic ranks yet", description: "Click \"Add Generic Rank\" to create the first one." }}
      />

      <AppModal
        open={formModal.open}
        onOpenChange={(o) => (o ? formModal.onOpen() : formModal.onClose())}
        title={`${editing ? "Edit" : "Add"} Generic Rank`}
        footer={
          <>
            <Button variant="outline" onClick={formModal.onClose}>Cancel</Button>
            <Button onClick={save} disabled={!name.trim()}>
              {editing ? "Save changes" : "Add"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <AppInput label="Name" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Senior Consultant" autoFocus />
        </div>
      </AppModal>

      {confirmDialog}
    </div>
  );
});
GenericRanksList.displayName = "GenericRanksList";

/* ============================================================== */
/* Hierarchy: shared types & reusable column                      */
/* ============================================================== */

interface HierarchyItem {
  id: string;
  name: string;
  is_enabled: boolean;
}

interface HierarchyColumnProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: HierarchyItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (item: HierarchyItem) => void;
  onDelete: (item: HierarchyItem) => void;
  onToggleActive: (item: HierarchyItem, next: boolean) => void;
  disabled?: boolean;
  disabledHint?: string;
  emptyHint: string;
  addLabel: string;
  showChevron?: boolean;
}

function HierarchyColumn({
  title, icon: Icon, items, loading, selectedId, onSelect, onAdd, onEdit, onDelete,
  onToggleActive, disabled, disabledHint, emptyHint, addLabel, showChevron,
}: HierarchyColumnProps) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
    [items, search],
  );

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card overflow-hidden min-h-[520px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-secondary" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"
          onClick={onAdd} disabled={disabled}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {disabled ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-xs text-muted-foreground text-center">{disabledHint}</p>
        </div>
      ) : (
        <>
          <div className="p-2 border-b border-border">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="h-8 pl-8 text-xs" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-xs text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-muted-foreground mb-3">
                  {items.length === 0 ? emptyHint : "No matches."}
                </p>
                {items.length === 0 && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={onAdd}>
                    <Plus className="h-3.5 w-3.5" /> {addLabel}
                  </Button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((item) => {
                  const isSelected = selectedId === item.id;
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "group flex items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/40 focus-within:bg-muted/40",
                        isSelected && "bg-primary/5 border-l-2 border-l-primary",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(item.id)}
                        className="flex-1 min-w-0 text-left flex items-start gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 py-0.5"
                      >
                        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span
                            className={cn(
                              "text-sm font-medium break-words whitespace-normal leading-snug",
                              item.is_enabled ? "text-foreground" : "text-muted-foreground line-through",
                            )}
                          >
                            {item.name}
                          </span>
                          {!item.is_enabled && (
                            <StatusBadge tone={getStatusTone("Suspended")}>Off</StatusBadge>
                          )}
                        </div>
                        {showChevron && (
                          <ChevronRight
                            className={cn(
                              "h-4 w-4 mt-0.5 shrink-0 text-muted-foreground transition-transform",
                              isSelected && "text-primary",
                            )}
                          />
                        )}
                      </button>

                      <div
                        className="flex items-center gap-3 shrink-0 pl-2 ml-1 border-l border-border/60"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Switch
                          checked={item.is_enabled}
                          onCheckedChange={(v) => onToggleActive(item, v)}
                          aria-label={item.is_enabled ? "Disable" : "Enable"}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40"
                              aria-label="More actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => onEdit(item)}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDelete(item)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Disable
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================== */
/* Hierarchy tab                                                  */
/* ============================================================== */

type Level = "profession" | "specialty" | "sub_specialty" | "rank";

interface EditState {
  level: Level;
  item: HierarchyItem | null;
}

function HierarchyBrowser() {
  const [professions, setProfessions] = useState<HierarchyItem[]>([]);
  const [specialties, setSpecialties] = useState<HierarchyItem[]>([]);
  const [subSpecialties, setSubSpecialties] = useState<HierarchyItem[]>([]);
  const [ranks, setRanks] = useState<HierarchyItem[]>([]);

  const [loadingProf, setLoadingProf] = useState(true);
  const [loadingSpec, setLoadingSpec] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);
  const [loadingRanks, setLoadingRanks] = useState(false);

  const [selectedProf, setSelectedProf] = useState<string | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);

  const [editState, setEditState] = useState<EditState | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  // ─── Loaders ───────────────────────────────────────────────────────────────

  const loadProfs = useCallback(async () => {
    setLoadingProf(true);
    try {
      const res = await listProfessions();
      setProfessions((res.content?.data ?? []) as HierarchyItem[]);
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Failed to load professions", { description: e?.message });
    } finally {
      setLoadingProf(false);
    }
  }, []);

  const loadSpecs = useCallback(async (professionId: string) => {
    setLoadingSpec(true);
    try {
      const res = await listSpecialties(professionId);
      setSpecialties((res.content?.data ?? []) as HierarchyItem[]);
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Failed to load specialties", { description: e?.message });
    } finally {
      setLoadingSpec(false);
    }
  }, []);

  const loadSubs = useCallback(async (specialtyId: string) => {
    setLoadingSub(true);
    try {
      const res = await listSubSpecialties(specialtyId);
      setSubSpecialties((res.content?.data ?? []) as HierarchyItem[]);
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Failed to load sub-specialties", { description: e?.message });
    } finally {
      setLoadingSub(false);
    }
  }, []);

  const loadRanks = useCallback(async (specialtyId: string) => {
    setLoadingRanks(true);
    try {
      const res = await listSpecialtyRanks(specialtyId);
      setRanks((res.content?.data ?? []) as HierarchyItem[]);
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Failed to load ranks", { description: e?.message });
    } finally {
      setLoadingRanks(false);
    }
  }, []);

  useEffect(() => { loadProfs(); }, [loadProfs]);

  // Selecting a profession → load specialties, clear downstream
  useEffect(() => {
    if (selectedProf) {
      loadSpecs(selectedProf);
    } else {
      setSpecialties([]);
    }
    setSelectedSpec(null);
  }, [selectedProf, loadSpecs]);

  // Selecting a specialty → load sub-specialties AND specialty-scoped ranks
  useEffect(() => {
    if (selectedSpec) {
      loadSubs(selectedSpec);
      loadRanks(selectedSpec);
    } else {
      setSubSpecialties([]);
      setRanks([]);
    }
  }, [selectedSpec, loadSubs, loadRanks]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const labelForLevel = (l: Level) =>
    l === "profession" ? "Profession" :
    l === "specialty" ? "Specialty" :
    l === "sub_specialty" ? "Sub-specialty" : "Rank";

  const reloadFor = useCallback((l: Level) => {
    if (l === "profession") loadProfs();
    else if (l === "specialty" && selectedProf) loadSpecs(selectedProf);
    else if (l === "sub_specialty" && selectedSpec) loadSubs(selectedSpec);
    else if (l === "rank" && selectedSpec) loadRanks(selectedSpec);
  }, [loadProfs, loadSpecs, loadSubs, loadRanks, selectedProf, selectedSpec]);

  const setterFor = (l: Level) =>
    l === "profession" ? setProfessions :
    l === "specialty" ? setSpecialties :
    l === "sub_specialty" ? setSubSpecialties : setRanks;

  const openCreate = (level: Level) => { setEditState({ level, item: null }); setName(""); };
  const openEdit = (level: Level, item: HierarchyItem) => { setEditState({ level, item }); setName(item.name); };

  // ─── Save (create / update) ────────────────────────────────────────────────

  const save = async () => {
    if (!editState) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const { level, item } = editState;
    const label = labelForLevel(level);

    try {
      if (item) {
        // Update — rename only (toggle is handled inline by the switch)
        if (level === "profession") await updateProfession(item.id, { entity_name: trimmed });
        else if (level === "specialty") await updateSpecialty(item.id, selectedProf!, { entity_name: trimmed });
        else if (level === "sub_specialty") await updateSubSpecialty(item.id, selectedSpec!, { entity_name: trimmed });
        else await updateSpecialtyRank(item.id, { entity_name: trimmed });
        appToast.success(`${label} updated`);
      } else {
        // Create
        if (level === "profession") await createProfession(trimmed);
        else if (level === "specialty") await createSpecialty(selectedProf!, trimmed);
        else if (level === "sub_specialty") await createSubSpecialty(selectedSpec!, trimmed);
        else await createSpecialtyRank(selectedSpec!, trimmed);
        appToast.success(`${label} created`);
      }
      setEditState(null);
      reloadFor(level);
    } catch (err: unknown) {
      const e = err as { message?: string; userMessage?: string };
      appToast.error("Save failed", { description: e?.userMessage ?? e?.message });
    } finally {
      setSaving(false);
    }
  };

  // ─── Toggle enable/disable ────────────────────────────────────────────────

  const toggleActive = async (level: Level, item: HierarchyItem, next: boolean) => {
    const label = labelForLevel(level);
    const setLocal = setterFor(level);

    setLocal((prev) => prev.map((p) => (p.id === item.id ? { ...p, is_enabled: next } : p)));

    const callUpdate = async (val: boolean) => {
      if (level === "profession") return updateProfession(item.id, { is_enabled: val });
      if (level === "specialty") return updateSpecialty(item.id, selectedProf!, { is_enabled: val });
      if (level === "sub_specialty") return updateSubSpecialty(item.id, selectedSpec!, { is_enabled: val });
      return updateSpecialtyRank(item.id, { is_enabled: val });
    };

    try {
      await callUpdate(next);
      appToast.success(`${label} ${next ? "enabled" : "disabled"}`, {
        description: `"${item.name}" is now ${next ? "active" : "inactive"}.`,
        action: {
          label: "Undo",
          onClick: async () => {
            setLocal((prev) => prev.map((p) => (p.id === item.id ? { ...p, is_enabled: !next } : p)));
            try { await callUpdate(!next); }
            catch { reloadFor(level); }
          },
        },
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Update failed", { description: e?.message });
      reloadFor(level);
    }
  };

  // ─── Disable (API has no hard delete — toggle is_enabled: false) ───────────

  const handleDelete = async (level: Level, item: HierarchyItem) => {
    const ok = await confirm({
      title: `Disable ${labelForLevel(level).toLowerCase()}?`,
      description: `"${item.name}" will be disabled.`,
      confirmLabel: "Disable", destructive: true,
    });
    if (!ok) return;

    const callUpdate = async () => {
      if (level === "profession") return updateProfession(item.id, { is_enabled: false });
      if (level === "specialty") return updateSpecialty(item.id, selectedProf!, { is_enabled: false });
      if (level === "sub_specialty") return updateSubSpecialty(item.id, selectedSpec!, { is_enabled: false });
      return updateSpecialtyRank(item.id, { is_enabled: false });
    };

    try {
      await callUpdate();
      appToast.success(`${labelForLevel(level)} disabled`);
      reloadFor(level);
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Failed", { description: e?.message });
    }
  };

  // ─── Breadcrumb path ───────────────────────────────────────────────────────

  const profName = professions.find((p) => p.id === selectedProf)?.name;
  const specName = specialties.find((s) => s.id === selectedSpec)?.name;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AppStatCard label="Professions" value={professions.length.toString()} icon={Briefcase} />
        <AppStatCard label="Specialties (in view)" value={specialties.length.toString()} icon={Stethoscope}
          trend={{ label: profName ? `under ${profName}` : "Pick a profession" }} />
        <AppStatCard label="Sub-specialties (in view)" value={subSpecialties.length.toString()} icon={Layers}
          trend={{ label: specName ? `under ${specName}` : "Pick a specialty" }} />
        <AppStatCard label="Ranks (in view)" value={ranks.length.toString()} icon={Award}
          trend={{ label: specName ? `under ${specName}` : "Pick a specialty" }} />
      </div>

      {/* Path breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-4 py-2.5 rounded-lg border border-border">
        <span className="font-medium text-foreground">Path:</span>
        <span>{profName || "—"}</span>
        <ChevronRight className="h-3 w-3" />
        <span>{specName || "—"}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="italic">Sub-specialty & Rank are leaf levels</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <HierarchyColumn
          title="Professions" icon={Briefcase}
          items={professions} loading={loadingProf}
          selectedId={selectedProf} onSelect={setSelectedProf}
          onAdd={() => openCreate("profession")}
          onEdit={(i) => openEdit("profession", i)}
          onDelete={(i) => handleDelete("profession", i)}
          onToggleActive={(i, v) => toggleActive("profession", i, v)}
          emptyHint="No professions yet."
          addLabel="Add profession" showChevron
        />
        <HierarchyColumn
          title="Specialties" icon={Stethoscope}
          items={specialties} loading={loadingSpec}
          selectedId={selectedSpec} onSelect={setSelectedSpec}
          onAdd={() => openCreate("specialty")}
          onEdit={(i) => openEdit("specialty", i)}
          onDelete={(i) => handleDelete("specialty", i)}
          onToggleActive={(i, v) => toggleActive("specialty", i, v)}
          disabled={!selectedProf}
          disabledHint="Select a profession to manage its specialties."
          emptyHint="No specialties for this profession yet."
          addLabel="Add specialty" showChevron
        />
        <HierarchyColumn
          title="Sub-specialties" icon={Layers}
          items={subSpecialties} loading={loadingSub}
          selectedId={null} onSelect={() => { /* leaf */ }}
          onAdd={() => openCreate("sub_specialty")}
          onEdit={(i) => openEdit("sub_specialty", i)}
          onDelete={(i) => handleDelete("sub_specialty", i)}
          onToggleActive={(i, v) => toggleActive("sub_specialty", i, v)}
          disabled={!selectedSpec}
          disabledHint={!selectedProf
            ? "Select a profession then a specialty."
            : "Select a specialty to manage its sub-specialties."}
          emptyHint="No sub-specialties for this specialty yet."
          addLabel="Add sub-specialty"
        />
        <HierarchyColumn
          title="Ranks" icon={Award}
          items={ranks} loading={loadingRanks}
          selectedId={null} onSelect={() => { /* leaf */ }}
          onAdd={() => openCreate("rank")}
          onEdit={(i) => openEdit("rank", i)}
          onDelete={(i) => handleDelete("rank", i)}
          onToggleActive={(i, v) => toggleActive("rank", i, v)}
          disabled={!selectedSpec}
          disabledHint={!selectedProf
            ? "Select a profession then a specialty."
            : "Select a specialty to manage its ranks."}
          emptyHint="No ranks for this specialty yet."
          addLabel="Add rank"
        />
      </div>

      {!professions.length && !loadingProf && (
        <EmptyState
          title="Start by creating a profession"
          description="Professions sit at the top of the hierarchy. Specialties, sub-specialties, and ranks are then scoped beneath each one."
          action={<Button onClick={() => openCreate("profession")} className="gap-2">
            <Plus className="h-4 w-4" /> Add Profession
          </Button>}
        />
      )}

      <AppModal
        open={!!editState}
        onOpenChange={(o) => !o && setEditState(null)}
        title={editState ? `${editState.item ? "Edit" : "Add"} ${labelForLevel(editState.level)}` : ""}
        description={
          editState && !editState.item
            ? editState.level === "specialty" ? `New specialty under ${profName}.`
            : editState.level === "sub_specialty" ? `New sub-specialty under ${specName}.`
            : editState.level === "rank" ? `New rank under ${specName}.`
            : "Add a new profession."
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setEditState(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !name.trim()}>
              {saving ? "Saving…" : editState?.item ? "Save changes" : "Add"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          <AppInput label="Name" value={name} onChange={(e) => setName(e.target.value)}
            placeholder={
              editState?.level === "profession" ? "e.g. Dentist"
              : editState?.level === "specialty" ? "e.g. Advanced Education in General Dentistry"
              : editState?.level === "sub_specialty" ? "e.g. Implant Dentistry"
              : "e.g. Consultant"
            }
            autoFocus
          />
        </div>
      </AppModal>

      {confirmDialog}
    </div>
  );
}

/* ============================================================== */
/* Page                                                           */
/* ============================================================== */

type TabKey = "hierarchy" | "generic_ranks";

const RoleSpecialityConfig = () => {
  const sidebarMargin = useSidebarMargin();
  const [tab, setTab] = useState<TabKey>("hierarchy");
  const ranksRef = useRef<ConfigListHandle>(null);

  const handleAdd = () => {
    if (tab === "generic_ranks") ranksRef.current?.openAdd();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-2xl font-bold text-foreground">Role &amp; Speciality Configuration</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage professions, specialties, sub-specialties, and ranks. Dropdowns in the mobile app cascade by selection: Profession → Specialty → Sub-specialty → Rank.
              </p>
            </div>
            {tab === "generic_ranks" && (
              <Button onClick={handleAdd} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Generic Rank
              </Button>
            )}
          </motion.div>

          <AppTabs
            value={tab}
            onValueChange={(v) => setTab(v as TabKey)}
            items={[
              {
                value: "hierarchy",
                label: "Hierarchy",
                icon: Layers,
                content: <HierarchyBrowser />,
              },
              {
                value: "generic_ranks",
                label: "Generic Ranks",
                icon: Award,
                content: <GenericRanksList ref={ranksRef} />,
              },
            ]}
          />
        </div>
      </main>
    </div>
  );
};

export default RoleSpecialityConfig;
