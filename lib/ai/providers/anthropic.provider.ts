/**
 * Anthropic Claude Provider — Uses the Anthropic SDK for moderation.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { BuiltPrompt } from "../prompt-builder";
import { validateAIResponse } from "../injection-defense";
import type { AIProvider, AIProviderResponse } from "./types";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 200;

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model: string;
  private client: Anthropic;

  constructor(apiKey: string, model?: string) {
    this.model = model ?? DEFAULT_MODEL;
    this.client = new Anthropic({ apiKey });
  }

  async callModeration(prompt: BuiltPrompt): Promise<AIProviderResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: DEFAULT_MAX_TOKENS,
      temperature: 0,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return {
        decision: "flag",
        reason: "AI returned no text response — flagged for review",
        valid: false,
      };
    }

    return validateAIResponse(textBlock.text);
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Quick model list check — lightweight API call
      await this.client.models.list({ limit: 1 });
      return true;
    } catch {
      return false;
    }
  }
}
