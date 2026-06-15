import { pgTable, uuid, text, integer, boolean, timestamp, pgEnum, real, customType, jsonb, unique, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ─── pgvector custom type ───────────────────────────────────────────────────
// customType kullanarak pgvector desteğini garanti altına alıyoruz (drizzle-orm latest sürümünde natively vector importu da var)
const vector = customType<{ data: number[]; driverData: string; config: { dimensions?: number } }>({
  dataType(config) {
    return `vector(${(config as any)?.dimensions ?? 768})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(',').map(Number);
  },
});

// ─── Enums ──────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum('role', ['STUDENT', 'TEACHER', 'COACH', 'INSTITUTION_ADMIN', 'PUBLISHER', 'SYSTEM_ADMIN']);
export const tenantTypeEnum = pgEnum('tenant_type', ['INSTITUTION', 'PUBLISHER']);
export const examTypeEnum = pgEnum('exam_type', ['TYT', 'AYT_SAY', 'AYT_EA', 'AYT_SOZ']);
export const attendanceTypeEnum = pgEnum('attendance_type', ['EXAM', 'LESSON']);
export const attendanceStatusEnum = pgEnum('attendance_status', ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);
export const notificationTypeEnum = pgEnum('notification_type', ['PUSH', 'EMAIL', 'SMS', 'WHATSAPP']);
export const notificationStatusEnum = pgEnum('notification_status', ['PENDING', 'SENT', 'FAILED']);
export const lessonEventTypeEnum = pgEnum('lesson_event_type', ['LATE_NOTICE', 'EXTRA_LESSON', 'CANCELLATION']);
export const creditPlanEnum = pgEnum('credit_plan', ['BASIC', 'PREMIUM', 'CUSTOM']);
export const creditTransactionTypeEnum = pgEnum('credit_transaction_type', ['QUESTION_SOLVE', 'RAG_ASK', 'TOP_UP', 'PLAN_ASSIGNMENT']);

// ─── Tablolar ───────────────────────────────────────────────────────────────

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: tenantTypeEnum('type').notNull(),
  smsSenderId: text('sms_sender_id'), // Örn: 'EGITIM_KURUMU' (Alphanumeric Sender ID)
  smsUsername: text('sms_username'),
  smsPassword: text('sms_password'),
  whatsappApiEndpoint: text('whatsapp_api_endpoint'),
  whatsappApiToken: text('whatsapp_api_token'),
  planType: text('plan_type').default('STANDARD').notNull(), // STANDARD veya PREMIUM
  communicationQuotaPerStudent: integer('communication_quota_per_student').default(30).notNull(),
  smsSentThisMonth: integer('sms_sent_this_month').default(0).notNull(),
  whatsappSentThisMonth: integer('whatsapp_sent_this_month').default(0).notNull(),
  quotaResetDate: timestamp('quota_reset_date'),
  subscriptionStatus: text('subscription_status').default('active'), // active, unpaid, past_due, canceled
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  iyzicoPaymentId: text('iyzico_payment_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const classes = pgTable('classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  telegramGroupId: text('telegram_group_id'), // Asenkron kuyruk için Telegram ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => ({
  tenantIdx: index('classes_tenant_idx').on(t.tenantId),
}));

export const classrooms = pgTable('classrooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // Örn: '101', 'Fizik Laboratuvarı'
  capacity: integer('capacity').notNull(), // Kişi sayısı
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantIdx: index('classrooms_tenant_idx').on(t.tenantId),
}));

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firebaseUid: text('firebase_uid').notNull().unique(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  identityNumber: text('identity_number').unique(), // TC Kimlik No
  studentNumber: text('student_number'),
  birthDate: timestamp('birth_date'),
  phone: text('phone'),
  parentPhone: text('parent_phone'), // Veli SMS'i için
  role: roleEnum('role').notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').default(true),
  expoPushToken: text('expo_push_token'),
  publicKey: text('public_key'),
  encryptedPrivateKey: text('encrypted_private_key'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => ({
  tenantIdx: index('users_tenant_idx').on(t.tenantId),
  classIdx: index('users_class_idx').on(t.classId),
  emailIdx: index('users_email_idx').on(t.email),
}));

export const curriculums = pgTable('curriculums', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(), // Örn: YKS 2026
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  curriculumId: uuid('curriculum_id').references(() => curriculums.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // Örn: Matematik
}, (t) => ({
  curriculumIdx: index('subjects_curriculum_idx').on(t.curriculumId),
  subjCurriculumNameIdx: unique('subj_curriculum_name_idx').on(t.curriculumId, t.name),
}));

export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
  indexCode: text('index_code'), // Örn: '11.2', yapay zeka bu kodla eşleşecek
  name: text('name').notNull(),
  isCore: boolean('is_core').default(false),
  embedding: vector('embedding', { dimensions: 1536 }), // Gemini Embedding vektörü (gerekirse fallback için)
}, (t) => ({
  subjectIdx: index('topics_subject_idx').on(t.subjectId),
  indexCodeIdx: index('topics_index_code_idx').on(t.indexCode),
  topicSubjectNameIdx: unique('topic_subject_name_idx').on(t.subjectId, t.name),
}));

// Graph-Node ilişki tablosu (Örn: İntegral -> Çarpanlara Ayırma)
export const topicNodes = pgTable('topic_nodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceTopicId: uuid('source_topic_id').references(() => topics.id, { onDelete: 'cascade' }).notNull(),
  targetTopicId: uuid('target_topic_id').references(() => topics.id, { onDelete: 'cascade' }).notNull(),
  weight: real('weight').notNull(), // Kök neden ağırlığı
}, (t) => ({
  sourceIdx: index('topic_nodes_source_idx').on(t.sourceTopicId),
  targetIdx: index('topic_nodes_target_idx').on(t.targetTopicId),
}));

export const studentTopicMastery = pgTable('student_topic_mastery', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'cascade' }).notNull(),
  masteryLevel: real('mastery_level').default(0).notNull(), // 0.0 to 1.0 (or 0-100)
  lastTestedAt: timestamp('last_tested_at').defaultNow(),
}, (t) => ({
  unq: unique('stu_topic_idx').on(t.studentId, t.topicId),
  studentIdx: index('stm_student_idx').on(t.studentId),
}));

export const exams = pgTable('exams', {
  id: uuid('id').defaultRandom().primaryKey(),
  publisherId: uuid('publisher_id').references(() => tenants.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  type: examTypeEnum('type').notNull(),
  date: timestamp('date'),
  isPublic: boolean('is_public').default(false), // Diğer kurumların bu şablonu kullanabilmesi için
  answerKeyString: text('answer_key_string'), // Örn: "A_CBE_D..."
  topicIndexes: jsonb('topic_indexes'), // ["11.2", "12.1"] formatında JSON array
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => ({
  publisherIdx: index('exams_publisher_idx').on(t.publisherId),
  dateIdx: index('exams_date_idx').on(t.date),
}));

export const examQuestions = pgTable('exam_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  examId: uuid('exam_id').references(() => exams.id, { onDelete: 'cascade' }).notNull(),
  questionNumber: integer('question_number').notNull(), // 1, 2, 3...
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }), // Hangi konuya ait olduğu
}, (t) => ({
  examIdx: index('exam_questions_exam_idx').on(t.examId),
}));

export const omrResults = pgTable('omr_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }),
  examId: uuid('exam_id').references(() => exams.id, { onDelete: 'cascade' }),
  r2StorageKey: text('r2_storage_key').notNull(), // Cloudflare R2'deki şifrelenmiş .bin dosyasının yolu
  answerString: text('answer_string'), // String map formatındaki cevap (A_CBE_D...)
  rawJson: jsonb('raw_json'), // JSONB representation of OMR results
  netScore: real('net_score'), // ZK-Şifrelenmemiş tek açık veri
  processedAt: timestamp('processed_at').defaultNow(),
}, (t) => ({
  unq: unique('stu_exam_idx').on(t.studentId, t.examId),
  studentIdx: index('omr_results_student_idx').on(t.studentId),
  examIdx: index('omr_results_exam_idx').on(t.examId),
}));

export const omrSubjectResults = pgTable('omr_subject_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  omrResultId: uuid('omr_result_id').references(() => omrResults.id, { onDelete: 'cascade' }).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  correct: integer('correct').notNull().default(0),
  incorrect: integer('incorrect').notNull().default(0),
  blank: integer('blank').notNull().default(0),
  netScore: real('net_score').notNull().default(0),
}, (t) => ({
  unq: unique('omr_subj_idx').on(t.omrResultId, t.subjectId),
}));

export const attendance = pgTable('attendance', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'set null' }),
  examId: uuid('exam_id').references(() => exams.id, { onDelete: 'set null' }), // Eğer deneme sınavı yoklamasıysa
  type: attendanceTypeEnum('type').default('LESSON').notNull(),
  status: attendanceStatusEnum('status').notNull(),
  date: timestamp('date').defaultNow().notNull(),
}, (t) => ({
  studentDateIdx: index('attendance_student_date_idx').on(t.studentId, t.date),
  classIdx: index('attendance_class_idx').on(t.classId),
}));

export const notificationLogs = pgTable('notification_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: notificationTypeEnum('type').notNull(),
  status: notificationStatusEnum('status').notNull().default('PENDING'),
  payload: jsonb('payload'), // Email subject/body or Push title/body
  r2PayloadKey: text('r2_payload_key'), // Cloudflare R2 payload key
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userIdx: index('notification_logs_user_idx').on(t.userId),
  tenantIdx: index('notification_logs_tenant_idx').on(t.tenantId),
}));

export const smsTemplates = pgTable('sms_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const schedules = pgTable('schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'set null' }),
  teacherId: uuid('teacher_id').references(() => users.id, { onDelete: 'set null' }),
  classroomId: uuid('classroom_id').references(() => classrooms.id, { onDelete: 'set null' }),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'set null' }),
  dayOfWeek: integer('day_of_week').notNull(), // 1 (Pazartesi) - 7 (Pazar)
  startTime: text('start_time').notNull(), // "09:00"
  endTime: text('end_time').notNull(), // "09:40"
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  tenantDayIdx: index('schedules_tenant_day_idx').on(t.tenantId, t.dayOfWeek),
  teacherIdx: index('schedules_teacher_idx').on(t.teacherId),
  classIdx: index('schedules_class_idx').on(t.classId),
}));

export const lessonEvents = pgTable('lesson_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  scheduleId: uuid('schedule_id').references(() => schedules.id, { onDelete: 'set null' }), // Var olan bir derse ait istisna ise
  classId: uuid('class_id').references(() => classes.id, { onDelete: 'set null' }), // Ek ders için
  classroomId: uuid('classroom_id').references(() => classrooms.id, { onDelete: 'set null' }), // Ek ders veya derslik değişikliği için
  type: lessonEventTypeEnum('type').notNull(),
  date: timestamp('date').notNull(), // Olayın gerçekleştiği tarih
  startTime: text('start_time'), // Ek ders saati (veya gecikilecek saat)
  endTime: text('end_time'),
  note: text('note'), // Gecikme sebebi, vb.
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  teacherDateIdx: index('lesson_events_teacher_date_idx').on(t.teacherId, t.date),
}));

export const examAssignments = pgTable('exam_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  examId: uuid('exam_id').references(() => exams.id, { onDelete: 'cascade' }).notNull(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  classroomId: uuid('classroom_id').references(() => classrooms.id, { onDelete: 'restrict' }).notNull(),
  seatNumber: integer('seat_number'), // Kelebek sistem koltuk numarası
}, (t) => ({
  unq_stu: unique('exam_stu_idx').on(t.examId, t.studentId),
  unq_seat: unique('exam_seat_idx').on(t.examId, t.classroomId, t.seatNumber),
}));

export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'cascade' }).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  r2StorageKey: text('r2_storage_key').notNull(), // Cloudflare R2'deki soru görselinin yolu
  embedding: vector('embedding', { dimensions: 1536 }), // RAG vektörü
  answerKey: text('answer_key'), // 'A', 'B', 'C', 'D', 'E'
  optionBounds: jsonb('option_bounds'), // [{ option: 'A', x: 10, y: 20, w: 100, h: 50 }, ...] (Lokal AI algılama için)
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  topicIdx: index('questions_topic_idx').on(t.topicId),
  subjectIdx: index('questions_subject_idx').on(t.subjectId),
}));

export const studentCredits = pgTable('student_credits', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  balance: real('balance').notNull().default(30), // Yeni hesaplar 30 deneme kredisi ile başlar
  planType: creditPlanEnum('plan_type').default('BASIC').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: real('amount').notNull(), // Kesintiler için negatif, yüklemeler için pozitif
  type: creditTransactionTypeEnum('type').notNull(),
  referenceId: text('reference_id'), // Örn: questionId veya ödeme referansı
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  studentCreatedIdx: index('credit_tx_student_created_idx').on(t.studentId, t.createdAt),
}));

// ─── Relations ──────────────────────────────────────────────────────────────

export const tenantsRelations = relations(tenants, ({ many }) => ({
  classes: many(classes),
  classrooms: many(classrooms),
  users: many(users),
  exams: many(exams),
  schedules: many(schedules),
  smsTemplates: many(smsTemplates),
  notificationLogs: many(notificationLogs),
  lessonEvents: many(lessonEvents),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  tenant: one(tenants, { fields: [classes.tenantId], references: [tenants.id] }),
  users: many(users),
  attendance: many(attendance),
  schedules: many(schedules),
  lessonEvents: many(lessonEvents),
}));

export const classroomsRelations = relations(classrooms, ({ one, many }) => ({
  tenant: one(tenants, { fields: [classrooms.tenantId], references: [tenants.id] }),
  schedules: many(schedules),
  examAssignments: many(examAssignments),
  lessonEvents: many(lessonEvents),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  class: one(classes, { fields: [users.classId], references: [classes.id] }),
  omrResults: many(omrResults),
  attendance: many(attendance),
  schedules: many(schedules),
  examAssignments: many(examAssignments),
  studentTopicMastery: many(studentTopicMastery),
  studentCredits: one(studentCredits),
  creditTransactions: many(creditTransactions),
  notificationLogs: many(notificationLogs),
  lessonEvents: many(lessonEvents),
  userFeedback: many(userFeedback),
  solvedQuestions: many(solvedQuestions),
}));

export const curriculumsRelations = relations(curriculums, ({ many }) => ({
  subjects: many(subjects),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  curriculum: one(curriculums, { fields: [subjects.curriculumId], references: [curriculums.id] }),
  topics: many(topics),
  questions: many(questions),
  omrSubjectResults: many(omrSubjectResults),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  subject: one(subjects, { fields: [topics.subjectId], references: [subjects.id] }),
  examQuestions: many(examQuestions),
  questions: many(questions),
  studentTopicMastery: many(studentTopicMastery),
  sourceNodes: many(topicNodes, { relationName: 'sourceNode' }),
  targetNodes: many(topicNodes, { relationName: 'targetNode' }),
}));

export const topicNodesRelations = relations(topicNodes, ({ one }) => ({
  sourceTopic: one(topics, { fields: [topicNodes.sourceTopicId], references: [topics.id], relationName: 'sourceNode' }),
  targetTopic: one(topics, { fields: [topicNodes.targetTopicId], references: [topics.id], relationName: 'targetNode' }),
}));

export const studentTopicMasteryRelations = relations(studentTopicMastery, ({ one }) => ({
  student: one(users, { fields: [studentTopicMastery.studentId], references: [users.id] }),
  topic: one(topics, { fields: [studentTopicMastery.topicId], references: [topics.id] }),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  publisher: one(tenants, { fields: [exams.publisherId], references: [tenants.id] }),
  examQuestions: many(examQuestions),
  omrResults: many(omrResults),
  examAssignments: many(examAssignments),
  attendance: many(attendance),
}));

export const examQuestionsRelations = relations(examQuestions, ({ one }) => ({
  exam: one(exams, { fields: [examQuestions.examId], references: [exams.id] }),
  topic: one(topics, { fields: [examQuestions.topicId], references: [topics.id] }),
}));

export const omrResultsRelations = relations(omrResults, ({ one, many }) => ({
  student: one(users, { fields: [omrResults.studentId], references: [users.id] }),
  exam: one(exams, { fields: [omrResults.examId], references: [exams.id] }),
  subjectResults: many(omrSubjectResults),
}));

export const omrSubjectResultsRelations = relations(omrSubjectResults, ({ one }) => ({
  omrResult: one(omrResults, { fields: [omrSubjectResults.omrResultId], references: [omrResults.id] }),
  subject: one(subjects, { fields: [omrSubjectResults.subjectId], references: [subjects.id] }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(users, { fields: [attendance.studentId], references: [users.id] }),
  class: one(classes, { fields: [attendance.classId], references: [classes.id] }),
  exam: one(exams, { fields: [attendance.examId], references: [exams.id] }),
}));

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [notificationLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [notificationLogs.userId], references: [users.id] }),
}));

export const smsTemplatesRelations = relations(smsTemplates, ({ one }) => ({
  tenant: one(tenants, { fields: [smsTemplates.tenantId], references: [tenants.id] }),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  tenant: one(tenants, { fields: [schedules.tenantId], references: [tenants.id] }),
  class: one(classes, { fields: [schedules.classId], references: [classes.id] }),
  teacher: one(users, { fields: [schedules.teacherId], references: [users.id] }),
  classroom: one(classrooms, { fields: [schedules.classroomId], references: [classrooms.id] }),
  subject: one(subjects, { fields: [schedules.subjectId], references: [subjects.id] }),
  lessonEvents: many(lessonEvents),
}));

export const lessonEventsRelations = relations(lessonEvents, ({ one }) => ({
  tenant: one(tenants, { fields: [lessonEvents.tenantId], references: [tenants.id] }),
  teacher: one(users, { fields: [lessonEvents.teacherId], references: [users.id] }),
  schedule: one(schedules, { fields: [lessonEvents.scheduleId], references: [schedules.id] }),
  class: one(classes, { fields: [lessonEvents.classId], references: [classes.id] }),
  classroom: one(classrooms, { fields: [lessonEvents.classroomId], references: [classrooms.id] }),
}));

export const examAssignmentsRelations = relations(examAssignments, ({ one }) => ({
  exam: one(exams, { fields: [examAssignments.examId], references: [exams.id] }),
  student: one(users, { fields: [examAssignments.studentId], references: [users.id] }),
  classroom: one(classrooms, { fields: [examAssignments.classroomId], references: [classrooms.id] }),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  topic: one(topics, { fields: [questions.topicId], references: [topics.id] }),
  subject: one(subjects, { fields: [questions.subjectId], references: [subjects.id] }),
  solvedQuestions: many(solvedQuestions),
}));

export const studentCreditsRelations = relations(studentCredits, ({ one }) => ({
  student: one(users, { fields: [studentCredits.studentId], references: [users.id] }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  student: one(users, { fields: [creditTransactions.studentId], references: [users.id] }),
}));

// ─── Type-safe Export'lar ───────────────────────────────────────────────────

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;

export type Classroom = typeof classrooms.$inferSelect;
export type NewClassroom = typeof classrooms.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Curriculum = typeof curriculums.$inferSelect;
export type NewCurriculum = typeof curriculums.$inferInsert;

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;

export type TopicNode = typeof topicNodes.$inferSelect;
export type NewTopicNode = typeof topicNodes.$inferInsert;

export type StudentTopicMastery = typeof studentTopicMastery.$inferSelect;
export type NewStudentTopicMastery = typeof studentTopicMastery.$inferInsert;

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;

export type ExamQuestion = typeof examQuestions.$inferSelect;
export type NewExamQuestion = typeof examQuestions.$inferInsert;

export type OmrResult = typeof omrResults.$inferSelect;
export type NewOmrResult = typeof omrResults.$inferInsert;

export type OmrSubjectResult = typeof omrSubjectResults.$inferSelect;
export type NewOmrSubjectResult = typeof omrSubjectResults.$inferInsert;

export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type NewNotificationLog = typeof notificationLogs.$inferInsert;

export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type NewSmsTemplate = typeof smsTemplates.$inferInsert;

export type Schedule = typeof schedules.$inferSelect;
export type NewSchedule = typeof schedules.$inferInsert;

export type LessonEvent = typeof lessonEvents.$inferSelect;
export type NewLessonEvent = typeof lessonEvents.$inferInsert;

export type ExamAssignment = typeof examAssignments.$inferSelect;
export type NewExamAssignment = typeof examAssignments.$inferInsert;

export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;

export type StudentCredit = typeof studentCredits.$inferSelect;
export type NewStudentCredit = typeof studentCredits.$inferInsert;

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;

export const userFeedback = pgTable('user_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  email: text('email'),
  errorCode: text('error_code'),
  module: text('module').notNull(),
  part: text('part').notNull(),
  description: text('description').notNull(),
  status: text('status').default('OPEN').notNull(), // 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => ({
  userIdx: index('user_feedback_user_idx').on(t.userId),
  statusIdx: index('user_feedback_status_idx').on(t.status),
  codeIdx: index('user_feedback_code_idx').on(t.errorCode),
}));

export const userFeedbackRelations = relations(userFeedback, ({ one }) => ({
  user: one(users, { fields: [userFeedback.userId], references: [users.id] }),
}));

export type UserFeedback = typeof userFeedback.$inferSelect;
export type NewUserFeedback = typeof userFeedback.$inferInsert;

export const solvedQuestions = pgTable('solved_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  questionId: uuid('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  isCorrect: boolean('is_correct').notNull(),
  solvedAt: timestamp('solved_at').defaultNow().notNull(),
}, (t) => ({
  unq: unique('stu_question_idx').on(t.studentId, t.questionId),
  studentIdx: index('solved_questions_student_idx').on(t.studentId),
}));

export const solvedQuestionsRelations = relations(solvedQuestions, ({ one }) => ({
  student: one(users, { fields: [solvedQuestions.studentId], references: [users.id] }),
  question: one(questions, { fields: [solvedQuestions.questionId], references: [questions.id] }),
}));

export type SolvedQuestion = typeof solvedQuestions.$inferSelect;
export type NewSolvedQuestion = typeof solvedQuestions.$inferInsert;
