// ============================================================
// Function Calling 工具定义
// 让 LLM 可以调用已有的算法引擎
// ============================================================

import type { FunctionDefinition } from './types';

export const FUNCTION_TOOLS: FunctionDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'run_genetic_optimization',
      description: '当用户想要优化资产配置比例、提升夏普比率、寻找更优配置方案时调用此函数。会运行遗传算法找到最优的现金层/稳健层/成长层/卫星层配比。',
      parameters: {
        type: 'object',
        properties: {
          adjustment_direction: {
            type: 'string',
            enum: ['more_conservative', 'more_aggressive', 'balanced'],
            description: '用户期望的调整方向：more_conservative（更保守）、more_aggressive（更激进）、balanced（保持平衡）',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_monte_carlo_simulation',
      description: '当用户想知道退休后资产能否撑到多少岁、方案是否稳健、有多大概率成功时调用。会运行10,000次蒙特卡洛模拟评估风险。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_kmeans_clustering',
      description: '当用户想了解自己属于哪类客户群体、或想看看相似客户的配置情况时调用。会运行K-Means聚类分析找到相似客群。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_knowledge_base',
      description: '当用户询问金融概念、术语、规则时调用。可查询的主题包括：DTI（负债收入比）、金字塔配置模型、夏普比率、安全提取率、适当性原则等。',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['DTI', '金字塔', '夏普比率', '安全提取率', '适当性'],
            description: '要查询的知识主题',
          },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'explain_current_config',
      description: '当用户问"为什么这样配置"、"为什么现金层是XX%"等问题时调用。会解释当前配置方案的逻辑依据。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];

/**
 * 获取指定工具的定义
 */
export function getToolDefinition(toolName: string): FunctionDefinition | undefined {
  return FUNCTION_TOOLS.find(t => t.function.name === toolName);
}

/**
 * 获取所有工具名称列表
 */
export function getAllToolNames(): string[] {
  return FUNCTION_TOOLS.map(t => t.function.name);
}
