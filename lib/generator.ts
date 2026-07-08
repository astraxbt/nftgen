import UPNG from "upng-js";
import {
  CATEGORIES,
  CategoryKey,
  GeneratedNft,
  GenerateOptions,
  TraitOption,
} from "./types";

interface LayerSprite {
  img: HTMLImageElement;
  fw: number;
  fh: number;
  cols: number;
  rows: number;
  frameCount: number;
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/** Infer the frame grid of a spritesheet. Assumes square frames unless forced. */
function detectGrid(w: number, h: number, frameSize?: number | null) {
  if (frameSize && frameSize > 0) {
    if (w % frameSize !== 0 || h % frameSize !== 0) {
      throw new Error(`frame size ${frameSize} does not evenly divide sheet ${w}x${h}`);
    }
    return { fw: frameSize, fh: frameSize, cols: w / frameSize, rows: h / frameSize };
  }
  // Square frames in a single horizontal strip.
  if (w % h === 0 && w >= h) return { fw: h, fh: h, cols: w / h, rows: 1 };
  // Single vertical strip.
  if (h % w === 0 && h > w) return { fw: w, fh: w, cols: 1, rows: h / w };
  // Fallback: whole sheet is one frame.
  return { fw: w, fh: h, cols: 1, rows: 1 };
}

async function toSprite(file: File, frameSize?: number | null): Promise<LayerSprite> {
  const img = await loadImage(file);
  const { fw, fh, cols, rows } = detectGrid(img.width, img.height, frameSize);
  return { img, fw, fh, cols, rows, frameCount: cols * rows };
}

function frameRect(sprite: LayerSprite, index: number) {
  const i = index % sprite.frameCount;
  const c = i % sprite.cols;
  const r = Math.floor(i / sprite.cols);
  return { sx: c * sprite.fw, sy: r * sprite.fh, sw: sprite.fw, sh: sprite.fh };
}

/** Composite ordered sprites (back->front) into an APNG Blob. */
function encodeApng(layers: LayerSprite[], frameMs: number): Blob {
  const canvasW = Math.max(...layers.map((l) => l.fw));
  const canvasH = Math.max(...layers.map((l) => l.fh));
  const nOut = Math.max(...layers.map((l) => l.frameCount));

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.imageSmoothingEnabled = false;

  const buffers: ArrayBuffer[] = [];
  const delays: number[] = [];
  for (let i = 0; i < nOut; i++) {
    ctx.clearRect(0, 0, canvasW, canvasH);
    for (const l of layers) {
      const { sx, sy, sw, sh } = frameRect(l, i);
      const dx = Math.floor((canvasW - l.fw) / 2);
      const dy = Math.floor((canvasH - l.fh) / 2);
      ctx.drawImage(l.img, sx, sy, sw, sh, dx, dy, sw, sh);
    }
    const data = ctx.getImageData(0, 0, canvasW, canvasH).data;
    buffers.push(data.buffer.slice(0));
    delays.push(frameMs);
  }

  // cnum = 0 -> lossless full-color RGBA (no palette quantization).
  const png = UPNG.encode(buffers, canvasW, canvasH, 0, delays);
  return new Blob([png], { type: "image/png" });
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick(
  opts: TraitOption[],
  allowNone: boolean,
  noneWeight: number,
  rand: () => number
): TraitOption | null {
  const pool: (TraitOption | null)[] = [...opts];
  const weights = opts.map((o) => o.weight);
  if (allowNone) {
    pool.push(null);
    weights.push(noneWeight);
  }
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return pool[0] ?? null;
  let x = rand() * total;
  for (let i = 0; i < pool.length; i++) {
    x -= weights[i];
    if (x <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export type Selection = Partial<Record<CategoryKey, TraitOption | null>>;

function buildSelections(
  options: Record<CategoryKey, TraitOption[]>,
  noneWeights: Partial<Record<CategoryKey, number>>,
  opts: GenerateOptions
): Selection[] {
  const activeCats = CATEGORIES.filter((c) => c.key !== "Base" && options[c.key]?.length);

  if (opts.mode === "all") {
    const pools = activeCats.map((c) => {
      const pool: (TraitOption | null)[] = [...options[c.key]];
      if (c.optional) pool.push(null);
      return { key: c.key, pool };
    });
    let combos: Selection[] = [{}];
    for (const { key, pool } of pools) {
      const next: Selection[] = [];
      for (const base of combos) {
        for (const opt of pool) next.push({ ...base, [key]: opt });
      }
      combos = next;
    }
    return combos;
  }

  const rand = opts.seed != null ? mulberry32(opts.seed) : Math.random;
  const seen = new Set<string>();
  const out: Selection[] = [];
  let attempts = 0;
  const maxAttempts = Math.max(opts.count * 50, 500);
  while (out.length < opts.count && attempts < maxAttempts) {
    attempts++;
    const sel: Selection = {};
    for (const c of activeCats) {
      sel[c.key] = weightedPick(
        options[c.key],
        c.optional,
        noneWeights[c.key] ?? 0,
        rand
      );
    }
    const key = activeCats
      .map((c) => `${c.key}:${sel[c.key]?.name ?? "-"}`)
      .join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(sel);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export interface GenerateInputs {
  base: File;
  options: Record<CategoryKey, TraitOption[]>;
  noneWeights: Partial<Record<CategoryKey, number>>;
  opts: GenerateOptions;
  onProgress?: (done: number, total: number) => void;
}

export async function generate({
  base,
  options,
  noneWeights,
  opts,
  onProgress,
}: GenerateInputs): Promise<GeneratedNft[]> {
  // Cache sprites so each spritesheet is sliced only once.
  const cache = new Map<File, LayerSprite>();
  const spriteFor = async (file: File) => {
    let s = cache.get(file);
    if (!s) {
      s = await toSprite(file, opts.frameSize ?? null);
      cache.set(file, s);
    }
    return s;
  };

  const baseSprite = await spriteFor(base);
  const selections = buildSelections(options, noneWeights, opts);

  const results: GeneratedNft[] = [];
  for (let idx = 0; idx < selections.length; idx++) {
    const sel = selections[idx];
    const layers: LayerSprite[] = [];
    const traits: { category: CategoryKey; name: string }[] = [];
    for (const c of CATEGORIES) {
      if (c.key === "Base") {
        layers.push(baseSprite);
        continue;
      }
      const opt = sel[c.key];
      if (!opt) continue;
      layers.push(await spriteFor(opt.file));
      traits.push({ category: c.key, name: opt.name });
    }
    const blob = encodeApng(layers, opts.frameMs);
    results.push({
      id: idx + 1,
      url: URL.createObjectURL(blob),
      blob,
      traits,
    });
    onProgress?.(idx + 1, selections.length);
    // Yield to the event loop so the UI/progress bar can paint.
    await new Promise((r) => setTimeout(r, 0));
  }
  return results;
}
