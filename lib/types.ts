export type CategoryKey = "Aura" | "Base" | "Helmet" | "Armor" | "Weapon";

/** Category folders in z-order BACK -> FRONT. `folder` maps to the uploaded folder name. */
export const CATEGORIES: { key: CategoryKey; folder: string; optional: boolean }[] = [
  { key: "Aura", folder: "Auras", optional: true },
  { key: "Base", folder: "", optional: false },
  { key: "Helmet", folder: "Helmets", optional: true },
  { key: "Armor", folder: "Armors", optional: true },
  { key: "Weapon", folder: "Weapons", optional: true },
];

export interface TraitOption {
  category: CategoryKey;
  name: string;
  /** Local file (owner uploading) OR remote url (shared project). One is set. */
  file?: File;
  url?: string;
  weight: number;
}

/** A spritesheet source: a local File or a remote URL. */
export type SpriteSource = File | string;

export function sourceOf(opt: TraitOption): SpriteSource {
  const src = opt.file ?? opt.url;
  if (!src) throw new Error(`trait ${opt.category}/${opt.name} has no file or url`);
  return src;
}

export function sourceKey(src: SpriteSource): string {
  return typeof src === "string" ? src : `${src.name}:${src.size}:${src.lastModified}`;
}

export interface GeneratedNft {
  id: number;
  url: string; // object URL of the APNG blob
  blob: Blob;
  traits: { category: CategoryKey; name: string }[];
}

export interface GenerateOptions {
  count: number;
  frameMs: number;
  mode: "random" | "all";
  frameSize?: number | null; // force square frame size, else auto-detect
  frames?: number | null; // explicit frame count per spritesheet (0/null = auto)
  columns?: number | null; // frames per row (null = single row)
  namePrefix: string;
  seed?: number | null;
}
