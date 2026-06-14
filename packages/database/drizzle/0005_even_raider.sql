CREATE TABLE "solved_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"is_correct" boolean NOT NULL,
	"solved_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stu_question_idx" UNIQUE("student_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "communication_quota_per_student" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_status" text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "subscription_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "iyzico_payment_id" text;--> statement-breakpoint
ALTER TABLE "solved_questions" ADD CONSTRAINT "solved_questions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solved_questions" ADD CONSTRAINT "solved_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solved_questions_student_idx" ON "solved_questions" USING btree ("student_id");