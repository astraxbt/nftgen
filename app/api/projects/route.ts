import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { resolveBlobToken } from "@/lib/blob";
import { MANIFEST_PATH, ProjectManifest } from "@/lib/manifest";

// Persists a project manifest (small JSON) to Blob and returns its id.
// Spritesheets are uploaded separately via /api/upload.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = resolveBlobToken();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "No Blob token found. Add BLOB_READ_WRITE_TOKEN (from your Vercel Blob store) and redeploy.",
      },
      { status: 500 }
    );
  }
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
      token,
    });
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "save failed" },
      { status: 500 }
    );
  }
}
