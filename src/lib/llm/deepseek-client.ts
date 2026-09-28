// ============================================================
// DeepSeek API 客户端封装
// 使用 OpenAI SDK（DeepSeek 兼容 OpenAI 格式）
// ============================================================

import OpenAI from 'openai';
import type { LLMMessage, ChatCompletionResponse, FunctionDefinition } from './types';

export class DeepSeekClient {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'deepseek-chat') {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com/v1',
    });
    this.model = model;
  }

  /**
   * 非流式对话
   */
  async chat(
    messages: LLMMessage[],
    options?: {
      tools?: FunctionDefinition[];
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<ChatCompletionResponse> {
    try {
      // 构建符合 OpenAI SDK 类型的消息数组
      const apiMessages = messages.map(m => {
        if (m.role === 'system') {
          return { role: 'system' as const, content: m.content };
        } else if (m.role === 'user') {
          return { role: 'user' as const, content: m.content };
        } else if (m.role === 'assistant') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const msg: any = { role: 'assistant' as const, content: m.content };
          if (m.tool_calls) {
            msg.tool_calls = m.tool_calls;
          }
          return msg;
        } else if (m.role === 'tool') {
          return {
            role: 'tool' as const,
            content: m.content,
            tool_call_id: m.tool_call_id!,
          };
        }
        return { role: 'user' as const, content: m.content };
      });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: apiMessages,
        ...(options?.tools && { tools: options.tools }),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 2000,
      });

      const choice = response.choices[0];
      const message = choice.message;

      return {
        message: message.content ?? '',
        toolCalls: message.tool_calls?.filter(tc => tc.type === 'function').map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
        usage: {
          prompt_tokens: response.usage?.prompt_tokens ?? 0,
          completion_tokens: response.usage?.completion_tokens ?? 0,
          total_tokens: response.usage?.total_tokens ?? 0,
        },
      };
    } catch (error) {
      console.error('DeepSeek API 调用失败:', error);
      throw new Error(`LLM 调用失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 流式对话（未来扩展用，暂不实现）
   */
  async *chatStream(
    messages: LLMMessage[],
    options?: {
      tools?: FunctionDefinition[];
      temperature?: number;
    }
  ): AsyncGenerator<string> {
    try {
      const apiMessages = messages.map(m => {
        if (m.role === 'tool') {
          return { role: 'tool' as const, content: m.content, tool_call_id: m.tool_call_id! };
        }
        return { role: m.role as 'system' | 'user' | 'assistant', content: m.content };
      });

      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: apiMessages,
        ...(options?.tools && { tools: options.tools }),
        temperature: options?.temperature ?? 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('DeepSeek 流式调用失败:', error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.chat([{ role: 'user', content: 'ping' }], { max_tokens: 10 });
      return true;
    } catch {
      return false;
    }
  }
}

// 单例实例（可选，方便复用）
let clientInstance: DeepSeekClient | null = null;

export function getDeepSeekClient(): DeepSeekClient {
  if (!clientInstance) {
    const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('未配置 DEEPSEEK_API_KEY，请检查 .env.local 文件');
    }
    clientInstance = new DeepSeekClient(apiKey);
  }
  return clientInstance;
}
