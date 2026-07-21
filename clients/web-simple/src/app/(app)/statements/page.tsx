"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatementFlow } from "@/components/statements/StatementFlow";

export default function StatementsPage() {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <PageHeader title="Statements" subtitle="Import bank activity into your ledger" />
      <StatementFlow onViewLedger={() => router.push("/ledger")} />
    </div>
  );
}
