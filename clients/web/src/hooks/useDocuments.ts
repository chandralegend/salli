"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";

export type AgentDocument = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  storage_key: string | null;
  mime_type: string;
  tags: string[];
  source: "user_upload" | "agent_created" | "agent_memory";
  namespace: string;
  slug: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export function useDocuments(params?: {
  namespace?: string;
  search?: string;
  tags?: string[];
}) {
  const qc = useQueryClient();
  const qKey = ["agent-documents", params?.namespace, params?.search, params?.tags?.join(",")];

  const documents = useQuery({
    queryKey: qKey,
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.namespace) qs.set("namespace", params.namespace);
      if (params?.search) qs.set("search", params.search);
      (params?.tags ?? []).forEach((t) => qs.append("tags", t));
      const data = await apiFetch<{ documents: AgentDocument[]; count: number }>(
        "GET",
        `/documents/?${qs.toString()}`
      );
      return data.documents;
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (docId: string) => {
      await apiFetch("DELETE", `/documents/${docId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agent-documents"] });
      toast.success("Document deleted");
    },
    onError: (e) =>
      toast.error(`Failed to delete: ${e instanceof Error ? e.message : "Unknown error"}`),
  });

  return { documents, deleteDocument };
}
