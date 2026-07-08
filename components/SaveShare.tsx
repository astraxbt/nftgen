"use client";

import { useState } from "react";
import { ManifestSettings } from "@/lib/manifest";
import { saveProject } from "@/lib/save";
import { CategoryKey, TraitOption } from "@/lib/types";

interface Props {
  base: File | null;
  options: Record<CategoryKey, TraitOption[]>;
  settings: ManifestSettings;
}

export default function SaveShare({ base, options, settings }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSave() {
    if (!base) return;
    setError(null);
    setLink(null);
    setBusy(true);
    try {
      const id = await saveProject({
        title: settings.namePrefix || "Untitled",
        base,
        options,
        settings,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setLink(`${window.location.origin}/p/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-accent/40 bg-accent/10 p-3">
      <div className="text-xs font-semibold text-accent">Share with your team</div>
      <p className="text-[11px] text-slate-400">
        Save your assets to the cloud and get a link anyone can open to generate NFTs.
      </p>
      <button
        onClick={handleSave}
        disabled={busy || !base}
        className="w-full rounded-lg bg-accent py-2 text-sm font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-40"
      >
        {busy ? `Saving… ${progress.done}/${progress.total}` : "Save & create share link"}
      </button>
      {link && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-md border border-edge bg-ink px-2 py-1.5 text-xs"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-md bg-white/10 px-2 py-1.5 text-xs hover:bg-white/20"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
