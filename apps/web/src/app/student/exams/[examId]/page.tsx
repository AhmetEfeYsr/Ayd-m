import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { db, omrResults, exams } from "@yks-platform/database";
import { eq, and } from "drizzle-orm";
import { getPresignedOMRDownloadUrl } from "@yks-platform/cloud";
import ExamDetailClient from "./ExamDetailClient";

export const metadata = { title: "Sınav Detayı — YKS 2026" };

export default async function ExamDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");

  const { examId } = await params;

  const exam = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
  if (!exam[0]) redirect("/student");

  const result = await db
    .select()
    .from(omrResults)
    .where(and(eq(omrResults.examId, examId), eq(omrResults.studentId, user.id)))
    .limit(1);

  const myResult = result[0];
  if (!myResult) redirect("/student");

  // Direct presigned Cloudflare R2 download URL (zero serverless proxy cost!)
  const presignedUrl = await getPresignedOMRDownloadUrl(myResult.r2StorageKey, 900);

  return (
    <ExamDetailClient
      examName={exam[0].name}
      examType={exam[0].type}
      examDate={exam[0].date}
      answerKeyString={exam[0].answerKeyString}
      netScore={myResult.netScore}
      presignedUrl={presignedUrl}
    />
  );
}
