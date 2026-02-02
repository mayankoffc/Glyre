import { pgTable, serial, text, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";

export const generations = pgTable("generations", {
  id: serial("id").primaryKey(),
  inputText: text("input_text"),
  outputPlan: jsonb("output_plan"),
  mode: varchar("mode", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Generation = typeof generations.$inferSelect;
export type InsertGeneration = typeof generations.$inferInsert;
