"use client";

import { useState } from "react";
import { Trash2, FileText, Brain, Upload, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDocuments, type AgentDocument } from "@/hooks/useDocuments";
import { PageShell, PageHeader } from "@/components/ui/page-shell";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SOURCE_STYLES: Record<string, string> = {
  agent_created: "bg-blue-50 text-blue-700 border-blue-200",
  user_upload: "bg-purple-50 text-purple-700 border-purple-200",
  agent_memory: "bg-amber-50 text-amber-700 border-amber-200",
};

const SOURCE_LABELS: Record<string, string> = {
  agent_created: "Agent",
  user_upload: "Upload",
  agent_memory: "Memory",
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function DocRow({
  doc,
  onView,
  onDelete,
}: {
  doc: AgentDocument;
  onView: (d: AgentDocument) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <TableRow
      className="cursor-pointer hover:bg-accent/40"
      onClick={() => onView(doc)}
    >
      <TableCell className="py-2.5">
        <div>
          <p className="text-[13px] font-medium leading-tight">{doc.title}</p>
          {doc.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{doc.description}</p>
          )}
        </div>
      </TableCell>
      <TableCell className="py-2.5">
        <Badge
          variant="outline"
          className={`text-[10px] ${SOURCE_STYLES[doc.source] ?? ""}`}
        >
          {SOURCE_LABELS[doc.source] ?? doc.source}
        </Badge>
      </TableCell>
      <TableCell className="py-2.5">
        <div className="flex flex-wrap gap-1">
          {(doc.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] bg-muted border border-border/50 rounded-full px-2 py-0.5">
              {t}
            </span>
          ))}
        </div>
      </TableCell>
      <TableCell className="py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">
        {fmtDate(doc.updated_at)}
      </TableCell>
      <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(doc.id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function MemoryRow({ doc, onDelete }: { doc: AgentDocument; onDelete: (id: string) => void }) {
  return (
    <TableRow>
      <TableCell className="py-2 font-mono text-[12px] text-muted-foreground">
        {doc.slug ?? doc.title}
      </TableCell>
      <TableCell className="py-2 text-[13px] max-w-sm truncate">{doc.content ?? "—"}</TableCell>
      <TableCell className="py-2 text-[11px] text-muted-foreground whitespace-nowrap">
        {fmtDate(doc.updated_at)}
      </TableCell>
      <TableCell className="py-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(doc.id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function DocTable({
  docs,
  loading,
  onView,
  onDelete,
}: {
  docs: AgentDocument[] | undefined;
  loading: boolean;
  onView: (d: AgentDocument) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (!docs || docs.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FileText className="size-8 mx-auto mb-3 opacity-30" />
        <p className="text-[13px]">No documents yet.</p>
        <p className="text-[12px] mt-1 opacity-70">Ask the agent to save a note or upload a file in chat.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto mt-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[11px]">Document</TableHead>
            <TableHead className="text-[11px]">Source</TableHead>
            <TableHead className="text-[11px]">Tags</TableHead>
            <TableHead className="text-[11px]">Updated</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((d) => (
            <DocRow key={d.id} doc={d} onView={onView} onDelete={onDelete} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MemoryTable({
  docs,
  loading,
  onDelete,
}: {
  docs: AgentDocument[] | undefined;
  loading: boolean;
  onDelete: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (!docs || docs.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Brain className="size-8 mx-auto mb-3 opacity-30" />
        <p className="text-[13px]">No memories yet.</p>
        <p className="text-[12px] mt-1 opacity-70">
          Tell the agent to remember something and it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto mt-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[11px]">Key</TableHead>
            <TableHead className="text-[11px]">Value</TableHead>
            <TableHead className="text-[11px]">Updated</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((d) => (
            <MemoryRow key={d.id} doc={d} onDelete={onDelete} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [viewDoc, setViewDoc] = useState<AgentDocument | null>(null);
  const [tab, setTab] = useState("documents");

  const { documents: docsQuery, deleteDocument } = useDocuments({
    namespace: tab === "memories" ? "memories" : "documents",
    search: search || undefined,
  });

  const docs = docsQuery.data ?? [];

  return (
    <PageShell>
      <PageHeader title="Documents" subtitle="AI-saved documents and memories from Scrooge" />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between mb-5">
          <TabsList>
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="size-3.5" />
              Documents {tab === "documents" && docs.length > 0 ? `(${docs.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="memories" className="gap-1.5">
              <Brain className="size-3.5" />
              Memories {tab === "memories" && docs.length > 0 ? `(${docs.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-[12px] w-56"
              placeholder="Search title and content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-card rounded-[20px] overflow-hidden">
          <TabsContent value="documents" className="mt-0">
            <DocTable
              docs={docs}
              loading={docsQuery.isLoading}
              onView={setViewDoc}
              onDelete={(id) => deleteDocument.mutate(id)}
            />
          </TabsContent>

          <TabsContent value="memories" className="mt-0">
            <MemoryTable
              docs={docs}
              loading={docsQuery.isLoading}
              onDelete={(id) => deleteDocument.mutate(id)}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Document content viewer */}
      <Dialog open={!!viewDoc} onOpenChange={(o) => !o && setViewDoc(null)}>
        {viewDoc && (
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[15px]">{viewDoc.title}</DialogTitle>
              <div className="flex items-center gap-2 pt-1">
                <Badge
                  variant="outline"
                  className={`text-[10px] ${SOURCE_STYLES[viewDoc.source] ?? ""}`}
                >
                  {SOURCE_LABELS[viewDoc.source] ?? viewDoc.source}
                </Badge>
                {(viewDoc.tags ?? []).map((t) => (
                  <span key={t} className="text-[10px] bg-muted border border-border/50 rounded-full px-2 py-0.5">
                    {t}
                  </span>
                ))}
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {fmtDate(viewDoc.updated_at)}
                </span>
              </div>
            </DialogHeader>
            {viewDoc.content ? (
              <div className="prose prose-sm max-w-none text-[13px] mt-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewDoc.content}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Upload className="size-5 mr-2 opacity-50" />
                <span className="text-[13px]">Binary file — content not previewable</span>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </PageShell>
  );
}
