/**
 * Shared frontend configuration.
 *
 * Single source of truth for the backend URL so the localhost fallback isn't
 * duplicated across api.ts, sse.ts, AuthProvider, and the OAuth callback — a
 * missing env var in one place used to silently ship localhost to production.
 */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
