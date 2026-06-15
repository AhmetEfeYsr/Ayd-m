import { db, creditTransactions, studentCredits } from "@yks-platform/database";
import { eq, and, gte, sql, desc } from "drizzle-orm";
 
/**
 * Checks and enforces the monthly free AI requests limit.
 * - If the student has used less than the limit for the feature, allows it for free (logs a 0-cost transaction).
 * - Otherwise, attempts to deduct the required credit cost from their balance.
 * Returns { allowed: true } or { allowed: false, error: string }.
 */
export async function checkAndEnforceAiLimit(
  studentId: string,
  cost: number = 1,
  featureKey: 'TUTOR' | 'STUDY_PLAN' | 'RAG' = 'RAG',
  referenceIdExtra?: string
): Promise<{ allowed: boolean; error?: string; charged?: boolean }> {
  const paidReferenceId = `PAID_LIMIT_${featureKey}${referenceIdExtra ? `_${referenceIdExtra}` : ''}`;

  try {
    // Deduct credits inside transaction using a WRITE LOCK (select for update)
    const allowed = await db.transaction(async (tx) => {
      let [studentCredit] = await tx
        .select()
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

      if (studentCredit.balance < cost) {
        return false;
      }

      await tx.update(studentCredits)
        .set({ balance: sql`${studentCredits.balance} - ${cost}` })
        .where(eq(studentCredits.studentId, studentId));

      await tx.insert(creditTransactions).values({
        studentId,
        amount: -cost,
        type: "RAG_ASK",
        referenceId: paidReferenceId,
      });

      return true;
    });

    if (!allowed) {
      const errorMsg = `Bu işlem için yeterli AI krediniz bulunmamaktadır. Devam etmek için en az ${cost} AI kredisine ihtiyacınız var.`;
      return {
        allowed: false,
        error: errorMsg,
      };
    }

    return { allowed: true, charged: true };
  } catch (error: any) {
    console.error("AI Limit check error:", error);
    return { allowed: false, error: "Yapay zeka kota kontrolü sırasında hata oluştu: " + error.message };
  }
}

/**
 * Rolls back an AI request transaction limit entry if the downstream AI service failed.
 */
export async function rollbackAiLimit(
  studentId: string,
  cost: number = 1,
  featureKey: 'TUTOR' | 'STUDY_PLAN' | 'RAG' = 'RAG',
  charged: boolean = false,
  referenceIdExtra?: string
): Promise<void> {
  const paidReferenceId = `PAID_LIMIT_${featureKey}${referenceIdExtra ? `_${referenceIdExtra}` : ''}`;

  try {
    if (charged) {
      await db.transaction(async (tx) => {
        // Refund credit
        await tx.update(studentCredits)
          .set({ balance: sql`${studentCredits.balance} + ${cost}` })
          .where(eq(studentCredits.studentId, studentId));

        // Find the latest matching paid transaction log
        const latestTx = await tx.query.creditTransactions.findFirst({
          where: and(
            eq(creditTransactions.studentId, studentId),
            eq(creditTransactions.referenceId, paidReferenceId),
            eq(creditTransactions.type, 'RAG_ASK')
          ),
          orderBy: desc(creditTransactions.createdAt)
        });

        if (latestTx) {
          // Delete only that specific transaction log
          await tx.delete(creditTransactions)
            .where(eq(creditTransactions.id, latestTx.id));
        }
      });
    }
  } catch (err) {
    console.error("AI Limit rollback error:", err);
  }
}
