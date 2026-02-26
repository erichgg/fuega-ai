/**
 * Ollama Provider — Uses a local Ollama instance for moderation.
 *
 * Ollama API: POST /api/chat
 * Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 *
 * Benefits: Free, private, runs locally.
 * Tradeoffs: Slower, less capable than Claude, needs local GPU.
 *
 * Recommended models (in order of capability):
 * - llama3.1:8b  (fast, good for moderation)
 * - mistral:7b   (fast, good reasoning)
 * - gemma2:9b    (good instruction following)
 */

import type { BuiltPrompt } from "../prompt-builder";
import { validateAIResponse } from "../injection-defense";
import type { AIProvider, AIProviderResponse } from "./types";

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.1:8b";
const DEFAULT_TIMEOUT_MS = 15000; // Ollama is slower than cloud APIs

export class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  readonly model: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options?: {
    baseUrl?: string;
    model?: string;
    timeoutMs?: number;
  }) {
    this.baseUrl = (options?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.model = options?.model ?? DEFAULT_MODEL;
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async callModeration(prompt: BuiltPrompt): Promise<AIProviderResponse> {
    // Use Ollama's /api/chat endpoint with system + user messages
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user },
          ],
          stream: false,
          options: {
            temperature: 0,
            num_predict: 200, // equivalent to max_tokens
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        return {
          decision: "flag",
          reason: `Ollama API error (${response.status}): ${errorText.slice(0, 100)}`,
          valid: false,
        };
      }

      const data = (await response.json()) as {
        message?: { content?: string };
        response?: string;
      };

      // Ollama /api/chat returns { message: { content: "..." } }
      const text = data.message?.content ?? data.response ?? "";

      if (!text.trim()) {
        return {
          decision: "flag",
          reason: "Ollama returned empty response — flagged for review",
          valid: false,
        };
      }

      return validateAIResponse(text);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          decision: "flag",
          reason: `Ollama request timed out after ${this.timeoutMs}ms`,
          valid: false,
        };
      }
      throw error; // Re-throw for fallback handling
    } finally {
      clearTimeout(timeout);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(`${this.baseUrl}/api/tags`, {
          signal: controller.signal,
        });
        if (!response.ok) return false;

        // Check if the requested model is available
        const data = (await response.json()) as {
          models?: Array<{ name: string }>;
        };
        const models = data.models ?? [];
        const modelPrefix = this.model.split(":")[0] ?? this.model;
        const hasModel = models.some(
          (m) =>
            m.name === this.model ||
            m.name.startsWith(modelPrefix)
        );
        return hasModel;
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      return false;
    }
  }
}
