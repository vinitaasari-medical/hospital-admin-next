'use client';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X, Menu, ChevronDown, Check, User, PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebarCollapse } from "@/hooks/use-sidebar-collapse";
import { useScope } from "@/hooks/use-scope";
import { useAuth } from "@/hooks/useAuth";
import { pttSidebarItems } from "@/components/ptt/pttSidebarItems";
import type { SidebarItem } from "@/config/scopes";

interface DashboardSidebarProps {
  items?: SidebarItem[];
  title?: string;
}

const DashboardSidebar = (_props: DashboardSidebarProps = {}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapse();
  const { scope, scopes, switchScope } = useScope();
  const title = "MedicalCircles";

  const { getUser, getUserEmail, logout } = useAuth();
  const [authUser, setAuthUser] = useState<ReturnType<typeof getUser>>(null);
  const [displayEmail, setDisplayEmail] = useState("");

  useEffect(() => {
    const sync = () => {
      setAuthUser(getUser());
      setDisplayEmail(getUserEmail() ?? "");
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const displayName = authUser
    ? `${authUser.first_name ?? ""} ${authUser.last_name ?? ""}`.trim() || "Admin"
    : "Admin";
  const userInitials = authUser
    ? `${authUser.first_name?.[0] ?? ""}${authUser.last_name?.[0] ?? ""}`.toUpperCase() || "A"
    : "A";
  const userPhotoUrl = authUser?.profile_url || "";

  const isPTT = pathname.startsWith("/admin/ptt");
  const items: SidebarItem[] = isPTT
    ? (pttSidebarItems as SidebarItem[])
    : scope.items.filter((item) => !("hidden" in item && item.hidden));

  const indent: Record<string, string> = {
    super_admin: "",
    cluster: "└ ",
    hospital: "  └ ",
  };

  const renderItem = (item: SidebarItem, isCollapsed: boolean, depth = 0) => {
    if ("section" in item && item.section) {
      if (isCollapsed) return <div key={`section-${item.section}`} className="my-2 border-t border-sidebar-border" />;
      return (
        <div key={`section-${item.section}`} className="pt-4 pb-1 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">{item.section}</p>
        </div>
      );
    }
    const nav = item as Extract<SidebarItem, { path: string }>;
    const isActive = pathname === nav.path;
    const link = (
      <Link
        key={nav.path}
        href={nav.path}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
          isCollapsed ? "px-2.5 py-2.5 justify-center" : "px-3 py-2.5",
          depth > 0 && !isCollapsed && "ml-4",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        )}
      >
        {nav.icon}
        {!isCollapsed && nav.label}
      </Link>
    );
    const wrapped = isCollapsed ? (
      <Tooltip key={nav.path}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>{nav.label}</TooltipContent>
      </Tooltip>
    ) : link;
    return (
      <div key={nav.path}>
        {wrapped}
        {nav.children?.map((child) => renderItem(child, isCollapsed, depth + 1))}
      </div>
    );
  };

  const renderContent = (isCollapsed: boolean) => (
    <>
      <div className={cn("pt-5 pb-2", isCollapsed ? "px-2" : "px-3")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "w-full flex items-center gap-3 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors text-left",
              isCollapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5"
            )}>
              <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground flex-shrink-0">
                {scope.shortName}
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{scope.name}</p>
                    <p className="text-[10px] text-sidebar-muted">{scope.role}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-sidebar-muted flex-shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Switch Dashboard</p>
            {scopes.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onClick={() => switchScope(s.id)}
                className="flex items-center gap-3 py-2.5"
              >
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                  {s.shortName}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    <span className="text-muted-foreground">{indent[s.level]}</span>{s.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{s.role}</p>
                </div>
                {scope.id === s.id && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!isCollapsed && (
        <div className="flex items-center px-5 py-3">
          <img src="/logo.png" alt={title} className="h-7 object-contain" />
        </div>
      )}

      <TooltipProvider delayDuration={0}>
        <nav className={cn("flex-1 space-y-1 overflow-y-auto", isCollapsed ? "px-2" : "px-3")}>
          {items.map((item) => renderItem(item, isCollapsed))}
          <div className="pt-1">
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => logout()}
                    className="w-full flex items-center justify-center px-2.5 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>Logout</TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            )}
          </div>
        </nav>
      </TooltipProvider>

      <div className={cn("py-4 border-t border-sidebar-border", isCollapsed ? "px-2" : "px-3")}>
        <button
          onClick={() => { router.push("/admin/profile"); setMobileOpen(false); }}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg hover:bg-sidebar-accent/50 transition-colors",
            isCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2"
          )}
        >
          <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-xs font-semibold text-sidebar-primary-foreground flex-shrink-0 overflow-hidden">
            {userPhotoUrl
              ? <img src={userPhotoUrl} alt={displayName} className="h-full w-full object-cover" />
              : userInitials}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{displayName}</p>
                <p className="text-xs text-sidebar-muted truncate">{displayEmail}</p>
              </div>
              <User className="h-4 w-4 text-sidebar-muted flex-shrink-0" />
            </>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground shadow-card"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-foreground/40" onClick={() => setMobileOpen(false)}>
          <div className="w-64 h-full bg-sidebar flex flex-col" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-sidebar-foreground">
              <X className="h-5 w-5" />
            </button>
            {renderContent(false)}
          </div>
        </div>
      )}

      <aside
        className={cn(
          "hidden lg:flex flex-col bg-sidebar min-h-screen fixed left-0 top-0 bottom-0 transition-all duration-300 ease-in-out z-30",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {renderContent(collapsed)}
        <button
          onClick={toggle}
          className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-sidebar-muted hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors shadow-sm"
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5 text-slate-400" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </aside>
    </>
  );
};

export default DashboardSidebar;
