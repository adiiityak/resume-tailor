CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT '',
	"context" text DEFAULT '',
	"action" text DEFAULT '',
	"result" text DEFAULT '',
	"metric" text DEFAULT '',
	"company" text DEFAULT '',
	"project" text DEFAULT '',
	"date" text DEFAULT '',
	"skills" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"evidence" text DEFAULT '',
	"resume_bullet" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_documents" (
	"application_id" text NOT NULL,
	"kind" text NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_documents_application_id_kind_pk" PRIMARY KEY("application_id","kind")
);
--> statement-breakpoint
CREATE TABLE "application_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"type" text NOT NULL,
	"subject" text DEFAULT '',
	"body" text NOT NULL,
	"contact_id" text,
	"contact_name" text DEFAULT '',
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company" text NOT NULL,
	"company_slug" text NOT NULL,
	"role" text NOT NULL,
	"role_slug" text NOT NULL,
	"location" text DEFAULT '',
	"work_mode" text DEFAULT '',
	"job_url" text DEFAULT '',
	"application_date" date,
	"status" text DEFAULT 'Saved' NOT NULL,
	"status_updated_at" timestamp with time zone,
	"priority" text DEFAULT 'Medium',
	"mode" text DEFAULT 'local',
	"resume_variant" text DEFAULT 'v1',
	"match_score" integer,
	"fit_score" integer,
	"next_follow_up_at" date,
	"submitted_at" timestamp with time zone,
	"submitted_resume_version" text,
	"submitted_cover_letter_version" text,
	"application_source" text DEFAULT '',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"migrated" boolean DEFAULT false,
	"extra" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"application_id" text,
	"company_slug" text DEFAULT '',
	"name" text NOT NULL,
	"role" text DEFAULT '',
	"company" text DEFAULT '',
	"email" text DEFAULT '',
	"phone" text DEFAULT '',
	"linkedin" text DEFAULT '',
	"relationship" text DEFAULT 'Recruiter' NOT NULL,
	"source" text DEFAULT '',
	"notes" text DEFAULT '',
	"last_contacted" text DEFAULT '',
	"next_follow_up" text DEFAULT '',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"company" text DEFAULT '',
	"company_slug" text DEFAULT '',
	"role" text DEFAULT '',
	"role_slug" text DEFAULT '',
	"location" text DEFAULT '',
	"work_mode" text DEFAULT '',
	"job_url" text DEFAULT '',
	"source" text DEFAULT '',
	"salary_range" text DEFAULT '',
	"closing_date" text DEFAULT '',
	"priority" text DEFAULT 'Medium',
	"interest" text DEFAULT 'Medium',
	"status" text DEFAULT 'Saved' NOT NULL,
	"notes" text DEFAULT '',
	"job_description" text DEFAULT '',
	"tags" jsonb DEFAULT '[]'::jsonb,
	"application_id" text,
	"date_saved" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_resume" (
	"user_id" text PRIMARY KEY NOT NULL,
	"contact" jsonb DEFAULT '{}'::jsonb,
	"summary" text DEFAULT '',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_resume_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"section" text DEFAULT 'Experience' NOT NULL,
	"title" text DEFAULT '',
	"org" text DEFAULT '',
	"dates" text DEFAULT '',
	"bullets" jsonb DEFAULT '[]'::jsonb,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metrics" text DEFAULT '',
	"status" text DEFAULT 'Needs Review' NOT NULL,
	"sort_order" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"application_id" text,
	"title" text NOT NULL,
	"type" text DEFAULT 'Application follow-up' NOT NULL,
	"company" text DEFAULT '',
	"role" text DEFAULT '',
	"due_date" text DEFAULT '',
	"due_time" text DEFAULT '',
	"status" text DEFAULT 'Pending' NOT NULL,
	"notes" text DEFAULT '',
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp with time zone,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE INDEX "achievements_user_created_idx" ON "achievements" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_app_created_idx" ON "application_activity" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_app_created_idx" ON "application_messages" USING btree ("application_id","created_at");--> statement-breakpoint
CREATE INDEX "applications_user_created_idx" ON "applications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "applications_user_company_idx" ON "applications" USING btree ("user_id","company_slug");--> statement-breakpoint
CREATE INDEX "applications_user_status_idx" ON "applications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "contacts_user_idx" ON "contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contacts_app_idx" ON "contacts" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "jobs_user_saved_idx" ON "jobs" USING btree ("user_id","date_saved");--> statement-breakpoint
CREATE INDEX "jobs_user_status_idx" ON "jobs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "mr_entries_user_section_idx" ON "master_resume_entries" USING btree ("user_id","section","sort_order");--> statement-breakpoint
CREATE INDEX "reminders_user_due_idx" ON "reminders" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "reminders_app_idx" ON "reminders" USING btree ("application_id");