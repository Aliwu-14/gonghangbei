// ============================================================
// LLM对话式智能投顾引擎
// 用户可以用自然语言描述财务目标，系统自动解析为量化参数
// 同时以通俗语言解释专业配置逻辑
// ============================================================

import type { CustomerKYC, PyramidConfig, TierResult } from '@/types';

// ── LLM配置 ──────────────────────────────────────────────────
export interface LLMConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// ── 意图类型 ─────────────────────────────────────────────────
export type IntentType =
  | 'PLANNING'        // 规划类：想退休/想买房子等
  | 'KNOWLEDGE'       // 知识类：问什么是DTI等
  | 'ADJUSTMENT'      // 调整类：想要更激进/保守等
  | 'EXPLANATION'     // 解释类：为什么这样配置等
  | 'CHITCHAT'        // 闲聊类
  | 'UNKNOWN';        // 未知

export interface IntentResult {
  type: IntentType;
  entities: Record<string, unknown>;
  confidence: number;
  originalQuery: string;
}

// ── 参数提取结果 ─────────────────────────────────────────────
export interface ExtractedParams {
  retirementAge?: number;
  monthlyTarget?: number;
  goal?: string;
  timeline?: number;
  riskPreference?: 'conservative' | 'moderate' | 'aggressive';
  adjustmentDirection?: 'more_aggressive' | 'more_conservative';
  queryTopic?: string;
}

// ── 解释生成请求 ─────────────────────────────────────────────
export interface ExplanationRequest {
  config: PyramidConfig;
  tierResult: TierResult;
  cashFlowResult?: {
    assetsAtRetirement: number;
    pensionMonthly: number;
    monthlyGap: number;
    monthlyDCAForPensionGap: number;
    retirementAge: number;
    perpetual: boolean;
  };
  kyc: CustomerKYC;
  userQuestion?: string;
}

// ── 对话消息 ─────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

// ── 预设的系统提示词 ─────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SYSTEM_PROMPT = `你是工商银行智能投顾"智盈"的AI助手。你的职责是：
1. 用通俗易懂的语言解释专业的金融概念
2. 根据用户的自然语言描述，提取他们的财务目标和需求
3. 用生活化的比喻帮助用户理解资产配置逻辑
4. 始终提醒用户"投资有风险，决策需谨慎"

禁止事项：
- 不得承诺任何收益
- 不得进行虚假或误导性陈述
- 不得获取用户的敏感个人信息（银行卡号、密码等）

你的回复应该：
- 简洁明了，避免过度使用专业术语
- 充满同理心，理解用户的财务焦虑
- 积极正面，帮助用户建立理性的理财观念`;

// ── 意图识别 ─────────────────────────────────────────────────
/**
 * 简单的规则-based意图识别
 * 实际项目中应接入LLM API进行意图分类
 */
export function classifyIntent(query: string): IntentResult {
  const lowerQuery = query.toLowerCase();

  // 规划类关键词
  const planningKeywords = ['退休', '买房', '买房子', '子女教育', '储蓄', '投资', '养老', '想买', '计划', '目标', '攒钱', '存款', '理财'];
  const isPlanning = planningKeywords.some(k => lowerQuery.includes(k));

  // 知识类关键词
  const knowledgeKeywords = ['什么是', '解释', '什么意思', '为什么', '怎么', 'dti', '夏普比率', '金字塔', '金字塔模型', '配置'];
  const isKnowledge = knowledgeKeywords.some(k => lowerQuery.includes(k));

  // 调整类关键词
  const adjustmentKeywords = ['太保守', '太激进', '调整', '改变', '激进一点', '保守一点', '高一点', '低一点', '能不能'];
  const isAdjustment = adjustmentKeywords.some(k => lowerQuery.includes(k));

  // 解释类关键词
  const explanationKeywords = ['为什么', '为什么这样', '为什么是', '为什么配置', '原因', '依据', '道理'];
  const isExplanation = explanationKeywords.some(k => lowerQuery.includes(k));

  // 闲聊类关键词
  const chitchatKeywords = ['你好', 'hi', 'hello', '谢谢', '好的', '明白', '了解', '嗯', '哦'];
  const isChitchat = chitchatKeywords.some(k => lowerQuery.includes(k));

  let type: IntentType = 'UNKNOWN';
  let confidence = 0.5;

  if (isPlanning) {
    type = 'PLANNING';
    confidence = 0.85;
  } else if (isKnowledge) {
    type = 'KNOWLEDGE';
    confidence = 0.80;
  } else if (isAdjustment) {
    type = 'ADJUSTMENT';
    confidence = 0.80;
  } else if (isExplanation) {
    type = 'EXPLANATION';
    confidence = 0.85;
  } else if (isChitchat) {
    type = 'CHITCHAT';
    confidence = 0.90;
  }

  return {
    type,
    entities: {},
    confidence,
    originalQuery: query,
  };
}

// ── 参数提取 ──────────────────────────────────────────────────
/**
 * 从用户查询中提取量化参数
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function extractParams(query: string, intent: IntentResult): ExtractedParams {
  const params: ExtractedParams = {};

  // 提取退休年龄
  const retirementMatch = query.match(/(\d{2})岁退休|退休.*?(\d{2})岁|退休年龄(\d{2})/);
  if (retirementMatch) {
    params.retirementAge = parseInt(retirementMatch[1] || retirementMatch[2] || retirementMatch[3]);
  }

  // 提取目标金额
  const amountMatch = query.match(/(?:每月|每个月|每月有)(\d+)(?:万|千|块)?/);
  if (amountMatch) {
    const amount = parseInt(amountMatch[1]);
    // 根据上下文判断单位
    if (query.includes('万')) {
      params.monthlyTarget = amount * 10000;
    } else {
      params.monthlyTarget = amount * 1000;
    }
  }

  // 提取具体目标
  const goalPatterns = [
    /想买(.*?)(?:，|$)/,
    /买(.*?)(?:房子|房)/,
    /为了(.*?)(?:，|$)/,
  ];
  for (const pattern of goalPatterns) {
    const match = query.match(pattern);
    if (match) {
      params.goal = match[1];
      break;
    }
  }

  // 提取时间线
  const timelineMatch = query.match(/(?:(\d+)年|(\d+)年内)/);
  if (timelineMatch) {
    params.timeline = parseInt(timelineMatch[1] || timelineMatch[2]);
  }

  // 提取风险偏好
  if (query.includes('保守') || query.includes('稳健') || query.includes('安全')) {
    params.riskPreference = 'conservative';
  } else if (query.includes('激进') || query.includes('进取') || query.includes('高风险')) {
    params.riskPreference = 'aggressive';
  } else if (query.includes('平衡') || query.includes('中等')) {
    params.riskPreference = 'moderate';
  }

  // 提取调整方向
  if (query.includes('太保守') || query.includes('激进一点') || query.includes('更激进')) {
    params.adjustmentDirection = 'more_aggressive';
  } else if (query.includes('太激进') || query.includes('保守一点') || query.includes('更保守')) {
    params.adjustmentDirection = 'more_conservative';
  }

  // 提取查询主题
  if (query.includes('DTI') || query.includes('负债收入比')) {
    params.queryTopic = 'DTI';
  } else if (query.includes('金字塔')) {
    params.queryTopic = 'pyramid';
  } else if (query.includes('夏普')) {
    params.queryTopic = 'sharpe';
  }

  return params;
}

// ── 知识问答库 ────────────────────────────────────────────────
const KNOWLEDGE_QA: Record<string, string> = {
  'DTI': `DTI是"负债收入比"（Debt-to-Income Ratio）的缩写。
  
简单来说，就是你的月收入中，有多少是用来还债的。
  
举个例子：如果你每月工资1万元，每月还房贷5000元，那么你的DTI就是50%。
  
为什么DTI重要？
- DTI过高意味着每月还债压力大，万一遇到意外可能周转不灵
- 银行也会看DTI来决定是否批准贷款
- 一般建议DTI不要超过40%，否则还款压力过大
  
在我们的规划中，如果你的DTI超过30%，系统会自动建议提高现金层比例，为你留出更多"安全垫"。`,

  '金字塔': `金字塔资产配置模型是一种经典的理财方法，简单说就是把我们的钱分成几层：

🌰 **现金层（安全垫）**：就像家里的米缸，随时可以取用，应对突发情况。一般建议留3-6个月的生活费。

📈 **稳健层（压舱石）**：这是家庭财务的"压舱石"，追求稳健增值，比如债券基金、银行理财等，用来对抗通货膨胀。

🌱 **成长层（增值主力）**：追求长期资本增值的"发动机"，比如混合基金、指数基金等，让你分享经济增长的红利。

🌟 **卫星层（探索收益）**：小比例博取更高回报的尝试，比如黄金、QDII海外基金等，"鸡蛋不能放在一个篮子里"。

为什么要分层？
- 风险分散：不会"一荣俱荣，一损俱损"
- 流动性管理：急用钱时有"安全垫"
- 收益优化：在可控风险下追求更好回报`,

  '夏普比率': `夏普比率（Sharpe Ratio）是衡量"性价比"的指标。

简单说就是：你每承担一份风险，能获得多少额外回报。

📊 **计算公式**：
夏普比率 = (投资收益 - 无风险收益) ÷ 投资收益波动率

🎯 **怎么看**：
- 夏普比率 > 1：很好！风险调整后的收益不错
- 夏普比率 0.5-1：还行，风险收益比较平衡
- 夏普比率 < 0.5：较差，可能承担了太多风险

举个例子：
- A基金：年收益10%，波动15% → 夏普比率 = (10%-2.5%)/15% = 0.5
- B基金：年收益8%，波动3% → 夏普比率 = (8%-2.5%)/3% = 1.83

B基金虽然收益低，但"性价比"更高！`,

  '安全提取率': `安全提取率（Safe Withdrawal Rate）是指你在退休后，每年可以从资产中提取多少而不会耗尽。

📈 **经典的"4%规则"**：
如果你退休时攒了100万，第一年可以提取4万（即4%），之后每年根据通胀调整，理论上可以支撑30年甚至更久。

但这个比例因人而异：
- 年轻人或想留遗产的人：3%-3.5%
- 普通退休者：4%
- 身体健康、不介意花光的人：4.5%-5%

我们的系统会根据你的配置方案（股票、债券比例不同），动态调整安全提取率：
- 股票比例高 → 可以稍微大胆一点，提取率高一点
- 股票比例低 → 需要保守一点，提取率低一点`,

  '适当性': `"适当性"就是"合适"的意思。

金融产品适当性是指：
**把合适的产品，卖给合适的客户。**

就像买鞋：
- 小脚不能穿大鞋（风险等级要匹配）
- 走路不能穿高跟鞋（用途要匹配）
- 老人不能穿太潮的（年龄要匹配）

《金融机构产品适当性管理办法》规定：
- 银行必须了解你的风险承受能力
- 银行必须了解产品的风险特征
- 银行必须确保"产品风险 ≤ 客户风险承受能力"

这就是为什么我们要做KYC（了解你的客户）问卷——不是为难你，而是保护你！`,
};

// ── 生成知识问答 ──────────────────────────────────────────────
export function generateKnowledgeAnswer(topic: string): string {
  const answer = KNOWLEDGE_QA[topic];
  if (answer) {
    return answer;
  }

  return `抱歉，我暂时没有关于"${topic}"的详细解释。

你可以尝试问：
- 什么是DTI？
- 什么是金字塔配置？
- 什么是夏普比率？
- 什么是安全提取率？

或者你也可以咨询网点工作人员，他们会给你更详细的解答。

记住：了解金融知识是理财的第一步！`;
}

// ── 生成配置解释 ─────────────────────────────────────────────
/**
 * 生成用户友好的配置方案解释
 */
export function generateConfigExplanation(request: ExplanationRequest): string {
  const { config, tierResult, kyc } = request;

  // 计算各层金额
  const cashAmt = config.cashAmount;
  const stableAmt = config.stableAmount;
  const growthAmt = config.growthAmount;
  const satelliteAmt = config.satelliteAmount;

  // 生成金字塔可视化描述
  let explanation = `根据您的情况（${kyc.age}岁、可投资资产${(kyc.investableAssets / 10000).toFixed(0)}万、距退休还有${kyc.yearsToRetirement ?? 0}年），`;

  // 添加特殊调整说明
  if (kyc.dti >= 0.30) {
    explanation += `考虑到您的负债压力（DTI ${(kyc.dti * 100).toFixed(0)}%），`;
  }
  if (kyc.age >= 65) {
    explanation += `根据适当性要求，我们为65岁以上客户特别调整了配置，`;
  }

  explanation += `系统为您规划了这样的方案：

💰 **现金层（安全垫）**：¥${cashAmt.toLocaleString()}
这部分钱就像家里的"备用金"，随时可取，应对突发情况。一般建议留3-6个月生活费，您这里配置了¥${(cashAmt / 10000).toFixed(1)}万。

📈 **稳健层（压舱石）**：¥${stableAmt.toLocaleString()}
这是家庭财务的"压舱石"，追求稳健增值。它能帮助您的钱跑赢通货膨胀，不至于"越存越穷"。

🌱 **成长层（增值主力）**：¥${growthAmt.toLocaleString()}
这部分钱追求长期资本增值，是您财富增长的主要发动机。时间是它最好的朋友。

🌟 **卫星层（探索收益）**：¥${satelliteAmt.toLocaleString()}
小比例尝试更高回报，可能带来惊喜，也可能带来惊吓——但因为占比小，不会影响整体。`;

  // 添加调整记录
  if (tierResult.adjustments.length > 0) {
    explanation += `\n\n以下是系统做出调整的原因：\n`;
    for (const adj of tierResult.adjustments) {
      explanation += `- ${adj.reason}\n`;
    }
  }

  explanation += `\n\n记住：投资有风险，决策需谨慎。这个配置方案仅供参考，具体还需根据您的情况和偏好来调整。`;

  return explanation;
}

// ── 生成退休规划解释 ──────────────────────────────────────────
export function generateRetirementExplanation(
  kyc: CustomerKYC,
  cashFlowResult: {
    assetsAtRetirement: number;
    pensionMonthly: number;
    monthlyGap: number;
    monthlyDCAForPensionGap: number;
    retirementAge: number;
    perpetual: boolean;
  }
): string {
  const {
    assetsAtRetirement,
    pensionMonthly,
    monthlyGap,
    monthlyDCAForPensionGap,
    retirementAge,
    perpetual,
  } = cashFlowResult;

  let explanation = `📊 **您的退休规划概览**

🎯 **目标退休年龄**：${retirementAge}岁
💰 **预计退休时资产**：¥${Math.round(assetsAtRetirement).toLocaleString()}
🏦 **预计月退休金**：¥${Math.round(pensionMonthly).toLocaleString()}`;

  if (monthlyGap > 0) {
    explanation += `
⚠️ **存在月度缺口**：¥${Math.round(monthlyGap).toLocaleString()}

不要担心！系统建议您每月额外定投 ¥${Math.round(monthlyDCAForPensionGap).toLocaleString()}，就能弥补这个缺口。

计算方法：如果您从现在开始每月多投 ¥${Math.round(monthlyDCAForPensionGap).toLocaleString()}，到退休时就能攒够钱，每个月都有足够的钱花。`;
  } else {
    explanation += `
✅ **退休金基本够用！**

按目前的规划，您的退休金应该能覆盖基本生活支出。如果想提高生活品质，也可以适当多投一些。`;
  }

  if (perpetual) {
    explanation += `

✨ **好消息**：按照这个方案，您的钱大概率可以"花不完"，甚至可以传承给下一代！`;
  } else {
    explanation += `

💡 **小贴士**：退休后如果发现钱不够花，可以考虑：
1. 适当降低退休后的生活水平预期
2. 延迟退休，多攒几年钱
3. 退休后做一些轻松的兼职工作`;
  }

  explanation += `\n\n以上仅为估算，实际收益会受到市场波动影响。"投资有风险，决策需谨慎。"`;

  return explanation;
}

// ── 生成调整建议 ──────────────────────────────────────────────
export function generateAdjustmentAdvice(
  direction: 'more_aggressive' | 'more_conservative',
  currentConfig: PyramidConfig,
  kyc: CustomerKYC
): { newConfig: PyramidConfig; changes: string[] } {
  const changes: string[] = [];

  const newConfig = { ...currentConfig };

  if (direction === 'more_aggressive') {
    // 更激进：提高成长层和卫星层比例
    const shiftAmount = 0.05; // 转移5%
    newConfig.growthRatio = Math.min(0.50, currentConfig.growthRatio + shiftAmount);
    newConfig.satelliteRatio = Math.min(0.20, currentConfig.satelliteRatio + shiftAmount / 2);
    newConfig.stableRatio = currentConfig.stableRatio - shiftAmount * 1.5;

    changes.push(`将成长层比例从${(currentConfig.growthRatio * 100).toFixed(0)}%提高到${(newConfig.growthRatio * 100).toFixed(0)}%`);
    if (newConfig.satelliteRatio > currentConfig.satelliteRatio) {
      changes.push(`将卫星层比例从${(currentConfig.satelliteRatio * 100).toFixed(0)}%提高到${(newConfig.satelliteRatio * 100).toFixed(0)}%`);
    }
    changes.push(`相应降低稳健层比例`);

    if (kyc.age >= 60) {
      changes.push(`⚠️ 提醒：60岁以上客户不宜过度追求高收益，建议保持稳健`);
    }
  } else {
    // 更保守：提高稳健层和现金层比例
    const shiftAmount = 0.05;
    newConfig.stableRatio = Math.min(0.70, currentConfig.stableRatio + shiftAmount);
    newConfig.cashRatio = Math.min(0.25, currentConfig.cashRatio + shiftAmount / 2);
    newConfig.growthRatio = currentConfig.growthRatio - shiftAmount * 1.5;
    newConfig.satelliteRatio = 0; // 保守配置一般不含卫星层

    changes.push(`将稳健层比例从${(currentConfig.stableRatio * 100).toFixed(0)}%提高到${(newConfig.stableRatio * 100).toFixed(0)}%`);
    changes.push(`将现金层比例从${(currentConfig.cashRatio * 100).toFixed(0)}%提高到${(newConfig.cashRatio * 100).toFixed(0)}%`);
    changes.push(`降低成长层比例`);
    changes.push(`卫星层归零（保守配置不适合高风险产品）`);
  }

  // 归一化
  const total = newConfig.growthRatio + newConfig.stableRatio + newConfig.cashRatio + newConfig.satelliteRatio;
  newConfig.growthRatio /= total;
  newConfig.stableRatio /= total;
  newConfig.cashRatio /= total;
  newConfig.satelliteRatio /= total;

  // 重新计算金额
  const totalAmount = kyc.investableAssets;
  newConfig.cashAmount = Math.round(totalAmount * newConfig.cashRatio / 1000) * 1000;
  newConfig.stableAmount = Math.round(totalAmount * newConfig.stableRatio / 1000) * 1000;
  newConfig.growthAmount = Math.round(totalAmount * newConfig.growthRatio / 1000) * 1000;
  newConfig.satelliteAmount = Math.round(totalAmount * newConfig.satelliteRatio / 1000) * 1000;
  newConfig.totalAmount = totalAmount;

  return { newConfig, changes };
}

// ── 构建完整回复 ──────────────────────────────────────────────
export interface ChatResponse {
  message: string;
  intent: IntentResult;
  extractedParams?: ExtractedParams;
  suggestedAction?: 'VIEW_PLAN' | 'ADJUST_CONFIG' | 'ASK_KNOWLEDGE' | 'NONE';
}

/**
 * 处理用户输入，生成回复
 */
export function processUserInput(
  query: string,
  kyc?: CustomerKYC,
  currentConfig?: PyramidConfig
): ChatResponse {
  // 意图识别
  const intent = classifyIntent(query);

  // 参数提取
  const params = extractParams(query, intent);

  let message = '';
  let suggestedAction: ChatResponse['suggestedAction'] = 'NONE';

  switch (intent.type) {
    case 'PLANNING':
      if (params.retirementAge || params.monthlyTarget || params.goal) {
        message = `好的，我理解您的规划需求！\n\n`;
        if (params.retirementAge) {
          message += `🎯 目标退休年龄：${params.retirementAge}岁\n`;
        }
        if (params.monthlyTarget) {
          message += `💰 期望月收入：¥${params.monthlyTarget.toLocaleString()}\n`;
        }
        if (params.goal) {
          message += `📋 具体目标：${params.goal}\n`;
        }
        message += `\n系统会根据这些信息，为您重新计算最优配置方案。\n\n是否需要我为您生成一份新的规划方案？`;
        suggestedAction = 'VIEW_PLAN';
      } else {
        message = `好的，您想要进行财务规划！\n\n请告诉我更多信息，比如：\n- 您计划什么时候退休？（比如"我想60岁退休"）\n- 您期望退休后每月有多少钱？（比如"每月1万块"）\n- 您有什么具体的理财目标？（比如"想买房子"、"为孩子存教育金"）\n\n有了这些信息，我就能为您量身定制一份专属方案！`;
      }
      break;

    case 'KNOWLEDGE':
      if (params.queryTopic) {
        message = generateKnowledgeAnswer(params.queryTopic);
      } else {
        message = `您想了解什么金融知识呢？\n\n我可以为您解释：\n- 📊 DTI（负债收入比）\n- 🏛️ 金字塔资产配置\n- 📈 夏普比率\n- 💵 安全提取率\n- ✅ 适当性原则\n\n请告诉我您想了解的内容！`;
      }
      suggestedAction = 'ASK_KNOWLEDGE';
      break;

    case 'ADJUSTMENT':
      if (currentConfig && kyc) {
        const direction = params.adjustmentDirection || 'more_aggressive';
        const { newConfig, changes } = generateAdjustmentAdvice(direction, currentConfig, kyc);

        message = `好的，我明白了！您希望配置方案${direction === 'more_aggressive' ? '更激进一点' : '更保守一点'}。\n\n调整内容：\n`;
        for (const change of changes) {
          message += `- ${change}\n`;
        }
        message += `\n新的配置比例：\n`;
        message += `- 现金层：${(newConfig.cashRatio * 100).toFixed(0)}%\n`;
        message += `- 稳健层：${(newConfig.stableRatio * 100).toFixed(0)}%\n`;
        message += `- 成长层：${(newConfig.growthRatio * 100).toFixed(0)}%\n`;
        message += `- 卫星层：${(newConfig.satelliteRatio * 100).toFixed(0)}%\n`;
        message += `\n⚠️ 温馨提示：投资有风险，配置调整需谨慎。`;

        suggestedAction = 'ADJUST_CONFIG';
      } else {
        message = `好的，我理解您想要调整配置方案。\n\n请告诉我：\n- 您觉得当前方案"太保守"还是"太激进"？\n- 或者您可以直接说"激进一点"或"保守一点"\n\n我会根据您的偏好，为您重新计算配置比例。`;
      }
      break;

    case 'EXPLANATION':
      if (currentConfig && kyc) {
        message = generateConfigExplanation({
          config: currentConfig,
          tierResult: {} as TierResult,
          cashFlowResult: {
            assetsAtRetirement: 0,
            pensionMonthly: 0,
            monthlyGap: 0,
            monthlyDCAForPensionGap: 0,
            retirementAge: kyc.age + (kyc.yearsToRetirement ?? 0),
            perpetual: false,
          },
          kyc,
        });
      } else {
        message = `我需要先了解您的具体情况，才能为您解释配置逻辑。\n\n请您先完成KYC问卷，我会根据您的财务状况和风险偏好，为您生成专属的配置方案，并详细解释背后的原理。`;
      }
      break;

    case 'CHITCHAT':
      message = `您好！我是智盈，工商银行的智能投顾助手。\n\n我可以帮您：\n- 📋 了解您的财务状况和目标\n- 📊 制定专属的资产配置方案\n- 📚 解答金融知识方面的疑问\n\n有什么我可以帮您的吗？`;
      break;

    default:
      message = `抱歉，我没能完全理解您的意思。\n\n您可以尝试：\n- 告诉我您的理财目标（比如"我想60岁退休"）\n- 问一些金融知识问题（比如"什么是DTI"）\n- 说明您想要的调整（比如"太保守了"）\n\n我会尽力帮助您！`;
  }

  return {
    message,
    intent,
    extractedParams: params,
    suggestedAction,
  };
}

// ── LLM API调用（需要接入实际API）─────────────────────────────
/**
 * 调用LLM API进行更智能的意图识别和参数提取
 * 实际项目中需要替换为真实的API调用
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function callLLMAPI(
  query: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  config: LLMConfig
): Promise<{ response: string; tokens: number }> {
  // 这里是占位实现
  // 实际项目中应接入通义千问、文心一言或其他LLM API
  const response = processUserInput(query);

  return {
    response: response.message,
    tokens: 0, // 无法准确估算
  };
}
