type DocumentContext = {
  action: string;
  uid: string;
  params?: { data?: Record<string, unknown> };
};

const modelNames = new Set([
  "city", "route", "schedule", "coach-type", "amenity", "gallery-item",
  "safety-feature", "promo-banner", "testimonial", "faq", "legal-page", "site-setting",
]);

function tagFor(uid: string): string | undefined {
  const name = uid.split(".").pop();
  return name && modelNames.has(name) ? name : undefined;
}

export default {
  register({ strapi }: { strapi: any }) {
    strapi.documents.use(async (context: DocumentContext, next: () => Promise<unknown>) => {
      if (context.uid === "api::schedule.schedule" && ["create", "update"].includes(context.action)) {
        validateSchedule(context.params?.data ?? {});
      }
      const result = await next();
      const tag = tagFor(context.uid);
      if (tag && ["create", "update", "delete", "publish", "unpublish"].includes(context.action)) {
        await notifyRevalidation(strapi, tag);
      }
      return result;
    });
  },
  bootstrap() {},
};

function validateSchedule(data: Record<string, unknown>): void {
  const departure = String(data.departureTime ?? "");
  const arrival = String(data.arrivalTime ?? "");
  const offset = Number(data.arrivalDayOffset ?? 0);
  if (!departure || !arrival) return;
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const timePattern = /^\d{2}:\d{2}:\d{2}(?:\.\d{3})?$/;
  if (!timePattern.test(departure) || !timePattern.test(arrival)) {
    throw new Error("Schedules require valid departure and arrival times.");
  }
  const duration = toMinutes(arrival) + offset * 1440 - toMinutes(departure);
  if (duration <= 0) throw new Error("Arrival must be after departure.");
  data.durationMinutes = duration;
}

async function notifyRevalidation(strapi: any, tag: string): Promise<void> {
  const siteUrl = process.env.SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!siteUrl || !secret) return;
  const response = await fetch(`${siteUrl.replace(/\/$/, "")}/api/revalidate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-revalidate-secret": secret },
    body: JSON.stringify({ tag }),
  });
  if (!response.ok) strapi.log.warn(`Revalidation failed for ${tag}: ${response.status}`);
}
