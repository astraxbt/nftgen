import { CategoryKey } from "./types";

/** A trait within a saved project (spritesheet lives at `url`). */
export interface ManifestTrait {
  name: string;
  url: string;
}

/** Default generation settings baked into a shared project. */
export interface ManifestSettings {
  frameMs: number;
  frames: number; // 0 = auto-detect
  columns: number; // 0 = single row
  namePrefix: string;
}

/** A saved, shareable project: base sheet + traits per category + settings. */
export interface ProjectManifest {
  id: string;
  title: string;
  createdAt: string; // ISO
  base: { name: string; url: string };
  categories: Partial<Record<CategoryKey, ManifestTrait[]>>;
  settings: ManifestSettings;
}

export const MANIFEST_PATH = (id: string) => `projects/${id}/manifest.json`;
export const ASSET_PREFIX = (id: string) => `projects/${id}/assets`;
