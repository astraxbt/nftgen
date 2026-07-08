"use client";

import { useEffect, useRef, useState } from "react";
import { filesFromDrop, toUploaded, UploadedFile } from "@/lib/upload";

interface Props {
  label: string;
  hint: string;
  /** true = choose a folder (webkitdirectory); false = single file. */
  directory?: boolean;
  summary?: string | null;
  onFiles: (files: UploadedFile[]) => void;
}

export default function FolderDrop({ label, hint, directory = true, summary, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState(false);

  // webkitdirectory / directory are non-standard attributes; set them imperatively.
  useEffect(() => {
    const el = inputRef.current;
    if (el && directory) {
      el.setAttribute("webkitdirectory", "");
      el.setAttribute("directory", "");
    }
  }, [directory]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setHover(false);
        const files = await filesFromDrop(e.dataTransfer);
        if (files.length) onFiles(files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition ${
        hover ? "border-accent bg-accent/10" : "border-edge bg-panel/60 hover:border-accent/60"
      }`}
    >
      <div className="text-sm font-semibold text-slate-100">{label}</div>
      <div className="mt-1 text-xs text-slate-400">{hint}</div>
      {summary ? (
        <div className="mt-2 truncate text-xs font-medium text-accent">{summary}</div>
      ) : (
        <div className="mt-2 text-xs text-slate-500">drop here or click to choose</div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={directory ? undefined : "image/png"}
        multiple={directory}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(toUploaded(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}
