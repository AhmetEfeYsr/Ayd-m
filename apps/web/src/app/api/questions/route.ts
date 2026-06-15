import { NextResponse } from 'next/server';
import { db, questions, studentCredits, creditTransactions, users, studentTopicMastery, solvedQuestions } from '@yks-platform/database';
import { eq, sql } from 'drizzle-orm';
import { getAuthClerkId } from '@/lib/auth';
import { getPresignedQuestionUrl } from '@yks-platform/cloud';

export async function GET(request: Request) {
  const clerkId = await getAuthClerkId();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get('id');

  if (!questionId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    // Look up the DB user UUID using Firebase's ID
    const dbUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, clerkId)
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const studentId = dbUser.id;

    // Start transaction for credit deduction and question fetch
    const question = await db.transaction(async (tx) => {
      // 1. Fetch the question
      const q = await tx.query.questions.findFirst({
        where: eq(questions.id, questionId)
      });

      if (!q) {
        throw new Error('Question not found');
      }

      // 2. Check if already purchased/unlocked
      const existingTx = await tx.query.creditTransactions.findFirst({
        where: sql`${creditTransactions.studentId} = ${studentId} AND ${creditTransactions.type} = 'QUESTION_SOLVE' AND ${creditTransactions.referenceId} = ${questionId}`
      });

      if (existingTx) {
        // Skip credit billing since it's already purchased
        return q;
      }

      // 3. Check student credits with write lock
      let [studentCredit] = await tx.select()
        .from(studentCredits)
        .where(eq(studentCredits.studentId, studentId))
        .for('update');

      if (!studentCredit) {
        const [newCredit] = await tx.insert(studentCredits).values({
          studentId,
          balance: 30.0,
          planType: 'BASIC',
        }).returning();
        studentCredit = newCredit;
      }

      if (studentCredit.balance < 0.1) {
        throw new Error('Insufficient credits');
      }

      // 4. Deduct 0.1 credits (10 questions = 1 credit)
      await tx.update(studentCredits)
        .set({ balance: sql`${studentCredits.balance} - 0.1` })
        .where(eq(studentCredits.studentId, studentId));

      // 5. Log transaction
      await tx.insert(creditTransactions).values({
        studentId,
        amount: -0.1,
        type: 'QUESTION_SOLVE',
        referenceId: questionId,
      });

      return q;
    });

    // Generate a presigned URL so the mobile app can load the image securely
    const imageUrl = await getPresignedQuestionUrl(question.r2StorageKey);

    return NextResponse.json({
      question: {
        id: question.id,
        topicId: question.topicId,
        subjectId: question.subjectId,
        optionBounds: question.optionBounds,
        imageUrl, // presigned R2 URL — not the raw storage key
      },
    });
  } catch (error: any) {
    if (error.message === 'Insufficient credits') {
      return NextResponse.json({ error: 'Yetersiz kredi.' }, { status: 402 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const clerkId = await getAuthClerkId();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { questionId, selectedOption } = await request.json();

    if (!questionId || !selectedOption) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const q = await db.query.questions.findFirst({
      where: eq(questions.id, questionId)
    });

    if (!q) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const isCorrect = q.answerKey === selectedOption;

    const dbUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, clerkId)
    });

    if (dbUser) {
      await db.transaction(async (tx) => {
        // Check if already solved
        const alreadySolved = await tx.query.solvedQuestions.findFirst({
          where: sql`${solvedQuestions.studentId} = ${dbUser.id} AND ${solvedQuestions.questionId} = ${questionId}`
        });

        if (!alreadySolved) {
          // Record the solve attempt
          await tx.insert(solvedQuestions).values({
            studentId: dbUser.id,
            questionId: questionId,
            isCorrect: isCorrect,
          });

          // Update mastery level only if first attempt
          const existing = await tx.query.studentTopicMastery.findFirst({
            where: sql`${studentTopicMastery.studentId} = ${dbUser.id} AND ${studentTopicMastery.topicId} = ${q.topicId}`
          });

          if (existing) {
            const newMastery = Math.min(1.0, Math.max(0.0, existing.masteryLevel + (isCorrect ? 0.1 : -0.05)));
            await tx.update(studentTopicMastery)
              .set({ masteryLevel: newMastery, lastTestedAt: new Date() })
              .where(eq(studentTopicMastery.id, existing.id));
          } else {
            await tx.insert(studentTopicMastery).values({
              studentId: dbUser.id,
              topicId: q.topicId,
              masteryLevel: isCorrect ? 0.1 : 0.0,
              lastTestedAt: new Date()
            });
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      correct: isCorrect,
      answerKey: q.answerKey,
      message: isCorrect ? 'Tebrikler! Doğru cevap.' : `Yanlış cevap. Doğru şık: ${q.answerKey}`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
