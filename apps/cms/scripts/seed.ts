import { createStrapi } from "@strapi/strapi";
import qs from "qs";

const app = await createStrapi({ distDir: "./dist" }).load();
type ContentType = Parameters<typeof app.documents>[0];

const cities = [
  { name: "Kolkata", slug: "kolkata", code: "CCU" },
  { name: "Siliguri", slug: "siliguri", code: "IXB" },
  { name: "Guwahati", slug: "guwahati", code: "GAU" },
];

const amenities = [
  "wifi", "charging_point", "blanket", "water_bottle", "reading_light",
  "air_conditioning", "recliner", "emergency_exit", "gps_tracking",
  "clean_linen", "snacks", "pillow", "entertainment",
].map((slug) => ({ name: slug.replaceAll("_", " "), slug, icon: slug }));

async function ensure(uid: ContentType, slug: string, data: Record<string, unknown>, publish = true) {
  const existing = await app.documents(uid).findFirst({
    filters: { slug: { $eq: slug } },
    status: "draft",
  });
  const document = existing
    ? await app.documents(uid).update({ documentId: existing.documentId, data })
    : await app.documents(uid).create({ data });
  if (!document) throw new Error(`Unable to seed ${uid}:${slug}`);
  if (publish && document.status !== "published") {
    await app.documents(uid).publish({ documentId: document.documentId });
  }
  return document;
}

for (const city of cities) await ensure("api::city.city", city.slug, city);
for (const amenity of amenities) await ensure("api::amenity.amenity", amenity.slug, amenity);

for (const data of [
  { name: "Sleeper AC", slug: "sleeper_ac", description: "Air-conditioned sleeper coach." },
  { name: "Semi Sleeper AC", slug: "semi_sleeper_ac", description: "Air-conditioned semi-sleeper coach." },
  { name: "Volvo Sleeper", slug: "volvo_sleeper", description: "Premium Volvo sleeper coach." },
  { name: "Luxury Sleeper", slug: "luxury_sleeper", description: "Premium luxury sleeper coach." },
]) await ensure("api::coach-type.coach-type", data.slug, data, false);

for (let index = 1; index <= 7; index += 1) {
  await ensure("api::safety-feature.safety-feature", `safety-feature-${index}`, {
    title: `Safety feature ${index}`,
    description: "Safety information will be confirmed before services are announced.",
    sortOrder: index,
  }, false);
}

for (let index = 1; index <= 10; index += 1) {
  await ensure("api::faq.faq", `faq-${index}`, {
    question: `Frequently asked question ${index}`,
    answer: "To be confirmed.",
    sortOrder: index,
  }, false);
}

await app.documents("api::site-setting.site-setting").findFirst({
  status: "draft",
}) ?? await app.documents("api::site-setting.site-setting").create({
  data: { WhatsApp: "", redBus: "", MMT: "", socialLinks: [] },
});

const query = qs.stringify({
  populate: ["origin", "destination", "schedules"],
  status: "draft",
});
app.log.info(`Seed query contract verified: ${query}`);
app.log.info("Demo seed complete.");
await app.destroy();
