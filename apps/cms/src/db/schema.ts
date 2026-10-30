import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  value: text("value").notNull(),
});
export const enquiries = sqliteTable("enquiries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  data: text("data").notNull(),
  created: text("created").notNull(),
  ip: text("ip").notNull(),
});
export const adminSessions = sqliteTable("admin_sessions", {
  token: text("token").primaryKey(),
  expires: integer("expires").notNull(),
});
export const adminAttempts = sqliteTable("admin_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires: integer("expires").notNull(),
});
