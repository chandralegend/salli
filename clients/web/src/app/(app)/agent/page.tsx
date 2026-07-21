"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useScroogePanel } from "@/lib/store";

/** Deep-link entry point: /agent?s=<threadId> opens the drawer on the dashboard. */
function AgentRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const open = useScroogePanel((s) => s.open);

  useEffect(() => {
    const t = setTimeout(() => {
      const threadId = params.get("s") ?? undefined;
      open(threadId);
      router.replace("/dashboard");
    }, 0);
    return () => clearTimeout(t);
  }, [params, open, router]);

  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense fallback={null}>
      <AgentRedirect />
    </Suspense>
  );
}
