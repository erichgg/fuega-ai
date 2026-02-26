/**
 * AI Provider Factory — Creates and manages AI moderation providers.
 *
 * Strategy: "ollama-first" with automatic fallback to Anthropic.
 *
 * Environment variables:
 * - AI_PROVIDER: "anthropic" | "ollama" | "ollama-fallback" (default: "anthropic")
 *   - "anthropic": Always use Anthropic Claude API
 *   - "ollama": Always use local Ollama (fails if unavailable)
 *   - "ollama-fallback": Try Ollama first, fall back to Anthropic on failure
 * - ANTHROPIC_API_KEY: Required for "anthropic" and "ollama-fallback" modes
 * - OLLAMA_BASE_URL: Ollama server URL (default: http://localhost:11434)
 * - OLLAMA_MODEL: Model to use (default: llama3.1:8b)
 */

import type { AIProvider, AIProviderConfig } from "./types";
import { AnthropicProvider } from "./anthropic.provider";
import { OllamaProvider } from "./ollama.provider";

export type { AIProvider, AIProviderConfig, AIProviderResponse } from "./types";
export { AnthropicProvider } from "./anthropic.provider";
export { OllamaProvider } from "./ollama.provider";

/** Get provider config from environment */
export function getProviderConfig(): AIProviderConfig {
  const provider = (process.env.AI_PROVIDER ?? "anthropic") as AIProviderConfig["provider"];

  return {
    provider: ["anthropic", "ollama"].includes(provider) ? provider : "anthropic",
    apiKey: process.env.ANTHROPIC_API_KEY,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
    ollamaModel: process.env.OLLAMA_MODEL,
  };
}

/** Create an AI provider from config */
export function createProvider(config: AIProviderConfig): AIProvider {
  switch (config.provider) {
    case "ollama":
      return new OllamaProvider({
        baseUrl: config.ollamaBaseUrl,
        model: config.ollamaModel,
        timeoutMs: config.timeoutMs,
      });

    case "anthropic":
    default:
      if (!config.apiKey) {
        throw new Error("ANTHROPIC_API_KEY is required for Anthropic provider");
      }
      return new AnthropicProvider(config.apiKey);
  }
}

/**
 * Create a provider with automatic fallback.
 *
 * If AI_PROVIDER is "ollama-fallback":
 *   1. Check if Ollama is available
 *   2. If yes, use Ollama
 *   3. If no, fall back to Anthropic
 *
 * Otherwise, create the configured provider directly.
 */
export async function createProviderWithFallback(): Promise<{
  provider: AIProvider;
  usingFallback: boolean;
}> {
  const rawProvider = process.env.AI_PROVIDER ?? "anthropic";

  if (rawProvider === "ollama-fallback") {
    // Try Ollama first
    const ollama = new OllamaProvider({
      baseUrl: process.env.OLLAMA_BASE_URL,
      model: process.env.OLLAMA_MODEL,
    });

    const ollamaAvailable = await ollama.isAvailable();

    if (ollamaAvailable) {
      console.log(
        `[ai-provider] Using Ollama (${ollama.model}) at ${process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"}`
      );
      return { provider: ollama, usingFallback: false };
    }

    // Ollama not available — fall back to Anthropic
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Ollama is unavailable and ANTHROPIC_API_KEY is not set. Cannot moderate content."
      );
    }

    console.log(
      `[ai-provider] Ollama unavailable, falling back to Anthropic Claude`
    );
    return { provider: new AnthropicProvider(apiKey), usingFallback: true };
  }

  // Direct provider creation (no fallback)
  const config = getProviderConfig();
  return { provider: createProvider(config), usingFallback: false };
}
