// Provider abstraction (never import a concrete provider outside this package)
export {
  createAIProvider,
  EchoProvider,
  OpenAIProvider,
  AIProviderError,
  type AIProvider,
  type AIProviderConfig,
  type ChatRequest,
  type ChatResult,
  type ChatStreamEvent,
  type ProviderMessage,
  type ToolCall,
  type ToolDefinition,
  type TokenUsage,
  type ModelInfo,
} from './provider/index.js';

// Tool-calling framework (no business tools registered in M10)
export {
  ToolRegistry,
  defaultToolRegistry,
  type ToolContext,
  type ToolHandler,
  type RegisteredTool,
} from './tools.js';

// Pricing / cost estimation
export { estimateCostUsd } from './pricing.js';

// Runtime orchestrator
export {
  runAssistant,
  assembleSystemPrompt,
  trimHistory,
  type RuntimeParams,
  type RuntimeEmployee,
  type RuntimeEvent,
  type RuntimeMemoryOptions,
  type MemoryPromptBlock,
} from './runtime.js';
