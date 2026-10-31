import type { Env } from "./types.js";

export default ({ env }: { env: Env }) => ({
  upload: {
    config: {
      sizeLimit: env.int("UPLOAD_MAX_BYTES", 10 * 1024 * 1024),
      breakpoints: { large: 1000, medium: 750, small: 500 },
      mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"],
    },
  },
});
