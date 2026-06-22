'use client';
/**
 * Example usage of the design system.
 *
 * Mount under `/example/design-system` to explore the components in isolation.
 */
import * as React from "react";
import { Plus, Trash2, Pencil, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableColumn,
  AppModal,
  AppAlert,
  AppInput,
  AppSelect,
  StatusBadge,
  AppStatCard,
  AppCard,
  AppAvatar,
  AppTabs,
  appToast,
  EmptyState,
  AppBreadcrumb,
} from "@/components/common";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useConfirm } from "@/hooks/use-confirm";

interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Member";
  status: "Active" | "Inactive";
}

const seed: DemoUser[] = [
  { id: "1", name: "Sarah Mitchell", email: "s@m.com", role: "Admin", status: "Active" },
  { id: "2", name: "James Carter", email: "j@m.com", role: "Member", status: "Active" },
  { id: "3", name: "Lisa Rodriguez", email: "l@m.com", role: "Member", status: "Inactive" },
];

export default function DesignSystemExample() {
  const modal = useDisclosure();
  const { confirm, dialog } = useConfirm();
  const [rows, setRows] = React.useState(seed);

  const columns: DataTableColumn<DemoUser>[] = [
    {
      key: "name",
      header: "User",
      sortable: true,
      searchable: true,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <AppAvatar name={u.name} size="sm" />
          <div>
            <p className="font-medium text-foreground">{u.name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", sortable: true, hideOnMobile: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (u) => (
        <StatusBadge tone={u.status === "Active" ? "success" : "neutral"}>{u.status}</StatusBadge>
      ),
    },
  ];

  const remove = async (u: DemoUser) => {
    if (
      await confirm({
        title: `Remove ${u.name}?`,
        description: "This cannot be undone.",
        destructive: true,
        confirmLabel: "Remove",
      })
    ) {
      setRows((rs) => rs.filter((r) => r.id !== u.id));
      appToast.success("User removed");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {dialog}

      <AppBreadcrumb items={[{ label: "Home", href: "/" }, { label: "Design System" }]} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AppStatCard label="Users" value="1,284" icon={Building2} trend={{ label: "+12%", tone: "positive" }} />
        <AppStatCard label="Active" value="942" icon={Building2} />
        <AppStatCard label="Inactive" value="342" icon={Building2} />
      </div>

      <AppAlert
        tone="info"
        title="Design system demo"
        description="Every component here is exported from @/components/common."
      />

      <AppTabs
        items={[
          {
            value: "users",
            label: "Users",
            content: (
              <DataTable
                columns={columns}
                data={rows}
                rowKey={(u) => u.id}
                title="Team members"
                description="Manage who can access the workspace."
                searchable
                selectable
                bulkActions={[
                  {
                    label: "Delete",
                    icon: Trash2,
                    destructive: true,
                    onClick: (selected) => {
                      setRows((rs) => rs.filter((r) => !selected.includes(r)));
                      appToast.success(`${selected.length} removed`);
                    },
                  },
                ]}
                rowActions={[
                  { label: "Edit", icon: Pencil, onClick: () => modal.onOpen() },
                  { label: "Remove", icon: Trash2, destructive: true, onClick: remove },
                ]}
                toolbar={
                  <Button onClick={modal.onOpen} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Add user
                  </Button>
                }
                emptyState={{ title: "No users", description: "Add your first user." }}
                pagination={{ pageSize: 10 }}
              />
            ),
          },
          {
            value: "empty",
            label: "Empty state",
            content: (
              <AppCard>
                <EmptyState
                  title="Nothing here yet"
                  description="Try creating your first record."
                  action={<Button>Create</Button>}
                />
              </AppCard>
            ),
          },
        ]}
      />

      <AppModal
        open={modal.open}
        onOpenChange={modal.setOpen}
        title="Add user"
        description="Invite a teammate."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={modal.onClose}>Cancel</Button>
            <Button
              onClick={() => {
                appToast.success("User invited");
                modal.onClose();
              }}
            >
              Send invite
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <AppInput label="Full name" placeholder="Jane Doe" required />
          <AppInput label="Email" type="email" placeholder="jane@example.com" required />
          <AppSelect
            label="Role"
            placeholder="Pick a role"
            options={[
              { label: "Admin", value: "admin" },
              { label: "Member", value: "member" },
            ]}
          />
        </div>
      </AppModal>
    </div>
  );
}
