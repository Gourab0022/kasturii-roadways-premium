import qs from "qs";
import { defaults } from "../config";
import { apiFetch } from "./api";

type StrapiItem = { id?: number; documentId?: string; attributes?: Record<string, unknown> } & Record<string, unknown>;
type StrapiResponse<T> = { data: T; meta?: unknown };

export type ContactPayload = {
  name: string;
  mobile: string;
  email?: string;
  subject: string;
  message: string;
  turnstileToken: string;
  website: string;
};

function attributes<T extends Record<string, unknown>>(item: StrapiItem): T {
  return ((item.attributes ?? item) as T);
}

function mediaUrl(value: unknown): string {
  const media = value as StrapiItem | undefined;
  const data = (media?.data ?? media) as StrapiItem | undefined;
  const file = data ? attributes<{ url?: string }>(data) : undefined;
  return file?.url ?? "";
}

async function getCollection<T extends StrapiItem>(
  endpoint: string,
  populate?: Record<string, unknown>,
): Promise<T[]> {
  const query = qs.stringify(
    { status: "published", pagination: { page: 1, pageSize: 100 }, populate },
    { encodeValuesOnly: true },
  );
  const response = await apiFetch(`${endpoint}?${query}`);
  if (!response.ok) throw new Error(`CMS request failed: ${response.status}`);
  const body = (await response.json()) as StrapiResponse<T[]>;
  return body.data ?? [];
}

async function getSingleton<T extends StrapiItem>(
  endpoint: string,
  populate?: Record<string, unknown>,
): Promise<T> {
  const query = qs.stringify({ status: "published", populate }, { encodeValuesOnly: true });
  const response = await apiFetch(`${endpoint}?${query}`);
  if (!response.ok) throw new Error(`CMS request failed: ${response.status}`);
  const body = (await response.json()) as StrapiResponse<T>;
  return body.data;
}

function mapCity(item: StrapiItem): string {
  return attributes<{ name?: string }>(item).name ?? "";
}

function mapRoute(item: StrapiItem) {
  const route = attributes<Record<string, unknown>>(item);
  const origin = attributes<StrapiItem>((route.origin as StrapiItem) ?? {});
  const destination = attributes<StrapiItem>((route.destination as StrapiItem) ?? {});
  const schedules = ((route.schedules as { data?: StrapiItem[] })?.data ?? route.schedules ?? []) as StrapiItem[];
  const schedule = schedules[0] ? attributes<Record<string, unknown>>(schedules[0]) : {};
  const coach = attributes<Record<string, unknown>>((schedule.coachType as StrapiItem) ?? {});
  const boarding = (schedule.boardingPoints as StrapiItem[] | undefined) ?? [];
  const dropping = (schedule.droppingPoints as StrapiItem[] | undefined) ?? [];
  return {
    from: mapCity(origin),
    to: mapCity(destination),
    type: String(coach.name ?? ""),
    departure: String(schedule.departureTime ?? ""),
    arrival: String(schedule.arrivalTime ?? ""),
    duration: schedule.durationMinutes ? `${schedule.durationMinutes} min` : "",
    fare: "",
    amenities: ((schedule.amenities as StrapiItem[] | undefined) ?? []).map((amenity) => attributes<{ name?: string }>(amenity).name ?? ""),
    boarding: boarding.map((point) => attributes<{ stop?: StrapiItem }>(point).stop).filter(Boolean).map((stop) => attributes<{ name?: string }>(stop!).name ?? ""),
    dropping: dropping.map((point) => attributes<{ stop?: StrapiItem }>(point).stop).filter(Boolean).map((stop) => attributes<{ name?: string }>(stop!).name ?? ""),
  };
}

export async function getSiteContent(): Promise<Record<string, unknown>> {
  const [settings, cities, routes, coaches, gallery, amenities, safety, banners, testimonials, faqs, legal] =
    await Promise.all([
      getSingleton<StrapiItem>("/site-setting", {
        logo: true, contact: true, registeredOffice: true, operationalOffice: true,
        socialLinks: true, defaultSeo: { populate: ["ogImage"] },
      }),
      getCollection("/cities"),
      getCollection("/routes", {
        origin: true, destination: true,
        schedules: { populate: { coachType: true, amenities: true, boardingPoints: { populate: ["stop"] }, droppingPoints: { populate: ["stop"] } } },
      }),
      getCollection("/coach-types", { image: true, amenities: true }),
      getCollection("/gallery-items", { image: true, coachType: true }),
      getCollection("/amenities"),
      getCollection("/safety-features"),
      getCollection("/promo-banners", { imageDesktop: true, imageMobile: true }),
      getCollection("/testimonials", { route: true }),
      getCollection("/faqs"),
      getCollection("/legal-pages", { seo: { populate: ["ogImage"] } }),
    ]);

  const setting = attributes<Record<string, unknown>>(settings ?? {});
  return {
    ...defaults,
    ...setting,
    logo: mediaUrl(setting.logo),
    routes: routes.map(mapRoute),
    cities: cities.map(mapCity),
    coaches: coaches.map((item) => {
      const value = attributes<Record<string, unknown>>(item);
      return { ...value, image: mediaUrl(value.image), amenities: ((value.amenities as StrapiItem[] | undefined) ?? []).map((a) => attributes<{ name?: string }>(a).name ?? "") };
    }),
    gallery: gallery.map((item) => {
      const value = attributes<Record<string, unknown>>(item);
      return { ...value, src: mediaUrl(value.image), caption: value.caption ?? value.title ?? "" };
    }),
    amenities: amenities.map((item) => attributes(item)),
    safety: safety.map((item) => attributes<{ title?: string }>(item).title ?? ""),
    banners: banners.map((item) => attributes(item)),
    reviews: testimonials.map((item) => attributes(item)),
    faqs: faqs.map((item) => {
      const value = attributes<Record<string, unknown>>(item);
      return { q: value.question ?? "", a: value.answer ?? "" };
    }),
    legalPages: legal.map((item) => attributes(item)),
  };
}

export async function submitContact(payload: ContactPayload): Promise<{ ok: boolean; errors?: Record<string, string>; error?: string }> {
  const response = await apiFetch("/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as { ok: boolean; errors?: Record<string, string>; error?: string };
  return response.ok ? body : { ...body, ok: false };
}
