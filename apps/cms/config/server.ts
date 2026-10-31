import type { Env } from "./types.js";

export default ({ env }: { env: Env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  app: { keys: env.array("APP_KEYS") },
  url: env("SITE_URL", "http://localhost:1337"),
});
