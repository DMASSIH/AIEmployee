import type { ToolDefinition } from './provider/types.js';

/**
 * Tool-calling FRAMEWORK (Milestone 10). The runtime can offer tools to a
 * provider and execute the calls it returns — but no business tools are
 * registered yet (that's a later milestone). Tools are org/user-scoped so a
 * future tool can never act outside the caller's tenant.
 */
export interface ToolContext {
  orgId: string;
  userId: string;
}

export type ToolHandler = (args: unknown, ctx: ToolContext) => Promise<unknown>;

export interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();

  register(tool: RegisteredTool): void {
    this.tools.set(tool.definition.name, tool);
  }

  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /** Tool schemas to advertise to the provider (empty until tools are added). */
  definitions(): ToolDefinition[] {
    return [...this.tools.values()].map((t) => t.definition);
  }

  isEmpty(): boolean {
    return this.tools.size === 0;
  }

  async execute(name: string, argumentsJson: string, ctx: ToolContext): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    let args: unknown;
    try {
      args = argumentsJson ? JSON.parse(argumentsJson) : {};
    } catch {
      throw new Error(`Invalid JSON arguments for tool ${name}`);
    }
    return tool.handler(args, ctx);
  }
}

/** The process-wide registry. Intentionally empty in M10 — framework only. */
export const defaultToolRegistry = new ToolRegistry();
