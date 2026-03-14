export interface AIModel {
  id: string;
  name: string;
  provider: string;
  /** Replicate model identifier: "owner/model-name" */
  replicateId: string;
  /**
   * Input parameter format for the Replicate model.
   * "anthropic" = uses `system` + `max_tokens`
   * "llama"     = uses `system_prompt` + `max_new_tokens` (default)
   */
  inputFormat?: "llama" | "anthropic";
  tagline: string;
  description: string;
  traits: string[];
  color: string;
  accentColor: string;
  icon: string;
}

export const AI_MODELS: Record<string, AIModel> = {
  "claude-sonnet": {
    id: "claude-sonnet",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    replicateId: "anthropic/claude-4.5-sonnet",
    inputFormat: "llama",
    tagline: "Thoughtful. Nuanced. Reliable.",
    description:
      "Anthropic's balanced powerhouse combining deep reasoning, safety-first design, and exceptional writing quality — ideal for complex analysis and nuanced tasks.",
    traits: ["Advanced reasoning", "Long-form writing", "Safety-aligned", "Instruction following"],
    color: "from-violet-600 to-purple-500",
    accentColor: "text-violet-400",
    icon: "✦",
  },
  "deepseek-v3": {
    id: "deepseek-v3",
    name: "DeepSeek v3.1",
    provider: "DeepSeek",
    replicateId: "deepseek-ai/deepseek-v3",
    inputFormat: "llama",
    tagline: "Logic-first. Code-native.",
    description:
      "DeepSeek's most efficient frontier model, purpose-built for code generation, algorithmic reasoning, and structured problem-solving at a fraction of the cost.",
    traits: ["Code generation", "Chain-of-thought", "Cost-efficient", "Math & logic"],
    color: "from-emerald-600 to-teal-500",
    accentColor: "text-emerald-400",
    icon: "🧠",
  },
  "gpt5": {
    id: "gpt5",
    name: "GPT-5",
    provider: "OpenAI",
    replicateId: "openai/gpt-5",
    inputFormat: "llama",
    tagline: "OpenAI's frontier model.",
    description:
      "OpenAI's most capable model — powerful reasoning, coding and analysis.",
    traits: ["Advanced reasoning", "Coding", "Analysis", "State-of-the-art"],
    color: "from-blue-600 to-cyan-500",
    accentColor: "text-cyan-400",
    icon: "⚡",
  },
  "deepseek-r1": {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    replicateId: "deepseek-ai/deepseek-r1",
    inputFormat: "llama",
    tagline: "Reason deeper. Think longer.",
    description:
      "DeepSeek's reasoning-focused model trained with reinforcement learning for step-by-step problem solving. Matches frontier models on math, science, and coding benchmarks.",
    traits: ["Chain-of-thought", "Math & science", "RL-trained", "Deep reasoning"],
    color: "from-rose-600 to-orange-500",
    accentColor: "text-rose-400",
    icon: "◆",
  },
};

export const MONTHLY_MESSAGE_LIMIT = 400;
export const SUBSCRIPTION_PRICE_USD = 5.99;

/** Convert a messages array into a single prompt string for Replicate models. */
export function formatMessagesAsPrompt(
  messages: { role: "user" | "assistant"; content: string }[]
): string {
  return messages
    .map((m) => (m.role === "user" ? `User: ${m.content}` : `Assistant: ${m.content}`))
    .join("\n") + "\nAssistant:";
}
