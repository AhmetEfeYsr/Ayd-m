ALTER TABLE "questions" ALTER COLUMN "embedding" SET DATA TYPE vector(1536);--> statement-breakpoint
ALTER TABLE "topics" ALTER COLUMN "embedding" SET DATA TYPE vector(1536);