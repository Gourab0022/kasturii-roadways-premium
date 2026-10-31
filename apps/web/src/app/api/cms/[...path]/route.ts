import { NextResponse } from "next/server";

const cmsUrl = (process.env.CMS_API_URL ?? "http://localhost:1337/api").replace(/\/$/, "");

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  return proxy(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  return proxy(request, context);
}

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await context.params;
  if (!path.length || path.some((part) => part.includes(".."))) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const target = `${cmsUrl}/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;
  const headers = new Headers({ Accept: "application/json" });
  const token = process.env.CMS_API_TOKEN;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" ? undefined : await request.text(),
    cache: "no-store",
  });
  return new Response(response.body, { status: response.status, headers: response.headers });
}
