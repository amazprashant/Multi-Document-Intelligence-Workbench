import type { Config } from "../config.js";
import type { LlmProvider } from "../types.js";
import { AnthropicProvider } from "./anthropic.js";
import { MockProvider } from "./mock.js";

export function createProvider(cfg: Pick<Config, "llmProvider" | "anthropicApiKey" | "anthropicModel">): LlmProvider {
  if (cfg.llmProvider === "anthropic") {
    if (!cfg.anthropicApiKey) throw new Error("LLM_PROVIDER=anthropic requires ANTHROPIC_API_KEY");
    return new AnthropicProvider(cfg.anthropicApiKey, cfg.anthropicModel);
  }
  return new MockProvider();
}
