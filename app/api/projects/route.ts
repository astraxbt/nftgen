import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { MANIFEST_PATH, ProjectManifest } from "@/lib/manifest";

// Persists a project manifest (small JSON) to Blob and returns its id.
// Spritesheets are uploaded separately by the client via /api/blob-upload.
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const partial = (await request.json()) as Omit<ProjectManifest, "id" | "createdAt">;
    if (!partial?.base?.url) {
      return NextResponse.json({ error: "missing base spritesheet" }, { status: 400 });
    }
    const id = nanoid(10);
    const manifest: ProjectManifest = {
      ...partial,
      id,
      createdAt: new Date().toISOString(),
    };
    await put(MANIFEST_PATH(id), JSON.stringify(manifest), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "save failed" },
      { status: 500 }
    );
  }
}
