import { CategoryKey, TraitOption } from "./types";

const IMG_RE = /\.png$/i;

export interface UploadedFile {
  file: File;
  /** Relative path including any folder prefix, e.g. "Auras/Hellfire/hellfire.png". */
  path: string;
}

/** Normalize a File[] (from an <input>) or UploadedFile[] into UploadedFile[]. */
export function toUploaded(files: FileList | File[] | UploadedFile[]): UploadedFile[] {
  const arr = Array.from(files as ArrayLike<File | UploadedFile>);
  return arr.map((f) => {
    if ((f as UploadedFile).file) return f as UploadedFile;
    const file = f as File & { webkitRelativePath?: string };
    return { file, path: file.webkitRelativePath || file.name };
  });
}

/**
 * Parse uploaded files for one category into trait options.
 * Expected layout: <Category>/<TraitName>/<sheet>.png
 * Falls back to <Category>/<sheet>.png (trait = file stem).
 */
export function parseCategoryFiles(
  uploaded: UploadedFile[],
  category: CategoryKey
): TraitOption[] {
  const byTrait = new Map<string, File>();
  for (const { file, path } of uploaded) {
    if (!IMG_RE.test(file.name)) continue;
    const parts = path.split("/").filter(Boolean);
    // Drop the selected root folder name if present.
    const tail = parts.length > 1 ? parts.slice(1) : parts;
    const traitName =
      tail.length >= 2 ? tail[0] : tail[tail.length - 1].replace(IMG_RE, "");
    if (!byTrait.has(traitName)) byTrait.set(traitName, file);
  }
  return Array.from(byTrait.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, file]) => ({ category, name, file, weight: 1 }));
}

/** Pick a single base spritesheet file (prefers a name starting with "base"). */
export function pickBaseFile(uploaded: UploadedFile[]): File | null {
  const imgs = uploaded.filter((u) => IMG_RE.test(u.file.name)).map((u) => u.file);
  if (imgs.length === 0) return null;
  return imgs.find((f) => /^base/i.test(f.name)) ?? imgs[0];
}

// Minimal typings for the non-standard FileSystem entry API used on drop.
interface FsEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}
interface FsFileEntry extends FsEntry {
  file(success: (f: File) => void, error?: (e: unknown) => void): void;
}
interface FsDirEntry extends FsEntry {
  createReader(): { readEntries(cb: (entries: FsEntry[]) => void): void };
}

/** Recursively read a dropped directory/file entry into UploadedFile[]. */
async function readEntry(entry: FsEntry, prefix: string): Promise<UploadedFile[]> {
  if (entry.isFile) {
    const fileEntry = entry as FsFileEntry;
    const file: File = await new Promise((res, rej) => fileEntry.file(res, rej));
    return [{ file, path: `${prefix}${file.name}` }];
  }
  if (entry.isDirectory) {
    const reader = (entry as FsDirEntry).createReader();
    const entries: FsEntry[] = await new Promise((res) => {
      const acc: FsEntry[] = [];
      const read = () =>
        reader.readEntries((batch) => {
          if (!batch.length) return res(acc);
          acc.push(...batch);
          read();
        });
      read();
    });
    const nested = await Promise.all(
      entries.map((e) => readEntry(e, `${prefix}${entry.name}/`))
    );
    return nested.flat();
  }
  return [];
}

/** Extract UploadedFile[] from a drop event's DataTransfer (supports folders). */
export async function filesFromDrop(dt: DataTransfer): Promise<UploadedFile[]> {
  const items = Array.from(dt.items).filter((i) => i.kind === "file");
  const entries = items
    .map((i) => {
      const getEntry = (i as DataTransferItem & {
        webkitGetAsEntry?: () => FsEntry | null;
      }).webkitGetAsEntry;
      return getEntry ? getEntry.call(i) : null;
    })
    .filter((e): e is FsEntry => e != null);
  if (entries.length) {
    const all = await Promise.all(entries.map((e) => readEntry(e, "")));
    return all.flat();
  }
  // Fallback: plain files with no directory info.
  return Array.from(dt.files).map((file) => ({ file, path: file.name }));
}
