"use client";

import { ReactNode, useMemo, useState } from "react";
import JSZip from "jszip";
import NftCard from "@/components/NftCard";
import { generate } from "@/lib/generator";
import { ManifestSettings } from "@/lib/manifest";
import {
  CATEGORIES,
  CategoryKey,
  GeneratedNft,
  SpriteSource,
  TraitOption,
} from "@/lib/types";

const OPTIONAL_UI: { key: CategoryKey; label: string }[] = [
  { key: "Aura", label: "Auras" },
  { key: "Helmet", label: "Helmets" },
  { key: "Armor", label: "Armors" },
  { key: "Weapon", label: "Weapons" },
];

interface Props {
  base: SpriteSource;
  options: Record<CategoryKey, TraitOption[]>;
  settings: ManifestSettings;
  onSettingsChange: (s: ManifestSettings) => void;
  headerRight?: ReactNode;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-400">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function GeneratorPanel({
  base,
  options,
  settings,
  onSettingsChange,
  headerRight,
}: Props) {
  const [count, setCount] = useState(12);
  const [mode, setMode] = useState<"random" | "all">("random");
  const [seed, setSeed] = useState("");
  const [emptyPct, setEmptyPct] = useState<Partial<Record<CategoryKey, number>>>({});

  const [results, setResults] = useState<GeneratedNft[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<ManifestSettings>) => onSettingsChange({ ...settings, ...p });

  const allCombos = useMemo(() => {
    let n = 1;
    for (const c of CATEGORIES) {
      if (c.key === "Base") continue;
      const len = options[c.key].length;
      if (len) n *= len + (c.optional ? 1 : 0);
    }
    return n;
  }, [options]);

  async function handleGenerate() {
    setError(null);
    setBusy(true);
    setResults((old) => {
      old.forEach((n) => URL.revokeObjectURL(n.url));
      return [];
    });
    setProgress({ done: 0, total: mode === "all" ? allCombos : count });
    try {
      const noneWeights: Partial<Record<CategoryKey, number>> = {};
      for (const c of CATEGORIES) {
        if (c.key === "Base") continue;
        const pct = (emptyPct[c.key] ?? 0) / 100;
        const n = options[c.key].length;
        noneWeights[c.key] = pct >= 1 ? 1e6 : n > 0 ? (pct * n) / (1 - pct) : 0;
      }
      const nfts = await generate({
        base,
        options,
        noneWeights,
        opts: {
          count,
          frameMs: settings.frameMs,
          mode,
          frameSize: null,
          frames: settings.frames > 0 ? settings.frames : null,
          columns: settings.columns > 0 ? settings.columns : null,
          namePrefix: settings.namePrefix,
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
            name: `${settings.namePrefix} #${nft.id}`,
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
    a.download = `${settings.namePrefix.toLowerCase()}-nfts.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Trait gallery */}
        <div className="space-y-3">
          {OPTIONAL_UI.filter((c) => options[c.key].length > 0).map((c) => (
            <div key={c.key} className="rounded-xl border border-edge bg-panel/60 p-3">
              <div className="mb-2 text-sm font-semibold">
                {c.label}{" "}
                <span className="text-xs font-normal text-slate-500">
                  ({options[c.key].length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {options[c.key].map((o) => (
                  <span
                    key={o.name}
                    className="rounded-md bg-white/5 px-2 py-1 text-xs text-slate-300"
                  >
                    {o.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="space-y-4 rounded-xl border border-edge bg-panel p-4">
          {headerRight}

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
              value={settings.frameMs}
              onChange={(e) => patch({ frameMs: Math.max(10, Number(e.target.value)) })}
              className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Frames / sheet">
              <input
                type="number"
                min={0}
                value={settings.frames}
                onChange={(e) => patch({ frames: Math.max(0, Number(e.target.value)) })}
                placeholder="auto"
                className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Columns">
              <input
                type="number"
                min={0}
                value={settings.columns}
                onChange={(e) => patch({ columns: Math.max(0, Number(e.target.value)) })}
                placeholder="1 row"
                className="w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <Field label="Name prefix">
            <input
              value={settings.namePrefix}
              onChange={(e) => patch({ namePrefix: e.target.value })}
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

          {OPTIONAL_UI.some((c) => options[c.key].length > 0) && (
            <div className="space-y-2 rounded-lg bg-ink/60 p-3">
              <div className="text-xs font-medium text-slate-400">Chance a layer is left empty</div>
              {OPTIONAL_UI.filter((c) => options[c.key].length > 0).map((c) => (
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

          <button
            onClick={handleGenerate}
            disabled={busy}
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
      </div>

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
              <NftCard key={nft.id} nft={nft} namePrefix={settings.namePrefix} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
