import type { CostEntry, GeminiUsage } from "./types";

// Pricing per 1M tokens (approximate Gemini pricing)
const PRICING = {
  "gemini-2.0-flash": { input: 0.075, output: 0.30 },
  "gemini-2.0-flash-lite": { input: 0.0375, output: 0.15 },
  "gemini-1.5-pro": { input: 1.25, output: 5.00 },
  "imagen-3": { perImage: 0.03 },
} as const;

class CostTracker {
  private entries: CostEntry[] = [];

  track(operation: string, model: string, usage: GeminiUsage): void {
    this.entries.push({
      operation,
      model,
      tokens: usage.totalTokens,
      cost: usage.estimatedCost,
      timestamp: Date.now(),
    });
  }

  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    const pricing = PRICING[model as keyof typeof PRICING];
    if (!pricing) return 0;

    if ("perImage" in pricing) {
      return pricing.perImage;
    }

    return (
      (promptTokens / 1_000_000) * pricing.input +
      (completionTokens / 1_000_000) * pricing.output
    );
  }

  getTotalCost(): number {
    return this.entries.reduce((sum, e) => sum + e.cost, 0);
  }

  getTotalTokens(): number {
    return this.entries.reduce((sum, e) => sum + e.tokens, 0);
  }

  getTotalRequests(): number {
    return this.entries.length;
  }

  getSummary(): { totalRequests: number; totalCost: number; totalTokens: number } {
    return {
      totalRequests: this.getTotalRequests(),
      totalCost: this.getTotalCost(),
      totalTokens: this.getTotalTokens(),
    };
  }

  reset(): void {
    this.entries = [];
  }
}

export const costTracker = new CostTracker();
