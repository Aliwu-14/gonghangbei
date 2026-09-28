// ============================================================
// LLM 相关类型定义
// ============================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionResponse {
  message: string;
  toolCalls?: ToolCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface FunctionDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ToolExecutionResult {
  tool_call_id: string;
  function_name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
  success: boolean;
  error?: string;
}
