import type {
  GeminiConfig,
  GeminiTextRequest,
  GeminiVisionRequest,
  GeminiImageRequest,
  GeminiResponse,
  GeminiUsage,
} from "./types";
import { costTracker } from "./cost-tracker";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export const isGeminiConfigured = !!GEMINI_API_KEY;

if (!isGeminiConfigured) {
  console.warn(
    "Gemini API key not found. Running in demo mode. Set VITE_GEMINI_API_KEY in .env"
  );
}

const defaultConfig: GeminiConfig = {
  apiKey: GEMINI_API_KEY,
  model: "gemini-2.0-flash",
  visionModel: "gemini-2.0-flash",
  imageModel: "imagen-3",
};

// --- Core API call ---

async function callGeminiAPI(
  model: string,
  contents: unknown[],
  options: {
    systemInstruction?: string;
    temperature?: number;
    maxOutputTokens?: number;
    responseSchema?: Record<string, unknown>;
  } = {}
): Promise<{ text: string; usage: GeminiUsage }> {
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${defaultConfig.apiKey}`;

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 1.0,
      maxOutputTokens: options.maxOutputTokens ?? 4096,
    },
  };

  if (options.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  if (options.responseSchema) {
    (body.generationConfig as Record<string, unknown>).responseMimeType = "application/json";
    (body.generationConfig as Record<string, unknown>).responseSchema = options.responseSchema;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Gemini API error (${response.status}): ${JSON.stringify(errorData)}`
    );
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  const usageMetadata = data.usageMetadata || {};
  const usage: GeminiUsage = {
    promptTokens: usageMetadata.promptTokenCount || 0,
    completionTokens: usageMetadata.candidatesTokenCount || 0,
    totalTokens: usageMetadata.totalTokenCount || 0,
    estimatedCost: costTracker.estimateCost(
      model,
      usageMetadata.promptTokenCount || 0,
      usageMetadata.candidatesTokenCount || 0
    ),
  };

  costTracker.track("text-generation", model, usage);

  return { text, usage };
}

// --- Text Generation ---

export async function generateText<T = string>(
  request: GeminiTextRequest
): Promise<GeminiResponse<T>> {
  const contents = [
    {
      role: "user",
      parts: [{ text: request.prompt }],
    },
  ];

  const { text, usage } = await callGeminiAPI(defaultConfig.model, contents, {
    systemInstruction: request.systemInstruction,
    temperature: request.temperature,
    maxOutputTokens: request.maxOutputTokens,
    responseSchema: request.responseSchema,
  });

  let parsed: T;
  try {
    parsed = JSON.parse(text) as T;
  } catch {
    parsed = text as unknown as T;
  }

  return { data: parsed, usage };
}

// --- Vision (Image Analysis) ---

export async function analyzeImage<T = string>(
  request: GeminiVisionRequest
): Promise<GeminiResponse<T>> {
  const parts: unknown[] = [];

  // Add images
  for (const img of request.images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    });
  }

  // Add text prompt
  parts.push({ text: request.prompt });

  const contents = [{ role: "user", parts }];

  const { text, usage } = await callGeminiAPI(
    defaultConfig.visionModel,
    contents,
    {
      systemInstruction: request.systemInstruction,
      temperature: request.temperature,
      maxOutputTokens: request.maxOutputTokens,
      responseSchema: request.responseSchema,
    }
  );

  let parsed: T;
  try {
    parsed = JSON.parse(text) as T;
  } catch {
    parsed = text as unknown as T;
  }

  return { data: parsed, usage };
}

// --- Image Generation ---

export async function generateImage(
  request: GeminiImageRequest
): Promise<GeminiResponse<string>> {
  const url = `${GEMINI_BASE_URL}/models/${defaultConfig.imageModel}:predict?key=${defaultConfig.apiKey}`;

  const body = {
    instances: [{ prompt: request.prompt }],
    parameters: {
      sampleCount: request.numberOfImages || 1,
      aspectRatio: "1:1",
      safetyFilterLevel: "block_few",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    // Fallback: use Gemini 2.0 Flash for image generation via generateContent
    return generateImageFallback(request);
  }

  const data = await response.json();
  const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded || "";
  const imageUrl = imageBase64
    ? `data:image/png;base64,${imageBase64}`
    : "";

  const usage: GeminiUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCost: 0.03, // Imagen-3 per image cost
  };

  costTracker.track("image-generation", defaultConfig.imageModel, usage);

  return { data: imageUrl, usage };
}

// Fallback: use Gemini 2.0 Flash with image generation capability
async function generateImageFallback(
  request: GeminiImageRequest
): Promise<GeminiResponse<string>> {
  const url = `${GEMINI_BASE_URL}/models/gemini-2.0-flash-exp:generateContent?key=${defaultConfig.apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: request.prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: Record<string, unknown>) => p.inlineData);
  const imageUrl = imagePart
    ? `data:${(imagePart.inlineData as Record<string, string>).mimeType};base64,${(imagePart.inlineData as Record<string, string>).data}`
    : "";

  const usage: GeminiUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCost: 0.03,
  };

  costTracker.track("image-generation-fallback", "gemini-2.0-flash-exp", usage);

  return { data: imageUrl, usage };
}

// --- Utility: Convert File to base64 ---

export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- Utility: Convert URL to base64 ---

export async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve({ base64, mimeType: blob.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
