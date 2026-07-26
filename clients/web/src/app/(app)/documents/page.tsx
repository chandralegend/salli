"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Book, FileText, FolderOpen, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { EntityCard } from "@/components/shared/EntityCard";
import { StatusChip, type ChipTone } from "@/components/shared/StatusChip";
import { useDocuments, type AgentDocument } from "@/hooks/useDocuments";
import { formatDate } from "@/lib/format";

const SOURCE_META: Record<string, { label: string; tone: ChipTone }> = {
  agent_created: { label: "Agent", tone: "info" },
  user_upload: { label: "Upload", tone: "neutral" },
  agent_memory: { label: "Memory", tone: "success" },
};

function useDebounced(value: string, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const isText = (d: AgentDocument) =>
  d.content != null || d.mime_type.startsWith("text/") || d.mime_type.includes("markdown");

const TAB_LABELS: Record<"documents" | "memories", string> = { documents: "Documents", memories: "Memories" };

export default function DocumentsPage() {
  const [tab, setTab] = useState<"documents" | "memories">("documents");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [viewing, setViewing] = useState<AgentDocument | null>(null);
  const [deleting, setDeleting] = useState<AgentDocument | null>(null);

  const { documents, deleteDocument } = useDocuments({
    namespace: tab,
    search: debouncedSearch || undefined,
  });
  const docs = documents.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="What Salli has read and remembered"
        breadcrumbTab={TAB_LABELS[tab]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="memories">Memories</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-72 max-w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles, tags…"
            className="pl-8"
          />
        </div>
      </div>

      <div>
        {tab === "memories" && docs.length > 0 && (
          <p className="mb-3 text-xs text-muted-foreground">
            Facts Salli remembers about you across conversations. Delete anything — it forgets immediately.
          </p>
        )}
        {documents.isLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[62px] rounded-xl" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={tab === "documents" ? FolderOpen : FileText}
            title={search ? "No matches" : tab === "documents" ? "Nothing saved yet" : "No memories yet"}
            body={
              search
                ? "Try a different search."
                : tab === "documents"
                  ? "Documents appear here when you share files with Salli AI or when it saves its work."
                  : "Salli saves facts about you as you chat."
            }
          />
        ) : tab === "documents" ? (
          <div className="space-y-1.5">
            {docs.map((d) => {
              const src = SOURCE_META[d.source] ?? { label: d.source, tone: "neutral" as ChipTone };
              const preview = (d.description || d.content || "").trim();
              return (
                <EntityCard
                  key={d.id}
                  icon={FileText}
                  title={d.title}
                  titleChip={<StatusChip tone={src.tone}>{src.label}</StatusChip>}
                  subtitle={
                    <span className="flex items-center gap-1.5">
                      {preview && <span className="truncate">{preview}</span>}
                      {preview && <span className="text-muted-foreground/50">·</span>}
                      <span className="shrink-0">{formatDate(d.updated_at)}</span>
                    </span>
                  }
                  onClick={() => setViewing(d)}
                  trailing={
                    <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete document"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(d);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="space-y-1.5">
            {docs.map((d) => (
              <EntityCard
                key={d.id}
                icon={Book}
                title={d.slug ?? d.title}
                subtitle={
                  <span className="flex items-center gap-1.5">
                    <span className="truncate">{d.content ?? "—"}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="shrink-0">{formatDate(d.updated_at)}</span>
                  </span>
                }
                trailing={
                  <div className="flex shrink-0 gap-0.5 opacity-40 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete memory"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleting(d);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Viewer */}
      <Dialog open={Boolean(viewing)} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
            <DialogDescription>
              <span className="inline-flex items-center gap-2">
                {viewing && (
                  <StatusChip tone={SOURCE_META[viewing.source]?.tone ?? "neutral"}>
                    {SOURCE_META[viewing.source]?.label ?? viewing.source}
                  </StatusChip>
                )}
                {viewing?.tags.map((t) => (
                  <StatusChip key={t} tone="neutral">
                    {t}
                  </StatusChip>
                ))}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {viewing && isText(viewing) ? (
              <div className="text-[15px] leading-[1.7] [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:bg-muted [&_code]:rounded [&_code]:px-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewing.content ?? ""}</ReactMarkdown>
              </div>
            ) : (
              <div className="py-10 text-center">
                <FileText className="size-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-3">
                  This is a binary file ({viewing?.mime_type}) — preview isn&apos;t available.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="border-t pt-3 sm:justify-between">
            <span className="text-xs text-muted-foreground self-center">
              Updated {viewing ? formatDate(viewing.updated_at) : ""}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleting(viewing);
                setViewing(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.namespace === "memories" ? "memory" : "document"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `“${deleting.title}” — ` : ""}Salli will no longer reference it. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) deleteDocument.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
