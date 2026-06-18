import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className={cn("flex-1 min-w-0 overflow-auto", className)}>
        {children}
      </main>
    </div>
  );
}
