import { authenticated } from "../auth";
import { getDatabase } from "../db/runtime";
import { json, sameOrigin } from "../http";
import { defaults } from "../config";
import type { RouteHandler } from "../types/runtime";

export const getConfig: RouteHandler = async (request, runtime) => {
  const row = await getDatabase(runtime)
    .prepare("SELECT value FROM settings WHERE id='site'")
    .first<{ value: string }>();

  return json(
    request,
    runtime,
    row ? { ...defaults, ...JSON.parse(row.value) } : defaults,
  );
};

export const updateConfig: RouteHandler = async (request, runtime) => {
  if (!(await authenticated(request, runtime))) {
    return json(
      request,
      runtime,
      { error: "Your admin session has expired. Sign in again." },
      401,
    );
  }

  if (!sameOrigin(request, runtime)) {
    return json(request, runtime, { error: "Request not allowed." }, 403);
  }

  const content = await request.text();
  if (content.length > 300000) {
    return json(request, runtime, { error: "Configuration too large." }, 400);
  }

  const value = JSON.parse(content) as Record<string, unknown>;
  for (const key of ["routes", "coaches", "gallery", "safety", "reviews", "faqs"]) {
    if (!Array.isArray(value[key])) {
      return json(
        request,
        runtime,
        { error: `${key} must be an array.` },
        400,
      );
    }
  }

  await getDatabase(runtime)
    .prepare(
      "INSERT INTO settings(id,value) VALUES('site',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
    )
    .bind(JSON.stringify(value))
    .run();

  return json(request, runtime, { ok: true });
};
