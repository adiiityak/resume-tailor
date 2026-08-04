CREATE TABLE "skill_gaps" (
	"id" text NOT NULL,
	"user_id" text NOT NULL,
	"skill" text NOT NULL,
	"skill_slug" text NOT NULL,
	"category" text NOT NULL,
	"frequency" integer DEFAULT 0 NOT NULL,
	"percentage" integer DEFAULT 0 NOT NULL,
	"evidence_level" text NOT NULL,
	"evidence_explanation" text DEFAULT '' NOT NULL,
	"related_jobs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"importance" text DEFAULT 'Low' NOT NULL,
	"importance_source" text DEFAULT 'derived' NOT NULL,
	"learning_status" text DEFAULT 'Not Started' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"portfolio_opportunity" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skill_gaps_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE INDEX "skill_gaps_user_evidence_idx" ON "skill_gaps" USING btree ("user_id","evidence_level");--> statement-breakpoint
CREATE INDEX "skill_gaps_user_status_idx" ON "skill_gaps" USING btree ("user_id","learning_status");