"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import GeneratorPanel from "@/components/GeneratorPanel";
import { ManifestSettings, ProjectManifest } from "@/lib/manifest";
import { CategoryKey, TraitOption } from "@/lib/types";

const OPTIONAL: CategoryKey[] = ["Aura", "Helmet", "Armor", "Weapon"];

const emptyOptions = (): Record<CategoryKey, TraitOption[]> => ({
  Aura: [],
  Base: [],
  Helmet: [],
  Armor: [],
  Weapon: [],
});

export default function SharedProjectPage({ params }: { params: { id: string } }) {
  const [manifest, setManifest] = useState<ProjectManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<ManifestSettings | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${params.id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(res.status === 404 ? "Project not found." : "Failed to load project.");
        const m = (await res.json()) as ProjectManifest;
        if (!alive) return;
        setManifest(m);
        setSettings(m.settings);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.id]);

  const options = useMemo<Record<CategoryKey, TraitOption[]> | null>(() => {
    if (!manifest) return null;
    const o = emptyOptions();
    for (const key of OPTIONAL) {
      o[key] = (manifest.categories[key] ?? []).map((t) => ({
        category: key,
        name: t.name,
        url: t.url,
        weight: 1,
      }));
    }
    return o;
  }, [manifest]);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            {manifest?.title ?? "NFTGen"}{" "}
            <span className="text-accent">Animated APNG Studio</span>
          </h1>
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-200">
            + New project
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Shared collection — pick a count and generate as many animated NFTs as you like. Layer
          order (back→front): Aura → Base → Helmet → Armor → Weapon.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 py-16 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      {!error && (!manifest || !options || !settings) && (
        <div className="rounded-xl border border-dashed border-edge py-16 text-center text-sm text-slate-500">
          Loading project…
        </div>
      )}

      {manifest && options && settings && (
        <GeneratorPanel
          base={manifest.base.url}
          options={options}
          settings={settings}
          onSettingsChange={setSettings}
        />
      )}
    </main>
  );
}
