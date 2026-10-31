import { createHash } from "node:crypto";
import { z } from "zod";

const requestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  mobile: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal("")),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(2000),
  turnstileToken: z.string().trim().min(1),
  website: z.string(),
});

type ContactBody = z.infer<typeof requestSchema>;
type ContactContext = {
  request: { body?: unknown; ip?: string };
  status: number;
};

function normalizeMobile(value: string): string | undefined {
  const compact = value.replace(/\s/g, "");
  if (!/^(?:\+91|91|0)?[6-9]\d{9}$/.test(compact)) return undefined;
  const normalized = compact.replace(/^(?:\+91|91|0)/, "");
  return /^[6-9]\d{9}$/.test(normalized) ? normalized : undefined;
}

function validationErrors(body: Partial<ContactBody>): Record<string, string> {
  const parsed = requestSchema.safeParse(body);
  const errors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      errors[field] ??= issue.message;
    }
  }
  if (typeof body.website !== "string" || body.website.trim() !== "") {
    errors.website = "This field must be empty.";
  }
  if (typeof body.mobile !== "string" || !normalizeMobile(body.mobile)) {
    errors.mobile = "Enter a valid Indian mobile number.";
  }
  return errors;
}

function hashIp(ip: string, secret: string): string {
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}

async function verifyTurnstile(token: string, remoteIp: string, secret: string): Promise<boolean> {
  const form = new URLSearchParams({
    secret,
    response: token,
    remoteip: remoteIp,
  });
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

const attempts = new Map<string, { count: number; resetAt: number }>();

export default {
  async submit(ctx: ContactContext) {
    const body = (ctx.request.body ?? {}) as Partial<ContactBody>;
    const errors = validationErrors(body);
    if (Object.keys(errors).length > 0) {
      ctx.status = 400;
      return { ok: false, errors };
    }

    if (body.website) {
      ctx.status = 400;
      return { ok: false, errors: { website: "This field must be empty." } };
    }

    const ip = ctx.request.ip || "unknown";
    const now = Date.now();
    const limit = Number(process.env.CONTACT_RATE_LIMIT ?? 5);
    const current = attempts.get(ip);
    if (current && current.resetAt > now && current.count >= limit) {
      ctx.status = 429;
      return { ok: false, error: "rate_limited" };
    }
    attempts.set(ip, current && current.resetAt > now
      ? { count: current.count + 1, resetAt: current.resetAt }
      : { count: 1, resetAt: now + 60 * 60 * 1000 });

    const token = body.turnstileToken as string;
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret || !(await verifyTurnstile(token, ip, turnstileSecret))) {
      ctx.status = 400;
      return { ok: false, errors: { turnstileToken: "Verification failed." } };
    }

    try {
      const data = {
        name: body.name!.trim(),
        mobile: normalizeMobile(body.mobile!)!,
        email: body.email?.trim() || null,
        subject: body.subject!.trim(),
        message: body.message!.trim(),
        ipHash: hashIp(ip, process.env.JWT_SECRET ?? "contact"),
        status: "new" as const,
      };
      await strapi.documents("api::contact-submission.contact-submission").create({ data });
      await sendNotification(data);
      ctx.status = 201;
      return { ok: true };
    } catch (error) {
      strapi.log.error("Contact submission failed", error);
      ctx.status = 500;
      return { ok: false, error: "server_error" };
    }
  },
};

async function sendNotification(data: {
  name: string;
  mobile: string;
  email: string | null;
  subject: string;
  message: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.BUSINESS_EMAIL;
  if (!apiKey || !recipient) return;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "website@resend.dev",
      to: [recipient],
      subject: `Contact form: ${data.subject}`,
      text: `${data.name} (${data.mobile}, ${data.email ?? "no email"})\n\n${data.message}`,
    }),
  });
  if (!response.ok) throw new Error(`Notification email failed with ${response.status}`);
}
