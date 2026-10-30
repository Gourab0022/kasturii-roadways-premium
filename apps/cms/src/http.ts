import type { RuntimeEnv } from "./types/runtime";

function allowedOrigin(request: Request, runtime: RuntimeEnv): string {
  return runtime.FRONTEND_ORIGIN || new URL(request.url).origin;
}

export function withCors(
  request: Request,
  runtime: RuntimeEnv,
  response: Response,
): Response {
  const headers = new Headers(response.headers);
  const requestOrigin = request.headers.get("Origin");

  if (requestOrigin && requestOrigin === allowedOrigin(request, runtime)) {
    headers.set("Access-Control-Allow-Origin", requestOrigin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

export function json(
  request: Request,
  runtime: RuntimeEnv,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return withCors(
    request,
    runtime,
    Response.json(body, {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...extraHeaders,
      },
    }),
  );
}

export function sameOrigin(request: Request, runtime: RuntimeEnv): boolean {
  return request.headers.get("Origin") === allowedOrigin(request, runtime);
}

export function optionsResponse(
  request: Request,
  runtime: RuntimeEnv,
): Response {
  return withCors(
    request,
    runtime,
    new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
      },
    }),
  );
}
