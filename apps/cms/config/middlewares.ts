import type { Env } from "./types.js";

export default [
  "strapi::logger",
  "strapi::errors",
  "strapi::security",
  {
    name: "strapi::cors",
    config: {
      origin: ({ env }: { env: Env }) =>
        env("CORS_ORIGINS", "http://localhost:3000").split(",").map((value: string) => value.trim()),
    },
  },
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
