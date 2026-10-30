import { getDatabase } from "../db/runtime";
import { json, sameOrigin } from "../http";
import type { RouteHandler } from "../types/runtime";

export const submitContact: RouteHandler = async (request, runtime) => {
  if (!sameOrigin(request, runtime)) {
    return json(request, runtime, { error: "Request not allowed." }, 403);
  }

  const body = (await request.json()) as Record<string, string>;
  if (
    body.website ||
    !body.name ||
    !/^\+?[\d ()-]{7,20}$/.test(body.mobile || "") ||
    !/^\S+@\S+\.\S+$/.test(body.email || "") ||
    !body.subject ||
    !body.message ||
    JSON.stringify(body).length > 6000
  ) {
    return json(
      request,
      runtime,
      { error: "Please check all fields; message must be under 4,000 characters." },
      400,
    );
  }

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const recent = await getDatabase(runtime)
    .prepare(
      "SELECT COUNT(*) AS n FROM enquiries WHERE ip=? AND created>?",
    )
    .bind(ip, new Date(Date.now() - 3600000).toISOString())
    .first<{ n: number }>();

  if ((recent?.n || 0) >= 5) {
    return json(
      request,
      runtime,
      { error: "Too many messages. Please try again in an hour." },
      429,
    );
  }

  await getDatabase(runtime)
    .prepare("INSERT INTO enquiries(data,created,ip) VALUES(?,?,?)")
    .bind(
      JSON.stringify({
        name: body.name,
        mobile: body.mobile,
        email: body.email,
        subject: body.subject,
        message: body.message,
      }),
      new Date().toISOString(),
      ip,
    )
    .run();

  return json(request, runtime, { ok: true });
};
