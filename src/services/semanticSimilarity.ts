/**
 * Semantic Similarity & Smart Reordering Service
 * Ported from Relivr's prompt_template.py — Node 3 (reordering logic)
 * 
 * No API calls made here. Reordering uses suggested_order populated
 * during Call 1 (Vision analysis). Falls back to local TF-IDF on
 * semantic_tags + descriptions when suggested_order is unavailable.
 */

import type { WorkflowImage } from "@/types/workflow";

// --- Simple TF-IDF-like similarity for browser (no external deps) ---

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function buildVocabulary(texts: string[]): Map<string, number> {
  const vocab = new Map<string, number>();
  let idx = 0;
  for (const text of texts) {
    for (const token of tokenize(text)) {
      if (!vocab.has(token)) {
        vocab.set(token, idx++);
      }
    }
  }
  return vocab;
}

function textToVector(text: string, vocab: Map<string, number>): number[] {
  const vector = new Array(vocab.size).fill(0);
  const tokens = tokenize(text);
  const tokenCounts = new Map<string, number>();

  for (const token of tokens) {
    tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
  }

  for (const [token, count] of tokenCounts) {
    const idx = vocab.get(token);
    if (idx !== undefined) {
      vector[idx] = count / tokens.length; // TF
    }
  }

  return vector;
}

function cosineSimilarity(a: number[], b: number[]): number {
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

function computeSimilarityMatrix(vectors: number[][]): number[][] {
  const n = vectors.length;
  const matrix: number[][] = Array.from({ length: n }, () =>
    new Array(n).fill(0)
  );

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      matrix[i][j] = cosineSimilarity(vectors[i], vectors[j]);
    }
  }

  return matrix;
}

// --- Reorder by similarity (same algorithm as Relivr) ---

function reorderBySimilarity(
  images: WorkflowImage[],
  similarityMatrix: number[][]
): WorkflowImage[] {
  // Sort by total similarity (sum of row), descending
  // This is the same as: np.argsort(-similarity_matrix.sum(axis=1))
  const totalSimilarity = similarityMatrix.map((row) =>
    row.reduce((sum, val) => sum + val, 0)
  );

  const indices = Array.from({ length: images.length }, (_, i) => i);
  indices.sort((a, b) => totalSimilarity[b] - totalSimilarity[a]);

  return indices.map((i) => images[i]);
}

// --- Sort by suggested_order from vision analysis ---

function reorderBySuggestedOrder(images: WorkflowImage[]): WorkflowImage[] {
  // All images have suggested_order populated by the vision call
  return [...images].sort((a, b) => {
    const aOrder = a.suggested_order ?? Infinity;
    const bOrder = b.suggested_order ?? Infinity;
    return aOrder - bOrder;
  });
}

// --- Main export — no API calls ---

export async function reorderImages(
  images: WorkflowImage[]
): Promise<WorkflowImage[]> {
  if (images.length <= 2) return images;

  // Primary: use suggested_order from vision analysis (Call 1)
  const hasSuggestedOrder = images.some((img) => img.suggested_order !== undefined);
  if (hasSuggestedOrder) {
    return reorderBySuggestedOrder(images);
  }

  // Fallback: local TF-IDF on semantic_tags + description
  // Combine tags and description for richer similarity signal
  const texts = images.map((img) => {
    const tags = img.semantic_tags?.join(" ") ?? "";
    const desc = img.description || img.text || img.name;
    return `${tags} ${desc}`.trim();
  });

  const vocab = buildVocabulary(texts);
  if (vocab.size === 0) return images;

  const vectors = texts.map((t) => textToVector(t, vocab));
  const similarityMatrix = computeSimilarityMatrix(vectors);

  return reorderBySimilarity(images, similarityMatrix);
}
