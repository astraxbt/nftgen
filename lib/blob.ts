// Resolve the Blob read-write token. Vercel names it BLOB_READ_WRITE_TOKEN by
// default, but a store connected with a custom env-var prefix exposes it as
// <PREFIX>_READ_WRITE_TOKEN. Fall back to the first matching var.
export function resolveBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(process.env).find((k) => k.endsWith("_READ_WRITE_TOKEN"));
  return key ? process.env[key] : undefined;
}
