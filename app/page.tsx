"use client";

import { useMemo, useState } from "react";
import FolderDrop from "@/components/FolderDrop";
import GeneratorPanel from "@/components/GeneratorPanel";
import SaveShare from "@/components/SaveShare";
import { ManifestSettings } from "@/lib/manifest";
import { parseCategoryFiles, pickBaseFile, UploadedFile } from "@/lib/upload";
import { CategoryKey, TraitOption } from "@/lib/types";

const CATEGORY_UI: { key: CategoryKey; label: string; hint: string }[] = [
  { key: "Aura", label: "Auras", hint: "back layer" },
  { key: "Helmet", label: "Helmets", hint: "" },
  { key: "Armor", label: "Armors", hint: "" },
  { key: "Weapon", label: "Weapons", hint: "front layer" },
];

const emptyOptions = (): Record<CategoryKey, TraitOption[]> => ({
  Aura: [],
  Base: [],
  Helmet: [],
  Armor: [],
  Weapon: [],
});

export default function Page() {
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [options, setOptions] = useState<Record<CategoryKey, TraitOption[]>>(emptyOptions);
  const [settings, setSettings] = useState<ManifestSettings>({
    frameMs: 100,
    frames: 12,
    columns: 0,
    namePrefix: "NFT",
  });

  const totalTraits = useMemo(
    () => Object.values(options).reduce((n, arr) => n + arr.length, 0),
    [options]
  );

  function setCategory(key: CategoryKey, uploaded: UploadedFile[]) {
    setOptions((prev) => ({ ...prev, [key]: parseCategoryFiles(uploaded, key) }));
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          NFTGen <span className="text-accent">Animated APNG Studio</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Upload trait spritesheets, pick a count, and generate layered animated NFTs — all in your
          browser. Layer order (back→front): Aura → Base → Helmet → Armor → Weapon.
        </p>
      </header>

      {/* Uploads */}
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <FolderDrop
            label="Base spritesheet"
            hint="single PNG — the character drawn on every NFT"
            directory={false}
            summary={baseFile ? baseFile.name : null}
            onFiles={(f) => setBaseFile(pickBaseFile(f))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {CATEGORY_UI.map((c) => (
              <FolderDrop
                key={c.key}
                label={c.label}
                hint={c.hint || "folder of trait subfolders"}
                summary={
                  options[c.key].length
                    ? `${options[c.key].length} trait(s): ${options[c.key]
                        .map((o) => o.name)
                        .join(", ")}`
                    : null
                }
                onFiles={(f) => setCategory(c.key, f)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg bg-ink/60 p-3 text-xs text-slate-400">
            {baseFile ? "Base ✓" : "Base ✗"} · {totalTraits} trait(s) loaded
          </div>
          <p className="text-[11px] text-slate-500">
            Set <span className="text-slate-300">Frames / sheet</span> to how many frames your
            spritesheets have (e.g. from the .gif). Leave 0 to auto-detect square frames. Columns is
            only needed for grid sheets (blank = single horizontal strip).
          </p>
          <SaveShare base={baseFile} options={options} settings={settings} />
        </div>
      </section>

      {baseFile ? (
        <div className="mt-8">
          <GeneratorPanel
            base={baseFile}
            options={options}
            settings={settings}
            onSettingsChange={setSettings}
          />
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-edge py-16 text-center text-sm text-slate-500">
          Upload a base spritesheet to start generating.
        </div>
      )}
    </main>
  );
}
