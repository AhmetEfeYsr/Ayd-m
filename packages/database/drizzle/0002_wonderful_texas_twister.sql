ALTER TYPE "public"."notification_type" ADD VALUE 'SMS';--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "clerk_id" TO "firebase_uid";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_clerk_id_unique";--> statement-breakpoint
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_student_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_class_id_classes_id_fk";
--> statement-breakpoint
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_exam_id_exams_id_fk";
--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "classes_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "classrooms" DROP CONSTRAINT "classrooms_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_transactions" DROP CONSTRAINT "credit_transactions_student_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "exam_assignments" DROP CONSTRAINT "exam_assignments_exam_id_exams_id_fk";
--> statement-breakpoint
ALTER TABLE "exam_assignments" DROP CONSTRAINT "exam_assignments_student_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "exam_assignments" DROP CONSTRAINT "exam_assignments_classroom_id_classrooms_id_fk";
--> statement-breakpoint
ALTER TABLE "exam_questions" DROP CONSTRAINT "exam_questions_exam_id_exams_id_fk";
--> statement-breakpoint
ALTER TABLE "exam_questions" DROP CONSTRAINT "exam_questions_topic_id_topics_id_fk";
--> statement-breakpoint
ALTER TABLE "exams" DROP CONSTRAINT "exams_publisher_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "lesson_events" DROP CONSTRAINT "lesson_events_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "lesson_events" DROP CONSTRAINT "lesson_events_teacher_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "lesson_events" DROP CONSTRAINT "lesson_events_schedule_id_schedules_id_fk";
--> statement-breakpoint
ALTER TABLE "lesson_events" DROP CONSTRAINT "lesson_events_class_id_classes_id_fk";
--> statement-breakpoint
ALTER TABLE "lesson_events" DROP CONSTRAINT "lesson_events_classroom_id_classrooms_id_fk";
--> statement-breakpoint
ALTER TABLE "notification_logs" DROP CONSTRAINT "notification_logs_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "notification_logs" DROP CONSTRAINT "notification_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "omr_results" DROP CONSTRAINT "omr_results_student_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "omr_results" DROP CONSTRAINT "omr_results_exam_id_exams_id_fk";
--> statement-breakpoint
ALTER TABLE "omr_subject_results" DROP CONSTRAINT "omr_subject_results_omr_result_id_omr_results_id_fk";
--> statement-breakpoint
ALTER TABLE "omr_subject_results" DROP CONSTRAINT "omr_subject_results_subject_id_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_topic_id_topics_id_fk";
--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_subject_id_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_class_id_classes_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_teacher_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_classroom_id_classrooms_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_subject_id_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "sms_templates" DROP CONSTRAINT "sms_templates_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "student_credits" DROP CONSTRAINT "student_credits_student_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "student_topic_mastery" DROP CONSTRAINT "student_topic_mastery_student_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "student_topic_mastery" DROP CONSTRAINT "student_topic_mastery_topic_id_topics_id_fk";
--> statement-breakpoint
ALTER TABLE "subjects" DROP CONSTRAINT "subjects_curriculum_id_curriculums_id_fk";
--> statement-breakpoint
ALTER TABLE "topic_nodes" DROP CONSTRAINT "topic_nodes_source_topic_id_topics_id_fk";
--> statement-breakpoint
ALTER TABLE "topic_nodes" DROP CONSTRAINT "topic_nodes_target_topic_id_topics_id_fk";
--> statement-breakpoint
ALTER TABLE "topics" DROP CONSTRAINT "topics_subject_id_subjects_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_tenant_id_tenants_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_class_id_classes_id_fk";
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "classrooms" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "curriculums" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_events" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sms_templates" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "student_credits" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_assignments_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_assignments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_assignments" ADD CONSTRAINT "exam_assignments_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_publisher_id_tenants_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_events" ADD CONSTRAINT "lesson_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_events" ADD CONSTRAINT "lesson_events_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_events" ADD CONSTRAINT "lesson_events_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_events" ADD CONSTRAINT "lesson_events_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_events" ADD CONSTRAINT "lesson_events_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "omr_results" ADD CONSTRAINT "omr_results_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "omr_results" ADD CONSTRAINT "omr_results_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "omr_subject_results" ADD CONSTRAINT "omr_subject_results_omr_result_id_omr_results_id_fk" FOREIGN KEY ("omr_result_id") REFERENCES "public"."omr_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "omr_subject_results" ADD CONSTRAINT "omr_subject_results_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_templates" ADD CONSTRAINT "sms_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_credits" ADD CONSTRAINT "student_credits_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_topic_mastery" ADD CONSTRAINT "student_topic_mastery_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_topic_mastery" ADD CONSTRAINT "student_topic_mastery_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_curriculum_id_curriculums_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curriculums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_nodes" ADD CONSTRAINT "topic_nodes_source_topic_id_topics_id_fk" FOREIGN KEY ("source_topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_nodes" ADD CONSTRAINT "topic_nodes_target_topic_id_topics_id_fk" FOREIGN KEY ("target_topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_student_date_idx" ON "attendance" USING btree ("student_id","date");--> statement-breakpoint
CREATE INDEX "attendance_class_idx" ON "attendance" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "classes_tenant_idx" ON "classes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "classrooms_tenant_idx" ON "classrooms" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "credit_tx_student_created_idx" ON "credit_transactions" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "exam_questions_exam_idx" ON "exam_questions" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "exams_publisher_idx" ON "exams" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "exams_date_idx" ON "exams" USING btree ("date");--> statement-breakpoint
CREATE INDEX "lesson_events_teacher_date_idx" ON "lesson_events" USING btree ("teacher_id","date");--> statement-breakpoint
CREATE INDEX "notification_logs_user_idx" ON "notification_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_logs_tenant_idx" ON "notification_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "omr_results_student_idx" ON "omr_results" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "omr_results_exam_idx" ON "omr_results" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "questions_topic_idx" ON "questions" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "questions_subject_idx" ON "questions" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "schedules_tenant_day_idx" ON "schedules" USING btree ("tenant_id","day_of_week");--> statement-breakpoint
CREATE INDEX "schedules_teacher_idx" ON "schedules" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "schedules_class_idx" ON "schedules" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "stm_student_idx" ON "student_topic_mastery" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "subjects_curriculum_idx" ON "subjects" USING btree ("curriculum_id");--> statement-breakpoint
CREATE INDEX "topic_nodes_source_idx" ON "topic_nodes" USING btree ("source_topic_id");--> statement-breakpoint
CREATE INDEX "topic_nodes_target_idx" ON "topic_nodes" USING btree ("target_topic_id");--> statement-breakpoint
CREATE INDEX "topics_subject_idx" ON "topics" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "topics_index_code_idx" ON "topics" USING btree ("index_code");--> statement-breakpoint
CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "users_class_idx" ON "users" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid");