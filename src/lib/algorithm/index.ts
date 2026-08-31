// ============================================================
// AI算法模块统一导出
// 包含：遗传算法优化、蒙特卡洛模拟、K-Means聚类、LLM对话投顾
// ============================================================

// ── 遗传算法优化 ──────────────────────────────────────────────
export {
  optimizeWithGA,
  evaluateConfig,
  type GAConfig,
  type GAIndividual,
  type GAOptimizationResult,
} from './genetic-optimizer';

// ── 蒙特卡洛模拟 ─────────────────────────────────────────────
export {
  runMonteCarloSimulation,
  generateScenarioAnalysis,
  calculateRiskMetrics,
  type MonteCarloConfig,
  type SimulationResult,
  type ScenarioAnalysis,
  type RiskMetrics,
  type RetirementScenario,
} from './monte-carlo';

// ── K-Means聚类 ─────────────────────────────────────────────
export {
  kMeansClustering,
  findSimilarCustomers,
  inheritClusterPreference,
  assessConfidence,
  extractCustomerFeatures,
  type CustomerFeature,
  type ClusterResult,
  type ClusterProfile,
  type SimilarityResult,
  type KMeansConfig,
  type ConfidenceAssessment,
} from './kmeans-clustering';

// ── LLM对话投顾 ─────────────────────────────────────────────
export {
  classifyIntent,
  extractParams,
  generateConfigExplanation,
  generateRetirementExplanation,
  generateAdjustmentAdvice,
  processUserInput,
  callLLMAPI,
  generateKnowledgeAnswer,
  type IntentType,
  type IntentResult,
  type ExtractedParams,
  type ExplanationRequest,
  type ChatMessage,
  type LLMConfig,
  type ChatResponse,
} from './llm-advisor';

// ── 预设知识问答库 ────────────────────────────────────────────
export const KNOWLEDGE_TOPICS = [
  'DTI',
  '金字塔',
  '夏普比率',
  '安全提取率',
  '适当性',
] as const;

export type KnowledgeTopic = typeof KNOWLEDGE_TOPICS[number];
