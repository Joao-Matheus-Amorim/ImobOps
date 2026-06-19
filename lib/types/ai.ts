// AI agent types — tool definitions, calls, and actions.
import type { z } from "zod";
import type { Role, FeatureKey, Action } from "./permissions";

// Side-effect class of a tool. Reads run directly; writes require dry-run + confirm.
export type ToolEffect = "read" | "write";

// A tool the LLM can call. Params validated with Zod.
export interface ToolDefinition<TParams = unknown, TResult = unknown> {
  name: string;
  description: string;
  effect: ToolEffect;
  // Feature + action this tool maps to for permission checks.
  feature: FeatureKey;
  action: Action;
  // Zod schema for params.
  schema: z.ZodType<TParams>;
  // Roles allowed to call this tool. MVP: ["admin"] only.
  allowedRoles: Role[];
  // The handler runs with the caller's Supabase session (inherits RLS).
  run: (params: TParams, ctx: ToolContext) => Promise<TResult>;
  // For write tools: produce a human-readable preview for the dry-run step.
  preview?: (params: TParams, ctx: ToolContext) => Promise<string>;
}

// Minimal auth context passed to every tool. The user's RLS is what matters.
export interface ToolContext {
  userId: string;
  tenancyId: string;
  role: Role;
}

// A request from the model to call a tool.
export interface ToolCall {
  id: string;
  name: string;
  params: Record<string, unknown>;
}

// Result of executing (or dry-running) a tool.
export interface ToolResult {
  callId: string;
  toolName: string;
  dryRun: boolean;
  confirmed: boolean;
  ok: boolean;
  preview?: string;
  data?: unknown;
  error?: string;
}

// An action proposed by the assistant, surfaced to the UI.
export interface AiAction {
  toolName: string;
  params: Record<string, unknown>;
  effect: ToolEffect;
  requiresConfirmation: boolean;
  preview?: string;
}

// Chat message shape exchanged with the LLM adapter.
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

// Response from a non-streaming chat call.
export interface ChatResponse {
  content: string;
  toolCalls: ToolCall[];
}
