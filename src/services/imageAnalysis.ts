/**
 * Image Analysis Service
 * Ported from Relivr's prompt_template.py — Node 1 (Preprocess)
 * 
 * Call 1 of 2 (Vision Model): Analyzes images in one pass to generate:
 * - Concise descriptions of each image
 * - Quality scores (0-100)
 * - Semantic tags for local reordering (no second API call needed)
 * - Suggested narrative order, time context, and mood
 * 
 * Processes in batches of 8 for efficiency.
 */

import { analyzeImage, isGeminiConfigured, urlToBase64 } from "@/integrations/gemini/client";
import type { ImageDescription, PreprocessOutput } from "@/integrations/gemini/types";
import type { WorkflowImage } from "@/types/workflow";
import { BATCH_CONFIG } from "@/types/workflow";

// --- JSON Schema for structured Gemini output ---

const PREPROCESS_SCHEMA = {
  type: "object",
  properties: {
    images: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "The unique identifier for the image." },
          image_text: {
            type: "string",
            description: "A concise and meaningful description of the image, capturing events, emotions, and context.",
          },
          image_quality: {
            type: "integer",
            description: "A quality score for the image (0-100) based on resolution, sharpness, composition, and vibrancy.",
          },
          semantic_tags: {
            type: "array",
            items: { type: "string" },
            description: "3-6 keywords capturing the main subject, setting, and activity (e.g. beach, sunset, family, celebration).",
          },
          suggested_order: {
            type: "integer",
            description: "Suggested narrative position (1 = first, N = last) to create a natural flowing story across all images.",
          },
          time_context: {
            type: "string",
            description: "Brief context about when this moment occurs (e.g. 'morning arrival', 'evening celebration', 'vacation day 2').",
          },
          mood: {
            type: "string",
            description: "Dominant emotional tone of the image: one of joyful, serene, dramatic, nostalgic, playful, tender.",
          },
        },
        required: ["id", "image_text", "image_quality", "semantic_tags", "suggested_order", "time_context", "mood"],
      },
    },
  },
  required: ["images"],
};

const SYSTEM_PROMPT = `You are a photo book assistant. Analyze all provided images in one pass and return structured data for each.

**Ensure ID Consistency**
- Use IDs exactly as provided—do not modify, omit, or duplicate.
- Assign each ID to the \`id\` field in the output.

**Generate Image Descriptions** (image_text)
- Write concise, meaningful descriptions capturing events, emotions, and visual content.

**Evaluate Image Quality** (image_quality)
- Score 0-100 based on resolution, sharpness, composition, and vibrancy.

**Extract Semantic Tags** (semantic_tags)
- Provide 3-6 keywords for subject, setting, and activity to enable smart grouping.

**Suggest Narrative Order** (suggested_order)
- Assign a position (1 to N) across ALL images so they tell a natural story when sorted.
- Consider chronological clues, events, and visual flow between scenes.

**Identify Time Context** (time_context)
- Brief label for when this moment occurs in the overall story.

**Identify Mood** (mood)
- Single word: joyful, serene, dramatic, nostalgic, playful, or tender.`;

// --- Preprocess a batch of images ---

async function preprocessBatch(
  images: WorkflowImage[]
): Promise<ImageDescription[]> {
  // Convert images to base64 for vision analysis
  const imageData = await Promise.all(
    images.map(async (img) => {
      try {
        return await urlToBase64(img.url);
      } catch {
        return null;
      }
    })
  );

  const validImages = imageData.filter(
    (d): d is { base64: string; mimeType: string } => d !== null
  );

  const imageList = images
    .map((img) => `- ID: ${img.id}, Name: ${img.name}`)
    .join("\n");

  const prompt = `Analyze the following ${images.length} images and provide descriptions and quality scores for each.\n\nImage IDs:\n${imageList}`;

  const response = await analyzeImage<PreprocessOutput>({
    prompt,
    systemInstruction: SYSTEM_PROMPT,
    images: validImages,
    temperature: 0.7,
    maxOutputTokens: 2048,
    responseSchema: PREPROCESS_SCHEMA,
  });

  return response.data.images || [];
}

// --- Main preprocessing function with retry logic ---

export async function preprocessImages(
  images: WorkflowImage[],
  maxRetries: number = BATCH_CONFIG.MAX_RETRIES
): Promise<WorkflowImage[]> {
  if (!isGeminiConfigured) {
    // Demo mode: generate mock descriptions with enriched fields
    const moods = ["joyful", "serene", "nostalgic", "playful", "tender"];
    return images.map((img, i) => ({
      ...img,
      description: `A beautiful photo: ${img.name}`,
      quality: 70 + Math.floor(Math.random() * 25),
      text: `ID: ${img.id}, Text: A beautiful photo capturing a special moment - ${img.name}, Size: ${img.width}x${img.height}`,
      semantic_tags: ["memory", "moment", "photo"],
      suggested_order: i + 1,
      time_context: "captured moment",
      mood: moods[i % moods.length],
    }));
  }

  const batchSize = BATCH_CONFIG.PREPROCESS_BATCH_SIZE;
  const batches: WorkflowImage[][] = [];
  for (let i = 0; i < images.length; i += batchSize) {
    batches.push(images.slice(i, i + batchSize));
  }

  // Process all batches concurrently
  const allResults = await Promise.all(
    batches.map((batch) => preprocessBatch(batch))
  );

  const descriptions = allResults.flat();
  const originalIds = images.map((img) => img.id).sort();
  const newIds = descriptions.map((d) => d.id).sort();

  // Retry if IDs don't match (same logic as Relivr)
  if (JSON.stringify(originalIds) !== JSON.stringify(newIds) && maxRetries > 0) {
    console.warn(
      `Preprocess: ID mismatch. Retrying... (${maxRetries} retries left)`
    );
    return preprocessImages(images, maxRetries - 1);
  }

  // Merge descriptions back into images
  const descMap = new Map(descriptions.map((d) => [d.id, d]));

  return images.map((img) => {
    const desc = descMap.get(img.id);
    const tags = (desc as any)?.semantic_tags as string[] | undefined;
    return {
      ...img,
      description: desc?.image_text || `Photo: ${img.name}`,
      quality: desc?.image_quality ?? 70,
      text: `ID: ${img.id}, Text: ${desc?.image_text || img.name}, Size: ${img.width}x${img.height}`,
      // Enriched fields for local reordering (no extra API call needed)
      semantic_tags: tags ?? [],
      suggested_order: (desc as any)?.suggested_order as number | undefined,
      time_context: (desc as any)?.time_context as string | undefined,
      mood: (desc as any)?.mood as string | undefined,
    };
  });
}
