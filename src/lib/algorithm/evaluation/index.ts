// ============================================================
// 双叉树分类评估模块
//
// 包含三个评估方法：
// 1. 业务指标对比 (demographics-analysis.ts)
//    - 展示不同客群场景的画像差异
//    - 业务可读性最强
//
// 2. 轮廓系数评估 (silhouette-score.ts)
//    - 衡量分类质量（同质性 + 异质性）
//    - 算法层面的客观指标
//
// 3. Bootstrap 重采样 (bootstrap-stability.ts)
//    - 衡量分类在新样本下的稳定性
//    - 工程层面的可靠性指标
//
// 为什么不用 Q-Q 图 / Shapiro-Wilk / AD 检验？
//   - 这三个工具是正态性检验，用于统计建模
//   - 我们做的是业务分类，不是统计建模
//   - 客户画像数据是离散业务维度，不需要正态分布假设
// ============================================================

// ── 业务距离定义 ──────────────────────────────────────────────
export {
  businessDistance,
  calculateDistanceMatrix,
  averageIntraClusterDistance,
  BUSINESS_DIMENSION_WEIGHTS,
} from './business-distance';

// ── 业务指标对比 ──────────────────────────────────────────────
export {
  analyzeCustomerDemographics,
  generateComparisonReport,
  type ClusterProfile,
  type DemographicsComparison,
  type ContrastiveScenario,
} from './demographics-analysis';

// ── 轮廓系数评估 ──────────────────────────────────────────────
export {
  evaluateSilhouette,
  generateSilhouetteReport,
  type CustomerSilhouette,
  type SilhouetteEvaluation,
} from './silhouette-score';

// ── Bootstrap 重采样 ──────────────────────────────────────────
export {
  evaluateBootstrapStability,
  planBoundaryCustomerHandling,
  generateBootstrapReport,
  type CustomerStability,
  type BootstrapStabilityResult,
  type BootstrapConfig,
  type BoundaryCustomerHandling,
} from './bootstrap-stability';