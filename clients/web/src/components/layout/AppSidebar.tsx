"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Calculator,
  Bot,
  Bell,
  Settings,
  LogOut,
  ChevronsUpDown,
  FolderOpen,
  Plus,
  ChevronDown,
  Trash2,
  Compass,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useAgentSessions, useDeleteSession } from "@/hooks/useAgentSessions";
import { cn } from "@/lib/utils";

const MAX_SIDEBAR_SESSIONS = 5;

const NAV_MAIN = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/statements", label: "Statements", icon: FileText },
  { href: "/tax", label: "Tax", icon: Calculator },
  { href: "/financial-independence", label: "Financial Freedom", icon: Compass },
];

const NAV_MANAGE = [
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

function truncate(s: string | null | undefined, n = 28): string {
  if (!s) return "Untitled session";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout, token } = useAuth();

  // Active session thread id comes from the URL (?s=...)
  const activeThreadId = searchParams.get("s");

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const isDev = !token || token === "dev-user";
  const displayName = isDev ? "Dev User" : "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const { data: sessions = [] } = useAgentSessions();
  const { mutate: deleteSession } = useDeleteSession();

  const onAgent = isActive("/agent");

  // Controlled open state — auto-expands when navigating to /agent
  const [agentExpanded, setAgentExpanded] = useState(onAgent);
  useEffect(() => {
    if (onAgent) setAgentExpanded(true);
  }, [onAgent]);

  const visibleSessions = sessions.slice(0, MAX_SIDEBAR_SESSIONS);
  const extraCount = Math.max(0, sessions.length - MAX_SIDEBAR_SESSIONS);

  function switchSession(id: string) {
    router.push(`/agent?s=${id}`);
  }

  function newSession() {
    router.push(`/agent?s=${crypto.randomUUID()}`);
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <Sidebar collapsible="icon">
      {/* Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <Logo className="size-8" />
              <div className="flex flex-col gap-0 text-left leading-tight">
                <span className="truncate text-sm font-semibold text-sidebar-foreground">Salli</span>
                <span className="truncate text-[11px] text-sidebar-foreground/50">Finance &amp; Tax</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-2 mb-0.5">
            Navigate
          </SidebarGroupLabel>
          <SidebarMenu>
            {NAV_MAIN.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  render={<Link href={href} />}
                  isActive={isActive(href)}
                  tooltip={label}
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground data-[active=true]:text-sidebar-foreground data-[active=true]:bg-sidebar-accent font-medium"
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}

            {/* AI Agent — expandable session list */}
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/agent" />}
                isActive={onAgent}
                tooltip="AI Agent"
                onClick={() => setAgentExpanded(e => !e)}
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground data-[active=true]:text-sidebar-foreground data-[active=true]:bg-sidebar-accent font-medium"
              >
                <Bot className="size-4 shrink-0" />
                <span>AI Agent</span>
                <ChevronDown
                  className={cn(
                    "ml-auto size-3.5 opacity-50 transition-transform duration-150",
                    agentExpanded && "rotate-180",
                  )}
                />
              </SidebarMenuButton>

              {agentExpanded && (
                <SidebarMenuSub className="mr-0 pr-0">
                  {/* New session */}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      onClick={newSession}
                      className="text-sidebar-foreground/50 hover:text-sidebar-foreground cursor-pointer gap-1.5"
                    >
                      <Plus className="size-3 shrink-0" />
                      <span className="text-[11px]">New session</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>

                  {/* Session list */}
                  {visibleSessions.map((session) => {
                    const active = session.thread_id === activeThreadId && onAgent;
                    return (
                      <SidebarMenuSubItem key={session.thread_id} className="group/session relative">
                        <SidebarMenuSubButton
                          onClick={() => switchSession(session.thread_id)}
                          isActive={active}
                          className={cn(
                            "cursor-pointer text-[11px] pr-6",
                            active
                              ? "text-sidebar-foreground font-medium"
                              : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
                          )}
                        >
                          <span className="truncate">{truncate(session.title)}</span>
                        </SidebarMenuSubButton>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.thread_id);
                            if (active) newSession();
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/session:opacity-100 transition-opacity text-sidebar-foreground/40 hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </SidebarMenuSubItem>
                    );
                  })}

                  {extraCount > 0 && (
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        render={<Link href="/agent/sessions" />}
                        className="text-[11px] text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
                      >
                        <span>+{extraCount} more sessions</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )}

                  {sessions.length === 0 && (
                    <SidebarMenuSubItem>
                      <p className="px-2 py-1 text-[10px] text-sidebar-foreground/30 italic">
                        No sessions yet
                      </p>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Manage nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-2 mb-0.5">
            Manage
          </SidebarGroupLabel>
          <SidebarMenu>
            {NAV_MANAGE.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  render={<Link href={href} />}
                  isActive={isActive(href)}
                  tooltip={label}
                  className="text-sidebar-foreground/70 hover:text-sidebar-foreground data-[active=true]:text-sidebar-foreground data-[active=true]:bg-sidebar-accent font-medium"
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* User footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[popup-open]:bg-sidebar-accent"
                  />
                }
              >
                <Avatar className="h-7 w-7 rounded-md">
                  <AvatarFallback className="rounded-md bg-primary/25 text-primary text-[11px] font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0 text-left leading-tight min-w-0">
                  <span className="truncate text-[13px] font-medium text-sidebar-foreground">{displayName}</span>
                  <span className="truncate text-[11px] text-sidebar-foreground/50">YA 2025/26 · LKR</span>
                </div>
                <ChevronsUpDown className="ml-auto size-3.5 text-sidebar-foreground/40" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="min-w-52 rounded-lg"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
