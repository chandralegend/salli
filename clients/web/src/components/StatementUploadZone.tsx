"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatementUploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  loading?: boolean;
}

export function StatementUploadZone({
  onUpload,
  loading,
}: StatementUploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    await onUpload(files[0]);
  }

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-[16px] p-10 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer",
        dragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-secondary/30"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.xlsx,.csv"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {loading ? (
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      ) : (
        <Upload
          className={cn(
            "w-8 h-8",
            dragging ? "text-primary" : "text-muted-foreground"
          )}
        />
      )}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {loading ? "Parsing statement…" : "Drop your bank statement"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, XLSX, or CSV · Any Sri Lankan bank
        </p>
      </div>
    </div>
  );
}
