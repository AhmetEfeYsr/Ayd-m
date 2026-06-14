ALTER TYPE "public"."notification_type" ADD VALUE 'WHATSAPP';--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "type" SET DEFAULT 'LESSON';--> statement-breakpoint
ALTER TABLE "notification_logs" ADD COLUMN "r2_payload_key" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "plan_type" text DEFAULT 'STANDARD' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "sms_sent_this_month" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "whatsapp_sent_this_month" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "quota_reset_date" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "public_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "encrypted_private_key" text;--> statement-breakpoint
ALTER TABLE "curriculums" ADD CONSTRAINT "curriculums_name_unique" UNIQUE("name");--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subj_curriculum_name_idx" UNIQUE("curriculum_id","name");--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topic_subject_name_idx" UNIQUE("subject_id","name");