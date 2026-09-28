// ============================================================
// 财富管理与规划平台 - 核心类型定义
// ============================================================

// ── 客户 ──────────────────────────────────────────────────────
export interface Customer {
  customerId: string;
  demoName: string;
  gender: 'male' | 'female';
  role: 'DEMO_CUSTOMER';
  dataSource: 'SYNTHETIC_DEMO';
  isActive: boolean;
  createdAt: string;
}

// ── KYC ──────────────────────────────────────────────────────
export type IncomeStability = 'stable' | 'moderate' | 'volatile';

/**
 * 风险评估等级字段语义说明：
 * 风险评估等级与评分均来源于银行端《客户风险承受能力评估问卷》，
 * 本平台不再重新评估，仅作为分层与产品推荐的输入。
 *
 * - riskLevel: 客户风险承受等级（R1保守 ~ R5进取）
 * - riskScore: 银行端问卷分数（用于UI展示，不参与本平台分层计算）
 * - riskSource: 数据来源标识
 * - riskAssessedAt: 银行端评估日期
 * - riskValidUntil: 评估有效期
 */
export type RiskLevel = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
export type RiskSource = 'BANK_QUESTIONNAIRE' | 'BANK_INHERITED';
export type KYCStatus = 'DRAFT' | 'SUBMITTED' | 'VALID' | 'EXPIRED';

export interface CustomerKYC {
  kycId: string;
  customerId: string;
  // 基本信息
  birthDate: string;
  age: number;
  occupation: string;
  incomeStability: IncomeStability;
  // 财务信息
  annualIncome: number;
  monthlyExpense: number;
  investableAssets: number;
  totalAssets: number;
  mortgageMonthly: number;
  otherMonthlyDebt: number;
  dti: number; // 负债收入比
  emergencyFundMonths: number;
  // 投资经验
  investmentYears: number;
  productsOwned: string[];
  riskScore: number;
  riskLevel: RiskLevel;
  riskQuestionnaireVersion: string;
  // 家庭与目标
  familyStructure: string;
  hasChildren: boolean;
  childrenSummary: { name: string; age: number }[];
  hasDependentParents: boolean;
  yearsToRetirement: number | null;
  goals: string[];
  goalPriority: { goal: string; priority: number }[];
  // 保险
  hasInsurance: boolean;
  existingLifeInsurance: number;
  existingCriticalIllness: number;
  existingMedicalInsurance: boolean;
  // 状态
  kycStatus: KYCStatus;
  kycDate: string;
  kycValidUntil: string;
  dataSource: string;
}

// ── 分层 ──────────────────────────────────────────────────────
export type TierId = 'A1' | 'B1-1' | 'B1-2' | 'B2-1' | 'B2-2' | 'B3' | 'B4';

export interface TierAdjustment {
  dimension: string;
  ruleCode: string;
  change: string;
  reason: string;
}

export interface TierResult {
  baseTier: TierId;
  finalTier: TierId;
  tierName: string;
  equityCap: number;
  cashFloor: number;
  confidence: number;
  classificationPath: string[];
  adjustments: TierAdjustment[];
  algorithmVersion: string;
}

// ── 金字塔配置 ────────────────────────────────────────────────
export type PyramidLayer = 'CASH' | 'STABLE' | 'GROWTH' | 'SATELLITE';

export interface PyramidConfig {
  cashRatio: number;
  stableRatio: number;
  growthRatio: number;
  satelliteRatio: number;
  cashAmount: number;
  stableAmount: number;
  growthAmount: number;
  satelliteAmount: number;
  totalAmount: number;
}

// ── 产品 ──────────────────────────────────────────────────────
export type ProductCategory =
  | 'DEMAND_DEPOSIT'       // 活期存款
  | 'TIME_DEPOSIT'         // 定期存款
  | 'NCD'                  // 大额存单
  | 'MONEY_MARKET'         // 货币基金
  | 'STRUCTURED_DEPOSIT'   // 结构性存款
  | 'WMP_DAILY'            // 天天理财产品
  | 'WMP_PR1'              // PR1银行理财
  | 'WMP_PR2'              // PR2银行理财
  | 'WMP_PR3'              // PR3银行理财
  | 'BOND_FUND'            // 债券基金
  | 'MIXED_FUND'           // 混合基金
  | 'EQUITY_FUND'          // 股票基金
  | 'INDEX_FUND'           // 指数基金
  | 'QDII'                 // QDII基金
  | 'PENSION_FOF'          // 养老目标FOF
  | 'PENSION_WMP'          // 养老理财
  | 'LIFE_INSURANCE'       // 寿险
  | 'ANNUITY_INSURANCE'    // 年金险
  | 'UNIVERSAL_LIFE'       // 万能险
  | 'GOVT_BOND'           // 储蓄国债
  | 'REITS'                // 公募REITs
  | 'GOLD'                 // 黄金积存
  | 'ESG_FUND'             // ESG主题基金
  | 'STRUCTURED_FINANCIAL'; // 结构化理财

export type ComplianceStatus = 'PASS' | 'WARN' | 'BLOCK' | 'NEED_MORE_DATA';

export interface Product {
  productId: string;
  productCode: string;
  productName: string;
  category: ProductCategory;
  subCategory: string;
  issuer: string;
  pyramidLayer: PyramidLayer;
  riskLevel: RiskLevel;
  riskLevelNumeric: number;
  suitabilityScope: string[];
  suitableGoals: string[];
  suitableAgeMin: number | null;
  suitableAgeMax: number | null;
  minAmount: number;
  minIncrement: number;
  termMonths: number | null;
  liquidityType: string;
  returnType: string;
  expectedReturn: number | null;
  historicalReturn1y: number | null;
  historicalReturn3y: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  managementFee: number | null;
  subscriptionFee: number | null;
  isActive: boolean;
  isSynthetic: boolean;
  dataAsOf: string;
  productVersion: string;
}

// ── 方案 ──────────────────────────────────────────────────────
export type PlanStatus = 'DRAFT' | 'GENERATED' | 'CONFIRMED' | 'EXPIRED';

export interface AllocationPlan {
  planId: string;
  customerId: string;
  kycId: string;
  tierId: string;
  plannedAmount: number;
  planStatus: PlanStatus;
  pyramidConfig: PyramidConfig;
  ruleVersion: string;
  algorithmVersion: string;
  productSnapshotVersion: string;
  items: AllocationPlanItem[];
  createdAt: string;
}

export interface AllocationPlanItem {
  itemId: string;
  planId: string;
  productId: string;
  product: Product;
  layerCode: PyramidLayer;
  allocationRatio: number;
  allocationAmount: number;
  score: number;
  recommendationReason: string;
  complianceStatus: ComplianceStatus;
}

// ── 合规 ──────────────────────────────────────────────────────
export interface ComplianceCheckResult {
  status: ComplianceStatus;
  severity: 'INFO' | 'WARN' | 'BLOCK';
  ruleVersion: string;
  violations: string[];
  warnings: string[];
  specialRequirements: string[];
  checkedAt: string;
}

// ── 预约单 ────────────────────────────────────────────────────
export type ReservationStatus = 'DRAFT' | 'CONFIRMED' | 'RESERVED' | 'CANCELLED';

export interface ReservationOrder {
  reservationId: string;
  reservationNo: string;
  customerId: string;
  planId: string;
  totalAmount: number;
  status: ReservationStatus;
  disclaimerConfirmed: boolean;
  riskWarningConfirmed: boolean;
  isDemo: boolean;
  items: { productId: string; productName: string; amount: number }[];
  createdAt: string;
  validUntil: string;
}

// ── API 统一返回 ──────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  requestId: string;
  data: T | null;
  error: { code: string; message: string; details?: unknown[] } | null;
}

// ── AI算法结果类型 ──────────────────────────────────────────

/** 遗传算法优化结果 */
export interface GAOptimizationResult {
  optimizedConfig: PyramidConfig;
  optimizedRatios: { cash: number; stable: number; growth: number; satellite: number };
  fitness: number;
  sharpeRatio: number;
  iterations: number;
  converged: boolean;
}

/** 蒙特卡洛模拟结果 */
export interface MonteCarloSimulationResult {
  successRate: number;
  depletionAge: number | null;
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  yearlyDistribution: {
    age: number;
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    successRate: number;
  }[];
  summary: {
    medianEndingBalance: number;
    worstCaseEndingBalance: number;
    bestCaseEndingBalance: number;
    averageEndingBalance: number;
  };
}

/** K-Means聚类结果 */
export interface ClusterResult {
  clusterId: number;
  centroid: number[];
  members: { customerId: string; features: number[] }[];
  profile: {
    avgAge: number;
    avgInvestableAssets: number;
    avgAnnualIncome: number;
    avgDTI: number;
    avgRiskLevel: number;
    commonGoals: string[];
    description: string;
  };
}

/** LLM对话意图类型 */
export type IntentType = 'PLANNING' | 'KNOWLEDGE' | 'ADJUSTMENT' | 'EXPLANATION' | 'CHITCHAT' | 'UNKNOWN';

/** LLM意图识别结果 */
export interface IntentResult {
  type: IntentType;
  entities: Record<string, unknown>;
  confidence: number;
  originalQuery: string;
}

/** LLM对话消息 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/** 配置置信度评估 */
export interface ConfidenceAssessment {
  baseConfidence: number;
  similarityBoost: number;
  experienceBoost: number;
  finalConfidence: number;
  confidenceLevel: 'low' | 'medium' | 'high';
}
