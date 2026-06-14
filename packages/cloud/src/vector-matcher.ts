import { GoogleGenerativeAI } from '@google/generative-ai';
import { cosineDistance, sql } from 'drizzle-orm';
import { topics } from '@yks-platform/database';

function getGenAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing");
  return new GoogleGenerativeAI(key);
}

/**
 * Converts an array of raw topic strings into vector embeddings using Gemini's text-embedding model.
 */
export async function getEmbeddings(topicNames: string[]): Promise<number[][]> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2' });
  
  // Use batch API to send all topics in one request to prevent network overhead and rate limits
  const result = await model.batchEmbedContents({
    requests: topicNames.map((t) => ({
      content: { role: 'user', parts: [{ text: t }] },
      outputDimensionality: 1536,
    })),
  });
  
  return result.embeddings.map((e) => e.values);
}

/**
 * Takes raw topic strings, converts them to vectors, and finds the closest MEB kazanım (topic) 
 * from the database using pgvector Cosine Similarity.
 * 
 * @param db - The Drizzle database instance connected via @neondatabase/serverless
 * @param topicNames - Array of topic names or codes
 * @returns Array of matched database topic UUIDs in the exact same order
 */
export async function matchTopicsWithVectors(db: any, topicNames: string[]): Promise<string[]> {
  if (!topicNames || topicNames.length === 0) return [];
  
  const embeddings = await getEmbeddings(topicNames);

  // Execute all queries in parallel to avoid N+1 sequential database round-trips over the network
  const matchedTopicIds = await Promise.all(
    embeddings.map(async (embedding) => {
      // Format the number[] embedding into a postgres vector string literal '[1,2,3...]'
      // This prevents the pg driver from serializing it as a standard postgres array '{1,2,3}'
      const vectorStr = `[${embedding.join(',')}]`;
      const match = await db
        .select({ id: topics.id })
        .from(topics)
        .orderBy(sql`${topics.embedding} <=> ${vectorStr}::vector`)
        .limit(1);

      return match.length > 0 ? match[0].id : '';
    })
  );

  return matchedTopicIds;
}


