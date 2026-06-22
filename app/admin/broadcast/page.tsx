'use client';
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useSidebarMargin } from "@/hooks/use-sidebar-margin";
import { adminSidebarItems } from "@/config/adminSidebarItems";
import {
  Radio,
  Plus,
  Search,
  Send,
  Image as ImageIcon,
  Globe,
  ListFilter,
  UsersRound,
  Pencil,
  Trash2,
  FileText,
  Hash,
  Upload,
  X,
  ChevronRight,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DataTable,
  type DataTableColumn,
  AppModal,
  AppStatCard,
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
  listBroadcastLists,
  createBroadcastList,
  updateBroadcastList,
  deleteBroadcastLists,
  listBroadcastUsers,
  listTopics,
  createTopic,
  updateTopic,
  deleteTopics,
  type BroadcastRecord,
  type BroadcastListRecord,
  type BroadcastUserRecord,
  type TopicRecord,
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

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapBroadcast(r: BroadcastRecord) {
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

function mapList(r: BroadcastListRecord) {
  return {
    id: r.id,
    name: r.name,
    users: r.users ?? 0,
    created_by: r.created_by ?? "",
    created_at: r.created_at ? new Date(r.created_at * 1000).toISOString() : "",
  };
}

function mapTopic(r: TopicRecord) {
  return {
    id: r.id,
    name: r.name,
    status: r.status === "active" ? "Active" : "Suspended",
    created_by: r.created_by ?? "",
    created_at: r.created_at ? new Date(r.created_at * 1000).toISOString() : "",
  };
}

type MappedBroadcast = ReturnType<typeof mapBroadcast>;
type MappedList = ReturnType<typeof mapList>;
type MappedTopic = ReturnType<typeof mapTopic>;

// ─── Component ────────────────────────────────────────────────────────────────

const Broadcast = () => {
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const sidebarMargin = useSidebarMargin();

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState("direct");
  const [dmTab, setDmTab] = useState("general");

  // ── Broadcasts ──
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

  // ── Lists ──
  const [lists, setLists] = useState<MappedList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const listSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listModal = useDisclosure();
  const [editingList, setEditingList] = useState<MappedList | null>(null);
  const [lName, setLName] = useState("");
  const [lMembers, setLMembers] = useState<BroadcastUserRecord[]>([]);
  const [lSaving, setLSaving] = useState(false);
  const memberPickerModal = useDisclosure();

  // ── Topics ──
  const [topics, setTopics] = useState<MappedTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicSearch, setTopicSearch] = useState("");
  const topicSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topicModal = useDisclosure();
  const [editingTopic, setEditingTopic] = useState<MappedTopic | null>(null);
  const [tName, setTName] = useState("");
  const [tStatus, setTStatus] = useState<"Active" | "Suspended">("Active");
  const [tSaving, setTSaving] = useState(false);

  // ─── Fetch ────────────────────────────────────────────────────────────────────

  const fetchBroadcasts = useCallback(async (search?: string) => {
    setBroadcastsLoading(true);
    try {
      const res = await listBroadcasts({
        next_token: null,
        search_string: search ?? broadcastSearch,
      });
      const data = (res.content?.data ?? []) as BroadcastRecord[];
      setBroadcasts(data.map(mapBroadcast));
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Failed to load broadcasts", { description: e?.message });
    } finally {
      setBroadcastsLoading(false);
    }
  }, [broadcastSearch]);

  const fetchLists = useCallback(async (search?: string) => {
    setListsLoading(true);
    try {
      const res = await listBroadcastLists({
        next_token: null,
        search_string: search ?? listSearch,
      });
      const data = (res.content?.data ?? []) as BroadcastListRecord[];
      setLists(data.map(mapList));
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Failed to load lists", { description: e?.message });
    } finally {
      setListsLoading(false);
    }
  }, [listSearch]);

  const fetchTopics = useCallback(async (search?: string) => {
    setTopicsLoading(true);
    try {
      const res = await listTopics({
        next_token: null,
        search_string: search ?? topicSearch,
      });
      const data = (res.content?.data ?? []) as TopicRecord[];
      setTopics(data.map(mapTopic));
    } catch (err: unknown) {
      const e = err as { message?: string };
      appToast.error("Failed to load topics", { description: e?.message });
    } finally {
      setTopicsLoading(false);
    }
  }, [topicSearch]);

  // ─── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchBroadcasts("");
    fetchLists("");
    fetchTopics("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Debounced search ────────────────────────────────────────────────────────

  useEffect(() => {
    if (broadcastSearchTimer.current) clearTimeout(broadcastSearchTimer.current);
    broadcastSearchTimer.current = setTimeout(() => fetchBroadcasts(broadcastSearch), 300);
    return () => {
      if (broadcastSearchTimer.current) clearTimeout(broadcastSearchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastSearch]);

  useEffect(() => {
    if (listSearchTimer.current) clearTimeout(listSearchTimer.current);
    listSearchTimer.current = setTimeout(() => fetchLists(listSearch), 300);
    return () => {
      if (listSearchTimer.current) clearTimeout(listSearchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listSearch]);

  useEffect(() => {
    if (topicSearchTimer.current) clearTimeout(topicSearchTimer.current);
    topicSearchTimer.current = setTimeout(() => fetchTopics(topicSearch), 300);
    return () => {
      if (topicSearchTimer.current) clearTimeout(topicSearchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicSearch]);

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

  const uploadAttachments = async (): Promise<{ type: string; url: string } | undefined> => {
    const pending = bAttachments.filter((a) => a.file && !a.url);
    if (pending.length === 0) return undefined;
    const first = pending[0];
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
        prev.map((a) => (a.file === first.file ? { ...a, uploading: false, url: path, type: attachType } : a))
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
      const uploaded = await uploadAttachments();
      if (editingBroadcast) {
        await updateBroadcast({
          broadcast_id: editingBroadcast.id,
          title: bTitle.trim(),
          description: bMessage.trim(),
          ...(uploaded ? { attachment_type: uploaded.type, attachment_url: uploaded.url } : {}),
        });
        appToast.success("Broadcast updated");
      } else {
        await createBroadcast({
          title: bTitle.trim(),
          description: bMessage.trim(),
          ...(uploaded ? { attachment_type: uploaded.type, attachment_url: uploaded.url } : {}),
        });
        appToast.success("Broadcast added");
      }
      broadcastModal.onClose();
      fetchBroadcasts(broadcastSearch);
    } catch (err: unknown) {
      const e = err as { message?: string; userMessage?: string };
      appToast.error("Failed to save broadcast", { description: e?.userMessage ?? e?.message });
    } finally {
      setBSaving(false);
    }
  };

  const handleDeleteBroadcast = async (b: MappedBroadcast) => {
    if (
      await confirm({
        title: "Delete broadcast",
        description: `Delete "${b.title}"? This cannot be undone.`,
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteBroadcasts([b.id]);
        appToast.success("Broadcast deleted");
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
        title: `Delete ${rows.length} broadcast${rows.length > 1 ? "s" : ""}`,
        description: "This action cannot be undone.",
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteBroadcasts(rows.map((r) => r.id));
        appToast.success(`${rows.length} broadcast${rows.length > 1 ? "s" : ""} deleted`);
        fetchBroadcasts(broadcastSearch);
      } catch (err: unknown) {
        const e = err as { message?: string };
        appToast.error("Failed to delete", { description: e?.message });
      }
    }
  };

  // ─── List handlers ────────────────────────────────────────────────────────────

  const openNewList = () => {
    setEditingList(null);
    setLName("");
    setLMembers([]);
    listModal.onOpen();
  };

  const openEditList = (l: MappedList) => {
    setEditingList(l);
    setLName(l.name);
    setLMembers([]);
    listModal.onOpen();
  };

  const handleSaveList = async () => {
    if (!lName.trim() || lMembers.length === 0) return;
    setLSaving(true);
    try {
      if (editingList) {
        await updateBroadcastList({
          list_id: editingList.id,
          name: lName.trim(),
          user_ids: lMembers.map((m) => m.id),
        });
        appToast.success("List updated");
      } else {
        await createBroadcastList({
          name: lName.trim(),
          user_ids: lMembers.map((m) => m.id),
        });
        appToast.success("List added");
      }
      listModal.onClose();
      fetchLists(listSearch);
    } catch (err: unknown) {
      const e = err as { message?: string; userMessage?: string };
      appToast.error("Failed to save list", { description: e?.userMessage ?? e?.message });
    } finally {
      setLSaving(false);
    }
  };

  const handleDeleteList = async (l: MappedList) => {
    if (
      await confirm({
        title: "Delete list",
        description: `Delete "${l.name}"? This cannot be undone.`,
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteBroadcastLists([l.id]);
        appToast.success("List deleted");
        fetchLists(listSearch);
      } catch (err: unknown) {
        const e = err as { message?: string };
        appToast.error("Failed to delete", { description: e?.message });
      }
    }
  };

  const handleBulkDeleteLists = async (rows: MappedList[]) => {
    if (
      await confirm({
        title: `Delete ${rows.length} list${rows.length > 1 ? "s" : ""}`,
        description: "This action cannot be undone.",
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteBroadcastLists(rows.map((r) => r.id));
        appToast.success(`${rows.length} list${rows.length > 1 ? "s" : ""} deleted`);
        fetchLists(listSearch);
      } catch (err: unknown) {
        const e = err as { message?: string };
        appToast.error("Failed to delete", { description: e?.message });
      }
    }
  };

  // ─── Topic handlers ───────────────────────────────────────────────────────────

  const openNewTopic = () => {
    setEditingTopic(null);
    setTName("");
    setTStatus("Active");
    topicModal.onOpen();
  };

  const openEditTopic = (t: MappedTopic) => {
    setEditingTopic(t);
    setTName(t.name);
    setTStatus(t.status as "Active" | "Suspended");
    topicModal.onOpen();
  };

  const handleSaveTopic = async () => {
    if (!tName.trim()) return;
    setTSaving(true);
    try {
      if (editingTopic) {
        await updateTopic(editingTopic.id, tName.trim());
        appToast.success("Topic updated");
      } else {
        await createTopic(tName.trim());
        appToast.success("Topic added");
      }
      topicModal.onClose();
      fetchTopics(topicSearch);
    } catch (err: unknown) {
      const e = err as { message?: string; userMessage?: string };
      appToast.error("Failed to save topic", { description: e?.userMessage ?? e?.message });
    } finally {
      setTSaving(false);
    }
  };

  const handleDeleteTopic = async (t: MappedTopic) => {
    if (
      await confirm({
        title: "Delete topic",
        description: `Delete "${t.name}" and all its posts? This cannot be undone.`,
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteTopics([t.id]);
        appToast.success("Topic deleted");
        fetchTopics(topicSearch);
      } catch (err: unknown) {
        const e = err as { message?: string };
        appToast.error("Failed to delete", { description: e?.message });
      }
    }
  };

  const handleBulkDeleteTopics = async (rows: MappedTopic[]) => {
    if (
      await confirm({
        title: `Delete ${rows.length} topic${rows.length > 1 ? "s" : ""}`,
        description: "All posts inside will also be deleted. This action cannot be undone.",
        destructive: true,
        confirmLabel: "Delete",
      })
    ) {
      try {
        await deleteTopics(rows.map((r) => r.id));
        appToast.success(`${rows.length} topic${rows.length > 1 ? "s" : ""} deleted`);
        fetchTopics(topicSearch);
      } catch (err: unknown) {
        const e = err as { message?: string };
        appToast.error("Failed to delete", { description: e?.message });
      }
    }
  };

  // ─── Column definitions ────────────────────────────────────────────────────────

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
      accessor: () => "All Users",
      cell: () => (
        <Badge variant="outline" className="gap-1">
          <Globe className="h-3 w-3" /> All Users
        </Badge>
      ),
    },
  ];

  const listColumns: DataTableColumn<MappedList>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      searchable: true,
      accessor: (l) => l.name,
      cell: (l) => <span className="font-medium text-foreground">{l.name}</span>,
    },
    {
      key: "users",
      header: "Users",
      sortable: true,
      accessor: (l) => l.users,
      cell: (l) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/broadcast/lists/${l.id}`);
          }}
          className="inline-flex items-center gap-1.5 group hover:text-secondary transition-colors"
        >
          <UsersRound className="h-3.5 w-3.5 text-muted-foreground group-hover:text-secondary" />
          <span className="font-medium text-foreground group-hover:text-secondary">
            {l.users.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground group-hover:text-secondary">
            user{l.users !== 1 ? "s" : ""}
          </span>
        </button>
      ),
    },
  ];

  const topicColumns: DataTableColumn<MappedTopic>[] = [
    {
      key: "name",
      header: "Topic Page",
      sortable: true,
      searchable: true,
      accessor: (t) => t.name,
      cell: (t) => (
        <div className="inline-flex items-center gap-2">
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">{t.name}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      accessor: (t) => t.status,
      cell: (t) => (
        <StatusBadge tone={getStatusTone(t.status)}>{t.status}</StatusBadge>
      ),
    },
  ];

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
            <div>
              <h1 className="text-2xl font-bold text-foreground">Broadcast Center</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage direct broadcasts and network posts for your organization.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeTab === "direct" && dmTab === "general" && (
                <Button onClick={openNewBroadcast} className="gap-2">
                  <Plus className="h-4 w-4" /> Create Broadcast
                </Button>
              )}
              {activeTab === "direct" && dmTab === "lists" && (
                <Button onClick={openNewList} className="gap-2">
                  <Plus className="h-4 w-4" /> Add List
                </Button>
              )}
              {activeTab === "network" && (
                <Button onClick={openNewTopic} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Topic
                </Button>
              )}
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <AppStatCard label="Broadcasts" value={broadcasts.length.toString()} icon={Send} />
            <AppStatCard label="Lists" value={lists.length.toString()} icon={UsersRound} />
            <AppStatCard label="Topics" value={topics.length.toString()} icon={Hash} />
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="w-fit">
              <TabsTrigger value="direct" className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Direct Messages
              </TabsTrigger>
              <TabsTrigger value="network" className="gap-1.5">
                <Radio className="h-3.5 w-3.5" />
                Network Posts
              </TabsTrigger>
            </TabsList>

            {/* ─── DIRECT MESSAGES ─── */}
            <TabsContent value="direct" className="space-y-4 mt-0">
              <Tabs value={dmTab} onValueChange={setDmTab} className="space-y-4">
                <TabsList className="w-fit">
                  <TabsTrigger value="general" className="gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="lists" className="gap-1.5">
                    <ListFilter className="h-3.5 w-3.5" />
                    Lists
                  </TabsTrigger>
                </TabsList>

                {/* General */}
                <TabsContent value="general" className="space-y-4 mt-0">
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
                    searchPlaceholder="Search broadcasts..."
                    onSearchChange={setBroadcastSearch}
                    rowActions={[
                      { label: "Edit", icon: Pencil, onClick: openEditBroadcast },
                      { label: "Delete", icon: Trash2, destructive: true, onClick: handleDeleteBroadcast },
                    ]}
                    emptyState={{ title: "No broadcasts yet", description: "Create your first broadcast to get started." }}
                  />
                </TabsContent>

                {/* Lists */}
                <TabsContent value="lists" className="space-y-4 mt-0">
                  <DataTable<MappedList>
                    columns={listColumns}
                    data={lists}
                    rowKey={(l) => l.id}
                    loading={listsLoading}
                    selectable
                    rowInfo={(l) => ({ createdBy: l.created_by, createdAt: l.created_at })}
                    bulkActions={[
                      { label: "Delete selected", icon: Trash2, destructive: true, onClick: handleBulkDeleteLists },
                    ]}
                    searchable
                    searchPlaceholder="Search lists..."
                    onSearchChange={setListSearch}
                    onRowClick={(l) => router.push(`/admin/broadcast/lists/${l.id}`)}
                    rowActions={[
                      {
                        label: "View",
                        icon: ChevronRight,
                        onClick: (l) => router.push(`/admin/broadcast/lists/${l.id}`),
                      },
                      { label: "Edit", icon: Pencil, onClick: openEditList },
                      { label: "Delete", icon: Trash2, destructive: true, onClick: handleDeleteList },
                    ]}
                    emptyState={{ title: "No lists yet", description: "Create reusable member lists for targeted broadcasts." }}
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* ─── NETWORK POSTS ─── */}
            <TabsContent value="network" className="space-y-4 mt-0">
              <DataTable<MappedTopic>
                columns={topicColumns}
                data={topics}
                rowKey={(t) => t.id}
                loading={topicsLoading}
                selectable
                rowInfo={(t) => ({ createdBy: t.created_by, createdAt: t.created_at })}
                bulkActions={[
                  { label: "Delete selected", icon: Trash2, destructive: true, onClick: handleBulkDeleteTopics },
                ]}
                searchable
                searchPlaceholder="Search topics..."
                onSearchChange={setTopicSearch}
                onRowClick={(t) => router.push(`/admin/broadcast/network/${t.id}`)}
                rowActions={[
                  {
                    label: "Open",
                    icon: ChevronRight,
                    onClick: (t) => router.push(`/admin/broadcast/network/${t.id}`),
                  },
                  { label: "Edit", icon: Pencil, onClick: openEditTopic },
                  {
                    label: "Suspend",
                    icon: Ban,
                    hidden: (t) => t.status !== "Active",
                    onClick: async (t) => {
                      try {
                        await updateTopic(t.id, t.name);
                        appToast.success("Topic suspended");
                        fetchTopics(topicSearch);
                      } catch {
                        appToast.error("Failed to suspend topic");
                      }
                    },
                  },
                  {
                    label: "Activate",
                    icon: CheckCircle2,
                    hidden: (t) => t.status !== "Suspended",
                    onClick: async (t) => {
                      try {
                        await updateTopic(t.id, t.name);
                        appToast.success("Topic activated");
                        fetchTopics(topicSearch);
                      } catch {
                        appToast.error("Failed to activate topic");
                      }
                    },
                  },
                  { label: "Delete", icon: Trash2, destructive: true, onClick: handleDeleteTopic },
                ]}
                emptyState={{ title: "No topics yet", description: "Create a topic to organize network posts." }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* ═══ BROADCAST MODAL ═══ */}
      <AppModal
        open={broadcastModal.open}
        onOpenChange={broadcastModal.setOpen}
        title={editingBroadcast ? "Edit Broadcast" : "Add Broadcast"}
        description="Send a message to all users in the network."
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
              <Globe className="h-4 w-4" />
              All Users
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
                <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">Images, PDFs, documents (max 20MB each)</p>
              </div>
              <input
                type="file"
                multiple
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
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

      {/* ═══ LIST MODAL ═══ */}
      <AppModal
        open={listModal.open}
        onOpenChange={listModal.setOpen}
        title={editingList ? "Edit List" : "Add List"}
        description="Create a reusable member list for targeted broadcasts."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={listModal.onClose}>Cancel</Button>
            <Button
              onClick={handleSaveList}
              disabled={lSaving || !lName.trim() || lMembers.length === 0}
            >
              {lSaving ? "Saving…" : editingList ? "Save" : "Add"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              List Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={lName}
              onChange={(e) => setLName(e.target.value)}
              placeholder="e.g. ICU Doctors"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Members <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={memberPickerModal.onOpen}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Members
              </Button>
            </div>

            {lMembers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-border p-3">
                {lMembers.map((m) => (
                  <Badge key={m.id} variant="secondary" className="gap-1 pr-1">
                    {m.first_name} {m.last_name}
                    <button
                      type="button"
                      onClick={() => setLMembers((prev) => prev.filter((x) => x.id !== m.id))}
                      className="ml-0.5 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No members selected yet. Click &ldquo;Add Members&rdquo; to pick users.
              </div>
            )}
            <p className="text-xs text-muted-foreground">{lMembers.length} selected</p>
          </div>
        </div>
      </AppModal>

      {/* ═══ TOPIC MODAL ═══ */}
      <AppModal
        open={topicModal.open}
        onOpenChange={topicModal.setOpen}
        title={editingTopic ? "Edit Topic" : "Add Topic"}
        description="Topics organize posts in the network feed."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={topicModal.onClose}>Cancel</Button>
            <Button onClick={handleSaveTopic} disabled={tSaving || !tName.trim()}>
              {tSaving ? "Saving…" : editingTopic ? "Save" : "Add"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              Topic Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={tName}
              onChange={(e) => setTName(e.target.value)}
              placeholder="e.g. Announcements"
            />
          </div>

          {editingTopic && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">Suspended topics are hidden from the feed.</p>
              </div>
              <Switch
                checked={tStatus === "Active"}
                onCheckedChange={(c) => setTStatus(c ? "Active" : "Suspended")}
              />
            </div>
          )}
        </div>
      </AppModal>

      {/* ═══ MEMBER PICKER MODAL ═══ */}
      <MemberPickerModal
        open={memberPickerModal.open}
        onOpenChange={memberPickerModal.setOpen}
        initialSelected={lMembers}
        onConfirm={(selected) => {
          setLMembers(selected);
          memberPickerModal.onClose();
        }}
      />

      {confirmDialog}
    </div>
  );
};

// ─── MemberPickerModal ────────────────────────────────────────────────────────

interface MemberPickerModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialSelected: BroadcastUserRecord[];
  onConfirm: (selected: BroadcastUserRecord[]) => void;
}

const MemberPickerModal = ({
  open,
  onOpenChange,
  initialSelected,
  onConfirm,
}: MemberPickerModalProps) => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<BroadcastUserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<BroadcastUserRecord[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await listBroadcastUsers({
        next_token: null,
        search_string: q || undefined,
      });
      setUsers((res.content?.data ?? []) as BroadcastUserRecord[]);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setPicked(initialSelected);
      setSearch("");
      fetchUsers("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchUsers(search), 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, open]);

  const isPicked = (id: string) => picked.some((p) => p.id === id);
  const toggle = (u: BroadcastUserRecord) =>
    setPicked((prev) =>
      prev.some((p) => p.id === u.id) ? prev.filter((p) => p.id !== u.id) : [...prev, u]
    );

  const allVisibleSelected =
    users.length > 0 && users.every((u) => isPicked(u.id));
  const toggleAll = () => {
    if (allVisibleSelected) {
      setPicked((prev) => prev.filter((p) => !users.some((u) => u.id === p.id)));
    } else {
      setPicked((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const toAdd = users.filter((u) => !existingIds.has(u.id));
        return [...prev, ...toAdd];
      });
    }
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Select Members"
      description="Pick users from the network to add to this list."
      size="full"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onConfirm(picked)} disabled={picked.length === 0}>
            Add{picked.length > 0 ? ` (${picked.length})` : ""}
          </Button>
        </>
      }
    >
      <div className="space-y-4 flex flex-col" style={{ minHeight: 0 }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone number, staff id..."
            className="h-11 w-full rounded-full border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <div className="max-h-[460px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr className="text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="px-4 py-3 w-12">
                    <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} />
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap">Name</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap">Profession</th>
                  <th className="px-4 py-3 whitespace-nowrap">Mobile Number</th>
                  <th className="px-4 py-3 whitespace-nowrap">Staff ID</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const checked = isPicked(u.id);
                    const phone = u.country_code && u.phone_number
                      ? `${u.country_code} ${u.phone_number}`
                      : u.phone_number ?? "—";
                    return (
                      <tr
                        key={u.id}
                        className="border-t border-border hover:bg-accent/30 cursor-pointer"
                        onClick={() => toggle(u)}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={checked} onCheckedChange={() => toggle(u)} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-[180px]">
                            <AppAvatar
                              name={`${u.first_name} ${u.last_name}`}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {u.first_name} {u.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {u.email ?? ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge tone={getStatusTone(u.status ?? "active")}>
                            {u.status ?? "Active"}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {u.profession_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {phone}
                        </td>
                        <td className="px-4 py-3 font-mono whitespace-nowrap">
                          {u.staff_id ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{picked.length} selected</p>
      </div>
    </AppModal>
  );
};

export default Broadcast;
