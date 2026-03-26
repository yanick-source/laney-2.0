/**
 * Background Generator Service
 * Ported from Relivr's theme_style.py
 * 
 * Full AI background generation with decision tree:
 * - Decision node: determines color vs image generation
 * - Image generation node: creates background image via Gemini
 * - Color generation node: creates background color/gradient via Gemini
 * 
 * Theme parameter is preserved but currently unused (dead code for future use).
 */

import {
  generateText,
  generateImage,
  isGeminiConfigured,
} from "@/integrations/gemini/client";
import type {
  BackgroundDetails,
  BackgroundColor,
  BackgroundState,
} from "@/integrations/gemini/types";

// --- Decision Node (same as Relivr's decision_node) ---

async function decisionNode(
  state: BackgroundState
): Promise<{ title: string; is_color_generation: boolean }> {
  // TODO: Future — use theme for decision making
  // Currently uses user_input (which will be derived from photo analysis)
  const prompt = `You are a photo book assistant. Your task is to decide whether to generate a **background image** or a **background color** based on the provided input. Follow these guidelines:

    **Input**:
    - Theme: ${state.theme || "General"}
    - User Input: ${state.user_input}
    
    **Decision Rules**:
    1. If the input suggests a complex, detailed, or visually rich composition, set \`is_color_generation\` to **false** (generate an image).
    2. If the input is minimalistic, abstract, or focused on specific colors, set \`is_color_generation\` to **true** (generate a color).
    3. Always analyze the input before deciding, ensuring the choice aligns with the context.

    **Output**:
    - \`is_color_generation\`: A boolean value (true for color, false for image).
    - \`title\`: Generate a short, 4-8 word title inspired by the input, capturing the essence of the background design with a touch of creativity and randomness.`;

  const response = await generateText<BackgroundDetails>({
    prompt,
    temperature: 1.2,
    responseSchema: {
      type: "object",
      properties: {
        is_color_generation: {
          type: "boolean",
          description:
            "Whether to generate a color (true) or image (false).",
        },
        title: {
          type: "string",
          description:
            "A short 4-8 word title describing the background design.",
        },
      },
      required: ["is_color_generation", "title"],
    },
  });

  return {
    title: response.data.title || "Elegant Background",
    is_color_generation: response.data.is_color_generation ?? true,
  };
}

// --- Image Generation Node (same as Relivr's image_generation_node) ---

async function imageGenerationNode(
  state: BackgroundState
): Promise<string> {
  // Same prompt as Relivr
  const prompt = `Create a seamless, high-quality background image that enhances the ${state.theme || "photo book"} without overpowering its content.
    - **Minimal & Elegant:** Soft gradients and neutral tones.
    - **No Distractions:** Avoid distinct objects, busy patterns, or harsh contrasts.
    - **Subtle Depth:** Use light and shadow to create a smooth, immersive feel.
    - **Balanced Composition:** Add faint design accents on edges to maintain cohesion.
    - **Full-Screen Integration:** Include subtle design elements on the **corners and side panels** for a seamless, polished look.
    - **Versatile & Adaptive:** Must complement various album elements effortlessly.
    - **Context:** ${state.user_input}`;

  const response = await generateImage({ prompt, size: "1024x1024" });
  return response.data;
}

// --- Color Generation Node (same as Relivr's color_generation_node) ---

async function colorGenerationNode(
  state: BackgroundState
): Promise<string> {
  // Same prompt as Relivr
  const prompt = `Generate a creative and visually appealing photo book page background color based on the provided context:

   **Background Color (\`bg_color\`)**:
   - Dynamically generate a \`bg_color\` that aligns with the context: **${state.user_input}**, ensuring a balance between aesthetics and storytelling.
   - Use a mix of **solid colors** and **gradients** to add depth and uniqueness.
   - Randomly explore different gradient styles, including **Radial, Angular, Diamond, Mesh, Shape Blur, Linear, and Freeform Multiple**, selecting the one that best enhances the visual flow of the page.
   - Suggest complementary or contrasting tones to elevate the design, making the background feel immersive and engaging without overpowering the foreground content.
   - If gradients are used, blend colors smoothly with artistic transitions, ensuring a natural and seamless design.
   - Inject high creativity and extreme randomness into the generation process, ensuring each output is unique, unpredictable, and visually diverse.
   - Adapt the color scheme dynamically to fit various lighting conditions, moods, and tones.`;

  // TODO: Future — add theme: ${state.theme} to the prompt

  const response = await generateText<BackgroundColor>({
    prompt,
    temperature: 1.2,
    responseSchema: {
      type: "object",
      properties: {
        bg_color: {
          type: "string",
          description:
            "The background color for the photo book. Can be a solid hex color or a CSS gradient.",
        },
      },
      required: ["bg_color"],
    },
  });

  return response.data.bg_color || "#F5F0EB";
}

// --- Main Background Generation (same flow as Relivr's get_theme_bg_style) ---
// Runs the decision tree and generates two background options in parallel

export interface BackgroundResult {
  bg_color?: string;
  bg_image?: string;
  is_color_generation: boolean;
  title: string;
}

export async function generateBackground(
  photoDescriptions: string,
  theme: string = "" // Preserved for future use — dead code
): Promise<BackgroundResult[]> {
  if (!isGeminiConfigured) {
    // Demo mode: return two color options
    return [
      {
        bg_color: "#F5F0EB",
        is_color_generation: true,
        title: "Warm Neutral Elegance",
      },
      {
        bg_color: "linear-gradient(135deg, #F5F0EB 0%, #E8DDD4 100%)",
        is_color_generation: true,
        title: "Soft Gradient Warmth",
      },
    ];
  }

  const state: BackgroundState = {
    theme: theme || "", // Keep theme parameter for future use
    title: "",
    user_input: photoDescriptions,
    bg_image: "",
    bg_color: "",
    is_color_generation: false,
  };

  // Run two parallel workflows (same as Relivr's asyncio.gather)
  const [result1, result2] = await Promise.all([
    runBackgroundWorkflow(state),
    runBackgroundWorkflow(state),
  ]);

  return [result1, result2];
}

// --- Single workflow execution ---

async function runBackgroundWorkflow(
  state: BackgroundState
): Promise<BackgroundResult> {
  // Step 1: Decision node
  const decision = await decisionNode(state);

  // Step 2: Generate based on decision
  if (decision.is_color_generation) {
    const bgColor = await colorGenerationNode(state);
    return {
      bg_color: bgColor,
      is_color_generation: true,
      title: decision.title,
    };
  } else {
    try {
      const bgImage = await imageGenerationNode(state);
      return {
        bg_image: bgImage,
        is_color_generation: false,
        title: decision.title,
      };
    } catch (err) {
      // Fallback to color if image generation fails
      console.warn("Image generation failed, falling back to color:", err);
      const bgColor = await colorGenerationNode(state);
      return {
        bg_color: bgColor,
        is_color_generation: true,
        title: decision.title,
      };
    }
  }
}

// --- Helper: Pick best background from results ---

export function selectBackground(
  results: BackgroundResult[]
): { type: "solid" | "gradient" | "image"; value: string; secondaryValue?: string } {
  // Prefer image if available
  const imageResult = results.find((r) => r.bg_image);
  if (imageResult?.bg_image) {
    return { type: "image", value: imageResult.bg_image };
  }

  // Use first color result
  const colorResult = results.find((r) => r.bg_color);
  const bgColor = colorResult?.bg_color || "#F5F0EB";

  // Detect if it's a gradient
  if (bgColor.includes("gradient")) {
    return { type: "gradient", value: bgColor };
  }

  return { type: "solid", value: bgColor };
}
