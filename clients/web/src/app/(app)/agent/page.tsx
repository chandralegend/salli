"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useScroogePanel } from "@/lib/store";

function AgentRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const { open } = useScroogePanel();

  useEffect(() => {
    const threadId = params.get("s") ?? undefined;
    open(threadId);
    router.replace("/dashboard");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function AgentPage() {
  return (
    <Suspense fallback={null}>
      <AgentRedirect />
    </Suspense>
  );
}
