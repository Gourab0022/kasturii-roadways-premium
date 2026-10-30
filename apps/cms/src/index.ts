import { json, optionsResponse } from "./http";
import {
  getAdminSession,
  getOwnerStatus,
  login,
  logout,
  setup,
} from "./routes/admin";
import { getConfig, updateConfig } from "./routes/config";
import { submitContact } from "./routes/contact";
import type { RouteHandler, RuntimeEnv } from "./types/runtime";

const routes: Record<string, RouteHandler> = {
  "GET /api/admin/owner": getOwnerStatus,
  "GET /api/admin/session": getAdminSession,
  "GET /api/config": getConfig,
  "POST /api/admin/login": login,
  "POST /api/admin/logout": logout,
  "POST /api/admin/setup": setup,
  "POST /api/contact": submitContact,
  "PUT /api/config": updateConfig,
};

async function handle(request: Request, runtime: RuntimeEnv): Promise<Response> {
  if (request.method === "OPTIONS") {
    return optionsResponse(request, runtime);
  }

  if (new URL(request.url).pathname === "/health") {
    return json(request, runtime, { ok: true });
  }

  const route = routes[`${request.method} ${new URL(request.url).pathname}`];
  return route
    ? route(request, runtime)
    : json(request, runtime, { error: "Not found." }, 404);
}

export default {
  fetch(request: Request, runtime: RuntimeEnv) {
    return handle(request, runtime).catch(() =>
      json(request, runtime, { error: "Internal server error." }, 500),
    );
  },
};
