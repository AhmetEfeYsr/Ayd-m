CREATE TABLE "user_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"email" text,
	"error_code" text,
	"module" text NOT NULL,
	"part" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_feedback_user_idx" ON "user_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_feedback_status_idx" ON "user_feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_feedback_code_idx" ON "user_feedback" USING btree ("error_code");