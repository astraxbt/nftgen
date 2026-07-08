import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { resolveBlobToken } from "@/lib/blob";

// Uploads a single spritesheet server-side (browser -> our route -> Blob), which
// avoids the CORS restrictions of direct client uploads. Each request carries
// one small PNG, so the 4.5 MB serverless body limit is not a concern.
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

  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "missing ?name" }, { status: 400 });
  }

  try {
    const body = await request.arrayBuffer();
    const blob = await put(name, body, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: true,
      token,
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "upload failed" },
      { status: 500 }
    );
  }
}
