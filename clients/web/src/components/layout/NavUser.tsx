"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronsUpDown, LogOut, Moon, Settings, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useProfile } from "@/hooks/useAccountData";
import { useAuth } from "@/lib/auth";

/** True after hydration — gates the theme-dependent icon/label. */
function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function initials(name: string | null | undefined, email: string | null | undefined): string {
  const source = (name || email || "").trim();
  if (!source) return "?";
  const parts = source.split(/[ @._]/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

/** Avatar + popover in the sidebar footer: dark-mode toggle, Settings, Log out. */
export function NavUser() {
  const { data: profile } = useProfile();
  const { logout } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const displayName = profile?.display_name || profile?.email || "Account";
  const email = profile?.display_name ? profile?.email : null;

  async function signOut() {
    await logout();
    localStorage.removeItem("salli_onboarding_complete");
    router.replace("/login");
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover>
          <PopoverTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">{initials(profile?.display_name, profile?.email)}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </PopoverTrigger>
          <PopoverContent side="right" align="end" sideOffset={8} className="w-60 p-1.5">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{initials(profile?.display_name, profile?.email)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 min-w-0 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                {email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
              </div>
            </div>
            <div className="my-1.5 h-px bg-border" />
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              {mounted && theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {mounted && theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <Link href="/settings" className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
              <Settings className="size-4" />
              Settings
            </Link>
            <div className="my-1.5 h-px bg-border" />
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
