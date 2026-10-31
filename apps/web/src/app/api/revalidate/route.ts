import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

const allowedTags = new Set([
  "city",
  "route",
  "schedule",
  "coach-type",
  "amenity",
  "gallery-item",
  "safety-feature",
  "promo-banner",
  "testimonial",
  "faq",
  "legal-page",
  "site-setting",
]);

export async function POST(request: Request): Promise<Response> {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) return NextResponse.json({ ok: false }, { status: 500 });
  if (request.headers.get("x-revalidate-secret") !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let payload: { tag?: unknown };
  try {
    payload = (await request.json()) as { tag?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (typeof payload.tag !== "string" || !allowedTags.has(payload.tag)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  revalidateTag(payload.tag, "max");
  return NextResponse.json({ ok: true });
}
