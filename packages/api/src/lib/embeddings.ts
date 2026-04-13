/**
 * Embeddings — text vectorization using OpenAI API
 *
 * Converts text to 1536-dim vectors for semantic search.
 * Stored as JSON arrays in agent_memory_chunks.embedding for similarity queries.
 */

import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Model: text-embedding-3-small (1536 dimensions, $0.02 per 1M tokens)
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;

/**
 * Embed a single text chunk
 */
export async function embedText(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return new Array(EMBEDDING_DIM).fill(0);
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8191), // API max input
      encoding_format: "float",
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding || embedding.length !== EMBEDDING_DIM) {
      console.warn(`[Embeddings] Unexpected embedding dimension: ${embedding?.length}`);
      return new Array(EMBEDDING_DIM).fill(0);
    }

    return embedding as number[];
  } catch (err) {
    console.error("[Embeddings] Error embedding text:", err);
    return new Array(EMBEDDING_DIM).fill(0);
  }
}

/**
 * Embed multiple texts in batch
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts.map((t) => t.slice(0, 8191)),
      encoding_format: "float",
    });

    return response.data.map((item) => item.embedding as number[]);
  } catch (err) {
    console.error("[Embeddings] Error embedding texts:", err);
    return texts.map(() => new Array(EMBEDDING_DIM).fill(0));
  }
}

/**
 * Cosine similarity between two vectors (0 to 1, higher = more similar)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Find similar memories by vector similarity
 * (Alternative to database vector search when pgvector isn't available)
 */
export function findSimilarMemories(
  queryEmbedding: number[],
  candidates: Array<{ embedding: number[] | null; content: string; id: string }>,
  topK: number = 5,
  threshold: number = 0.5
): Array<{ id: string; content: string; similarity: number }> {
  const scored = candidates
    .filter((c) => c.embedding && c.embedding.length === EMBEDDING_DIM)
    .map((c) => ({
      id: c.id,
      content: c.content,
      similarity: cosineSimilarity(queryEmbedding, c.embedding!),
    }))
    .filter((r) => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored;
}
