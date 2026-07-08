import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";

// Resolve the Blob token. Vercel names it BLOB_READ_WRITE_TOKEN by default, but
// a store connected with a custom env-var prefix (e.g. a store named
// "nftgen-blob") exposes it as <PREFIX>_READ_WRITE_TOKEN. Fall back to the first
// matching var so a non-default prefix still works.
function resolveBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(process.env).find((k) => k.endsWith("_READ_WRITE_TOKEN"));
  return key ? process.env[key] : undefined;
}

// Issues short-lived client upload tokens so spritesheets upload straight to
// Vercel Blob from the browser (bypassing the 4.5 MB serverless body limit).
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = resolveBlobToken();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "No Blob token found. Connect a Vercel Blob store to this project and redeploy so BLOB_READ_WRITE_TOKEN is available.",
      },
      { status: 500 }
    );
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      token,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/png"],
        maximumSizeInBytes: 20 * 1024 * 1024,
        addRandomSuffix: true,
      }),
      // Required by the API; nothing to persist here since the client writes
      // the manifest afterwards via POST /api/projects.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (error) {
    // Surface the real reason (bad token, content-type, etc.) instead of a
    // generic 400 so it's debuggable from the network response.
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "upload failed" },
      { status: 400 }
    );
  }
}
