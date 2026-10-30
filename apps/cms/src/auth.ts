import { digest, equal, passwordHash, randomToken } from "./crypto";
import { getDatabase } from "./db/runtime";
import type { RuntimeEnv } from "./types/runtime";

export const cookieName = "__Host-kasturii-admin";

function requestToken(request: Request): string | null {
  return (
    request.headers
      .get("Cookie")
      ?.match(new RegExp(`${cookieName}=([a-f0-9]{64})`))?.[1] ?? null
  );
}

export async function authenticated(
  request: Request,
  runtime: RuntimeEnv,
): Promise<boolean> {
  const token = requestToken(request);
  return (
    !!token &&
    !!(await getDatabase(runtime)
      .prepare(
        "SELECT token FROM admin_sessions WHERE token=? AND expires>?",
      )
      .bind(await digest(token), Date.now())
      .first())
  );
}

export async function createSession(runtime: RuntimeEnv): Promise<string> {
  const token = randomToken();
  const database = getDatabase(runtime);

  await database
    .prepare("DELETE FROM admin_sessions WHERE expires<=?")
    .bind(Date.now())
    .run();
  await database
    .prepare("INSERT INTO admin_sessions(token,expires) VALUES(?,?)")
    .bind(await digest(token), Date.now() + 8 * 60 * 60 * 1000)
    .run();

  return `${cookieName}=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=28800`;
}

export function isOwner(request: Request, runtime: RuntimeEnv): boolean {
  const email = request.headers
    .get("oai-authenticated-user-email")
    ?.toLowerCase();
  const allowedEmails = (runtime.ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return !!email && allowedEmails.includes(email);
}

export async function removeSession(
  request: Request,
  runtime: RuntimeEnv,
): Promise<void> {
  const token = requestToken(request);
  if (token) {
    await getDatabase(runtime)
      .prepare("DELETE FROM admin_sessions WHERE token=?")
      .bind(await digest(token))
      .run();
  }
}

export async function verifyPassword(
  password: string,
  runtime: RuntimeEnv,
): Promise<"missing" | "invalid" | "valid"> {
  const row = await getDatabase(runtime)
    .prepare("SELECT value FROM settings WHERE id='admin_password'")
    .first<{ value: string }>();

  if (!row) return "missing";

  const stored = JSON.parse(row.value) as { salt: string; hash: string };
  return (await equal(
    await passwordHash(password, stored.salt),
    stored.hash,
  ))
    ? "valid"
    : "invalid";
}
