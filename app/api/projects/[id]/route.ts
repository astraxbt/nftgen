import { list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { MANIFEST_PATH, ProjectManifest } from "@/lib/manifest";

// Resolves a project id to its manifest. The manifest is stored at a stable
// pathname but the public Blob host is unknown at build time, so we `list` by
// prefix to obtain the concrete URL, then fetch it.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  try {
    const { blobs } = await list({ prefix: MANIFEST_PATH(id), limit: 1 });
    if (blobs.length === 0) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const res = await fetch(blobs[0].url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const manifest = (await res.json()) as ProjectManifest;
    return NextResponse.json(manifest);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "load failed" },
      { status: 500 }
    );
  }
}
