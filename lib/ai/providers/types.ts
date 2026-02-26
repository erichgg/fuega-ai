/**
 * AI Provider Interface — Abstraction for moderation AI backends.
 * Supports Anthropic Claude API and local Ollama instances.
 */

import type { BuiltPrompt } from "../prompt-builder";

/** Raw AI moderation response (before validation) */
export interface AIProviderResponse {
  decision: "approve" | "remove" | "flag";
  reason: string;
  valid: boolean;
}

/** Provider configuration */
export interface AIProviderConfig {
  provider: "anthropic" | "ollama";
  /** For Anthropic: API key. For Ollama: not needed */
  apiKey?: string;
  /** Ollama base URL (default: http://localhost:11434) */
  ollamaBaseUrl?: string;
  /** Ollama model name (default: llama3.1:8b) */
  ollamaModel?: string;
  /** Request timeout in ms */
  timeoutMs?: number;
}

/** AI Provider interface */
export interface AIProvider {
  readonly name: string;
  readonly model: string;
  callModeration(prompt: BuiltPrompt): Promise<AIProviderResponse>;
  /** Health check — can the provider respond? */
  isAvailable(): Promise<boolean>;
}
