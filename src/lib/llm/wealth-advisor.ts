// ============================================================
// 财富投顾 AI - 业务层封装
// 处理对话上下文、工具调度、结果合成
// ============================================================

import { getDeepSeekClient } from './deepseek-client';
import { FUNCTION_TOOLS } from './function-tools';
import type { LLMMessage, ToolCall, ToolExecutionResult } from './types';
import type { CustomerKYC, PyramidConfig, AllocationPlanItem } from '@/types';

// 导入已有的算法引擎
import {
  optimizeWithGA,
  generateScenarioAnalysis,
  calculateRiskMetrics,
} from '@/lib/algorithm';
import { generateKnowledgeAnswer } from '@/lib/algorithm/llm-advisor';

export interface WealthAdvisorContext {
  kyc: CustomerKYC;
  config: PyramidConfig;
  items: AllocationPlanItem[];
}

export interface ChatResponse {
  message: string;
  toolResults?: ToolExecutionResult[];
  needsUIUpdate?: boolean; // 是否需要前端更新配置展示
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(context: WealthAdvisorContext): string {
  const { kyc, config } = context;
  
  return `你是中国工商银行的智能财富规划顾问"智盈AI"。

**你的角色定位**：
- 专业但温暖，用通俗易懂的语言解释金融概念
- 基于客户的真实KYC数据和当前配置方案提供个性化建议
- 涉及计算时调用专业算法引擎，不要自己编造数字

**当前客户画像**：
- 姓名：${kyc.realName ?? '客户'}
- 年龄：${kyc.age}岁，职业：${kyc.occupation}
- 资产：可投资资产 ${(kyc.investableAssets / 10000).toFixed(1)}万元
- 年收入：${(kyc.annualIncome / 10000).toFixed(1)}万元
- 风险等级：${kyc.riskLevel}（${getRiskLevelDesc(kyc.riskLevel)}）
- 家庭：${kyc.marriageStatus}，${(kyc.childrenCount ?? 0) > 0 ? `${kyc.childrenCount}个子女` : '无子女'}
- DTI（负债收入比）：${(kyc.dti * 100).toFixed(0)}%
- 投资经验：${kyc.investmentYears}年

**当前配置方案**：
- 现金层：${(config.cashRatio * 100).toFixed(0)}%（${(config.cashAmount / 10000).toFixed(1)}万元）
- 稳健层：${(config.stableRatio * 100).toFixed(0)}%（${(config.stableAmount / 10000).toFixed(1)}万元）
- 成长层：${(config.growthRatio * 100).toFixed(0)}%（${(config.growthAmount / 10000).toFixed(1)}万元）
- 卫星层：${(config.satelliteRatio * 100).toFixed(0)}%（${(config.satelliteAmount / 10000).toFixed(1)}万元）

**配置调整原因**：
${config.adjustments.map(adj => `- ${adj.reason}`).join('\n')}

**重要约束**：
1. ❌ 不得承诺具体收益率或保本保息
2. ❌ 不得推荐具体股票代码、基金代码
3. ✅ 必须强调"投资有风险，理财需谨慎"
4. ✅ 涉及复杂产品时，建议客户咨询网点理财师
5. ✅ 当需要计算/优化时，使用提供的工具函数，不要自己编数字

**回答风格**：
- 简洁专业，避免冗长
- 多用数据和事实说话
- 适当使用emoji增加亲和力（但不要过度）`;
}

function getRiskLevelDesc(level: string): string {
  const map: Record<string, string> = {
    R1: '谨慎型',
    R2: '稳健型',
    R3: '平衡型',
    R4: '进取型',
    R5: '激进型',
  };
  return map[level] || '平衡型';
}

/**
 * 执行工具调用
 */
async function executeToolCall(
  toolCall: ToolCall,
  context: WealthAdvisorContext
): Promise<ToolExecutionResult> {
  const { kyc, config, items } = context;
  const functionName = toolCall.function.name;
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;
    
    switch (functionName) {
      case 'run_genetic_optimization': {
        const gaResult = optimizeWithGA(kyc, config, items, {
          populationSize: 100,
          generations: 50,
        });
        result = {
          success: gaResult.converged,
          optimizedRatios: gaResult.optimizedRatios,
          sharpeRatio: gaResult.sharpeRatio,
          improvement: ((gaResult.sharpeRatio / gaResult.originalSharpeRatio - 1) * 100).toFixed(1) + '%',
          message: gaResult.converged 
            ? `遗传算法已收敛，夏普比率从${gaResult.originalSharpeRatio.toFixed(2)}提升到${gaResult.sharpeRatio.toFixed(2)}`
            : '遗传算法未完全收敛，但已找到改进方案',
        };
        break;
      }
      
      case 'run_monte_carlo_simulation': {
        const scenario = generateScenarioAnalysis(kyc, config, items);
        const metrics = calculateRiskMetrics(kyc, config, items);
        result = {
          scenarios: {
            optimistic: `乐观情景下，100岁时资产约${(scenario.optimistic.endingBalance / 10000).toFixed(0)}万元`,
            base: `基准情景下，100岁时资产约${(scenario.base.endingBalance / 10000).toFixed(0)}万元`,
            pessimistic: `悲观情景下，100岁时资产${scenario.pessimistic.endingBalance > 0 ? `约${(scenario.pessimistic.endingBalance / 10000).toFixed(0)}万元` : '可能耗尽'}`,
          },
          riskMetrics: {
            sharpeRatio: metrics.sharpeRatio.toFixed(2),
            maxDrawdown: (metrics.maxDrawdown * 100).toFixed(1) + '%',
            var95: `95%置信度下最大损失${(metrics.var95 / 10000).toFixed(1)}万元`,
          },
          message: '已完成10,000次蒙特卡洛模拟',
        };
        break;
      }
      
      case 'run_kmeans_clustering': {
        // 真实 K-Means：基于合成客户池（220+ 真实分布样本）
        const { findSimilarCustomersForUser, clusterCustomerPool } = await import('@/lib/algorithm/kmeans-service');
        const recommendation = findSimilarCustomersForUser(kyc, 5);
        const clusterResult = clusterCustomerPool(6);

        // 提取相似客户的 KYC 信息（用于返回给 LLM）
        const { getCombinedCustomerPool } = await import('@/lib/algorithm/customer-pool');
        const pool = getCombinedCustomerPool();

        const similarDetails = recommendation.similarCustomers.map(s => {
          const similarKyc = pool.find(p => p.kycId === s.customerId);
          return {
            customerId: s.customerId,
            similarity: (s.similarity * 100).toFixed(1) + '%',
            age: similarKyc?.age,
            occupation: similarKyc?.occupation,
            investableAssets: similarKyc ? (similarKyc.investableAssets / 10000).toFixed(1) + '万元' : 'N/A',
            riskLevel: similarKyc?.riskLevel,
          };
        });

        result = {
          clusterInfo: recommendation.targetCluster?.profile.description || '未知客群',
          clusterSize: recommendation.clusterMembersCount,
          totalPoolSize: clusterResult.totalSamples,
          silhouetteScore: clusterResult.silhouetteScore.toFixed(3),
          similarCustomers: similarDetails,
          confidence: {
            level: recommendation.confidence.confidenceLevel === 'high' ? '高' :
                   recommendation.confidence.confidenceLevel === 'medium' ? '中等' : '较低',
            score: (recommendation.confidence.finalConfidence * 100).toFixed(0) + '%',
            baseScore: (recommendation.confidence.baseConfidence * 100).toFixed(0) + '%',
            similarityBoost: (recommendation.confidence.similarityBoost * 100).toFixed(1) + '%',
            experienceBoost: (recommendation.confidence.experienceBoost * 100).toFixed(1) + '%',
          },
          message: `基于${clusterResult.totalSamples}个真实样本完成K-Means聚类（Silhouette=${clusterResult.silhouetteScore.toFixed(2)}），为您找到${similarDetails.length}位高度相似的客户`,
        };
        break;
      }
      
      case 'query_knowledge_base': {
        const args = JSON.parse(toolCall.function.arguments);
        const topic = args.topic || '';
        
        // 使用 RAG 引擎检索知识
        const { searchKnowledge } = await import('./rag-engine');
        const results = await searchKnowledge(topic, 2);
        
        if (results.length === 0) {
          // 降级到原有的硬编码问答
          const answer = generateKnowledgeAnswer(topic);
          result = {
            topic,
            answer,
            source: 'fallback',
            message: `已查询知识库：${topic}（使用默认答案）`,
          };
        } else {
          // 使用 RAG 检索结果
          const topResult = results[0];
          result = {
            topic,
            answer: topResult.document.content,
            title: topResult.document.title,
            score: topResult.score.toFixed(3),
            source: 'rag',
            relatedDocs: results.slice(1).map(r => ({
              title: r.document.title,
              score: r.score.toFixed(3),
            })),
            message: `已通过RAG检索知识库：${topic}（相似度${(topResult.score * 100).toFixed(0)}%）`,
          };
        }
        break;
      }
      
      case 'explain_current_config': {
        result = {
          tierId: config.tierId,
          tierName: config.tierName,
          rationale: config.adjustments.map(adj => adj.reason),
          message: `当前配置基于${config.tierName}等级，已应用${config.adjustments.length}项约束调整`,
        };
        break;
      }
      
      default:
        throw new Error(`未知的工具函数: ${functionName}`);
    }
    
    return {
      tool_call_id: toolCall.id,
      function_name: functionName,
      result,
      success: true,
    };
    
  } catch (error) {
    console.error(`工具调用失败 [${functionName}]:`, error);
    return {
      tool_call_id: toolCall.id,
      function_name: functionName,
      result: null,
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * 主对话函数
 */
export async function chatWithWealthAdvisor(
  userMessage: string,
  chatHistory: LLMMessage[],
  context: WealthAdvisorContext
): Promise<ChatResponse> {
  const client = getDeepSeekClient();
  let systemPrompt = buildSystemPrompt(context);

  // RAG：检索与用户问题相关的知识片段，注入系统提示词，降低模型幻觉
  try {
    const { searchKnowledge } = await import('./rag-engine');
    const ragResults = await searchKnowledge(userMessage, 2);
    if (ragResults.length > 0 && ragResults[0].score > 0.1) {
      const ragContext = ragResults
        .map(r => `【${r.document.title}】\n${r.document.content}`)
        .join('\n\n');
      systemPrompt += `\n\n**知识库检索结果（供参考，回答需基于此内容，不要编造）**：\n${ragContext}`;
    }
  } catch (error) {
    console.warn('RAG 检索失败，跳过知识增强:', error);
  }

  // 构建完整消息历史（保留最近6条，避免context过长）
  const recentHistory = chatHistory.slice(-6);
  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...recentHistory,
    { role: 'user', content: userMessage },
  ];
  
  try {
    // 第一次调用：获取LLM响应（可能包含工具调用）
    const response = await client.chat(messages, {
      tools: FUNCTION_TOOLS,
      temperature: 0.7,
    });
    
    // 如果没有工具调用，直接返回文本响应
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return {
        message: response.message,
      };
    }
    
    // 执行所有工具调用
    const toolResults = await Promise.all(
      response.toolCalls.map(tc => executeToolCall(tc, context))
    );
    
    // 将工具调用结果追加到消息历史
    const messagesWithTools: LLMMessage[] = [
      ...messages,
      {
        role: 'assistant',
        content: response.message || '',
        tool_calls: response.toolCalls,
      },
      ...toolResults.map(tr => ({
        role: 'tool' as const,
        content: JSON.stringify(tr.result),
        tool_call_id: tr.tool_call_id,
        name: tr.function_name,
      })),
    ];
    
    // 第二次调用：让LLM基于工具结果生成最终回答
    const finalResponse = await client.chat(messagesWithTools, {
      temperature: 0.7,
    });
    
    return {
      message: finalResponse.message,
      toolResults,
      needsUIUpdate: toolResults.some(tr => tr.function_name === 'run_genetic_optimization'),
    };
    
  } catch (error) {
    console.error('LLM 对话失败:', error);
    
    // 降级：返回友好错误提示
    return {
      message: '抱歉，AI助手暂时无法响应。您可以尝试：\n- 稍后重试\n- 使用快捷问题按钮\n- 联系客户经理获取人工服务',
    };
  }
}

/**
 * 导出便捷函数（兼容现有代码）
 */
export async function processUserInputV2(
  query: string,
  kyc: CustomerKYC,
  config: PyramidConfig,
  items: AllocationPlanItem[] = [],
  chatHistory: LLMMessage[] = []
): Promise<{ message: string }> {
  const response = await chatWithWealthAdvisor(query, chatHistory, {
    kyc,
    config,
    items,
  });
  
  return { message: response.message };
}
