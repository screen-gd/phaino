export const DEFAULT_SITE_URL = "https://app.phaino.us.ci";

const LOCAL_HOST = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const WRITE_CONTENT_TYPES = new Set(["application/json", "multipart/form-data"]);

const present = (v: string | undefined) => (v && v.trim() !== "" ? v : undefined);

/** Same precedence as getEnv().siteUrl, readable outside server-only modules. */
export function siteUrlFrom(env: Readonly<Record<string, string | undefined>> = process.env): string {
  return present(env.NEXT_PUBLIC_SITE_URL) ?? present(env.PHAINO_SITE_URL) ?? DEFAULT_SITE_URL;
}

/** Host must be loopback or the site host; any Origin must be loopback or the site origin. Blocks DNS rebinding and CSRF. */
export function allowedHostAndOrigin(request: Request, siteUrl: string): boolean {
  try {
    const site = new URL(siteUrl);
    const host = request.headers.get("host");
    if (!host || (!LOCAL_HOST.test(host) && host.toLowerCase() !== site.host.toLowerCase())) {
      return false;
    }
    const originHeader = request.headers.get("origin");
    if (originHeader === null) return true;
    const origin = new URL(originHeader);
    return origin.origin === originHeader &&
      (origin.protocol === "http:" || origin.protocol === "https:") &&
      (LOCAL_HOST.test(origin.host) || origin.origin === site.origin);
  } catch {
    return false;
  }
}

/** Writes with a body must be JSON or multipart, so cross-site text/plain and form posts never reach a handler. */
export function allowedWriteContentType(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;
  const contentType = request.headers.get("content-type");
  if (contentType === null) {
    const length = request.headers.get("content-length");
    return (length === null || length === "0") && !request.headers.has("transfer-encoding");
  }
  return WRITE_CONTENT_TYPES.has(contentType.split(";")[0].trim().toLowerCase());
}
