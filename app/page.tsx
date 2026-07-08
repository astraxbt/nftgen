"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";
import FolderDrop from "@/components/FolderDrop";
import NftCard from "@/components/NftCard";
import { generate } from "@/lib/generator";
import { parseCategoryFiles, pickBaseFile, UploadedFile } from "@/lib/upload";
import { CATEGORIES, CategoryKey, GeneratedNft, TraitOption } from "@/lib/types";

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

  const [count, setCount] = useState(12);
  const [frameMs, setFrameMs] = useState(100);
  const [mode, setMode] = useState<"random" | "all">("random");
  const [namePrefix, setNamePrefix] = useState("NFT");
  const [seed, setSeed] = useState("");
  // Frame layout: explicit frame count / columns per spritesheet (0 = auto-detect).
  const [frames, setFrames] = useState(12);
  const [columns, setColumns] = useState(0);
  // Per-optional-category chance (0-100%) that the layer is left empty.
  const [emptyPct, setEmptyPct] = useState<Partial<Record<CategoryKey, number>>>({});

  const [results, setResults] = useState<GeneratedNft[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const totalTraits = useMemo(
    () => Object.values(options).reduce((n, arr) => n + arr.length, 0),
    [options]
  );

  const allCombos = useMemo(() => {
    let n = 1;
    for (const c of CATEGORIES) {
      if (c.key === "Base") continue;
      const len = options[c.key].length;
      if (len) n *= len + (c.optional ? 1 : 0);
    }
    return baseFile ? n : 0;
  }, [options, baseFile]);

  function setCategory(key: CategoryKey, uploaded: UploadedFile[]) {
    setOptions((prev) => ({ ...prev, [key]: parseCategoryFiles(uploaded, key) }));
  }

  async function handleGenerate() {
    setError(null);
    if (!baseFile) {
      setError("Upload a base spritesheet first.");
      return;
    }
    setBusy(true);
    setResults((old) => {
      old.forEach((n) => URL.revokeObjectURL(n.url));
      return [];
    });
    setProgress({ done: 0, total: mode === "all" ? allCombos : count });
    try {
      // Convert "leave empty %" into a relative weight for the null option.
      const noneWeights: Partial<Record<CategoryKey, number>> = {};
      for (const c of CATEGORIES) {
        if (c.key === "Base") continue;
        const pct = (emptyPct[c.key] ?? 0) / 100;
        const n = options[c.key].length;
        noneWeights[c.key] = pct >= 1 ? 1e6 : n > 0 ? (pct * n) / (1 - pct) : 0;
      }
      const nfts = await generate({
        base: baseFile,
        options,
        noneWeights,
        opts: {
          count,
          frameMs,
          mode,
          frameSize: null,
          frames: frames > 0 ? frames : null,
          columns: columns > 0 ? columns : null,
          namePrefix,
          seed: seed.trim() === "" ? null : Number(seed),
        },
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setResults(nfts);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function downloadAll() {
    const zip = new JSZip();
    for (const nft of results) {
      zip.file(`${nft.id}.png`, nft.blob);
      zip.file(
        `${nft.id}.json`,
        JSON.stringify(
          {
            name: `${namePrefix} #${nft.id}`,
            image: `${nft.id}.png`,
            attributes: nft.traits.map((t) => ({ trait_type: t.category, value: t.name })),
          },
          null,
          2
        )
      );
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${namePrefix.toLowerCase()}-nfts.zip`;
    a.click();
    URL.revokeObjectURL(url);
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

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Uploads */}
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

        {/* Controls */}
        <div className="space-y-4 rounded-xl border border-edge bg-panel p-4">
          <div>
            <label className="text-xs font-medium text-slate-400">Mode</label>
            <div className="mt-1 flex rounded-lg bg-ink p-1">
              {(["random", "all"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm capitalize transition ${
                    mode === m ? "bg-accent text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {m === "all" ? "all combos" : "random"}
                </button>
              ))}
            </div>
          </div>

          {mode === "random" ? (
            <Field label="How many NFTs">
              <input
                type="number"
                min={1}
                value={count}
                onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm"
              />
            </Field>
          ) : (
            <p className="text-xs text-slate-400">
              Will generate <span className="font-semibold text-accent">{allCombos || "—"}</span>{" "}
              unique combinations.
            </p>
          )}

          <Field label="Frame speed (ms/frame)">
            <input
              type="number"
              min={10}
              step={10}
              value={frameMs}
              onChange={(e) => setFrameMs(Math.max(10, Number(e.target.value)))}
              className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Frames / sheet">
              <input
                type="number"
                min={0}
                value={frames}
                onChange={(e) => setFrames(Math.max(0, Number(e.target.value)))}
                placeholder="auto"
                className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Columns">
              <input
                type="number"
                min={0}
                value={columns}
                onChange={(e) => setColumns(Math.max(0, Number(e.target.value)))}
                placeholder="1 row"
                className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm"
              />
            </Field>
          </div>
          <p className="-mt-2 text-[11px] text-slate-500">
            Set <span className="text-slate-300">Frames / sheet</span> to how many frames your
            spritesheet has (e.g. from the .gif). Leave 0 to auto-detect square frames. Columns is
            only needed for grid sheets (blank = single horizontal strip).
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Name prefix">
              <input
                value={namePrefix}
                onChange={(e) => setNamePrefix(e.target.value)}
                className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Seed (optional)">
              <input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="random"
                className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm"
              />
            </Field>
          </div>

          {CATEGORY_UI.some((c) => options[c.key].length > 0) && (
            <div className="space-y-2 rounded-lg bg-ink/60 p-3">
              <div className="text-xs font-medium text-slate-400">Chance a layer is left empty</div>
              {CATEGORY_UI.filter((c) => options[c.key].length > 0).map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-slate-300">{c.label}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={emptyPct[c.key] ?? 0}
                    onChange={(e) =>
                      setEmptyPct((p) => ({ ...p, [c.key]: Number(e.target.value) }))
                    }
                    className="flex-1 accent-accent"
                  />
                  <span className="w-9 text-right tabular-nums text-slate-400">
                    {emptyPct[c.key] ?? 0}%
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="rounded-lg bg-ink/60 p-2 text-xs text-slate-400">
            {baseFile ? "Base ✓" : "Base ✗"} · {totalTraits} trait(s) loaded
          </div>

          <button
            onClick={handleGenerate}
            disabled={busy || !baseFile}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition enabled:hover:brightness-110 disabled:opacity-40"
          >
            {busy ? `Generating… ${progress.done}/${progress.total}` : "Generate"}
          </button>

          {results.length > 0 && (
            <button
              onClick={downloadAll}
              className="w-full rounded-lg border border-edge py-2 text-sm font-medium text-slate-200 hover:bg-white/5"
            >
              Download all ({results.length}) as ZIP
            </button>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </section>

      {/* Dashboard */}
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dashboard</h2>
          {results.length > 0 && (
            <span className="text-sm text-slate-400">{results.length} generated</span>
          )}
        </div>
        {results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-edge py-16 text-center text-sm text-slate-500">
            Generated NFTs will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {results.map((nft) => (
              <NftCard key={nft.id} nft={nft} namePrefix={namePrefix} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-400">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
