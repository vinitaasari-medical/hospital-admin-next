'use client';
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import {
  ArrowLeft,
  ListFilter,
  Plus,
  Pencil,
  Trash2,
  UsersRound,
  MessageSquare,
  Globe,
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DataTable,
  type DataTableColumn,
  AppModal,
  AppAvatar,
  StatusBadge,
  getStatusTone,
  FilterBar,
  appToast,
} from "@/components/common";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useConfirm } from "@/hooks/use-confirm";
import {
  listBroadcasts,
  createBroadcast,
  updateBroadcast,
  deleteBroadcasts,
  listBroadcastUsers,
  removeUsersFromList,
  listProfessions,
  listRanks,
  type BroadcastRecord,
  type BroadcastUserRecord,
  type EntityRecord,
} from "@/lib/api/broadcast-api";
import {
  awsLinkGenerateImage,
  gcsFileUpload,
} from "@/lib/api/file-uploader";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttachmentFile {
  file: File;
  uploading: boolean;
  url?: string;
  type?: string;
}

type MappedBroadcast = {
  id: string;
  title: string;
  message: string;
  created_by: string;
  created_at: string;
  attachment_type: string;
  attachment_url: string;
};

type MappedUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  staff_id: string;
  profession_name: string;
  rank_name: string;
  status: string;
  created_at: string;
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapBroadcast(r: BroadcastRecord): MappedBroadcast {
  return {
    id: r.id,
    title: r.title,
    message: r.description,
    created_by: r.created_by ?? "",
    created_at: r.created_at ? new Date(r.created_at * 1000).toISOString() : "",
    attachment_type: r.attachment_type ?? "",
    attachment_url: r.attachment_url ?? "",
  };
}

function mapUser(r: BroadcastUserRecord): MappedUser {
  return {
    id: r.id,
    name: `${r.first_name} ${r.last_name}`.trim(),
    email: r.email ?? "",
    phone:
      r.country_code && r.phone_number
        ? `${r.country_code} ${r.phone_number}`
        : r.phone_number ?? "",
    staff_id: r.staff_id ?? "",
    profession_name: r.profession_name ?? "",
    rank_name: r.rank_name ?? "",
    status: r.status ?? "active",
    created_at: r.created_at ? new Date(r.created_at * 1000).toISOString() : "",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listId = params.id as string;
  const sidebarMargin = useSidebarMargin();

  const [activeTab, setActiveTab] = useState("users");

  // ── Users tab ──
  const [users, setUsers] = useState<MappedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const userSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userFilter, setUserFilter] = useState<Record<string, string>>({
    profession_id: "all",
    rank_id: "all",
  });
  const [professions, setProfessions] = useState<EntityRecord[]>([]);
  const [ranks, setRanks] = useState<EntityRecord[]>([]);

  // ── Messages tab ──
  const [broadcasts, setBroadcasts] = useState<MappedBroadcast[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [broadcastSearch, setBroadcastSearch] = useState("");
  const broadcastSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const broadcastModal = useDisclosure();
  const [editingBroadcast, setEditingBroadcast] = useState<MappedBroadcast | null>(null);
  const [bTitle, setBTitle] = useState("");
  const [bMessage, setBMessage] = useState("");
  const [bAttachments, setBAttachments] = useState<AttachmentFile[]>([]);
  const [bSaving, setBSaving] = useState(false);

  const { confirm, dialog: confirmDialog } = useConfirm();

  // ─── Fetch users ──────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async (search?: string, filter?: Record<string, string>) => {
    setUsersLoading(true);
    try {
      const f = filter ?? userFilter;
      const res = await listBroadcastUsers({
        next_token: null,
        broadcast_list_id: listId,
        search_string: search ?? userSearch,
        profession_id: f.profession_id !== "all" ? f.profession_id : undefined,
        rank_id: f.rank_id !== "all" ? f.rank_id : undefined,
      });
      setUsers(((res.content?.data ?? []) as BroadcastUserRecord[]).map(mapUser));
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Failed to load users", { description: e?.message });
    } finally {
      setUsersLoading(false);
    }
  }, [listId, userSearch, userFilter]);

  // ─── Fetch broadcasts ────────────────────────────────────────────────────────

  const fetchBroadcasts = useCallback(async (search?: string) => {
    setBroadcastsLoading(true);
    try {
      const res = await listBroadcasts({
        next_token: null,
        broadcast_list_id: listId,
        search_string: search ?? broadcastSearch,
      });
      setBroadcasts(((res.content?.data ?? []) as BroadcastRecord[]).map(mapBroadcast));
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Failed to load messages", { description: e?.message });
    } finally {
      setBroadcastsLoading(false);
    }
  }, [listId, broadcastSearch]);

  // ─── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchUsers("");
    fetchBroadcasts("");

    listProfessions()
      .then((res) => setProfessions((res.content?.data ?? []) as EntityRecord[]))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId]);

  // ─── Load ranks when profession changes ──────────────────────────────────────

  useEffect(() => {
    const profId = userFilter.profession_id !== "all" ? userFilter.profession_id : undefined;
    listRanks(profId)
      .then((res) => setRanks((res.content?.data ?? []) as EntityRecord[]))
      .catch(() => {});
  }, [userFilter.profession_id]);

  // ─── Debounced search ────────────────────────────────────────────────────────

  useEffect(() => {
    if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
    userSearchTimer.current = setTimeout(() => fetchUsers(userSearch), 300);
    return () => {
      if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch]);

  useEffect(() => {
    if (broadcastSearchTimer.current) clearTimeout(broadcastSearchTimer.current);
    broadcastSearchTimer.current = setTimeout(() => fetchBroadcasts(broadcastSearch), 300);
    return () => {
      if (broadcastSearchTimer.current) clearTimeout(broadcastSearchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastSearch]);

  // ─── Filter changes ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetchUsers(userSearch, userFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFilter]);

  // ─── User handlers ────────────────────────────────────────────────────────────

  const handleBulkRemoveUsers = async (rows: MappedUser[]) => {
    if (
      await confirm({
        title: `Remove ${rows.length} user${rows.length > 1 ? "s" : ""}`,
        description: "Remove these users from this broadcast list?",
        destructive: true,
        confirmLabel: "Remove",
      })
    ) {
      try {
        await removeUsersFromList({
          broadcast_list_id: listId,
          user_ids: rows.map((r) => r.id),
        });
        appToast.success(`${rows.length} user${rows.length > 1 ? "s" : ""} removed`);
        fetchUsers(userSearch);
      } catch (err: unknown) {
        const e = err as { message?: string };
        appToast.error("Failed to remove users", { description: e?.message });
      }
    }
  };

  const handleResetFilters = () => {
    setUserFilter({ profession_id: "all", rank_id: "all" });
    setUserSearch("");
  };

  // ─── Broadcast handlers ──────────────────────────────────────────────────────

  const openNewBroadcast = () => {
    setEditingBroadcast(null);
    setBTitle("");
    setBMessage("");
    setBAttachments([]);
    broadcastModal.onOpen();
  };

  const openEditBroadcast = (b: MappedBroadcast) => {
    setEditingBroadcast(b);
    setBTitle(b.title);
    setBMessage(b.message);
    setBAttachments([]);
    broadcastModal.onOpen();
  };

  const uploadAttachment = async (): Promise<{ type: string; url: string } | undefined> => {
    const first = bAttachments.find((a) => !a.url);
    if (!first) return undefined;
    setBAttachments((prev) =>
      prev.map((a) => (a.file === first.file ? { ...a, uploading: true } : a))
    );
    try {
      const { signedUrl, path } = await awsLinkGenerateImage({
        file: first.file,
        awsFolderPath: "broadcast/attachments",
      });
      await gcsFileUpload({ signedUrl, file: first.file });
      const ext = first.file.name.split(".").pop()?.toLowerCase() ?? "";
      const attachType = first.file.type.startsWith("image/")
        ? "image"
        : first.file.type.startsWith("video/")
        ? "video"
        : ["pdf"].includes(ext)
        ? "pdf"
        : "doc";
      setBAttachments((prev) =>
        prev.map((a) =>
          a.file === first.file ? { ...a, uploading: false, url: path, type: attachType } : a
        )
      );
      return { type: attachType, url: path };
    } catch {
      setBAttachments((prev) =>
        prev.map((a) => (a.file === first.file ? { ...a, uploading: false } : a))
      );
      return undefined;
    }
  };

  const handleSaveBroadcast = async () => {
    if (!bTitle.trim() || !bMessage.trim()) return;
    setBSaving(true);
    try {
      const uploaded = await uploadAttachment();
      if (editingBroadcast) {
        await updateBroadcast({
          broadcast_id: editingBroadcast.id,
          title: bTitle.trim(),
          description: bMessage.trim(),
          ...(uploaded ? { attachment_type: uploaded.type, attachment_url: uploaded.url } : {}),
        });
        appToast.success("Message updated");
      } else {
        await createBroadcast({
          title: bTitle.trim(),
          description: bMessage.trim(),
          broadcast_list_id: listId,
          ...(uploaded ? { attachment_type: uploaded.type, attachment_url: uploaded.url } : {}),
        });
        appToast.success("Message added");
      }
      broadcastModal.onClose();
      fetchBroadcasts(broadcastSearch);
    } catch (err: unknown) {
      const e = err as { message?: string; userMessage?: string };
      appToast.error("Failed to save message", { description: e?.userMessage ?? e?.message });
    } finally {
      setBSaving(false);
    }
  };

  const handleDeleteBroadcast = async (b: MappedBroadcast) => {
    if (
      await confirm({
        title: "Delete message",
        description: `Delete "${b.title}"? This cannot be undone.`,
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteBroadcasts([b.id]);
        appToast.success("Message deleted");
        fetchBroadcasts(broadcastSearch);
      } catch (err: unknown) {
        const e = err as { message?: string };
        appToast.error("Failed to delete", { description: e?.message });
      }
    }
  };

  const handleBulkDeleteBroadcasts = async (rows: MappedBroadcast[]) => {
    if (
      await confirm({
        title: `Delete ${rows.length} message${rows.length > 1 ? "s" : ""}`,
        description: "This action cannot be undone.",
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteBroadcasts(rows.map((r) => r.id));
        appToast.success(`${rows.length} message${rows.length > 1 ? "s" : ""} deleted`);
        fetchBroadcasts(broadcastSearch);
      } catch (err: unknown) {
        const e = err as { message?: string };
        appToast.error("Failed to delete", { description: e?.message });
      }
    }
  };

  // ─── Column definitions ────────────────────────────────────────────────────────

  const userColumns: DataTableColumn<MappedUser>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      searchable: true,
      accessor: (u) => u.name,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <AppAvatar name={u.name} size="sm" />
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{u.name}</p>
            <p className="text-xs text-muted-foreground truncate">{u.staff_id || u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "profession_name",
      header: "Profession",
      sortable: true,
      searchable: true,
      accessor: (u) => u.profession_name,
      cell: (u) => <span className="text-muted-foreground">{u.profession_name || "—"}</span>,
    },
    {
      key: "rank_name",
      header: "Rank",
      sortable: true,
      hideOnMobile: true,
      accessor: (u) => u.rank_name,
      cell: (u) => <span className="text-muted-foreground">{u.rank_name || "—"}</span>,
    },
    {
      key: "phone",
      header: "Mobile",
      hideOnMobile: true,
      searchable: true,
      accessor: (u) => u.phone,
      cell: (u) => <span className="text-muted-foreground">{u.phone || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (u) => u.status,
      cell: (u) => (
        <StatusBadge tone={getStatusTone(u.status)}>{u.status}</StatusBadge>
      ),
    },
  ];

  const broadcastColumns: DataTableColumn<MappedBroadcast>[] = [
    {
      key: "title",
      header: "Message Title",
      sortable: true,
      searchable: true,
      accessor: (b) => b.title,
      cell: (b) => <span className="font-medium text-foreground">{b.title}</span>,
    },
    {
      key: "message",
      header: "Message",
      searchable: true,
      accessor: (b) => b.message,
      cell: (b) => (
        <span className="text-muted-foreground line-clamp-1 max-w-md block">{b.message}</span>
      ),
    },
    {
      key: "recipient",
      header: "Recipient",
      accessor: () => "This List",
      cell: () => (
        <Badge variant="outline" className="gap-1">
          <ListFilter className="h-3 w-3" /> This List
        </Badge>
      ),
    },
  ];

  const professionOptions = professions.map((p) => ({ label: p.name, value: p.id }));
  const rankOptions = ranks.map((r) => ({ label: r.name, value: r.id }));
  const hasActiveFilter = userFilter.profession_id !== "all" || userFilter.rank_id !== "all";

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={adminSidebarItems} />

      <main className={`flex-1 ${sidebarMargin} transition-all duration-300`}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/broadcast")}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Broadcast
              </Button>
              <span className="text-muted-foreground">/</span>
              <div className="flex items-center gap-2">
                <UsersRound className="h-4 w-4 text-secondary" />
                <h1 className="text-lg font-semibold text-foreground">Broadcast List</h1>
              </div>
            </div>

            {activeTab === "messages" && (
              <Button onClick={openNewBroadcast} className="gap-2">
                <Plus className="h-4 w-4" /> Add Message
              </Button>
            )}
          </motion.div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-fit">
              <TabsTrigger value="users" className="gap-1.5">
                <UsersRound className="h-3.5 w-3.5" />
                Users
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Messages
              </TabsTrigger>
            </TabsList>

            {/* ─── USERS TAB ─── */}
            <TabsContent value="users" className="space-y-4 mt-0">
              <DataTable<MappedUser>
                columns={userColumns}
                data={users}
                rowKey={(u) => u.id}
                loading={usersLoading}
                selectable
                rowInfo={(u) => ({ createdAt: u.created_at })}
                bulkActions={[
                  { label: "Remove from list", icon: Trash2, destructive: true, onClick: handleBulkRemoveUsers },
                ]}
                searchable
                searchPlaceholder="Search users..."
                onSearchChange={setUserSearch}
                toolbar={
                  <div className="flex items-center gap-2">
                    <FilterBar
                      filters={[
                        ...(professionOptions.length > 0
                          ? [{ key: "profession_id", label: "Profession", options: professionOptions }]
                          : []),
                        ...(rankOptions.length > 0
                          ? [{ key: "rank_id", label: "Rank", options: rankOptions }]
                          : []),
                      ]}
                      value={userFilter}
                      onChange={setUserFilter}
                    />
                    {hasActiveFilter && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetFilters}
                        className="gap-1.5 text-muted-foreground"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Reset
                      </Button>
                    )}
                  </div>
                }
                emptyState={{ title: "No users in this list", description: "Add members when editing the list." }}
              />
            </TabsContent>

            {/* ─── MESSAGES TAB ─── */}
            <TabsContent value="messages" className="space-y-4 mt-0">
              <DataTable<MappedBroadcast>
                columns={broadcastColumns}
                data={broadcasts}
                rowKey={(b) => b.id}
                loading={broadcastsLoading}
                selectable
                rowInfo={(b) => ({ createdBy: b.created_by, createdAt: b.created_at })}
                bulkActions={[
                  { label: "Delete selected", icon: Trash2, destructive: true, onClick: handleBulkDeleteBroadcasts },
                ]}
                searchable
                searchPlaceholder="Search messages..."
                onSearchChange={setBroadcastSearch}
                rowActions={[
                  { label: "Edit", icon: Pencil, onClick: openEditBroadcast },
                  { label: "Delete", icon: Trash2, destructive: true, onClick: handleDeleteBroadcast },
                ]}
                emptyState={{ title: "No messages yet", description: "Add the first message to this list." }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* ═══ BROADCAST MODAL ═══ */}
      <AppModal
        open={broadcastModal.open}
        onOpenChange={broadcastModal.setOpen}
        title={editingBroadcast ? "Edit Message" : "Add Message"}
        description="Send a broadcast message to members of this list."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={broadcastModal.onClose}>Cancel</Button>
            <Button
              onClick={handleSaveBroadcast}
              disabled={bSaving || !bTitle.trim() || !bMessage.trim()}
            >
              {bSaving ? "Saving…" : editingBroadcast ? "Save" : "Add"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>To</Label>
            <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 gap-2 text-sm text-muted-foreground">
              <ListFilter className="h-4 w-4" />
              This List
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Message Title <span className="text-destructive">*</span>
            </Label>
            <Input
              value={bTitle}
              onChange={(e) => setBTitle(e.target.value)}
              placeholder="Enter a clear title..."
            />
          </div>

          <div className="space-y-2">
            <Label>
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={bMessage}
              onChange={(e) => setBMessage(e.target.value)}
              placeholder="Type your message..."
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:bg-muted/30 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Images, PDFs, documents</p>
              </div>
              <input
                type="file"
                multiple
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) {
                    setBAttachments((prev) => [
                      ...prev,
                      ...files.map((f) => ({ file: f, uploading: false })),
                    ]);
                  }
                  e.target.value = "";
                }}
              />
            </label>
            {bAttachments.length > 0 && (
              <div className="space-y-2">
                {bAttachments.map((att, idx) => (
                  <div
                    key={`${att.file.name}-${idx}`}
                    className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {att.file.type.startsWith("image/") ? (
                        <ImageIcon className="h-5 w-5 text-secondary shrink-0" />
                      ) : (
                        <FileText className="h-5 w-5 text-secondary shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{att.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {att.uploading ? "Uploading…" : `${(att.file.size / 1024).toFixed(1)} KB`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      type="button"
                      onClick={() => setBAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AppModal>

      {confirmDialog}
    </div>
  );
}
