export interface AIModel {
  id: string;
  name: string;
  provider: string;
  openrouterId: string;
  tagline: string;
  description: string;
  traits: string[];
  color: string;
  accentColor: string;
  icon: string;
}

export const AI_MODELS: Record<string, AIModel> = {
  "gemini-flash": {
    id: "gemini-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    openrouterId: "google/gemini-2.5-flash-preview",
    tagline: "Lightning fast. Infinitely aware.",
    description:
      "Google's fastest multimodal model with a 1M-token context window. Built for real-time tasks, document analysis, and high-volume workflows.",
    traits: ["1M token context", "Multimodal", "Sub-second latency", "Web grounding"],
    color: "from-blue-600 to-cyan-500",
    accentColor: "text-cyan-400",
    icon: "⚡",
  },
  "deepseek-v3": {
    id: "deepseek-v3",
    name: "DeepSeek v3.1",
    provider: "DeepSeek",
    openrouterId: "deepseek/deepseek-chat-v3-5",
    tagline: "Logic-first. Code-native.",
    description:
      "DeepSeek's most efficient frontier model, purpose-built for code generation, algorithmic reasoning, and structured problem-solving at a fraction of the cost.",
    traits: ["Code generation", "Chain-of-thought", "Cost-efficient", "Math & logic"],
    color: "from-emerald-600 to-teal-500",
    accentColor: "text-emerald-400",
    icon: "🧠",
  },
  "claude-sonnet": {
    id: "claude-sonnet",
    name: "Claude 4.5 Sonnet",
    provider: "Anthropic",
    openrouterId: "anthropic/claude-sonnet-4-5",
    tagline: "Thoughtful. Nuanced. Reliable.",
    description:
      "Anthropic's balanced powerhouse combining deep reasoning, safety-first design, and exceptional writing quality — ideal for complex analysis and nuanced tasks.",
    traits: ["Advanced reasoning", "Long-form writing", "Safety-aligned", "Instruction following"],
    color: "from-violet-600 to-purple-500",
    accentColor: "text-violet-400",
    icon: "✦",
  },
  "gpt-5": {
    id: "gpt-5",
    name: "GPT-5",
    provider: "OpenAI",
    openrouterId: "openai/gpt-5",
    tagline: "State of the art. Full stop.",
    description:
      "OpenAI's most capable model to date. Unmatched at complex multi-step reasoning, creative synthesis, and agentic tasks across every domain.",
    traits: ["Best-in-class reasoning", "Agentic tasks", "Creative synthesis", "Tool use"],
    color: "from-rose-600 to-orange-500",
    accentColor: "text-rose-400",
    icon: "◆",
  },
};

export const MONTHLY_MESSAGE_LIMIT = 500;
export const SUBSCRIPTION_PRICE_USD = 5.99;
