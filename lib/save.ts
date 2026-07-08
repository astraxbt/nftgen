import { ManifestSettings, ManifestTrait, ProjectManifest } from "./manifest";
import { CategoryKey, TraitOption } from "./types";

const OPTIONAL: CategoryKey[] = ["Aura", "Helmet", "Armor", "Weapon"];

function safe(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Upload a single sheet through our own route (server-side put), avoiding the
// CORS restrictions of direct browser->Blob uploads.
async function putFile(file: File, path: string): Promise<string> {
  const res = await fetch(`/api/upload?name=${encodeURIComponent(path)}`, {
    method: "POST",
    headers: { "content-type": "image/png" },
    body: file,
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || `upload failed (${res.status})`);
  }
  const { url } = (await res.json()) as { url: string };
  return url;
}

export interface SaveArgs {
  title: string;
  base: File;
  options: Record<CategoryKey, TraitOption[]>;
  settings: ManifestSettings;
  onProgress?: (done: number, total: number) => void;
}

/** Uploads all spritesheets to Blob then persists a manifest; returns project id. */
export async function saveProject({
  title,
  base,
  options,
  settings,
  onProgress,
}: SaveArgs): Promise<string> {
  const total =
    1 + OPTIONAL.reduce((n, k) => n + options[k].filter((o) => o.file).length, 0);
  let done = 0;
  const tick = () => onProgress?.(++done, total);

  const baseUrl = await putFile(base, `assets/base-${safe(base.name)}`);
  tick();

  const categories: Partial<Record<CategoryKey, ManifestTrait[]>> = {};
  for (const key of OPTIONAL) {
    const traits: ManifestTrait[] = [];
    for (const opt of options[key]) {
      if (!opt.file) continue;
      const url = await putFile(opt.file, `assets/${key}/${safe(opt.name)}-${safe(opt.file.name)}`);
      traits.push({ name: opt.name, url });
      tick();
    }
    if (traits.length) categories[key] = traits;
  }

  const partial: Omit<ProjectManifest, "id" | "createdAt"> = {
    title,
    base: { name: base.name, url: baseUrl },
    categories,
    settings,
  };

  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(partial),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || `save failed (${res.status})`);
  }
  const { id } = (await res.json()) as { id: string };
  return id;
}
