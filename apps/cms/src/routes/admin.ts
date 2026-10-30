import { digest, passwordHash, randomToken } from "../crypto";
import {
  authenticated,
  cookieName,
  createSession,
  isOwner,
  removeSession,
  verifyPassword,
} from "../auth";
import { getDatabase } from "../db/runtime";
import { json, sameOrigin } from "../http";
import type { RouteHandler } from "../types/runtime";

export const getOwnerStatus: RouteHandler = async (request, runtime) =>
  isOwner(request, runtime)
    ? json(request, runtime, { ok: true })
    : json(request, runtime, { error: "Owner verification required." }, 403);

export const getAdminSession: RouteHandler = async (request, runtime) => {
  const configured = !!(await getDatabase(runtime)
    .prepare("SELECT id FROM settings WHERE id='admin_password'")
    .first());

  if (!(await authenticated(request, runtime))) {
    return json(request, runtime, { configured }, 401);
  }

  const rows = await getDatabase(runtime)
    .prepare("SELECT id,data,created FROM enquiries ORDER BY id DESC LIMIT 100")
    .all();

  return json(request, runtime, { enquiries: rows.results });
};

export const login: RouteHandler = async (request, runtime) => {
  if (!sameOrigin(request, runtime)) {
    return json(request, runtime, { error: "Request not allowed." }, 403);
  }

  const { password } = (await request.json()) as { password?: unknown };
  if (typeof password !== "string" || password.length > 256) {
    return json(request, runtime, { error: "Invalid password." }, 400);
  }

  const now = Date.now();
  const key = await digest(
    request.headers.get("cf-connecting-ip") || "unknown",
  );
  const database = getDatabase(runtime);
  await database
    .prepare("DELETE FROM admin_attempts WHERE expires<?")
    .bind(now)
    .run();
  const attempts = await database
    .prepare(
      "INSERT INTO admin_attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    )
    .bind(key, now + 15 * 60 * 1000)
    .first<{ count: number }>();
  if ((attempts?.count || 0) > 10) {
    return json(
      request,
      runtime,
      { error: "Too many login attempts. Please try again in 15 minutes." },
      429,
      { "Retry-After": "900" },
    );
  }

  const result = await verifyPassword(password, runtime);
  if (result === "missing") {
    return json(
      request,
      runtime,
      { error: "The site owner must set the shared password first." },
      503,
    );
  }
  if (result === "invalid") {
    return json(request, runtime, { error: "Incorrect password." }, 401);
  }

  return json(request, runtime, { ok: true }, 200, {
    "Set-Cookie": await createSession(runtime),
  });
};

export const logout: RouteHandler = async (request, runtime) => {
  await removeSession(request, runtime);
  return json(request, runtime, { ok: true }, 200, {
    "Set-Cookie": `${cookieName}=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`,
  });
};

export const setup: RouteHandler = async (request, runtime) => {
  if (!isOwner(request, runtime) || !sameOrigin(request, runtime)) {
    return json(
      request,
      runtime,
      { error: "Only the site owner can set or reset the password." },
      403,
    );
  }

  const { password } = (await request.json()) as { password?: unknown };
  if (
    typeof password !== "string" ||
    password.length < 16 ||
    password.length > 256
  ) {
    return json(
      request,
      runtime,
      { error: "Use a password or passphrase of 16–256 characters." },
      400,
    );
  }

  const salt = randomToken();
  const database = getDatabase(runtime);
  await database.batch([
    database
      .prepare(
        "INSERT INTO settings(id,value) VALUES('admin_password',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value",
      )
      .bind(
        JSON.stringify({
          salt,
          hash: await passwordHash(password, salt),
        }),
      ),
    database.prepare("DELETE FROM admin_sessions"),
  ]);

  return json(request, runtime, { ok: true }, 200, {
    "Set-Cookie": await createSession(runtime),
  });
};
