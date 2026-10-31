import type { Env } from "./types.js";

export default ({ env }: { env: Env }) => ({
  rest: {
    defaultLimit: env.int("API_DEFAULT_LIMIT", 25),
    maxLimit: env.int("API_MAX_LIMIT", 100),
    withCount: true,
  },
});
