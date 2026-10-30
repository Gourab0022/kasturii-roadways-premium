import type { RuntimeEnv } from "../types/runtime";

export function getDatabase(runtime: RuntimeEnv): D1Database {
  if (!runtime.DB) {
    throw new Error("Cloudflare D1 binding DB is unavailable.");
  }

  return runtime.DB;
}
