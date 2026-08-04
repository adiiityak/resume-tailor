import {
  pgTable, text, integer, boolean, date, timestamp, jsonb, primaryKey, index,
} from "drizzle-orm/pg-core";

// Every user-owned table is scoped by userId so a deployed, authenticated instance
// keeps each person's data separate. Hot filter/sort fields are real columns; the
// rest of each document shape stays in jsonb so existing app logic keeps working.

export const applications = pgTable(
  "applications",
  {
    // Keeps the original folder-derived id, e.g.
    // "google-product-designer-2026-08-03-154150", so existing URLs still resolve.
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),

    company: text("company").notNull(),
    companySlug: text("company_slug").notNull(),
    role: text("role").notNull(),
    roleSlug: text("role_slug").notNull(),

    location: text("location").default(""),
    workMode: text("work_mode").default(""),
    jobUrl: text("job_url").default(""),

    applicationDate: date("application_date"),
    status: text("status").notNull().default("Saved"),
    statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }),

    priority: text("priority").default("Medium"),
    mode: text("mode").default("local"),
    resumeVariant: text("resume_variant").default("v1"),
    matchScore: integer("match_score"),
    fitScore: integer("fit_score"),
    nextFollowUpAt: date("next_follow_up_at"),

    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    submittedResumeVersion: text("submitted_resume_version"),
    submittedCoverLetterVersion: text("submitted_cover_letter_version"),
    applicationSource: text("application_source").default(""),

    tags: jsonb("tags").default([]),
    migrated: boolean("migrated").default(false),
    extra: jsonb("extra").default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("applications_user_created_idx").on(t.userId, t.createdAt),
    index("applications_user_company_idx").on(t.userId, t.companySlug),
    index("applications_user_status_idx").on(t.userId, t.status),
  ]
);

// One row per stored text/JSON document, replacing the per-application files.
// kind: job_description | original_resume | tailored_resume | cover_letter
//     | match_report | fit_report | resume_diff | quality_report | interview
export const applicationDocuments = pgTable(
  "application_documents",
  {
    applicationId: text("application_id").notNull(),
    kind: text("kind").notNull(),
    content: text("content").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.applicationId, t.kind] })]
);

// Append-only; never updated in place.
export const applicationActivity = pgTable(
  "application_activity",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id").notNull(),
    type: text("type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_app_created_idx").on(t.applicationId, t.createdAt)]
);

export const applicationMessages = pgTable(
  "application_messages",
  {
    id: text("id").primaryKey(),
    applicationId: text("application_id").notNull(),
    type: text("type").notNull(),
    subject: text("subject").default(""),
    body: text("body").notNull(),
    contactId: text("contact_id"),
    contactName: text("contact_name").default(""),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_app_created_idx").on(t.applicationId, t.createdAt)]
);

export const jobs = pgTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),

    company: text("company").default(""),
    companySlug: text("company_slug").default(""),
    role: text("role").default(""),
    roleSlug: text("role_slug").default(""),

    location: text("location").default(""),
    workMode: text("work_mode").default(""),
    jobUrl: text("job_url").default(""),
    source: text("source").default(""),
    salaryRange: text("salary_range").default(""),
    closingDate: text("closing_date").default(""),

    priority: text("priority").default("Medium"),
    interest: text("interest").default("Medium"),
    status: text("status").notNull().default("Saved"),

    notes: text("notes").default(""),
    jobDescription: text("job_description").default(""),
    tags: jsonb("tags").default([]),
    applicationId: text("application_id"),

    dateSaved: timestamp("date_saved", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("jobs_user_saved_idx").on(t.userId, t.dateSaved),
    index("jobs_user_status_idx").on(t.userId, t.status),
  ]
);

// Single row per user.
export const masterResume = pgTable("master_resume", {
  userId: text("user_id").primaryKey(),
  contact: jsonb("contact").default({}),
  summary: text("summary").default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const masterResumeEntries = pgTable(
  "master_resume_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    section: text("section").notNull().default("Experience"),
    title: text("title").default(""),
    org: text("org").default(""),
    dates: text("dates").default(""),
    bullets: jsonb("bullets").default([]),
    skills: jsonb("skills").default([]),
    tags: jsonb("tags").default([]),
    metrics: text("metrics").default(""),
    status: text("status").notNull().default("Needs Review"),
    sortOrder: integer("sort_order").default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mr_entries_user_section_idx").on(t.userId, t.section, t.sortOrder)]
);

export const achievements = pgTable(
  "achievements",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").default(""),
    context: text("context").default(""),
    action: text("action").default(""),
    result: text("result").default(""),
    metric: text("metric").default(""),
    company: text("company").default(""),
    project: text("project").default(""),
    date: text("date").default(""),
    skills: jsonb("skills").default([]),
    tags: jsonb("tags").default([]),
    evidence: text("evidence").default(""),
    resumeBullet: text("resume_bullet").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("achievements_user_created_idx").on(t.userId, t.createdAt)]
);

export const reminders = pgTable(
  "reminders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    applicationId: text("application_id"),
    title: text("title").notNull(),
    type: text("type").notNull().default("Application follow-up"),
    company: text("company").default(""),
    role: text("role").default(""),
    dueDate: text("due_date").default(""),
    dueTime: text("due_time").default(""),
    status: text("status").notNull().default("Pending"),
    notes: text("notes").default(""),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reminders_user_due_idx").on(t.userId, t.dueDate),
    index("reminders_app_idx").on(t.applicationId),
  ]
);

export const contacts = pgTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    applicationId: text("application_id"),
    companySlug: text("company_slug").default(""),
    name: text("name").notNull(),
    role: text("role").default(""),
    company: text("company").default(""),
    email: text("email").default(""),
    phone: text("phone").default(""),
    linkedin: text("linkedin").default(""),
    relationship: text("relationship").notNull().default("Recruiter"),
    source: text("source").default(""),
    notes: text("notes").default(""),
    lastContacted: text("last_contacted").default(""),
    nextFollowUp: text("next_follow_up").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("contacts_user_idx").on(t.userId),
    index("contacts_app_idx").on(t.applicationId),
  ]
);

export const skillGaps = pgTable(
  "skill_gaps",
  {
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    skill: text("skill").notNull(),
    skillSlug: text("skill_slug").notNull(),
    category: text("category").notNull(),
    frequency: integer("frequency").notNull().default(0),
    percentage: integer("percentage").notNull().default(0),
    evidenceLevel: text("evidence_level").notNull(),
    evidenceExplanation: text("evidence_explanation").notNull().default(""),
    relatedJobs: jsonb("related_jobs").notNull().default([]),
    importance: text("importance").notNull().default("Low"),
    importanceSource: text("importance_source").notNull().default("derived"),
    learningStatus: text("learning_status").notNull().default("Not Started"),
    notes: text("notes").notNull().default(""),
    portfolioOpportunity: text("portfolio_opportunity").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.id] }),
    index("skill_gaps_user_evidence_idx").on(t.userId, t.evidenceLevel),
    index("skill_gaps_user_status_idx").on(t.userId, t.learningStatus),
  ]
);

// --- Auth.js (GitHub sign-in) tables, matching the Drizzle adapter's shape ---

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);
