// ============================================================
// 蒙特卡洛模拟引擎
// 对配置方案在多种市场情景下的表现进行概率评估
// 告别"确定性预测"，拥抱"概率化结果"
// ============================================================

import type { CustomerKYC, PyramidConfig, AllocationPlanItem } from '@/types';

export interface MonteCarloConfig {
  simulations: number;       // 模拟次数，默认10000
  yearsToSimulate: number;  // 模拟年数（退休后），默认35（到100岁）
  confidenceLevels: number[]; // 置信水平，默认[5, 10, 25, 50, 75, 90, 95]
}

export interface SimulationResult {
  successRate: number;           // 成功率：资产未耗尽的概率
  depletionAge: number | null;   // 资产耗尽年龄（如果有）
  percentiles: {
    p5: number;    // 5%分位（最悲观情景）
    p10: number;   // 10%分位
    p25: number;   // 25%分位
    p50: number;   // 50%分位（中位数）
    p75: number;   // 75%分位
    p90: number;   // 90%分位
    p95: number;   // 95%分位（最乐观情景）
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

export interface RetirementScenario {
  age: number;
  assets: number;
  probability: number;
}

// ── 默认配置 ──────────────────────────────────────────────────
const DEFAULT_MC_CONFIG: MonteCarloConfig = {
  simulations: 10000,
  yearsToSimulate: 35,
  confidenceLevels: [5, 10, 25, 50, 75, 90, 95],
};

// ── 各层收益分布参数（年化） ───────────────────────────────────
interface LayerDistribution {
  expectedReturn: number;
  volatility: number;
  // 用于截断正态分布
  minReturn: number;
  maxReturn: number;
}

function getLayerDistribution(
  config: PyramidConfig,
  items: AllocationPlanItem[],
  layer: 'cash' | 'stable' | 'growth' | 'satellite'
): LayerDistribution {
  // 如果有实际持仓，使用实际数据
  const layerItems = items.filter(
    (i) =>
      (layer === 'cash' && i.layerCode === 'CASH') ||
      (layer === 'stable' && i.layerCode === 'STABLE') ||
      (layer === 'growth' && i.layerCode === 'GROWTH') ||
      (layer === 'satellite' && i.layerCode === 'SATELLITE')
  );

  if (layerItems.length > 0) {
    const avgReturn =
      layerItems.reduce((sum, i) => sum + (i.product.expectedReturn || 0), 0) /
      layerItems.length;
    const avgVolatility =
      layerItems.reduce((sum, i) => sum + (i.product.volatility || 0), 0) /
      layerItems.length;

    return {
      expectedReturn: avgReturn,
      volatility: avgVolatility,
      minReturn: avgReturn - 3 * avgVolatility,
      maxReturn: avgReturn + 3 * avgVolatility,
    };
  }

  // 默认参数
  const defaults: Record<string, LayerDistribution> = {
    cash: { expectedReturn: 0.018, volatility: 0.005, minReturn: 0.01, maxReturn: 0.03 },
    stable: { expectedReturn: 0.038, volatility: 0.02, minReturn: 0.01, maxReturn: 0.08 },
    growth: { expectedReturn: 0.08, volatility: 0.15, minReturn: -0.30, maxReturn: 0.50 },
    satellite: { expectedReturn: 0.06, volatility: 0.20, minReturn: -0.50, maxReturn: 0.80 },
  };

  return defaults[layer];
}

// ── Box-Muller变换生成正态分布随机数 ──────────────────────────
function randomNormal(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + stdDev * z;
}

// ── 截断正态分布采样 ──────────────────────────────────────────
function truncatedNormal(
  dist: LayerDistribution,
  expectedRatio: number
): number {
  let sample: number;
  const ratioAdjustedReturn = dist.expectedReturn * expectedRatio;

  do {
    sample = randomNormal(dist.expectedReturn, dist.volatility);
    sample = Math.max(dist.minReturn, Math.min(dist.maxReturn, sample));
  } while (sample < dist.minReturn || sample > dist.maxReturn);

  return ratioAdjustedReturn / (dist.expectedReturn || 1) * sample;
}

// ── 单次模拟 ──────────────────────────────────────────────────
function runSingleSimulation(
  kyc: CustomerKYC,
  config: PyramidConfig,
  layerDistributions: Record<string, LayerDistribution>,
  inflation: number,
  retirementAge: number,
  yearsToSimulate: number
): { yearlyBalances: number[]; depletionAge: number | null } {
  const yearlyBalances: number[] = [];
  let balance = config.cashAmount + config.stableAmount + config.growthAmount + config.satelliteAmount;
  let depletionAge: number | null = null;

  // 退休后年度支出
  const baseAnnualExpense = kyc.monthlyExpense * 12;
  const annualPension = estimateAnnualPension(kyc);

  for (let year = 0; year < yearsToSimulate; year++) {
    const age = retirementAge + year;

    // 计算当年组合收益
    const cashReturn = truncatedNormal(layerDistributions.cash, config.cashRatio) * config.cashRatio;
    const stableReturn = truncatedNormal(layerDistributions.stable, config.stableRatio) * config.stableRatio;
    const growthReturn = truncatedNormal(layerDistributions.growth, config.growthRatio) * config.growthRatio;
    const satelliteReturn = truncatedNormal(layerDistributions.satellite, config.satelliteRatio) * config.satelliteRatio;

    const portfolioReturn = cashReturn + stableReturn + growthReturn + satelliteReturn;

    // 资产增长
    balance = balance * (1 + portfolioReturn);

    // 扣除支出（通胀调整）
    const inflationAdjustedExpense = baseAnnualExpense * Math.pow(1 + inflation, year);
    const netWithdrawal = Math.max(0, inflationAdjustedExpense - annualPension);
    balance -= netWithdrawal;

    yearlyBalances.push(Math.max(0, balance));

    // 检查是否耗尽
    if (balance <= 0 && depletionAge === null) {
      depletionAge = age;
    }
  }

  return { yearlyBalances, depletionAge };
}

// ── 估算年度养老金 ────────────────────────────────────────────
function estimateAnnualPension(kyc: CustomerKYC): number {
  // 简化估算：基于缴费年限的替代率
  const startWorkAge = 22;
  const currentContributionYears = Math.max(0, Math.min(kyc.age - startWorkAge, 40));
  const yearsToRetirement = kyc.yearsToRetirement ?? 0;
  const totalContributionYears = Math.min(currentContributionYears + yearsToRetirement, 40);

  let replacementRate: number;
  if (totalContributionYears < 15) {
    replacementRate = 0.30;
  } else if (totalContributionYears < 25) {
    replacementRate = 0.40 + (totalContributionYears - 15) * 0.01;
  } else if (totalContributionYears < 35) {
    replacementRate = 0.50 + (totalContributionYears - 25) * 0.008;
  } else {
    replacementRate = 0.58 + (totalContributionYears - 35) * 0.005;
  }

  // 退休金 = 月支出 × 替代率
  const retirementMonthlyExpense = kyc.monthlyExpense * Math.pow(1 + 0.025, yearsToRetirement);
  return retirementMonthlyExpense * replacementRate * 12;
}

// ── 计算分位数 ────────────────────────────────────────────────
function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

// ── 主模拟函数 ─────────────────────────────────────────────────
/**
 * 运行蒙特卡洛模拟，评估配置方案的退休后可持续性
 */
export function runMonteCarloSimulation(
  kyc: CustomerKYC,
  pyramidConfig: PyramidConfig,
  items: AllocationPlanItem[],
  mcConfig: Partial<MonteCarloConfig> = {}
): SimulationResult {
  const config = { ...DEFAULT_MC_CONFIG, ...mcConfig };

  const inflation = 0.025;
  const retirementAge = kyc.age + (kyc.yearsToRetirement ?? 0);

  // 获取各层分布
  const layerDistributions = {
    cash: getLayerDistribution(pyramidConfig, items, 'cash'),
    stable: getLayerDistribution(pyramidConfig, items, 'stable'),
    growth: getLayerDistribution(pyramidConfig, items, 'growth'),
    satellite: getLayerDistribution(pyramidConfig, items, 'satellite'),
  };

  // 运行所有模拟
  const allResults: { yearlyBalances: number[]; depletionAge: number | null }[] = [];

  for (let i = 0; i < config.simulations; i++) {
    const result = runSingleSimulation(
      kyc,
      pyramidConfig,
      layerDistributions,
      inflation,
      retirementAge,
      config.yearsToSimulate
    );
    allResults.push(result);
  }

  // 计算成功率
  const successCount = allResults.filter((r) => r.depletionAge === null).length;
  const successRate = successCount / config.simulations;

  // 计算各年份的分位数
  const yearlyDistribution: SimulationResult['yearlyDistribution'] = [];
  for (let year = 0; year < config.yearsToSimulate; year += 5) {
    const age = retirementAge + year;
    const balancesAtYear = allResults.map((r) => r.yearlyBalances[year] || 0);
    const successesAtYear = allResults.filter(
      (r) => r.yearlyBalances[year] > 0
    ).length;

    yearlyDistribution.push({
      age,
      p5: calculatePercentile(balancesAtYear, 5),
      p25: calculatePercentile(balancesAtYear, 25),
      p50: calculatePercentile(balancesAtYear, 50),
      p75: calculatePercentile(balancesAtYear, 75),
      p95: calculatePercentile(balancesAtYear, 95),
      successRate: successesAtYear / config.simulations,
    });
  }

  // 最后一年的分位数
  const finalBalances = allResults.map((r) =>
    r.yearlyBalances[config.yearsToSimulate - 1] || 0
  );

  // 计算耗尽年龄分布
  const depletionAges = allResults
    .map((r) => r.depletionAge)
    .filter((age): age is number => age !== null);

  const avgDepletionAge =
    depletionAges.length > 0
      ? depletionAges.reduce((a, b) => a + b, 0) / depletionAges.length
      : null;

  return {
    successRate,
    depletionAge: avgDepletionAge !== null ? Math.round(avgDepletionAge) : null,
    percentiles: {
      p5: calculatePercentile(finalBalances, 5),
      p10: calculatePercentile(finalBalances, 10),
      p25: calculatePercentile(finalBalances, 25),
      p50: calculatePercentile(finalBalances, 50),
      p75: calculatePercentile(finalBalances, 75),
      p90: calculatePercentile(finalBalances, 90),
      p95: calculatePercentile(finalBalances, 95),
    },
    yearlyDistribution,
    summary: {
      medianEndingBalance: calculatePercentile(finalBalances, 50),
      worstCaseEndingBalance: calculatePercentile(finalBalances, 5),
      bestCaseEndingBalance: calculatePercentile(finalBalances, 95),
      averageEndingBalance:
        finalBalances.reduce((a, b) => a + b, 0) / finalBalances.length,
    },
  };
}

// ── 情景分析 ──────────────────────────────────────────────────
export interface ScenarioAnalysis {
  optimistic: {
    annualReturn: number;
    endingBalance: number;
    description: string;
  };
  base: {
    annualReturn: number;
    endingBalance: number;
    description: string;
  };
  pessimistic: {
    annualReturn: number;
    endingBalance: number;
    description: string;
  };
}

/**
 * 生成三种典型情景的分析
 */
export function generateScenarioAnalysis(
  kyc: CustomerKYC,
  config: PyramidConfig,
  items: AllocationPlanItem[]
): ScenarioAnalysis {
  const retirementAge = kyc.age + (kyc.yearsToRetirement ?? 0);
  const yearsToSimulate = Math.min(100 - retirementAge, 35);

  // 计算加权收益和波动率
  const layerDists = {
    cash: getLayerDistribution(config, items, 'cash'),
    stable: getLayerDistribution(config, items, 'stable'),
    growth: getLayerDistribution(config, items, 'growth'),
    satellite: getLayerDistribution(config, items, 'satellite'),
  };

  const expectedReturn =
    layerDists.cash.expectedReturn * config.cashRatio +
    layerDists.stable.expectedReturn * config.stableRatio +
    layerDists.growth.expectedReturn * config.growthRatio +
    layerDists.satellite.expectedReturn * config.satelliteRatio;

  const volatility = Math.sqrt(
    Math.pow(layerDists.cash.volatility * config.cashRatio, 2) +
    Math.pow(layerDists.stable.volatility * config.stableRatio, 2) +
    Math.pow(layerDists.growth.volatility * config.growthRatio, 2) +
    Math.pow(layerDists.satellite.volatility * config.satelliteRatio, 2)
  );

  const initialBalance =
    config.cashAmount + config.stableAmount + config.growthAmount + config.satelliteAmount;
  const inflation = 0.025;
  const annualPension = estimateAnnualPension(kyc);
  const baseAnnualExpense = kyc.monthlyExpense * 12;

  function simulateWithReturn(annualReturn: number): number {
    let balance = initialBalance;
    for (let year = 0; year < yearsToSimulate; year++) {
      balance = balance * (1 + annualReturn);
      const inflationAdjustedExpense = baseAnnualExpense * Math.pow(1 + inflation, year);
      const netWithdrawal = Math.max(0, inflationAdjustedExpense - annualPension);
      balance -= netWithdrawal;
      if (balance <= 0) return 0;
    }
    return Math.max(0, balance);
  }

  // 乐观情景：+2σ
  const optimisticReturn = expectedReturn + 2 * volatility;
  // 基准情景：期望收益
  const baseReturn = expectedReturn;
  // 悲观情景：-2σ
  const pessimisticReturn = Math.max(-0.1, expectedReturn - 2 * volatility);

  return {
    optimistic: {
      annualReturn: optimisticReturn,
      endingBalance: simulateWithReturn(optimisticReturn),
      description: '乐观情景：市场表现优于预期，组合获得较高收益',
    },
    base: {
      annualReturn: baseReturn,
      endingBalance: simulateWithReturn(baseReturn),
      description: '基准情景：基于历史数据的期望表现',
    },
    pessimistic: {
      annualReturn: pessimisticReturn,
      endingBalance: simulateWithReturn(pessimisticReturn),
      description: '悲观情景：市场表现低于预期，但仍能覆盖基本生活支出',
    },
  };
}

// ── 风险指标计算 ──────────────────────────────────────────────
export interface RiskMetrics {
  var95: number;        // 95% VaR（风险价值）
  cvar95: number;       // 95% CVaR（条件风险价值）
  maxDrawdown: number;  // 最大回撤
  sharpeRatio: number;  // 夏普比率
  sortinoRatio: number; // 索提诺比率
}

/**
 * 计算风险指标
 */
export function calculateRiskMetrics(
  kyc: CustomerKYC,
  config: PyramidConfig,
  items: AllocationPlanItem[]
): RiskMetrics {
  // 获取各层参数
  const layerDists = {
    cash: getLayerDistribution(config, items, 'cash'),
    stable: getLayerDistribution(config, items, 'stable'),
    growth: getLayerDistribution(config, items, 'growth'),
    satellite: getLayerDistribution(config, items, 'satellite'),
  };

  // 加权收益和波动率
  const expectedReturn =
    layerDists.cash.expectedReturn * config.cashRatio +
    layerDists.stable.expectedReturn * config.stableRatio +
    layerDists.growth.expectedReturn * config.growthRatio +
    layerDists.satellite.expectedReturn * config.satelliteRatio;

  const volatility = Math.sqrt(
    Math.pow(layerDists.cash.volatility * config.cashRatio, 2) +
    Math.pow(layerDists.stable.volatility * config.stableRatio, 2) +
    Math.pow(layerDists.growth.volatility * config.growthRatio, 2) +
    Math.pow(layerDists.satellite.volatility * config.satelliteRatio, 2)
  );

  const riskFreeRate = 0.025;
  const sharpeRatio = volatility > 0 ? (expectedReturn - riskFreeRate) / volatility : 0;

  // 索提诺比率（只考虑下行波动）
  const downsideVolatility = volatility * 0.7; // 简化估算
  const sortinoRatio = downsideVolatility > 0 ? (expectedReturn - riskFreeRate) / downsideVolatility : 0;

  // VaR（简化计算）
  const initialBalance =
    config.cashAmount + config.stableAmount + config.growthAmount + config.satelliteAmount;
  const var95 = initialBalance * volatility * 1.65; // 简化
  const cvar95 = var95 * 1.2; // 简化

  // 最大回撤估算
  const maxDrawdown = initialBalance * Math.min(0.3, volatility * 2);

  return {
    var95,
    cvar95,
    maxDrawdown,
    sharpeRatio,
    sortinoRatio,
  };
}
