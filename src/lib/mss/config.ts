/** MSS REST API origin, without `/v1`. Server-side only. */
export const MSS_API_BASE = (process.env.MSS_API_BASE_URL || "https://mssapi.msmeschemes.org")
  .replace(/\/v1\/?$/, "")
  .replace(/\/+$/, "");

export const apiUrl = (path: string) => `${MSS_API_BASE}/v1${path.startsWith("/") ? path : `/${path}`}`;
