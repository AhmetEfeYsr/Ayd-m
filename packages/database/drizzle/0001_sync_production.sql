CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."credit_plan" AS ENUM('BASIC', 'PREMIUM', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."credit_transaction_type" AS ENUM('QUESTION_SOLVE', 'RAG_ASK', 'TOP_UP', 'PLAN_ASSIGNMENT');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('PENDING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('PUSH', 'EMAIL');--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"amount" real NOT NULL,
	"type" "credit_transaction_type" NOT NULL,
	"reference_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"question_number" integer NOT NULL,
	"topic_id" uuid
);
--> statement-breakpoint
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"user_id" uuid,
	"type" "notification_type" NOT NULL,
	"status" "notification_status" DEFAULT 'PENDING' NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "omr_subject_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"omr_result_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"incorrect" integer DEFAULT 0 NOT NULL,
	"blank" integer DEFAULT 0 NOT NULL,
	"net_score" real DEFAULT 0 NOT NULL,
	CONSTRAINT "omr_subj_idx" UNIQUE("omr_result_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"r2_storage_key" text NOT NULL,
	"embedding" vector(768),
	"answer_key" text,
	"option_bounds" jsonb
);
--> statement-breakpoint
CREATE TABLE "student_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"balance" real DEFAULT 0 NOT NULL,
	"plan_type" "credit_plan" DEFAULT 'BASIC' NOT NULL,
	CONSTRAINT "student_credits_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "student_topic_mastery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"mastery_level" real DEFAULT 0 NOT NULL,
	"last_tested_at" timestamp DEFAULT now(),
	CONSTRAINT "stu_topic_idx" UNIQUE("student_id","topic_id")
);
--> statement-breakpoint
ALTER TABLE "omr_results" ADD COLUMN "raw_json" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "identity_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "student_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birth_date" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "expo_push_token" text;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "omr_subject_results" ADD CONSTRAINT "omr_subject_results_omr_result_id_omr_results_id_fk" FOREIGN KEY ("omr_result_id") REFERENCES "public"."omr_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "omr_subject_results" ADD CONSTRAINT "omr_subject_results_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_credits" ADD CONSTRAINT "student_credits_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_topic_mastery" ADD CONSTRAINT "student_topic_mastery_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_topic_mastery" ADD CONSTRAINT "student_topic_mastery_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_stu_idx" UNIQUE("exam_id","student_id");--> statement-breakpoint
ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_seat_idx" UNIQUE("exam_id","classroom_id","seat_number");--> statement-breakpoint
ALTER TABLE "omr_results" ADD CONSTRAINT "stu_exam_idx" UNIQUE("student_id","exam_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_identity_number_unique" UNIQUE("identity_number");