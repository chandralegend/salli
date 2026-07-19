import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteDocumentDocumentsDocIdDelete, listDocumentsDocumentsGet } from "@/lib/api/sdk.gen";

export type SalliDocument = {
  id: string;
  title: string;
  content: string;
  mime_type: string;
  tags: string[];
  source: string;
  namespace: "documents" | "memories" | string;
  slug: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data } = await listDocumentsDocumentsGet({ throwOnError: true });
      return (data as unknown as { documents: SalliDocument[]; count: number }).documents;
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDocumentDocumentsDocIdDelete({ path: { doc_id: id }, throwOnError: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}
