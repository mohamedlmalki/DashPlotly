import { sql } from "drizzle-orm";
import { pgTable, text, varchar, json, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const loopsAccounts = pgTable("loops_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull(),
  organizationId: text("organization_id"),
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  accountId: varchar("account_id").references(() => loopsAccounts.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailLogs = pgTable("email_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipients: json("recipients").$type<string[]>().notNull(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  fromName: text("from_name"),
  replyTo: text("reply_to"),
  accountId: varchar("account_id").references(() => loopsAccounts.id),
  jobId: varchar("job_id"),
  status: text("status").default("completed"), // pending, running, paused, completed, stopped
  sentAt: timestamp("sent_at").defaultNow(),
});

export const importJobs = pgTable("import_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").references(() => loopsAccounts.id).notNull(),
  totalEmails: varchar("total_emails").notNull(),
  processedEmails: varchar("processed_emails").default("0"),
  status: text("status").default("pending"), // pending, running, paused, completed, stopped
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  logs: json("logs").$type<{ email: string; status: 'success' | 'failed'; message: string; timestamp: Date }[]>().notNull().default(sql`'[]'::json`),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => loopsAccounts.id),
  eventName: text("event_name").notNull(),
  sourceType: text("source_type").notNull(), // 'campaign' | 'loop' | 'transactional'
  sourceId: text("source_id"), // The ID of the campaign, loop, or transactional email
  contactEmail: text("contact_email").notNull(),
  eventTime: timestamp("event_time").defaultNow(),
  payload: json("payload"), // The full raw webhook payload
});

export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").unique().notNull().references(() => loopsAccounts.id),
  signingSecret: text("signing_secret").notNull(),
});

export const insertLoopsAccountSchema = createInsertSchema(loopsAccounts).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});

export const insertImportJobSchema = createInsertSchema(importJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  logs: true,
});

export const bulkImportSchema = z.object({
  emails: z.array(z.string().email("Invalid email address")),
  accountId: z.string().min(1, "Account is required"),
  delay: z.number().min(0).default(500),
});

export const sendEmailSchema = z.object({
  recipients: z.array(z.string().email("Invalid email address")),
  subject: z.string().min(1, "Subject is required"),
  htmlContent: z.string().min(1, "Email content is required"),
  fromName: z.string().optional(),
  replyTo: z.string().email("Invalid reply-to email").optional(),
  accountId: z.string().min(1, "Account is required"),
});

export const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  apiKey: z.string().min(1, "API key is required"),
  organizationId: z.string().optional(),
});

export const jobControlSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  action: z.enum(["pause", "resume", "stop"]),
});

export const loopsEventSchema = z.object({
  eventName: z.string(),
  eventTime: z.number(),
  sourceType: z.string().optional(),
  campaignId: z.string().optional(),
  loopId: z.string().optional(),
  transactionalId: z.string().optional(),
  contactIdentity: z.object({
    id: z.string(),
    email: z.string().email(),
  }),
  email: z.object({
    id: z.string(),
  }).optional(),
});

export type LoopsAccount = typeof loopsAccounts.$inferSelect;
export type InsertLoopsAccount = z.infer<typeof insertLoopsAccountSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type ImportJob = typeof importJobs.$inferSelect;
export type InsertImportJob = z.infer<typeof insertImportJobSchema>;
export type BulkImportRequest = z.infer<typeof bulkImportSchema>;
export type SendEmailRequest = z.infer<typeof sendEmailSchema>;
export type CreateAccountRequest = z.infer<typeof createAccountSchema>;
export type JobControlRequest = z.infer<typeof jobControlSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;